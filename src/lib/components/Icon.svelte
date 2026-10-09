<script lang="ts">
	let {
		name,
		size = 20,
		stroke = 1.6
	}: { name: string; size?: number; stroke?: number } = $props();
	const paths: Record<string, string[]> = {
		star: ['m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z'],
		sparkle: ['M12 3c0 6-3 9-9 9 6 0 9 3 9 9 0-6 3-9 9-9-6 0-9-3-9-9Z'],
		pin: ['M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
		clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7v5l3 2'],
		arrow: ['M4 12h16', 'm14 6 6 6-6 6'],
		back: ['M20 12H4', 'm10 6-6 6 6 6'],
		moon: ['M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z'],
		sun: [
			'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
			'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'
		],
		globe: [
			'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
			'M3 12h18',
			'M12 3a19 19 0 0 1 0 18 19 19 0 0 1 0-18Z'
		],
		compass: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'm16 8-3 5-5 3 3-5 5-3Z'],
		sliders: ['M4 7h16M4 17h16M8 4v6m8 4v6'],
		check: ['m5 12 4 4L19 6'],
		copy: ['M9 9h11v12H9V9Z', 'M5 15H3V3h12v2'],
		search: ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z', 'm15 15 6 6'],
		reset: ['M3 10a9 9 0 1 1 1 7', 'M3 4v6h6'],
		edit: ['m15 4 5 5-11 11H4v-5L15 4Z', 'm12 7 5 5'],
		info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 11v6m0-10v.1'],
		telescope: ['m3 8 14-5 3 8-14 5-3-8Z', 'm11 14 1 3m0 0-4 5m4-5 4 5'],
		chevron: ['m8 10 4 4 4-4'],
		download: ['M12 3v12m-5-5 5 5 5-5', 'M4 16v5h16v-5']
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#each paths[name] || paths.star as d (d)}<path {d} />{/each}
</svg>
