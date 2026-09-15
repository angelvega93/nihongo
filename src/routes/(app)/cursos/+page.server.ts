import { courseService } from '$lib/server/services/course/course';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const courses = await courseService.listCourses(userId);

	return { courses };
};
