<script lang="ts">
	import { resolve } from '$app/paths';
	import KanaPracticeModes from '$lib/components/kana/kana-practice-modes.svelte';
	import KanaSelectionDialog from '$lib/components/kana/kana-selection-dialog.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { getKanaAvailability } from '$lib/kana/availability.remote.js';
	import { countAvailableWords, countEnabledKana } from '$lib/kana/practice.js';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Shared with the selection dialog: changes are reflected immediately. */
	const availability = getKanaAvailability();
	const enabled = $derived(availability.current?.enabled ?? data.enabled);

	const kanaCount = $derived(countEnabledKana(enabled));
	const wordCount = $derived(countAvailableWords(enabled));

	let selectionOpen = $state(false);
</script>

<svelte:head><title>Práctica de kana</title></svelte:head>

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
				<Breadcrumb.Item><Breadcrumb.Page>Práctica</Breadcrumb.Page></Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</header>

	<main class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-normal">Práctica de kana</h1>
				<p class="text-sm text-muted-foreground">
					Elige un modo para entrenar. Cada modo mezcla hiragana y katakana.
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant="outline">{kanaCount} kana activos</Badge>
				<Badge variant="outline">{wordCount} palabras disponibles</Badge>
				<Button variant="outline" size="sm" onclick={() => (selectionOpen = true)}>
					<Settings2Icon data-icon="inline-start" />
					Gestionar kana
				</Button>
			</div>
		</div>

		<KanaPracticeModes {kanaCount} {wordCount} />

		<div class="flex flex-wrap items-center gap-2 border-t pt-4">
			<Button href={resolve('/kana/lecciones')} variant="outline" size="sm">
				<BookOpenIcon data-icon="inline-start" />
				Ir a lecciones
			</Button>
		</div>
	</main>
</div>

<KanaSelectionDialog bind:open={selectionOpen} />
