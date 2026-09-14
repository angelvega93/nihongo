<script lang="ts">
	type FuriganaToken = { base: string; reading?: string };
	type FuriganaSegment = { bold: boolean; tokens: FuriganaToken[] };

	let { text, class: className = "" }: { text: string; class?: string } = $props();

	// Parses "**bold**" markers and "kanji[reading]" furigana notation into renderable tokens.
	function tokenize(segment: string): FuriganaToken[] {
		const tokens: FuriganaToken[] = [];
		const regex = /([^[\]]+)\[([^\]]+)\]/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(segment))) {
			if (match.index > lastIndex) tokens.push({ base: segment.slice(lastIndex, match.index) });
			tokens.push({ base: match[1], reading: match[2] });
			lastIndex = regex.lastIndex;
		}
		if (lastIndex < segment.length) tokens.push({ base: segment.slice(lastIndex) });
		return tokens;
	}

	const segments = $derived(
		text.split("**").map((part, i): FuriganaSegment => ({ bold: i % 2 === 1, tokens: tokenize(part) }))
	);
</script>

<span class={className}>
	{#each segments as segment, i (i)}
		{#if segment.bold}
			<strong class="text-orange-500">
				{#each segment.tokens as token, j (j)}
					{#if token.reading}<ruby>{token.base}<rt>{token.reading}</rt></ruby>{:else}{token.base}{/if}
				{/each}
			</strong>
		{:else}
			{#each segment.tokens as token, j (j)}
				{#if token.reading}<ruby>{token.base}<rt>{token.reading}</rt></ruby>{:else}{token.base}{/if}
			{/each}
		{/if}
	{/each}
</span>
