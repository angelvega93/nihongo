<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { class: className, ...restProps }: { class?: string } = $props();

	/** Star field: [x, y, radius, opacity] */
	const stars: [number, number, number, number][] = [
		[18, 40, 1.6, 0.9],
		[52, 22, 1.1, 0.6],
		[86, 58, 1.4, 0.8],
		[124, 30, 1, 0.5],
		[158, 70, 1.7, 0.85],
		[196, 38, 1.2, 0.65],
		[222, 92, 1.5, 0.75],
		[34, 118, 1.3, 0.7],
		[72, 146, 1, 0.45],
		[110, 108, 1.6, 0.8],
		[148, 158, 1.1, 0.55],
		[186, 126, 1.4, 0.7],
		[214, 176, 1, 0.5],
		[26, 204, 1.5, 0.75],
		[64, 232, 1.2, 0.6],
		[102, 196, 1, 0.45],
		[140, 244, 1.6, 0.8],
		[178, 214, 1.1, 0.55],
		[210, 262, 1.3, 0.65],
		[44, 292, 1.4, 0.7],
		[82, 320, 1, 0.45],
		[120, 284, 1.5, 0.75],
		[158, 332, 1.2, 0.6],
		[196, 300, 1, 0.5],
		[30, 372, 1.6, 0.8],
		[68, 400, 1.1, 0.55],
		[106, 364, 1.3, 0.65],
		[144, 412, 1, 0.45],
		[182, 380, 1.5, 0.75],
		[218, 428, 1.2, 0.6],
		[50, 460, 1.4, 0.7],
		[88, 488, 1, 0.5],
		[126, 452, 1.6, 0.8],
		[164, 500, 1.1, 0.55],
		[202, 468, 1.3, 0.65],
		[36, 540, 1.5, 0.75],
		[74, 568, 1.2, 0.6],
		[112, 532, 1, 0.45],
		[150, 580, 1.4, 0.7],
		[188, 548, 1.1, 0.55],
		[224, 596, 1.6, 0.8],
		[58, 628, 1.3, 0.65],
		[96, 656, 1, 0.5],
		[134, 620, 1.5, 0.75],
		[172, 668, 1.2, 0.6],
		[210, 636, 1.4, 0.7],
		[42, 708, 1.1, 0.55],
		[80, 736, 1.6, 0.8],
		[118, 700, 1.3, 0.65],
		[156, 748, 1, 0.45],
		[194, 716, 1.5, 0.75],
		[230, 764, 1.2, 0.6]
	];

	/** Four-point sparkles: [x, y, size, opacity] */
	const sparkles: [number, number, number, number][] = [
		[96, 84, 7, 0.9],
		[204, 148, 5, 0.7],
		[46, 336, 6, 0.8],
		[168, 424, 5, 0.65],
		[110, 604, 7, 0.85],
		[212, 692, 5, 0.7]
	];
</script>

<div
	class={cn(
		'pointer-events-none absolute inset-0 overflow-hidden bg-linear-to-b from-night-1 via-night-2 to-night-3',
		className
	)}
	{...restProps}
>
	<svg
		class="absolute inset-0 size-full"
		viewBox="0 0 240 800"
		preserveAspectRatio="xMidYMid slice"
		aria-hidden="true"
	>
		<defs>
			<radialGradient id="night-glow" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color="var(--star)" stop-opacity="0.22" />
				<stop offset="100%" stop-color="var(--star)" stop-opacity="0" />
			</radialGradient>
			<mask id="night-moon">
				<rect width="240" height="800" fill="black" />
				<circle cx="172" cy="168" r="24" fill="white" />
				<circle cx="183" cy="159" r="22" fill="black" />
			</mask>
		</defs>

		<!-- soft glow behind the moon -->
		<circle cx="172" cy="168" r="64" fill="url(#night-glow)" />
		<!-- crescent moon -->
		<rect width="240" height="800" fill="var(--star)" opacity="0.9" mask="url(#night-moon)" />

		<!-- stars -->
		{#each stars as [x, y, r, opacity] (x * 1000 + y)}
			<circle cx={x} cy={y} r={r} fill="var(--star)" opacity={opacity} />
		{/each}

		<!-- sparkles -->
		{#each sparkles as [x, y, size, opacity] (x * 1000 + y)}
			<path
				d="M{x} {y - size} Q{x + size * 0.18} {y - size * 0.18} {x + size} {y} Q{x + size * 0.18} {y + size * 0.18} {x} {y + size} Q{x - size * 0.18} {y + size * 0.18} {x - size} {y} Q{x - size * 0.18} {y - size * 0.18} {x} {y - size} Z"
				fill="var(--star)"
				opacity={opacity}
			/>
		{/each}

		<!-- drifting clouds near the horizon -->
		<g fill="var(--star)" opacity="0.07">
			<ellipse cx="60" cy="742" rx="86" ry="26" />
			<ellipse cx="150" cy="768" rx="104" ry="30" />
			<ellipse cx="210" cy="726" rx="70" ry="22" />
		</g>
	</svg>
</div>