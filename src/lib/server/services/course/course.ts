import { db } from '$lib/server/db';
import {
	courseUnits,
	courses,
	lessonNotes,
	lessons,
	notes,
	ProgressStatus,
	quizOptions,
	quizQuestions,
	userCourseEnrollment,
	userLessonProgress,
	type CourseLevel
} from '$lib/server/db/schema';
import type { LessonContentBlock, LessonQuiz, QuizResult } from '$lib/types/course';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';

/** A course as shown in the catalog, with the viewer's aggregated progress. */
export type CourseSummary = {
	id: number;
	slug: string;
	title: string;
	subtitle: string | null;
	description: string | null;
	glyph: string | null;
	level: CourseLevel;
	lessonCount: number;
	completedLessons: number;
	/** Integer 0–100. */
	progress: number;
	enrolled: boolean;
	lastLessonId: number | null;
};

/** A lesson as listed inside a course, with the viewer's progress. */
export type CourseLesson = {
	id: number;
	title: string;
	description: string | null;
	position: number;
	noteCount: number;
	questionCount: number;
	hasContent: boolean;
	status: ProgressStatus;
};

/** A unit together with its lessons. */
export type CourseUnit = {
	id: number;
	title: string;
	description: string | null;
	position: number;
	lessons: CourseLesson[];
};

/** Full course detail: course metadata plus its units and lessons. */
export type CourseDetail = CourseSummary & {
	units: CourseUnit[];
};

/** Percentage completed, guarding against a zero lesson count. */
function toPercent(completed: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((completed / total) * 100);
}

export class CourseService {
	/** List the published catalog enriched with the viewer's progress. */
	async listCourses(userId: string): Promise<CourseSummary[]> {
		const rows = await db
			.select({
				id: courses.id,
				slug: courses.slug,
				title: courses.title,
				subtitle: courses.subtitle,
				description: courses.description,
				glyph: courses.glyph,
				level: courses.level,
				position: courses.position,
				lessonCount: sql<number>`COUNT(DISTINCT ${lessons.id})::int`,
				completedLessons: sql<number>`COUNT(DISTINCT CASE WHEN ${userLessonProgress.status} = ${ProgressStatus.Completed} THEN ${lessons.id} END)::int`,
				lastLessonId: userCourseEnrollment.lastLessonId,
				status: userCourseEnrollment.status
			})
			.from(courses)
			.leftJoin(courseUnits, eq(courseUnits.courseId, courses.id))
			.leftJoin(lessons, eq(lessons.unitId, courseUnits.id))
			.leftJoin(
				userLessonProgress,
				and(eq(userLessonProgress.lessonId, lessons.id), eq(userLessonProgress.userId, userId))
			)
			.leftJoin(
				userCourseEnrollment,
				and(eq(userCourseEnrollment.courseId, courses.id), eq(userCourseEnrollment.userId, userId))
			)
			.where(eq(courses.published, 1))
			.groupBy(courses.id, userCourseEnrollment.lastLessonId, userCourseEnrollment.status)
			.orderBy(asc(courses.position), asc(courses.id));

		return rows.map((row) => ({
			id: row.id,
			slug: row.slug,
			title: row.title,
			subtitle: row.subtitle,
			description: row.description,
			glyph: row.glyph,
			level: row.level,
			lessonCount: row.lessonCount,
			completedLessons: row.completedLessons,
			progress: toPercent(row.completedLessons, row.lessonCount),
			enrolled: row.status !== null && row.status !== undefined,
			lastLessonId: row.lastLessonId
		}));
	}

