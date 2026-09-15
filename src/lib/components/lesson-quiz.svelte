<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import type { LessonQuiz, QuizResult } from '$lib/types/course';

	/**
	 * `result` comes from the server action. It is exposed as writable derived
	 * state so the quiz can be reset locally on retry; the override is dropped
	 * automatically whenever a new `result` arrives.
	 */
	let { quiz, result }: { quiz: LessonQuiz; result?: QuizResult } = $props();

	let submitting = $state(false);
	let gradedResult = $derived(result);

	/** Graded outcome per question, if the quiz has already been submitted. */
	const graded = $derived(
		new Map((gradedResult?.questions ?? []).map((item) => [item.questionId, item]))
	);

	/** Radio styling that reflects correctness once the quiz is graded. */
	function optionClass(questionId: number, optionId: number) {
		const item = graded.get(questionId);
		if (!item) return 'border-border bg-background hover:bg-muted/50';
		if (optionId === item.correctOptionId) return 'border-emerald-400 bg-emerald-50';
		if (optionId === item.selectedOptionId) return 'border-rose-400 bg-rose-50';
		return 'border-border bg-background opacity-60';
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<Card.Title>Comprueba tu comprensión</Card.Title>
			{#if gradedResult}
				<Badge variant="secondary">{gradedResult.score} / {gradedResult.total}</Badge>
			{/if}
		</div>
		<Card.Description>
			{quiz.questions.length} pregunta{quiz.questions.length === 1 ? '' : 's'} de opción múltiple.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form
			method="post"
			action="?/grade"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
			class="space-y-6"
		>
			{#each quiz.questions as question, index (question.id)}
				{@const item = graded.get(question.id)}
				<fieldset class="space-y-3">
					<legend class="flex items-start gap-2 text-sm font-medium">
						<span class="text-muted-foreground tabular-nums">{index + 1}.</span>
						<span>{question.prompt}</span>
						{#if item}
							{#if item.correct}
								<CheckIcon class="mt-0.5 size-4 shrink-0 text-emerald-600" />
							{:else}
								<XIcon class="mt-0.5 size-4 shrink-0 text-rose-600" />
							{/if}
						{/if}
					</legend>

					<div class="grid gap-2">
						{#each question.options as option (option.id)}
							<label
								class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors {optionClass(
									question.id,
									option.id
								)}"
							>
								<input
									type="radio"
									name={`answer_${question.id}`}
									value={option.id}
									checked={item?.selectedOptionId === option.id}
									disabled={Boolean(gradedResult)}
									required
									class="size-4 accent-orange-500"
								/>
								<span>{option.label}</span>
							</label>
						{/each}
					</div>
				</fieldset>
			{/each}

			<div class="flex items-center justify-between gap-3">
				{#if gradedResult}
					<p class="text-sm font-medium">
						{#if gradedResult.score === gradedResult.total}
							¡Perfecto! Respondiste todo correctamente.
						{:else}
							Acertaste {gradedResult.score} de {gradedResult.total}.
						{/if}
					</p>
					<Button type="button" variant="outline" onclick={() => (gradedResult = undefined)}>
						Intentar de nuevo
					</Button>
				{:else}
					<p class="text-xs text-muted-foreground">Elige una opción por pregunta.</p>
					<Button type="submit" disabled={submitting}>
						{submitting ? 'Corrigiendo…' : 'Comprobar respuestas'}
					</Button>
				{/if}
			</div>
		</form>
	</Card.Content>
</Card.Root>
