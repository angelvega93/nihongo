<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { readingKindLabel } from '$lib/dictionary/labels';
	import type {
		DictionaryKanji,
		DictionarySentence
	} from '$lib/server/services/dictionary/dictionary';

	let { kanji, examples = [] }: { kanji: DictionaryKanji; examples?: DictionarySentence[] } =
		$props();

	/** Meanings in Spanish, falling back to English so the pane is never empty. */
	const meanings = $derived(
		kanji.meanings?.spa?.length ? kanji.meanings.spa : (kanji.meanings?.eng ?? [])
	);

	/** The other language's meanings, shown underneath when both are present. */
	const secondary = $derived(kanji.meanings?.spa?.length ? (kanji.meanings?.eng ?? []) : []);

	/** Chinese/Korean/Vietnamese readings, which are secondary for a learner. */
	const foreignReadings = $derived(
		[
			{ kind: 'pinyin', values: kanji.readings?.pinyin ?? [] },
			{ kind: 'korean_h', values: kanji.readings?.korean_h ?? [] },
			{ kind: 'vietnam', values: kanji.readings?.vietnam ?? [] }
		].filter((group) => group.values.length > 0)
	);
</script>

<!-- `bg-card` is pure white in the light theme and dark in the dark theme. -->
<article
	class="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 text-card-foreground"
>
	<header class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-2">
			<span
				lang="ja"
				class="grid size-20 place-items-center rounded-2xl bg-primary/10 font-serif text-5xl leading-none text-primary"
			>
				{kanji.char}
			</span>
			<h2 class="font-serif text-2xl leading-tight">{meanings[0] ?? kanji.char}</h2>
		</div>
		{#if kanji.strokes}
			<div class="shrink-0 text-right">
				<p class="text-xs text-muted-foreground uppercase">Trazos</p>
				<p class="font-serif text-3xl leading-tight tabular-nums">{kanji.strokes}</p>
			</div>
		{/if}
	</header>

	{#if meanings.length > 0}
		<section class="flex flex-col gap-3">
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Significado
			</h3>
			<div class="flex flex-col gap-1">
				<p class="text-base leading-relaxed">{meanings.join('; ')}</p>
				{#if secondary.length > 0}
					<p class="text-sm text-muted-foreground">{secondary.join('; ')}</p>
				{/if}
			</div>
		</section>
	{/if}

	{#if kanji.onReadings.length > 0 || kanji.kunReadings.length > 0}
		<section class="flex flex-col gap-3 border-t border-border/60 pt-5">
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Lecturas</h3>
			<div class="flex flex-col gap-3">
				{#if kanji.onReadings.length > 0}
					<div class="flex items-baseline gap-3">
						<span class="w-24 shrink-0 text-xs text-muted-foreground">
							{readingKindLabel('on')}
						</span>
						<p lang="ja" class="min-w-0 flex-1 font-serif text-lg">
							{kanji.onReadings.join('、')}
						</p>
					</div>
				{/if}
				{#if kanji.kunReadings.length > 0}
					<div class="flex items-baseline gap-3">
						<span class="w-24 shrink-0 text-xs text-muted-foreground">
							{readingKindLabel('kun')}
						</span>
						<p lang="ja" class="min-w-0 flex-1 font-serif text-lg">
							{kanji.kunReadings.join('、')}
						</p>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	{#if foreignReadings.length > 0}
		<section class="flex flex-col gap-3 border-t border-border/60 pt-5">
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Otras lenguas
			</h3>
			<div class="flex flex-col gap-2">
				{#each foreignReadings as group (group.kind)}
					<div class="flex items-baseline gap-3">
						<span class="w-24 shrink-0 text-xs text-muted-foreground">
							{readingKindLabel(group.kind)}
						</span>
						<p class="min-w-0 flex-1 text-sm">{group.values.join('、')}</p>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if examples.length > 0}
		<section class="flex flex-col gap-3 border-t border-border/60 pt-5">
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ejemplos</h3>
			<ul class="flex flex-col gap-3">
				{#each examples as example (example.id)}
					<li class="flex flex-col gap-1">
						<p lang="ja" class="text-base">{example.japanese}</p>
						{#if example.translations?.spa || example.translations?.eng}
							<p class="text-sm text-muted-foreground">
								{example.translations?.spa ?? example.translations?.eng}
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<footer class="border-t border-border/60 pt-5">
		<Badge variant="outline" class="font-normal text-muted-foreground">KANJIDIC</Badge>
	</footer>
</article>
