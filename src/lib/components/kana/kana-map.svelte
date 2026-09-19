<script lang="ts">
	import { kanaRowsForScript, kanaCharacter, type KanaScript } from '$lib/kana/data.js';
	import {
		KanaMastery,
		masteryClasses,
		masteryLabel,
		progressKey,
		type KanaProgressMap
	} from '$lib/kana/progress.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		script: KanaScript;
		progress: KanaProgressMap;
		/** Currently focused kana id, highlighted with a ring. */
		focused?: string | null;
		/** When provided, tiles become buttons that call this with the kana id. */
		onselect?: (kanaId: string) => void;
		class?: string;
	};

	let { script, progress, focused = null, onselect, class: className }: Props = $props();

	function masteryOf(kanaId: string) {
		return progress[progressKey(script, kanaId)]?.mastery ?? KanaMastery.New;
	}
</script>

<div class={cn('flex flex-col gap-3', className)}>
	{#each kanaRowsForScript(script) as row (row.id)}
		<div class="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-2">
			<span
				class="flex h-11 items-center justify-center rounded-md border text-xs text-muted-foreground"
			>
				{row.label}
			</span>
			<div class="grid grid-cols-5 gap-2">
				{#each row.kana as kana (kana.id)}
					{@const mastery = masteryOf(kana.id)}
					{@const character = kanaCharacter(kana, script)}
					{#if onselect}
						<button
							type="button"
							class={cn(
								'flex h-11 min-w-0 flex-col items-center justify-center rounded-md border transition-colors hover:bg-accent/60',
								masteryClasses(mastery),
								focused === kana.id && 'ring-2 ring-primary'
							)}
							aria-label={`${character}, ${kana.romaji}, ${masteryLabel(mastery)}`}
							onclick={() => onselect(kana.id)}
						>
							<span class="text-lg leading-none">{character}</span>
							<span class="text-[0.65rem] text-muted-foreground">{kana.romaji}</span>
						</button>
					{:else}
						<div
							class={cn(
								'flex h-11 min-w-0 flex-col items-center justify-center rounded-md border',
								masteryClasses(mastery),
								focused === kana.id && 'ring-2 ring-primary'
							)}
							title={`${character} · ${masteryLabel(mastery)}`}
						>
							<span class="text-lg leading-none">{character}</span>
							<span class="text-[0.65rem] text-muted-foreground">{kana.romaji}</span>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/each}
</div>
