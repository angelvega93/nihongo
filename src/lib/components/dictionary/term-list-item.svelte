<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { DictionaryTerm } from '$lib/server/services/dictionary/dictionary';

	let {
		term,
		position,
		href,
		active = false
	}: { term: DictionaryTerm; position: number; href: string; active?: boolean } = $props();

	/** The reading to show above the headword, when it differs from it. */
	const reading = $derived(term.readingsText.find((text) => text !== term.headword) ?? '');

	/** The first sense's gloss, which is enough for a one-line preview. */
	const preview = $derived(
		(term.senses[0]?.glosses?.spa?.length
			? term.senses[0].glosses.spa
			: (term.senses[0]?.glosses?.eng ?? [])
		).join(', ')
	);
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
		<div class="flex items-baseline gap-2">
			{#if reading}
				<span lang="ja" class="text-[0.7rem] text-muted-foreground">{reading}</span>
			{/if}
		</div>
		<p lang="ja" class="font-serif text-lg leading-tight">{term.headword}</p>
		<div class="flex flex-wrap items-center gap-1.5">
			<Badge variant="secondary" class="h-5 shrink-0 px-1.5 text-[0.65rem] font-normal">
				Palabra
			</Badge>
			{#if preview}
				<span class="line-clamp-1 text-xs text-muted-foreground">{preview}</span>
			{/if}
		</div>
	</div>
</a>
