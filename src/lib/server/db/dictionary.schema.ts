import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import type {
	DictionaryExpression,
	DictionaryFrequency,
	DictionaryGlosses,
	DictionaryKanjiReadings,
	DictionaryPitch,
	DictionaryReading,
	DictionarySense,
	DictionaryTranslations
} from '../../types/dictionary.ts';

/**
 * The dictionary is a global, read-only catalog shared by all users: it is
 * imported wholesale from the NDJSON dump and never edited from the app. It is
 * deliberately decoupled from the FSRS tables (`notes` / `cards`), so a term is
 * never a foreign key of a user's deck.
 *
 * Each NDJSON kind lives in its own table. The three payloads share almost no
 * columns, so a single polymorphic table would push everything into `jsonb` and
 * leave nothing to index. The `id` is the dump's own globally unique identifier
 * (`jmdict:1053680`, `tatoeba:tatoeba_4720`, `kanjidic:羹`), which makes the
 * importer idempotent through a plain `ON CONFLICT (id) DO UPDATE`.
 *
 * Nested arrays (expressions, readings, senses, pitch, frequencies) are stored
 * as `jsonb` because they are never queried by their inner fields. The fields
 * that *are* queried — readings and glosses — are additionally denormalised
 * into flat columns written by the importer:
 *
 * - `*_text` arrays allow exact lookups in Japanese via `@>` with a GIN index.
 * - `search_text` holds every gloss/translation joined into one string, indexed
 *   as `to_tsvector('simple', search_text)`. It cannot be a generated column
 *   because `jsonb_array_elements` is not immutable.
 */

/** A dictionary term (JMdict entry): the vocabulary word with its senses. */
export const dictionaryTerms = pgTable(
	'dictionary_terms',
	{
		/** Global identifier from the dump, e.g. `jmdict:1053680`. */
		id: text('id').primaryKey(),
		/** Source dictionary the entry came from, e.g. `jmdict`. */
		dictionary: text('dictionary').notNull(),
		/** Canonical spelling shown as the entry title. */
		headword: text('headword').notNull(),
		/** Ways of writing the term (kanji, kana, romaji). */
		expressions: jsonb('expressions').$type<DictionaryExpression[]>().notNull().default([]),
		/** Ways of reading the term. */
		readings: jsonb('readings').$type<DictionaryReading[]>().notNull().default([]),
		/** Meanings, each with its own glosses and part of speech. */
		senses: jsonb('senses').$type<DictionarySense[]>().notNull().default([]),
		/** Pitch accent patterns. */
		pitch: jsonb('pitch').$type<DictionaryPitch[]>().notNull().default([]),
		/** Corpus frequency rankings, lower being more common. */
		frequencies: jsonb('frequencies').$type<DictionaryFrequency[]>().notNull().default([]),
		/** Every reading text, flattened for exact lookups. */
		readingsText: text('readings_text').array().notNull().default([]),
		/** Every expression text, flattened for exact lookups. */
		expressionsText: text('expressions_text').array().notNull().default([]),
		/** All glosses across locales, joined for full-text search. */
		searchText: text('search_text').notNull().default(''),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		index('dictionary_terms_readings_text_idx').using('gin', table.readingsText),
		index('dictionary_terms_expressions_text_idx').using('gin', table.expressionsText),
		index('dictionary_terms_search_idx').using(
			'gin',
			sql`to_tsvector('simple', ${table.searchText})`
		),
		index('dictionary_terms_headword_idx').on(table.headword),
		index('dictionary_terms_dictionary_idx').on(table.dictionary)
	]
);

/** A Tatoeba example sentence with its translations. */
export const dictionarySentences = pgTable(
	'dictionary_sentences',
	{
		/** Global identifier from the dump, e.g. `tatoeba:tatoeba_4720`. */
		id: text('id').primaryKey(),
		/** The Japanese sentence. */
		japanese: text('japanese').notNull(),
		/** Translations by locale, e.g. `{ eng: "…", spa: "…" }`. */
		translations: jsonb('translations').$type<DictionaryTranslations>().notNull().default({}),
		/** The sentence plus every translation, joined for full-text search. */
		searchText: text('search_text').notNull().default(''),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		index('dictionary_sentences_search_idx').using(
			'gin',
			sql`to_tsvector('simple', ${table.searchText})`
		)
	]
);

/** A kanji (KANJIDIC entry), with its readings and meanings. */
export const dictionaryKanji = pgTable(
	'dictionary_kanji',
	{
		/** Global identifier from the dump, e.g. `kanjidic:羹`. */
		id: text('id').primaryKey(),
		/** The character itself. Unique, so it doubles as the lookup key. */
		char: text('char').notNull(),
		/** Readings grouped by language or usage. */
		readings: jsonb('readings').$type<DictionaryKanjiReadings>().notNull().default({
			pinyin: [],
			korean_r: [],
			korean_h: [],
			vietnam: [],
			on: [],
			kun: []
		}),
		/** Meanings by locale, e.g. `{ eng: ["hot soup"], spa: ["sopa caliente"] }`. */
		meanings: jsonb('meanings').$type<DictionaryGlosses>().notNull().default({}),
		/** Stroke count. */
		strokes: smallint('strokes'),
		/** Sino-Japanese (on'yomi) readings, flattened for exact lookups. */
		onReadings: text('on_readings').array().notNull().default([]),
		/** Native Japanese (kun'yomi) readings, flattened for exact lookups. */
		kunReadings: text('kun_readings').array().notNull().default([]),
		/** All meanings across locales, joined for full-text search. */
		searchText: text('search_text').notNull().default(''),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		index('dictionary_kanji_char_idx').on(table.char),
		index('dictionary_kanji_on_readings_idx').using('gin', table.onReadings),
		index('dictionary_kanji_kun_readings_idx').using('gin', table.kunReadings),
		index('dictionary_kanji_search_idx').using(
			'gin',
			sql`to_tsvector('simple', ${table.searchText})`
		),
		index('dictionary_kanji_strokes_idx').on(table.strokes)
	]
);
