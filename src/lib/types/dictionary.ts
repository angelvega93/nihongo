/**
 * Types for the offline dictionary catalog imported from the NDJSON dump.
 *
 * The dump interleaves three entity kinds, discriminated by its `type` field:
 * sentences (Tatoeba), terms (JMdict) and kanji (KANJIDIC). Each kind is stored
 * in its own table but shares this module as the single source of truth for the
 * shape of its payloads.
 */

/** The `type` discriminator used by every NDJSON line. */
export const DictionaryKind = {
	Sentence: 'sentence',
	Term: 'term',
	Kanji: 'kanji'
} as const;

export type DictionaryKind = (typeof DictionaryKind)[keyof typeof DictionaryKind];

/**
 * The metadata line at the head of the dump. It is not an entry, but it tells
 * us which schema version and locales the file was produced with.
 */
export const DictionaryHeaderKind = 'header';

export type DictionaryHeader = {
	type: typeof DictionaryHeaderKind;
	/** Dump format version; the importer is written against version 4. */
	schemaVersion: number;
	/** Locales for which glosses and translations are present. */
	languages: DictionaryLocale[];
	/** Producer of the dump, e.g. `Shirabe open-core`. */
	source: string;
};

/**
 * Locale codes used by the dump for glosses and translations. They follow the
 * ISO 639-2 codes emitted by the source data (`eng`, `spa`) rather than the
 * app's two-letter locale codes.
 */
export const DictionaryLocale = {
	English: 'eng',
	Spanish: 'spa'
} as const;

export type DictionaryLocale = (typeof DictionaryLocale)[keyof typeof DictionaryLocale];

/** Every locale for which the dump may carry a translation. */
export const DICTIONARY_LOCALES: DictionaryLocale[] = [
	DictionaryLocale.English,
	DictionaryLocale.Spanish
];

/**
 * A multilingual map of word lists, e.g. `{ eng: ["confession"], spa: ["confesión"] }`.
 * Locales without data are simply absent.
 */
export type DictionaryGlosses = Partial<Record<DictionaryLocale, string[]>>;

/**
 * A multilingual map of single strings, e.g. `{ eng: "Education…", spa: "La educación…" }`.
 * Sentence translations are a single string per locale, unlike glosses.
 */
export type DictionaryTranslations = Partial<Record<DictionaryLocale, string>>;

/** Flatten gloss arrays for one locale, tolerating missing locales. */
export function readGlosses(glosses: DictionaryGlosses | null, locale: DictionaryLocale): string[] {
	return glosses?.[locale] ?? [];
}

/** All glosses across every locale, flattened into a single list. */
export function flattenGlosses(glosses: DictionaryGlosses | null): string[] {
	if (!glosses) return [];
	return DICTIONARY_LOCALES.flatMap((locale) => glosses[locale] ?? []);
}

// ---------------------------------------------------------------------------
// Terms (JMdict)
// ---------------------------------------------------------------------------

/** The writing system a term expression is spelled in. */
export type DictionaryScript = 'kana' | 'kanji' | 'romaji' | (string & {});

/** One way of writing a term, e.g. the kanji form of a kana headword. */
export type DictionaryExpression = {
	text: string;
	script: DictionaryScript;
	/** Whether the source flags this expression as common. */
	common: boolean;
	tags: string[];
};

/** One way of reading a term, e.g. its kana or romaji rendering. */
export type DictionaryReading = {
	text: string;
	kind: string;
};

/**
 * A single sense (meaning) of a term. A term usually has several senses, each
 * with its own glosses, part of speech and usage restrictions.
 */
export type DictionarySense = {
	glosses: DictionaryGlosses;
	partsOfSpeech: string[];
	fields: string[];
	/** Usage notes such as `abbr`, `arch` or `sl`. */
	misc: string[];
	dialects: string[];
	/** Expressions this sense is restricted to, if the term is split. */
	restrictions: string[];
};

/** Pitch accent of a term: where the downstep falls in the reading. */
export type DictionaryPitch = {
	text: string;
	reading: string;
	/** Mora index of the downstep; `0` means no downstep (heiban). */
	downstep: number;
};

/** How common a term is according to a given ranking source. */
export type DictionaryFrequency = {
	source: string;
	text: string;
	reading: string;
	/** Lower is more common. */
	rank: number;
};

/** The payload of a `{"type":"term"}` NDJSON line. */
export type DictionaryTermPayload = {
	id: string;
	dictionary: string;
	headword: string;
	expressions: DictionaryExpression[];
	readings: DictionaryReading[];
	senses: DictionarySense[];
	pitch: DictionaryPitch[];
	frequencies: DictionaryFrequency[];
};

// ---------------------------------------------------------------------------
// Sentences (Tatoeba)
// ---------------------------------------------------------------------------

/** The payload of a `{"type":"sentence"}` NDJSON line. */
export type DictionarySentencePayload = {
	id: string;
	japanese: string;
	translations: DictionaryTranslations;
};

// ---------------------------------------------------------------------------
// Kanji (KANJIDIC)
// ---------------------------------------------------------------------------

/**
 * Readings of a kanji grouped by language or usage. `on` and `kun` hold the
 * Japanese readings; the rest are historical readings from other languages.
 */
export type DictionaryKanjiReadings = {
	/** Mandarin pinyin readings, e.g. `["geng1"]`. */
	pinyin: string[];
	/** Korean romanised readings, e.g. `["gaeng"]`. */
	korean_r: string[];
	/** Korean hangul readings, e.g. `["갱"]`. */
	korean_h: string[];
	/** Vietnamese readings, e.g. `["Canh", "Lang"]`. */
	vietnam: string[];
	/** Sino-Japanese (on'yomi) readings. */
	on: string[];
	/** Native Japanese (kun'yomi) readings. */
	kun: string[];
};

/** The payload of a `{"type":"kanji"}` NDJSON line. */
export type DictionaryKanjiPayload = {
	id: string;
	char: string;
	readings: DictionaryKanjiReadings;
	meanings: DictionaryGlosses;
	strokes: number;
};

/** Any of the three NDJSON line shapes, discriminated by `type`. */
export type DictionaryEntry =
	| ({ type: typeof DictionaryKind.Term } & DictionaryTermPayload)
	| ({ type: typeof DictionaryKind.Sentence } & DictionarySentencePayload)
	| ({ type: typeof DictionaryKind.Kanji } & DictionaryKanjiPayload);

/** Any line in the dump: the metadata header, or a data entry. */
export type DictionaryLine = DictionaryHeader | DictionaryEntry;
