import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import {
	cardLimitSchema,
	cards,
	decks,
	decksCards,
	notes,
	NoteType
} from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import { and, count, eq, notInArray, sql } from 'drizzle-orm';
import { createEmptyCard, generatorParameters } from 'ts-fsrs';
import type { VocabularyMetadata } from '$lib/types/note-metadata';
import type { Actions, PageServerLoad } from './$types';

const DEFAULT_DECK_NAME = 'Mi vocabulario';

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;

	const [[{ value: notesCount }], [{ value: cardsCount }]] = await Promise.all([
		db.select({ value: count() }).from(notes),
		db.select({ value: count() }).from(cards).where(eq(cards.userId, userId))
	]);

	return { notesCount, cardsCount };
};

export const actions: Actions = {
	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		return redirect(302, '/login');
	},
	initializeCards: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const [deck] = await db
			.select({ id: decks.id })
			.from(decks)
			.where(and(eq(decks.userId, userId), eq(decks.name, DEFAULT_DECK_NAME)));

		const deckId =
			deck?.id ??
			(
				await db
					.insert(decks)
					.values({
						userId,
						name: DEFAULT_DECK_NAME,
						type: NoteType.Vocabulary,
						fsrs: generatorParameters(),
						cardLimit: cardLimitSchema.parse({})
					})
					.returning({ id: decks.id })
			)[0].id;

		const existingNoteIds = db
			.select({ noteId: sql<number>`${decksCards.sourceId}::integer` })
			.from(decksCards)
			.innerJoin(cards, eq(cards.id, decksCards.cardId))
			.where(and(eq(decksCards.deckId, deckId), eq(decksCards.source, 'notes'), eq(cards.userId, userId)));

		const pendingNotes = await db
			.select({ id: notes.id, metadata: notes.metadata })
			.from(notes)
			.where(notInArray(notes.id, existingNoteIds));

		if (pendingNotes.length === 0) {
			return { message: 'Ya tienes tarjetas para todas las notas.', created: 0 };
		}

		const now = new Date();
		const notesWithCards = pendingNotes.flatMap(({ id: noteId, metadata }) => {
			const value = metadata as VocabularyMetadata | null;
			if (!value?.word) return [];

			const card = createEmptyCard(now);

			return [
				{
					noteId,
					card: {
						userId,
						termId: `vocab:${value.word}`,
						due: card.due.getTime(),
						stability: card.stability,
						difficulty: card.difficulty,
						elapsedDays: card.elapsed_days,
						scheduledDays: card.scheduled_days,
						reps: card.reps,
						lapses: card.lapses,
						state: card.state,
						lastReview: card.last_review ? card.last_review.getTime() : null
					}
				}
			];
		});

		const linkedCards = await db.transaction(async (tx) => {
			const existingCards = await tx
				.select({ id: cards.id, termId: cards.termId })
				.from(cards)
				.where(eq(cards.userId, userId));
			const cardIdsByTerm = new Map(existingCards.map((card) => [card.termId, card.id]));
			const missingValues = notesWithCards
				.filter(({ card }) => !cardIdsByTerm.has(card.termId))
				.map(({ card }) => card);
			const insertedCards = missingValues.length
				? await tx
						.insert(cards)
						.values(missingValues)
						.onConflictDoNothing()
						.returning({ id: cards.id, termId: cards.termId })
				: [];

			for (const card of insertedCards) cardIdsByTerm.set(card.termId, card.id);

			await tx.insert(decksCards).values(
				notesWithCards.map(({ noteId, card }) => ({
					deckId,
					cardId: cardIdsByTerm.get(card.termId)!,
					source: 'notes',
					sourceId: String(noteId)
				}))
			);
			return notesWithCards.length;
		});

		return { message: `Se crearon ${linkedCards} tarjetas nuevas.`, created: linkedCards };
	}
};
