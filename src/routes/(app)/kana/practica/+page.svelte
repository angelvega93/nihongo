<script lang="ts">
	import { resolve } from '$app/paths';
	import KanaPracticeCard, {
		type PracticeOutcome
	} from '$lib/components/kana/kana-practice-card.svelte';
	import KanaPracticeModes, {
		type PracticeMode
	} from '$lib/components/kana/kana-practice-modes.svelte';
	import KanaProgressPanel from '$lib/components/kana/kana-progress-panel.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { BASIC_KANA, type KanaScript } from '$lib/kana/data.js';
	import {
		computeMastery,
		KanaMastery,
		progressKey,
		type KanaProgressMap
	} from '$lib/kana/progress.js';
	import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let mode = $state<PracticeMode>('quiz');
	let script = $state<KanaScript>('hiragana');
	let correct = $state(0);
	let attempted = $state(0);
	let streak = $state(0);
	let onlyUnmastered = $state(false);
	let roundKey = $state(0);

	/** Optimistic overrides layered on top of the server progress. */
	let overrides = $state<KanaProgressMap>({});

	const progress = $derived<KanaProgressMap>({ ...data.progress, ...overrides });

	const accuracy = $derived(attempted === 0 ? 0 : Math.round((correct / attempted) * 100));

	const pool = $derived.by(() => {
		if (!onlyUnmastered) return BASIC_KANA;
		const filtered = BASIC_KANA.filter(
			(kana) =>
				(progress[progressKey(script, kana.id)]?.mastery ?? KanaMastery.New) !==
				KanaMastery.Mastered
		);
		return filtered.length > 0 ? filtered : BASIC_KANA;
	});

	function startMode(nextMode: PracticeMode) {
		mode = nextMode;
		roundKey += 1;
	}

	function setScript(nextScript: KanaScript) {
		if (script === nextScript) return;
		script = nextScript;
		roundKey += 1;
	}

	function newRound() {
		roundKey += 1;
	}

	function resetSession() {
		correct = 0;
		attempted = 0;
		streak = 0;
		roundKey += 1;
	}

	function handleOutcome(outcome: PracticeOutcome) {
		attempted += 1;
		if (outcome.correct) {
			correct += 1;
			streak += 1;
		} else {
			streak = 0;
		}

		// Optimistic local update so the map reacts immediately.
		for (const kanaId of outcome.kanaIds) {
			const key = progressKey(script, kanaId);
			const previous = progress[key];
			const nextCorrect = (previous?.correct ?? 0) + (outcome.correct ? 1 : 0);
			const nextAttempts = (previous?.attempts ?? 0) + 1;
			const nextStreak = outcome.correct ? (previous?.streak ?? 0) + 1 : 0;
			overrides[key] = {
				script,
				kanaId,
				correct: nextCorrect,
				attempts: nextAttempts,
				streak: nextStreak,
				mastery: computeMastery(nextCorrect, nextAttempts, nextStreak),
				lastPracticedAt: Date.now()
			};
		}

		void persist(outcome);
	}

	async function persist(outcome: PracticeOutcome) {
		const body = new FormData();
		body.set(
			'attempts',
			JSON.stringify(
				outcome.kanaIds.map((kanaId) => ({ script, kanaId, correct: outcome.correct }))
			)
		);

		try {
			await fetch('?/recordAttempts', { method: 'POST', body });
		} catch {
			// Offline or transient failure: the local mirror keeps the session usable.
		}
	}
</script>

<svelte:head><title>Práctica de kana</title></svelte:head>

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
				<Breadcrumb.Item><Breadcrumb.Page>Práctica</Breadcrumb.Page></Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</header>

	<main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-normal">Práctica de kana</h1>
				<p class="text-sm text-muted-foreground">
					Entrena reconocimiento, escritura y vocabulario.
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2" aria-label="Marcador de sesión">
				<Badge variant="secondary">{correct} correctas</Badge>
				<Badge variant="outline">{attempted} intentos</Badge>
				<Badge variant="outline">Racha {streak}</Badge>
				<Badge variant="outline">{accuracy}%</Badge>
				<Button variant="ghost" size="sm" onclick={resetSession}>
					<RotateCcwIcon data-icon="inline-start" />
					Reiniciar sesión
				</Button>
			</div>
		</div>

		<KanaPracticeModes {mode} onselect={startMode} />

		<div class="flex flex-wrap items-center justify-between gap-3 border-y py-3">
			<div class="flex items-center gap-2" aria-label="Silabario">
				<Button
					size="sm"
					variant={script === 'hiragana' ? 'default' : 'outline'}
					aria-pressed={script === 'hiragana'}
					onclick={() => setScript('hiragana')}>Hiragana</Button
				>
				<Button
					size="sm"
					variant={script === 'katakana' ? 'default' : 'outline'}
					aria-pressed={script === 'katakana'}
					onclick={() => setScript('katakana')}>Katakana</Button
				>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button
					variant={onlyUnmastered ? 'secondary' : 'outline'}
					size="sm"
					aria-pressed={onlyUnmastered}
					onclick={() => {
						onlyUnmastered = !onlyUnmastered;
						roundKey += 1;
					}}
				>
					Solo no dominados
				</Button>
				<Button variant="outline" size="sm" onclick={newRound}>
					<RefreshCcwIcon data-icon="inline-start" />
					Nueva ronda
				</Button>
			</div>
		</div>

		<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
			{#key `${mode}-${script}-${roundKey}`}
				<KanaPracticeCard {mode} {script} {pool} onoutcome={handleOutcome} />
			{/key}

			<KanaProgressPanel {progress} {script} class="lg:sticky lg:top-6" />
		</div>
	</main>
</div>
