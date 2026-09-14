<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Kbd } from '$lib/components/ui/kbd/index.js';
	import FuriganaText from '$lib/components/furigana-text.svelte';
	import PartyPopperIcon from '@lucide/svelte/icons/party-popper';
	import UndoIcon from '@lucide/svelte/icons/undo-2';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import { Rating, State, show_diff_message, type Grade } from 'ts-fsrs';
	import { rowToFsrsCard } from '$lib/fsrs/card';
	import { createReviewSnapshot } from '$lib/fsrs/preview';
	import { Ticker } from '$lib/hooks/ticker.svelte';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type DueCard = (typeof data.dueCards)[number];

	/** Payload returned by the `review` action. */
	type ReviewResult = {
		lid?: number;
		next_state?: number;
		next_due?: number;
		suspended?: boolean;
	};

	let queue = $state<DueCard[]>(untrack(() => [...data.dueCards]));
	const total = untrack(() => data.dueCards.length);
	let revealed = $state(false);
	let shownAt = $state(Date.now());
	let submitting = $state(false);
	let errorMessage = $state('');
	/** Id of the reminder card before the current one, enabling undo. */
	let lastCard = $state<DueCard>();
	/** Id of the review log created for `lastCard`, used to roll it back. */
	let lastLogId = $state<number>();
	/** Ticking clock so learning cards re-appear once their `due` is reached. */
	const clock = new Ticker();
	const now = $derived(clock.now);
	/** Number of cards that graduated out of the queue during this session. */
	let completed = $state(0);

	// A card becomes "due" when its scheduled date is reached. Learning and
	// Relearning cards are scheduled a few minutes ahead, so they stay in the
	// queue and come back automatically instead of being dropped.
	const current = $derived(queue.find((card) => card.due <= now));
	const remaining = $derived(queue.length);
	const done = $derived(remaining === 0);
	/** There are still cards, but none is due right now. */
	const waiting = $derived(!done && !current);
	const nextDue = $derived(waiting ? Math.min(...queue.map((card) => card.due)) : 0);

	/** Number of cards left in each FSRS state. Learning and Relearning are
	 * grouped together, since both represent short-term steps. */
	const stateCounts = $derived({
		new: queue.filter((card) => card.state === State.New).length,
		learning: queue.filter(
			(card) => card.state === State.Learning || card.state === State.Relearning
		).length,
		review: queue.filter((card) => card.state === State.Review).length
	});

	const snapshot = $derived(
		current ? createReviewSnapshot(rowToFsrsCard(current), current.deckFsrs) : undefined
	);
	const preview = $derived(snapshot?.preview);
	const dsr = $derived(snapshot?.DSR);

	// Only poll the clock while there is nothing left to review right now.
	$effect(() => {
		if (!waiting) return;
		clock.start();
		return () => clock.stop();
	});

	const gradeButtons = [
		{ grade: Rating.Again, label: 'Otra vez', class: 'bg-rose-600 hover:bg-rose-500', key: '1' },
		{ grade: Rating.Hard, label: 'Difícil', class: 'bg-amber-500 hover:bg-amber-400', key: '2' },
		{ grade: Rating.Good, label: 'Bien', class: 'bg-sky-600 hover:bg-sky-500', key: '3' },
		{ grade: Rating.Easy, label: 'Fácil', class: 'bg-emerald-600 hover:bg-emerald-500', key: '4' }
	] as const;

	function intervalLabel(grade: Grade) {
		if (!preview) return '';
		const item = preview[grade];
		return show_diff_message(item.card.due, item.card.last_review as Date, true);
	}

	function reveal() {
		revealed = true;
	}

	/**
	 * Apply the outcome of a review to the local queue.
	 *
	 * Cards in Learning/Relearning are scheduled a few minutes ahead by FSRS, so
	 * they are kept in the queue and re-appear once their `due` is reached.
	 * Cards that graduate to Review (or get suspended) leave the queue.
	 */
	function afterReview(result: ReviewResult) {
		const card = current;
		if (!card) return;

		lastCard = card;
		lastLogId = result.lid;

		const nextState = result.next_state;
		const staysInQueue =
			!result.suspended &&
			nextState !== undefined &&
			nextState !== State.Review &&
			nextState !== State.New;

		if (staysInQueue) {
			queue = queue
				.map((item) =>
					item.id === card.id
						? { ...item, state: nextState, due: result.next_due ?? item.due }
						: item
				)
				.sort((a, b) => a.due - b.due);
		} else {
			queue = queue.filter((item) => item.id !== card.id);
			completed += 1;
		}

		revealed = false;
		shownAt = Date.now();
		clock.start();
	}

	async function undo() {
		if (!lastCard) return;
		const formData = new FormData();
		formData.set('cardId', String(lastCard.id));
		formData.set('logId', String(lastLogId));
		const response = await fetch('?/undo', { method: 'POST', body: formData });
		const result = await response.json();
		if (result?.type === 'success') {
			queue = [lastCard, ...queue.filter((item) => item.id !== lastCard!.id)].sort(
				(a, b) => a.due - b.due
			);
			lastCard = undefined;
			lastLogId = undefined;
			revealed = false;
			shownAt = Date.now();
			clock.start();
		}
	}

	/** Time left until the next card becomes due, as a short label. */
	function waitLabel() {
		if (!nextDue) return '';
		const seconds = Math.max(0, Math.round((nextDue - now) / 1000));
		if (seconds < 60) return `${seconds}s`;
		return `${Math.ceil(seconds / 60)} min`;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!current) return;
		if (event.ctrlKey && event.key === 'z') {
			event.preventDefault();
			undo();
			return;
		}
		if (!revealed && event.code === 'Space') {
			event.preventDefault();
			reveal();
			return;
		}
		if (revealed && ['1', '2', '3', '4'].includes(event.key)) {
			const grade = Number(event.key) as Grade;
			const form = document.querySelector<HTMLFormElement>(`form[data-grade="${grade}"]`);
			form?.requestSubmit();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<header class="flex items-center justify-between gap-4 border-b px-6 py-3">
	<div class="flex items-center gap-2">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-1 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/" class="text-muted-foreground">Learning space</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>Práctica</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
	{#if !done}
		<div class="flex items-center gap-2">
			<Badge variant="outline">
				Nuevas: <span class="font-medium text-foreground">{stateCounts.new}</span>
			</Badge>
			<Badge variant="outline">
				Aprendiendo: <span class="font-medium text-foreground">{stateCounts.learning}</span>
			</Badge>
			<Badge variant="outline">
				Revisión: <span class="font-medium text-foreground">{stateCounts.review}</span>
			</Badge>
			<Badge variant="secondary">{completed + (current ? 1 : 0)} / {total}</Badge>
		</div>
	{/if}
</header>

<div class="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
	{#if total > 0}
		<Progress value={completed} max={total} />
	{/if}

	{#if done}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<PartyPopperIcon />
				</Empty.Media>
				<Empty.Title>{total > 0 ? '¡Sesión completa!' : 'No hay tarjetas pendientes'}</Empty.Title>
				<Empty.Description>
					{total > 0
						? 'Repasaste todas las tarjetas que tenías pendientes por hoy.'
						: 'Vuelve más tarde o inicializa nuevas tarjetas desde el resumen.'}
				</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/">Volver al resumen</Button>
			</Empty.Content>
		</Empty.Root>
	{:else if waiting}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<ClockIcon />
				</Empty.Media>
				<Empty.Title>Tarjetas en aprendizaje</Empty.Title>
				<Empty.Description>
					La siguiente tarjeta estará lista en {waitLabel()}. Las tarjetas nuevas se programan unos
					minutos después de fallarlas para reforzar la memoria.
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else if current}
		<Card.Root class="min-h-80 justify-center">
			<Card.Content class="flex flex-col items-center gap-6 text-center">
				<div class="space-y-2">
					<p class="text-4xl font-medium">
						<FuriganaText text={current.metadata.word_furigana} />
					</p>
					<p class="text-sm text-muted-foreground">{current.metadata.word_reading}</p>
				</div>

				{#if revealed}
					<div class="w-full space-y-4 border-t pt-6">
						<p class="text-lg font-medium">{current.metadata.word_meaning}</p>
						{#each current.metadata.word_sentences as sentence, i (i)}
							<div class="space-y-1 rounded-lg bg-muted/50 p-4 text-left">
								<p class="text-base"><FuriganaText text={sentence.furigana} /></p>
								<p class="text-sm text-muted-foreground">{sentence.meaning}</p>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		{#if dsr}
			<div class="flex items-center justify-center gap-6 text-xs text-muted-foreground">
				<span>Dificultad <span class="font-medium text-foreground">{dsr.D.toFixed(2)}</span></span>
				<span>Estabilidad <span class="font-medium text-foreground">{dsr.S.toFixed(2)}d</span></span
				>
				<span>Retención <span class="font-medium text-foreground">{dsr.R}</span></span>
			</div>
		{/if}

		{#if !revealed}
			<Button size="lg" class="w-full" onclick={reveal}>
				Mostrar respuesta
				<Kbd>Space</Kbd>
			</Button>
		{:else}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each gradeButtons as { grade, label, class: className, key } (grade)}
					<form
						method="post"
						action="?/review"
						data-grade={grade}
						use:enhance={({ formData }) => {
							submitting = true;
							errorMessage = '';
							formData.set('duration', String(Date.now() - shownAt));
							return async ({ result }) => {
								submitting = false;
								if (result.type === 'success') {
									afterReview(result.data as ReviewResult);
								} else if (result.type === 'failure') {
									errorMessage =
										(result.data?.message as string) ?? 'No se pudo guardar la respuesta.';
								}
							};
						}}
					>
						<input type="hidden" name="cardId" value={current.id} />
						<input type="hidden" name="grade" value={grade} />
						<Button
							type="submit"
							disabled={submitting}
							class={`flex h-auto w-full flex-col gap-1 py-3 text-white ${className}`}
						>
							<span class="flex items-center gap-1.5">
								{label}
								<Kbd>{key}</Kbd>
							</span>
							<span class="text-xs opacity-90">{intervalLabel(grade)}</span>
						</Button>
					</form>
				{/each}
			</div>
			{#if lastCard && lastLogId}
				<div class="flex justify-center">
					<Button variant="ghost" size="sm" onclick={undo}>
						<UndoIcon data-icon="inline-start" />
						Deshacer último repaso
						<Kbd>Ctrl+Z</Kbd>
					</Button>
				</div>
			{/if}
			{#if errorMessage}
				<p class="text-center text-sm text-destructive">{errorMessage}</p>
			{/if}
		{/if}
	{/if}
</div>
