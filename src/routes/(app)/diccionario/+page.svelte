<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Kbd } from '$lib/components/ui/kbd/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import KanjiDetail from '$lib/components/dictionary/kanji-detail.svelte';
	import KanjiListItem from '$lib/components/dictionary/kanji-list-item.svelte';
	import SentenceDetail from '$lib/components/dictionary/sentence-detail.svelte';
	import SentenceListItem from '$lib/components/dictionary/sentence-list-item.svelte';
	import TermDetail from '$lib/components/dictionary/term-detail.svelte';
	import TermListItem from '$lib/components/dictionary/term-list-item.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Tab = 'term' | 'kanji' | 'sentence';

	const tabs: { value: Tab; label: string; placeholder: string }[] = [
		{ value: 'term', label: 'Palabras', placeholder: '食べる, たべる, comer…' },
		{ value: 'kanji', label: 'Kanji', placeholder: '食, たべる, eat…' },
		{ value: 'sentence', label: 'Oraciones', placeholder: '教育, education…' }
	];

	/** Search modes per tab, mirroring the ones the server accepts. */
	const modes: Record<Tab, { value: string; label: string; hint: string }[]> = {
		term: [
			{ value: 'auto', label: 'Todo', hint: 'Escritura, lectura y significado' },
			{ value: 'japanese', label: 'Japonés', hint: 'Solo escritura y lectura' },
			{ value: 'gloss', label: 'Significado', hint: 'Solo glosas en español e inglés' }
		],
		kanji: [
			{ value: 'auto', label: 'Todo', hint: 'Carácter, lectura y significado' },
			{ value: 'character', label: 'Carácter', hint: 'Coincidencia exacta del kanji' },
			{ value: 'reading', label: 'Lectura', hint: 'On’yomi y kun’yomi exactos' },
			{ value: 'meaning', label: 'Significado', hint: 'Solo significados' }
		],
		sentence: [
			{ value: 'auto', label: 'Todo', hint: 'Texto japonés y traducciones' },
			{ value: 'japanese', label: 'Japonés', hint: 'Subcadena dentro de la oración' },
			{ value: 'translation', label: 'Traducción', hint: 'Solo español e inglés' }
		]
	};

	const activeTab = $derived((data.tab ?? 'term') as Tab);
	const placeholder = $derived(
		tabs.find((tab) => tab.value === activeTab)?.placeholder ?? 'Buscar…'
	);
	const activeModes = $derived(modes[activeTab]);

	/** True once a query has actually been run, as opposed to the landing view. */
	const hasSearched = $derived(data.result !== null);
	const result = $derived(data.result);

	/**
	 * Everything the template needs about the current tab, narrowed per kind.
	 * Building one object here keeps the template free of casts: each branch of
	 * the markup sees rows, detail and examples with their real types.
	 */
	const view = $derived.by(() => {
		if (!result) {
			return {
				kind: 'empty' as const,
				rows: [] as never[],
				detail: null,
				examples: [] as never[]
			};
		}

		if (result.kind === 'term') {
			const detail = result.detail;
			return {
				kind: 'term' as const,
				rows: result.page.rows,
				detail,
				examples: detail ? (result.examples[detail.headword] ?? []) : []
			};
		}

		if (result.kind === 'kanji') {
			const detail = result.detail;
			return {
				kind: 'kanji' as const,
				rows: result.page.rows,
				detail,
				examples: detail ? (result.examples[detail.char] ?? []) : []
			};
		}

		return {
			kind: 'sentence' as const,
			rows: result.page.rows,
			detail: result.detail,
			examples: [] as never[]
		};
	});

	/** Narrowed row lists, so each branch of the template sees its own type. */
	const termRows = $derived(view.kind === 'term' ? view.rows : []);
	const kanjiRows = $derived(view.kind === 'kanji' ? view.rows : []);
	const sentenceRows = $derived(view.kind === 'sentence' ? view.rows : []);
	const total = $derived(result?.page.total ?? 0);
	const pageCount = $derived(result?.page.pageCount ?? 0);
	const resultCount = $derived(termRows.length + kanjiRows.length + sentenceRows.length);

	/** The browse list has no exact count, so it pages while a full page comes back. */
	const commonPage = $derived(data.common?.page ?? 1);
	const hasMoreCommon = $derived((data.common?.rows.length ?? 0) === (data.common?.pageSize ?? 0));

	const pageSize = $derived(result?.page.pageSize ?? 0);
	const rangeStart = $derived(total === 0 ? 0 : (data.page - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(data.page * pageSize, total));

	/**
	 * Builds a URL for the current search with some values replaced. Omitting a
	 * value removes it from the query string, so defaults stay out of the URL.
	 */
	function buildUrl(overrides: Partial<Record<'q' | 'tipo' | 'modo' | 'pagina' | 'sel', string>>) {
		const url = new URL(page.url);
		const current = {
			q: data.query,
			tipo: activeTab,
			modo: data.mode,
			pagina: String(data.page),
			// The selection is per-page state, so any other change clears it.
			sel: ''
		};

		for (const [key, value] of Object.entries({ ...current, ...overrides })) {
			const isDefault =
				(key === 'tipo' && value === 'term') ||
				(key === 'modo' && value === 'auto') ||
				(key === 'pagina' && value === '1') ||
				value === '';

			if (isDefault) url.searchParams.delete(key);
			else url.searchParams.set(key, value);
		}

		return url.pathname + url.search;
	}

	/**
	 * Runs the current query, resetting to the first page. The input is read from
	 * the form itself, so it stays uncontrolled and typing never fights the
	 * navigation that follows a submit.
	 */
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const typed = String(
			new FormData(event.currentTarget as HTMLFormElement).get('q') ?? ''
		).trim();
		goto(buildUrl({ q: typed, pagina: '1' }), { keepFocus: true, noScroll: true });
	}

	/** Switches tab, keeping the query but resetting the mode and page. */
	function selectTab(tab: Tab) {
		goto(buildUrl({ tipo: tab, modo: 'auto', pagina: '1' }), { noScroll: true });
	}

	/** Switches the search mode, resetting to the first page. */
	function selectMode(mode: string) {
		goto(buildUrl({ modo: mode, pagina: '1' }), { noScroll: true });
	}

	/** Clears the search and returns to the browse view. */
	function clearQuery() {
		goto(buildUrl({ q: '', pagina: '1' }), { keepFocus: true, noScroll: true });
	}

	/** Focus the search box when `/` is pressed, unless already typing. */
	function focusSearch(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		const typing =
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target?.isContentEditable;

		if (event.key === '/' && !typing) {
			event.preventDefault();
			document.querySelector<HTMLInputElement>('#dictionary-search')?.focus();
		}
	}
