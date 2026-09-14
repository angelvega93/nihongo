import { db } from '$lib/server/db';
import { cardLimitSchema, cards, decks, revLog, type CardLimit } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { fsrs, Rating, type FSRSParameters, type FSRSHistory, type Grade } from 'ts-fsrs';
import { cardToUpdate, logToInsert, toFsrsCard, toReviewLog, type CardRow } from './mappers';

/** A card selected together with its deck's FSRS configuration. */
type CardWithDeck = {
	card: CardRow;
	fsrs: FSRSParameters | null;
	cardLimit: CardLimit | null;
};

export class ReviewService {
	/** Load a card owned by `userId`, together with its deck's FSRS configuration. */
	private async loadCard(userId: string, cardId: number): Promise<CardWithDeck> {
		const [row] = await db
			.select({ card: cards, fsrs: decks.fsrs, cardLimit: decks.cardLimit })
			.from(cards)
			.innerJoin(decks, eq(decks.id, cards.deckId))
			.where(and(eq(cards.id, cardId), eq(cards.userId, userId)));

		if (!row) throw new Error('Card not found');
		return row;
	}

	/**
	 * Number of lapses after which a card is automatically suspended.
	 * Mirrors the reference implementation: suspended when `lapses % limit === 0`.
	 */
	private shouldSuspend(grade: Grade, lapses: number, limit: number) {
		return grade === Rating.Again && lapses > 0 && lapses % limit === 0;
	}

	/**
	 * Apply a review: advance the card with FSRS, persist the new state and
	 * insert the review log in a single transaction.
	 */
	async next(
		userId: string,
		cardId: number,
		timestamp: number,
		grade: Grade,
		options: { offset?: number; duration?: number } = {}
	) {
		const { card: cardRow, fsrs: params, cardLimit } = await this.loadCard(userId, cardId);
		const suspendedLimit = cardLimitSchema.parse(cardLimit ?? {}).suspended;

		const f = fsrs(params ?? undefined);
		const { card, log } = f.next(toFsrsCard(cardRow), new Date(timestamp), grade);

		const suspended = this.shouldSuspend(grade, card.lapses, suspendedLimit);

		const logId = await db.transaction(async (tx) => {
			await tx
				.update(cards)
				.set({ ...cardToUpdate(card), suspended: suspended ? 1 : 0 })
				.where(eq(cards.id, cardId));

			const [inserted] = await tx
				.insert(revLog)
				.values(
					logToInsert(log, {
						userId,
						cardId,
						offset: options.offset,
						duration: options.duration
					})
				)
				.returning({ id: revLog.id });

			return inserted.id;
		});

		return {
			cid: cardId,
			lid: logId,
			next_state: card.state,
			next_due: card.due.getTime(),
			suspended
		};
	}

	/**
	 * Revert the last review of a card: restore the previous state and mark the
	 * review log as deleted.
	 */
	async undo(userId: string, cardId: number, logId: number) {
		const { card: cardRow, fsrs: params, cardLimit } = await this.loadCard(userId, cardId);

		const [logRow] = await db
			.select()
			.from(revLog)
			.where(and(eq(revLog.id, logId), eq(revLog.cardId, cardId), eq(revLog.userId, userId)));

		if (!logRow) throw new Error('Review log not found');

		const f = fsrs(params ?? undefined);
		const prevCard = f.rollback(toFsrsCard(cardRow), toReviewLog(logRow));

		const suspendedLimit = cardLimitSchema.parse(cardLimit ?? {}).suspended;
		const suspended = this.shouldSuspend(logRow.grade as Grade, prevCard.lapses, suspendedLimit);

		await db.transaction(async (tx) => {
			await tx
				.update(cards)
				.set({ ...cardToUpdate(prevCard), suspended: suspended ? 1 : 0 })
				.where(and(eq(cards.id, cardId), eq(cards.userId, userId)));

			await tx.update(revLog).set({ deleted: 1 }).where(eq(revLog.id, logId));
		});

		return {
			cid: cardId,
			next_state: prevCard.state,
			next_due: prevCard.due.getTime()
		};
	}

	/**
	 * Reset a card to the New state. When `resetCount` is false the reps/lapses
	 * counters are preserved.
	 */
	async forget(userId: string, cardId: number, timestamp: number, resetCount = false) {
		const { card: cardRow, fsrs: params } = await this.loadCard(userId, cardId);
		const f = fsrs(params ?? undefined);
		const { card, log } = f.forget(toFsrsCard(cardRow), new Date(timestamp), resetCount);

		await db.transaction(async (tx) => {
			await tx
				.update(cards)
				.set({ ...cardToUpdate(card), suspended: 0 })
				.where(and(eq(cards.id, cardId), eq(cards.userId, userId)));

			await tx.insert(revLog).values(logToInsert(log, { userId, cardId }));
		});

		return { cid: cardId, next_state: card.state, next_due: card.due.getTime() };
	}

	/** Suspend or unsuspend a card without touching its FSRS memory state. */
	async switchSuspend(userId: string, cardId: number, suspended: boolean) {
		const [updated] = await db
			.update(cards)
			.set({ suspended: suspended ? 1 : 0 })
			.where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
			.returning({ state: cards.state, due: cards.due });

		if (!updated) throw new Error('Card not found');

		return {
			cid: cardId,
			suspended,
			next_state: updated.state,
			next_due: updated.due
		};
	}

	/**
	 * Recompute the memory state of the given cards by replaying their review
	 * history. Useful after changing the deck's FSRS parameters.
	 *
	 * @param params Optional parameters to apply to every card, overriding the
	 * deck configuration.
	 * @returns The ids of the cards whose state actually changed.
	 */
	async reschedule(userId: string, cardIds: number[], params?: FSRSParameters) {
		if (cardIds.length === 0) return [];

		const cardRows = await db
			.select({ card: cards, fsrs: decks.fsrs })
			.from(cards)
			.innerJoin(decks, eq(decks.id, cards.deckId))
			.where(and(eq(cards.userId, userId), eq(cards.deleted, 0), inArray(cards.id, cardIds)));

		const logRows = await db
			.select()
			.from(revLog)
			.where(
				and(eq(revLog.userId, userId), eq(revLog.deleted, 0), inArray(revLog.cardId, cardIds))
			);

		const logsByCard = new Map<number, FSRSHistory[]>();
		for (const log of logRows) {
			const history = logsByCard.get(log.cardId) ?? [];
			history.push({
				rating: log.grade as Grade,
				review: new Date(log.review),
				due: new Date(log.due),
				state: log.state
			});
			logsByCard.set(log.cardId, history);
		}

		const f = fsrs();
		const updatedCardIds: number[] = [];

		for (const { card: cardRow, fsrs: deckParams } of cardRows) {
			f.parameters = params ?? deckParams ?? f.parameters;
			const record = f.reschedule(toFsrsCard(cardRow), logsByCard.get(cardRow.id) ?? []);

			if (!record.reschedule_item) continue;

			updatedCardIds.push(cardRow.id);
			await db
				.update(cards)
				.set(cardToUpdate(record.reschedule_item.card))
				.where(and(eq(cards.id, cardRow.id), eq(cards.userId, userId)));
		}

		return updatedCardIds;
	}
}

export const reviewService = new ReviewService();
export default reviewService;
