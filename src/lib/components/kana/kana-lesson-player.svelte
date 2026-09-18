<script lang="ts">
	import KanaQuiz from '$lib/components/kana/kana-quiz.svelte';
	import KanaStrokeViewer from '$lib/components/kana-stroke-viewer.svelte';
	import KanaWritingPad from '$lib/components/kana-writing-pad.svelte';
	import LessonContent from '$lib/components/lesson-content.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { kanaById, kanaCharacter } from '$lib/kana/data.js';
	import type { KanaLesson } from '$lib/kana/lessons.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SkipForwardIcon from '@lucide/svelte/icons/skip-forward';

	type Props = {
		lesson: KanaLesson;
		/** Whether the lesson was already completed on a previous visit. */
		completed?: boolean;
		/** Called for every graded kana the user answers or draws. */
		onattempt?: (kanaId: string, correct: boolean) => void;
		/** Called when the last step is reached. */
		oncomplete?: () => void;
	};

	let { lesson, completed = false, onattempt, oncomplete }: Props = $props();

	let index = $state(0);
	let drawGrade = $state<'correct' | 'incorrect' | null>(null);
	let drawHint = $state('');
	let roundKey = $state(0);
	let pad = $state<{ check: () => boolean | null } | null>(null);
	let gradeTimer: ReturnType<typeof setTimeout> | undefined;

	const step = $derived(lesson.steps[index]);
	const total = $derived(lesson.steps.length);
	const progress = $derived(total === 0 ? 0 : Math.round(((index + 1) / total) * 100));
	const isLast = $derived(index >= total - 1);

	const stepCharacter = $derived.by(() => {
		if (!step || (step.kind !== 'teach' && step.kind !== 'draw') || !lesson.script) return '';
		const kana = kanaById(step.kanaId);
		return kana ? kanaCharacter(kana, lesson.script) : '';
	});

	function clearGradeTimer() {
		if (gradeTimer !== undefined) {
			clearTimeout(gradeTimer);
			gradeTimer = undefined;
		}
	}

	function advance() {
		clearGradeTimer();
		if (isLast) {
			oncomplete?.();
			return;
		}
		index += 1;
		drawGrade = null;
		drawHint = '';
		roundKey += 1;
	}

	function repeatStep() {
		clearGradeTimer();
		drawGrade = null;
		drawHint = '';
		roundKey += 1;
	}

	/** Grade the drawing when the user presses Continuar on a draw step. */
	function handleDrawContinue() {
		if (step?.kind !== 'draw') return;
		const result = pad?.check() ?? null;

		clearGradeTimer();

		// The canvas is not ready: just move on without grading.
		if (result === null) {
			advance();
			return;
		}

		drawGrade = result ? 'correct' : 'incorrect';
		onattempt?.(step.kanaId, result);

		if (result) {
			// Let the green animation play, then move on automatically.
			drawHint = '';
			gradeTimer = setTimeout(advance, 750);
			return;
		}

		// Show the red animation, then let the user continue anyway.
		drawHint = 'Puedes continuar igualmente.';
		gradeTimer = setTimeout(advance, 1100);
	}
</script>

<div class="space-y-5">
	<div class="space-y-2">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<Badge variant="outline">Paso {index + 1} de {total}</Badge>
				{#if completed}
					<Badge variant="secondary" class="bg-emerald-100 text-emerald-700">
						<CheckIcon class="size-3" />
						Completada
					</Badge>
				{/if}
			</div>
			<Button variant="ghost" size="sm" onclick={repeatStep}>
				<RotateCcwIcon data-icon="inline-start" />
				Repetir paso
			</Button>
		</div>
		<Progress value={progress} class="h-1.5" />
	</div>

	{#key `${index}-${roundKey}`}
		{#if step?.kind === 'info'}
			<Card.Root>
				<Card.Header>
					<Card.Title>{lesson.title}</Card.Title>
					<Card.Description>{lesson.description}</Card.Description>
				</Card.Header>
				<Card.Content>
					<LessonContent blocks={step.blocks} />
				</Card.Content>
			</Card.Root>
		{:else if step?.kind === 'teach'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Mira el orden de trazos</Card.Title>
					<Card.Description>
						Observa cómo se escribe <span class="font-serif text-lg">{stepCharacter}</span> antes de dibujarlo.
					</Card.Description>
				</Card.Header>
				<Card.Content class="mx-auto w-full max-w-72">
					<KanaStrokeViewer character={stepCharacter} />
				</Card.Content>
			</Card.Root>
		{:else if step?.kind === 'draw'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Dibuja el kana</Card.Title>
					<Card.Description>
						Traza <span class="font-serif text-lg">{stepCharacter}</span> en el lienzo y pulsa Continuar
						para comprobarlo.
					</Card.Description>
				</Card.Header>
				<Card.Content class="mx-auto w-full max-w-72">
					<KanaWritingPad
						bind:this={pad}
						character={stepCharacter}
						showGuide={false}
						showProgress={false}
						showCheckButton={false}
						gradeAnimation={drawGrade}
						evaluationMode="deferred"
					/>
				</Card.Content>
			</Card.Root>
		{:else if step?.kind === 'quiz'}
			<KanaQuiz
				questions={step.questions}
				onanswer={(kanaId, correct) => onattempt?.(kanaId, correct)}
				onfinished={advance}
			/>
		{/if}
	{/key}

	{#if step?.kind !== 'quiz'}
		<div class="flex flex-wrap items-center justify-between gap-3">
			{#if step?.kind === 'draw'}
				<div class="flex items-center gap-3">
					<Button variant="ghost" onclick={advance}>
						<SkipForwardIcon data-icon="inline-start" />
						Saltar dibujo
					</Button>
					{#if drawHint}
						<p class="text-xs text-muted-foreground">{drawHint}</p>
					{/if}
				</div>
			{:else}
				<span></span>
			{/if}
			<Button onclick={step?.kind === 'draw' ? handleDrawContinue : advance}>
				{step?.kind === 'draw' ? 'Continuar' : isLast ? 'Terminar lección' : 'Siguiente'}
				<ArrowRightIcon data-icon="inline-end" />
			</Button>
		</div>
	{/if}
</div>
