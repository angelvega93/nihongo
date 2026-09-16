import {
	dictionaryService,
	KANJI_MODES,
	SENTENCE_MODES,
	TERM_MODES,
	type KanjiMode,
	type SentenceMode,
	type TermMode
} from '$lib/server/services/dictionary/dictionary';
import type { PageServerLoad } from './$types';

/**
 * The three searches the page offers, each backed by its own table. SvelteKit
 * forbids extra exports from a load file, so these stay module-private.
 */
const TABS = ['term', 'kanji', 'sentence'] as const;
type Tab = (typeof TABS)[number];

/** The modes each tab accepts, used to validate the URL. */
const MODES_BY_TAB = {
	term: TERM_MODES,
	kanji: KANJI_MODES,
	sentence: SENTENCE_MODES
} as const;

/** How many results the master list shows per page. */
const PAGE_SIZE = 24;
/** How many example sentences a detail pane shows for the selected entry. */
const DETAIL_EXAMPLES = 4;

/** Whether `value` is one of `options`. */
function isOneOf<T extends readonly string[]>(
	options: T,
	value: string | null
): value is T[number] {
	return value !== null && (options as readonly string[]).includes(value);
}

/**
 * Turns a headword → sentences lookup into the plain object sent to the page.
 * Only the selected entry is ever looked up, so this holds at most one key.
 */
async function examplesFor(headword: string) {
	const found = await dictionaryService.getExamplesForHeadwords([headword], DETAIL_EXAMPLES);
	return Object.fromEntries(found);
}

export const load: PageServerLoad = async (event) => {
	const params = event.url.searchParams;

	const query = (params.get('q') ?? '').trim();
	const tabParam = params.get('tipo');
	const tab: Tab = isOneOf(TABS, tabParam) ? tabParam : 'term';

	const modes = MODES_BY_TAB[tab];
	const modeParam = params.get('modo');
	// `auto` is the default, so an absent or unknown mode falls back to it.
	const mode = isOneOf(modes, modeParam) ? modeParam : 'auto';

	const page = Number(params.get('pagina') ?? 1) || 1;
	// Which result the detail pane shows; empty means "the first one".
	const selection = params.get('sel') ?? '';

	// Nothing typed yet: show a browsable slice of the catalog plus its size.
	// There is no detail pane here, so the extra fields are simply empty.
	if (!query) {
		const [common, counts] = await Promise.all([
			dictionaryService.browseTerms({ page, pageSize: PAGE_SIZE }),
			dictionaryService.counts()
		]);

		return { query, tab, mode, page: common.page, result: null, common, counts };
	}

	const shared = { text: query, page, pageSize: PAGE_SIZE };

	if (tab === 'kanji') {
		const page_ = await dictionaryService.searchKanji({ ...shared, mode: mode as KanjiMode });
		const detail = page_.rows.find((row) => row.id === selection) ?? page_.rows[0] ?? null;

		return {
			query,
			tab,
			mode,
			page,
			result: {
				kind: 'kanji' as const,
				page: page_,
				detail,
				examples: detail ? await examplesFor(detail.char) : {}
			},
			common: null,
			counts: null
		};
	}

	if (tab === 'sentence') {
		const page_ = await dictionaryService.searchSentences({
			...shared,
			mode: mode as SentenceMode
		});
		const detail = page_.rows.find((row) => row.id === selection) ?? page_.rows[0] ?? null;

		return {
			query,
			tab,
			mode,
			page,
			result: { kind: 'sentence' as const, page: page_, detail, examples: {} },
			common: null,
			counts: null
		};
	}

	const page_ = await dictionaryService.searchTerms({ ...shared, mode: mode as TermMode });
	// Resolve the selection against the page, so the pane can never show an entry
	// that is not in the list the user is looking at.
	const detail = page_.rows.find((row) => row.id === selection) ?? page_.rows[0] ?? null;

	return {
		query,
		tab,
		mode,
		page,
		// Example sentences hang off the headword, so only the selected term is
		// looked up. The master list shows no examples, which keeps it cheap.
		result: {
			kind: 'term' as const,
			page: page_,
			detail,
			examples: detail ? await examplesFor(detail.headword) : {}
		},
		common: null,
		counts: null
	};
};
