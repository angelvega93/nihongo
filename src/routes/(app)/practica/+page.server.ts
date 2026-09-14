import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cards, decks, notes, revLog } from '$lib/server/db/schema';
import { and, asc, count, eq, gte, lt, ne, or, sql } from 'drizzle-orm';
import { fsrs, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs';
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
			deckFsrs: decks.fsrs,
			rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${cards.deckId}, ${cards.state} ORDER BY ${cards.id})::int`.as('rn'),
			stateLimit: sql<number>`(CASE ${cards.state}
				WHEN ${State.New} THEN GREATEST(0, COALESCE((${decks.cardLimit}->>'new')::bigint, 50) - ${todayCount.get(State.New) ?? 0})
				WHEN ${State.Review} THEN GREATEST(0, COALESCE((${decks.cardLimit}->>'review')::bigint, 9007199254740991) - ${todayCount.get(State.Review) ?? 0})
				WHEN ${State.Learning} THEN GREATEST(0, COALESCE((${decks.cardLimit}->>'learning')::bigint, 9007199254740991) - ${todayCount.get(State.Learning) ?? 0})
				WHEN ${State.Relearning} THEN GREATEST(0, COALESCE((${decks.cardLimit}->>'learning')::bigint, 9007199254740991) - ${todayCount.get(State.Relearning) ?? 0})
			END)::bigint`.as('state_limit')
		})
		.from(cards)
		.innerJoin(decks, eq(decks.id, cards.deckId))
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
