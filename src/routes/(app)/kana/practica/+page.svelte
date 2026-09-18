<script lang="ts">
	import { resolve } from '$app/paths';
	import KanaWritingPad from '$lib/components/kana-writing-pad.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import {
		BASIC_KANA,
		VOCABULARY,
		kanaCharacter,
		pickNext,
		shuffle,
		uniqueOptions,
		wordForScript,
		type Kana,
		type KanaScript,
		type VocabularyWord
	} from '$lib/kana/data.js';
	import { cn } from '$lib/utils.js';
	import BlocksIcon from '@lucide/svelte/icons/blocks';
	import CircleHelpIcon from '@lucide/svelte/icons/circle-help';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
	import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';
	import VolumeXIcon from '@lucide/svelte/icons/volume-x';

	type Mode = 'quiz' | 'listen' | 'draw' | 'word-choice' | 'pairs' | 'writing' | 'formation';
	type Feedback = { kind: 'correct' | 'wrong' | 'info'; text: string };
	type PairTile = { id: string; label: string };
	type FormationTile = { id: string; character: string };

	const QUIZ_SECONDS = 10;
	const MODES = [
		{ id: 'quiz', label: 'Prueba', icon: CircleHelpIcon },
		{ id: 'listen', label: 'Escucha', icon: HeadphonesIcon },
		{ id: 'draw', label: 'Dibujar', icon: PencilLineIcon },
		{ id: 'word-choice', label: 'Selección de palabra', icon: ListChecksIcon },
		{ id: 'pairs', label: 'Emparejar pares', icon: ShuffleIcon },
		{ id: 'writing', label: 'Escritura', icon: KeyboardIcon },
		{ id: 'formation', label: 'Formación de palabra', icon: BlocksIcon }
	] as const;

	let mode = $state<Mode>('quiz');
	let script = $state<KanaScript>('hiragana');
	let correct = $state(0);
	let attempted = $state(0);
	let streak = $state(0);
	let feedback = $state<Feedback | null>(null);

	let quizTarget = $state<Kana>(BASIC_KANA[0]);
	let quizOptions = $state<Kana[]>(BASIC_KANA.slice(0, 4));
	let quizPrompt = $state<'kana' | 'romaji'>('kana');
	let quizLocked = $state(false);
	let quizSerial = $state(0);
	let remaining = $state(QUIZ_SECONDS);

	let listenTarget = $state<Kana>(BASIC_KANA[0]);
	let listenOptions = $state<Kana[]>(BASIC_KANA.slice(0, 4));
	let listenLocked = $state(false);

	let drawTarget = $state<Kana>(BASIC_KANA[0]);
	let drawComplete = $state(false);

	let wordTarget = $state<VocabularyWord>(VOCABULARY[0]);
	let wordOptions = $state<VocabularyWord[]>(VOCABULARY.slice(0, 4));
	let wordLocked = $state(false);

	let pairKana = $state<PairTile[]>([]);
	let pairRomaji = $state<PairTile[]>([]);
	let selectedPairKana = $state<string | null>(null);
	let selectedPairRomaji = $state<string | null>(null);
	let matchedPairs = $state<Set<string>>(new Set());

	let writingTarget = $state<Kana>(BASIC_KANA[0]);
	let writingAnswer = $state('');
	let writingLocked = $state(false);

	let formationTarget = $state<VocabularyWord>(VOCABULARY[0]);
	let formationTiles = $state<FormationTile[]>([]);
	let selectedFormationIds = $state<string[]>([]);
	let formationLocked = $state(false);

	const modeLabel = $derived(MODES.find((entry) => entry.id === mode)?.label ?? 'Práctica');
	const accuracy = $derived(attempted === 0 ? 0 : Math.round((correct / attempted) * 100));
	const selectedFormationTiles = $derived(
		selectedFormationIds.flatMap((id) => formationTiles.filter((tile) => tile.id === id))
	);

	$effect(() => {
		quizSerial;
		if (mode !== 'quiz' || quizLocked) return;

		remaining = QUIZ_SECONDS;
		const timer = window.setInterval(() => {
			if (remaining <= 1) {
				window.clearInterval(timer);
				remaining = 0;
				finishQuizTimeout();
				return;
			}
			remaining -= 1;
		}, 1000);

		return () => window.clearInterval(timer);
	});

	function recordOutcome(isCorrect: boolean, text: string) {
		attempted += 1;
		if (isCorrect) {
			correct += 1;
			streak += 1;
		} else {
			streak = 0;
		}
		feedback = { kind: isCorrect ? 'correct' : 'wrong', text };
	}

	function newQuiz() {
		quizTarget = pickNext(BASIC_KANA, quizTarget, (kana) => kana.id);
		quizPrompt = Math.random() < 0.5 ? 'kana' : 'romaji';
		quizOptions = uniqueOptions(quizTarget, BASIC_KANA, (kana) =>
			quizPrompt === 'kana' ? kana.romaji : kanaCharacter(kana, script)
		);
		quizLocked = false;
		feedback = null;
		quizSerial += 1;
	}

	function answerQuiz(option: Kana) {
		if (quizLocked) return;
		quizLocked = true;
		recordOutcome(
			option.id === quizTarget.id,
			option.id === quizTarget.id
				? 'Respuesta correcta.'
				: `La respuesta era ${quizPrompt === 'kana' ? quizTarget.romaji : kanaCharacter(quizTarget, script)}.`
		);
	}

	function finishQuizTimeout() {
		if (quizLocked || mode !== 'quiz') return;
		quizLocked = true;
		recordOutcome(false, 'Se acabó el tiempo. Avanza cuando estés listo.');
	}

	function newListen() {
		listenTarget = pickNext(BASIC_KANA, listenTarget, (kana) => kana.id);
		listenOptions = uniqueOptions(listenTarget, BASIC_KANA, (kana) => kanaCharacter(kana, script));
		listenLocked = false;
		feedback = null;
	}

	function answerListen(option: Kana) {
		if (listenLocked) return;
		listenLocked = true;
		recordOutcome(
			option.id === listenTarget.id,
			option.id === listenTarget.id
				? 'Identificación correcta.'
				: `La opción correcta era ${kanaCharacter(listenTarget, script)}.`
		);
	}

	function newDraw() {
		drawTarget = pickNext(BASIC_KANA, drawTarget, (kana) => kana.id);
		drawComplete = false;
		feedback = null;
	}

	function finishDrawing() {
		if (drawComplete) return;
		drawComplete = true;
		recordOutcome(true, 'Kana completado con trazos válidos.');
	}

	function newWordChoice() {
		wordTarget = pickNext(VOCABULARY, wordTarget, (word) => word.id);
		wordOptions = uniqueOptions(wordTarget, VOCABULARY, (word) => wordForScript(word, script));
		wordLocked = false;
		feedback = null;
	}

	function answerWord(option: VocabularyWord) {
		if (wordLocked) return;
		wordLocked = true;
		recordOutcome(
			option.id === wordTarget.id,
			option.id === wordTarget.id
				? 'Palabra correcta.'
				: `La respuesta era ${wordForScript(wordTarget, script)}.`
		);
	}

	function newPairs() {
		const round = shuffle(BASIC_KANA).slice(0, 6);
		pairKana = shuffle(round.map((kana) => ({ id: kana.id, label: kanaCharacter(kana, script) })));
		pairRomaji = shuffle(round.map((kana) => ({ id: kana.id, label: kana.romaji })));
		selectedPairKana = null;
		selectedPairRomaji = null;
		matchedPairs = new Set();
		feedback = { kind: 'info', text: 'Selecciona un kana y su romaji.' };
	}

	function selectPair(side: 'kana' | 'romaji', id: string) {
		if (matchedPairs.has(id)) return;
		if (side === 'kana') selectedPairKana = id;
		else selectedPairRomaji = id;

		if (!selectedPairKana || !selectedPairRomaji) return;
		const isMatch = selectedPairKana === selectedPairRomaji;
		if (isMatch) matchedPairs = new Set([...matchedPairs, selectedPairKana]);
		recordOutcome(
			isMatch,
			isMatch
				? matchedPairs.size === 6
					? 'Ronda completada: 6 de 6 pares.'
					: `Pareja correcta: ${matchedPairs.size} de 6.`
				: 'No forman pareja. Prueba otra combinación.'
		);
		selectedPairKana = null;
		selectedPairRomaji = null;
	}

	function newWriting() {
		writingTarget = pickNext(BASIC_KANA, writingTarget, (kana) => kana.id);
		writingAnswer = '';
		writingLocked = false;
		feedback = null;
	}

	function submitWriting(event: SubmitEvent) {
		event.preventDefault();
		if (writingLocked || writingAnswer.trim() === '') return;
		writingLocked = true;
		const answer = writingAnswer.trim().toLowerCase();
		recordOutcome(
			answer === writingTarget.romaji,
			answer === writingTarget.romaji
				? 'Romanización correcta.'
				: `La respuesta era ${writingTarget.romaji}.`
		);
	}

	function newFormation() {
		formationTarget = pickNext(VOCABULARY, formationTarget, (word) => word.id);
		formationTiles = shuffle(
			Array.from(wordForScript(formationTarget, script), (character, index) => ({
				id: `${formationTarget.id}-${index}`,
				character
			}))
		);
		selectedFormationIds = [];
		formationLocked = false;
		feedback = null;
	}

	function selectFormationTile(id: string) {
		if (formationLocked || selectedFormationIds.includes(id)) return;
		const nextSelection = [...selectedFormationIds, id];
		selectedFormationIds = nextSelection;
		if (nextSelection.length !== formationTiles.length) return;

		formationLocked = true;
		const answer = nextSelection
			.map((selectedId) => formationTiles.find((tile) => tile.id === selectedId)?.character ?? '')
			.join('');
		const expected = wordForScript(formationTarget, script);
		recordOutcome(
			answer === expected,
			answer === expected ? 'Palabra formada correctamente.' : `El orden correcto era ${expected}.`
		);
	}

	function removeLastFormationTile() {
		if (formationLocked) return;
		selectedFormationIds = selectedFormationIds.slice(0, -1);
	}

	function resetFormationSelection() {
		selectedFormationIds = [];
		formationLocked = false;
		feedback = null;
	}

	function startMode(nextMode: Mode) {
		mode = nextMode;
		newRound();
	}

	function setScript(nextScript: KanaScript) {
		if (script === nextScript) return;
		script = nextScript;
		newRound();
	}

	function newRound() {
		switch (mode) {
			case 'quiz':
				newQuiz();
				break;
			case 'listen':
				newListen();
				break;
			case 'draw':
				newDraw();
				break;
			case 'word-choice':
				newWordChoice();
				break;
			case 'pairs':
				newPairs();
				break;
			case 'writing':
				newWriting();
				break;
			case 'formation':
				newFormation();
		}
	}

	function resetSession() {
		correct = 0;
		attempted = 0;
		streak = 0;
		newRound();
	}
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

	<main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-normal">Práctica de kana</h1>
				<p class="text-sm text-muted-foreground">
					Entrena reconocimiento, escritura y vocabulario.
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2" aria-label="Marcador de sesión">
				<Badge variant="secondary">{correct} correctas</Badge>
				<Badge variant="outline">{attempted} intentos</Badge>
				<Badge variant="outline">Racha {streak}</Badge>
				<Badge variant="outline">{accuracy}%</Badge>
				<Button variant="ghost" size="sm" onclick={resetSession}>
					<RotateCcwIcon data-icon="inline-start" />
					Reiniciar sesión
				</Button>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Modo de práctica">
			{#each MODES as entry (entry.id)}
				{@const Icon = entry.icon}
				<Button
					variant={mode === entry.id ? 'secondary' : 'ghost'}
					class="h-auto min-h-16 min-w-0 flex-col gap-1 px-2 py-2 text-xs whitespace-normal"
					aria-pressed={mode === entry.id}
					onclick={() => startMode(entry.id)}
				>
					<Icon aria-hidden="true" />
					<span class="text-center leading-tight">{entry.label}</span>
				</Button>
			{/each}
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3 border-y py-3">
			<div class="flex items-center gap-2" aria-label="Silabario">
				<Button
					size="sm"
					variant={script === 'hiragana' ? 'default' : 'outline'}
					aria-pressed={script === 'hiragana'}
					onclick={() => setScript('hiragana')}>Hiragana</Button
				>
				<Button
					size="sm"
					variant={script === 'katakana' ? 'default' : 'outline'}
					aria-pressed={script === 'katakana'}
					onclick={() => setScript('katakana')}>Katakana</Button
				>
			</div>
			<Button variant="outline" size="sm" onclick={newRound}>
				<RefreshCcwIcon data-icon="inline-start" />
				Nueva ronda
			</Button>
		</div>

		<Card.Root class="mx-auto w-full max-w-3xl">
			<Card.Header class="gap-1">
				<div class="flex items-center justify-between gap-3">
					<Card.Title>{modeLabel}</Card.Title>
					<Badge variant="secondary">{script === 'hiragana' ? 'Hiragana' : 'Katakana'}</Badge>
				</div>
				{#if mode === 'quiz'}
					<Card.Description>Elige la equivalencia antes de que termine el tiempo.</Card.Description>
				{:else if mode === 'listen'}
					<Card.Description>Identifica el kana correspondiente al sonido.</Card.Description>
				{:else if mode === 'draw'}
					<Card.Description>Dibuja de memoria el kana solicitado.</Card.Description>
				{:else if mode === 'word-choice'}
					<Card.Description
						>Relaciona el significado y la lectura con la palabra japonesa.</Card.Description
					>
				{:else if mode === 'pairs'}
					<Card.Description>Une cada kana con su romanización.</Card.Description>
				{:else if mode === 'writing'}
					<Card.Description>Escribe la lectura en romaji.</Card.Description>
				{:else}
					<Card.Description>Ordena los kana para formar la palabra.</Card.Description>
				{/if}
			</Card.Header>

			<Card.Content class="flex min-h-80 flex-col justify-center gap-6">
				{#if mode === 'quiz'}
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between text-sm tabular-nums">
							<span class="text-muted-foreground">Tiempo restante</span>
							<span class="font-medium">{remaining} s</span>
						</div>
						<Progress value={remaining} max={QUIZ_SECONDS} aria-label="Tiempo restante" />
					</div>
					<div class="text-center">
						<p class="text-sm text-muted-foreground">Busca la equivalencia</p>
						<p class="mt-2 text-6xl font-medium">
							{quizPrompt === 'kana' ? kanaCharacter(quizTarget, script) : quizTarget.romaji}
						</p>
					</div>
					<div class="grid grid-cols-2 gap-3">
						{#each quizOptions as option (option.id)}
							<Button
								variant="outline"
								class="h-16 text-lg"
								disabled={quizLocked}
								onclick={() => answerQuiz(option)}
							>
								{quizPrompt === 'kana' ? option.romaji : kanaCharacter(option, script)}
							</Button>
						{/each}
					</div>
				{:else if mode === 'listen'}
					<div
						class="flex flex-col items-center gap-3 rounded-md border border-dashed p-4 text-center"
					>
						<VolumeXIcon class="size-7 text-muted-foreground" aria-hidden="true" />
						<div>
							<p class="font-medium">Audio no disponible todavía</p>
							<p class="text-sm text-muted-foreground">
								Referencia temporal en romaji: <strong>{listenTarget.romaji}</strong>
							</p>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						{#each listenOptions as option (option.id)}
							<Button
								variant="outline"
								class="h-16 text-2xl"
								disabled={listenLocked}
								onclick={() => answerListen(option)}
							>
								{kanaCharacter(option, script)}
							</Button>
						{/each}
					</div>
				{:else if mode === 'draw'}
					<div class="grid items-start gap-5 sm:grid-cols-[1fr_18rem]">
						<div class="flex flex-col items-center justify-center gap-2 py-6 text-center">
							<p class="text-sm text-muted-foreground">Dibuja el kana de</p>
							<p class="text-4xl font-semibold">{drawTarget.romaji}</p>
						</div>
						<div class="mx-auto w-full max-w-72">
							{#key `${script}-${drawTarget.id}`}
								<KanaWritingPad
									character={kanaCharacter(drawTarget, script)}
									showGuide={false}
									showIndicators={false}
									oncomplete={finishDrawing}
								/>
							{/key}
						</div>
					</div>
				{:else if mode === 'word-choice'}
					<div class="text-center">
						<p class="text-sm text-muted-foreground">{wordTarget.meaning}</p>
						<p class="mt-2 text-3xl font-semibold">{wordTarget.romaji}</p>
					</div>
					<div class="grid grid-cols-2 gap-3">
						{#each wordOptions as option (option.id)}
							<Button
								variant="outline"
								class="h-16 text-xl"
								disabled={wordLocked}
								onclick={() => answerWord(option)}
							>
								{wordForScript(option, script)}
							</Button>
						{/each}
					</div>
				{:else if mode === 'pairs'}
					<div class="flex items-center justify-between gap-3 text-sm">
						<span class="text-muted-foreground">Pares encontrados</span>
						<Badge variant="secondary">{matchedPairs.size} / 6</Badge>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="grid gap-2" aria-label="Kana">
							{#each pairKana as tile (tile.id)}
								<Button
									variant={selectedPairKana === tile.id ? 'secondary' : 'outline'}
									class={cn('h-12 text-xl', matchedPairs.has(tile.id) && 'opacity-45')}
									disabled={matchedPairs.has(tile.id)}
									aria-pressed={selectedPairKana === tile.id}
									onclick={() => selectPair('kana', tile.id)}>{tile.label}</Button
								>
							{/each}
						</div>
						<div class="grid gap-2" aria-label="Romaji">
							{#each pairRomaji as tile (tile.id)}
								<Button
									variant={selectedPairRomaji === tile.id ? 'secondary' : 'outline'}
									class={cn('h-12', matchedPairs.has(tile.id) && 'opacity-45')}
									disabled={matchedPairs.has(tile.id)}
									aria-pressed={selectedPairRomaji === tile.id}
									onclick={() => selectPair('romaji', tile.id)}>{tile.label}</Button
								>
							{/each}
						</div>
					</div>
				{:else if mode === 'writing'}
					<div class="text-center text-6xl font-medium">{kanaCharacter(writingTarget, script)}</div>
					<form class="mx-auto flex w-full max-w-md flex-col gap-3" onsubmit={submitWriting}>
						<label for="romaji-answer" class="text-sm font-medium">Romaji</label>
						<Input
							id="romaji-answer"
							bind:value={writingAnswer}
							disabled={writingLocked}
							autocomplete="off"
							spellcheck="false"
							aria-invalid={feedback?.kind === 'wrong'}
						/>
						<Button type="submit" disabled={writingLocked || writingAnswer.trim() === ''}
							>Comprobar</Button
						>
					</form>
				{:else}
					<div class="text-center">
						<p class="text-sm text-muted-foreground">{formationTarget.meaning}</p>
						<p class="mt-1 text-xl font-medium">{formationTarget.romaji}</p>
					</div>
					<div
						class="flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-md border border-dashed p-3"
						aria-label="Palabra formada"
					>
						{#if selectedFormationTiles.length === 0}
							<span class="text-sm text-muted-foreground">Selecciona los kana en orden</span>
						{:else}
							{#each selectedFormationTiles as tile (tile.id)}
								<Badge variant="secondary" class="px-3 py-2 text-xl">{tile.character}</Badge>
							{/each}
						{/if}
					</div>
					<div class="flex flex-wrap justify-center gap-2" aria-label="Fichas de kana">
						{#each formationTiles as tile (tile.id)}
							<Button
								variant="outline"
								size="icon-lg"
								disabled={formationLocked || selectedFormationIds.includes(tile.id)}
								aria-label={`Añadir ${tile.character}`}
								onclick={() => selectFormationTile(tile.id)}>{tile.character}</Button
							>
						{/each}
					</div>
					<div class="flex justify-center gap-2">
						<Button
							variant="outline"
							disabled={formationLocked || selectedFormationIds.length === 0}
							onclick={removeLastFormationTile}>Quitar última</Button
						>
						<Button
							variant="ghost"
							disabled={selectedFormationIds.length === 0}
							onclick={resetFormationSelection}>Vaciar</Button
						>
					</div>
				{/if}
			</Card.Content>

			<Card.Footer class="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t">
				<p
					class={cn(
						'text-sm',
						feedback?.kind === 'correct' && 'font-medium text-primary',
						feedback?.kind === 'wrong' && 'font-medium text-destructive',
						(!feedback || feedback.kind === 'info') && 'text-muted-foreground'
					)}
					aria-live="polite"
				>
					{feedback?.text ?? 'Completa el ejercicio para ver el resultado.'}
				</p>
				{#if (mode === 'quiz' && quizLocked) || (mode === 'listen' && listenLocked) || (mode === 'draw' && drawComplete) || (mode === 'word-choice' && wordLocked) || (mode === 'writing' && writingLocked) || (mode === 'formation' && formationLocked)}
					<Button onclick={newRound}>Siguiente</Button>
				{/if}
			</Card.Footer>
		</Card.Root>
	</main>
</div>
