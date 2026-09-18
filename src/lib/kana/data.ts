export type KanaScript = 'hiragana' | 'katakana';

export type Kana = {
	id: string;
	hiragana: string;
	katakana: string;
	romaji: string;
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
	kana: Kana[];
};

export type VocabularyWord = {
	id: string;
	hiragana: string;
	romaji: string;
	meaning: string;
};

const ROW_DEFINITIONS = [
	['vowels', 'Vocales', 'あ:ア:a,い:イ:i,う:ウ:u,え:エ:e,お:オ:o'],
	['k', 'K', 'か:カ:ka,き:キ:ki,く:ク:ku,け:ケ:ke,こ:コ:ko'],
	['s', 'S', 'さ:サ:sa,し:シ:shi,す:ス:su,せ:セ:se,そ:ソ:so'],
	['t', 'T', 'た:タ:ta,ち:チ:chi,つ:ツ:tsu,て:テ:te,と:ト:to'],
	['n', 'N', 'な:ナ:na,に:ニ:ni,ぬ:ヌ:nu,ね:ネ:ne,の:ノ:no'],
	['h', 'H', 'は:ハ:ha,ひ:ヒ:hi,ふ:フ:fu,へ:ヘ:he,ほ:ホ:ho'],
	['m', 'M', 'ま:マ:ma,み:ミ:mi,む:ム:mu,め:メ:me,も:モ:mo'],
	['y', 'Y', 'や:ヤ:ya,ゆ:ユ:yu,よ:ヨ:yo'],
	['r', 'R', 'ら:ラ:ra,り:リ:ri,る:ル:ru,れ:レ:re,ろ:ロ:ro'],
	['w', 'W', 'わ:ワ:wa,を:ヲ:wo'],
	['final-n', 'N final', 'ん:ン:n']
] as const;

export const KANA_ROWS: KanaRow[] = ROW_DEFINITIONS.map(([id, label, entries]) => ({
	id,
	label,
	kana: entries.split(',').map((entry) => {
		const [hiragana, katakana, romaji] = entry.split(':');
		return { id: romaji, hiragana, katakana, romaji };
	})
}));

export const BASIC_KANA: Kana[] = KANA_ROWS.flatMap((row) => row.kana);

/** Every kana of a script, in table order. */
export function allKanaForScript(_script: KanaScript): Kana[] {
	return BASIC_KANA;
}

/** Look up a kana by its stable id (`romaji`). */
export function kanaById(id: string): Kana | undefined {
	return BASIC_KANA.find((kana) => kana.id === id);
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
