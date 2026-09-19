import { type KanaScript, uniqueKana } from './data.js';

/**
 * Mastery level of a single kana for a given user.
 * Stored as a smallint in the database, so the numeric values are stable.
 */
export const KanaMastery = {
	New: 0,
	Learning: 1,
	Mastered: 2
} as const;

export type KanaMastery = (typeof KanaMastery)[keyof typeof KanaMastery];

/** Number of correct answers required before a kana can be mastered. */
export const MASTERY_CORRECT_THRESHOLD = 3;
/** Minimum accuracy (0–1) required to reach mastery. */
export const MASTERY_ACCURACY_THRESHOLD = 0.8;

/** Per-kana progress as stored in the database. */
export type KanaProgress = {
	script: KanaScript;
	kanaId: string;
	correct: number;
	attempts: number;
	streak: number;
	mastery: KanaMastery;
	lastPracticedAt: number | null;
};

/** A progress row keyed by `script:kanaId`, ready for lookups in the UI. */
export type KanaProgressMap = Record<string, KanaProgress>;

export function progressKey(script: KanaScript, kanaId: string): string {
	return `${script}:${kanaId}`;
}

/**
 * Derive the mastery level from the raw counters. Pure so it can run both on
 * the server (when persisting) and on the client (for optimistic updates).
 */
export function computeMastery(correct: number, attempts: number, _streak: number): KanaMastery {
	if (attempts === 0) return KanaMastery.New;
	const accuracy = correct / attempts;
	if (correct >= MASTERY_CORRECT_THRESHOLD && accuracy >= MASTERY_ACCURACY_THRESHOLD) {
		return KanaMastery.Mastered;
	}
	return KanaMastery.Learning;
}

/** Apply a single attempt to a progress row, returning the updated counters. */
export function applyAttempt(
	progress: KanaProgress | undefined,
	script: KanaScript,
	kanaId: string,
	isCorrect: boolean,
	now: number
): KanaProgress {
	const correct = (progress?.correct ?? 0) + (isCorrect ? 1 : 0);
	const attempts = (progress?.attempts ?? 0) + 1;
	const streak = isCorrect ? (progress?.streak ?? 0) + 1 : 0;

	return {
		script,
		kanaId,
		correct,
		attempts,
		streak,
		mastery: computeMastery(correct, attempts, streak),
		lastPracticedAt: now
	};
}

/** Aggregate counters for a set of progress rows. */
export type KanaProgressSummary = {
	total: number;
	mastered: number;
	learning: number;
	new: number;
	/** Integer 0–100, weighted by mastery level. */
	percent: number;
};

export function summarizeProgress(progress: KanaProgressMap): KanaProgressSummary {
	const catalog = uniqueKana();
	const total = catalog.length;
	let mastered = 0;
	let learning = 0;

	for (const kana of catalog) {
		const entry =
			progress[progressKey('hiragana', kana.id)] ?? progress[progressKey('katakana', kana.id)];
		if (!entry) continue;
		if (entry.mastery === KanaMastery.Mastered) mastered += 1;
		else if (entry.mastery === KanaMastery.Learning) learning += 1;
	}

	return {
		total,
		mastered,
		learning,
		new: total - mastered - learning,
		percent: total === 0 ? 0 : Math.round((mastered / total) * 100)
	};
}

/** Tailwind classes used to colour a kana tile by mastery level. */
export function masteryClasses(mastery: KanaMastery): string {
	switch (mastery) {
		case KanaMastery.Mastered:
			return 'border-primary/60 bg-primary/15 text-foreground';
		case KanaMastery.Learning:
			return 'border-amber-400/60 bg-amber-100/60 text-foreground dark:bg-amber-500/15';
		default:
			return 'border-border bg-background text-muted-foreground';
	}
}

/** Spanish label for a mastery level. */
export function masteryLabel(mastery: KanaMastery): string {
	switch (mastery) {
		case KanaMastery.Mastered:
			return 'Dominado';
		case KanaMastery.Learning:
			return 'En progreso';
		default:
			return 'Nuevo';
	}
}
