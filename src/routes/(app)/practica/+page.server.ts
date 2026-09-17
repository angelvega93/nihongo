import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cards, decks, decksCards, notes, revLog } from '$lib/server/db/schema';
import { and, asc, count, eq, gte, lt, ne, or, sql } from 'drizzle-orm';
import { Rating, State, type Grade } from 'ts-fsrs';
import { reviewService } from '$lib/server/services/fsrs/review';
import type { VocabularyMetadata } from '$lib/types/note-metadata';
import type { Actions, PageServerLoad } from './$types';

const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

// Study day starts at 4am, so late-night reviews count towards the previous day.
function startOfStudyDay(now: Date): Date {
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0, 0);
	if (now.getHours() < 4) start.setDate(start.getDate() - 1);
	return start;
}

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const now = new Date();
	const startOfDay = startOfStudyDay(now);

	const todayCounts = await db
		.select({ state: revLog.state, value: count() })
		.from(revLog)
		.where(and(eq(revLog.userId, userId), gte(revLog.review, startOfDay.getTime())))
		.groupBy(revLog.state);

	const todayCount = new Map<number, number>(
		todayCounts.map((row) => [row.state, Number(row.value)])
	);

	const subQuery = db
		.select({
			id: cards.id,
			noteId: sql<number>`${decksCards.sourceId}::integer`.as('note_id'),
			due: cards.due,
			stability: cards.stability,
			difficulty: cards.difficulty,
			elapsedDays: cards.elapsedDays,
			scheduledDays: cards.scheduledDays,
			learningSteps: cards.learningSteps,
			reps: cards.reps,
			lapses: cards.lapses,
			state: cards.state,
			lastReview: cards.lastReview,
			deckFsrs: decks.fsrs,
			rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${decksCards.deckId}, ${cards.state} ORDER BY ${cards.id})::int`.as(
				'rn'
			),
			stateLimit: sql<number>`(CASE ${cards.state}
				WHEN ${State.New} THEN GREATEST(0, COALESCE((${decks.cardLimit}->>'new')::bigint, 50) - ${todayCount.get(State.New) ?? 0})
				WHEN ${State.Review} THEN GREATEST(0, COALESCE((${decks.cardLimit}->>'review')::bigint, 9007199254740991) - ${todayCount.get(State.Review) ?? 0})
				WHEN ${State.Learning} THEN GREATEST(0, COALESCE((${decks.cardLimit}->>'learning')::bigint, 9007199254740991) - ${todayCount.get(State.Learning) ?? 0})
				WHEN ${State.Relearning} THEN GREATEST(0, COALESCE((${decks.cardLimit}->>'learning')::bigint, 9007199254740991) - ${todayCount.get(State.Relearning) ?? 0})
			END)::bigint`.as('state_limit')
		})
		.from(cards)
		.innerJoin(decksCards, eq(decksCards.cardId, cards.id))
		.innerJoin(decks, eq(decks.id, decksCards.deckId))
		.where(
			and(
				eq(cards.userId, userId),
				eq(cards.deleted, 0),
				eq(cards.suspended, 0),
				or(
					and(eq(cards.state, State.Review), lt(cards.due, now.getTime())),
					ne(cards.state, State.Review)
				)
			)
		)
		.as('sub');

	const dueCards = await db
		.select({
			id: subQuery.id,
			noteId: subQuery.noteId,
			due: subQuery.due,
			stability: subQuery.stability,
			difficulty: subQuery.difficulty,
			elapsedDays: subQuery.elapsedDays,
			scheduledDays: subQuery.scheduledDays,
			learningSteps: subQuery.learningSteps,
			reps: subQuery.reps,
			lapses: subQuery.lapses,
			state: subQuery.state,
			lastReview: subQuery.lastReview,
			deckFsrs: subQuery.deckFsrs,
			metadata: notes.metadata
		})
		.from(subQuery)
		.innerJoin(notes, eq(notes.id, subQuery.noteId))
		.where(sql`${subQuery.rn} <= ${subQuery.stateLimit}`)
		.orderBy(asc(subQuery.state), asc(subQuery.due));

	return {
		dueCards: dueCards.map((row) => ({ ...row, metadata: row.metadata as VocabularyMetadata }))
	};
};

export const actions: Actions = {
	review: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const formData = await event.request.formData();
		const cardId = Number(formData.get('cardId'));
		const grade = Number(formData.get('grade')) as Grade;
		const duration = Number(formData.get('duration') ?? 0);
		const offset = -new Date().getTimezoneOffset();

		if (!cardId || !GRADES.includes(grade)) {
			return fail(400, { message: 'Datos inválidos' });
		}

		try {
			const result = await reviewService.next(userId, cardId, Date.now(), grade, {
				duration,
				offset
			});
			return { success: true, ...result };
		} catch {
			return fail(404, { message: 'Tarjeta no encontrada' });
		}
	},

	/** Revert the most recent review of a card. */
	undo: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const formData = await event.request.formData();
		const cardId = Number(formData.get('cardId'));
		const logId = Number(formData.get('logId'));

		if (!cardId || !logId) return fail(400, { message: 'Datos inválidos' });

		try {
			const result = await reviewService.undo(userId, cardId, logId);
			return { success: true, ...result };
		} catch {
			return fail(404, { message: 'No se pudo deshacer el repaso.' });
		}
	},

	/** Reset a card back to the New state. */
	forget: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const formData = await event.request.formData();
		const cardId = Number(formData.get('cardId'));
		const resetCount = formData.get('resetCount') === 'true';

		if (!cardId) return fail(400, { message: 'Datos inválidos' });

		try {
			const result = await reviewService.forget(userId, cardId, Date.now(), resetCount);
			return { success: true, ...result };
		} catch {
			return fail(404, { message: 'Tarjeta no encontrada' });
		}
	},

	/** Toggle the suspended flag of a card. */
	suspend: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const formData = await event.request.formData();
		const cardId = Number(formData.get('cardId'));
		const suspended = formData.get('suspended') === 'true';

		if (!cardId) return fail(400, { message: 'Datos inválidos' });

		try {
			const result = await reviewService.switchSuspend(userId, cardId, suspended);
			return { success: true, ...result };
		} catch {
			return fail(404, { message: 'Tarjeta no encontrada' });
		}
	}
};
