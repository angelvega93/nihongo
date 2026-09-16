<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { fieldLabel, miscLabel, posLabel, sourceLabel } from '$lib/dictionary/labels';
	import type {
		DictionarySentence,
		DictionaryTerm
	} from '$lib/server/services/dictionary/dictionary';
	import PitchAccent from './pitch-accent.svelte';

	let { term, examples = [] }: { term: DictionaryTerm; examples?: DictionarySentence[] } = $props();

	const senses = $derived(term.senses.filter((sense) => sense.glosses.spa));
	const filteredExamples = $derived(examples.filter((example) => example.translations.spa));
	const readings = $derived(term.readingsText.filter((text) => text !== term.headword));
	const rank = $derived(
		term.frequencies.find((frequency) => frequency.text === term.headword)?.rank ?? null
	);

	const common = $derived(
		term.expressions.some((expression) => expression.common) || (rank !== null && rank <= 15000)
	);

	/**
	 * Forms are listed with their own frequency rank. The first entry is the
	 * term's main writing, so its rank is shown as the entry rank instead.
	 */
	const forms = $derived(
		term.frequencies.length > 0
			? term.frequencies
			: term.expressions.map((expression) => ({
					text: expression.text,
					reading: readings[0] ?? '',
					source: '',
					rank: 0
				}))
	);

	/** Every code attached to a sense, paired with its readable label. */
	function tags(sense: DictionaryTerm['senses'][number]) {
		return [
			...sense.partsOfSpeech.map((code) => ({ code, label: posLabel(code), tone: 'pos' as const })),
			...sense.fields.map((code) => ({ code, label: fieldLabel(code), tone: 'field' as const })),
			...sense.misc.map((code) => ({ code, label: miscLabel(code), tone: 'misc' as const }))
		];
	}
</script>

<!-- `bg-card` is pure white in the light theme and dark in the dark theme. -->
<article
	class="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 text-card-foreground"
>
	<header class="flex items-start justify-between gap-4">
		<div class="flex min-w-0 flex-col gap-1">
			<h2 lang="ja" class="font-serif text-3xl leading-tight">{term.headword}</h2>
			{#if term.pitch.length > 0}
				<PitchAccent kana={term.pitch[0].reading} downstep={term.pitch[0].downstep} />
			{/if}
		</div>
		{#if rank !== null}
			<span class="shrink-0 text-sm text-muted-foreground tabular-nums">
				#{rank.toLocaleString('es')}
			</span>
		{/if}
	</header>

	{#if common}
		<div class="flex flex-wrap items-center gap-2">
			{#if common}
				<Badge class="border-transparent bg-chart-4/25 text-foreground">Común</Badge>
			{/if}
		</div>
	{/if}

	<section class="flex flex-col gap-3">
		<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Significado</h3>
		<p class="text-xs text-muted-foreground">▾ {sourceLabel(term.dictionary)}</p>

		<ol class="flex flex-col gap-4">
			{#each senses as sense, index (index)}
				<li class="flex gap-3">
					<span
						class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border text-xs text-muted-foreground tabular-nums"
					>
						{index + 1}
					</span>
					<div class="flex min-w-0 flex-1 flex-col gap-1.5">
						{#if tags(sense).length > 0}
							<div class="flex flex-wrap gap-1.5">
								{#each tags(sense) as tag (tag.code)}
									<Badge
										variant="outline"
										class="font-normal {tag.tone === 'pos'
											? 'border-chart-2/40 bg-chart-2/15 text-foreground'
											: tag.tone === 'field'
												? 'border-chart-5/50 bg-chart-5/20 text-foreground'
												: 'bg-muted/60 text-muted-foreground'}"
									>
										{tag.label}
									</Badge>
								{/each}
							</div>
						{/if}
						<p class="text-base leading-relaxed">{sense.glosses.spa?.join('; ')}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>

	{#if forms.length > 0}
		<section class="flex flex-col gap-3 border-t border-border/60 pt-5">
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Formas</h3>
			<div class="flex flex-wrap gap-x-6 gap-y-3">
				{#each forms as form (form.text + form.reading)}
					<div class="flex flex-col items-center gap-1">
						<span lang="ja" class="font-serif text-2xl leading-none">{form.text}</span>
						{#if form.reading && form.reading !== form.text}
							<span lang="ja" class="text-xs text-muted-foreground">{form.reading}</span>
						{/if}
						{#if form.rank > 0}
							<span class="text-[0.65rem] text-muted-foreground tabular-nums">
								#{form.rank.toLocaleString('es')}
							</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if filteredExamples.length > 0}
		<section class="flex flex-col gap-3 border-t border-border/60 pt-5">
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ejemplos</h3>
			<ul class="flex flex-col gap-3">
				{#each filteredExamples as example (example.id)}
					<li class="flex flex-col gap-1">
						<p lang="ja" class="text-base">{example.japanese}</p>
						{example.translations.spa}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</article>
