/**
 * Human-readable labels for the coded values in the dictionary dump.
 *
 * JMdict marks up senses with terse codes (`n`, `vt`, `adj-na`, `comp`, `uk`).
 * The catalog stores those codes verbatim, so the UI is responsible for turning
 * them into something a learner can read. Unknown codes fall through unchanged,
 * which keeps newly added tags displayable instead of blank.
 */

/** Part-of-speech codes, grouped roughly by type. */
const PART_OF_SPEECH: Record<string, string> = {
	// Nouns and nominals
	n: 'sustantivo',
	pn: 'pronombre',
	num: 'numeral',
	ctr: 'contador',
	'n-pref': 'sustantivo (prefijo)',
	'n-suf': 'sustantivo (sufijo)',

	// Adjectives
	'adj-i': 'adjetivo い',
	'adj-na': 'adjetivo な',
	'adj-no': 'adjetivo の',
	'adj-t': 'adjetivo たる',
	'adj-f': 'adjetivo (prefijo)',
	'adj-pn': 'adjetivo pronominal',
	'adj-ix': 'adjetivo い (良い)',
	'adj-ku': 'adjetivo く',
	'adj-nari': 'adjetivo なり',

	// Verbs
	vi: 'verbo intransitivo',
	vt: 'verbo transitivo',
	v1: 'verbo ichidan',
	'v1-s': 'verbo ichidan (kureru)',
	vz: 'verbo ichidan (zuru)',
	vk: 'verbo くる',
	v4r: 'verbo yodan る',
	v2m_s: 'verbo nidan む',
	v5r: 'verbo godan る',
	'v5r-i': 'verbo godan る (irregular)',
	v5k: 'verbo godan く',
	'v5k-s': 'verbo godan く (iku)',
	v5g: 'verbo godan ぐ',
	v5s: 'verbo godan す',
	v5t: 'verbo godan つ',
	v5u: 'verbo godan う',
	'v5u-s': 'verbo godan う (especial)',
	v5m: 'verbo godan む',
	v5b: 'verbo godan ぶ',
	v5n: 'verbo godan ぬ',
	aux: 'auxiliar',
	'aux-v': 'verbo auxiliar',

	// Nouns that take する
	vs: 'verbo suru',
	'vs-i': 'verbo suru', // irregular
	'vs-s': 'verbo suru', // special
	'vs-c': 'verbo suru', // causative
	'vs-uns': 'verbo suru', // unsure usage

	// Invariables and particles
	adv: 'adverbio',
	'adv-to': 'adverbio と',
	conj: 'conjunción',
	prt: 'partícula',
	pref: 'prefijo',
	suf: 'sufijo',
	int: 'interjección',
	exp: 'expresión'
};

/** Subject-area codes used to tag technical vocabulary. */
const FIELDS: Record<string, string> = {
	comp: 'informática',
	med: 'medicina',
	food: 'gastronomía',
	buddh: 'budismo',
	shinto: 'sintoísmo',
	ling: 'lingüística',
	math: 'matemáticas',
	chem: 'química',
	phys: 'física',
	biol: 'biología',
	law: 'derecho',
	mil: 'militar',
	music: 'música',
	sports: 'deportes',
	geol: 'geología',
	astron: 'astronomía',
	econ: 'economía',
	baseb: 'béisbol',
	sumo: 'sumo',
	MA: 'artes marciales',
	anat: 'anatomía',
	archit: 'arquitectura',
	bot: 'botánica',
	zool: 'zoología',
	cloth: 'textil',
	engr: 'ingeniería'
};

/** Usage notes, mostly register and variant warnings. */
const MISC: Record<string, string> = {
	uk: 'normalmente en kana',
	abbr: 'abreviatura',
	arch: 'arcaico',
	obs: 'obsoleto',
	obsc: 'oscuro',
	dated: 'en desuso',
	rare: 'raro',
	col: 'coloquial',
	fam: 'familiar',
	sl: 'jerga',
	pol: 'formal',
	hon: 'honorífico',
	hum: 'humilde',
	derog: 'despectivo',
	vulg: 'vulgar',
	'm-sl': 'manga',
	net: 'internet',
	joc: 'en broma',
	id: 'expresión idiomática',
	proverb: 'refrán',
	poet: 'poético',
	yoji: 'yojijukugo',
	'on-mim': 'onomatopeya',
	ktb: 'kyōtsūgo',
	oK: 'escritura poco habitual',
	iK: 'escritura irregular',
	rK: 'escritura rara',
	ok: 'lectura poco habitual',
	io: 'lectura irregular',
	rk: 'lectura rara'
};

/** Kanji reading kinds, mapped to the language they come from. */
const READING_KINDS: Record<string, string> = {
	on: 'On’yomi',
	kun: 'Kun’yomi',
	pinyin: 'Pinyin',
	korean_r: 'Coreano (romanizado)',
	korean_h: 'Coreano (hangul)',
	vietnam: 'Vietnamita'
};

/** Dictionary codes mapped to their display names. */
const SOURCES: Record<string, string> = {
	jmdict: 'JMdict',
	jmnedict: 'JMnedict'
};

/** Looks a code up in a label map, falling back to the code itself. */
function label(map: Record<string, string>, code: string): string {
	return map[code] ?? code;
}

/** A readable name for a part-of-speech code, e.g. `vt` → “verbo transitivo”. */
export function posLabel(code: string): string {
	return label(PART_OF_SPEECH, code);
}

/** A readable name for a subject-area code, e.g. `comp` → “informática”. */
export function fieldLabel(code: string): string {
	return label(FIELDS, code);
}

/** A readable name for a usage note, e.g. `uk` → “normalmente en kana”. */
export function miscLabel(code: string): string {
	return label(MISC, code);
}

/** A readable name for a kanji reading kind, e.g. `on` → “On’yomi”. */
export function readingKindLabel(code: string): string {
	return label(READING_KINDS, code);
}

/** A readable name for a dictionary code, e.g. `jmdict` → “JMdict”. */
export function sourceLabel(code: string): string {
	return label(SOURCES, code);
}
