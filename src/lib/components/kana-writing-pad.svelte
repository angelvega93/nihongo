<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import Undo2Icon from '@lucide/svelte/icons/undo-2';
	import type { Attachment } from 'svelte/attachments';

	type Point = { x: number; y: number };
	type ExpectedStroke = {
		id: string;
		d: string;
		points: Point[];
		length: number;
		indicatorPoints: Point[];
		labelPoint: Point;
		arrowheadPoints: Point[];
	};
	type UserStroke = { id: number; points: Point[]; accepted: boolean };
	type Score = { accepted: boolean; feedback: string };
	type StrokeData = { strokes: ExpectedStroke[] };
	type CompletionResult = { character: string; attempts: number };
	type Props = {
		character: string;
		showGuide?: boolean;
		showIndicators?: boolean;
		oncomplete?: (result: CompletionResult) => void;
	};

	const KANJIVG_BASE_URL = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji';
	const VIEW_BOX_SIZE = 109;
	const SAMPLE_COUNT = 32;
	const MAX_SVG_LENGTH = 500_000;
	const SVG_PATH_PATTERN = /^[MmZzLlHhVvCcSsQqTtAaEe0-9,.\s+-]*$/;

	let { character, showGuide = true, showIndicators = true, oncomplete }: Props = $props();

	let data = $state.raw<StrokeData | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let userStrokes = $state.raw<UserStroke[]>([]);
	let currentPoints = $state.raw<Point[]>([]);
	let acceptedCount = $state(0);
	let attempts = $state(0);
	let feedback = $state('Dibuja el primer trazo.');
	let activePointerId: number | null = null;
	let nextStrokeId = 0;

	const codePoint = $derived.by(() => {
		const characters = Array.from(character.trim());
		return characters.length === 1 ? characters[0].codePointAt(0) : undefined;
	});
	const sourceUrl = $derived(
		codePoint === undefined
			? null
			: `${KANJIVG_BASE_URL}/${codePoint.toString(16).padStart(5, '0')}.svg`
	);
	const totalStrokes = $derived(data?.strokes.length ?? 0);
	const complete = $derived(totalStrokes > 0 && acceptedCount === totalStrokes);

	function distance(first: Point, second: Point) {
		return Math.hypot(first.x - second.x, first.y - second.y);
	}

	function polylineLength(points: Point[]) {
		let length = 0;
		for (let index = 1; index < points.length; index += 1) {
			length += distance(points[index - 1], points[index]);
		}
		return length;
	}

	function resamplePolyline(points: Point[], count: number): Point[] {
		const totalLength = polylineLength(points);
		if (points.length === 0 || totalLength === 0) return [];

		const result: Point[] = [{ ...points[0] }];
		const interval = totalLength / (count - 1);
		let traversed = 0;
		let segmentIndex = 1;
		let segmentStart = points[0];

		while (result.length < count - 1 && segmentIndex < points.length) {
			const segmentEnd = points[segmentIndex];
			const segmentLength = distance(segmentStart, segmentEnd);
			const targetDistance = result.length * interval;

			if (segmentLength > 0 && traversed + segmentLength >= targetDistance) {
				const ratio = (targetDistance - traversed) / segmentLength;
				result.push({
					x: segmentStart.x + (segmentEnd.x - segmentStart.x) * ratio,
					y: segmentStart.y + (segmentEnd.y - segmentStart.y) * ratio
				});
				continue;
			}

			traversed += segmentLength;
			segmentStart = segmentEnd;
			segmentIndex += 1;
		}

		result.push({ ...points.at(-1)! });
		while (result.length < count) result.push({ ...points.at(-1)! });
		return result;
	}

	function samplePath(d: string): { points: Point[]; length: number } | null {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', d);
		const length = path.getTotalLength();
		if (!Number.isFinite(length) || length <= 0) return null;

		const points = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
			const point = path.getPointAtLength((length * index) / (SAMPLE_COUNT - 1));
			return { x: point.x, y: point.y };
		});
		return { points, length };
	}

	function initialCurve(points: Point[], targetLength = 10): Point[] {
		if (points.length < 2) return points;

		const result = [{ ...points[0] }];
		let traversed = 0;
		for (let index = 1; index < points.length; index += 1) {
			const segmentLength = distance(points[index - 1], points[index]);
			if (segmentLength === 0) continue;

			if (traversed + segmentLength >= targetLength) {
				const ratio = (targetLength - traversed) / segmentLength;
				result.push({
					x: points[index - 1].x + (points[index].x - points[index - 1].x) * ratio,
					y: points[index - 1].y + (points[index].y - points[index - 1].y) * ratio
				});
				break;
			}

			result.push({ ...points[index] });
			traversed += segmentLength;
		}
		return result;
	}

	function initialDirection(points: Point[]): Point {
		const start = points[0];
		const next = points.find((point) => distance(start, point) >= 1) ?? points.at(-1)!;
		const magnitude = distance(start, next);
		return magnitude === 0
			? { x: 1, y: 0 }
			: { x: (next.x - start.x) / magnitude, y: (next.y - start.y) / magnitude };
	}

	function createIndicatorGeometry(points: Point[]) {
		const curve = initialCurve(points);
		const direction = initialDirection(curve);
		const perpendicular = { x: -direction.y, y: direction.x };
		const badgeRadius = 3.4;
		const safeMin = 4;
		const safeMax = 105;

		const candidates = [7, 6, 5, 4].flatMap((offset) =>
			([-1, 1] as const).map((side) => {
				const indicatorPoints = curve.map((point) => ({
					x: point.x + perpendicular.x * offset * side,
					y: point.y + perpendicular.y * offset * side
				}));
				const tip = indicatorPoints.at(-1)!;
				const previous =
					indicatorPoints.findLast((point) => distance(point, tip) >= 0.5) ?? indicatorPoints[0];
				const tipDirection = initialDirection([previous, tip]);
				const base = {
					x: tip.x - tipDirection.x * 2.6,
					y: tip.y - tipDirection.y * 2.6
				};
				const arrowPerpendicular = { x: -tipDirection.y * 1.35, y: tipDirection.x * 1.35 };
				const arrowheadPoints = [
					{ x: base.x + arrowPerpendicular.x, y: base.y + arrowPerpendicular.y },
					tip,
					{ x: base.x - arrowPerpendicular.x, y: base.y - arrowPerpendicular.y }
				];
				const start = indicatorPoints[0];
				const labelPoint = {
					x: start.x - direction.x * (badgeRadius + 1.5),
					y: start.y - direction.y * (badgeRadius + 1.5)
				};
				const geometryPoints = [...indicatorPoints, ...arrowheadPoints];
				const clearance = Math.min(
					...geometryPoints.flatMap((point) => [
						point.x - safeMin,
						safeMax - point.x,
						point.y - safeMin,
						safeMax - point.y
					]),
					labelPoint.x - badgeRadius - safeMin,
					safeMax - labelPoint.x - badgeRadius,
					labelPoint.y - badgeRadius - safeMin,
					safeMax - labelPoint.y - badgeRadius
				);

				return { indicatorPoints, labelPoint, arrowheadPoints, clearance, offset, side };
			})
		);

		const fittingOffset = candidates.find((candidate) => candidate.clearance >= 0)?.offset ?? 4;
		const selected = candidates
			.filter((candidate) => candidate.offset === fittingOffset)
			.reduce((best, candidate) => (candidate.clearance > best.clearance ? candidate : best));
		if (selected.clearance >= 0) return selected;

		const bounds = [
			...selected.indicatorPoints,
			...selected.arrowheadPoints,
			{
				x: selected.labelPoint.x - badgeRadius,
				y: selected.labelPoint.y - badgeRadius
			},
			{
				x: selected.labelPoint.x + badgeRadius,
				y: selected.labelPoint.y + badgeRadius
			}
		];
		const minX = Math.min(...bounds.map((point) => point.x));
		const maxX = Math.max(...bounds.map((point) => point.x));
		const minY = Math.min(...bounds.map((point) => point.y));
		const maxY = Math.max(...bounds.map((point) => point.y));
		const shift = {
			x: minX < safeMin ? safeMin - minX : maxX > safeMax ? safeMax - maxX : 0,
			y: minY < safeMin ? safeMin - minY : maxY > safeMax ? safeMax - maxY : 0
		};
		const separation = (perpendicular.x * shift.x + perpendicular.y * shift.y) * selected.side;
		if (selected.offset + separation < 4) {
			const correction = 4 - selected.offset - separation;
			shift.x += perpendicular.x * selected.side * correction;
			shift.y += perpendicular.y * selected.side * correction;
		}
		const translate = (point: Point) => ({ x: point.x + shift.x, y: point.y + shift.y });
		return {
			indicatorPoints: selected.indicatorPoints.map(translate),
			labelPoint: translate(selected.labelPoint),
			arrowheadPoints: selected.arrowheadPoints.map(translate)
		};
	}

	function parseKanjiVg(svgText: string): StrokeData {
		if (svgText.length > MAX_SVG_LENGTH) throw new Error('El archivo SVG es demasiado grande.');

		const parsedDocument = new DOMParser().parseFromString(svgText, 'image/svg+xml');
		const root = parsedDocument.documentElement;
		if (root.localName !== 'svg' || parsedDocument.querySelector('parsererror')) {
			throw new Error('KanjiVG devolvió un SVG no válido.');
		}

		const pathElements = Array.from(
			parsedDocument.querySelectorAll('[id^="kvg:StrokePaths"] path[d]')
		);
		const strokes = pathElements.flatMap((path, index): ExpectedStroke[] => {
			const d = path.getAttribute('d')?.trim() ?? '';
			if (!d || d.length > 20_000 || !SVG_PATH_PATTERN.test(d)) return [];
			const sampled = samplePath(d);
			if (!sampled) return [];
			const indicatorGeometry = createIndicatorGeometry(sampled.points);
			return [
				{
					id: `expected-${index + 1}`,
					d,
					...sampled,
					...indicatorGeometry
				}
			];
		});

		if (strokes.length === 0 || strokes.length !== pathElements.length || strokes.length > 100) {
			throw new Error('No se encontraron trazos KanjiVG válidos para este carácter.');
		}

		return { strokes };
	}

	function resetPractice() {
		userStrokes = [];
		currentPoints = [];
		acceptedCount = 0;
		attempts = 0;
		feedback = 'Dibuja el primer trazo.';
		activePointerId = null;
		nextStrokeId = 0;
	}

	function loadStrokeData(url: string | null): Attachment {
		return () => {
			const controller = new AbortController();
			data = null;
			resetPractice();

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
				} catch (fetchError) {
					if (controller.signal.aborted) return;
					loading = false;
					error = fetchError instanceof Error ? fetchError.message : 'No se pudo cargar KanjiVG.';
				}
			})();

			return () => controller.abort();
		};
	}

	function pointerToViewBox(event: PointerEvent, svg: SVGSVGElement): Point {
		const rect = svg.getBoundingClientRect();
		const scale = Math.min(rect.width / VIEW_BOX_SIZE, rect.height / VIEW_BOX_SIZE);
		const horizontalInset = (rect.width - VIEW_BOX_SIZE * scale) / 2;
		const verticalInset = (rect.height - VIEW_BOX_SIZE * scale) / 2;
		return {
			x: Math.min(
				VIEW_BOX_SIZE,
				Math.max(0, (event.clientX - rect.left - horizontalInset) / scale)
			),
			y: Math.min(VIEW_BOX_SIZE, Math.max(0, (event.clientY - rect.top - verticalInset) / scale))
		};
	}

	function directionSimilarity(actual: Point[], expected: Point[]) {
		const sampleIndex = 7;
		const actualVector = {
			x: actual[sampleIndex].x - actual[0].x,
			y: actual[sampleIndex].y - actual[0].y
		};
		const expectedVector = {
			x: expected[sampleIndex].x - expected[0].x,
			y: expected[sampleIndex].y - expected[0].y
		};
		const magnitude =
			Math.hypot(actualVector.x, actualVector.y) * Math.hypot(expectedVector.x, expectedVector.y);
		return magnitude === 0
			? 1
			: (actualVector.x * expectedVector.x + actualVector.y * expectedVector.y) / magnitude;
	}

	function scoreStroke(points: Point[], expected: ExpectedStroke): Score {
		const actualLength = polylineLength(points);
		if (actualLength < 6 || points.length < 3) {
			return { accepted: false, feedback: 'Trazo demasiado corto. Inténtalo de nuevo.' };
		}

		const actual = resamplePolyline(points, SAMPLE_COUNT);
		const startDistance = distance(actual[0], expected.points[0]);
		const endDistance = distance(actual.at(-1)!, expected.points.at(-1)!);
		const direction = directionSimilarity(actual, expected.points);
		const normalizedShapeDistance =
			actual.reduce((sum, point, index) => sum + distance(point, expected.points[index]), 0) /
			(SAMPLE_COUNT * VIEW_BOX_SIZE);
		const lengthRatio = actualLength / expected.length;

		// Position gates use KanjiVG units; shape error is the normalized mean of 32 paired samples.
		if (startDistance > 18) return { accepted: false, feedback: 'Empieza más cerca del inicio.' };
		if (direction < 0.15) return { accepted: false, feedback: 'Revisa la dirección del trazo.' };
		if (endDistance > 22) return { accepted: false, feedback: 'Termina más cerca del final.' };
		if (lengthRatio < 0.45 || lengthRatio > 2.2) {
			return { accepted: false, feedback: 'Ajusta la longitud del trazo.' };
		}
		if (normalizedShapeDistance > 0.12) {
			return { accepted: false, feedback: 'Sigue mejor la forma del trazo.' };
		}
		return { accepted: true, feedback: 'Trazo correcto.' };
	}

	function handlePointerDown(event: PointerEvent) {
		if (!data || complete || loading || activePointerId !== null) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		const svg = event.currentTarget as SVGSVGElement;
		activePointerId = event.pointerId;
		svg.setPointerCapture(event.pointerId);
		currentPoints = [pointerToViewBox(event, svg)];
	}

	function handlePointerMove(event: PointerEvent) {
		if (event.pointerId !== activePointerId) return;
		const svg = event.currentTarget as SVGSVGElement;
		const point = pointerToViewBox(event, svg);
		if (distance(currentPoints.at(-1)!, point) >= 0.5) currentPoints = [...currentPoints, point];
	}

	function finishPointer(event: PointerEvent) {
		if (event.pointerId !== activePointerId || !data) return;
		const svg = event.currentTarget as SVGSVGElement;
		if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
		activePointerId = null;

		const points = currentPoints;
		currentPoints = [];
		const expected = data.strokes[acceptedCount];
		if (!expected || points.length === 0) return;

		attempts += 1;
		const result = scoreStroke(points, expected);
		userStrokes = [...userStrokes, { id: nextStrokeId, points, accepted: result.accepted }];
		nextStrokeId += 1;

		if (result.accepted) {
			acceptedCount += 1;
			const justCompleted = acceptedCount === data.strokes.length;
			feedback = justCompleted
				? `${character} completado correctamente.`
				: showIndicators
					? result.feedback
					: 'Trazo aceptado.';
			if (justCompleted) oncomplete?.({ character, attempts });
		} else {
			feedback = showIndicators ? result.feedback : 'Ese trazo no coincide. Inténtalo de nuevo.';
		}
	}

	function cancelPointer(event: PointerEvent) {
		if (event.pointerId !== activePointerId) return;
		activePointerId = null;
		currentPoints = [];
	}

	function undoLastAccepted() {
		const lastAcceptedIndex = userStrokes.findLastIndex((stroke) => stroke.accepted);
		if (lastAcceptedIndex < 0) return;
		userStrokes = userStrokes.filter((_, index) => index !== lastAcceptedIndex);
		acceptedCount = Math.max(0, acceptedCount - 1);
		feedback = 'Último trazo correcto deshecho.';
	}

	function pointsAttribute(points: Point[]) {
		return points.map((point) => `${point.x},${point.y}`).join(' ');
	}
