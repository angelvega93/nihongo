import { kanaService } from '$lib/server/services/kana/kana';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const [progress, enabled] = await Promise.all([
		kanaService.getProgress(userId),
		kanaService.getEnabledKana(userId)
	]);
	return { progress, enabled };
};
