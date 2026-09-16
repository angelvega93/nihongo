<script>
	let { kana = 'たべる', downstep = 2 } = $props();
	const morae = $derived([...kana]);
	const n = $derived(morae.length);

	// Returns classes for each mora: "h", "d", or both
	const classes = $derived.by(() => {
		if (n === 0) return [];

		const result = new Array(n).fill('');

		if (downstep === 0) {
			// heiban → L H H H... (no drop)
			for (let i = 1; i < n; i++) {
				result[i] = 'h';
			}
		} else if (downstep === 1) {
			// atamadaka → H L L L...
			result[0] = 'h';
			if (n > 1) result[0] += ' d'; // drop after first mora
		} else {
			// nakadaka / odaka
			for (let i = 1; i < downstep && i < n; i++) {
				result[i] = 'h';
			}
			// place the drop on the last high mora
			if (downstep - 1 < n) {
				result[downstep - 1] += (result[downstep - 1] ? ' ' : '') + 'd';
			}
		}

		return result;
	});
</script>

<div class="pitch-accent">
	<div class="pitch-graph">
		{#each morae as mora, i (i)}
			<span class={classes[i]}>{mora}</span>
		{/each}
	</div>
</div>

<style>
	/* Your exact classes */
	.pitch-graph {
		align-items: flex-end;
		display: inline-flex;
	}

	.pitch-graph > span {
		text-align: center;
		min-width: 1em;
		color: var(--ink-muted);
		padding-top: 0.35em;
		border-top: 2px solid transparent;
		padding-inline: 0.1em;
		font-size: 0.8125rem;
		line-height: 1.2;
		display: inline-block;
	}

	.pitch-graph > .h {
		border-top-color: var(--primary);
	}

	.pitch-graph > .d {
		border-right: 2px solid var(--primary);
	}

	/* Optional styling for the whole component */
	.pitch-accent {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
	}

	.romaji {
		margin-top: 0.35rem;
		font-size: 0.8125rem;
		color: var(--ink-muted, #666);
	}
</style>
