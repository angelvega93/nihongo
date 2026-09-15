<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
	import PlayIcon from '@lucide/svelte/icons/play';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const inProgress = $derived(data.courses.filter((course) => course.progress > 0));
	const available = $derived(data.courses.filter((course) => course.progress === 0));
</script>

<header class="flex items-center justify-between gap-4 border-b px-6 py-3">
	<div class="flex items-center gap-2">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-1 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/" class="text-muted-foreground">Learning space</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>Cursos</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
</header>

<div class="flex flex-1 flex-col gap-8 p-6">
	<div class="space-y-1">
		<p class="text-xs font-medium text-muted-foreground uppercase">Catálogo</p>
		<h1 class="font-serif text-3xl font-medium">Cursos</h1>
		<p class="text-sm text-muted-foreground">
			Rutas guiadas de vocabulario, gramática y kanji, organizadas por unidades y lecciones.
		</p>
	</div>

	{#if data.courses.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<GraduationCapIcon />
				</Empty.Media>
				<Empty.Title>No hay cursos publicados</Empty.Title>
				<Empty.Description>
					Cuando se publique un curso aparecerá aquí con sus unidades y lecciones.
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		{#if inProgress.length > 0}
			<section class="space-y-3">
				<div>
					<p class="text-xs font-medium text-muted-foreground uppercase">
						Continúa donde lo dejaste
					</p>
					<h2 class="font-serif text-xl font-medium">En progreso</h2>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each inProgress as course (course.id)}
						<Card.Root class="justify-between gap-4">
							<Card.Header>
								<div class="flex items-start justify-between gap-3">
									<div
										class="flex size-11 items-center justify-center rounded-lg bg-orange-100 font-serif text-xl"
									>
										{course.glyph ?? course.title[0]}
									</div>
									<Badge variant="secondary">{course.level}</Badge>
								</div>
								<Card.Title>{course.title}</Card.Title>
								{#if course.subtitle}
									<Card.Description>{course.subtitle}</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content class="space-y-3">
								<div class="space-y-1.5">
									<div class="flex items-center justify-between text-xs text-muted-foreground">
										<span>{course.completedLessons} / {course.lessonCount} lecciones</span>
										<span>{course.progress}%</span>
									</div>
									<Progress value={course.progress} class="h-1.5" />
								</div>
								<Button
									href={course.lastLessonId
										? `/cursos/${course.slug}/lecciones/${course.lastLessonId}`
										: `/cursos/${course.slug}`}
									class="w-full"
								>
									<PlayIcon data-icon="inline-start" />
									Continuar
								</Button>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</section>
		{/if}

		{#if available.length > 0}
			<section class="space-y-3">
				<div>
					<p class="text-xs font-medium text-muted-foreground uppercase">Explora</p>
					<h2 class="font-serif text-xl font-medium">Todos los cursos</h2>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each available as course (course.id)}
						<Card.Root class="justify-between gap-4">
							<Card.Header>
								<div class="flex items-start justify-between gap-3">
									<div
										class="flex size-11 items-center justify-center rounded-lg bg-rose-100 font-serif text-xl"
									>
										{course.glyph ?? course.title[0]}
									</div>
									<Badge variant="secondary">{course.level}</Badge>
								</div>
								<Card.Title>{course.title}</Card.Title>
								{#if course.subtitle}
									<Card.Description>{course.subtitle}</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content class="space-y-3">
								<p class="text-xs text-muted-foreground">{course.lessonCount} lecciones</p>
								<Button href={`/cursos/${course.slug}`} variant="outline" class="w-full">
									Ver curso
									<ArrowRightIcon data-icon="inline-end" />
								</Button>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>
