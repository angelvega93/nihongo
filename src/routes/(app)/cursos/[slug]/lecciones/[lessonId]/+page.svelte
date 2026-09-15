<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import FuriganaText from '$lib/components/furigana-text.svelte';
	import LessonContent from '$lib/components/lesson-content.svelte';
	import LessonQuiz from '$lib/components/lesson-quiz.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { VocabularyMetadata } from '$lib/types/note-metadata';
	import { ProgressStatus } from '$lib/types/course';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let completing = $state(false);

	const completed = $derived(data.lesson.status === ProgressStatus.Completed);
	// Only vocabulary notes carry furigana metadata; other types fall back to text.
	const notes = $derived(
		data.lesson.notes.map((note) => ({
			...note,
			metadata: note.metadata as VocabularyMetadata | null
		}))
	);
</script>

<header class="flex items-center justify-between gap-4 border-b px-6 py-3">
	<div class="flex items-center gap-2">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-1 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/cursos" class="text-muted-foreground">Cursos</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link href={`/cursos/${data.lesson.courseSlug}`} class="text-muted-foreground">
						{data.lesson.courseTitle}
					</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{data.lesson.title}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
</header>

<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
	<div class="space-y-2">
		<Button href={`/cursos/${data.lesson.courseSlug}`} variant="ghost" size="sm" class="-ml-2">
			<ArrowLeftIcon data-icon="inline-start" />
			{data.lesson.unitTitle}
		</Button>
		<div class="flex flex-wrap items-center gap-2">
			<h1 class="font-serif text-3xl font-medium">{data.lesson.title}</h1>
			{#if completed}
				<Badge variant="secondary" class="bg-emerald-100 text-emerald-700">Completada</Badge>
			{/if}
		</div>
		{#if data.lesson.description}
			<p class="text-sm text-muted-foreground">{data.lesson.description}</p>
		{/if}
		<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
			{#if notes.length > 0}
				<span>{notes.length} tarjetas</span>
			{/if}
			{#if data.lesson.quiz}
				<span>{data.lesson.quiz.questions.length} preguntas</span>
			{/if}
		</div>
	</div>

	<!-- Lessons without cards still teach through content blocks. -->
	{#if data.lesson.content.length > 0}
		<Card.Root>
			<Card.Content>
				<LessonContent blocks={data.lesson.content} />
			</Card.Content>
		</Card.Root>
	{/if}

	{#if notes.length > 0}
		<div class="grid gap-4">
			{#each notes as note (note.id)}
				<Card.Root>
					<Card.Content class="space-y-4">
						{#if note.metadata}
							<div class="space-y-1">
								<p class="text-3xl font-medium">
									<FuriganaText text={note.metadata.word_furigana} />
								</p>
								<p class="text-sm text-muted-foreground">
									{note.metadata.word_reading} · {note.metadata.word_meaning}
								</p>
							</div>
							{#if note.metadata.word_sentences.length > 0}
								<div class="space-y-2 border-t pt-4">
									{#each note.metadata.word_sentences as sentence, i (i)}
										<div class="space-y-1 rounded-lg bg-muted/50 p-3">
											<p class="text-base"><FuriganaText text={sentence.furigana} /></p>
											<p class="text-sm text-muted-foreground">{sentence.meaning}</p>
										</div>
									{/each}
								</div>
							{/if}
						{:else}
							<div class="space-y-1">
								<p class="text-lg font-medium">{note.question}</p>
								<p class="text-sm text-muted-foreground">{note.answer}</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}

	{#if data.lesson.quiz}
		<LessonQuiz quiz={data.lesson.quiz} result={form?.quiz} />
	{/if}

	{#if data.lesson.content.length === 0 && notes.length === 0 && !data.lesson.quiz}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>Esta lección todavía no tiene contenido</Empty.Title>
				<Empty.Description>
					El material aparecerá aquí en cuanto se añada a la lección.
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{/if}

	<div class="flex flex-wrap items-center justify-between gap-3">
		{#if form?.message}
			<p class="text-xs font-medium text-orange-500">{form.message}</p>
		{/if}
		<form
			method="post"
			action="?/complete"
			use:enhance={() => {
				completing = true;
				return async ({ update }) => {
					completing = false;
					await update();
				};
			}}
		>
			<Button type="submit" disabled={completing || completed}>
				<CheckIcon data-icon="inline-start" />
				{completed ? 'Lección completada' : completing ? 'Guardando…' : 'Marcar como completada'}
			</Button>
		</form>
	</div>
</div>
