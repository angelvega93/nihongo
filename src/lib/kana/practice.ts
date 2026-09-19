import {
	enabledKanaForScript,
	filterVocabularyByEnabled,
	type KanaEnabledMap
} from './availability.js';
import { KANA_SCRIPT_IDS, type Kana, type KanaScript, type VocabularyWord } from './data.js';
import { progressKey } from './progress.js';

/**
 * A kana paired with the script it is being practised in. The practice modes
 * mix hiragana and katakana, so every item carries its own script.
 */
export type PracticeKana = {
	kana: Kana;
	script: KanaScript;
	/** Stable identity across scripts, e.g. `hiragana:a`. */
	key: string;
};

/** Total number of enabled kana across both scripts. */
export function countEnabledKana(enabled: KanaEnabledMap): number {
	return KANA_SCRIPT_IDS.reduce(
		(total, script) => total + enabledKanaForScript(enabled, script).length,
		0
	);
}

/**
 * Every enabled kana of both scripts, in table order (hiragana first). This is
 * the pool the practice modes draw from.
 */
export function buildPracticePool(enabled: KanaEnabledMap): PracticeKana[] {
	return KANA_SCRIPT_IDS.flatMap((script) =>
		enabledKanaForScript(enabled, script).map((kana) => ({
			kana,
			script,
			key: progressKey(script, kana.id)
		}))
	);
}

/** Available vocabulary words per script, keyed by script. */
export type WordsByScript = Record<KanaScript, VocabularyWord[]>;

/** Vocabulary words whose kana are all enabled, grouped by script. */
export function buildWordsByScript(enabled: KanaEnabledMap): WordsByScript {
	return {
		hiragana: filterVocabularyByEnabled(enabled, 'hiragana'),
		katakana: filterVocabularyByEnabled(enabled, 'katakana')
	};
}

/**
 * Number of distinct words available for practice. A word counts once even if
 * it is available in both scripts.
 */
export function countAvailableWords(enabled: KanaEnabledMap): number {
	const words = buildWordsByScript(enabled);
	const ids = new Set<string>();
	for (const script of KANA_SCRIPT_IDS) {
		for (const word of words[script]) ids.add(word.id);
	}
	return ids.size;
}
