<script lang="ts">
	import { onMount } from 'svelte';
	import { normalizeDegrees } from '$lib/utils/astro';
	import { formatDirection, type Language } from '$lib/utils/observing';
	import type { Asterism } from '../../types/Stars';

	type Point = {
		id: string;
		cn?: string;
		label?: string;
		alt: number;
		az: number;
		mag?: number;
		kind?: 'star' | 'cluster';
	};
	type Props = {
		stars?: Point[];
		asterisms?: Asterism[];
		locale?: Language;
		minAlt?: number;
		showGrid?: boolean;
		showLabels?: boolean;
		showPatterns?: boolean;
		labelMagLimit?: number;
		rotationDeg?: number;
		interactive?: boolean;
		selectedId?: string | null;
		onselect?: (id: string | null) => void;
	};
	let {
		stars = [],
		asterisms = [],
		locale = 'en',
		minAlt = 0,
		showGrid = true,
		showLabels = true,
		showPatterns = true,
		labelMagLimit = 2.5,
		rotationDeg = $bindable(0),
		interactive = true,
		selectedId = null,
		onselect
	}: Props = $props();
	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let frame = 0;
	let dragging = false;
	let moved = false;
	let startAngle = 0;
	let startRotation = 0;
	let startX = 0;
	let startY = 0;
	let disk: { cx: number; cy: number; radius: number; size: number } | null = null;
	let hitPoints: { id: string; x: number; y: number }[] = [];

	const label = (star: Point) => star.label || (locale === 'zh' ? star.cn : star.id) || star.id;
	const radiusFor = (mag = 2) => Math.max(1.6, Math.min(4.6, 3.7 - mag * 0.52));
	function xy(az: number, alt: number) {
		if (!disk) return [0, 0];
		const angle = ((az + rotationDeg) * Math.PI) / 180;
		const r = ((90 - alt) / 90) * disk.radius;
		return [disk.cx - r * Math.sin(angle), disk.cy - r * Math.cos(angle)];
	}
	type Box = { left: number; top: number; right: number; bottom: number };
	const overlaps = (a: Box, b: Box) =>
		!(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

	function scheduleDraw() {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(draw);
	}

	function draw() {
		if (!canvas || !container) return;
		const size = container.clientWidth;
		if (size < 1) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 3);
		const pixels = Math.round(size * dpr);
		if (canvas.width !== pixels || canvas.height !== pixels) {
			canvas.width = pixels;
			canvas.height = pixels;
		}
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, size, size);
		const style = getComputedStyle(document.documentElement);
		const color = (name: string) => style.getPropertyValue(name).trim();
		const starColor = color('--star'),
			lineColor = color('--chart-line'),
			accent = color('--accent'),
			muted = color('--muted');
		disk = { size, cx: size / 2, cy: size / 2, radius: size / 2 - (size < 350 ? 32 : 40) };
		const { cx, cy, radius } = disk;
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.fillStyle = color('--chart-bg');
		ctx.fill();
		ctx.strokeStyle = lineColor;
		ctx.globalAlpha = 0.6;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.globalAlpha = 1;

		// A thin outer compass ring and cardinal ticks.
		ctx.strokeStyle = lineColor;
		ctx.globalAlpha = 0.4;
		ctx.beginPath();
		ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
		ctx.stroke();
		for (let az = 0; az < 360; az += 10) {
			const theta = ((az + rotationDeg) * Math.PI) / 180;
			const r1 = radius + 6,
				r2 = radius + (az % 90 === 0 ? 12 : 9);
			ctx.beginPath();
			ctx.moveTo(cx - r1 * Math.sin(theta), cy - r1 * Math.cos(theta));
			ctx.lineTo(cx - r2 * Math.sin(theta), cy - r2 * Math.cos(theta));
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
		ctx.clip();

		if (showGrid) {
			ctx.strokeStyle = lineColor;
			ctx.globalAlpha = 0.22;
			ctx.lineWidth = 0.7;
			for (const alt of [30, 60]) {
				ctx.beginPath();
				ctx.arc(cx, cy, ((90 - alt) / 90) * radius, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.setLineDash([2, 5]);
			for (let az = 0; az < 360; az += 45) {
				const [x, y] = xy(az, 0);
				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.lineTo(x, y);
				ctx.stroke();
			}
			ctx.setLineDash([]);
			ctx.globalAlpha = 0.7;
			ctx.font = '10px system-ui';
			ctx.fillStyle = muted;
			ctx.textAlign = 'left';
			ctx.fillText('30°', cx + 5, cy - (radius * 2) / 3 + 12);
			ctx.fillText('60°', cx + 5, cy - radius / 3 + 12);
			ctx.globalAlpha = 1;
		}
		if (minAlt > 0) {
			ctx.strokeStyle = accent;
			ctx.globalAlpha = 0.28;
			ctx.setLineDash([4, 5]);
			ctx.beginPath();
			ctx.arc(cx, cy, ((90 - minAlt) / 90) * radius, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;
		}

		const points = stars.filter(
			(s) => Number.isFinite(s.alt) && Number.isFinite(s.az) && s.alt > minAlt && s.alt <= 90
		);
		const byId = new Map(points.map((s) => [s.id, s]));
		if (showPatterns) {
			ctx.strokeStyle = accent;
			ctx.globalAlpha = 0.45;
			ctx.lineWidth = 1;
			for (const pattern of asterisms) {
				if (!pattern.members.every((id) => byId.has(id))) continue;
				const edges: [string, string][] =
					pattern.edges ||
					pattern.members.map((id, i) => [id, pattern.members[(i + 1) % pattern.members.length]]);
				for (const [first, second] of edges) {
					const a = byId.get(first),
						b = byId.get(second);
					if (!a || !b || first === second) continue;
					const [x1, y1] = xy(a.az, a.alt),
						[x2, y2] = xy(b.az, b.alt);
					ctx.beginPath();
					ctx.moveTo(x1, y1);
					ctx.lineTo(x2, y2);
					ctx.stroke();
				}
			}
			ctx.globalAlpha = 1;
		}
		hitPoints = [];
		for (const star of points) {
			const [x, y] = xy(star.az, star.alt),
				r = radiusFor(star.mag);
			hitPoints.push({ id: star.id, x, y });
			if (star.id === selectedId) {
				ctx.strokeStyle = accent;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.arc(x, y, r + 7, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.fillStyle = star.id === selectedId ? accent : starColor;
			if (star.kind === 'cluster') {
				ctx.beginPath();
				ctx.arc(x, y, 5, 0, Math.PI * 2);
				ctx.strokeStyle = accent;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(x, y, 1.5, 0, Math.PI * 2);
				ctx.fill();
			} else {
				ctx.shadowColor = starColor;
				ctx.shadowBlur = star.mag !== undefined && star.mag < 1 ? 8 : 0;
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		}

		if (showLabels) {
			const font = size < 360 ? 10 : 11;
			ctx.font = `${font}px system-ui`;
			ctx.textBaseline = 'middle';
			const boxes: Box[] = [];
			const candidates = [...points]
				.filter(
					(s) =>
						s.id === selectedId ||
						s.mag === undefined ||
						s.mag <= labelMagLimit ||
						s.kind === 'cluster'
				)
				.sort(
					(a, b) =>
						Number(b.id === selectedId) - Number(a.id === selectedId) || (a.mag ?? 5) - (b.mag ?? 5)
				);
			for (const star of candidates) {
				const text = label(star),
					width = ctx.measureText(text).width;
				const [x, y] = xy(star.az, star.alt);
				const anchors = [
					[8, -9],
					[-width - 8, -9],
					[8, 10],
					[-width - 8, 10]
				];
				for (const [dx, dy] of anchors) {
					const tx = x + dx,
						ty = y + dy;
					const box = {
						left: tx - 2,
						right: tx + width + 2,
						top: ty - font / 2 - 2,
						bottom: ty + font / 2 + 2
					};
					const inside = [
						[box.left, box.top],
						[box.right, box.top],
						[box.left, box.bottom],
						[box.right, box.bottom]
					].every(([px, py]) => Math.hypot(px - cx, py - cy) < radius - 2);
					if (!inside || boxes.some((b) => overlaps(box, b))) continue;
					boxes.push(box);
					ctx.textAlign = 'left';
					ctx.lineWidth = 4;
					ctx.strokeStyle = color('--chart-bg');
					ctx.strokeText(text, tx, ty);
					ctx.fillStyle = star.id === selectedId ? accent : starColor;
					ctx.fillText(text, tx, ty);
					break;
				}
			}
		}
		ctx.restore();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = '11px system-ui';
		const directions = locale === 'zh' ? ['北', '东', '南', '西'] : ['N', 'E', 'S', 'W'];
		directions.forEach((text, i) => {
			const theta = ((i * 90 + rotationDeg) * Math.PI) / 180,
				r = radius + 23;
			ctx.fillStyle = i === 0 ? accent : muted;
			ctx.fillText(text, cx - r * Math.sin(theta), cy - r * Math.cos(theta));
		});
	}

	function pointer(e: PointerEvent) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: ((e.clientX - rect.left) * (disk?.size || rect.width)) / rect.width,
			y: ((e.clientY - rect.top) * (disk?.size || rect.width)) / rect.width
		};
	}
	function down(e: PointerEvent) {
		if (!interactive || !disk || e.button !== 0) return;
		const { x, y } = pointer(e);
		if (Math.hypot(x - disk.cx, y - disk.cy) > disk.radius) return;
		dragging = true;
		moved = false;
		startX = x;
		startY = y;
		startAngle = Math.atan2(y - disk.cy, x - disk.cx);
		startRotation = rotationDeg;
		canvas.setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!dragging || !disk) return;
		const { x, y } = pointer(e);
		if (Math.hypot(x - startX, y - startY) > 5) moved = true;
		if (moved)
			rotationDeg = normalizeDegrees(
				startRotation - ((Math.atan2(y - disk.cy, x - disk.cx) - startAngle) * 180) / Math.PI
			);
	}
	function up(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
		if (!moved) {
			const { x, y } = pointer(e);
			const closest = [...hitPoints].sort(
				(a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)
			)[0];
			if (closest && Math.hypot(closest.x - x, closest.y - y) < 18) onselect?.(closest.id);
		}
	}
	function cancel() {
		dragging = false;
	}
	function key(e: KeyboardEvent) {
		if (!interactive) return;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			e.preventDefault();
			rotationDeg = normalizeDegrees(rotationDeg + (e.key === 'ArrowLeft' ? 5 : -5));
		}
		if (e.key === 'Home') {
			e.preventDefault();
			rotationDeg = 0;
		}
		if (e.key === 'Escape') onselect?.(null);
	}

	$effect(() => {
		void [
			stars,
			asterisms,
			locale,
			minAlt,
			showGrid,
			showLabels,
			showPatterns,
			labelMagLimit,
			rotationDeg,
			selectedId
		];
		scheduleDraw();
		return () => cancelAnimationFrame(frame);
	});
	onMount(() => {
		const resize = new ResizeObserver(scheduleDraw);
		resize.observe(container);
		const theme = new MutationObserver(scheduleDraw);
		theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-night'] });
		window.addEventListener('resize', scheduleDraw);
		scheduleDraw();
		return () => {
			resize.disconnect();
			theme.disconnect();
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', scheduleDraw);
		};
	});
</script>

<div bind:this={container} class="chart-wrap">
	<canvas
		bind:this={canvas}
		class:interactive
		tabindex={interactive ? 0 : -1}
		aria-label={locale === 'zh'
			? '星图：左右方向键旋转，Home 重置。在目标列表中选择星星。'
			: 'Sky map: arrow keys rotate, Home resets. Select stars in the target list.'}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={cancel}
		onkeydown={key}
	>
		{#each stars as star (star.id)}<span
				>{label(star)} · {star.alt.toFixed(1)}° · {formatDirection(star.az, locale)}</span
			>{/each}
	</canvas>
</div>

<style>
	.chart-wrap {
		width: 100%;
		aspect-ratio: 1;
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 12px;
	}
	canvas.interactive {
		cursor: grab;
		touch-action: none;
	}
	canvas.interactive:active {
		cursor: grabbing;
	}
</style>
