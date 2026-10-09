export type Highlight = { ra: number; dec: number; label: string; mag?: number | null };
export type CelestialApi = {
	display(config: Record<string, unknown>): void;
	add(layer: { type: 'raw'; callback: () => void; redraw: () => void }): void;
	clear(): void;
	redraw(): void;
	resize(config: { width: number }): void;
	rotate(config: { center: [number, number, number] }): void;
	apply(config: Record<string, unknown>): void;
	clip(point: [number, number]): boolean;
	mapProjection(point: [number, number]): [number, number];
	context: CanvasRenderingContext2D;
};
let vendorReady: Promise<CelestialApi> | null = null;

export function celestialApi(): CelestialApi | undefined {
	return (window as Window & { Celestial?: CelestialApi }).Celestial;
}

function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = src;
		script.async = false;
		script.onload = () => resolve();
		script.onerror = () => {
			script.remove();
			reject(new Error('Unable to load chart'));
		};
		document.head.appendChild(script);
	});
}

export function loadCelestial(): Promise<CelestialApi> {
	if (!vendorReady) {
		vendorReady = (async () => {
			if (!celestialApi()) {
				await loadScript('/vendor/celestial/d3.v3.min.js');
				await loadScript('/vendor/celestial/celestial.min.js');
			}
			const api = celestialApi();
			if (!api) throw new Error('Chart is unavailable');
			return api;
		})().catch((error) => {
			vendorReady = null;
			throw error;
		});
	}
	return vendorReady;
}
