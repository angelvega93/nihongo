<script lang="ts">
	import {
		getKanaAvailability,
		setKanaEnabled,
		setManyKanaEnabled
	} from '$lib/kana/availability.remote.js';
	import { applyEnabledOverrides, isKanaEnabled } from '$lib/kana/availability.js';
	import {
		KANA_CATEGORIES,
		KANA_SCRIPTS,
		kanaCharacter,
		kanaRowsByCategory,
		type KanaScript
	} from '$lib/kana/data.js';
	import { progressKey } from '$lib/kana/progress.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { cn } from '$lib/utils.js';
	import CheckCheckIcon from '@lucide/svelte/icons/check-check';
	import EraserIcon from '@lucide/svelte/icons/eraser';

	type Props = {
		open: boolean;
	};

	let { open = $bindable() }: Props = $props();

	let activeScript = $state<KanaScript>('hiragana');

	/**
	 * Shared, deduped query instance: the pages await the same query, so a
	 * mutation here refreshes every consumer in one flight.
	 */
	const availability = getKanaAvailability();

	/** Optimistic toggles layered on top of the server map, keyed by `script:kanaId`. */
	let overrides = $state<Record<string, boolean>>({});

	/** Enabled map with the pending local toggles applied. */
	const view = $derived(applyEnabledOverrides(availability.current?.enabled ?? {}, overrides));

	function isEnabled(script: KanaScript, kanaId: string): boolean {
		return isKanaEnabled(view, script, kanaId);
	}

	/** All kana ids of one script, across every category. */
	function kanaIdsForScript(script: KanaScript): string[] {
		return KANA_CATEGORIES.flatMap((category) =>
			kanaRowsByCategory(script, category.id).flatMap((row) => row.kana.map((kana) => kana.id))
		);
	}

	/** Enable or disable many kana at once, with immediate local feedback. */
	function setMany(script: KanaScript, kanaIds: string[], next: boolean) {
		for (const kanaId of kanaIds) overrides[progressKey(script, kanaId)] = next;
		void setManyKanaEnabled({ script, kanaIds, enabled: next });
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Kana para practicar</Dialog.Title>
			<Dialog.Description>
				Activa los kana que quieras entrenar. Completar una lección por primera vez los activa
				automáticamente.
			</Dialog.Description>
		</Dialog.Header>

		{#if availability.loading}
			<p class="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
		{:else if availability.error}
			<p class="py-8 text-center text-sm text-destructive">
				No se pudo cargar la selección de kana.
			</p>
		{:else}
			{#snippet scriptPanel(entry: (typeof KANA_SCRIPTS)[number])}
				{@const kanaIds = kanaIdsForScript(entry.id)}
				{@const enabledCount = kanaIds.filter((kanaId) => isEnabled(entry.id, kanaId)).length}
				<div class="flex flex-col gap-3">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-medium">{entry.label}</h3>
							<Badge variant="outline">{enabledCount} activos</Badge>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => setMany(entry.id, kanaIds, enabledCount !== kanaIds.length)}
						>
							{#if enabledCount === kanaIds.length}
								<EraserIcon data-icon="inline-start" />
								Quitar todos
							{:else}
								<CheckCheckIcon data-icon="inline-start" />
								Activar todos
							{/if}
						</Button>
					</div>

					<div class="flex flex-col gap-5">
						{#each KANA_CATEGORIES as category (category.id)}
							{@const rows = kanaRowsByCategory(entry.id, category.id)}
							{#if rows.length > 0}
								<div class="flex flex-col gap-2">
									<div class="flex flex-col gap-0.5">
										<h4 class="text-xs font-medium">{category.label}</h4>
										<p class="text-xs text-muted-foreground">{category.description}</p>
									</div>
									{#each rows as row (row.id)}
										{@const rowKanaIds = row.kana.map((kana) => kana.id)}
										{@const rowEnabled = rowKanaIds.filter((kanaId) =>
											isEnabled(entry.id, kanaId)
										).length}
										<div class="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-2">
											<div class="flex h-full items-center gap-2">
												<Checkbox
													checked={rowEnabled > 0 && rowEnabled === rowKanaIds.length}
													indeterminate={rowEnabled > 0 && rowEnabled < rowKanaIds.length}
													onCheckedChange={(value) => setMany(entry.id, rowKanaIds, value === true)}
													aria-label={`Activar fila ${row.label}`}
												/>
												<span class="text-xs text-muted-foreground">{row.label}</span>
											</div>
											<div
												class={row.columnAligned
													? 'grid grid-cols-5 gap-2'
													: 'flex flex-wrap gap-2'}
											>
												{#each row.kana as kana (kana.id)}
													<label
														style={row.columnAligned
															? `grid-column: ${kana.column + 1}`
															: undefined}
														class={cn(
															'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
															'has-focus-visible:ring-2 has-focus-visible:ring-ring',
															isEnabled(entry.id, kana.id)
																? 'border-primary/60 bg-primary/10'
																: 'border-border'
														)}
													>
														<Checkbox
															checked={isEnabled(entry.id, kana.id)}
															onCheckedChange={(value) => {
																overrides[progressKey(entry.id, kana.id)] = value === true;
																void setKanaEnabled({
																	script: entry.id,
																	kanaId: kana.id,
																	enabled: value === true
																});
															}}
														/>
														<span class="font-serif text-lg leading-none">
															{kanaCharacter(kana, entry.id)}
														</span>
														<span class="text-xs text-muted-foreground">{kana.romaji}</span>
													</label>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/snippet}

			<Tabs.Root bind:value={activeScript}>
				<Tabs.List class="mb-4 grid w-full grid-cols-2 sm:w-72">
					{#each KANA_SCRIPTS as entry (entry.id)}
						<Tabs.Trigger value={entry.id}>{entry.label}</Tabs.Trigger>
					{/each}
				</Tabs.List>
				{#each KANA_SCRIPTS as entry (entry.id)}
					<Tabs.Content value={entry.id}>{@render scriptPanel(entry)}</Tabs.Content>
				{/each}
			</Tabs.Root>
		{/if}

		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props}>Listo</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
