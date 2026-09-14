import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cards, decks, notes, revLog } from '$lib/server/db/schema';
import { and, asc, eq, lte } from 'drizzle-orm';
import { fsrs, Rating, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import type { VocabularyMetadata } from '$lib/types/note-metadata';
import type { Actions, PageServerLoad } from './$types';

const SESSION_LIMIT = 20;
const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const now = Date.now();

	const dueCards = await db
		.select({
			id: cards.id,
			noteId: cards.noteId,
			due: cards.due,
			stability: cards.stability,
			difficulty: cards.difficulty,
			elapsedDays: cards.elapsedDays,
			scheduledDays: cards.scheduledDays,
			reps: cards.reps,
			lapses: cards.lapses,
			state: cards.state,
			lastReview: cards.lastReview,
			metadata: notes.metadata,
			deckFsrs: decks.fsrs
		})
		.from(cards)
		.innerJoin(notes, eq(notes.id, cards.noteId))
		.innerJoin(decks, eq(decks.id, cards.deckId))
		.where(and(eq(cards.userId, userId), eq(cards.suspended, 0), eq(cards.deleted, 0), lte(cards.due, now)))
		.orderBy(asc(cards.due))
		.limit(SESSION_LIMIT);

	return {
		dueCards: dueCards.map((row) => ({ ...row, metadata: row.metadata as VocabularyMetadata }))
	};
};

function toFsrsCard(row: {
	due: number;
	stability: number;
	difficulty: number;
	elapsedDays: number;
	scheduledDays: number;
	reps: number;
	lapses: number;
	state: number;
	lastReview: number | null;
}): FsrsCard {
	return {
		due: new Date(row.due),
		stability: row.stability,
		difficulty: row.difficulty,
		elapsed_days: row.elapsedDays,
		scheduled_days: row.scheduledDays,
		learning_steps: 0,
		reps: row.reps,
		lapses: row.lapses,
		state: row.state,
		last_review: row.lastReview ? new Date(row.lastReview) : undefined
	};
}

export const actions: Actions = {
	review: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const formData = await event.request.formData();
		const cardId = Number(formData.get('cardId'));
		const grade = Number(formData.get('grade')) as Grade;
		const duration = Number(formData.get('duration') ?? 0);

		if (!cardId || !GRADES.includes(grade)) {
			return fail(400, { message: 'Datos inválidos' });
		}

		const [existing] = await db
			.select({ card: cards, deckFsrs: decks.fsrs })
			.from(cards)
			.innerJoin(decks, eq(decks.id, cards.deckId))
			.where(and(eq(cards.id, cardId), eq(cards.userId, userId)));

		if (!existing) return fail(404, { message: 'Tarjeta no encontrada' });

		const now = new Date();
		const { card, log } = fsrs(existing.deckFsrs ?? undefined).next(
			toFsrsCard(existing.card),
			now,
			grade
		);

		await db.transaction(async (tx) => {
			await tx
				.update(cards)
				.set({
					due: card.due.getTime(),
					stability: card.stability,
					difficulty: card.difficulty,
					elapsedDays: card.elapsed_days,
					scheduledDays: card.scheduled_days,
					reps: card.reps,
					lapses: card.lapses,
					state: card.state,
					lastReview: card.last_review ? card.last_review.getTime() : null
				})
				.where(eq(cards.id, cardId));

			await tx.insert(revLog).values({
				userId,
				cardId,
				grade: log.rating,
				state: log.state,
				due: log.due.getTime(),
				stability: log.stability,
				difficulty: log.difficulty,
				elapsedDays: log.elapsed_days,
				lastElapsedDays: log.last_elapsed_days,
				scheduledDays: log.scheduled_days,
				learningSteps: log.learning_steps,
				review: log.review.getTime(),
				duration
			});
		});

		return { success: true };
	}
};
