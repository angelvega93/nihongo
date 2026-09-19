<script lang="ts">
	import KanaWritingPad from '$lib/components/kana-writing-pad.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import {
		ALL_KANA,
		kanaCharacter,
		pickNext,
		shuffle,
		uniqueOptions,
		wordForScript,
		wordKanaIds,
		type KanaScript,
		type VocabularyWord
	} from '$lib/kana/data.js';
	import type { PracticeKana, WordsByScript } from '$lib/kana/practice.js';
	import { modeInfo, type PracticeMode } from '$lib/kana/practice-modes.js';
	import { cn } from '$lib/utils.js';
	import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
	import VolumeXIcon from '@lucide/svelte/icons/volume-x';
	import { onDestroy, onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { Attachment } from 'svelte/attachments';

	/** A single kana attempt, tagged with the script it was practised in. */
	export type PracticeAttempt = { script: KanaScript; kanaId: string };

	export type PracticeOutcome = {
		/** Kana involved in the exercise, used to update per-kana progress. */
		attempts: PracticeAttempt[];
		correct: boolean;
	};

	type Feedback = { kind: 'correct' | 'wrong' | 'info'; text: string };
	type PairTile = { key: string; label: string };
	type FormationTile = { id: string; character: string };

	type Props = {
		mode: PracticeMode;
		/** Enabled kana of both scripts, mixed. */
		pool: PracticeKana[];
		/** Available vocabulary words per script, for the word modes. */
		wordsByScript: WordsByScript;
		onoutcome: (outcome: PracticeOutcome) => void;
	};

	let { mode, pool, wordsByScript, onoutcome }: Props = $props();

	const QUIZ_SECONDS = 10;
	/** Questions per round, mirroring the lesson flow. */
	const QUESTION_LIMIT = 16;
	/** Pause after grading so the result is visible before advancing. */
	const ADVANCE_CORRECT_MS = 1000;
	const ADVANCE_WRONG_MS = 1600;
	const info = $derived(modeInfo(mode));

	/** Placeholder used before `onMount(newRound)` picks a real target. */
	const fallback: PracticeKana = {
		kana: ALL_KANA[0],
		script: 'hiragana',
		key: `hiragana:${ALL_KANA[0].id}`
	};

	const activePool = $derived(pool.length > 0 ? pool : [fallback]);

	/**
	 * Drawing uses the stroke-order data, which only exists for single
	 * characters, so yōon (きゃ…) are excluded from the draw mode.
	 */
	const drawPool = $derived.by(() => {
		const single = activePool.filter(
			(item) => Array.from(kanaCharacter(item.kana, item.script)).length === 1
		);
		return single.length > 0 ? single : activePool;
	});

	/**
	 * Pair tiles are matched by romaji, so two kana sharing a reading (e.g. the
	 * hiragana and katakana variants) would produce duplicate tiles. Keep one
	 * representative per romaji.
	 */
	const pairPool = $derived.by(() =>
		activePool.filter(
			(item, index) =>
				activePool.findIndex((entry) => entry.kana.romaji === item.kana.romaji) === index
		)
	);
	/** Never ask for more pairs than there are distinct readings. */
	const pairCount = $derived(Math.min(6, pairPool.length));

	let feedback = $state<Feedback | null>(null);
	/** Number of questions already answered in this round. */
	let answered = $state(0);
	/** 1-based number of the question currently on screen. */
	let questionNumber = $state(1);
	let correctCount = $state(0);
	let finished = $state(false);
	let advanceTimer: ReturnType<typeof setTimeout> | undefined;

	let quizTarget = $state<PracticeKana>(fallback);
	let quizOptions = $state<PracticeKana[]>([]);
	let quizPrompt = $state<'kana' | 'romaji'>('kana');
	let quizLocked = $state(false);
	let quizSerial = $state(0);
	let remaining = $state(QUIZ_SECONDS);

	let listenTarget = $state<PracticeKana>(fallback);
	let listenOptions = $state<PracticeKana[]>([]);
	let listenLocked = $state(false);

	let drawTarget = $state<PracticeKana>(fallback);
	let drawComplete = $state(false);

	let wordTarget = $state<VocabularyWord | null>(null);
	let wordScript = $state<KanaScript>('hiragana');
	let wordOptions = $state<VocabularyWord[]>([]);
	let wordLocked = $state(false);

	let pairKana = $state<PairTile[]>([]);
	let pairRomaji = $state<PairTile[]>([]);
	let selectedPairKana = $state<string | null>(null);
	let selectedPairRomaji = $state<string | null>(null);
	let matchedPairs = new SvelteSet<string>();

	let writingTarget = $state<PracticeKana>(fallback);
	let writingAnswer = $state('');
	let writingLocked = $state(false);

	let formationTarget = $state<VocabularyWord | null>(null);
	let formationScript = $state<KanaScript>('hiragana');
	let formationTiles = $state<FormationTile[]>([]);
	let selectedFormationIds = $state<string[]>([]);
	let formationLocked = $state(false);

	const selectedFormationTiles = $derived(
		selectedFormationIds.flatMap((id) => formationTiles.filter((tile) => tile.id === id))
	);

	/**
	 * Script of the current target, for the modes where the romaji alone is
	 * ambiguous (drawing and writing). `null` for the mixed modes.
	 */
	const targetScript = $derived.by(() => {
		if (mode === 'draw') return drawTarget.script;
		if (mode === 'writing') return writingTarget.script;
		return null;
	});

	function quizTimer(
		activeMode: PracticeMode,
		locked: boolean,
		serial: number,
		isFinished: boolean
	): Attachment {
		return () => {
			void serial;
			if (activeMode !== 'quiz' || locked || isFinished) return;

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

	function clearAdvanceTimer() {
		if (advanceTimer !== undefined) {
			clearTimeout(advanceTimer);
			advanceTimer = undefined;
		}
	}

	/** Show the result, persist it and move on automatically. */
	function recordOutcome(
		attempts: PracticeAttempt[],
		isCorrect: boolean,
		text: string,
		options: { advance?: boolean } = {}
	) {
		feedback = { kind: isCorrect ? 'correct' : 'wrong', text };
		onoutcome({ attempts, correct: isCorrect });
		correctCount += isCorrect ? 1 : 0;
		answered += 1;
		if (options.advance !== false) scheduleAdvance(isCorrect);
	}

	/** Advance to the next question, or finish the round after the limit. */
	function scheduleAdvance(isCorrect: boolean) {
		clearAdvanceTimer();
		advanceTimer = setTimeout(
			() => {
				advanceTimer = undefined;
				if (answered >= QUESTION_LIMIT) {
					finished = true;
					return;
				}
				questionNumber = answered + 1;
				newRound();
			},
			isCorrect ? ADVANCE_CORRECT_MS : ADVANCE_WRONG_MS
		);
	}

	/** Attempts for a single kana item. */
	function attemptFor(item: PracticeKana): PracticeAttempt[] {
		return [{ script: item.script, kanaId: item.kana.id }];
	}

	/** Attempts for a vocabulary word, in the script it was practised in. */
	function wordAttempts(word: VocabularyWord, script: KanaScript): PracticeAttempt[] {
		return wordKanaIds(word).map((kanaId) => ({ script, kanaId }));
	}

	/** Kana of the same script, so a romaji→kana question has one valid answer. */
	function sameScriptPool(item: PracticeKana): PracticeKana[] {
		const same = activePool.filter((entry) => entry.script === item.script);
		return same.length > 0 ? same : activePool;
	}

	function newQuiz() {
		quizTarget = pickNext(activePool, quizTarget, (item) => item.key);
		quizPrompt = Math.random() < 0.5 ? 'kana' : 'romaji';
		quizOptions =
			quizPrompt === 'kana'
				? // Prompt shows the kana, answers are romaji: dedupe by reading.
					uniqueOptions(quizTarget, activePool, (item) => item.kana.romaji)
				: // Prompt shows the romaji, answers are kana: keep one script only.
					uniqueOptions(quizTarget, sameScriptPool(quizTarget), (item) =>
						kanaCharacter(item.kana, item.script)
					);
		quizLocked = false;
		feedback = null;
		quizSerial += 1;
	}

	function isQuizCorrect(option: PracticeKana): boolean {
		return quizPrompt === 'kana'
			? option.kana.romaji === quizTarget.kana.romaji
			: option.key === quizTarget.key;
	}

	function answerQuiz(option: PracticeKana) {
		if (quizLocked) return;
		quizLocked = true;
		const correct = isQuizCorrect(option);
		recordOutcome(
			attemptFor(quizTarget),
			correct,
			correct
				? 'Respuesta correcta.'
				: `La respuesta era ${quizPrompt === 'kana' ? quizTarget.kana.romaji : kanaCharacter(quizTarget.kana, quizTarget.script)}.`
		);
	}

	function finishQuizTimeout() {
		if (quizLocked || finished || mode !== 'quiz') return;
		quizLocked = true;
		recordOutcome(attemptFor(quizTarget), false, 'Se acabó el tiempo. Avanza cuando estés listo.');
	}

	function newListen() {
		listenTarget = pickNext(activePool, listenTarget, (item) => item.key);
		listenOptions = uniqueOptions(listenTarget, sameScriptPool(listenTarget), (item) =>
			kanaCharacter(item.kana, item.script)
		);
		listenLocked = false;
		feedback = null;
	}

	function answerListen(option: PracticeKana) {
		if (listenLocked) return;
		listenLocked = true;
		const correct = option.key === listenTarget.key;
		recordOutcome(
			attemptFor(listenTarget),
			correct,
			correct
				? 'Identificación correcta.'
				: `La opción correcta era ${kanaCharacter(listenTarget.kana, listenTarget.script)}.`
		);
	}

	function newDraw() {
		drawTarget = pickNext(drawPool, drawTarget, (item) => item.key);
		drawComplete = false;
		feedback = null;
	}

	function finishDrawing() {
		if (drawComplete) return;
		drawComplete = true;
		recordOutcome(attemptFor(drawTarget), true, 'Kana completado con trazos válidos.');
	}

	function failDrawing() {
		if (drawComplete) return;
		drawComplete = true;
		recordOutcome(
			attemptFor(drawTarget),
			false,
			'El trazo no coincide. Revisa el orden y la forma.'
		);
	}

	/** Pick a script that actually has words available. */
	function pickWordScript(): KanaScript {
		const scripts = (['hiragana', 'katakana'] as const).filter(
			(script) => wordsByScript[script].length > 0
		);
		if (scripts.length === 0) return 'hiragana';
		return scripts[Math.floor(Math.random() * scripts.length)];
	}

	function newWordChoice() {
		const script = pickWordScript();
		const words = wordsByScript[script];
		if (words.length === 0) return;
		wordScript = script;
		wordTarget = pickNext(words, wordTarget ?? undefined, (word) => word.id);
		wordOptions = uniqueOptions(wordTarget, words, (word) => wordForScript(word, script));
		wordLocked = false;
		feedback = null;
	}

	function answerWord(option: VocabularyWord) {
		if (wordLocked || !wordTarget) return;
		wordLocked = true;
		const correct = option.id === wordTarget.id;
		recordOutcome(
			wordAttempts(wordTarget, wordScript),
			correct,
			correct ? 'Palabra correcta.' : `La respuesta era ${wordForScript(wordTarget, wordScript)}.`
		);
	}

	function newPairs() {
		const round = shuffle(pairPool).slice(0, pairCount);
		pairKana = shuffle(
			round.map((item) => ({ key: item.key, label: kanaCharacter(item.kana, item.script) }))
		);
		pairRomaji = shuffle(round.map((item) => ({ key: item.key, label: item.kana.romaji })));
		selectedPairKana = null;
		selectedPairRomaji = null;
		matchedPairs.clear();
		feedback = { kind: 'info', text: 'Selecciona un kana y su romaji.' };
	}

	function selectPair(side: 'kana' | 'romaji', key: string) {
		if (matchedPairs.has(key)) return;
		if (side === 'kana') selectedPairKana = key;
		else selectedPairRomaji = key;

		if (!selectedPairKana || !selectedPairRomaji) return;
		const isMatch = selectedPairKana === selectedPairRomaji;
		if (isMatch) matchedPairs.add(selectedPairKana);
		const matched = pairPool.find((item) => item.key === selectedPairKana);
		const boardComplete = matchedPairs.size === pairCount;
		recordOutcome(
			matched ? attemptFor(matched) : [],
			isMatch,
			isMatch
				? boardComplete
					? `Ronda completada: ${pairCount} de ${pairCount} pares.`
					: `Pareja correcta: ${matchedPairs.size} de ${pairCount}.`
				: 'No forman pareja. Prueba otra combinación.',
			{ advance: false }
		);
		selectedPairKana = null;
		selectedPairRomaji = null;

		// Pairs are matched on a board, so the round only advances once the
		// board is cleared (or the question limit is reached).
		if (answered >= QUESTION_LIMIT) {
			clearAdvanceTimer();
			advanceTimer = setTimeout(() => {
				advanceTimer = undefined;
				finished = true;
			}, ADVANCE_CORRECT_MS);
		} else if (boardComplete) {
			clearAdvanceTimer();
			advanceTimer = setTimeout(() => {
				advanceTimer = undefined;
				questionNumber = answered + 1;
				newPairs();
			}, ADVANCE_CORRECT_MS);
		}
	}

	function newWriting() {
		writingTarget = pickNext(activePool, writingTarget, (item) => item.key);
		writingAnswer = '';
		writingLocked = false;
		feedback = null;
	}

	function submitWriting(event: SubmitEvent) {
		event.preventDefault();
		if (writingLocked || writingAnswer.trim() === '') return;
		writingLocked = true;
		const answer = writingAnswer.trim().toLowerCase();
		const correct = answer === writingTarget.kana.romaji;
		recordOutcome(
			attemptFor(writingTarget),
			correct,
			correct ? 'Romanización correcta.' : `La respuesta era ${writingTarget.kana.romaji}.`
		);
	}

	function newFormation() {
		const script = pickWordScript();
		const words = wordsByScript[script];
		if (words.length === 0) return;
		const target = pickNext(words, formationTarget ?? undefined, (word) => word.id);
		formationScript = script;
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
		const expected = wordForScript(formationTarget, formationScript);
		const correct = answer === expected;
		recordOutcome(
			wordAttempts(formationTarget, formationScript),
			correct,
			correct ? 'Palabra formada correctamente.' : `El orden correcto era ${expected}.`
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
		clearAdvanceTimer();
		feedback = null;
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

	/** Reset the counters and start a fresh round. */
	function restartRound() {
		clearAdvanceTimer();
		answered = 0;
		questionNumber = 1;
		correctCount = 0;
		finished = false;
		newRound();
	}

	// The parent remounts this component (via `{#key}`) whenever the mode or
	// pool changes, so a single mount-time round is enough.
	onMount(newRound);
	onDestroy(clearAdvanceTimer);
</script>

<Card.Root class="mx-auto w-full max-w-3xl">
	<Card.Header class="gap-1">
		<div class="flex items-center justify-between gap-3">
			<Card.Title>{finished ? 'Ronda completada' : info.label}</Card.Title>
			{#if finished}
				<Badge variant="secondary">{correctCount} / {QUESTION_LIMIT}</Badge>
			{:else if targetScript}
				<Badge variant="secondary">
					{targetScript === 'hiragana' ? 'Hiragana' : 'Katakana'}
				</Badge>
			{:else}
				<Badge variant="outline">Hiragana + Katakana</Badge>
			{/if}
		</div>
		<Card.Description>
			{finished ? `Acertaste ${correctCount} de ${QUESTION_LIMIT} preguntas.` : info.description}
		</Card.Description>
	</Card.Header>

	<Card.Content
		class="flex min-h-80 flex-col justify-center gap-6"
		{@attach quizTimer(mode, quizLocked, quizSerial, finished)}
	>
		{#if finished}
			<div class="flex flex-col items-center gap-4 py-6 text-center">
				<p class="text-5xl font-semibold tabular-nums">{correctCount} / {QUESTION_LIMIT}</p>
				<Button onclick={restartRound}>
					<RefreshCcwIcon data-icon="inline-start" />
					Nueva ronda
				</Button>
			</div>
		{:else if mode === 'quiz'}
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
					{quizPrompt === 'kana'
						? kanaCharacter(quizTarget.kana, quizTarget.script)
						: quizTarget.kana.romaji}
				</p>
			</div>
			<div class="grid grid-cols-2 gap-3">
				{#each quizOptions as option (option.key)}
					<Button
						variant="outline"
						class="h-16 text-lg"
						disabled={quizLocked}
						onclick={() => answerQuiz(option)}
					>
						{quizPrompt === 'kana' ? option.kana.romaji : kanaCharacter(option.kana, option.script)}
					</Button>
				{/each}
			</div>
		{:else if mode === 'listen'}
			<div class="flex flex-col items-center gap-3 rounded-md border border-dashed p-4 text-center">
				<VolumeXIcon class="size-7 text-muted-foreground" aria-hidden="true" />
				<div>
					<p class="font-medium">Audio no disponible todavía</p>
					<p class="text-sm text-muted-foreground">
						Referencia temporal en romaji: <strong>{listenTarget.kana.romaji}</strong>
					</p>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-3">
				{#each listenOptions as option (option.key)}
					<Button
						variant="outline"
						class="h-16 text-2xl"
						disabled={listenLocked}
						onclick={() => answerListen(option)}
					>
						{kanaCharacter(option.kana, option.script)}
					</Button>
				{/each}
			</div>
		{:else if mode === 'draw'}
			<div class="grid items-start gap-5 sm:grid-cols-[1fr_18rem]">
				<div class="flex flex-col items-center justify-center gap-2 py-6 text-center">
					<p class="text-sm text-muted-foreground">Dibuja el kana de</p>
					<p class="text-4xl font-semibold">{drawTarget.kana.romaji}</p>
					<Badge variant="outline">
						{drawTarget.script === 'hiragana' ? 'Hiragana' : 'Katakana'}
					</Badge>
				</div>
				<div class="mx-auto w-full max-w-72">
					{#key drawTarget.key}
						<KanaWritingPad
							character={kanaCharacter(drawTarget.kana, drawTarget.script)}
							showGuide={false}
							showIndicators={false}
							showCheckButton={false}
							autoCheck
							gradeAnimation={feedback?.kind === 'correct'
								? 'correct'
								: feedback?.kind === 'wrong'
									? 'incorrect'
									: null}
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
							{wordForScript(option, wordScript)}
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
					{#each pairKana as tile (tile.key)}
						<Button
							variant={selectedPairKana === tile.key ? 'secondary' : 'outline'}
							class={cn('h-12 text-xl', matchedPairs.has(tile.key) && 'opacity-45')}
							disabled={matchedPairs.has(tile.key)}
							aria-pressed={selectedPairKana === tile.key}
							onclick={() => selectPair('kana', tile.key)}>{tile.label}</Button
						>
					{/each}
				</div>
				<div class="grid gap-2" aria-label="Romaji">
					{#each pairRomaji as tile (tile.key)}
						<Button
							variant={selectedPairRomaji === tile.key ? 'secondary' : 'outline'}
							class={cn('h-12', matchedPairs.has(tile.key) && 'opacity-45')}
							disabled={matchedPairs.has(tile.key)}
							aria-pressed={selectedPairRomaji === tile.key}
							onclick={() => selectPair('romaji', tile.key)}>{tile.label}</Button
						>
					{/each}
				</div>
			</div>
		{:else if mode === 'writing'}
			<div class="flex flex-col items-center gap-2 text-center">
				<div class="text-6xl font-medium">
					{kanaCharacter(writingTarget.kana, writingTarget.script)}
				</div>
				<Badge variant="outline">
					{writingTarget.script === 'hiragana' ? 'Hiragana' : 'Katakana'}
				</Badge>
			</div>
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

	{#if !finished}
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
			<span class="text-xs text-muted-foreground tabular-nums">
				Pregunta {questionNumber} de {QUESTION_LIMIT}
			</span>
		</Card.Footer>
	{/if}
</Card.Root>
