import { kanaService } from '$lib/server/services/kana/kana';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const enabled = await kanaService.getEnabledKana(userId);
	return { enabled };
};
