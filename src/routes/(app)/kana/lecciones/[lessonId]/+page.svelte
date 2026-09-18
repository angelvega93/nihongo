<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import KanaLessonPlayer from '$lib/components/kana/kana-lesson-player.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Local override so the badge updates immediately after completing. */
	let completedOverride = $state<boolean | null>(null);
	const completed = $derived(completedOverride ?? data.completed);
	let saving = $state(false);

	/** Attempts are buffered and flushed in batches to avoid a request per answer. */
	let pending: { script: string; kanaId: string; correct: boolean }[] = [];
	let flushTimer: ReturnType<typeof setTimeout> | undefined;

	function flush() {
		if (flushTimer !== undefined) {
			clearTimeout(flushTimer);
			flushTimer = undefined;
		}
		if (pending.length === 0) return;

		const batch = pending;
		pending = [];

		const body = new FormData();
		body.set('attempts', JSON.stringify(batch));
		void fetch('?/recordAttempts', { method: 'POST', body }).catch(() => {
			// Offline or transient failure: the lesson stays usable.
		});
	}

	function handleAttempt(kanaId: string, correct: boolean) {
		if (!data.lesson.script) return;
		pending.push({ script: data.lesson.script, kanaId, correct });
		if (flushTimer !== undefined) clearTimeout(flushTimer);
		flushTimer = setTimeout(flush, 600);
	}

	async function handleComplete() {
		flush();
		saving = true;
		const body = new FormData();
		try {
			await fetch('?/completeLesson', { method: 'POST', body });
			completedOverride = true;
		} catch {
			// Keep the lesson open so the user can retry.
		} finally {
			saving = false;
		}
		await goto(resolve('/kana/lecciones'));
	}
</script>

<svelte:head><title>{data.lesson.title}</title></svelte:head>

<header class="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-1 h-4" />
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href={resolve('/kana')} class="text-muted-foreground">Kana</Breadcrumb.Link
				>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Link href={resolve('/kana/lecciones')} class="text-muted-foreground">
					Lecciones
				</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item><Breadcrumb.Page>{data.lesson.title}</Breadcrumb.Page></Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
</header>

<main class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<div class="space-y-2">
		<Button href={resolve('/kana/lecciones')} variant="ghost" size="sm" class="-ml-2">
			<ArrowLeftIcon data-icon="inline-start" />
			Todas las lecciones
		</Button>
		<div class="flex flex-wrap items-center gap-2">
			<h1 class="font-serif text-3xl font-medium">{data.lesson.title}</h1>
			<Badge variant="outline">Lección {data.index} de {data.total}</Badge>
		</div>
		<p class="text-sm text-muted-foreground">{data.lesson.description}</p>
	</div>

	<KanaLessonPlayer
		lesson={data.lesson}
		{completed}
		onattempt={handleAttempt}
		oncomplete={handleComplete}
	/>

	{#if saving}
		<p class="text-xs text-muted-foreground">Guardando…</p>
	{/if}
</main>