	/** Load a single published course with its units, lessons and viewer progress. */
	async getCourse(userId: string, slug: string): Promise<CourseDetail | null> {
		const [course] = await db
			.select()
			.from(courses)
			.where(and(eq(courses.slug, slug), eq(courses.published, 1)));

		if (!course) return null;

		const unitRows = await db
			.select({
				id: courseUnits.id,
				title: courseUnits.title,
				description: courseUnits.description,
				position: courseUnits.position
			})
			.from(courseUnits)
			.where(eq(courseUnits.courseId, course.id))
			.orderBy(asc(courseUnits.position), asc(courseUnits.id));

		const unitIds = unitRows.map((unit) => unit.id);

		const lessonRows = unitIds.length
			? await db
					.select({
						id: lessons.id,
						unitId: lessons.unitId,
						title: lessons.title,
						description: lessons.description,
						position: lessons.position,
						noteCount: sql<number>`COUNT(DISTINCT ${lessonNotes.noteId})::int`,
						questionCount: sql<number>`COUNT(DISTINCT ${quizQuestions.id})::int`,
						hasContent: sql<boolean>`COALESCE(jsonb_array_length(${lessons.content}), 0) > 0`,
						status: userLessonProgress.status
					})
					.from(lessons)
					.leftJoin(lessonNotes, eq(lessonNotes.lessonId, lessons.id))
					.leftJoin(quizQuestions, eq(quizQuestions.lessonId, lessons.id))
					.leftJoin(
						userLessonProgress,
						and(eq(userLessonProgress.lessonId, lessons.id), eq(userLessonProgress.userId, userId))
					)
					.where(inArray(lessons.unitId, unitIds))
					.groupBy(lessons.id, userLessonProgress.status)
					.orderBy(asc(lessons.position), asc(lessons.id))
			: [];

		const lessonsByUnit = new Map<number, CourseLesson[]>();
		for (const lesson of lessonRows) {
			const list = lessonsByUnit.get(lesson.unitId) ?? [];
			list.push({
				id: lesson.id,
				title: lesson.title,
				description: lesson.description,
				position: lesson.position,
				noteCount: lesson.noteCount,
				questionCount: lesson.questionCount,
				hasContent: lesson.hasContent,
				status: (lesson.status ?? ProgressStatus.NotStarted) as ProgressStatus
			});
			lessonsByUnit.set(lesson.unitId, list);
		}

		const [enrollment] = await db
			.select({ lastLessonId: userCourseEnrollment.lastLessonId })
			.from(userCourseEnrollment)
			.where(
				and(eq(userCourseEnrollment.courseId, course.id), eq(userCourseEnrollment.userId, userId))
			);

		const units: CourseUnit[] = unitRows.map((unit) => ({
			...unit,
			lessons: lessonsByUnit.get(unit.id) ?? []
		}));

		const allLessons = units.flatMap((unit) => unit.lessons);
		const completedLessons = allLessons.filter(
			(lesson) => lesson.status === ProgressStatus.Completed
		).length;

		return {
			id: course.id,
			slug: course.slug,
			title: course.title,
			subtitle: course.subtitle,
			description: course.description,
			glyph: course.glyph,
			level: course.level,
			lessonCount: allLessons.length,
			completedLessons,
			progress: toPercent(completedLessons, allLessons.length),
			enrolled: Boolean(enrollment),
			lastLessonId: enrollment?.lastLessonId ?? null,
			units
		};
	}

	/** Load a lesson with its content, notes, quiz and the viewer's status. */
	async getLesson(userId: string, lessonId: number) {
		const [lesson] = await db
			.select({
				id: lessons.id,
				unitId: lessons.unitId,
				title: lessons.title,
				description: lessons.description,
				content: lessons.content,
				unitTitle: courseUnits.title,
				unitPosition: courseUnits.position,
				courseId: courses.id,
				courseSlug: courses.slug,
				courseTitle: courses.title
			})
			.from(lessons)
			.innerJoin(courseUnits, eq(courseUnits.id, lessons.unitId))
			.innerJoin(courses, eq(courses.id, courseUnits.courseId))
			.where(eq(lessons.id, lessonId));

		if (!lesson) return null;

		const lessonNotesRows = await db
			.select({
				id: notes.id,
				type: notes.type,
				question: notes.question,
				answer: notes.answer,
				metadata: notes.metadata,
				position: lessonNotes.position
			})
			.from(lessonNotes)
			.innerJoin(notes, eq(notes.id, lessonNotes.noteId))
			.where(eq(lessonNotes.lessonId, lessonId))
			.orderBy(asc(lessonNotes.position), asc(notes.id));

		const questionRows = await db
			.select({
				id: quizQuestions.id,
				prompt: quizQuestions.prompt,
				position: quizQuestions.position
			})
			.from(quizQuestions)
			.where(eq(quizQuestions.lessonId, lessonId))
			.orderBy(asc(quizQuestions.position), asc(quizQuestions.id));

		const questionIds = questionRows.map((question) => question.id);
		const optionRows = questionIds.length
			? await db
					.select({
						id: quizOptions.id,
						questionId: quizOptions.questionId,
						label: quizOptions.label,
						position: quizOptions.position
					})
					.from(quizOptions)
					.where(inArray(quizOptions.questionId, questionIds))
					.orderBy(asc(quizOptions.position), asc(quizOptions.id))
			: [];

		// Only the option labels are exposed; correctness stays on the server.
		const optionsByQuestion = new Map<number, { id: number; label: string }[]>();
		for (const option of optionRows) {
			const list = optionsByQuestion.get(option.questionId) ?? [];
			list.push({ id: option.id, label: option.label });
			optionsByQuestion.set(option.questionId, list);
		}

		const quiz: LessonQuiz | null = questionRows.length
			? {
					questions: questionRows.map((question) => ({
						id: question.id,
						prompt: question.prompt,
						options: optionsByQuestion.get(question.id) ?? []
					}))
				}
			: null;

		const [progress] = await db
			.select({ status: userLessonProgress.status })
			.from(userLessonProgress)
			.where(and(eq(userLessonProgress.lessonId, lessonId), eq(userLessonProgress.userId, userId)));

		return {
			...lesson,
			content: (lesson.content ?? []) as LessonContentBlock[],
			status: (progress?.status ?? ProgressStatus.NotStarted) as ProgressStatus,
			notes: lessonNotesRows,
			quiz
		};
	}

