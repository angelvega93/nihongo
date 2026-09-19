import type { LessonContentBlock } from '$lib/types/course';
import {
	KANA_ROWS,
	KANA_SCRIPT_IDS,
	allKanaForScript,
	kanaById,
	kanaCharacter,
	kanaRowsByCategory,
	scriptLabel,
	uniqueOptions,
	type Kana,
	type KanaRow,
	type KanaScript
} from './data.js';

/** Kind of question asked inside a lesson quiz. */
export type KanaQuizKind = 'kana-to-romaji' | 'romaji-to-kana';

/** A single answer choice. `id` is local to its question. */
export type KanaQuizOption = {
	id: number;
	label: string;
};

/** A client-graded multiple-choice question about a known kana. */
export type KanaQuizQuestion = {
	id: number;
	kind: KanaQuizKind;
	/** Romaji id of the kana the question is about. */
	kanaId: string;
	prompt: string;
	/** Large glyph shown as the stem: the kana, or the romaji depending on kind. */
	display: string;
	options: KanaQuizOption[];
	correctOptionId: number;
};

/** One step of a lesson. */
export type KanaLessonStep =
	| { id: string; kind: 'info'; blocks: LessonContentBlock[] }
	| { id: string; kind: 'teach'; script: KanaScript; kanaId: string }
	| { id: string; kind: 'draw'; script: KanaScript; kanaId: string }
	| { id: string; kind: 'quiz'; script: KanaScript; question: KanaQuizQuestion };

export type KanaLessonStepKind = KanaLessonStep['kind'];

/** A self-contained lesson: the intro, or a group of gojūon rows of a script. */
export type KanaLesson = {
	/** Stable, URL-friendly id, e.g. `hiragana-k`. */
	id: string;
	/** `null` for the intro lesson. */
	script: KanaScript | null;
	/** Ids of the rows taught by the lesson, in order. Empty for the intro. */
	rowIds: string[];
	title: string;
	description: string;
	steps: KanaLessonStep[];
};

/** Every kana of a script, in learning order (table order). */
function scriptKana(script: KanaScript): Kana[] {
	return allKanaForScript(script);
}

/**
 * Rows that do not get their own lesson but join the previous one. ん is a
 * single kana, so it is taught together with わ and を.
 */
const MERGED_ROW_IDS = new Set(['final-n']);

/** Readable label for lesson groups whose row labels would read awkwardly. */
const GROUP_LABELS: Record<string, string> = {
	'w+final-n': 'W · N'
};

/** A lesson group: one or more consecutive gojūon rows. */
type LessonGroup = {
	id: string;
	label: string;
	rowIds: string[];
	rows: KanaRow[];
};

/** Split the gojūon table into lesson groups, merging single-kana rows. */
function buildLessonGroups(): LessonGroup[] {
	const groups: LessonGroup[] = [];

	// Only the base gojūon gets its own row-by-row lessons; the dakuon, yōon
	// and katakana extras are handled by their own curated lessons below.
	for (const row of KANA_ROWS.filter((entry) => entry.category === 'basic')) {
		if (MERGED_ROW_IDS.has(row.id) && groups.length > 0) {
			const previous = groups.at(-1)!;
			previous.rowIds.push(row.id);
			previous.rows.push(row);
			previous.label = GROUP_LABELS[previous.rowIds.join('+')] ?? previous.label;
			continue;
		}

		groups.push({
			id: row.id,
			label: GROUP_LABELS[row.id] ?? row.label,
			rowIds: [row.id],
			rows: [row]
		});
	}

	return groups;
}

const LESSON_GROUPS: LessonGroup[] = buildLessonGroups();

