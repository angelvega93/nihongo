<script lang="ts">
	import FuriganaText from '$lib/components/furigana-text.svelte';
	import InfoIcon from '@lucide/svelte/icons/info';
	import type { LessonContentBlock } from '$lib/types/course';

	let { blocks }: { blocks: LessonContentBlock[] } = $props();
</script>

<div class="space-y-4">
	{#each blocks as block, i (i)}
		{#if block.type === 'heading'}
			<h2 class="font-serif text-xl font-medium">{block.text}</h2>
		{:else if block.type === 'paragraph'}
			<p class="text-sm/relaxed text-muted-foreground">{block.text}</p>
		{:else if block.type === 'example'}
			<div class="space-y-1 rounded-lg bg-muted/50 p-4">
				<p class="text-lg font-medium">
					{#if block.furigana}
						<FuriganaText text={block.furigana} />
					{:else}
						{block.japanese}
					{/if}
				</p>
				<p class="text-sm text-muted-foreground">{block.meaning}</p>
			</div>
		{:else}
			<div class="flex items-start gap-2 rounded-lg bg-orange-100/60 p-3 text-xs text-orange-800">
				<InfoIcon class="mt-0.5 size-3.5 shrink-0" />
				<span>{block.text}</span>
			</div>
		{/if}
	{/each}
</div>
