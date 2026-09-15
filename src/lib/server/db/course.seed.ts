import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray, sql } from 'drizzle-orm';
import {
	courseUnits,
	courses,
	lessonNotes,
	lessons,
	quizOptions,
	quizQuestions
} from './course.schema.ts';
import { notes } from './fsrs.schema.ts';
import { CourseLevel, type LessonContentBlock } from '../../types/course.ts';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

/** A quiz question in the seed catalog. The first option is the correct one. */
type SeedQuestion = {
	prompt: string;
	options: string[];
};

/**
 * A lesson in the seed catalog. `words` links existing vocabulary notes (cards);
 * `content` teaches lessons that have no cards; `quiz` adds a small check.
 */
type SeedLesson = {
	title: string;
	description: string;
	words?: string[];
	content?: LessonContentBlock[];
	quiz?: SeedQuestion[];
};

type SeedUnit = {
	title: string;
	description: string;
	lessons: SeedLesson[];
};

const course: {
	slug: string;
	title: string;
	subtitle: string;
	description: string;
	glyph: string;
	level: CourseLevel;
	units: SeedUnit[];
} = {
	slug: 'japanese-beginner',
	title: 'Japanese Beginner',
	subtitle: 'Fundamentos de vocabulario N5',
	description:
		'Una ruta guiada por el vocabulario esencial del japonés. Cada lección introduce un grupo pequeño de palabras con ejemplos de uso reales.',
	glyph: '学',
	level: CourseLevel.N5,
	units: [
		{
			title: 'Empezando',
			description: 'Los verbos más comunes del día a día.',
			lessons: [
				{
					title: 'Cómo usar este curso',
					description: 'Una introducción sin tarjetas, solo lectura.',
					content: [
						{ type: 'heading', text: 'Bienvenido' },
						{
							type: 'paragraph',
							text: 'Este curso agrupa el vocabulario esencial en unidades y lecciones cortas. Algunas lecciones usan tarjetas para practicar; otras, como esta, solo explican ideas.'
						},
						{ type: 'heading', text: 'Cómo estudiar' },
						{
							type: 'paragraph',
							text: 'Lee la lección, revisa los ejemplos y responde el quiz si lo hay. Cuando termines, marca la lección como completada para avanzar.'
						},
						{
							type: 'example',
							japanese: '毎日少しずつ勉強します。',
							furigana: '毎日[まいにち]少[すこ]しずつ勉強[べんきょう]します。',
							meaning: 'Estudio un poco cada día.'
						},
						{
							type: 'note',
							text: 'La constancia importa más que la cantidad: cinco minutos al día funcionan mejor que una hora una vez por semana.'
						}
					],
					quiz: [
						{
							prompt: '¿Qué conviene hacer al terminar una lección?',
							options: [
								'Marcarla como completada para avanzar',
								'Repetirla diez veces seguidas',
								'Saltar a la última unidad'
							]
						},
						{
							prompt: '¿Qué ritmo de estudio recomienda la lección?',
							options: ['Un poco cada día', 'Solo los fines de semana', 'Todo en una sola sesión']
						}
					]
				},
				{
					title: 'Existencia y acciones básicas',
					description: 'Verbos de existencia y de la rutina diaria.',
					words: ['無い', '食べる', '飲む', '行く', '来る', '見る'],
					quiz: [
						{
							prompt: '¿Qué significa 食べる?',
							options: ['Comer', 'Beber', 'Ver']
						},
						{
							prompt: '¿Qué significa 飲む?',
							options: ['Beber', 'Comer', 'Ir']
						},
						{
							prompt: '¿Qué significa 行く?',
							options: ['Ir', 'Venir', 'Ver']
						}
					]
				},
				{
					title: 'Comunicación',
					description: 'Hablar, escuchar, leer y escribir.',
					words: ['聞く', '話す', '読む', '書く'],
					quiz: [
						{
							prompt: '¿Qué significa 話す?',
							options: ['Hablar', 'Escuchar', 'Escribir']
						},
						{
							prompt: '¿Qué significa 読む?',
							options: ['Leer', 'Escribir', 'Escuchar']
						}
					]
				}
			]
		},
		{
			title: 'Vida cotidiana',
			description: 'Verbos para el trabajo, el ocio y el descanso.',
			lessons: [
				{
					title: 'Compras y creación',
					description: 'Comprar, hacer y usar objetos.',
					words: ['買う', '作る', '使う']
				},
				{
					title: 'Rutina diaria',
					description: 'Moverse y descansar durante el día.',
					words: ['待つ', '会う', '立つ', '座る', '歩く', '走る', '泳ぐ']
				},
				{
					title: 'Descanso',
					description: 'Dormir, despertar y trabajar.',
					words: ['寝る', '起きる', '働く', '休む', '遊ぶ']
				}
			]
		},
		{
			title: 'Aprender a aprender',
			description: 'Verbos que usamos al estudiar.',
			lessons: [
				{
					title: 'Enseñar y aprender',
					description: 'Compartir y adquirir conocimiento.',
					words: ['教える', '習う']
				},
				{
					title: 'Memoria',
					description: 'Recordar, olvidar y comprender.',
					words: ['覚える', '忘れる', '分かる'],
					quiz: [
						{
							prompt: '¿Qué significa 覚える?',
							options: ['Memorizar', 'Olvidar', 'Entender']
						},
						{
							prompt: '¿Qué significa 忘れる?',
							options: ['Olvidar', 'Memorizar', 'Entender']
						},
						{
							prompt: '¿Qué significa 分かる?',
							options: ['Entender', 'Olvidar', 'Memorizar']
						}
					]
				}
			]
		}
	]
};

