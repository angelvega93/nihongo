import { db } from '$lib/server/db';
import { dictionaryKanji, dictionarySentences, dictionaryTerms } from '$lib/server/db/schema';
import { asc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

/** A term row as returned by a lookup. */
export type DictionaryTerm = typeof dictionaryTerms.$inferSelect;
/** A sentence row as returned by a lookup. */
export type DictionarySentence = typeof dictionarySentences.$inferSelect;
/** A kanji row as returned by a lookup. */
export type DictionaryKanji = typeof dictionaryKanji.$inferSelect;

/** A page of results plus enough metadata to render pagination. */
export type DictionaryPage<T> = {
	rows: T[];
	/** Total matching rows, or `null` when the count was skipped (browsing). */
	total: number | null;
	page: number;
	/** Total pages, or `null` when the count was skipped (browsing). */
	pageCount: number | null;
	pageSize: number;
};

/**
 * How a term query should be interpreted.
 *
 * - `auto` combines every strategy, ranking exact matches first.
 * - `japanese` matches the term's own spelling or reading (exact, then prefix).
 * - `gloss` matches the English/Spanish meanings.
 */
export const TERM_MODES = ['auto', 'japanese', 'gloss'] as const;
export type TermMode = (typeof TERM_MODES)[number];

/** How a kanji query should be interpreted. */
export const KANJI_MODES = ['auto', 'character', 'reading', 'meaning'] as const;
export type KanjiMode = (typeof KANJI_MODES)[number];

/**
 * How a sentence query should be interpreted.
 *
 * - `auto` searches the Japanese text and the translations.
 * - `japanese` looks for the substring inside the Japanese sentence.
 * - `translation` full-text searches the English/Spanish translations.
 */
export const SENTENCE_MODES = ['auto', 'japanese', 'translation'] as const;
export type SentenceMode = (typeof SENTENCE_MODES)[number];

/** Default page size used when the caller does not specify one. */
const defaultPageSize = 20;
/** Upper bound on the page size, to protect the database from huge fetches. */
const maxPageSize = 50;
/** Rank used for entries with no corpus frequency, so they sort last. */
const unknownRank = 2147483647;
/**
 * Deep `OFFSET` has to walk every skipped row, so browsing is capped to a
 * window that stays fast. Counting the whole table is also skipped when
 * browsing, because `count(*)` over a million rows is far slower than the page
 * itself and nobody needs the exact size of the dictionary.
 */
const maxBrowseOffset = 5000;

// ---------------------------------------------------------------------------
// Condition builders
//
// Each is a function so every call produces a fresh fragment. Reusing a single
// fragment twice in one query would duplicate its bindings, which breaks the
// parameter order.
// ---------------------------------------------------------------------------

/** The term is spelled or read exactly as `text`, e.g. `食べる` or `たべる`. */
const termExact = (text: string): SQL => sql`(
	${dictionaryTerms.readingsText} @> array[${text}]::text[]
	or ${dictionaryTerms.expressionsText} @> array[${text}]::text[]
)`;

/** The headword starts with `text`, e.g. `食` matching `食べる`. */
const termPrefix = (text: string): SQL =>
	sql`${dictionaryTerms.headword} like ${text.replace(/([\\%_])/g, '\\$1') + '%'}`;

/** The English/Spanish glosses match `text` as a full-text query. */
const termGloss = (text: string): SQL =>
	sql`to_tsvector('simple', ${dictionaryTerms.searchText}) @@ websearch_to_tsquery('simple', ${text})`;

/** The kanji is exactly `text`. */
const kanjiCharacter = (text: string): SQL => sql`${dictionaryKanji.char} = ${text}`;

/** An on'yomi or kun'yomi reading of the kanji is exactly `text`. */
const kanjiReading = (text: string): SQL => sql`(
	${dictionaryKanji.onReadings} @> array[${text}]::text[]
	or ${dictionaryKanji.kunReadings} @> array[${text}]::text[]
)`;

/** The English/Spanish meanings match `text` as a full-text query. */
const kanjiMeaning = (text: string): SQL =>
	sql`to_tsvector('simple', ${dictionaryKanji.searchText}) @@ websearch_to_tsquery('simple', ${text})`;

/**
 * The Japanese sentence contains `text`. Uses `strpos` rather than `like` so
 * that `%` and `_` typed by the user are treated as literal characters.
 */
const sentenceContains = (text: string): SQL =>
	sql`strpos(${dictionarySentences.japanese}, ${text}) > 0`;

/** The translations match `text` as a full-text query. */
const sentenceTranslation = (text: string): SQL =>
	sql`to_tsvector('simple', ${dictionarySentences.searchText}) @@ websearch_to_tsquery('simple', ${text})`;

/** Corpus frequency rank, lower being more common. */
const termRank = sql`(${dictionaryTerms.frequencies}->0->>'rank')::int`;

/** Clamps a page size to a sane range. */
function clampPageSize(pageSize: number): number {
	if (!Number.isFinite(pageSize) || pageSize <= 0) return defaultPageSize;
	return Math.min(Math.floor(pageSize), maxPageSize);
}

/** Clamps a 1-based page number to a sane range. */
function clampPage(page: number): number {
	if (!Number.isFinite(page) || page < 1) return 1;
	return Math.min(Math.floor(page), 1000);
}

/** A page with no rows, used for empty queries. */
function emptyPage<T>(pageSize: number): DictionaryPage<T> {
	return { rows: [], total: 0, page: 1, pageCount: 0, pageSize };
}
/** Number of pages needed to hold `total` rows. */
function pageCountFor(total: number, pageSize: number): number {
	return Math.ceil(total / pageSize);
}

/**
 * Read-only access to the imported dictionary catalog. The catalog is global
 * and shared by all users, so none of these methods take a user id.
 *
 * Every search runs a count and a page fetch in parallel over the same
 * conditions, which is cheap here because the conditions are all index-backed.
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

	/** Fetch a kanji by the character itself. */
	async getKanji(char: string): Promise<DictionaryKanji | null> {
		const [kanji] = await db
			.select()
			.from(dictionaryKanji)
			.where(eq(dictionaryKanji.char, char))
			.limit(1);
		return kanji ?? null;
	}

	/**
	 * Search terms by spelling, reading or gloss. Results are ranked: exact
	 * matches first, then prefix matches, then the rest by corpus frequency.
	 */
	async searchTerms(params: {
		text: string;
		mode?: TermMode;
		page?: number;
		pageSize?: number;
	}): Promise<DictionaryPage<DictionaryTerm>> {
		const text = params.text.trim();
		const pageSize = clampPageSize(params.pageSize ?? defaultPageSize);
		if (!text) return emptyPage(pageSize);

		const mode = params.mode ?? 'auto';
		const conditions: SQL[] = [];
		let relevance: SQL | undefined;

		if (mode === 'japanese' || mode === 'auto') {
			conditions.push(termExact(text), termPrefix(text));
			relevance = sql`case
				when ${termExact(text)} then 0
				when ${termPrefix(text)} then 1
				else 2
			end`;
		}
		if (mode === 'gloss' || mode === 'auto') {
			conditions.push(termGloss(text));
		}
		if (conditions.length === 0) return emptyPage(pageSize);

		const where = sql.join(
			conditions.map((condition, index) => (index > 0 ? sql` or ` : sql``).append(condition)),
			sql``
		);

		// A term matched only by gloss has no better rank than a prefix match.
		const order: (SQL | SQL.Aliased)[] = [];
		if (relevance) order.push(relevance);
		order.push(sql`coalesce(${termRank}, ${unknownRank})`, asc(dictionaryTerms.headword));

		return this.paginate(dictionaryTerms, where, order, params.page, pageSize);
	}

	/**
	 * Search kanji by character, reading or meaning. An exact character match
	 * always ranks first.
	 */
	async searchKanji(params: {
		text: string;
		mode?: KanjiMode;
		page?: number;
		pageSize?: number;
	}): Promise<DictionaryPage<DictionaryKanji>> {
		const text = params.text.trim();
		const pageSize = clampPageSize(params.pageSize ?? defaultPageSize);
		if (!text) return emptyPage(pageSize);

		const mode = params.mode ?? 'auto';
		const conditions: SQL[] = [];
		let relevance: SQL | undefined;

		if (mode === 'character' || mode === 'auto') {
			conditions.push(kanjiCharacter(text));
		}
		if (mode === 'reading' || mode === 'auto') {
			conditions.push(kanjiReading(text));
		}
		if (mode === 'meaning' || mode === 'auto') {
			conditions.push(kanjiMeaning(text));
		}
		if (conditions.length === 0) return emptyPage(pageSize);

		if (mode === 'auto') {
			relevance = sql`case
				when ${kanjiCharacter(text)} then 0
				when ${kanjiReading(text)} then 1
				else 2
			end`;
		}

		const where = this.or(conditions);
		const order: (SQL | SQL.Aliased)[] = [];
		if (relevance) order.push(relevance);
		order.push(asc(dictionaryKanji.strokes), asc(dictionaryKanji.char));

		return this.paginate(dictionaryKanji, where, order, params.page, pageSize);
	}

	/** Search example sentences by their Japanese text or their translations. */
	async searchSentences(params: {
		text: string;
		mode?: SentenceMode;
		page?: number;
		pageSize?: number;
	}): Promise<DictionaryPage<DictionarySentence>> {
		const text = params.text.trim();
		const pageSize = clampPageSize(params.pageSize ?? defaultPageSize);
		if (!text) return emptyPage(pageSize);

		const mode = params.mode ?? 'auto';
		const conditions: SQL[] = [];
		let relevance: SQL | undefined;

		if (mode === 'japanese' || mode === 'auto') {
			conditions.push(sentenceContains(text));
		}
		if (mode === 'translation' || mode === 'auto') {
			conditions.push(sentenceTranslation(text));
		}
		if (conditions.length === 0) return emptyPage(pageSize);

		if (mode === 'auto') {
			relevance = sql`case when ${sentenceContains(text)} then 0 else 1 end`;
		}

		const order: (SQL | SQL.Aliased)[] = [];
		if (relevance) order.push(relevance);
		order.push(asc(dictionarySentences.id));

		return this.paginate(dictionarySentences, this.or(conditions), order, params.page, pageSize);
	}

	/**
	 * Browse the catalog by corpus frequency: the most common terms first.
	 * Reads from the frequency expression index, so it never sorts the table.
	 * The total is not counted here; only a bounded window is reachable.
	 */
	async browseTerms(
		params: { page?: number; pageSize?: number } = {}
	): Promise<DictionaryPage<DictionaryTerm>> {
		const pageSize = clampPageSize(params.pageSize ?? defaultPageSize);
		// `nulls last` matches the index expression exactly, keeping it index-only.
		const order = [sql`${termRank} asc nulls last`, asc(dictionaryTerms.headword)];
		return this.paginate(dictionaryTerms, undefined, order, params.page, pageSize, false);
	}

	/** Example sentences shown on a term's detail page, if any match. */
	async getExampleSentencesFor(text: string, limit = 5): Promise<DictionarySentence[]> {
		const trimmed = text.trim();
		if (!trimmed) return [];

		return db
			.select()
			.from(dictionarySentences)
			.where(sentenceContains(trimmed))
			.orderBy(asc(dictionarySentences.id))
			.limit(limit);
	}

	/**
	 * Example sentences for each headword, used to fill a detail pane.
	 *
	 * A `LATERAL` join finds the matches for each headword independently. The
	 * obvious alternative — OR the headwords together under a single global
	 * `LIMIT` — silently starves headwords whose matches sit past the limit, and
	 * it also sorts far more rows than it returns. A `row_number()` inside the
	 * subquery keeps each headword's sentences in a stable order.
	 */
	async getExamplesForHeadwords(
		headwords: string[],
		perHeadword = 1
	): Promise<Map<string, DictionarySentence[]>> {
		const unique = [...new Set(headwords.map((word) => word.trim()).filter(Boolean))];
		if (unique.length === 0) return new Map();

		const limit = Math.max(1, Math.min(Math.floor(perHeadword) || 1, 20));
		const values = unique.map((word) => sql`(${word})`).reduce((a, b) => sql`${a}, ${b}`);

		// Raw SQL because the query builder cannot express a `values` list in FROM.
		// Only ids come back; the rows are then loaded through the builder so the
		// result stays fully typed.
		const matches = await db.execute<{ headword: string; id: string; position: number }>(sql`
			select h.headword, s.id, s.position
			from (values ${values}) as h(headword)
			join lateral (
				select id, row_number() over (order by id) as position
				from ${dictionarySentences} s
				where strpos(s.japanese, h.headword) > 0
				order by s.id
				limit ${limit}
			) s on true
		`);

		const ids = [...new Set(matches.map((row) => row.id))];
		if (ids.length === 0) return new Map();

		const sentences = await db
			.select()
			.from(dictionarySentences)
			.where(inArray(dictionarySentences.id, ids));

		const byId = new Map(sentences.map((sentence) => [sentence.id, sentence]));
		const byHeadword = new Map<string, DictionarySentence[]>();

		// Preserve the order the database returned, which is by sentence id.
		for (const row of [...matches].sort((a, b) => a.position - b.position)) {
			const sentence = byId.get(row.id);
			if (!sentence) continue;
			const list = byHeadword.get(row.headword) ?? [];
			list.push(sentence);
			byHeadword.set(row.headword, list);
		}
		return byHeadword;
	}

	/** Total rows per table, used by the browse screen's summary. */
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

	/** Joins conditions with `or`, tolerating an empty list. */
	private or(conditions: SQL[]): SQL | undefined {
		if (conditions.length === 0) return undefined;
		return sql.join(
			conditions.map((condition, index) => (index > 0 ? sql` or ` : sql``).append(condition)),
			sql``
		);
	}

	/**
	 * Runs the count and the page fetch in parallel and shapes the result.
	 * `where` of `undefined` means "every row", used when browsing. When
	 * `count` is false the total is skipped and the offset is bounded, which is
	 * what keeps the browse view fast.
	 */
	private async paginate<T>(
		table: PgTable,
		where: SQL | undefined,
		order: (SQL | SQL.Aliased)[],
		page: number | undefined,
		pageSize: number,
		count = true
	): Promise<DictionaryPage<T>> {
		const currentPage = clampPage(page ?? 1);
		const offset = (currentPage - 1) * pageSize;

		const rowsQuery = db
			.select()
			.from(table)
			.where(where)
			.orderBy(...order)
			.limit(count ? pageSize : Math.min(pageSize, maxBrowseOffset - offset))
			.offset(count ? offset : Math.min(offset, maxBrowseOffset));

		if (!count) {
			const rows = await rowsQuery;
			return { rows: rows as T[], total: null, page: currentPage, pageCount: null, pageSize };
		}

		const [rows, [counted]] = await Promise.all([
			rowsQuery,
			db
				.select({ value: sql<number>`count(*)::int` })
				.from(table)
				.where(where)
		]);

		const total = counted?.value ?? 0;

		return {
			rows: rows as T[],
			total,
			page: currentPage,
			pageCount: pageCountFor(total, pageSize),
			pageSize
		};
	}
}

export const dictionaryService = new DictionaryService();
