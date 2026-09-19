export type KanaScript = 'hiragana' | 'katakana';

/** Groups of kana, used to build the table sections and the lessons. */
export type KanaCategory = 'basic' | 'dakuon' | 'handakuon' | 'yoon' | 'extension';

export type Kana = {
	id: string;
	hiragana: string;
	katakana: string;
	romaji: string;
	category: KanaCategory;
	/** Column in the gojūon table (0 = a, 1 = i, 2 = u, 3 = e, 4 = o). */
	column: number;
	/** Scripts this kana belongs to. Katakana-only kana have no hiragana. */
	scripts: KanaScript[];
};

/** Metadata for each silabary, used to build tabs and labels. */
export const KANA_SCRIPTS: { id: KanaScript; label: string }[] = [
	{ id: 'hiragana', label: 'Hiragana' },
	{ id: 'katakana', label: 'Katakana' }
];

export const KANA_SCRIPT_IDS: KanaScript[] = KANA_SCRIPTS.map((entry) => entry.id);

export function isKanaScript(value: unknown): value is KanaScript {
	return value === 'hiragana' || value === 'katakana';
}

export type KanaRow = {
	id: string;
	label: string;
	category: KanaCategory;
	/** Scripts the whole row belongs to. */
	scripts: KanaScript[];
	/**
	 * When `false` the table lays the kana out in a simple flow instead of
	 * aligning them to their vowel column (used by the katakana extras, whose
	 * sounds do not fill the gojūon grid).
	 */
	columnAligned: boolean;
	kana: Kana[];
};

/** Ordered sections of the kana table, with a short description for each. */
export const KANA_CATEGORIES: { id: KanaCategory; label: string; description: string }[] = [
	{ id: 'basic', label: 'Básicos', description: 'El gojūon: los 46 kana base.' },
	{ id: 'dakuon', label: 'Dakuon', description: 'Sonidos sonoros: が, ざ, だ, ば, ヴ.' },
	{ id: 'handakuon', label: 'Handakuon', description: 'Sonido semi-sonoro: ぱ.' },
	{ id: 'yoon', label: 'Yōon', description: 'Contracciones con や, ゆ, よ pequeñas.' },
	{
		id: 'extension',
		label: 'Extras de katakana',
		description: 'Sonidos para palabras extranjeras.'
	}
];

export type VocabularyWord = {
	id: string;
	hiragana: string;
	romaji: string;
	meaning: string;
};

/** Vowel columns of the gojūon table. */
const COLUMN = { a: 0, i: 1, u: 2, e: 3, o: 4 } as const;

type KanaEntry = {
	/** Hiragana glyph, empty for katakana-only kana. */
	hiragana: string;
	/** Katakana glyph, empty for hiragana-only kana. */
	katakana: string;
	romaji: string;
	column: number;
	/** Overrides the stable id when the romaji collides with another kana. */
	id?: string;
};

type RowDefinition = {
	id: string;
	label: string;
	category: KanaCategory;
	entries: KanaEntry[];
	/** Defaults to both scripts. */
	scripts?: KanaScript[];
	/** Defaults to `true`. */
	columnAligned?: boolean;
};

const BOTH: KanaScript[] = ['hiragana', 'katakana'];
const KATAKANA_ONLY: KanaScript[] = ['katakana'];

/** Terse entry builder: `e('あ', 'ア', 'a', 'a')`. */
function e(
	hiragana: string,
	katakana: string,
	romaji: string,
	column: keyof typeof COLUMN,
	id?: string
): KanaEntry {
	return { hiragana, katakana, romaji, column: COLUMN[column], id };
}

