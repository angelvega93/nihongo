import { fail } from '@sveltejs/kit';
import { kanaService, type KanaAttempt } from '$lib/server/services/kana/kana';
import { isKanaScript } from '$lib/kana/data';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const attemptSchema = z.object({
	script: z.string().refine(isKanaScript, 'Silabario inválido'),
	kanaId: z.string().min(1).max(16),
	correct: z.boolean()
});

const attemptsSchema = z.array(attemptSchema).min(1).max(50);

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const progress = await kanaService.getProgress(userId);
	return { progress };
};

export const actions: Actions = {
	/** Persist one or more practice attempts and return the updated progress. */
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

	/** Reset the progress of one script, or of every script. */
	resetProgress: async (event) => {
		const userId = event.locals.user?.id;
		if (!userId) return fail(401, { message: 'No autenticado' });

		const formData = await event.request.formData();
		const script = formData.get('script');
		if (script !== null && !isKanaScript(script)) {
			return fail(400, { message: 'Silabario inválido' });
		}

		await kanaService.resetProgress(userId, script ?? undefined);
		return { success: true };
	}
};
