import type { LessonContentBlock } from '$lib/types/course';
import {
	KANA_ROWS,
	KANA_SCRIPT_IDS,
	kanaCharacter,
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
	| { id: string; kind: 'quiz'; script: KanaScript; questions: KanaQuizQuestion[] };

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
	return KANA_ROWS.flatMap((row) => row.kana);
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

	for (const row of KANA_ROWS) {
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
				if (index >= 1) {
					const questions = buildQuizQuestions(script, kana, known, questionId, random);
					questionId += questions.length;
					steps.push({ id: `${group.id}-${kana.id}-quiz`, kind: 'quiz', script, questions });
				}
			});

			// Groups with a single kana never trigger a quiz, so add a final review.
			if (kanaList.length < 2 && known.length >= 2) {
				const focus = pickRandom(known, random);
				const questions = buildQuizQuestions(script, focus, known, questionId, random);
				steps.push({ id: `${group.id}-review`, kind: 'quiz', script, questions });
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
