import { db } from '$lib/server/db';
import { dictionaryKanji, dictionarySentences, dictionaryTerms } from '$lib/server/db/schema';
import type { DictionaryKind } from '$lib/types/dictionary';
import { asc, eq, sql } from 'drizzle-orm';

/** A term row as returned by a lookup. */
export type DictionaryTerm = typeof dictionaryTerms.$inferSelect;
/** A sentence row as returned by a lookup. */
export type DictionarySentence = typeof dictionarySentences.$inferSelect;
/** A kanji row as returned by a lookup. */
export type DictionaryKanji = typeof dictionaryKanji.$inferSelect;

/** A search hit for the mixed-type search box. */
export type DictionarySearchHit = {
	kind: DictionaryKind;
	/** The entity's global id, usable to build a detail route. */
	id: string;
	/** Text rendered as the result title. */
	label: string;
	/** A short gloss/metadata line shown under the label. */
	detail: string;
};

/** Default number of rows returned by the search methods. */
const defaultLimit = 20;

/** Joins a list of strings, tolerating an empty result. */
function join(values: string[] | null | undefined, fallback = ''): string {
	return values?.length ? values.join(', ') : fallback;
}

/**
 * Read-only access to the imported dictionary catalog. The catalog is global
 * and shared by all users, so none of these methods take a user id.
 */
export class DictionaryService {
	/** Fetch a single term by its global id, e.g. `jmdict:1053680`. */
	async getTerm(id: string): Promise<DictionaryTerm | null> {
		const [term] = await db
			.select()
			.from(dictionaryTerms)
			.where(eq(dictionaryTerms.id, id))
			.limit(1);
		return term ?? null;
	}

	/**
	 * Find terms written or read exactly as `text`, matching any expression or
	 * reading. Uses the `@>` GIN index, so this stays fast on a full dictionary.
	 */
	async getTermsByText(text: string, limit = defaultLimit): Promise<DictionaryTerm[]> {
		return db
			.select()
			.from(dictionaryTerms)
			.where(
				sql`${dictionaryTerms.readingsText} @> array[${text}]::text[]
					or ${dictionaryTerms.expressionsText} @> array[${text}]::text[]`
			)
			.limit(limit);
	}

	/** Search terms by their English/Spanish glosses with a full-text query. */
	async searchTerms(query: string, limit = defaultLimit): Promise<DictionaryTerm[]> {
		const trimmed = query.trim();
		if (!trimmed) return [];

		return db
			.select()
			.from(dictionaryTerms)
			.where(
				sql`to_tsvector('simple', ${dictionaryTerms.searchText}) @@ websearch_to_tsquery('simple', ${trimmed})`
			)
			.limit(limit);
	}

	/** Fetch a kanji by the character itself. */
	async getKanji(char: string): Promise<DictionaryKanji | null> {
		const [kanji] = await db
			.select()
			.from(dictionaryKanji)
			.where(eq(dictionaryKanji.char, char))
			.limit(1);
		return kanji ?? null;
	}

	/** Find kanji by an exact on'yomi or kun'yomi reading. */
	async getKanjiByReading(reading: string, limit = defaultLimit): Promise<DictionaryKanji[]> {
		return db
			.select()
			.from(dictionaryKanji)
			.where(
				sql`${dictionaryKanji.onReadings} @> array[${reading}]::text[]
					or ${dictionaryKanji.kunReadings} @> array[${reading}]::text[]`
			)
			.limit(limit);
	}

	/** Search kanji by their English/Spanish meanings. */
	async searchKanji(query: string, limit = defaultLimit): Promise<DictionaryKanji[]> {
		const trimmed = query.trim();
		if (!trimmed) return [];

		return db
			.select()
			.from(dictionaryKanji)
			.where(
				sql`to_tsvector('simple', ${dictionaryKanji.searchText}) @@ websearch_to_tsquery('simple', ${trimmed})`
			)
			.limit(limit);
	}

	/** Find example sentences containing `text` verbatim. */
	async getSentencesContaining(text: string, limit = defaultLimit): Promise<DictionarySentence[]> {
		const trimmed = text.trim();
		if (!trimmed) return [];

		return db
			.select()
			.from(dictionarySentences)
			.where(sql`${dictionarySentences.japanese} like ${'%' + trimmed + '%'}`)
			.limit(limit);
	}

	/** Search example sentences by their Japanese text or their translations. */
	async searchSentences(query: string, limit = defaultLimit): Promise<DictionarySentence[]> {
		const trimmed = query.trim();
		if (!trimmed) return [];

		return db
			.select()
			.from(dictionarySentences)
			.where(
				sql`to_tsvector('simple', ${dictionarySentences.searchText}) @@ websearch_to_tsquery('simple', ${trimmed})`
			)
			.limit(limit);
	}

	/**
	 * Search all three kinds at once and return a mixed, ordered list of hits.
	 * Each kind is limited individually so a broad query cannot flood the list.
	 */
	async search(query: string, limitPerKind = 5): Promise<DictionarySearchHit[]> {
		const trimmed = query.trim();
		if (!trimmed) return [];

		const [terms, kanji, sentences] = await Promise.all([
			this.searchTerms(trimmed, limitPerKind),
			this.searchKanji(trimmed, limitPerKind),
			this.searchSentences(trimmed, limitPerKind)
		]);

		return [
			...terms.map((term): DictionarySearchHit => ({
				kind: 'term',
				id: term.id,
				label: term.headword,
				detail: join([
					...term.readingsText,
					...term.senses.flatMap((sense) => Object.values(sense.glosses).flat())
				])
			})),
			...kanji.map((kanjiEntry): DictionarySearchHit => ({
				kind: 'kanji',
				id: kanjiEntry.id,
				label: kanjiEntry.char,
				detail: join(
					[...kanjiEntry.onReadings, ...kanjiEntry.kunReadings],
					join(Object.values(kanjiEntry.meanings).flat())
				)
			})),
			...sentences.map((sentence): DictionarySearchHit => ({
				kind: 'sentence',
				id: sentence.id,
				label: sentence.japanese,
				detail: join(Object.values(sentence.translations))
			}))
		].slice(0, limitPerKind * 3);
	}

	/** A few sentences shown on a term's detail page, if any match. */
	async getExampleSentencesFor(headword: string, limit = 5): Promise<DictionarySentence[]> {
		return this.getSentencesContaining(headword, limit);
	}

	/** Total rows per table, useful to confirm an import finished. */
	async counts(): Promise<{ terms: number; sentences: number; kanji: number }> {
		const [[terms], [sentences], [kanji]] = await Promise.all([
			db.select({ value: sql<number>`count(*)::int` }).from(dictionaryTerms),
			db.select({ value: sql<number>`count(*)::int` }).from(dictionarySentences),
			db.select({ value: sql<number>`count(*)::int` }).from(dictionaryKanji)
		]);

		return {
			terms: terms?.value ?? 0,
			sentences: sentences?.value ?? 0,
			kanji: kanji?.value ?? 0
		};
	}

	/** The most common terms by corpus rank, for a "word of the day" style view. */
	async listCommonTerms(limit = defaultLimit): Promise<DictionaryTerm[]> {
		return db
			.select()
			.from(dictionaryTerms)
			.where(sql`jsonb_array_length(${dictionaryTerms.frequencies}) > 0`)
			.orderBy(asc(sql`(${dictionaryTerms.frequencies}->0->>'rank')::int`))
			.limit(limit);
	}
}

export const dictionaryService = new DictionaryService();