const ROW_DEFINITIONS: RowDefinition[] = [
	// ─ Básicos ────────────────────────────────────────────────────────────
	{
		id: 'vowels',
		label: 'Vocales',
		category: 'basic',
		entries: [
			e('あ', 'ア', 'a', 'a'),
			e('い', 'イ', 'i', 'i'),
			e('う', 'ウ', 'u', 'u'),
			e('え', 'エ', 'e', 'e'),
			e('お', 'オ', 'o', 'o')
		]
	},
	{
		id: 'k',
		label: 'K',
		category: 'basic',
		entries: [
			e('か', 'カ', 'ka', 'a'),
			e('き', 'キ', 'ki', 'i'),
			e('く', 'ク', 'ku', 'u'),
			e('け', 'ケ', 'ke', 'e'),
			e('こ', 'コ', 'ko', 'o')
		]
	},
	{
		id: 's',
		label: 'S',
		category: 'basic',
		entries: [
			e('さ', 'サ', 'sa', 'a'),
			e('し', 'シ', 'shi', 'i'),
			e('す', 'ス', 'su', 'u'),
			e('せ', 'セ', 'se', 'e'),
			e('そ', 'ソ', 'so', 'o')
		]
	},
	{
		id: 't',
		label: 'T',
		category: 'basic',
		entries: [
			e('た', 'タ', 'ta', 'a'),
			e('ち', 'チ', 'chi', 'i'),
			e('つ', 'ツ', 'tsu', 'u'),
			e('て', 'テ', 'te', 'e'),
			e('と', 'ト', 'to', 'o')
		]
	},
	{
		id: 'n',
		label: 'N',
		category: 'basic',
		entries: [
			e('な', 'ナ', 'na', 'a'),
			e('に', 'ニ', 'ni', 'i'),
			e('ぬ', 'ヌ', 'nu', 'u'),
			e('ね', 'ネ', 'ne', 'e'),
			e('の', 'ノ', 'no', 'o')
		]
	},
	{
		id: 'h',
		label: 'H',
		category: 'basic',
		entries: [
			e('は', 'ハ', 'ha', 'a'),
			e('ひ', 'ヒ', 'hi', 'i'),
			e('ふ', 'フ', 'fu', 'u'),
			e('へ', 'ヘ', 'he', 'e'),
			e('ほ', 'ホ', 'ho', 'o')
		]
	},
	{
		id: 'm',
		label: 'M',
		category: 'basic',
		entries: [
			e('ま', 'マ', 'ma', 'a'),
			e('み', 'ミ', 'mi', 'i'),
			e('む', 'ム', 'mu', 'u'),
			e('め', 'メ', 'me', 'e'),
			e('も', 'モ', 'mo', 'o')
		]
	},
	{
		id: 'y',
		label: 'Y',
		category: 'basic',
		entries: [e('や', 'ヤ', 'ya', 'a'), e('ゆ', 'ユ', 'yu', 'u'), e('よ', 'ヨ', 'yo', 'o')]
	},
	{
		id: 'r',
		label: 'R',
		category: 'basic',
		entries: [
			e('ら', 'ラ', 'ra', 'a'),
			e('り', 'リ', 'ri', 'i'),
			e('る', 'ル', 'ru', 'u'),
			e('れ', 'レ', 're', 'e'),
			e('ろ', 'ロ', 'ro', 'o')
		]
	},
	{
		id: 'w',
		label: 'W',
		category: 'basic',
		entries: [e('わ', 'ワ', 'wa', 'a'), e('を', 'ヲ', 'wo', 'o')]
	},
	{
		id: 'final-n',
		label: 'N final',
		category: 'basic',
		entries: [e('ん', 'ン', 'n', 'a')]
	},

	// ── Dakuon ─────────────────────────────────────────────────────────────
	{
		id: 'g',
		label: 'G',
		category: 'dakuon',
		entries: [
			e('が', 'ガ', 'ga', 'a'),
			e('ぎ', 'ギ', 'gi', 'i'),
			e('ぐ', 'グ', 'gu', 'u'),
			e('げ', 'ゲ', 'ge', 'e'),
			e('ご', 'ゴ', 'go', 'o')
		]
	},
	{
		id: 'z',
		label: 'Z',
		category: 'dakuon',
		entries: [
			e('ざ', 'ザ', 'za', 'a'),
			e('じ', 'ジ', 'ji', 'i'),
			e('ず', 'ズ', 'zu', 'u'),
			e('ぜ', 'ゼ', 'ze', 'e'),
			e('ぞ', 'ゾ', 'zo', 'o')
		]
	},
	{
		id: 'd',
		label: 'D',
		category: 'dakuon',
		entries: [
			e('だ', 'ダ', 'da', 'a'),
			e('ぢ', 'ヂ', 'di', 'i'),
			e('づ', 'ヅ', 'du', 'u'),
			e('で', 'デ', 'de', 'e'),
			e('ど', 'ド', 'do', 'o')
		]
	},
	{
		id: 'b',
		label: 'B',
		category: 'dakuon',
		entries: [
			e('ば', 'バ', 'ba', 'a'),
			e('び', 'ビ', 'bi', 'i'),
			e('ぶ', 'ブ', 'bu', 'u'),
			e('べ', 'ベ', 'be', 'e'),
			e('ぼ', 'ボ', 'bo', 'o')
		]
	},
	{
		id: 'v',
		label: 'V',
		category: 'dakuon',
		scripts: KATAKANA_ONLY,
		entries: [e('', 'ヴ', 'vu', 'u')]
	},

	// ── Handakuon ──────────────────────────────────────────────────────────
	{
		id: 'p',
		label: 'P',
		category: 'handakuon',
		entries: [
			e('ぱ', 'パ', 'pa', 'a'),
			e('ぴ', 'ピ', 'pi', 'i'),
			e('ぷ', 'プ', 'pu', 'u'),
			e('ぺ', 'ペ', 'pe', 'e'),
			e('ぽ', 'ポ', 'po', 'o')
		]
	},

	// ── Yōon (consonante + や·ゆ·よ pequeña) ───────────────────────────────
	{
		id: 'kya',
		label: 'Kya',
		category: 'yoon',
		entries: [
			e('きゃ', 'キャ', 'kya', 'a'),
			e('きゅ', 'キュ', 'kyu', 'u'),
			e('きょ', 'キョ', 'kyo', 'o')
		]
	},
	{
		id: 'gya',
		label: 'Gya',
		category: 'yoon',
		entries: [
			e('ぎゃ', 'ギャ', 'gya', 'a'),
			e('ぎゅ', 'ギュ', 'gyu', 'u'),
			e('ぎょ', 'ギョ', 'gyo', 'o')
		]
	},
	{
		id: 'sha',
		label: 'Sha',
		category: 'yoon',
		entries: [
			e('しゃ', 'シャ', 'sha', 'a'),
			e('しゅ', 'シュ', 'shu', 'u'),
			e('しょ', 'ショ', 'sho', 'o')
		]
	},
	{
		id: 'ja',
		label: 'Ja',
		category: 'yoon',
		entries: [
			e('じゃ', 'ジャ', 'ja', 'a'),
			e('じゅ', 'ジュ', 'ju', 'u'),
			e('じょ', 'ジョ', 'jo', 'o')
		]
	},
	{
		id: 'cha',
		label: 'Cha',
		category: 'yoon',
		entries: [
			e('ちゃ', 'チャ', 'cha', 'a'),
			e('ちゅ', 'チュ', 'chu', 'u'),
			e('ちょ', 'チョ', 'cho', 'o')
		]
	},
	{
		id: 'nya',
		label: 'Nya',
		category: 'yoon',
		entries: [
			e('にゃ', 'ニャ', 'nya', 'a'),
			e('にゅ', 'ニュ', 'nyu', 'u'),
			e('にょ', 'ニョ', 'nyo', 'o')
		]
	},
	{
		id: 'hya',
		label: 'Hya',
		category: 'yoon',
		entries: [
			e('ひゃ', 'ヒャ', 'hya', 'a'),
			e('ひゅ', 'ヒュ', 'hyu', 'u'),
			e('ひょ', 'ヒョ', 'hyo', 'o')
		]
	},
	{
		id: 'bya',
		label: 'Bya',
		category: 'yoon',
		entries: [
			e('びゃ', 'ビャ', 'bya', 'a'),
			e('びゅ', 'ビュ', 'byu', 'u'),
			e('びょ', 'ビョ', 'byo', 'o')
		]
	},
	{
		id: 'pya',
		label: 'Pya',
		category: 'yoon',
		entries: [
			e('ぴゃ', 'ピャ', 'pya', 'a'),
			e('ぴゅ', 'ピュ', 'pyu', 'u'),
			e('ぴょ', 'ピョ', 'pyo', 'o')
		]
	},
	{
		id: 'mya',
		label: 'Mya',
		category: 'yoon',
		entries: [
			e('みゃ', 'ミャ', 'mya', 'a'),
			e('みゅ', 'ミュ', 'myu', 'u'),
			e('みょ', 'ミョ', 'myo', 'o')
		]
	},
	{
		id: 'rya',
		label: 'Rya',
		category: 'yoon',
		entries: [
			e('りゃ', 'リャ', 'rya', 'a'),
			e('りゅ', 'リュ', 'ryu', 'u'),
			e('りょ', 'リョ', 'ryo', 'o')
		]
	},

	// ── Extras de katakana ─────────────────────────────────────────────────
	{
		id: 'ext-f',
		label: 'F',
		category: 'extension',
		scripts: KATAKANA_ONLY,
		columnAligned: false,
		entries: [
			e('', 'ファ', 'fa', 'a'),
			e('', 'フィ', 'fi', 'i'),
			e('', 'フェ', 'fe', 'e'),
			e('', 'フォ', 'fo', 'o')
		]
	},
	{
		id: 'ext-v',
		label: 'V',
		category: 'extension',
		scripts: KATAKANA_ONLY,
		columnAligned: false,
		entries: [
			e('', 'ヴァ', 'va', 'a'),
			e('', 'ヴィ', 'vi', 'i'),
			e('', 'ヴェ', 've', 'e'),
			e('', 'ヴォ', 'vo', 'o')
		]
	},
	{
		id: 'ext-w',
		label: 'W',
		category: 'extension',
		scripts: KATAKANA_ONLY,
		columnAligned: false,
		entries: [
			e('', 'ウィ', 'wi', 'i'),
			e('', 'ウェ', 'we', 'e'),
			e('', 'ウォ', 'wo', 'o', 'wo-ext')
		]
	},
	{
		id: 'ext-td',
		label: 'T · D',
		category: 'extension',
		scripts: KATAKANA_ONLY,
		columnAligned: false,
		entries: [
			e('', 'ティ', 'ti', 'i'),
			e('', 'ディ', 'di', 'i', 'di-ext'),
			e('', 'トゥ', 'tu', 'u'),
			e('', 'ドゥ', 'du', 'u', 'du-ext')
		]
	},
	{
		id: 'ext-sjc',
		label: 'Sh · J · Ch',
		category: 'extension',
		scripts: KATAKANA_ONLY,
		columnAligned: false,
		entries: [e('', 'シェ', 'she', 'e'), e('', 'ジェ', 'je', 'e'), e('', 'チェ', 'che', 'e')]
	},
	{
		id: 'ext-ts',
		label: 'Ts',
		category: 'extension',
		scripts: KATAKANA_ONLY,
		columnAligned: false,
		entries: [
			e('', 'ツァ', 'tsa', 'a'),
			e('', 'ツィ', 'tsi', 'i'),
			e('', 'ツェ', 'tse', 'e'),
			e('', 'ツォ', 'tso', 'o')
		]
	}
];

