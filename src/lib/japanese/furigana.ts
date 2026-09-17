/**
 * Pure helpers to turn a tokenizer's `surface + reading` pair into ruby
 * segments. Nothing here touches the tokenizer or the database, so it runs on
 * both the server and the client.
 */

import type { FsrsCardRow } from '$lib/fsrs/card';

/** A piece of a word: plain text, plus its reading when it is written in kanji. */
export type FuriganaSegment = {
	text: string;
	/** Hiragana reading, only present for kanji runs. */
	ruby?: string;
};

/** Coarse part-of-speech bucket, used for styling. */
export type TokenCategory =
	| 'noun'
	| 'verb'
	| 'adjective'
	| 'adverb'
	| 'particle'
	| 'auxiliary'
	| 'prefix'
	| 'conjunction'
	| 'symbol'
	| 'other';

/** A word as produced by the tokenizer, ready to render. */
export type JapaneseToken = {
	surface: string;
	/** Hiragana reading of the whole word, empty when the tokenizer has none. */
	reading: string;
	/** Dictionary form, falls back to the surface for unknown words. */
	baseForm: string;
	/** Raw japanese part of speech, e.g. `動詞`. */
	pos: string;
	category: TokenCategory;
	segments: FuriganaSegment[];
	/** The user's FSRS state for this vocabulary word, when it has a card. */
	card?: FsrsCardRow;
};

/** Kanji, plus the iteration marks that behave like kanji (`々`, `ヶ`). */
const kanji = /[\u4e00-\u9fff\u3400-\u4dbf\u3005\u30f6]/;

/** Whether the string contains at least one kanji. */
export function hasKanji(text: string): boolean {
	return kanji.test(text);
}

/** Convert every katakana character to its hiragana counterpart. */
export function toHiragana(text: string): string {
	return text.replace(/[\u30a1-\u30f6]/g, (char) =>
		String.fromCharCode(char.charCodeAt(0) - 0x60)
	);
}

/** Escape a literal so it can be embedded in a regular expression. */
function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split a surface into alternating kanji / non-kanji runs. */
function splitRuns(surface: string): { text: string; isKanji: boolean }[] {
	const runs: { text: string; isKanji: boolean }[] = [];

	for (const char of surface) {
		const isKanji = kanji.test(char);
		const last = runs[runs.length - 1];
		if (last && last.isKanji === isKanji) last.text += char;
		else runs.push({ text: char, isKanji });
	}

	return runs;
}

/**
 * Distribute a word's reading over its kanji runs, so the furigana sits on top
 * of the kanji only and okurigana stays bare.
 *
 * The surface is turned into a pattern where kana runs are literals and kanji
 * runs are lazy captures, then matched against the reading. `食べる` + `タベル`
 * becomes `^(.+?)べる$` over `たべる`, which captures `た` for `食`.
 *
 * When the reading cannot be aligned (irregular readings such as 大人 → おとな
 * still align, but 今日は → こんにちは does not always) the whole word gets a
 * single ruby, which is still correct, just less precise.
 */
export function toFuriganaSegments(surface: string, reading: string): FuriganaSegment[] {
	if (!surface) return [];
	if (!reading || !hasKanji(surface)) return [{ text: surface }];

	const hiraganaReading = toHiragana(reading);
	// A word already written exactly as it is read needs no ruby.
	if (hiraganaReading === toHiragana(surface)) return [{ text: surface }];

	const runs = splitRuns(surface);
	const pattern = runs
		.map((run) => (run.isKanji ? '(.+?)' : escapeRegExp(toHiragana(run.text))))
		.join('');

	const match = new RegExp(`^${pattern}$`).exec(hiraganaReading);
	if (!match) return [{ text: surface, ruby: hiraganaReading }];

	let group = 1;
	return runs.map((run) =>
		run.isKanji ? { text: run.text, ruby: match[group++] } : { text: run.text }
	);
}

/** Map a raw japanese part of speech onto a coarse bucket. */
export function toCategory(pos: string): TokenCategory {
	switch (pos) {
		case '名詞':
			return 'noun';
		case '動詞':
			return 'verb';
		case '形容詞':
			return 'adjective';
		case '副詞':
			return 'adverb';
		case '助詞':
			return 'particle';
		case '助動詞':
			return 'auxiliary';
		case '接頭詞':
			return 'prefix';
		case '接続詞':
			return 'conjunction';
		case '記号':
		case 'フィラー':
			return 'symbol';
		default:
			return 'other';
	}
}
