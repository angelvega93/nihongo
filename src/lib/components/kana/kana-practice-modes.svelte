<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import BlocksIcon from '@lucide/svelte/icons/blocks';
	import CircleHelpIcon from '@lucide/svelte/icons/circle-help';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';

	export type PracticeMode =
		'quiz' | 'listen' | 'draw' | 'word-choice' | 'pairs' | 'writing' | 'formation';

	export const PRACTICE_MODES = [
		{ id: 'quiz', label: 'Prueba', icon: CircleHelpIcon },
		{ id: 'listen', label: 'Escucha', icon: HeadphonesIcon },
		{ id: 'draw', label: 'Dibujar', icon: PencilLineIcon },
		{ id: 'word-choice', label: 'Selección de palabra', icon: ListChecksIcon },
		{ id: 'pairs', label: 'Emparejar pares', icon: ShuffleIcon },
		{ id: 'writing', label: 'Escritura', icon: KeyboardIcon },
		{ id: 'formation', label: 'Formación de palabra', icon: BlocksIcon }
	] as const satisfies readonly { id: PracticeMode; label: string; icon: unknown }[];

	type Props = {
		mode: PracticeMode;
		onselect: (mode: PracticeMode) => void;
	};

	let { mode, onselect }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Modo de práctica">
	{#each PRACTICE_MODES as entry (entry.id)}
		{@const Icon = entry.icon}
		<Button
			variant={mode === entry.id ? 'secondary' : 'ghost'}
			class="h-auto min-h-16 min-w-0 flex-col gap-1 px-2 py-2 text-xs whitespace-normal"
			aria-pressed={mode === entry.id}
			onclick={() => onselect(entry.id)}
		>
			<Icon aria-hidden="true" />
			<span class="text-center leading-tight">{entry.label}</span>
		</Button>
	{/each}
</div>
