import { error } from '@sveltejs/kit';
import { courseService } from '$lib/server/services/course/course';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const course = await courseService.getCourse(userId, event.params.slug);

	if (!course) {
		return error(404, 'Curso no encontrado');
	}

	return { course };
};
