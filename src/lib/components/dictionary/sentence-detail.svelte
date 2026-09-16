<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { DictionarySentence } from '$lib/server/services/dictionary/dictionary';

	let { sentence }: { sentence: DictionarySentence } = $props();

	/** Translations paired with their label, skipping locales without data. */
	const translations = $derived(
		[
			{ locale: 'Español', text: sentence.translations?.spa ?? '' },
			{ locale: 'Inglés', text: sentence.translations?.eng ?? '' }
		].filter((entry) => entry.text)
	);
</script>

<!-- `bg-card` is pure white in the light theme and dark in the dark theme. -->
<article
	class="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 text-card-foreground"
>
	<p lang="ja" class="font-serif text-2xl leading-relaxed">{sentence.japanese}</p>

	{#if translations.length > 0}
		<div class="flex flex-col gap-3 border-t border-border/60 pt-4">
			{#each translations as entry (entry.locale)}
				<div class="flex items-baseline gap-3">
					<Badge variant="outline" class="shrink-0 font-normal text-muted-foreground">
						{entry.locale}
					</Badge>
					<p class="min-w-0 flex-1 text-base text-muted-foreground">{entry.text}</p>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">Sin traducciones registradas.</p>
	{/if}

	<footer class="border-t border-border/60 pt-4">
		<Badge variant="outline" class="font-normal text-muted-foreground">
			Tatoeba · {sentence.id.replace('tatoeba:', '')}
		</Badge>
	</footer>
</article>
