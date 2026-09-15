import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	serial,
	smallint,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema.ts';
import { notes } from './fsrs.schema.ts';
import { CourseLevel, ProgressStatus, type LessonContentBlock } from '../../types/course.ts';

export { CourseLevel, ProgressStatus };

/**
 * A course in the global catalog. Courses are shared between all users; what is
 * per-user is the progress tracked in `userCourseEnrollment` / `userLessonProgress`.
 */
export const courses = pgTable(
	'courses',
	{
		id: serial('id').primaryKey(),
		/** Stable, URL-friendly identifier, e.g. `japanese-beginner`. */
		slug: text('slug').notNull(),
		title: text('title').notNull(),
		subtitle: text('subtitle'),
		description: text('description'),
		/** Emoji or single glyph used as the course avatar. */
		glyph: text('glyph'),
		level: text('level').$type<CourseLevel>().notNull().default(CourseLevel.N5),
		/** Manual ordering inside the catalog (lower first). */
		position: integer('position').notNull().default(0),
		/** Draft courses are hidden from the catalog. */
		published: smallint('published').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('courses_slug_idx').on(table.slug),
		index('courses_level_idx').on(table.level)
	]
);

/** A unit groups a set of lessons inside a course. */
export const courseUnits = pgTable(
	'course_units',
	{
		id: serial('id').primaryKey(),
		courseId: integer('course_id')
			.notNull()
			.references(() => courses.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		/** Manual ordering inside the course (lower first). */
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('course_units_course_id_idx').on(table.courseId)]
);

/**
 * A lesson is the smallest teachable step. It may be backed by a set of notes
 * (cards), by a sequence of content blocks, or by both. Lessons without cards
 * still teach through `content`.
 */
export const lessons = pgTable(
	'lessons',
	{
		id: serial('id').primaryKey(),
		unitId: integer('unit_id')
			.notNull()
			.references(() => courseUnits.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		/** Body of the lesson, used when there are no cards to show. */
		content: jsonb('content').$type<LessonContentBlock[]>(),
		/** Manual ordering inside the unit (lower first). */
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('lessons_unit_id_idx').on(table.unitId)]
);

/**
 * Join table linking lessons to the global notes they teach. A note can be
 * reused by several lessons.
 */
export const lessonNotes = pgTable(
	'lesson_notes',
	{
		lessonId: integer('lesson_id')
			.notNull()
			.references(() => lessons.id, { onDelete: 'cascade' }),
		noteId: integer('note_id')
			.notNull()
			.references(() => notes.id, { onDelete: 'cascade' }),
		/** Manual ordering inside the lesson (lower first). */
		position: integer('position').notNull().default(0)
	},
	(table) => [
		primaryKey({ columns: [table.lessonId, table.noteId] }),
		index('lesson_notes_note_id_idx').on(table.noteId)
	]
);

/** A multiple-choice question belonging to a lesson's quiz. */
export const quizQuestions = pgTable(
	'quiz_questions',
	{
		id: serial('id').primaryKey(),
		lessonId: integer('lesson_id')
			.notNull()
			.references(() => lessons.id, { onDelete: 'cascade' }),
		prompt: text('prompt').notNull(),
		/** Optional explanation shown after grading. */
		explanation: text('explanation'),
		/** Manual ordering inside the quiz (lower first). */
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('quiz_questions_lesson_id_idx').on(table.lessonId)]
);

/** An answer choice for a quiz question. Exactly one option is correct. */
export const quizOptions = pgTable(
	'quiz_options',
	{
		id: serial('id').primaryKey(),
		questionId: integer('question_id')
			.notNull()
			.references(() => quizQuestions.id, { onDelete: 'cascade' }),
		label: text('label').notNull(),
		correct: boolean('correct').notNull().default(false),
		/** Manual ordering inside the question (lower first). */
		position: integer('position').notNull().default(0)
	},
	(table) => [index('quiz_options_question_id_idx').on(table.questionId)]
);

/** Per-user enrollment in a course, tracking the current position. */
export const userCourseEnrollment = pgTable(
	'user_course_enrollment',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		courseId: integer('course_id')
			.notNull()
			.references(() => courses.id, { onDelete: 'cascade' }),
		status: smallint('status').$type<ProgressStatus>().notNull().default(ProgressStatus.InProgress),
		/** Last lesson the user opened, used to resume. */
		lastLessonId: integer('last_lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
		startedAt: timestamp('started_at').defaultNow().notNull(),
		completedAt: timestamp('completed_at'),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.courseId] }),
		index('user_course_enrollment_course_id_idx').on(table.courseId)
	]
);

/** Per-user progress on a single lesson. */
export const userLessonProgress = pgTable(
	'user_lesson_progress',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		lessonId: integer('lesson_id')
			.notNull()
			.references(() => lessons.id, { onDelete: 'cascade' }),
		status: smallint('status').$type<ProgressStatus>().notNull().default(ProgressStatus.InProgress),
		completedAt: timestamp('completed_at'),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.lessonId] }),
		index('user_lesson_progress_lesson_id_idx').on(table.lessonId)
	]
);

export const coursesRelations = relations(courses, ({ many }) => ({
	units: many(courseUnits),
	enrollments: many(userCourseEnrollment)
}));

export const courseUnitsRelations = relations(courseUnits, ({ one, many }) => ({
	course: one(courses, {
		fields: [courseUnits.courseId],
		references: [courses.id]
	}),
	lessons: many(lessons)
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
	unit: one(courseUnits, {
		fields: [lessons.unitId],
		references: [courseUnits.id]
	}),
	lessonNotes: many(lessonNotes),
	quizQuestions: many(quizQuestions),
	progress: many(userLessonProgress)
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
	lesson: one(lessons, {
		fields: [quizQuestions.lessonId],
		references: [lessons.id]
	}),
	options: many(quizOptions)
}));

export const quizOptionsRelations = relations(quizOptions, ({ one }) => ({
	question: one(quizQuestions, {
		fields: [quizOptions.questionId],
		references: [quizQuestions.id]
	})
}));

export const lessonNotesRelations = relations(lessonNotes, ({ one }) => ({
	lesson: one(lessons, {
		fields: [lessonNotes.lessonId],
		references: [lessons.id]
	}),
	note: one(notes, {
		fields: [lessonNotes.noteId],
		references: [notes.id]
	})
}));

export const userCourseEnrollmentRelations = relations(userCourseEnrollment, ({ one }) => ({
	user: one(user, {
		fields: [userCourseEnrollment.userId],
		references: [user.id]
	}),
	course: one(courses, {
		fields: [userCourseEnrollment.courseId],
		references: [courses.id]
	})
}));

export const userLessonProgressRelations = relations(userLessonProgress, ({ one }) => ({
	user: one(user, {
		fields: [userLessonProgress.userId],
		references: [user.id]
	}),
	lesson: one(lessons, {
		fields: [userLessonProgress.lessonId],
		references: [lessons.id]
	})
}));