	/**
	 * Grade a quiz submission. `answers` maps a question id to the selected
	 * option id (or `null` when the question was left unanswered).
	 */
	async gradeQuiz(lessonId: number, answers: Map<number, number | null>): Promise<QuizResult> {
		const questionRows = await db
			.select({ id: quizQuestions.id })
			.from(quizQuestions)
			.where(eq(quizQuestions.lessonId, lessonId))
			.orderBy(asc(quizQuestions.position), asc(quizQuestions.id));

		const questionIds = questionRows.map((question) => question.id);
		if (questionIds.length === 0) {
			return { score: 0, total: 0, questions: [] };
		}

		const optionRows = await db
			.select({
				id: quizOptions.id,
				questionId: quizOptions.questionId,
				correct: quizOptions.correct
			})
			.from(quizOptions)
			.where(inArray(quizOptions.questionId, questionIds));

		const correctByQuestion = new Map<number, number>();
		for (const option of optionRows) {
			if (option.correct) correctByQuestion.set(option.questionId, option.id);
		}

		const graded = questionRows.map((question) => {
			const selectedOptionId = answers.get(question.id) ?? null;
			const correctOptionId = correctByQuestion.get(question.id) ?? -1;
			return {
				questionId: question.id,
				selectedOptionId,
				correctOptionId,
				correct: selectedOptionId !== null && selectedOptionId === correctOptionId
			};
		});

		const score = graded.filter((item) => item.correct).length;

		return { score, total: questionIds.length, questions: graded };
	}

	/** Ordered list of lesson ids in a course, used to find the next one. */
	private async lessonIds(courseId: number): Promise<number[]> {
		const rows = await db
			.select({ id: lessons.id })
			.from(lessons)
			.innerJoin(courseUnits, eq(courseUnits.id, lessons.unitId))
			.where(eq(courseUnits.courseId, courseId))
			.orderBy(asc(courseUnits.position), asc(lessons.position), asc(lessons.id));

		return rows.map((row) => row.id);
	}

	/**
	 * Mark a lesson as completed for a user and advance the enrollment. When the
	 * lesson is the last one, the course is marked as completed too.
	 */
	async completeLesson(userId: string, lessonId: number) {
		const [lesson] = await db
			.select({ unitId: lessons.unitId })
			.from(lessons)
			.where(eq(lessons.id, lessonId));

		if (!lesson) throw new Error('Lesson not found');

		const [unit] = await db
			.select({ courseId: courseUnits.courseId })
			.from(courseUnits)
			.where(eq(courseUnits.id, lesson.unitId));

		if (!unit) throw new Error('Unit not found');

		const now = new Date();
		const ids = await this.lessonIds(unit.courseId);
		const nextLessonId = ids[ids.indexOf(lessonId) + 1] ?? null;
		const courseCompleted = nextLessonId === null;

		await db.transaction(async (tx) => {
			await tx
				.insert(userLessonProgress)
				.values({ userId, lessonId, status: ProgressStatus.Completed, completedAt: now })
				.onConflictDoUpdate({
					target: [userLessonProgress.userId, userLessonProgress.lessonId],
					set: { status: ProgressStatus.Completed, completedAt: now }
				});

			await tx
				.insert(userCourseEnrollment)
				.values({
					userId,
					courseId: unit.courseId,
					status: courseCompleted ? ProgressStatus.Completed : ProgressStatus.InProgress,
					lastLessonId: nextLessonId,
					completedAt: courseCompleted ? now : null
				})
				.onConflictDoUpdate({
					target: [userCourseEnrollment.userId, userCourseEnrollment.courseId],
					set: {
						status: courseCompleted ? ProgressStatus.Completed : ProgressStatus.InProgress,
						lastLessonId: nextLessonId,
						completedAt: courseCompleted ? now : null
					}
				});
		});

		return { lessonId, nextLessonId, courseCompleted };
	}

	/** Enroll the user in a course without marking any progress. */
	async enroll(userId: string, courseId: number) {
		const ids = await this.lessonIds(courseId);
		const firstLessonId = ids[0] ?? null;

		await db
			.insert(userCourseEnrollment)
			.values({ userId, courseId, lastLessonId: firstLessonId })
			.onConflictDoNothing({
				target: [userCourseEnrollment.userId, userCourseEnrollment.courseId]
			});

		return { courseId, firstLessonId };
	}

	/** Number of completed lessons across every course of a user. */
	async completedLessonCount(userId: string) {
		const [row] = await db
			.select({ value: count() })
			.from(userLessonProgress)
			.where(
				and(
					eq(userLessonProgress.userId, userId),
					eq(userLessonProgress.status, ProgressStatus.Completed)
				)
			);

		return Number(row.value);
	}
}

export const courseService = new CourseService();
export default courseService;