</script>

<figure
	class="flex w-full flex-col gap-3"
	aria-busy={loading}
	aria-describedby="kana-writing-feedback"
	{@attach loadStrokeData(sourceUrl)}
>
	<div class="relative aspect-square w-full overflow-hidden rounded-lg border bg-background">
		{#if loading}
			<div class="absolute inset-0 grid place-items-center">
				<div class="flex flex-col items-center gap-2 text-muted-foreground" role="status">
					<LoaderCircleIcon class="size-6 animate-spin" aria-hidden="true" />
					<span class="text-sm">Cargando práctica…</span>
				</div>
			</div>
		{:else if error}
			<div class="absolute inset-0 grid place-items-center">
				<p class="max-w-xs px-4 text-center text-sm text-destructive" role="alert">{error}</p>
			</div>
		{:else if data}
			<svg
				class="size-full touch-none select-none"
				viewBox="0 0 109 109"
				preserveAspectRatio="xMidYMid meet"
				role="img"
				aria-label={`Área para practicar ${character.trim()}`}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={finishPointer}
				onpointercancel={cancelPointer}
			>
				<g class="stroke-muted-foreground/20" fill="none" stroke-width="0.6" aria-hidden="true">
					<rect x="0.5" y="0.5" width="108" height="108" />
					<path d="M54.5 0V109M0 54.5H109M0 0L109 109M109 0L0 109" stroke-dasharray="3 3" />
				</g>
				{#if showGuide}
					<g
						class="stroke-muted-foreground/10"
						fill="none"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						{#each data.strokes as stroke (stroke.id)}
							<path d={stroke.d} />
						{/each}
					</g>
				{/if}
				{#if showIndicators}
					<g class="pointer-events-none" aria-hidden="true">
						{#each data.strokes as stroke, index (stroke.id)}
							{#if index >= acceptedCount}
								<g
									class={index === acceptedCount
										? 'text-primary'
										: 'text-muted-foreground opacity-55'}
								>
									<polyline
										points={pointsAttribute(stroke.indicatorPoints)}
										fill="none"
										stroke="currentColor"
										stroke-width={index === acceptedCount ? 1.35 : 0.9}
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<polyline
										points={pointsAttribute(stroke.arrowheadPoints)}
										fill="none"
										stroke="currentColor"
										stroke-width={index === acceptedCount ? 1.35 : 0.9}
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<circle
										cx={stroke.labelPoint.x}
										cy={stroke.labelPoint.y}
										r="3.4"
										class="fill-background"
										stroke="currentColor"
										stroke-width={index === acceptedCount ? 1.1 : 0.75}
									/>
									<text
										x={stroke.labelPoint.x}
										y={stroke.labelPoint.y}
										fill="currentColor"
										font-size="4.2"
										font-weight="700"
										text-anchor="middle"
										dominant-baseline="central"
									>
										{index + 1}
									</text>
								</g>
							{/if}
						{/each}
					</g>
				{/if}
				{#each userStrokes as stroke (stroke.id)}
					<polyline
						points={pointsAttribute(stroke.points)}
						class={stroke.accepted ? 'stroke-primary' : 'stroke-destructive'}
						fill="none"
						stroke-width="4"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{/each}
				{#if currentPoints.length > 0}
					<polyline
						points={pointsAttribute(currentPoints)}
						class="stroke-foreground"
						fill="none"
						stroke-width="4"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{/if}
			</svg>
		{/if}
	</div>

	{#if data}
		<figcaption class="flex flex-col gap-3">
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between gap-3 text-sm tabular-nums">
					<span class={complete ? 'font-medium text-primary' : 'text-muted-foreground'}>
						{acceptedCount} de {totalStrokes} trazos
					</span>
					<span class="text-muted-foreground">{attempts} intentos</span>
				</div>
				<Progress
					value={acceptedCount}
					max={totalStrokes}
					aria-label="Progreso de trazos correctos"
				/>
			</div>

			<p
				id="kana-writing-feedback"
				class={complete
					? 'min-h-5 text-sm font-medium text-primary'
					: 'min-h-5 text-sm text-muted-foreground'}
				aria-live="polite"
			>
				{feedback}
			</p>

			<div class="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={acceptedCount === 0}
					onclick={undoLastAccepted}
					aria-label="Deshacer el último trazo correcto"
				>
					<Undo2Icon data-icon="inline-start" aria-hidden="true" />
					Deshacer
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={userStrokes.length === 0 && attempts === 0}
					onclick={resetPractice}
					aria-label="Reiniciar la práctica"
				>
					<RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
					Reiniciar
				</Button>
			</div>
		</figcaption>
	{/if}
</figure>
