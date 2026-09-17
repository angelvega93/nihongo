<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import type { Attachment } from 'svelte/attachments';
	import { MediaQuery } from 'svelte/reactivity';

	type Stroke = { id: string; d: string };
	type StrokeNumber = { id: string; value: string; x: number; y: number };
	type KanjiVgData = { viewBox: string; strokes: Stroke[]; numbers: StrokeNumber[] };

	const KANJIVG_BASE_URL = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji';
	const STROKE_DURATION_MS = 600;
	const STROKE_GAP_MS = 120;
	const MAX_SVG_LENGTH = 500_000;
	const SVG_PATH_PATTERN = /^[MmZzLlHhVvCcSsQqTtAaEe0-9,.\s+-]*$/;
	const VIEW_BOX_PATTERN = /^-?\d+(?:\.\d+)?(?:[ ,]+-?\d+(?:\.\d+)?){3}$/;

	let { character }: { character: string } = $props();

	let data = $state.raw<KanjiVgData | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let currentStep = $state(0);
	let animating = $state(false);
	let animationKey = $state(0);
	let animationTimer: ReturnType<typeof setTimeout> | undefined;
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)', false);

	const codePoint = $derived.by(() => {
		const characters = Array.from(character.trim());
		return characters.length === 1 ? characters[0].codePointAt(0) : undefined;
	});
	const fileName = $derived(
		codePoint === undefined ? null : `${codePoint.toString(16).padStart(5, '0')}.svg`
	);
	const sourceUrl = $derived(fileName ? `${KANJIVG_BASE_URL}/${fileName}` : null);

	function clearAnimationTimer() {
		if (animationTimer !== undefined) {
			clearTimeout(animationTimer);
			animationTimer = undefined;
		}
	}

	function finishAnimationAfter(strokeCount: number) {
		clearAnimationTimer();
		animationTimer = setTimeout(
			() => {
				animating = false;
				animationTimer = undefined;
			},
			strokeCount * (STROKE_DURATION_MS + STROKE_GAP_MS)
		);
	}

	function play() {
		if (!data) return;
		clearAnimationTimer();
		currentStep = data.strokes.length;
		animationKey += 1;

		if (reducedMotion.current) {
			animating = false;
			return;
		}

		animating = true;
		finishAnimationAfter(data.strokes.length);
	}

	function setStep(step: number) {
		if (!data) return;
		clearAnimationTimer();
		animating = false;
		currentStep = Math.min(Math.max(step, 0), data.strokes.length);
	}

	function parseCoordinate(text: Element, axis: 'x' | 'y'): number | null {
		const directValue = Number.parseFloat(text.getAttribute(axis) ?? '');
		if (Number.isFinite(directValue)) return directValue;

		const transform = text.getAttribute('transform') ?? '';
		const matrixMatch = transform.match(
			/^matrix\(\s*-?\d*\.?\d+(?:e[+-]?\d+)?[ ,]+-?\d*\.?\d+(?:e[+-]?\d+)?[ ,]+-?\d*\.?\d+(?:e[+-]?\d+)?[ ,]+-?\d*\.?\d+(?:e[+-]?\d+)?[ ,]+(-?\d*\.?\d+(?:e[+-]?\d+)?)[ ,]+(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)$/i
		);
		if (!matrixMatch) return null;
		return Number.parseFloat(axis === 'x' ? matrixMatch[1] : matrixMatch[2]);
	}

	function parseKanjiVg(svgText: string): KanjiVgData {
		if (svgText.length > MAX_SVG_LENGTH) throw new Error('El archivo SVG es demasiado grande.');

		const document = new DOMParser().parseFromString(svgText, 'image/svg+xml');
		const root = document.documentElement;
		if (root.localName !== 'svg' || document.querySelector('parsererror')) {
			throw new Error('KanjiVG devolvió un SVG no válido.');
		}

		const viewBoxValue = root.getAttribute('viewBox')?.trim() ?? '';
		const viewBox = VIEW_BOX_PATTERN.test(viewBoxValue)
			? viewBoxValue.replaceAll(',', ' ')
			: '0 0 109 109';
		const strokeElements = Array.from(document.querySelectorAll('[id^="kvg:StrokePaths"] path[d]'));
		const strokes = strokeElements.flatMap((path, index): Stroke[] => {
			const d = path.getAttribute('d')?.trim() ?? '';
			return d && d.length <= 20_000 && SVG_PATH_PATTERN.test(d)
				? [{ id: `stroke-${index + 1}`, d }]
				: [];
		});

		if (strokes.length === 0 || strokes.length !== strokeElements.length || strokes.length > 100) {
			throw new Error('No se encontraron trazos KanjiVG válidos para este carácter.');
		}

		const numbers = Array.from(document.querySelectorAll('[id^="kvg:StrokeNumbers"] text')).flatMap(
			(text, index): StrokeNumber[] => {
				const value = text.textContent?.trim() ?? '';
				const x = parseCoordinate(text, 'x');
				const y = parseCoordinate(text, 'y');
				return /^\d{1,3}$/.test(value) && x !== null && y !== null
					? [{ id: `number-${index + 1}`, value, x, y }]
					: [];
			}
		);

		return { viewBox, strokes, numbers };
	}

	function loadStrokeData(url: string | null): Attachment {
		return () => {
			const controller = new AbortController();

			clearAnimationTimer();
			data = null;
			currentStep = 0;
			animating = false;

			if (!url) {
				loading = false;
				error = 'Introduce exactamente un carácter kana.';
				return () => controller.abort();
			}

			loading = true;
			error = null;

			void (async () => {
				try {
					const response = await fetch(url, {
						signal: controller.signal,
						headers: { Accept: 'image/svg+xml' }
					});
					if (!response.ok) throw new Error(`KanjiVG respondió con ${response.status}.`);

					const parsed = parseKanjiVg(await response.text());
					if (controller.signal.aborted) return;

					data = parsed;
					loading = false;
					currentStep = parsed.strokes.length;
					animationKey += 1;
					if (!reducedMotion.current) {
						animating = true;
						finishAnimationAfter(parsed.strokes.length);
					}
				} catch (fetchError) {
					if (controller.signal.aborted) return;
					loading = false;
					error = fetchError instanceof Error ? fetchError.message : 'No se pudo cargar KanjiVG.';
				}
			})();

			return () => {
				controller.abort();
				clearAnimationTimer();
			};
		};
	}
</script>

<figure class="flex w-full flex-col gap-3" aria-busy={loading} {@attach loadStrokeData(sourceUrl)}>
	<div
		class="relative grid aspect-square w-full place-items-center overflow-hidden rounded-lg border bg-background"
	>
		{#if loading}
			<div class="flex flex-col items-center gap-2 text-muted-foreground" role="status">
				<LoaderCircleIcon class="size-6 animate-spin" aria-hidden="true" />
				<span class="text-sm">Cargando trazos…</span>
			</div>
		{:else if error}
			<p class="max-w-xs px-4 text-center text-sm text-destructive" role="alert">{error}</p>
		{:else if data}
			<svg
				class="size-full"
				viewBox={data.viewBox}
				role="img"
				aria-label={`Orden de trazos de ${character.trim()}`}
				preserveAspectRatio="xMidYMid meet"
			>
				{#key animationKey}
					<g class="text-foreground">
						{#each data.strokes as stroke, index (stroke.id)}
							<path
								d={stroke.d}
								pathLength="1"
								fill="none"
								stroke="currentColor"
								stroke-width="3.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								class:stroke-animated={animating}
								class:stroke-hidden={!animating && index >= currentStep}
								style:--stroke-delay={`${index * (STROKE_DURATION_MS + STROKE_GAP_MS)}ms`}
							/>
						{/each}
					</g>
					<g class="fill-muted-foreground text-[8px] font-medium" aria-hidden="true">
						{#each data.numbers as number, index (number.id)}
							<text
								x={number.x}
								y={number.y}
								class:number-animated={animating}
								class:number-hidden={!animating && index >= currentStep}
								style:--number-delay={`${index * (STROKE_DURATION_MS + STROKE_GAP_MS)}ms`}
							>
								{number.value}
							</text>
						{/each}
					</g>
				{/key}
			</svg>
		{/if}
	</div>

	{#if data}
		<figcaption class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-sm text-muted-foreground tabular-nums" aria-live="polite">
				{animating ? 'Reproduciendo' : `Paso ${currentStep} de ${data.strokes.length}`}
			</p>
			<div class="flex items-center gap-1">
				<Button
					variant="outline"
					size="icon"
					onclick={() => setStep(currentStep - 1)}
					disabled={animating || currentStep === 0}
					aria-label="Trazo anterior"
					title="Trazo anterior"
				>
					<ChevronLeftIcon aria-hidden="true" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					onclick={() => setStep(currentStep + 1)}
					disabled={animating || currentStep === data.strokes.length}
					aria-label="Trazo siguiente"
					title="Trazo siguiente"
				>
					<ChevronRightIcon aria-hidden="true" />
				</Button>
				<Button variant="outline" onclick={play} disabled={animating}>
					<RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
					Reproducir
				</Button>
			</div>
		</figcaption>
	{/if}
</figure>

<style>
	.stroke-animated {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation: draw-stroke 600ms ease-out var(--stroke-delay) both;
	}

	.stroke-hidden {
		opacity: 0;
	}

	.number-animated {
		opacity: 0;
		animation: reveal-stroke-number 1ms step-end var(--number-delay) both;
	}

	.number-hidden {
		opacity: 0;
	}

	@keyframes draw-stroke {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes reveal-stroke-number {
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stroke-animated {
			animation: none;
			stroke-dashoffset: 0;
		}

		.number-animated {
			animation: none;
			opacity: 1;
		}
	}
</style>
