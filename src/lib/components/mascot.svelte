<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { class: className, ...restProps }: { class?: string } = $props();
</script>

<svg
	viewBox="0 0 64 64"
	role="img"
	aria-label="Kucho, el zorro mascota"
	class={cn('size-10', className)}
	{...restProps}
>
	<!-- ears -->
	<path d="M13 21 L7 4 L24 15 Z" fill="#E17A3E" />
	<path d="M51 21 L57 4 L40 15 Z" fill="#E17A3E" />
	<path d="M15 19 L12 9 L22 16 Z" fill="#4A3040" />
	<path d="M49 19 L52 9 L42 16 Z" fill="#4A3040" />

	<!-- head -->
	<ellipse cx="32" cy="34" rx="21" ry="19.5" fill="#F2934F" />

	<!-- cheeks -->
	<circle cx="18.5" cy="38" r="4.2" fill="#F7B8C4" opacity="0.75" />
	<circle cx="45.5" cy="38" r="4.2" fill="#F7B8C4" opacity="0.75" />

	<!-- muzzle -->
	<path
		d="M32 33c-8.5 0-13 6.2-13 10.6C19 51.2 25 57 32 57s13-5.8 13-13.4C45 39.2 40.5 33 32 33Z"
		fill="#FFF7EF"
	/>

	<!-- eyes -->
	<circle cx="22.5" cy="34" r="2.7" fill="#4A3040" />
	<circle cx="41.5" cy="34" r="2.7" fill="#4A3040" />
	<circle cx="23.5" cy="33" r="0.9" fill="#FFFFFF" />
	<circle cx="42.5" cy="33" r="0.9" fill="#FFFFFF" />

	<!-- nose -->
	<path d="M32 42.5l-3.4 2.4h6.8Z" fill="#4A3040" />
	<!-- mouth -->
	<path
		d="M32 45v2.2M32 47.2c-1.6 2-3.6 2.4-5.4.9M32 47.2c1.6 2 3.6 2.4 5.4.9"
		stroke="#4A3040"
		stroke-width="1.4"
		stroke-linecap="round"
		fill="none"
	/>
</svg>
