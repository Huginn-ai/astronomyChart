<script lang="ts">
	import { onMount } from 'svelte';
	import { createI18n } from '$lib/i18n/reactive.svelte';
	import { lstInDegrees } from '$lib/utils/astro';
	import { loadCelestial, celestialApi, type Highlight } from '$lib/utils/celestial';
	let {
		lat = 0,
		lon = 0,
		date,
		highlights = []
	}: { lat?: number; lon?: number; date: Date; highlights?: Highlight[] } = $props();
	const i18n = createI18n();
	let host: HTMLDivElement;
	let ready = $state(false);
	let failed = $state(false);
	let frame = 0;

	function center(): [number, number, number] {
		const ra = lstInDegrees(date, lon);
		return [ra > 180 ? ra - 360 : ra, lat, 0];
	}
	function colors() {
		const vars = getComputedStyle(document.documentElement);
		const get = (name: string) => vars.getPropertyValue(name).trim();
		return {
			background: { fill: get('--chart-bg'), stroke: get('--border'), opacity: 1 },
			lines: {
				graticule: { show: true, stroke: get('--chart-line'), width: 0.7, opacity: 0.3 },
				equatorial: { show: false },
				ecliptic: { show: false },
				galactic: { show: false },
				supergalactic: { show: false }
			}
		};
	}
	function drawHighlights() {
		const api = celestialApi();
		if (!api?.context) return;
		const vars = getComputedStyle(document.documentElement),
			ctx = api.context;
		ctx.save();
		ctx.fillStyle = vars.getPropertyValue('--star').trim();
		ctx.textBaseline = 'middle';
		ctx.font = '11px system-ui';
		for (const star of highlights) {
			const point: [number, number] = [star.ra > 180 ? star.ra - 360 : star.ra, star.dec];
			if (!api.clip(point)) continue;
			const [x, y] = api.mapProjection(point);
			if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
			ctx.beginPath();
			ctx.arc(x, y, Math.max(1.8, 3.5 - (star.mag ?? 2) * 0.5), 0, Math.PI * 2);
			ctx.fill();
			if ((star.mag ?? 2) <= 2.5) ctx.fillText(star.label, x + 7, y - 8);
		}
		ctx.restore();
	}
	$effect(() => {
		void [lat, lon, date, highlights];
		if (ready) {
			const api = celestialApi();
			api?.rotate({ center: center() });
			api?.redraw();
		}
	});
	onMount(() => {
		let disposed = false;
		let resize: ResizeObserver | undefined, theme: MutationObserver | undefined;
		const previousResize = window.onresize;
		let libraryResize: typeof window.onresize;
		void (async () => {
			try {
				const api = await loadCelestial();
				if (disposed) return;
				// Celestial is a singleton: one layer, registered once per mount.
				// Its API accepts a raw callback, not a GeoJSON + options pair.
				api.clear();
				api.add({ type: 'raw', callback: () => api.redraw(), redraw: drawHighlights });
				api.display({
					container: 'celestial-map',
					datapath: '/vendor/celestial/data/',
					projection: 'stereographic',
					width: Math.floor(host.clientWidth),
					transform: 'equatorial',
					center: center(),
					geopos: null,
					form: false,
					location: false,
					controls: false,
					interactive: true,
					stars: { show: false },
					planets: { show: false, which: [] },
					dsos: { show: false },
					mw: { show: false },
					constellations: { names: false, lines: false, bounds: false },
					...colors()
				});
				libraryResize = window.onresize;
				ready = true;
				let lastWidth = Math.floor(host.clientWidth);
				resize = new ResizeObserver(() => {
					const width = Math.floor(host.clientWidth);
					if (width <= 0 || width === lastWidth) return;
					lastWidth = width;
					cancelAnimationFrame(frame);
					frame = requestAnimationFrame(() => api.resize({ width }));
				});
				resize.observe(host);
				theme = new MutationObserver(() => api.apply(colors()));
				theme.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ['data-night']
				});
			} catch {
				if (!disposed) failed = true;
			}
		})();
		return () => {
			disposed = true;
			resize?.disconnect();
			theme?.disconnect();
			cancelAnimationFrame(frame);
			if (ready) {
				celestialApi()?.clear();
				if (window.onresize === libraryResize) window.onresize = previousResize;
			}
		};
	});
</script>

<div class="celestial-wrap" bind:this={host}>
	{#if failed}<p class="empty-state" role="alert">{i18n.tr('celestial_error')}</p>{:else}
		{#if !ready}<p class="loading" role="status">{i18n.tr('loading_map')}</p>{/if}
		<div id="celestial-map" aria-label={i18n.tr('celestial_map')}></div>
	{/if}
</div>

<style>
	.celestial-wrap {
		width: 100%;
		position: relative;
		min-height: 250px;
		padding-top: 16px;
	}
	#celestial-map {
		width: 100%;
	}
	.loading {
		position: absolute;
		top: 45%;
		width: 100%;
		text-align: center;
		font-size: 0.8rem;
		color: var(--muted);
	}
	:global(#celestial-map canvas) {
		max-width: 100%;
		display: block;
		border-radius: 12px;
	}
</style>
