import { db } from '$lib/server/db';
import { kanaEnabled, kanaLessonProgress, kanaProgress } from '$lib/server/db/schema';
import { applyAttempt, progressKey, KanaMastery, type KanaProgressMap } from '$lib/kana/progress';
import { isKanaScript, kanaById, type KanaScript } from '$lib/kana/data';
import { kanaLessonById, lessonKana } from '$lib/kana/lessons';
import { and, eq, inArray } from 'drizzle-orm';
import { ProgressStatus } from '$lib/types/course';
import type { KanaEnabledMap } from '$lib/kana/availability';

/** A single attempt to persist. */
export type KanaAttempt = {
	script: KanaScript;
	kanaId: string;
	correct: boolean;
};

export class KanaService {
	/** Load every progress row of a user, keyed by `script:kanaId`. */
	async getProgress(userId: string): Promise<KanaProgressMap> {
		const rows = await db.select().from(kanaProgress).where(eq(kanaProgress.userId, userId));

		const map: KanaProgressMap = {};
		for (const row of rows) {
			map[progressKey(row.script, row.kanaId)] = {
				script: row.script,
				kanaId: row.kanaId,
				correct: row.correct,
				attempts: row.attempts,
				streak: row.streak,
				mastery: row.mastery,
				lastPracticedAt: row.lastPracticedAt?.getTime() ?? null
			};
		}
		return map;
	}

	/**
	 * Record one or more attempts, upserting the counters and recomputing the
	 * mastery level. Invalid kana ids are ignored so a stale client cannot
	 * pollute the table.
	 */
	async recordAttempts(userId: string, attempts: KanaAttempt[]): Promise<KanaProgressMap> {
		const valid = attempts.filter(
			(attempt) => isKanaScript(attempt.script) && kanaById(attempt.kanaId) !== undefined
		);
		if (valid.length === 0) return {};

		const now = Date.now();
		const existing = await this.getProgress(userId);
		const updated: KanaProgressMap = {};

		for (const attempt of valid) {
			const key = progressKey(attempt.script, attempt.kanaId);
			const next = applyAttempt(
				existing[key],
				attempt.script,
				attempt.kanaId,
				attempt.correct,
				now
			);
			existing[key] = next;
			updated[key] = next;
		}

		await db.transaction(async (tx) => {
			for (const entry of Object.values(updated)) {
				await tx
					.insert(kanaProgress)
					.values({
						userId,
						script: entry.script,
						kanaId: entry.kanaId,
						correct: entry.correct,
						attempts: entry.attempts,
						streak: entry.streak,
						mastery: entry.mastery,
						lastPracticedAt: new Date(entry.lastPracticedAt ?? now)
					})
					.onConflictDoUpdate({
						target: [kanaProgress.userId, kanaProgress.script, kanaProgress.kanaId],
						set: {
							correct: entry.correct,
							attempts: entry.attempts,
							streak: entry.streak,
							mastery: entry.mastery,
							lastPracticedAt: new Date(entry.lastPracticedAt ?? now),
							updatedAt: new Date()
						}
					});
			}
		});

		return updated;
	}

	/** Reset progress for one script, or for every script when omitted. */
	async resetProgress(userId: string, script?: KanaScript): Promise<void> {
		const where = script
			? and(eq(kanaProgress.userId, userId), eq(kanaProgress.script, script))
			: eq(kanaProgress.userId, userId);
		await db.delete(kanaProgress).where(where);
	}

	/** Count how many kana of a script the user has mastered. */
	async countMastered(userId: string, script: KanaScript): Promise<number> {
		const rows = await db
			.select({ kanaId: kanaProgress.kanaId })
			.from(kanaProgress)
			.where(
				and(
					eq(kanaProgress.userId, userId),
					eq(kanaProgress.script, script),
					eq(kanaProgress.mastery, KanaMastery.Mastered)
				)
			);
		return rows.length;
	}