</script>

<svelte:window onkeydown={focusSearch} />

<div class="flex flex-1 flex-col">
	<header class="flex items-center gap-3 border-b px-6 py-3">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-1 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href={resolve('/')} class="text-muted-foreground">
						Learning space
					</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>Diccionario</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</header>

	<form onsubmit={submit} class="flex flex-col gap-3 border-b px-6 py-4">
		<div class="relative">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				id="dictionary-search"
				name="q"
				value={data.query}
				{placeholder}
				aria-label="Buscar en el diccionario"
				autocomplete="off"
				class="h-11 rounded-xl pr-28 pl-10 text-base"
			/>
			<div class="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-3">
				{#if data.query}
					<button
						type="button"
						onclick={clearQuery}
						aria-label="Limpiar búsqueda"
						class="text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						✕
					</button>
				{:else}
					<span class="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
						<Kbd>/</Kbd>
					</span>
				{/if}
				<Button type="submit" size="sm" class="rounded-lg px-4">Buscar</Button>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-1">
			{#each tabs as tab (tab.value)}
				<Button
					variant={activeTab === tab.value ? 'secondary' : 'ghost'}
					size="sm"
					type="button"
					class="rounded-full"
					onclick={() => selectTab(tab.value)}
				>
					{tab.label}
				</Button>
			{/each}

			<Separator orientation="vertical" class="mx-1.5 h-4" />

			{#each activeModes as mode (mode.value)}
				<Button
					variant={data.mode === mode.value ? 'secondary' : 'ghost'}
					size="sm"
					type="button"
					title={mode.hint}
					class="rounded-full text-muted-foreground"
					onclick={() => selectMode(mode.value)}
				>
					{mode.label}
				</Button>
			{/each}
		</div>
	</form>

	<div class="flex flex-1 flex-col gap-6 p-6">
		{#if !hasSearched}
			<section class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<SparklesIcon class="size-4 text-primary" />
					<h1 class="font-serif text-xl font-medium">Palabras más frecuentes</h1>
				</div>
				<p class="text-sm text-muted-foreground">
					{data.counts?.terms.toLocaleString('es') ?? '961.493'} palabras,
					{data.counts?.kanji.toLocaleString('es') ?? '13.108'} kanji y
					{data.counts?.sentences.toLocaleString('es') ?? '48.497'} oraciones de ejemplo.
				</p>

				<div class="grid gap-1 lg:grid-cols-2 xl:grid-cols-3">
					{#each data.common?.rows ?? [] as term, index (term.id)}
						<!-- Browsing is not a search, so a word links to its own results. -->
						<TermListItem
							{term}
							position={index + 1}
							href={buildUrl({ q: term.headword, pagina: '1' })}
						/>
					{/each}
				</div>

				<nav
					class="flex items-center justify-center gap-2"
					aria-label="Paginación de palabras frecuentes"
				>
					<Button
						variant="outline"
						size="sm"
						disabled={commonPage <= 1}
						href={commonPage <= 1 ? undefined : buildUrl({ pagina: String(commonPage - 1) })}
					>
						<ArrowLeftIcon data-icon="inline-start" />
						Anterior
					</Button>
					<span class="px-2 text-sm text-muted-foreground tabular-nums">Página {commonPage}</span>
					<Button
						variant="outline"
						size="sm"
						disabled={!hasMoreCommon}
						href={hasMoreCommon ? buildUrl({ pagina: String(commonPage + 1) }) : undefined}
					>
						Ver más
						<ArrowRightIcon data-icon="inline-end" />
					</Button>
				</nav>

				<div class="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
					<BookOpenIcon class="size-3.5 shrink-0" />
					<p>
						Fuente: JMdict, KANJIDIC y Tatoeba, con traducciones al español. Los significados se
						muestran primero en español.
					</p>
				</div>
			</section>
		{:else if resultCount === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<SearchXIcon />
					</Empty.Media>
					<Empty.Title>Sin resultados para «{data.query}»</Empty.Title>
					<Empty.Description>
						Prueba con otra escritura o cambia el modo de búsqueda. Los significados funcionan mejor
						en español o inglés.
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			<!-- Master list on the left, detail pane on the right. Both scroll
			     independently so long entries never push the list out of view. -->
			<div class="flex flex-1 flex-col gap-5 lg:flex-row lg:items-start">
				<div class="flex w-full flex-col gap-3 lg:w-[22rem] lg:shrink-0">
					<div class="flex items-baseline justify-between gap-2">
						<p class="text-sm font-semibold">
							{total.toLocaleString('es')}
							{total === 1 ? 'resultado' : 'resultados'}
						</p>
						{#if pageCount > 1}
							<span class="text-xs text-muted-foreground tabular-nums">
								{rangeStart}–{rangeEnd}
							</span>
						{/if}
					</div>

					<div class="flex flex-col gap-1 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto lg:pr-1">
						{#if view.kind === 'kanji'}
							{#each kanjiRows as kanji, index (kanji.id)}
								<KanjiListItem
									{kanji}
									position={index + 1}
									href={buildUrl({ sel: kanji.id })}
									active={view.detail?.id === kanji.id}
								/>
							{/each}
						{:else if view.kind === 'sentence'}
							{#each sentenceRows as sentence, index (sentence.id)}
								<SentenceListItem
									{sentence}
									position={index + 1}
									href={buildUrl({ sel: sentence.id })}
									active={view.detail?.id === sentence.id}
								/>
							{/each}
						{:else}
							{#each termRows as term, index (term.id)}
								<TermListItem
									{term}
									position={index + 1}
									href={buildUrl({ sel: term.id })}
									active={view.detail?.id === term.id}
								/>
							{/each}
						{/if}
					</div>
					{#if pageCount > 1}
						<nav class="flex items-center justify-between gap-2" aria-label="Paginación">
							<Button
								variant="outline"
								size="sm"
								disabled={data.page <= 1}
								href={data.page <= 1 ? undefined : buildUrl({ pagina: String(data.page - 1) })}
							>
								<ArrowLeftIcon data-icon="inline-start" />
								Anterior
							</Button>
							<span class="text-xs text-muted-foreground tabular-nums">
								{data.page} / {pageCount}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={data.page >= pageCount}
								href={data.page >= pageCount
									? undefined
									: buildUrl({ pagina: String(data.page + 1) })}
							>
								Siguiente
								<ArrowRightIcon data-icon="inline-end" />
							</Button>
						</nav>
					{/if}
				</div>

				{#if view.kind !== 'empty' && view.detail}
					<div class="min-w-0 flex-1">
						{#if view.kind === 'kanji'}
							<KanjiDetail kanji={view.detail} examples={view.examples} />
						{:else if view.kind === 'sentence'}
							<SentenceDetail sentence={view.detail} />
						{:else}
							<TermDetail term={view.detail} examples={view.examples} />
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
