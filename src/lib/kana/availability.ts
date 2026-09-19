import {
	allKanaForScript,
	VOCABULARY,
	wordKanaIds,
	type Kana,
	type KanaScript,
	type VocabularyWord
} from './data.js';
import { progressKey } from './progress.js';

/**
 * Keys (`script:kanaId`) of every kana a user has enabled for practice.
 * A missing key means the kana is disabled.
 */
export type KanaEnabledMap = Record<string, true>;

/** Whether a single kana is enabled for practice. */
export function isKanaEnabled(
	enabled: KanaEnabledMap,
	script: KanaScript,
	kanaId: string
): boolean {
	return enabled[progressKey(script, kanaId)] === true;
}

/**
 * Layer optimistic toggles on top of the persisted map, so the UI reacts
 * instantly while the remote command is in flight. A `false` override removes
 * the key; a `true` one adds it.
 */
export function applyEnabledOverrides(
	enabled: KanaEnabledMap,
	overrides: Record<string, boolean>
): KanaEnabledMap {
	const merged: KanaEnabledMap = { ...enabled };
	for (const [key, value] of Object.entries(overrides)) {
		if (value) merged[key] = true;
		else delete merged[key];
	}
	return merged;
}

/** Kana ids of a script the user has enabled, in table order. */
export function enabledKanaForScript(enabled: KanaEnabledMap, script: KanaScript): Kana[] {
	return allKanaForScript(script).filter((kana) => isKanaEnabled(enabled, script, kana.id));
}

/**
 * Vocabulary words whose every kana is enabled for the given script. Words
 * with unknown characters (none in the current catalog) are kept as-is.
 */
export function filterVocabularyByEnabled(
	enabled: KanaEnabledMap,
	script: KanaScript
): VocabularyWord[] {
	return VOCABULARY.filter((word) => {
		const ids = wordKanaIds(word);
		return ids.length > 0 && ids.every((kanaId) => isKanaEnabled(enabled, script, kanaId));
	});
}
