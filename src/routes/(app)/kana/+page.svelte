<script lang="ts">
	import { resolve } from '$app/paths';
	import KanaMap from '$lib/components/kana/kana-map.svelte';
	import KanaProgressPanel from '$lib/components/kana/kana-progress-panel.svelte';
	import KanaStrokeViewer from '$lib/components/kana-stroke-viewer.svelte';
	import KanaWritingPad from '$lib/components/kana-writing-pad.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import {
		KANA_ROWS,
		KANA_SCRIPTS,
		allKanaForScript,
		kanaCharacter,
		starterSelection,
		type KanaScript
	} from '$lib/kana/data.js';
	import { KanaMastery, masteryLabel, progressKey } from '$lib/kana/progress.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckCheckIcon from '@lucide/svelte/icons/check-check';
	import Gamepad2Icon from '@lucide/svelte/icons/gamepad-2';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';
	import XIcon from '@lucide/svelte/icons/x';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let script = $state<KanaScript>('hiragana');
	let selectedByScript = $state<Record<KanaScript, string[]>>({
		hiragana: starterSelection('hiragana'),
		katakana: starterSelection('katakana')
	});
	let focusedByScript = $state<Record<KanaScript, string>>({ hiragana: 'あ', katakana: 'ア' });

	const progress = $derived(data.progress);

	const selectedKana = $derived(
		allKanaForScript(script).filter((item) =>
			selectedByScript[script].includes(kanaCharacter(item, script))
		)
	);
	const current = $derived(
		selectedKana.find((item) => kanaCharacter(item, script) === focusedByScript[script]) ??
			selectedKana[0]
	);

	const currentMastery = $derived(
		current
			? (progress[progressKey(script, current.id)]?.mastery ?? KanaMastery.New)
			: KanaMastery.New
	);

	function isSelected(targetScript: KanaScript, character: string) {
		return selectedByScript[targetScript].includes(character);
	}

	function keepValidFocus(targetScript: KanaScript, selection: string[]) {
		if (!selection.includes(focusedByScript[targetScript])) {
			focusedByScript[targetScript] = selection[0] ?? '';
		}
	}

	function toggleKana(targetScript: KanaScript, character: string) {
		const selection = selectedByScript[targetScript];
		if (selection.includes(character)) {
			if (focusedByScript[targetScript] !== character) {
				focusedByScript[targetScript] = character;
				return;
			}

			const nextSelection = selection.filter((item) => item !== character);
			selectedByScript[targetScript] = nextSelection;
			keepValidFocus(targetScript, nextSelection);
			return;
		}

		selectedByScript[targetScript] = [...selection, character];
		focusedByScript[targetScript] = character;
	}

	function toggleRow(targetScript: KanaScript, rowId: string) {
		const row = KANA_ROWS.find((entry) => entry.id === rowId);
		if (!row) return;
		const rowCharacters = row.kana.map((item) => kanaCharacter(item, targetScript));
		const selection = selectedByScript[targetScript];
		const rowSelected = rowCharacters.every((character) => selection.includes(character));
		const nextSelection = rowSelected
			? selection.filter((character) => !rowCharacters.includes(character))
			: [...new Set([...selection, ...rowCharacters])];

		selectedByScript[targetScript] = nextSelection;
		keepValidFocus(targetScript, nextSelection);
	}

	function selectAll(targetScript: KanaScript) {
		const selection = allKanaForScript(targetScript).map((item) =>
			kanaCharacter(item, targetScript)
		);
		selectedByScript[targetScript] = selection;
		keepValidFocus(targetScript, selection);
	}

	function clearSelection(targetScript: KanaScript) {
		selectedByScript[targetScript] = [];
		focusedByScript[targetScript] = '';
	}

	function restoreStarter(targetScript: KanaScript) {
		const selection = starterSelection(targetScript);
		selectedByScript[targetScript] = selection;
		focusedByScript[targetScript] = selection[0];
	}

	function moveFocus(offset: number) {
		if (!current || selectedKana.length < 2) return;
		const currentIndex = selectedKana.findIndex(
			(item) => kanaCharacter(item, script) === kanaCharacter(current, script)
		);
		const nextIndex = (currentIndex + offset + selectedKana.length) % selectedKana.length;
		focusedByScript[script] = kanaCharacter(selectedKana[nextIndex], script);
	}

	function randomFocus() {
		if (!current || selectedKana.length < 2) return;
		const alternatives = selectedKana.filter(
			(item) => kanaCharacter(item, script) !== kanaCharacter(current, script)
		);
		focusedByScript[script] = kanaCharacter(
			alternatives[Math.floor(Math.random() * alternatives.length)],
			script
		);
	}
