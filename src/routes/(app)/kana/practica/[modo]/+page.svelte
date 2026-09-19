<script lang="ts">
	import { resolve } from '$app/paths';
	import KanaPracticeCard, {
		type PracticeOutcome
	} from '$lib/components/kana/kana-practice-card.svelte';
	import KanaSelectionDialog from '$lib/components/kana/kana-selection-dialog.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { getKanaAvailability } from '$lib/kana/availability.remote.js';
	import {
		buildPracticePool,
		buildWordsByScript,
		countAvailableWords,
		countEnabledKana
	} from '$lib/kana/practice.js';
	import { MIN_KANA_FOR_PRACTICE, MIN_WORDS_FOR_PRACTICE } from '$lib/kana/practice-modes.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Shared with the selection dialog: changes are reflected immediately. */
	const availability = getKanaAvailability();
	const enabled = $derived(availability.current?.enabled ?? data.enabled);

	const pool = $derived(buildPracticePool(enabled));
	const wordsByScript = $derived(buildWordsByScript(enabled));
	const kanaCount = $derived(countEnabledKana(enabled));
	const wordCount = $derived(countAvailableWords(enabled));

	/** Whether the mode's requirement is met, with the message to show if not. */
	const requirement = $derived.by(() => {
		if (data.mode.requirement === 'kana') {
			return {
				met: kanaCount >= MIN_KANA_FOR_PRACTICE,
				title: 'Necesitas más kana activos',
				description: `Este modo requiere al menos ${MIN_KANA_FOR_PRACTICE} kana activos entre hiragana y katakana. Ahora tienes ${kanaCount}.`
			};
		}
		if (data.mode.requirement === 'words') {
			return {
				met: wordCount >= MIN_WORDS_FOR_PRACTICE,
				title: 'Necesitas más palabras disponibles',
				description: `Este modo requiere al menos ${MIN_WORDS_FOR_PRACTICE} palabras cuyos kana estén activos. Ahora tienes ${wordCount}.`
			};
		}
		return { met: true, title: '', description: '' };
	});

	let selectionOpen = $state(false);
	let roundKey = $state(0);

	function newRound() {
		roundKey += 1;
	}

	async function persist(outcome: PracticeOutcome) {
		const body = new FormData();
		body.set(
			'attempts',
			JSON.stringify(outcome.attempts.map((attempt) => ({ ...attempt, correct: outcome.correct })))
		);

		try {
			await fetch('?/recordAttempts', { method: 'POST', body });
		} catch {
			// Offline or transient failure: the session stays usable.
		}
	}
</script>

<svelte:head><title>{data.mode.label} · Práctica de kana</title></svelte:head>

<div class="flex flex-1 flex-col">
	<header class="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-1 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href={resolve('/kana')} class="text-muted-foreground"
						>Kana</Breadcrumb.Link
					>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link href={resolve('/kana/practica')} class="text-muted-foreground">
						Práctica
					</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item><Breadcrumb.Page>{data.mode.label}</Breadcrumb.Page></Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</header>

	<main class="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<Button href={resolve('/kana/practica')} variant="ghost" size="sm" class="-ml-2">
					<ArrowLeftIcon data-icon="inline-start" />
					Modos de práctica
				</Button>
				<h1 class="text-2xl font-semibold tracking-normal">{data.mode.label}</h1>
				<p class="text-sm text-muted-foreground">{data.mode.description}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant="outline">Hiragana + Katakana</Badge>
				<Button variant="outline" size="sm" onclick={() => (selectionOpen = true)}>
					<Settings2Icon data-icon="inline-start" />
					Gestionar kana
				</Button>
				{#if requirement.met}
					<Button variant="outline" size="sm" onclick={newRound}>
						<RefreshCcwIcon data-icon="inline-start" />
						Nueva ronda
					</Button>
				{/if}
			</div>
		</div>

		{#if requirement.met}
			{#key roundKey}
				<KanaPracticeCard
					mode={data.mode.id}
					{pool}
					{wordsByScript}
					onoutcome={(outcome) => void persist(outcome)}
				/>
			{/key}
		{:else}
			<Card.Root class="mx-auto w-full max-w-2xl">
				<Card.Header class="items-center text-center">
					<Card.Title>{requirement.title}</Card.Title>
					<Card.Description>{requirement.description}</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-wrap justify-center gap-2">
					<Button onclick={() => (selectionOpen = true)}>
						<Settings2Icon data-icon="inline-start" />
						Elegir kana
					</Button>
					<Button href={resolve('/kana/practica')} variant="outline">
						<ArrowLeftIcon data-icon="inline-start" />
						Volver a modos
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</main>
</div>

<KanaSelectionDialog bind:open={selectionOpen} />
