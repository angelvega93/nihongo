<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import {
		MIN_KANA_FOR_PRACTICE,
		MIN_WORDS_FOR_PRACTICE,
		PRACTICE_MODES,
		type PracticeModeInfo
	} from '$lib/kana/practice-modes.js';
	import { cn } from '$lib/utils.js';
	import BlocksIcon from '@lucide/svelte/icons/blocks';
	import CircleHelpIcon from '@lucide/svelte/icons/circle-help';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import LockIcon from '@lucide/svelte/icons/lock';
	import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';

	/** Icons live here so the shared mode catalog stays free of UI concerns. */
	const ICONS: Record<PracticeModeInfo['id'], typeof CircleHelpIcon> = {
		quiz: CircleHelpIcon,
		listen: HeadphonesIcon,
		draw: PencilLineIcon,
		writing: KeyboardIcon,
		pairs: ShuffleIcon,
		'word-choice': ListChecksIcon,
		formation: BlocksIcon
	};

	type Props = {
		/** Number of enabled kana across both scripts. */
		kanaCount: number;
		/** Number of available vocabulary words. */
		wordCount: number;
	};

	let { kanaCount, wordCount }: Props = $props();

	/** Whether a mode's requirement is met, and the message to show if not. */
	function requirementState(entry: PracticeModeInfo): { met: boolean; hint: string } {
		if (entry.requirement === 'kana') {
			return {
				met: kanaCount >= MIN_KANA_FOR_PRACTICE,
				hint: `Necesitas ${MIN_KANA_FOR_PRACTICE} kana activos (tienes ${kanaCount}).`
			};
		}
		if (entry.requirement === 'words') {
			return {
				met: wordCount >= MIN_WORDS_FOR_PRACTICE,
				hint: `Necesitas ${MIN_WORDS_FOR_PRACTICE} palabras disponibles (tienes ${wordCount}).`
			};
		}
		return { met: true, hint: '' };
	}
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Modos de práctica">
	{#each PRACTICE_MODES as entry (entry.id)}
		{@const Icon = ICONS[entry.id]}
		{@const state = requirementState(entry)}
		{#if state.met}
			<a
				href={resolve(`/kana/practica/${entry.slug}`)}
				class="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<div class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						<Icon class="size-5" aria-hidden="true" />
					</div>
					<div class="flex min-w-0 flex-col gap-1">
						<p class="font-medium">{entry.label}</p>
						<p class="text-sm text-muted-foreground">{entry.description}</p>
					</div>
				</div>
			</a>
		{:else}
			<Card.Root size="sm" class={cn('border-dashed bg-muted/30 opacity-80')} aria-disabled="true">
				<Card.Content class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
					>
						<LockIcon class="size-5" aria-hidden="true" />
					</div>
					<div class="flex min-w-0 flex-col gap-1">
						<div class="flex items-center gap-2">
							<p class="font-medium text-muted-foreground">{entry.label}</p>
							<Badge variant="outline" class="text-muted-foreground">Bloqueado</Badge>
						</div>
						<p class="text-sm text-muted-foreground">{state.hint}</p>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{/each}
</div>
