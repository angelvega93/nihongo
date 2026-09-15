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
	import CheckIcon from '@lucide/svelte/icons/check';
	import CircleIcon from '@lucide/svelte/icons/circle';
	import PlayIcon from '@lucide/svelte/icons/play';
	import { ProgressStatus } from '$lib/types/course';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const nextLesson = $derived(
		data.course.units
			.flatMap((unit) => unit.lessons)
			.find((lesson) => lesson.status !== ProgressStatus.Completed)
	);
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
					<Breadcrumb.Link href="/cursos" class="text-muted-foreground">Cursos</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{data.course.title}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
</header>

<div class="flex flex-1 flex-col gap-8 p-6">
	<div class="flex flex-wrap items-start justify-between gap-6">
		<div class="flex items-start gap-4">
			<div
				class="flex size-14 items-center justify-center rounded-xl bg-orange-100 font-serif text-2xl"
			>
				{data.course.glyph ?? data.course.title[0]}
			</div>
			<div class="space-y-1">
				<div class="flex items-center gap-2">
					<Badge variant="secondary">{data.course.level}</Badge>
					<span class="text-xs text-muted-foreground">{data.course.lessonCount} lecciones</span>
				</div>
				<h1 class="font-serif text-3xl font-medium">{data.course.title}</h1>
				{#if data.course.subtitle}
					<p class="text-sm text-muted-foreground">{data.course.subtitle}</p>
				{/if}
			</div>
		</div>

		<div class="flex w-full max-w-xs flex-col gap-2">
			<div class="flex items-center justify-between text-xs text-muted-foreground">
				<span>{data.course.completedLessons} / {data.course.lessonCount} completadas</span>
				<span>{data.course.progress}%</span>
			</div>
			<Progress value={data.course.progress} class="h-1.5" />
			{#if nextLesson}
				<Button href={`/cursos/${data.course.slug}/lecciones/${nextLesson.id}`} class="w-full">
					<PlayIcon data-icon="inline-start" />
					{data.course.enrolled ? 'Continuar curso' : 'Empezar curso'}
				</Button>
			{:else}
				<Button variant="outline" class="w-full" disabled>Curso completado</Button>
			{/if}
		</div>
	</div>

	{#if data.course.description}
		<Card.Root>
			<Card.Content class="text-sm/relaxed text-muted-foreground">
				{data.course.description}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.course.units.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>Este curso todavía no tiene contenido</Empty.Title>
				<Empty.Description>
					Las unidades y lecciones aparecerán aquí en cuanto se añadan.
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<div class="space-y-6">
			{#each data.course.units as unit (unit.id)}
				<section class="space-y-3">
					<div class="flex items-baseline gap-3">
						<span class="text-xs font-medium text-muted-foreground tabular-nums">
							{String(unit.position + 1).padStart(2, '0')}
						</span>
						<div>
							<h2 class="font-serif text-xl font-medium">{unit.title}</h2>
							{#if unit.description}
								<p class="text-sm text-muted-foreground">{unit.description}</p>
							{/if}
						</div>
					</div>

					<div class="grid gap-3">
						{#each unit.lessons as lesson (lesson.id)}
							<Card.Root size="sm">
								<Card.Content class="flex items-center gap-4">
									<div
										class="flex size-9 shrink-0 items-center justify-center rounded-full {lesson.status ===
										ProgressStatus.Completed
											? 'bg-emerald-100 text-emerald-600'
											: 'bg-muted text-muted-foreground'}"
									>
										{#if lesson.status === ProgressStatus.Completed}
											<CheckIcon class="size-4" />
										{:else}
											<CircleIcon class="size-4" />
										{/if}
									</div>
									<div class="flex-1 space-y-0.5">
										<p class="text-sm font-medium">{lesson.title}</p>
										<p class="text-xs text-muted-foreground">
											{#if lesson.noteCount > 0}
												{lesson.noteCount} tarjetas
											{:else if lesson.hasContent}
												Lectura
											{:else}
												Sin material
											{/if}
											{#if lesson.questionCount > 0}
												· {lesson.questionCount} preguntas
											{/if}
											{#if lesson.description}
												· {lesson.description}
											{/if}
										</p>
									</div>
									<Button
										href={`/cursos/${data.course.slug}/lecciones/${lesson.id}`}
										variant="ghost"
										size="sm"
									>
										{lesson.status === ProgressStatus.Completed ? 'Repasar' : 'Abrir'}
										<ArrowRightIcon data-icon="inline-end" />
									</Button>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
