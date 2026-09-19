/**
 * Catalog of the kana practice modes. Kept free of UI concerns (icons live in
 * the components) so both the mode selector and the dedicated mode pages can
 * share the same metadata.
 */

export type PracticeMode =
	'quiz' | 'listen' | 'draw' | 'word-choice' | 'pairs' | 'writing' | 'formation';

/** URL-friendly id used by `/kana/practica/[modo]`. */
export type PracticeModeSlug =
	| 'prueba'
	| 'escucha'
	| 'dibuja'
	| 'escritura'
	| 'empareja'
	| 'seleccion-palabra'
	| 'formacion-palabra';

/**
 * What a mode needs before it can be practised:
 * - `kana`: a minimum number of enabled kana.
 * - `words`: a minimum number of available vocabulary words.
 * - `null`: no requirement.
 */
export type PracticeRequirement = 'kana' | 'words' | null;

/** Minimum enabled kana (both scripts combined) required by the kana modes. */
export const MIN_KANA_FOR_PRACTICE = 16;
/** Minimum available words required by the vocabulary modes. */
export const MIN_WORDS_FOR_PRACTICE = 16;

export type PracticeModeInfo = {
	id: PracticeMode;
	slug: PracticeModeSlug;
	label: string;
	description: string;
	requirement: PracticeRequirement;
};

export const PRACTICE_MODES: readonly PracticeModeInfo[] = [
	{
		id: 'quiz',
		slug: 'prueba',
		label: 'Prueba',
		description: 'Elige la equivalencia antes de que termine el tiempo.',
		requirement: 'kana'
	},
	{
		id: 'listen',
		slug: 'escucha',
		label: 'Escucha',
		description: 'Identifica el kana correspondiente al sonido.',
		requirement: 'kana'
	},
	{
		id: 'draw',
		slug: 'dibuja',
		label: 'Dibuja',
		description: 'Dibuja de memoria el kana solicitado.',
		requirement: 'kana'
	},
	{
		id: 'writing',
		slug: 'escritura',
		label: 'Escritura',
		description: 'Escribe la lectura en romaji.',
		requirement: 'kana'
	},
	{
		id: 'pairs',
		slug: 'empareja',
		label: 'Emparejar pares',
		description: 'Une cada kana con su romanización.',
		requirement: 'kana'
	},
	{
		id: 'word-choice',
		slug: 'seleccion-palabra',
		label: 'Selección de palabra',
		description: 'Relaciona el significado y la lectura con la palabra japonesa.',
		requirement: 'words'
	},
	{
		id: 'formation',
		slug: 'formacion-palabra',
		label: 'Formación de palabra',
		description: 'Ordena los kana para formar la palabra.',
		requirement: 'words'
	}
];

/** Look up a mode by its URL slug. */
export function modeBySlug(slug: string): PracticeModeInfo | undefined {
	return PRACTICE_MODES.find((entry) => entry.slug === slug);
}

/** Metadata of a mode by its id. */
export function modeInfo(mode: PracticeMode): PracticeModeInfo {
	return PRACTICE_MODES.find((entry) => entry.id === mode)!;
}

/** URL slug of a mode. */
export function slugForMode(mode: PracticeMode): PracticeModeSlug {
	return modeInfo(mode).slug;
}
