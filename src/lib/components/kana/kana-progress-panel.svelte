<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { KANA_SCRIPTS, type KanaScript } from '$lib/kana/data.js';
	import {
		KanaMastery,
		masteryClasses,
		masteryLabel,
		summarizeProgress,
		type KanaProgressMap
	} from '$lib/kana/progress.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		progress: KanaProgressMap;
		/** Restrict the summary to a single script; omit for both. */
		script?: KanaScript;
		class?: string;
	};

	let { progress, script, class: className }: Props = $props();

	const summary = $derived(summarizeProgress(progress));

	const perScript = $derived(
		KANA_SCRIPTS.map((entry) => {
			const rows = Object.values(progress).filter((row) => row.script === entry.id);
			const mastered = rows.filter((row) => row.mastery === KanaMastery.Mastered).length;
			const learning = rows.filter((row) => row.mastery === KanaMastery.Learning).length;
			return { ...entry, mastered, learning };
		})
	);

	const legend = [
		{ mastery: KanaMastery.New, label: masteryLabel(KanaMastery.New) },
		{ mastery: KanaMastery.Learning, label: masteryLabel(KanaMastery.Learning) },
		{ mastery: KanaMastery.Mastered, label: masteryLabel(KanaMastery.Mastered) }
	];
</script>

<Card.Root class={className}>
	<Card.Header>
		<div class="flex items-center justify-between gap-3">
			<Card.Title>Tu progreso</Card.Title>
			<Badge variant="secondary">{summary.percent}%</Badge>
		</div>
		<Card.Description>
			{summary.mastered} de {summary.total} kana dominados
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<Progress value={summary.percent} max={100} aria-label="Progreso de kana dominados" />

		<div class="grid grid-cols-3 gap-2 text-center">
			<div class="rounded-md border p-2">
				<p class="text-lg font-medium tabular-nums">{summary.mastered}</p>
				<p class="text-xs text-muted-foreground">Dominados</p>
			</div>
			<div class="rounded-md border p-2">
				<p class="text-lg font-medium tabular-nums">{summary.learning}</p>
				<p class="text-xs text-muted-foreground">En progreso</p>
			</div>
			<div class="rounded-md border p-2">
				<p class="text-lg font-medium tabular-nums">{summary.new}</p>
				<p class="text-xs text-muted-foreground">Nuevos</p>
			</div>
		</div>

		{#if !script}
			<div class="flex flex-col gap-2">
				{#each perScript as entry (entry.id)}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">{entry.label}</span>
						<span class="tabular-nums"
							>{entry.mastered} dominados · {entry.learning} en progreso</span
						>
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
			{#each legend as entry (entry.mastery)}
				<span class="flex items-center gap-1.5">
					<span class={cn('size-3 rounded-sm border', masteryClasses(entry.mastery))}></span>
					{entry.label}
				</span>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
