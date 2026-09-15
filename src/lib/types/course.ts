/** JLPT level a course targets. */
export const CourseLevel = {
	N5: 'N5',
	N4: 'N4',
	N3: 'N3',
	N2: 'N2',
	N1: 'N1'
} as const;

export type CourseLevel = (typeof CourseLevel)[keyof typeof CourseLevel];

/** Whether a user has not started, is working on, or finished a lesson/course. */
export const ProgressStatus = {
	NotStarted: 0,
	InProgress: 1,
	Completed: 2
} as const;

export type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];

/** A single answer choice inside a quiz question. */
export type QuizOption = {
	id: number;
	label: string;
};

/** A multiple-choice question. Correct answers are never sent to the client. */
export type QuizQuestion = {
	id: number;
	prompt: string;
	options: QuizOption[];
};

/** The quiz attached to a lesson, if any. */
export type LessonQuiz = {
	questions: QuizQuestion[];
};

/** Outcome of grading a quiz submission. */
export type QuizResult = {
	score: number;
	total: number;
	questions: {
		questionId: number;
		selectedOptionId: number | null;
		correctOptionId: number;
		correct: boolean;
	}[];
};

/**
 * A block of lesson body content. Lessons without cards still teach something,
 * so they carry a small sequence of these blocks instead.
 */
export type LessonContentBlock =
	| { type: 'heading'; text: string }
	| { type: 'paragraph'; text: string }
	| { type: 'example'; japanese: string; furigana?: string; meaning: string }
	| { type: 'note'; text: string };
