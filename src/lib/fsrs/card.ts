import type { Card as FsrsCard } from 'ts-fsrs';

/**
 * Plain, client-safe shape of a card as stored in the database (camelCase).
 * Shared between server queries and the review UI.
 */
export type FsrsCardRow = {
	due: number;
	stability: number;
	difficulty: number;
	elapsedDays: number;
	scheduledDays: number;
	learningSteps: number;
	reps: number;
	lapses: number;
	state: number;
	lastReview: number | null;
};

/**
 * Convert a database row into a `ts-fsrs` Card.
 *
 * `learning_steps` is preserved so the short-term (re)learning scheduler keeps
 * tracking the current step; forcing it to `0` would reset the step on every
 * review and break the Learning/Relearning states.
 */
export function rowToFsrsCard(row: FsrsCardRow): FsrsCard {
	return {
		due: new Date(row.due),
		stability: row.stability,
		difficulty: row.difficulty,
		elapsed_days: row.elapsedDays,
		scheduled_days: row.scheduledDays,
		learning_steps: row.learningSteps,
		reps: row.reps,
		lapses: row.lapses,
		state: row.state,
		last_review: row.lastReview ? new Date(row.lastReview) : undefined
	};
}

/** Convert a `ts-fsrs` Card into the updatable camelCase columns of `cards`. */
export function fsrsCardToUpdate(card: FsrsCard) {
	return {
		due: card.due.getTime(),
		stability: card.stability,
		difficulty: card.difficulty,
		elapsedDays: card.elapsed_days,
		scheduledDays: card.scheduled_days,
		learningSteps: card.learning_steps,
		reps: card.reps,
		lapses: card.lapses,
		state: card.state,
		lastReview: card.last_review ? card.last_review.getTime() : null
	};
}