export const KANA_ROWS: KanaRow[] = ROW_DEFINITIONS.map((definition) => {
	const scripts = definition.scripts ?? BOTH;
	return {
		id: definition.id,
		label: definition.label,
		category: definition.category,
		scripts,
		columnAligned: definition.columnAligned ?? true,
		kana: definition.entries.map((item) => ({
			id: item.id ?? item.romaji,
			hiragana: scripts.includes('hiragana') ? item.hiragana : '',
			katakana: scripts.includes('katakana') ? item.katakana : '',
			romaji: item.romaji,
			category: definition.category,
			column: item.column,
			scripts
		}))
	};
});

/** Every kana of every script and category, in table order. */
export const ALL_KANA: Kana[] = KANA_ROWS.flatMap((row) => row.kana);

/** Only the gojūon kana, used where the extras should not appear. */
export const BASIC_KANA: Kana[] = KANA_ROWS.filter((row) => row.category === 'basic').flatMap(
	(row) => row.kana
);

/** Rows that belong to a script, in table order. */
export function kanaRowsForScript(script: KanaScript): KanaRow[] {
	return KANA_ROWS.filter((row) => row.scripts.includes(script));
}

/** Rows of one script within a category, e.g. the yōon of hiragana. */
export function kanaRowsByCategory(script: KanaScript, category: KanaCategory): KanaRow[] {
	return kanaRowsForScript(script).filter((row) => row.category === category);
}

