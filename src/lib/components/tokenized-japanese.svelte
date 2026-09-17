<script lang="ts">
	import type { JapaneseToken, TokenCategory } from '$lib/japanese/furigana';
	import { tokenizeJapanese } from '$lib/japanese/tokenize.remote';
	import { cn } from '$lib/utils';
	import { State } from 'ts-fsrs';

	let {
		text,
		furigana = true,
		showWordBounds = true,
		colorByPos = false,
		size = 'md',
		class: className,
		onselect
	}: {
		/** Raw japanese text to segment. */
		text: string;
		/** Render readings above the kanji. */
		furigana?: boolean;
		/** Give each word its own subtle chip, so the split is visible. */
		showWordBounds?: boolean;
		/** Tint each word by its part of speech. */
		colorByPos?: boolean;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		/** Called when a word is clicked, e.g. to open a dictionary entry. */
		onselect?: (token: JapaneseToken) => void;
	} = $props();

	const sizes = {
		sm: 'text-lg leading-[2.6]',
		md: 'text-2xl leading-[2.4]',
		lg: 'text-4xl leading-[2.2]'
	} as const;

	const categoryColors: Record<TokenCategory, string> = {
		noun: 'text-chart-1',
		verb: 'text-chart-2',
		adjective: 'text-chart-3',
		adverb: 'text-chart-4',
		particle: 'text-muted-foreground',
		auxiliary: 'text-chart-5',
		prefix: 'text-chart-4',
		conjunction: 'text-chart-5',
		symbol: 'text-muted-foreground',
		other: 'text-foreground'
	};

	/** Punctuation and whitespace are not words, so they get no chip. */
	function isWord(token: JapaneseToken) {
		return token.category !== 'symbol' && token.surface.trim().length > 0;
	}

	function knowledgeClass(token: JapaneseToken) {
		if (!token.card) return;

		if (token.card.state === State.Learning || token.card.state === State.Relearning)
			return 'bg-chart-5/25 text-foreground';
		if (token.card.state === State.Review) return 'bg-chart-4/25 text-foreground';
	}

	function wordClass(token: JapaneseToken) {
		return cn(
			'rounded-lg px-0.5 transition-colors',
			isWord(token) && showWordBounds && 'mx-0.5 px-1.5',
			isWord(token) && (knowledgeClass(token) ?? 'bg-accent/40'),
			colorByPos && categoryColors[token.category]
		);
	}
</script>

{#snippet ruby(
	token: JapaneseToken
)}{#each token.segments as segment, index (index)}{#if furigana && segment.ruby}<ruby
				>{segment.text}<rp>(</rp><rt class="text-[0.45em] font-normal tracking-tight opacity-70"
					>{segment.ruby}</rt
				><rp>)</rp></ruby
			>{:else}{segment.text}{/if}{/each}{/snippet}

{#await tokenizeJapanese(text)}
	<p class={cn('flex flex-wrap gap-2', sizes[size], className)} aria-busy="true">
		{#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
			<span class="h-[1em] w-14 animate-pulse rounded-md bg-muted"></span>
		{/each}
	</p>
{:then tokens}
	<p class={cn('flex flex-wrap items-end', sizes[size], className)} lang="ja">
		{#each tokens as token, index (index)}
			{#if onselect && isWord(token)}
				<button
					type="button"
					title="{token.baseForm} · {token.pos}"
					onclick={() => onselect(token)}
					class={cn(
						wordClass(token),
						'cursor-pointer hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
					)}>{@render ruby(token)}</button
				>
			{:else}
				<span class={wordClass(token)}>{@render ruby(token)}</span>
			{/if}
		{/each}
	</p>
{:catch error}
	<p class="text-sm text-destructive">No se pudo analizar el texto: {error.message}</p>
{/await}