	/** Completed guided-lesson slugs of a user, keyed by lesson slug. */
	async getLessonProgress(userId: string): Promise<Record<string, ProgressStatus>> {
		const rows = await db
			.select({ lessonSlug: kanaLessonProgress.lessonSlug, status: kanaLessonProgress.status })
			.from(kanaLessonProgress)
			.where(eq(kanaLessonProgress.userId, userId));

		const map: Record<string, ProgressStatus> = {};
		for (const row of rows) {
			map[row.lessonSlug] = row.status as ProgressStatus;
		}
		return map;
	}

	/** Mark a guided kana lesson as completed, upserting the row. */
	async completeLesson(userId: string, lessonSlug: string): Promise<void> {
		const now = new Date();

		// Enabling is only automatic the first time a lesson is finished, so
		// re-playing it never overwrites the user's manual selection.
		const previous = await db
			.select({ status: kanaLessonProgress.status })
			.from(kanaLessonProgress)
			.where(
				and(eq(kanaLessonProgress.userId, userId), eq(kanaLessonProgress.lessonSlug, lessonSlug))
			)
			.limit(1);
		const wasCompleted = previous[0]?.status === ProgressStatus.Completed;

		await db
			.insert(kanaLessonProgress)
			.values({
				userId,
				lessonSlug,
				status: ProgressStatus.Completed,
				completedAt: now
			})
			.onConflictDoUpdate({
				target: [kanaLessonProgress.userId, kanaLessonProgress.lessonSlug],
				set: { status: ProgressStatus.Completed, completedAt: now, updatedAt: now }
			});

		if (wasCompleted) return;

		const lesson = kanaLessonById(lessonSlug);
		if (!lesson?.script) return;

		const kana = lessonKana(lesson);
		if (kana.length === 0) return;

		await db
			.insert(kanaEnabled)
			.values(
				kana.map((entry) => ({
					userId,
					script: lesson.script as KanaScript,
					kanaId: entry.id
				}))
			)
			.onConflictDoNothing();
	}

	/** Clear completion for one guided lesson, or for all of them. */
	async resetLessonProgress(userId: string, lessonSlug?: string): Promise<void> {
		const where = lessonSlug
			? and(eq(kanaLessonProgress.userId, userId), eq(kanaLessonProgress.lessonSlug, lessonSlug))
			: eq(kanaLessonProgress.userId, userId);
		await db.delete(kanaLessonProgress).where(where);
	}

	/** Enabled kana of a user, keyed by `script:kanaId`. */
	async getEnabledKana(userId: string): Promise<KanaEnabledMap> {
		const rows = await db
			.select({
				script: kanaEnabled.script,
				kanaId: kanaEnabled.kanaId
			})
			.from(kanaEnabled)
			.where(eq(kanaEnabled.userId, userId));

		const map: KanaEnabledMap = {};
		for (const row of rows) {
			map[progressKey(row.script, row.kanaId)] = true;
		}
		return map;
	}

	/** Enable or disable a single kana for practice. */
	async setKanaEnabled(
		userId: string,
		script: KanaScript,
		kanaId: string,
		enabled: boolean
	): Promise<void> {
		await this.setManyKanaEnabled(userId, script, [kanaId], enabled);
	}

	/** Enable or disable several kana of a script at once. */
	async setManyKanaEnabled(
		userId: string,
		script: KanaScript,
		kanaIds: string[],
		enabled: boolean
	): Promise<void> {
		const valid = kanaIds.filter((kanaId) => kanaById(kanaId) !== undefined);
		if (valid.length === 0) return;

		if (enabled) {
			await db
				.insert(kanaEnabled)
				.values(valid.map((kanaId) => ({ userId, script, kanaId })))
				.onConflictDoNothing();
			return;
		}

		await db
			.delete(kanaEnabled)
			.where(
				and(
					eq(kanaEnabled.userId, userId),
					eq(kanaEnabled.script, script),
					inArray(kanaEnabled.kanaId, valid)
				)
			);
	}

	/** Disable every kana of a script, or of every script when omitted. */
	async resetEnabledKana(userId: string, script?: KanaScript): Promise<void> {
		const where = script
			? and(eq(kanaEnabled.userId, userId), eq(kanaEnabled.script, script))
			: eq(kanaEnabled.userId, userId);
		await db.delete(kanaEnabled).where(where);
	}
}

export const kanaService = new KanaService();
