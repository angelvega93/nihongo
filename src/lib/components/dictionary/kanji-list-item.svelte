<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { DictionaryKanji } from '$lib/server/services/dictionary/dictionary';

	let {
		kanji,
		position,
		href,
		active = false
	}: { kanji: DictionaryKanji; position: number; href: string; active?: boolean } = $props();

	/** Two meanings are enough for the list; the detail pane shows them all. */
	const preview = $derived(
		(kanji.meanings?.spa?.length ? kanji.meanings.spa : (kanji.meanings?.eng ?? [])).slice(0, 2)
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

	<div class="flex min-w-0 flex-1 items-start gap-3">
		<span
			lang="ja"
			class="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 font-serif text-2xl leading-none text-primary"
		>
			{kanji.char}
		</span>
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<div class="flex flex-wrap items-center gap-1.5">
				<Badge variant="secondary" class="h-5 shrink-0 px-1.5 text-[0.65rem] font-normal">
					Kanji
				</Badge>
				{#if kanji.strokes}
					<span class="text-xs text-muted-foreground">{kanji.strokes} trazos</span>
				{/if}
			</div>
			{#if preview.length > 0}
				<p class="line-clamp-1 text-xs text-muted-foreground">{preview.join(', ')}</p>
			{/if}
		</div>
	</div>
</a>
