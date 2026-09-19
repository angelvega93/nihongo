<script lang="ts">
	import KanaWritingPad from '$lib/components/kana-writing-pad.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import {
		ALL_KANA,
		allKanaForScript,
		kanaCharacter,
		pickNext,
		shuffle,
		uniqueOptions,
		wordForScript,
		wordKanaIds,
		type Kana,
		type KanaScript,
		type VocabularyWord
	} from '$lib/kana/data.js';
	import { cn } from '$lib/utils.js';
	import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
	import VolumeXIcon from '@lucide/svelte/icons/volume-x';
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { Attachment } from 'svelte/attachments';
	import type { PracticeMode } from './kana-practice-modes.svelte';

	export type PracticeOutcome = {
		/** Kana involved in the exercise, used to update per-kana progress. */
		kanaIds: string[];
		correct: boolean;
	};

	type Feedback = { kind: 'correct' | 'wrong' | 'info'; text: string };
	type PairTile = { id: string; label: string };
	type FormationTile = { id: string; character: string };

	type Props = {
		mode: PracticeMode;
		script: KanaScript;
		/** Kana available for this round (already filtered by availability + mastery). */
		pool: Kana[];
		/** Vocabulary words whose kana are all enabled, for the word modes. */
		words: VocabularyWord[];
		onoutcome: (outcome: PracticeOutcome) => void;
	};

	let { mode, script, pool, words, onoutcome }: Props = $props();

	const QUIZ_SECONDS = 10;
	const scriptKana = $derived(allKanaForScript(script));
	const activePool = $derived(pool.length > 0 ? pool : scriptKana);
	/**
	 * Drawing uses the stroke-order data, which only exists for single
	 * characters, so yōon (きゃ…) are excluded from the draw mode.
	 */
	const drawPool = $derived.by(() => {
		const single = activePool.filter(
			(item) => Array.from(kanaCharacter(item, script)).length === 1
		);
		return single.length > 0 ? single : activePool;
	});
	/** Never ask for more pairs than there are kana to match. */
	const pairCount = $derived(Math.min(6, activePool.length));

	/**
	 * Placeholder kana for the first render. The component is remounted by the
	 * parent whenever the script changes, and `onMount(newRound)` immediately
	 * replaces these with a real target from the active pool.
	 */
	const firstKana = (): Kana => ALL_KANA[0];

	let feedback = $state<Feedback | null>(null);

	let quizTarget = $state<Kana>(firstKana());
	let quizOptions = $state<Kana[]>(ALL_KANA.slice(0, 4));
	let quizPrompt = $state<'kana' | 'romaji'>('kana');
	let quizLocked = $state(false);
	let quizSerial = $state(0);
	let remaining = $state(QUIZ_SECONDS);

	let listenTarget = $state<Kana>(firstKana());
	let listenOptions = $state<Kana[]>(ALL_KANA.slice(0, 4));
	let listenLocked = $state(false);

	let drawTarget = $state<Kana>(firstKana());
	let drawComplete = $state(false);

	let wordTarget = $state<VocabularyWord | null>(null);
	let wordOptions = $state<VocabularyWord[]>([]);
	let wordLocked = $state(false);

	let pairKana = $state<PairTile[]>([]);
	let pairRomaji = $state<PairTile[]>([]);
	let selectedPairKana = $state<string | null>(null);
	let selectedPairRomaji = $state<string | null>(null);
	let matchedPairs = new SvelteSet<string>();

	let writingTarget = $state<Kana>(firstKana());
	let writingAnswer = $state('');
	let writingLocked = $state(false);

	let formationTarget = $state<VocabularyWord | null>(null);
	let formationTiles = $state<FormationTile[]>([]);
	let selectedFormationIds = $state<string[]>([]);
	let formationLocked = $state(false);

	const selectedFormationTiles = $derived(
		selectedFormationIds.flatMap((id) => formationTiles.filter((tile) => tile.id === id))
	);

	const isLocked = $derived(
		(mode === 'quiz' && quizLocked) ||
			(mode === 'listen' && listenLocked) ||
			(mode === 'draw' && drawComplete) ||
			(mode === 'word-choice' && wordLocked) ||
			(mode === 'writing' && writingLocked) ||
			(mode === 'formation' && formationLocked)
	);

	function quizTimer(activeMode: PracticeMode, locked: boolean, serial: number): Attachment {
		return () => {
			void serial;
			if (activeMode !== 'quiz' || locked) return;

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
		};
	}

	function recordOutcome(kanaIds: string[], isCorrect: boolean, text: string) {
		feedback = { kind: isCorrect ? 'correct' : 'wrong', text };
		onoutcome({ kanaIds, correct: isCorrect });
	}

	function newQuiz() {
		quizTarget = pickNext(activePool, quizTarget, (kana) => kana.id);
		quizPrompt = Math.random() < 0.5 ? 'kana' : 'romaji';
		quizOptions = uniqueOptions(quizTarget, activePool, (kana) =>
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
			[quizTarget.id],
			option.id === quizTarget.id,
			option.id === quizTarget.id
				? 'Respuesta correcta.'
				: `La respuesta era ${quizPrompt === 'kana' ? quizTarget.romaji : kanaCharacter(quizTarget, script)}.`
		);
	}

	function finishQuizTimeout() {
		if (quizLocked || mode !== 'quiz') return;
		quizLocked = true;
		recordOutcome([quizTarget.id], false, 'Se acabó el tiempo. Avanza cuando estés listo.');
	}

	function newListen() {
		listenTarget = pickNext(activePool, listenTarget, (kana) => kana.id);
		listenOptions = uniqueOptions(listenTarget, activePool, (kana) => kanaCharacter(kana, script));
		listenLocked = false;
		feedback = null;
	}

	function answerListen(option: Kana) {
		if (listenLocked) return;
		listenLocked = true;
		recordOutcome(
			[listenTarget.id],
			option.id === listenTarget.id,
			option.id === listenTarget.id
				? 'Identificación correcta.'
				: `La opción correcta era ${kanaCharacter(listenTarget, script)}.`
		);
	}

	function newDraw() {
		drawTarget = pickNext(drawPool, drawTarget, (kana) => kana.id);
		drawComplete = false;
		feedback = null;
	}

	function finishDrawing() {
		if (drawComplete) return;
		drawComplete = true;
		recordOutcome([drawTarget.id], true, 'Kana completado con trazos válidos.');
	}

	function failDrawing() {
		feedback = null;
		onoutcome({ kanaIds: [drawTarget.id], correct: false });
	}

	function newWordChoice() {
		if (words.length === 0) return;
		wordTarget = pickNext(words, wordTarget ?? undefined, (word) => word.id);
		wordOptions = uniqueOptions(wordTarget, words, (word) => wordForScript(word, script));
		wordLocked = false;
		feedback = null;
	}

	function answerWord(option: VocabularyWord) {
		if (wordLocked || !wordTarget) return;
		wordLocked = true;
		recordOutcome(
			wordKanaIds(wordTarget),
			option.id === wordTarget.id,
			option.id === wordTarget.id
				? 'Palabra correcta.'
				: `La respuesta era ${wordForScript(wordTarget, script)}.`
		);
	}

	function newPairs() {
		const round = shuffle(activePool).slice(0, pairCount);
		pairKana = shuffle(round.map((kana) => ({ id: kana.id, label: kanaCharacter(kana, script) })));
		pairRomaji = shuffle(round.map((kana) => ({ id: kana.id, label: kana.romaji })));
		selectedPairKana = null;
		selectedPairRomaji = null;
		matchedPairs.clear();
		feedback = { kind: 'info', text: 'Selecciona un kana y su romaji.' };
	}

	function selectPair(side: 'kana' | 'romaji', id: string) {
		if (matchedPairs.has(id)) return;
		if (side === 'kana') selectedPairKana = id;
		else selectedPairRomaji = id;

		if (!selectedPairKana || !selectedPairRomaji) return;
		const isMatch = selectedPairKana === selectedPairRomaji;
		if (isMatch) matchedPairs.add(selectedPairKana);
		recordOutcome(
			[selectedPairKana],
			isMatch,
			isMatch
				? matchedPairs.size === pairCount
					? `Ronda completada: ${pairCount} de ${pairCount} pares.`
					: `Pareja correcta: ${matchedPairs.size} de ${pairCount}.`
				: 'No forman pareja. Prueba otra combinación.'
		);
		selectedPairKana = null;
		selectedPairRomaji = null;
	}

	function newWriting() {
		writingTarget = pickNext(activePool, writingTarget, (kana) => kana.id);
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
			[writingTarget.id],
			answer === writingTarget.romaji,
			answer === writingTarget.romaji
				? 'Romanización correcta.'
				: `La respuesta era ${writingTarget.romaji}.`
		);
	}

	function newFormation() {
		if (words.length === 0) return;
		const target = pickNext(words, formationTarget ?? undefined, (word) => word.id);
		formationTarget = target;
		formationTiles = shuffle(
			Array.from(wordForScript(target, script), (character, index) => ({
				id: `${target.id}-${index}`,
				character
			}))
		);
		selectedFormationIds = [];
		formationLocked = false;
		feedback = null;
	}

	function selectFormationTile(id: string) {
		if (formationLocked || !formationTarget || selectedFormationIds.includes(id)) return;
		const nextSelection = [...selectedFormationIds, id];
		selectedFormationIds = nextSelection;
		if (nextSelection.length !== formationTiles.length) return;

		formationLocked = true;
		const answer = nextSelection
			.map((selectedId) => formationTiles.find((tile) => tile.id === selectedId)?.character ?? '')
			.join('');
		const expected = wordForScript(formationTarget, script);
		recordOutcome(
			wordKanaIds(formationTarget),
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

	// The parent remounts this component (via `{#key}`) whenever the mode,
	// script or pool changes, so a single mount-time round is enough.
	onMount(newRound);
</script>

<Card.Root class="mx-auto w-full max-w-3xl">
	<Card.Header class="gap-1">
		<div class="flex items-center justify-between gap-3">
			<Card.Title>
				{#if mode === 'quiz'}Prueba
				{:else if mode === 'listen'}Escucha
				{:else if mode === 'draw'}Dibujar
				{:else if mode === 'word-choice'}Selección de palabra
				{:else if mode === 'pairs'}Emparejar pares
				{:else if mode === 'writing'}Escritura
				{:else}Formación de palabra{/if}
			</Card.Title>
			<Badge variant="secondary">{script === 'hiragana' ? 'Hiragana' : 'Katakana'}</Badge>
		</div>
		<Card.Description>
			{#if mode === 'quiz'}Elige la equivalencia antes de que termine el tiempo.
			{:else if mode === 'listen'}Identifica el kana correspondiente al sonido.
			{:else if mode === 'draw'}Dibuja de memoria el kana solicitado.
			{:else if mode === 'word-choice'}Relaciona el significado y la lectura con la palabra
				japonesa.
			{:else if mode === 'pairs'}Une cada kana con su romanización.
			{:else if mode === 'writing'}Escribe la lectura en romaji.
			{:else}Ordena los kana para formar la palabra.{/if}
		</Card.Description>
	</Card.Header>

	<Card.Content
		class="flex min-h-80 flex-col justify-center gap-6"
		{@attach quizTimer(mode, quizLocked, quizSerial)}
	>
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
			<div class="flex flex-col items-center gap-3 rounded-md border border-dashed p-4 text-center">
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
							evaluationMode="deferred"
							oncomplete={finishDrawing}
							onfailed={failDrawing}
						/>
					{/key}
				</div>
			</div>
		{:else if mode === 'word-choice'}
			{#if wordTarget}
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
			{:else}
				<p class="text-center text-sm text-muted-foreground">
					Activa más kana para desbloquear palabras con las que practicar.
				</p>
			{/if}
		{:else if mode === 'pairs'}
			<div class="flex items-center justify-between gap-3 text-sm">
				<span class="text-muted-foreground">Pares encontrados</span>
				<Badge variant="secondary">{matchedPairs.size} / {pairCount}</Badge>
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
			{#if formationTarget}
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
			{:else}
				<p class="text-center text-sm text-muted-foreground">
					Activa más kana para desbloquear palabras con las que practicar.
				</p>
			{/if}
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
			{feedback?.text ?? (mode === 'draw' ? '' : 'Completa el ejercicio para ver el resultado.')}
		</p>
		{#if isLocked}
			<Button onclick={newRound}>
				<RefreshCcwIcon data-icon="inline-start" />
				Siguiente
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>
