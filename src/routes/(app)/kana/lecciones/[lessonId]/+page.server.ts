import { error, fail } from '@sveltejs/kit';
import { kanaService, type KanaAttempt } from '$lib/server/services/kana/kana';
import { isKanaScript } from '$lib/kana/data';
import { KANA_LESSONS, kanaLessonById } from '$lib/kana/lessons';
import { ProgressStatus } from '$lib/types/course';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const attemptSchema = z.object({
	script: z.string().refine(isKanaScript, 'Silabario inválido'),
	kanaId: z.string().min(1).max(16),
	correct: z.boolean()
});

const attemptsSchema = z.array(attemptSchema).max(50);

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const lesson = kanaLessonById(event.params.lessonId);

	if (!lesson) {
		return error(404, 'Lección no encontrada');
	}

	const [progress, lessonProgress] = await Promise.all([
		kanaService.getProgress(userId),
		kanaService.getLessonProgress(userId)
	]);

	const index = KANA_LESSONS.findIndex((entry) => entry.id === lesson.id);

	return {
		lesson,
		index: index + 1,
		total: KANA_LESSONS.length,
		completed: lessonProgress[lesson.id] === ProgressStatus.Completed,
		progress
	};
};

export const actions: Actions = {
	/** Persist the kana attempts produced while working through the lesson. */
	recordAttempts: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const formData = await event.request.formData();
		const raw = formData.get('attempts');
		if (typeof raw !== 'string') return fail(400, { message: 'Datos inválidos' });

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return fail(400, { message: 'Datos inválidos' });
		}

		const payload = attemptsSchema.safeParse(parsed);
		if (!payload.success) return fail(400, { message: 'Datos inválidos' });

		const updated = await kanaService.recordAttempts(userId, payload.data as KanaAttempt[]);
		return { success: true, updated };
	},

	/** Mark the guided lesson as completed. */
	completeLesson: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const lessonId = event.params.lessonId;
		if (!kanaLessonById(lessonId)) return fail(404, { message: 'Lección no encontrada' });

		await kanaService.completeLesson(userId, lessonId);
		return { success: true, lessonId };
	}
};
