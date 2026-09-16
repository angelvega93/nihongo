<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { DictionarySentence } from '$lib/server/services/dictionary/dictionary';

	let {
		sentence,
		position,
		href,
		active = false
	}: { sentence: DictionarySentence; position: number; href: string; active?: boolean } = $props();

	/** The Spanish translation is the most useful preview for this app's users. */
	const preview = $derived(sentence.translations?.spa ?? sentence.translations?.eng ?? '');
</script>

<a
	{href}
	aria-current={active ? 'true' : undefined}
	class="flex items-start gap-3 rounded-xl border p-3 transition-colors {active
		? 'border-primary/40 bg-primary/5'
		: 'border-transparent hover:border-border hover:bg-accent/40'}"
>
	<span class="mt-1 w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
		{position}
	</span>

	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<p lang="ja" class="line-clamp-2 font-serif text-base leading-snug">{sentence.japanese}</p>
		<div class="flex flex-wrap items-center gap-1.5">
			<Badge variant="secondary" class="h-5 shrink-0 px-1.5 text-[0.65rem] font-normal">
				Oración
			</Badge>
			{#if preview}
				<span class="line-clamp-1 text-xs text-muted-foreground">{preview}</span>
			{/if}
		</div>
	</div>
</a>
