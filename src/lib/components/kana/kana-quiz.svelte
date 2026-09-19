<script lang="ts">
	import { onDestroy } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import type { KanaQuizQuestion } from '$lib/kana/lessons.js';

	type Props = {
		question: KanaQuizQuestion;
		/** Called once the question is answered, with the target kana and outcome. */
		onanswer?: (kanaId: string, correct: boolean) => void;
		/** Called after the result is shown so the lesson can advance a step. */
		onfinished?: () => void;
	};

	let { question, onanswer, onfinished }: Props = $props();

	let selectedOptionId = $state<number | null>(null);
	let graded = $state(false);
	let autoTimer: ReturnType<typeof setTimeout> | undefined;

	/** Short pause so the user can see whether the answer was right. */
	const AUTO_ADVANCE_MS = 1000;

	const selectedCorrect = $derived(
		graded && selectedOptionId !== null && selectedOptionId === question.correctOptionId
	);

	function clearAutoTimer() {
		if (autoTimer !== undefined) {
			clearTimeout(autoTimer);
			autoTimer = undefined;
		}
	}

	// Drop any pending advance when the step changes or unmounts.
	onDestroy(clearAutoTimer);

	function optionClass(optionId: number) {
		if (!graded) return 'border-border bg-background hover:bg-muted/50';
		// Never reveal the correct answer on a wrong attempt.
		if (selectedCorrect && optionId === question.correctOptionId) {
			return 'border-emerald-400 bg-emerald-50';
		}
		if (optionId === selectedOptionId) return 'border-rose-400 bg-rose-50';
		return 'border-border bg-background opacity-60';
	}

	function selectOption(optionId: number) {
		if (graded) return;
		selectedOptionId = optionId;
		graded = true;
		onanswer?.(question.kanaId, optionId === question.correctOptionId);

		clearAutoTimer();
		autoTimer = setTimeout(() => {
			clearAutoTimer();
			onfinished?.();
		}, AUTO_ADVANCE_MS);
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Prueba rápida</Card.Title>
	</Card.Header>
	<Card.Content class="space-y-5">
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
					{#if graded && selectedCorrect && option.id === question.correctOptionId}
						<CheckIcon class="size-4 shrink-0 text-emerald-600" />
					{:else if graded && option.id === selectedOptionId}
						<XIcon class="size-4 shrink-0 text-rose-600" />
					{/if}
				</button>
			{/each}
		</div>

		<p class="text-sm font-medium" aria-live="polite">
			{#if graded}
				{selectedCorrect ? '¡Correcto!' : 'Casi.'}
			{:else}
				Elige una opción.
			{/if}
		</p>
	</Card.Content>
</Card.Root>
