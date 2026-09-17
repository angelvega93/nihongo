<script lang="ts">
	import { resolve } from '$app/paths';
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
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckCheckIcon from '@lucide/svelte/icons/check-check';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';
	import XIcon from '@lucide/svelte/icons/x';

	type Script = 'hiragana' | 'katakana';
	type Kana = { character: string; romaji: string };
	type KanaRow = { id: string; label: string; kana: Kana[] };
	type ScriptData = { label: string; rows: KanaRow[] };

	const scripts: Record<Script, ScriptData> = {
		hiragana: {
			label: 'Hiragana',
			rows: [
				{ id: 'vowels', label: 'Vocales', kana: kana('あ a,い i,う u,え e,お o') },
				{ id: 'k', label: 'K', kana: kana('か ka,き ki,く ku,け ke,こ ko') },
				{ id: 's', label: 'S', kana: kana('さ sa,し shi,す su,せ se,そ so') },
				{ id: 't', label: 'T', kana: kana('た ta,ち chi,つ tsu,て te,と to') },
				{ id: 'n', label: 'N', kana: kana('な na,に ni,ぬ nu,ね ne,の no') },
				{ id: 'h', label: 'H', kana: kana('は ha,ひ hi,ふ fu,へ he,ほ ho') },
				{ id: 'm', label: 'M', kana: kana('ま ma,み mi,む mu,め me,も mo') },
				{ id: 'y', label: 'Y', kana: kana('や ya,ゆ yu,よ yo') },
				{ id: 'r', label: 'R', kana: kana('ら ra,り ri,る ru,れ re,ろ ro') },
				{ id: 'w', label: 'W', kana: kana('わ wa,を wo') },
				{ id: 'final-n', label: 'N final', kana: kana('ん n') }
			]
		},
		katakana: {
			label: 'Katakana',
			rows: [
				{ id: 'vowels', label: 'Vocales', kana: kana('ア a,イ i,ウ u,エ e,オ o') },
				{ id: 'k', label: 'K', kana: kana('カ ka,キ ki,ク ku,ケ ke,コ ko') },
				{ id: 's', label: 'S', kana: kana('サ sa,シ shi,ス su,セ se,ソ so') },
				{ id: 't', label: 'T', kana: kana('タ ta,チ chi,ツ tsu,テ te,ト to') },
				{ id: 'n', label: 'N', kana: kana('ナ na,ニ ni,ヌ nu,ネ ne,ノ no') },
				{ id: 'h', label: 'H', kana: kana('ハ ha,ヒ hi,フ fu,ヘ he,ホ ho') },
				{ id: 'm', label: 'M', kana: kana('マ ma,ミ mi,ム mu,メ me,モ mo') },
				{ id: 'y', label: 'Y', kana: kana('ヤ ya,ユ yu,ヨ yo') },
				{ id: 'r', label: 'R', kana: kana('ラ ra,リ ri,ル ru,レ re,ロ ro') },
				{ id: 'w', label: 'W', kana: kana('ワ wa,ヲ wo') },
				{ id: 'final-n', label: 'N final', kana: kana('ン n') }
			]
		}
	};

	function kana(values: string): Kana[] {
		return values.split(',').map((value) => {
			const [character, romaji] = value.split(' ');
			return { character, romaji };
		});
	}

	const allKana = (targetScript: Script) => scripts[targetScript].rows.flatMap((row) => row.kana);
	const starterSelection = (targetScript: Script) =>
		scripts[targetScript].rows[0].kana.map((item) => item.character);

	let script = $state<Script>('hiragana');
	let selectedByScript = $state<Record<Script, string[]>>({
		hiragana: starterSelection('hiragana'),
		katakana: starterSelection('katakana')
	});
	let focusedByScript = $state<Record<Script, string>>({ hiragana: 'あ', katakana: 'ア' });

	const selectedKana = $derived(
		allKana(script).filter((item) => selectedByScript[script].includes(item.character))
	);
	const current = $derived(
		selectedKana.find((item) => item.character === focusedByScript[script]) ?? selectedKana[0]
	);

	function isSelected(targetScript: Script, character: string) {
		return selectedByScript[targetScript].includes(character);
	}

	function keepValidFocus(targetScript: Script, selection: string[]) {
		if (!selection.includes(focusedByScript[targetScript])) {
			focusedByScript[targetScript] = selection[0] ?? '';
		}
	}

	function toggleKana(targetScript: Script, item: Kana) {
		const selection = selectedByScript[targetScript];
		if (selection.includes(item.character)) {
			if (focusedByScript[targetScript] !== item.character) {
				focusedByScript[targetScript] = item.character;
				return;
			}

			const nextSelection = selection.filter((character) => character !== item.character);
			selectedByScript[targetScript] = nextSelection;
			keepValidFocus(targetScript, nextSelection);
			return;
		}

		selectedByScript[targetScript] = [...selection, item.character];
		focusedByScript[targetScript] = item.character;
	}

	function toggleRow(targetScript: Script, row: KanaRow) {
		const rowCharacters = row.kana.map((item) => item.character);
		const selection = selectedByScript[targetScript];
		const rowSelected = rowCharacters.every((character) => selection.includes(character));
		const nextSelection = rowSelected
			? selection.filter((character) => !rowCharacters.includes(character))
			: [...new Set([...selection, ...rowCharacters])];

		selectedByScript[targetScript] = nextSelection;
		keepValidFocus(targetScript, nextSelection);
	}

	function selectAll(targetScript: Script) {
		const selection = allKana(targetScript).map((item) => item.character);
		selectedByScript[targetScript] = selection;
		keepValidFocus(targetScript, selection);
	}

	function clearSelection(targetScript: Script) {
		selectedByScript[targetScript] = [];
		focusedByScript[targetScript] = '';
	}

	function restoreStarter(targetScript: Script) {
		const selection = starterSelection(targetScript);
		selectedByScript[targetScript] = selection;
		focusedByScript[targetScript] = selection[0];
	}

	function moveFocus(offset: number) {
		if (!current || selectedKana.length < 2) return;
		const currentIndex = selectedKana.findIndex((item) => item.character === current.character);
		const nextIndex = (currentIndex + offset + selectedKana.length) % selectedKana.length;
		focusedByScript[script] = selectedKana[nextIndex].character;
	}

	function randomFocus() {
		if (!current || selectedKana.length < 2) return;
		const alternatives = selectedKana.filter((item) => item.character !== current.character);
		focusedByScript[script] = alternatives[Math.floor(Math.random() * alternatives.length)].character;
	}