</script>

{#snippet kanaPanel(targetScript: KanaScript)}
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between gap-3">
			<div class="flex min-w-0 flex-col gap-1">
				<Card.Title>Tabla básica</Card.Title>
				<Card.Description>
					{KANA_SCRIPTS.find((entry) => entry.id === targetScript)?.label}
				</Card.Description>
			</div>
			<Badge variant="secondary">{selectedByScript[targetScript].length} seleccionados</Badge>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" size="sm" onclick={() => selectAll(targetScript)}>
					<CheckCheckIcon data-icon="inline-start" />
					Seleccionar todo
				</Button>
				<Button
					variant="ghost"
					size="sm"
					disabled={selectedByScript[targetScript].length === 0}
					onclick={() => clearSelection(targetScript)}
				>
					<XIcon data-icon="inline-start" />
					Limpiar
				</Button>
			</div>

			<div class="flex flex-col gap-3">
				{#each KANA_ROWS as row (row.id)}
					{@const rowCharacters = row.kana.map((item) => kanaCharacter(item, targetScript))}
					{@const rowSelected = rowCharacters.every((character) =>
						isSelected(targetScript, character)
					)}
					<div class="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-2">
						<Button
							variant={rowSelected ? 'secondary' : 'outline'}
							class="h-16 w-full px-1 text-xs whitespace-normal"
							aria-label={`${rowSelected ? 'Quitar' : 'Seleccionar'} fila ${row.label}`}
							aria-pressed={rowSelected}
							onclick={() => toggleRow(targetScript, row.id)}
						>
							{row.label}
						</Button>
						<div class="grid grid-cols-5 gap-2">
							{#each row.kana as item (item.id)}
								{@const character = kanaCharacter(item, targetScript)}
								{@const selected = isSelected(targetScript, character)}
								{@const mastery =
									progress[progressKey(targetScript, item.id)]?.mastery ?? KanaMastery.New}
								<Button
									variant={selected ? 'secondary' : 'outline'}
									class="h-16 min-w-0 flex-col gap-0 px-1 data-[current=true]:ring-2 data-[current=true]:ring-primary"
									data-current={selected && focusedByScript[targetScript] === character}
									aria-label={`${selected && focusedByScript[targetScript] !== character ? 'Enfocar' : selected ? 'Quitar' : 'Seleccionar'} ${character}, ${item.romaji}, ${masteryLabel(mastery)}`}
									aria-pressed={selected}
									onclick={() => toggleKana(targetScript, character)}
								>
									<span class="text-xl leading-none">{character}</span>
									<span class="text-xs text-muted-foreground">{item.romaji}</span>
									{#if mastery !== KanaMastery.New}
										<span
											class="mt-0.5 size-1.5 rounded-full {mastery === KanaMastery.Mastered
												? 'bg-primary'
												: 'bg-amber-400'}"
											aria-hidden="true"
										></span>
									{/if}
								</Button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
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
					<Breadcrumb.Link href={resolve('/')} class="text-muted-foreground">
						Espacio de estudio
					</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>Kana</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</header>

	<main class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-normal">Kana</h1>
				<p class="text-sm text-muted-foreground">Silabarios básicos</p>
			</div>
			<div class="flex items-center gap-2">
				<Badge variant="outline">{selectedKana.length} de 46</Badge>
				<Button href={resolve('/kana/practica')}>
					<Gamepad2Icon data-icon="inline-start" />
					Ir a práctica
				</Button>
			</div>
		</div>

		<div class="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<Tabs.Root bind:value={script} class="min-w-0">
				<Tabs.List class="mb-2 grid w-full grid-cols-2 sm:w-80">
					{#each KANA_SCRIPTS as entry (entry.id)}
						<Tabs.Trigger value={entry.id}>{entry.label}</Tabs.Trigger>
					{/each}
				</Tabs.List>
				{#each KANA_SCRIPTS as entry (entry.id)}
					<Tabs.Content value={entry.id}>{@render kanaPanel(entry.id)}</Tabs.Content>
				{/each}
			</Tabs.Root>

			<div class="flex flex-col gap-6 lg:sticky lg:top-6">
				<Card.Root>
					{#if current}
						<Card.Header class="items-center text-center">
							<Badge variant="secondary">
								{KANA_SCRIPTS.find((entry) => entry.id === script)?.label}
							</Badge>
							<Card.Title class="text-6xl leading-none">
								{kanaCharacter(current, script)}
							</Card.Title>
							<Card.Description class="text-base">{current.romaji}</Card.Description>
							<Badge variant="outline">{masteryLabel(currentMastery)}</Badge>
						</Card.Header>
						<Card.Content class="mx-auto w-full max-w-72">
							<Tabs.Root value="strokes">
								<Tabs.List class="grid w-full grid-cols-2">
									<Tabs.Trigger value="strokes">Ver trazos</Tabs.Trigger>
									<Tabs.Trigger value="practice">Practicar</Tabs.Trigger>
								</Tabs.List>
								<Tabs.Content value="strokes">
									{#key kanaCharacter(current, script)}
										<KanaStrokeViewer character={kanaCharacter(current, script)} />
									{/key}
								</Tabs.Content>
								<Tabs.Content value="practice">
									{#key kanaCharacter(current, script)}
										<KanaWritingPad character={kanaCharacter(current, script)} />
									{/key}
								</Tabs.Content>
							</Tabs.Root>
						</Card.Content>
						<Card.Footer class="grid grid-cols-3 gap-2">
							<Button
								variant="outline"
								size="icon-lg"
								class="w-full"
								disabled={selectedKana.length < 2}
								aria-label="Kana anterior"
								onclick={() => moveFocus(-1)}
							>
								<ArrowLeftIcon />
							</Button>
							<Button
								variant="outline"
								size="icon-lg"
								class="w-full"
								disabled={selectedKana.length < 2}
								aria-label="Kana aleatorio"
								onclick={randomFocus}
							>
								<ShuffleIcon />
							</Button>
							<Button
								variant="outline"
								size="icon-lg"
								class="w-full"
								disabled={selectedKana.length < 2}
								aria-label="Kana siguiente"
								onclick={() => moveFocus(1)}
							>
								<ArrowRightIcon />
							</Button>
						</Card.Footer>
					{:else}
						<Card.Content class="flex min-h-96 items-center pt-6">
							<Empty.Root>
								<Empty.Header>
									<Empty.Media variant="icon"><LanguagesIcon /></Empty.Media>
									<Empty.Title>Sin kana seleccionados</Empty.Title>
									<Empty.Description>La selección está vacía.</Empty.Description>
								</Empty.Header>
								<Empty.Content>
									<Button onclick={() => restoreStarter(script)}>Seleccionar vocales</Button>
								</Empty.Content>
							</Empty.Root>
						</Card.Content>
					{/if}
				</Card.Root>

				<KanaProgressPanel {progress} />
			</div>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Mapa de dominio</Card.Title>
				<Card.Description>Estado de cada kana según tus aciertos en la práctica.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Tabs.Root value={script}>
					<Tabs.List class="mb-4 grid w-full grid-cols-2 sm:w-80">
						{#each KANA_SCRIPTS as entry (entry.id)}
							<Tabs.Trigger value={entry.id}>{entry.label}</Tabs.Trigger>
						{/each}
					</Tabs.List>
					{#each KANA_SCRIPTS as entry (entry.id)}
						<Tabs.Content value={entry.id}>
							<KanaMap script={entry.id} {progress} />
						</Tabs.Content>
					{/each}
				</Tabs.Root>
			</Card.Content>
		</Card.Root>
	</main>
</div>
