import { command, getRequestEvent, query } from '$app/server';
import { isKanaScript, type KanaScript } from '$lib/kana/data';
import type { KanaEnabledMap } from '$lib/kana/availability';
import { kanaService } from '$lib/server/services/kana/kana';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

/** Everything the selection dialog and the kana pages need about availability. */
export type KanaAvailability = {
	enabled: KanaEnabledMap;
};

const scriptSchema = z.custom<KanaScript>(isKanaScript, 'Silabario inválido');

const kanaIdsSchema = z.array(z.string().min(1).max(16)).min(1).max(200);

/** Kana the user has enabled for practice. */
export const getKanaAvailability = query(async (): Promise<KanaAvailability> => {
	const { locals } = getRequestEvent();
	const userId = locals.user?.id;
	if (!userId) error(401, { message: 'No autenticado' });

	const enabled = await kanaService.getEnabledKana(userId);

	return { enabled };
});

/** Enable or disable a single kana for practice. */
export const setKanaEnabled = command(
	z.object({
		script: scriptSchema,
		kanaId: z.string().min(1).max(16),
		enabled: z.boolean()
	}),
	async ({ script, kanaId, enabled }) => {
		const { locals } = getRequestEvent();
		const userId = locals.user?.id;
		if (!userId) error(401, { message: 'No autenticado' });

		await kanaService.setKanaEnabled(userId, script, kanaId, enabled);

		// Single-flight refresh so every page awaiting the query updates at once.
		void getKanaAvailability().refresh();
	}
);

/** Enable or disable several kana of one script, e.g. a whole row. */
export const setManyKanaEnabled = command(
	z.object({
		script: scriptSchema,
		kanaIds: kanaIdsSchema,
		enabled: z.boolean()
	}),
	async ({ script, kanaIds, enabled }) => {
		const { locals } = getRequestEvent();
		const userId = locals.user?.id;
		if (!userId) error(401, { message: 'No autenticado' });

		await kanaService.setManyKanaEnabled(userId, script, kanaIds, enabled);

		void getKanaAvailability().refresh();
	}
);
