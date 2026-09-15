import { error, fail, redirect } from '@sveltejs/kit';
import { courseService } from '$lib/server/services/course/course';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const lessonId = Number(event.params.lessonId);

	if (!Number.isInteger(lessonId)) {
		return error(404, 'Lección no encontrada');
	}

	const lesson = await courseService.getLesson(userId, lessonId);

	if (!lesson || lesson.courseSlug !== event.params.slug) {
		return error(404, 'Lección no encontrada');
	}

	return { lesson };
};

export const actions: Actions = {
	/** Grade a quiz submission without completing the lesson. */
	grade: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const lessonId = Number(event.params.lessonId);
		if (!Number.isInteger(lessonId)) return fail(400, { message: 'Datos inválidos' });

		const formData = await event.request.formData();
		const answers = new Map<number, number | null>();

		for (const [key, value] of formData.entries()) {
			const match = /^answer_(\d+)$/.exec(key);
			if (!match) continue;
			const questionId = Number(match[1]);
			const raw = String(value);
			answers.set(questionId, raw === '' ? null : Number(raw));
		}

		const result = await courseService.gradeQuiz(lessonId, answers);
		return { success: true, quiz: result };
	},

	/** Mark the lesson as completed and move on to the next one. */
	complete: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const lessonId = Number(event.params.lessonId);
		if (!Number.isInteger(lessonId)) return fail(400, { message: 'Datos inválidos' });

		let result: Awaited<ReturnType<typeof courseService.completeLesson>>;
		try {
			result = await courseService.completeLesson(userId, lessonId);
		} catch {
			return fail(404, { message: 'Lección no encontrada' });
		}

		// `redirect` throws, so it must run outside the try/catch above.
		if (result.nextLessonId) {
			return redirect(302, `/cursos/${event.params.slug}/lecciones/${result.nextLessonId}`);
		}

		return { success: true, ...result };
	}
};
