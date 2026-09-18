<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { KANA_SCRIPT_IDS, type KanaScript } from '$lib/kana/data.js';
	import { KANA_LESSONS, type KanaLesson } from '$lib/kana/lessons.js';
	import { ProgressStatus } from '$lib/types/course';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import Gamepad2Icon from '@lucide/svelte/icons/gamepad-2';
	import PlayIcon from '@lucide/svelte/icons/play';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const intro = KANA_LESSONS.filter((lesson) => lesson.script === null);
	const groups = KANA_SCRIPT_IDS.map((script) => ({
		script,
		label: script === 'hiragana' ? 'Hiragana' : 'Katakana',
		lessons: KANA_LESSONS.filter((lesson) => lesson.script === script)
	}));

	function statusOf(lesson: KanaLesson): ProgressStatus {
		return data.progress[lesson.id] ?? ProgressStatus.NotStarted;
	}

	const completedCount = $derived(
		KANA_LESSONS.filter((lesson) => statusOf(lesson) === ProgressStatus.Completed).length
	);
	const percent = $derived(
		KANA_LESSONS.length === 0 ? 0 : Math.round((completedCount / KANA_LESSONS.length) * 100)
	);

	const nextLesson = $derived(
		KANA_LESSONS.find((lesson) => statusOf(lesson) !== ProgressStatus.Completed) ?? null
	);

	function scriptLabel(script: KanaScript | null): string {
		if (script === 'hiragana') return 'Hiragana';
		if (script === 'katakana') return 'Katakana';
		return 'Introducción';
	}
</script>

<svelte:head><title>Lecciones de kana</title></svelte:head>

{#snippet lessonCard(lesson: KanaLesson, index: number)}
	{@const status = statusOf(lesson)}
	{@const completed = status === ProgressStatus.Completed}
	<Card.Root size="sm">
		<Card.Content class="flex items-center gap-4">
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-full {completed
					? 'bg-emerald-100 text-emerald-600'
					: 'bg-muted text-muted-foreground'}"
			>
				{#if completed}
					<CheckIcon class="size-4" />
				{:else}
					<span class="text-xs font-medium tabular-nums">{index + 1}</span>
				{/if}
			</div>
			<div class="flex-1 space-y-0.5">
				<p class="text-sm font-medium">{lesson.title}</p>
				<p class="text-xs text-muted-foreground">{lesson.description}</p>
			</div>
			<Badge variant="outline" class="hidden sm:inline-flex">{scriptLabel(lesson.script)}</Badge>
			<Button href={`/kana/lecciones/${lesson.id}`} variant="ghost" size="sm">
				{completed ? 'Repasar' : 'Abrir'}
				<ArrowRightIcon data-icon="inline-end" />
			</Button>
		</Card.Content>
	</Card.Root>
{/snippet}

<div class="flex flex-1 flex-col">
	<header class="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-1 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href={resolve('/kana')} class="text-muted-foreground"
						>Kana</Breadcrumb.Link
					>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item><Breadcrumb.Page>Lecciones</Breadcrumb.Page></Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</header>

	<main class="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-normal">Lecciones de kana</h1>
				<p class="text-sm text-muted-foreground">
					Una ruta guiada: observa el trazo, dibújalo y ponlo a prueba fila a fila.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<Badge variant="outline">{completedCount} / {KANA_LESSONS.length} completadas</Badge>
				<Button href={resolve('/kana/practica')} variant="outline">
					<Gamepad2Icon data-icon="inline-start" />
					Práctica libre
				</Button>
			</div>
		</div>

		<Card.Root>
			<Card.Content class="space-y-3">
				<div class="flex items-center justify-between text-xs text-muted-foreground">
					<span>Tu progreso</span>
					<span>{percent}%</span>
				</div>
				<Progress value={percent} class="h-1.5" />
				{#if nextLesson}
					<Button href={`/kana/lecciones/${nextLesson.id}`} class="w-full sm:w-auto">
						<PlayIcon data-icon="inline-start" />
						{completedCount === 0 ? 'Empezar' : 'Continuar'}: {nextLesson.title}
					</Button>
				{:else}
					<p class="text-sm font-medium text-emerald-600">
						¡Has completado todas las lecciones de kana!
					</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<section class="space-y-3">
			<h2 class="font-serif text-xl font-medium">Introducción</h2>
			<div class="grid gap-3">
				{#each intro as lesson, index (lesson.id)}
					{@render lessonCard(lesson, index)}
				{/each}
			</div>
		</section>

		{#each groups as group (group.script)}
			<section class="space-y-3">
				<div class="flex items-baseline gap-3">
					<span class="text-xs font-medium text-muted-foreground tabular-nums">
						{group.script === 'hiragana' ? '01' : '02'}
					</span>
					<div>
						<h2 class="font-serif text-xl font-medium">{group.label}</h2>
						<p class="text-sm text-muted-foreground">
							Una lección por grupo de filas del silabario.
						</p>
					</div>
				</div>
				<div class="grid gap-3">
					{#each group.lessons as lesson, index (lesson.id)}
						{@render lessonCard(lesson, index)}
					{/each}
				</div>
			</section>
		{/each}
	</main>
</div>