async function seed() {
	const client = postgres(DATABASE_URL as string);
	const db = drizzle(client);

	try {
		// Resolve every word referenced by the catalog to its note id.
		const allWords = course.units.flatMap((unit) =>
			unit.lessons.flatMap((lesson) => lesson.words ?? [])
		);
		const wordRows = allWords.length
			? await db
					.select({ id: notes.id, word: sql<string>`${notes.metadata}->>'word'` })
					.from(notes)
					.where(inArray(sql`${notes.metadata}->>'word'`, allWords))
			: [];

		const idByWord = new Map(wordRows.map((row) => [row.word, row.id]));
		const missing = allWords.filter((word) => !idByWord.has(word));
		if (missing.length > 0) {
			throw new Error(`No se encontraron notas para: ${missing.join(', ')}`);
		}

		// Upsert the course by slug so re-running the seed is safe.
		const [existing] = await db
			.select({ id: courses.id })
			.from(courses)
			.where(eq(courses.slug, course.slug));

		const courseId =
			existing?.id ??
			(
				await db
					.insert(courses)
					.values({
						slug: course.slug,
						title: course.title,
						subtitle: course.subtitle,
						description: course.description,
						glyph: course.glyph,
						level: course.level,
						position: 0,
						published: 1
					})
					.returning({ id: courses.id })
			)[0].id;

		// Rebuild the course tree so re-running does not duplicate units/lessons.
		await db.delete(courseUnits).where(eq(courseUnits.courseId, courseId));

		let lessonCount = 0;
		let quizCount = 0;

		for (const [unitIndex, unit] of course.units.entries()) {
			const [unitRow] = await db
				.insert(courseUnits)
				.values({
					courseId,
					title: unit.title,
					description: unit.description,
					position: unitIndex
				})
				.returning({ id: courseUnits.id });

			for (const [lessonIndex, lesson] of unit.lessons.entries()) {
				const [lessonRow] = await db
					.insert(lessons)
					.values({
						unitId: unitRow.id,
						title: lesson.title,
						description: lesson.description,
						content: lesson.content ?? null,
						position: lessonIndex
					})
					.returning({ id: lessons.id });

				if (lesson.words?.length) {
					await db.insert(lessonNotes).values(
						lesson.words.map((word, position) => ({
							lessonId: lessonRow.id,
							noteId: idByWord.get(word)!,
							position
						}))
					);
				}

				for (const [questionIndex, question] of (lesson.quiz ?? []).entries()) {
					const [questionRow] = await db
						.insert(quizQuestions)
						.values({
							lessonId: lessonRow.id,
							prompt: question.prompt,
							position: questionIndex
						})
						.returning({ id: quizQuestions.id });

					await db.insert(quizOptions).values(
						question.options.map((label, position) => ({
							questionId: questionRow.id,
							label,
							// The first option is the correct answer by convention.
							correct: position === 0,
							position
						}))
					);

					quizCount += 1;
				}

				lessonCount += 1;
			}
		}

		console.log(
			`Seeded course "${course.title}" with ${course.units.length} units, ${lessonCount} lessons and ${quizCount} quiz questions.`
		);
	} finally {
		await client.end();
	}
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
