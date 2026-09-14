import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { cards, decks, notes, NoteType, cardLimitSchema } from '$lib/server/db/schema';
import { and, count, eq, notInArray } from 'drizzle-orm';
import { createEmptyCard, generatorParameters } from 'ts-fsrs';
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
			.select({ noteId: cards.noteId })
			.from(cards)
			.where(eq(cards.userId, userId));

		const pendingNotes = await db
			.select({ id: notes.id })
			.from(notes)
			.where(notInArray(notes.id, existingNoteIds));

		if (pendingNotes.length === 0) {
			return { message: 'Ya tienes tarjetas para todas las notas.', created: 0 };
		}

		const now = new Date();
		const values = pendingNotes.map(({ id: noteId }) => {
			const card = createEmptyCard(now);
			return {
				userId,
				deckId,
				noteId,
				due: card.due.getTime(),
				stability: card.stability,
				difficulty: card.difficulty,
				elapsedDays: card.elapsed_days,
				scheduledDays: card.scheduled_days,
				reps: card.reps,
				lapses: card.lapses,
				state: card.state,
				lastReview: card.last_review ? card.last_review.getTime() : null
			};
		});

		await db.insert(cards).values(values);

		return { message: `Se crearon ${values.length} tarjetas nuevas.`, created: values.length };
	}
};
