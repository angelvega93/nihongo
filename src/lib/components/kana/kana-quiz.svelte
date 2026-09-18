<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import type { KanaQuizQuestion } from '$lib/kana/lessons.js';

	type Props = {
		questions: KanaQuizQuestion[];
		/** Called once per answered question with the target kana and the outcome. */
		onanswer?: (kanaId: string, correct: boolean) => void;
		/** Called after the last question is answered and confirmed. */
		onfinished?: () => void;
	};

	let { questions, onanswer, onfinished }: Props = $props();

	let index = $state(0);
	let selectedOptionId = $state<number | null>(null);
	let graded = $state(false);
	let autoTimer: ReturnType<typeof setTimeout> | undefined;

	/** Short pause so the user can see whether the answer was right. */
	const AUTO_ADVANCE_MS = 1000;

	const question = $derived(questions[index]);
	const isLast = $derived(index >= questions.length - 1);
	const selectedCorrect = $derived(
		graded && selectedOptionId !== null && selectedOptionId === question?.correctOptionId
	);
	const answered = $derived(graded ? index + 1 : index);
	const percent = $derived(
		questions.length === 0 ? 0 : Math.round((answered / questions.length) * 100)
	);

	function clearAutoTimer() {
		if (autoTimer !== undefined) {
			clearTimeout(autoTimer);
			autoTimer = undefined;
		}
	}

	// Drop any pending advance when the quiz is unmounted (e.g. step change).
	$effect(() => {
		return () => {
			if (autoTimer !== undefined) clearTimeout(autoTimer);
		};
	});

	function optionClass(optionId: number) {
		if (!graded) return 'border-border bg-background hover:bg-muted/50';
		if (optionId === question.correctOptionId) return 'border-emerald-400 bg-emerald-50';
		if (optionId === selectedOptionId) return 'border-rose-400 bg-rose-50';
		return 'border-border bg-background opacity-60';
	}

	function selectOption(optionId: number) {
		if (graded) return;
		selectedOptionId = optionId;
		graded = true;
		onanswer?.(question.kanaId, optionId === question.correctOptionId);

		clearAutoTimer();
		autoTimer = setTimeout(next, AUTO_ADVANCE_MS);
	}

	function next() {
		clearAutoTimer();
		if (!isLast) {
			index += 1;
			selectedOptionId = null;
			graded = false;
			return;
		}
		onfinished?.();
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<Card.Title>Prueba rápida</Card.Title>
			<Badge variant="secondary">{index + 1} / {questions.length}</Badge>
		</div>
		<Progress value={percent} class="h-1.5" />
	</Card.Header>
	<Card.Content class="space-y-5">
		{#if question}
			<div class="space-y-1 text-center">
				<p class="text-sm text-muted-foreground">{question.prompt}</p>
				<p
					class="font-serif text-5xl leading-tight"
					lang={question.kind === 'kana-to-romaji' ? 'ja' : undefined}
				>
					{question.display}
				</p>
			</div>

			<div class="grid gap-2" role="group" aria-label="Opciones">
				{#each question.options as option (option.id)}
					<button
						type="button"
						class="flex items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-default {optionClass(
							option.id
						)}"
						disabled={graded}
						aria-pressed={selectedOptionId === option.id}
						onclick={() => selectOption(option.id)}
					>
						<span class={question.kind === 'romaji-to-kana' ? 'font-serif text-2xl' : 'text-base'}
							>{option.label}</span
						>
						{#if graded && option.id === question.correctOptionId}
							<CheckIcon class="size-4 shrink-0 text-emerald-600" />
						{:else if graded && option.id === selectedOptionId}
							<XIcon class="size-4 shrink-0 text-rose-600" />
						{/if}
					</button>
				{/each}
			</div>

			<div class="flex items-center justify-between gap-3">
				<p class="text-sm font-medium" aria-live="polite">
					{#if graded}
						{selectedCorrect ? '¡Correcto!' : 'Casi. La respuesta correcta está marcada.'}
					{:else}
						Elige una opción.
					{/if}
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