/** Deterministic FNV-1a hash so the catalog is identical on server and client. */
function hashSeed(text: string): number {
	let hash = 2166136261;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/** Mulberry32 PRNG. Keeps generated quizzes stable across renders. */
function seededRandom(seed: string): () => number {
	let state = hashSeed(seed) || 1;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let value = Math.imul(state ^ (state >>> 15), 1 | state);
		value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
	return items[Math.floor(random() * items.length)];
}

/** Build one multiple-choice question about `focus`, using `known` as the pool. */
function createQuestion(
	id: number,
	kind: KanaQuizKind,
	focus: Kana,
	known: Kana[],
	script: KanaScript,
	random: () => number
): KanaQuizQuestion {
	const pool = known.some((item) => item.id === focus.id) ? known : [...known, focus];
	const isKanaToRomaji = kind === 'kana-to-romaji';
	const label = (item: Kana) => (isKanaToRomaji ? item.romaji : kanaCharacter(item, script));
	const distinct = new Set(pool.map(label)).size;
	const optionCount = Math.min(4, Math.max(2, distinct));
	const selected = uniqueOptions(focus, pool, label, optionCount, random);
	const options = selected.map((item, index) => ({ id: index + 1, label: label(item) }));
	const correctOptionId = selected.findIndex((item) => item.id === focus.id) + 1;

	return {
		id,
		kind,
		kanaId: focus.id,
		prompt: isKanaToRomaji ? '¿Cómo se lee este kana?' : '¿Cuál de estos es el kana?',
		display: isKanaToRomaji ? kanaCharacter(focus, script) : focus.romaji,
		options,
		correctOptionId
	};
}

/**
 * Questions for one quiz step: always the current kana, plus a random one from
 * the already learned set so the review is cumulative.
 */
function buildQuizQuestions(
	script: KanaScript,
	focus: Kana,
	known: Kana[],
	startId: number,
	random: () => number
): KanaQuizQuestion[] {
	const questions: KanaQuizQuestion[] = [
		createQuestion(startId, 'kana-to-romaji', focus, known, script, random)
	];

	const others = known.filter((item) => item.id !== focus.id);
	const secondTarget = others.length > 0 ? pickRandom(others, random) : focus;
	questions.push(
		createQuestion(startId + 1, 'romaji-to-kana', secondTarget, known, script, random)
	);

	if (known.length >= 3 && others.length > 1) {
		const thirdTarget = pickRandom(others, random);
		questions.push(
			createQuestion(startId + 2, 'kana-to-romaji', thirdTarget, known, script, random)
		);
	}

	return questions;
}

const INTRO_BLOCKS: LessonContentBlock[] = [
	{ type: 'heading', text: 'Dos silabarios' },
	{
		type: 'paragraph',
		text: 'El japonés se escribe con dos silabarios: hiragana y katakana. Cada símbolo representa una sílaba completa (por ejemplo, か es "ka"), no una letra suelta.'
	},
	{
		type: 'paragraph',
		text: 'El hiragana tiene trazos redondeados y se usa para las palabras japonesas y las terminaciones gramaticales. El katakana tiene trazos rectos y se usa para palabras extranjeras, nombres y onomatopeyas.'
	},
	{ type: 'heading', text: 'El mismo sonido, dos formas' },
	{
		type: 'example',
		japanese: 'あ · ア',
		meaning: 'Los dos se leen "a": el primero es hiragana y el segundo katakana.'
	},
	{
		type: 'paragraph',
		text: 'Ambos silabarios cubren exactamente los mismos sonidos, así que aprender uno hace mucho más fácil el otro. Empezaremos por el hiragana, fila a fila.'
	},
	{ type: 'heading', text: 'Cómo funcionan estas lecciones' },
	{
		type: 'paragraph',
		text: 'En cada fila verás primero el orden de los trazos de un kana. Después lo dibujarás tú en el lienzo. A partir del segundo carácter aparecerán pequeñas pruebas para fijar lo aprendido.'
	},
	{
		type: 'note',
		text: 'Dibujar no es un examen: aunque el trazo no sea perfecto, podrás continuar. Lo importante es practicar el movimiento.'
	}
];

/** A single info step. */
function infoStep(id: string, blocks: LessonContentBlock[]): KanaLessonStep {
	return { id, kind: 'info', blocks };
}

/** Build a curated lesson: one info step followed by one quiz step per item. */
function buildCuratedLesson(options: {
	id: string;
	script: KanaScript;
	title: string;
	description: string;
	rowIds?: string[];
	info: LessonContentBlock[];
	quizzes: { kind: KanaQuizKind; focusId: string }[];
}): KanaLesson {
	const rows = (options.rowIds ?? []).flatMap(
		(rowId) => KANA_ROWS.find((row) => row.id === rowId)?.kana ?? []
	);
	const known = rows.length > 0 ? rows : scriptKana(options.script);
	const random = seededRandom(`${options.id}-quiz`);
	const steps: KanaLessonStep[] = [infoStep(`${options.id}-info`, options.info)];

	options.quizzes.forEach((quiz, index) => {
		const focus = kanaById(quiz.focusId);
		if (!focus) return;
		const pool = known.some((item) => item.id === focus.id) ? known : [...known, focus];
		steps.push({
			id: `${options.id}-quiz-${index + 1}`,
			kind: 'quiz',
			script: options.script,
			question: createQuestion(index + 1, quiz.kind, focus, pool, options.script, random)
		});
	});

	return {
		id: options.id,
		script: options.script,
		rowIds: options.rowIds ?? [],
		title: options.title,
		description: options.description,
		steps
	};
}

/** Explanation of dakuon and handakuon; katakana also covers ヴ. */
function dakuonBlocks(script: KanaScript): LessonContentBlock[] {
	const blocks: LessonContentBlock[] = [
		{ type: 'heading', text: 'Sonidos sonoros: ゛' },
		{
			type: 'paragraph',
			text: 'Los dakuon añaden dos pequeños trazos (゛, el dakuten) a un kana. El sonido se vuelve sonoro siguiendo una regla fija: K → G, S → Z, T → D, H → B.'
		},
		{ type: 'example', japanese: 'か → が', meaning: '"ka" se convierte en "ga".' },
		{ type: 'example', japanese: 'は → ば', meaning: '"ha" se convierte en "ba".' },
		{ type: 'heading', text: 'Sonido semi-sonoro: ゜' },
		{
			type: 'paragraph',
			text: 'Los handakuon llevan un pequeño círculo (゜, el maru) y solo afectan a la fila H: は → ぱ.'
		},
		{
			type: 'note',
			text: 'Son sonidos nuevos, pero se escriben sobre kana que ya conoces: solo cambia el signo que llevan encima.'
		}
	];

	if (script === 'katakana') {
		blocks.push(
			{ type: 'heading', text: 'El caso de ヴ' },
			{
				type: 'paragraph',
				text: 'La ウ con dakuten se escribe ヴ y se lee "vu". Sirve para palabras extranjeras como ヴァイオリン (violín).'
			},
			{ type: 'example', japanese: 'ウ → ヴ', meaning: '"u" se convierte en "vu".' }
		);
	}

	return blocks;
}

/** Explanation of yōon (contracted sounds). */
const YOON_BLOCKS: LessonContentBlock[] = [
	{ type: 'heading', text: 'Sonidos contraídos' },
	{
		type: 'paragraph',
		text: 'Los yōon combinan un kana de la fila I (き, し, ち, に, ひ, み, り…) con una versión pequeña de や, ゆ o よ. Los dos caracteres se leen como una sola sílaba.'
	},
	{ type: 'example', japanese: 'き + ゃ → きゃ', meaning: '"ki" + "ya" se lee "kya", no "ki-ya".' },
	{ type: 'example', japanese: 'し + ゅ → しゅ', meaning: '"shi" + "yu" se lee "shu".' },
	{ type: 'example', japanese: 'ち + ょ → ちょ', meaning: '"chi" + "yo" se lee "cho".' },
	{
		type: 'note',
		text: 'La clave es el tamaño: ゃ, ゅ y ょ pequeñas se pegan al kana anterior; las grandes (や, ゆ, よ) forman dos sílabas separadas.'
	}
];

/** Explanation of long vowels and the small っ (sokuon). */
function longSoundsBlocks(script: KanaScript): LessonContentBlock[] {
	if (script === 'katakana') {
		return [
			{ type: 'heading', text: 'Vocales largas con ー' },
			{
				type: 'paragraph',
				text: 'En katakana, una vocal larga se marca con una raya horizontal llamada bō (ー). La vocal anterior simplemente se alarga.'
			},
			{
				type: 'example',
				japanese: 'コーヒー',
				meaning: 'kōhī: "café". El ー alarga la コ y la ヒ.'
			},
			{ type: 'heading', text: 'Consonante doble ッ' },
			{
				type: 'paragraph',
				text: 'Una ッ pequeña (sokuon) no se pronuncia sola: duplica la consonante siguiente y añade una breve pausa.'
			},
			{ type: 'example', japanese: 'ベッド', meaning: 'beddo: "cama". La ッ duplica la D.' },
			{ type: 'note', text: 'La ッ pequeña nunca aparece al inicio de una palabra.' }
		];
	}

	return [
		{ type: 'heading', text: 'Vocales largas' },
		{
			type: 'paragraph',
			text: 'En hiragana, una vocal larga se escribe repitiendo la vocal: おばあさん, おにいさん, くうき. Al hablar, el sonido dura el doble.'
		},
		{ type: 'example', japanese: 'おばあさん', meaning: 'obāsan: "abuela". La あ alarga la ば.' },
		{ type: 'example', japanese: 'くうき', meaning: 'kūki: "aire". La う alarga la く.' },
		{
			type: 'note',
			text: 'A veces una え larga se escribe えい (せんせい) y una お larga se escribe おう (がっこう), aunque se pronuncian "ee" y "oo".'
		},
		{ type: 'heading', text: 'Consonante doble っ' },
		{
			type: 'paragraph',
			text: 'Una っ pequeña (sokuon) no se pronuncia sola: duplica la consonante siguiente y añade una breve pausa.'
		},
		{ type: 'example', japanese: 'がっこう', meaning: 'gakkō: "escuela". La っ duplica la K.' },
		{ type: 'example', japanese: 'きって', meaning: 'kitte: "sello". La っ duplica la T.' },
		{ type: 'note', text: 'La っ pequeña nunca aparece al inicio de una palabra.' }
	];
}

/** Explanation of the katakana combinations for foreign words. */
const KATAKANA_EXTRAS_BLOCKS: LessonContentBlock[] = [
	{ type: 'heading', text: 'Sonidos para palabras extranjeras' },
	{
		type: 'paragraph',
		text: 'El katakana crea combinaciones para reproducir sonidos que no existen en japonés. Muchas usan una vocal pequeña (ァ, ィ, ゥ, ェ, ォ).'
	},
	{
		type: 'example',
		japanese: 'ファ フィ フェ フォ',
		meaning: 'fa, fi, fe, fo: la フ + vocal pequeña.'
	},
	{ type: 'example', japanese: 'ウィ ウェ ウォ', meaning: 'wi, we, wo: la ウ + vocal pequeña.' },
	{ type: 'example', japanese: 'ティ ディ', meaning: 'ti, di: la テ/デ + ィ.' },
	{ type: 'example', japanese: 'シェ ジェ チェ', meaning: 'she, je, che.' },
	{ type: 'example', japanese: 'ツァ ツィ ツェ ツォ', meaning: 'tsa, tsi, tse, tso.' },
	{
		type: 'note',
		text: 'Aparecen sobre todo en préstamos: パーティー (fiesta), チェック (chequeo), ウィスキー (whisky).'
	}
];

/** Curated lessons for a script, in study order. */
function curatedLessons(script: KanaScript): KanaLesson[] {
	const label = scriptLabel(script);
	const lessons: KanaLesson[] = [
		buildCuratedLesson({
			id: `${script}-dakuon`,
			script,
			title: `${label}: dakuon y handakuon`,
			description: 'が, ざ, だ, ば, … los sonidos sonoros y semi-sonoros.',
			rowIds: script === 'katakana' ? ['g', 'z', 'd', 'b', 'v', 'p'] : ['g', 'z', 'd', 'b', 'p'],
			info: dakuonBlocks(script),
			quizzes: [
				{ kind: 'kana-to-romaji', focusId: 'ga' },
				{ kind: 'romaji-to-kana', focusId: 'za' },
				{ kind: 'kana-to-romaji', focusId: 'da' },
				{ kind: 'romaji-to-kana', focusId: 'ba' },
				{ kind: 'kana-to-romaji', focusId: 'pa' }
			]
		}),
		buildCuratedLesson({
			id: `${script}-yoon`,
			script,
			title: `${label}: yōon`,
			description: 'きゃ, しゅ, ちょ… sonidos contraídos con や, ゆ, よ pequeñas.',
			rowIds: kanaRowsByCategory(script, 'yoon').map((row) => row.id),
			info: YOON_BLOCKS,
			quizzes: [
				{ kind: 'kana-to-romaji', focusId: 'kya' },
				{ kind: 'romaji-to-kana', focusId: 'sha' },
				{ kind: 'kana-to-romaji', focusId: 'cha' },
				{ kind: 'romaji-to-kana', focusId: 'ja' },
				{ kind: 'kana-to-romaji', focusId: 'ryu' }
			]
		}),
		buildCuratedLesson({
			id: `${script}-long-sounds`,
			script,
			title: `${label}: vocales y consonantes largas`,
			description: 'Vocales largas y la っ pequeña (sokuon).',
			info: longSoundsBlocks(script),
			quizzes: [
				{ kind: 'kana-to-romaji', focusId: 'ko' },
				{ kind: 'romaji-to-kana', focusId: 'ka' },
				{ kind: 'kana-to-romaji', focusId: 'ta' },
				{ kind: 'romaji-to-kana', focusId: 'ho' }
			]
		})
	];

	if (script === 'katakana') {
		lessons.push(
			buildCuratedLesson({
				id: 'katakana-extras',
				script,
				title: 'Katakana: sonidos extra',
				description: 'ファ, ウィ, ティ, シェ, ツァ… combinaciones para préstamos.',
				rowIds: kanaRowsByCategory(script, 'extension').map((row) => row.id),
				info: KATAKANA_EXTRAS_BLOCKS,
				quizzes: [
					{ kind: 'kana-to-romaji', focusId: 'fa' },
					{ kind: 'romaji-to-kana', focusId: 'wi' },
					{ kind: 'kana-to-romaji', focusId: 'ti' },
					{ kind: 'romaji-to-kana', focusId: 'she' },
					{ kind: 'kana-to-romaji', focusId: 'tsa' }
				]
			})
		);
	}

	return lessons;
}

/** Build the intro lesson plus one lesson per row for each script. */
function buildLessons(): KanaLesson[] {
	const lessons: KanaLesson[] = [
		{
			id: 'intro',
			script: null,
			rowIds: [],
			title: '¿Qué son los kana?',
			description: 'Hiragana y katakana: dos silabarios, los mismos sonidos.',
			steps: [{ id: 'intro-info', kind: 'info', blocks: INTRO_BLOCKS }]
		}
	];

	for (const script of KANA_SCRIPT_IDS) {
		const known: Kana[] = [];
		const random = seededRandom(`${script}-quiz`);

		for (const group of LESSON_GROUPS) {
			const steps: KanaLessonStep[] = [];
			let questionId = 1;
			const kanaList = group.rows.flatMap((row) => row.kana);

			kanaList.forEach((kana, index) => {
				steps.push({ id: `${group.id}-${kana.id}-teach`, kind: 'teach', script, kanaId: kana.id });
				steps.push({ id: `${group.id}-${kana.id}-draw`, kind: 'draw', script, kanaId: kana.id });
				known.push(kana);

				// From the second character on, review what has been learned so far.
				// Each question is its own step, never a sub-step of a quiz block.
				if (index >= 1) {
					for (const question of buildQuizQuestions(script, kana, known, questionId, random)) {
						steps.push({
							id: `${group.id}-${kana.id}-quiz-${question.id}`,
							kind: 'quiz',
							script,
							question
						});
						questionId += 1;
					}
				}
			});

			// Groups with a single kana never trigger a quiz, so add a final review.
			if (kanaList.length < 2 && known.length >= 2) {
				const focus = pickRandom(known, random);
				for (const question of buildQuizQuestions(script, focus, known, questionId, random)) {
					steps.push({
						id: `${group.id}-review-${question.id}`,
						kind: 'quiz',
						script,
						question
					});
					questionId += 1;
				}
			}

			lessons.push({
				id: `${script}-${group.id}`,
				script,
				rowIds: group.rowIds,
				title: `${script === 'hiragana' ? 'Hiragana' : 'Katakana'}: ${group.label}`,
				description: kanaList.map((kana) => kanaCharacter(kana, script)).join(' · '),
				steps
			});
		}

		lessons.push(...curatedLessons(script));
	}

	return lessons;
}

/** The full lesson catalog, in study order. */
export const KANA_LESSONS: KanaLesson[] = buildLessons();

/** Kana of the script, in order, restricted to those taught up to a lesson. */
export function kanaTaughtInLesson(lesson: KanaLesson): Kana[] {
	if (!lesson.script || lesson.rowIds.length === 0) return [];
	const all = scriptKana(lesson.script);
	const lastRowId = lesson.rowIds.at(-1)!;
	const lastKana = KANA_ROWS.find((row) => row.id === lastRowId)?.kana.at(-1);
	const index = lastKana ? all.findIndex((kana) => kana.id === lastKana.id) : -1;
	return index >= 0 ? all.slice(0, index + 1) : [];
}

export function kanaLessonById(id: string): KanaLesson | undefined {
	return KANA_LESSONS.find((lesson) => lesson.id === id);
}

/**
 * Kana introduced *by* a lesson: exactly the rows it teaches, not the kana
 * learned in previous lessons. Used to enable practice on lesson completion.
 */
export function lessonKana(lesson: KanaLesson): Kana[] {
	if (!lesson.script || lesson.rowIds.length === 0) return [];
	const rows = lesson.rowIds.flatMap(
		(rowId) => KANA_ROWS.find((row) => row.id === rowId)?.kana ?? []
	);
	return rows;
}
