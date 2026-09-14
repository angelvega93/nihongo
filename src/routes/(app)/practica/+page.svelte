<script lang="ts">
	import { enhance } from "$app/forms";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Progress } from "$lib/components/ui/progress/index.js";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Empty from "$lib/components/ui/empty/index.js";
	import { Kbd } from "$lib/components/ui/kbd/index.js";
	import FuriganaText from "$lib/components/furigana-text.svelte";
	import PartyPopperIcon from "@lucide/svelte/icons/party-popper";
	import { fsrs, Rating, show_diff_message, type Card as FsrsCard, type Grade } from "ts-fsrs";
	import { untrack } from "svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	type DueCard = (typeof data.dueCards)[number];

	let queue = $state<DueCard[]>(untrack(() => [...data.dueCards]));
	const total = untrack(() => data.dueCards.length);
	let revealed = $state(false);
	let shownAt = $state(Date.now());
	let submitting = $state(false);
	let errorMessage = $state("");

	const current = $derived(queue[0]);
	const remaining = $derived(queue.length);
	const done = $derived(remaining === 0);

	const f = fsrs();

	function toFsrsCard(row: DueCard): FsrsCard {
		return {
			due: new Date(row.due),
			stability: row.stability,
			difficulty: row.difficulty,
			elapsed_days: row.elapsedDays,
			scheduled_days: row.scheduledDays,
			learning_steps: 0,
			reps: row.reps,
			lapses: row.lapses,
			state: row.state,
			last_review: row.lastReview ? new Date(row.lastReview) : undefined
		};
	}

	const preview = $derived(current ? f.repeat(toFsrsCard(current), new Date()) : undefined);

	const gradeButtons = [
		{ grade: Rating.Again, label: "Otra vez", class: "bg-rose-600 hover:bg-rose-500", key: "1" },
		{ grade: Rating.Hard, label: "Difícil", class: "bg-amber-500 hover:bg-amber-400", key: "2" },
		{ grade: Rating.Good, label: "Bien", class: "bg-sky-600 hover:bg-sky-500", key: "3" },
		{ grade: Rating.Easy, label: "Fácil", class: "bg-emerald-600 hover:bg-emerald-500", key: "4" }
	] as const;

	function intervalLabel(grade: Grade) {
		if (!preview) return "";
		const item = preview[grade];
		return show_diff_message(item.card.due, item.card.last_review as Date, true);
	}

	function reveal() {
		revealed = true;
	}

	function nextCard() {
		queue = queue.slice(1);
		revealed = false;
		shownAt = Date.now();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!current) return;
		if (!revealed && event.code === "Space") {
			event.preventDefault();
			reveal();
			return;
		}
		if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
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
		<Badge variant="secondary">{total - remaining + 1} / {total}</Badge>
	{/if}
</header>

<div class="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
	{#if total > 0}
		<Progress value={total - remaining} max={total} />
	{/if}

	{#if done}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<PartyPopperIcon />
				</Empty.Media>
				<Empty.Title>{total > 0 ? "¡Sesión completa!" : "No hay tarjetas pendientes"}</Empty.Title>
				<Empty.Description>
					{total > 0
						? "Repasaste todas las tarjetas que tenías pendientes por hoy."
						: "Vuelve más tarde o inicializa nuevas tarjetas desde el resumen."}
				</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/">Volver al resumen</Button>
			</Empty.Content>
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
							errorMessage = "";
							formData.set("duration", String(Date.now() - shownAt));
							return async ({ result }) => {
								submitting = false;
								if (result.type === "success") {
									nextCard();
								} else if (result.type === "failure") {
									errorMessage = (result.data?.message as string) ?? "No se pudo guardar la respuesta.";
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
			{#if errorMessage}
				<p class="text-center text-sm text-destructive">{errorMessage}</p>
			{/if}
		{/if}
	{/if}
</div>