/** Every kana of a script, in table order. */
export function allKanaForScript(script: KanaScript): Kana[] {
	return ALL_KANA.filter((kana) => kana.scripts.includes(script));
}

/** Look up a kana by its stable id. */
export function kanaById(id: string): Kana | undefined {
	return ALL_KANA.find((kana) => kana.id === id);
}

/**
 * One representative per distinct kana id, in table order. Kana shared by both
 * scripts appear once, so this is the canonical count of "kana to learn".
 */
export function uniqueKana(): Kana[] {
	const seen = new Set<string>();
	return ALL_KANA.filter((kana) => {
		if (seen.has(kana.id)) return false;
		seen.add(kana.id);
		return true;
	});
}

/** Human-readable label for a script. */
export function scriptLabel(script: KanaScript): string {
	return KANA_SCRIPTS.find((entry) => entry.id === script)?.label ?? script;
}

export const VOCABULARY: VocabularyWord[] = [
	{ id: 'cat', hiragana: 'ねこ', romaji: 'neko', meaning: 'gato' },
	{ id: 'dog', hiragana: 'いぬ', romaji: 'inu', meaning: 'perro' },
	{ id: 'sushi', hiragana: 'すし', romaji: 'sushi', meaning: 'sushi' },
	{ id: 'water', hiragana: 'みず', romaji: 'mizu', meaning: 'agua' },
	{ id: 'mountain', hiragana: 'やま', romaji: 'yama', meaning: 'montaña' },
	{ id: 'sky', hiragana: 'そら', romaji: 'sora', meaning: 'cielo' },
	{ id: 'flower', hiragana: 'はな', romaji: 'hana', meaning: 'flor' },
	{ id: 'car', hiragana: 'くるま', romaji: 'kuruma', meaning: 'coche' }
];

