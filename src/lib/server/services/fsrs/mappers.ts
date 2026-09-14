import type { cards, revLog } from '$lib/server/db/schema';
import { fsrsCardToUpdate, rowToFsrsCard } from '$lib/fsrs/card';
import type { Card as FsrsCard, Rating, ReviewLog, State } from 'ts-fsrs';

export type CardRow = typeof cards.$inferSelect;
export type RevLogRow = typeof revLog.$inferSelect;

/** Convert a `cards` row into a `ts-fsrs` Card (preserving `learning_steps`). */
export function toFsrsCard(row: CardRow): FsrsCard {
	return rowToFsrsCard(row);
}

/** Convert a `ts-fsrs` Card into the updatable columns of `cards`. */
export function cardToUpdate(card: FsrsCard) {
	return fsrsCardToUpdate(card);
}

/** Convert a `rev_log` row into a `ts-fsrs` ReviewLog, injecting `rating`. */
export function toReviewLog(row: RevLogRow): ReviewLog {
	return {
		rating: row.grade as Rating,
		state: row.state as State,
		due: new Date(row.due),
		stability: row.stability,
		difficulty: row.difficulty,
		elapsed_days: row.elapsedDays,
		last_elapsed_days: row.lastElapsedDays,
		scheduled_days: row.scheduledDays,
		learning_steps: row.learningSteps,
		review: new Date(row.review)
	};
}

type LogContext = {
	userId: string;
	cardId: number;
	offset?: number;
	duration?: number;
};

/** Convert a `ts-fsrs` ReviewLog into the insertable columns of `rev_log`. */
export function logToInsert(log: ReviewLog, context: LogContext) {
	return {
		userId: context.userId,
		cardId: context.cardId,
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
		duration: context.duration ?? 0,
		offset: context.offset ?? 0
	};
}