</script>

{#snippet kanaPanel(targetScript: Script)}
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between gap-3">
			<div class="flex min-w-0 flex-col gap-1">
				<Card.Title>Tabla básica</Card.Title>
				<Card.Description>{scripts[targetScript].label}</Card.Description>
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
				{#each scripts[targetScript].rows as row (row.id)}
					{@const rowSelected = row.kana.every((item) => isSelected(targetScript, item.character))}
					<div class="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-2">
						<Button
							variant={rowSelected ? 'secondary' : 'outline'}
							class="h-16 w-full px-1 text-xs whitespace-normal"
							aria-label={`${rowSelected ? 'Quitar' : 'Seleccionar'} fila ${row.label}`}
							aria-pressed={rowSelected}
							onclick={() => toggleRow(targetScript, row)}
						>
							{row.label}
						</Button>
						<div class="grid grid-cols-5 gap-2">
							{#each row.kana as item (item.character)}
								{@const selected = isSelected(targetScript, item.character)}
								<Button
									variant={selected ? 'secondary' : 'outline'}
									class="h-16 min-w-0 flex-col gap-0 px-1 data-[current=true]:ring-2 data-[current=true]:ring-primary"
									data-current={selected && focusedByScript[targetScript] === item.character}
									aria-label={`${selected && focusedByScript[targetScript] !== item.character ? 'Enfocar' : selected ? 'Quitar' : 'Seleccionar'} ${item.character}, ${item.romaji}`}
									aria-pressed={selected}
									onclick={() => toggleKana(targetScript, item)}
								>
									<span class="text-xl leading-none">{item.character}</span>
									<span class="text-xs text-muted-foreground">{item.romaji}</span>
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
			<Badge variant="outline">{selectedKana.length} de 46</Badge>
		</div>

		<div class="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<Tabs.Root bind:value={script} class="min-w-0">
				<Tabs.List class="mb-2 grid w-full grid-cols-2 sm:w-80">
					<Tabs.Trigger value="hiragana">Hiragana</Tabs.Trigger>
					<Tabs.Trigger value="katakana">Katakana</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="hiragana">{@render kanaPanel('hiragana')}</Tabs.Content>
				<Tabs.Content value="katakana">{@render kanaPanel('katakana')}</Tabs.Content>
			</Tabs.Root>

			<Card.Root class="lg:sticky lg:top-6">
				{#if current}
					<Card.Header class="items-center text-center">
						<Badge variant="secondary">{scripts[script].label}</Badge>
						<Card.Title class="text-6xl leading-none">{current.character}</Card.Title>
						<Card.Description class="text-base">{current.romaji}</Card.Description>
					</Card.Header>
					<Card.Content class="mx-auto w-full max-w-72">
						<Tabs.Root value="strokes">
							<Tabs.List class="grid w-full grid-cols-2">
								<Tabs.Trigger value="strokes">Ver trazos</Tabs.Trigger>
								<Tabs.Trigger value="practice">Practicar</Tabs.Trigger>
							</Tabs.List>
							<Tabs.Content value="strokes">
								{#key current.character}
									<KanaStrokeViewer character={current.character} />
								{/key}
							</Tabs.Content>
							<Tabs.Content value="practice">
								{#key current.character}
									<KanaWritingPad character={current.character} />
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
		</div>
	</main>
</div>