export function kanaCharacter(kana: Kana, script: KanaScript): string {
	return kana[script];
}

export function wordForScript(word: VocabularyWord, script: KanaScript): string {
	if (script === 'hiragana') return word.hiragana;
	return Array.from(word.hiragana, (character) => {
		const codePoint = character.codePointAt(0)!;
		return codePoint >= 0x3041 && codePoint <= 0x3096
			? String.fromCodePoint(codePoint + 0x60)
			: character;
	}).join('');
}

/** Distinct kana ids a vocabulary word is built from. */
export function wordKanaIds(word: VocabularyWord): string[] {
	const ids = new Set<string>();
	for (const character of word.hiragana) {
		const match = ALL_KANA.find((kana) => kana.hiragana === character);
		if (match) ids.add(match.id);
	}
	return [...ids];
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
	const result = [...items];
	for (let index = result.length - 1; index > 0; index -= 1) {
		const otherIndex = Math.floor(random() * (index + 1));
		[result[index], result[otherIndex]] = [result[otherIndex], result[index]];
	}
	return result;
}

export function pickNext<T>(
	items: readonly T[],
	previous: T | undefined,
	getId: (item: T) => string,
	random: () => number = Math.random
): T {
	if (items.length === 0) throw new Error('No hay elementos disponibles.');
	const alternatives = previous
		? items.filter((item) => getId(item) !== getId(previous))
		: [...items];
	const pool = alternatives.length > 0 ? alternatives : items;
	return pool[Math.floor(random() * pool.length)];
}

export function uniqueOptions<T>(
	target: T,
	pool: readonly T[],
	getLabel: (item: T) => string,
	count = 4,
	random: () => number = Math.random
): T[] {
	const targetLabel = getLabel(target);
	const seen = new Set([targetLabel]);
	const distractors = shuffle(pool, random).filter((item) => {
		const label = getLabel(item);
		if (seen.has(label)) return false;
		seen.add(label);
		return true;
	});
	return shuffle([target, ...distractors.slice(0, count - 1)], random);
}
