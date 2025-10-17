<svelte:head>
  <link rel="stylesheet" href="/vendor/celestial/celestial.css" />
</svelte:head>

<!-- 注意：这里必须是普通容器，不要用 <canvas> -->
<div id="celestial-map" style="width:520px;height:520px;background:#0a0e17;border:1px solid #444"></div>

<script lang="ts">
  import { onMount } from 'svelte';

  export type Highlight = { ra: number; dec: number; label: string; mag?: number | null };
  export let lat = 0;
  export let lon = 0;
  export let date: Date = new Date();
  export let width = 520;
  export let highlights: Highlight[] = [];

  function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function toGeoJSONPoints(list: Highlight[]) {
    return {
      type: 'FeatureCollection',
      features: list.map((h) => ({
        type: 'Feature',
        properties: { name: h.label, mag: h.mag ?? null },
        geometry: { type: 'Point', coordinates: [h.ra, h.dec] } // RA/Dec（度）
      }))
    };
  }

  onMount(async () => {
    try {
      await loadScript('/vendor/celestial/d3.v3.min.js');
      await loadScript('/vendor/celestial/celestial.min.js');
      const Celestial = (window as any).Celestial;
      console.log('[Celestial] lib loaded:', !!Celestial);

      if (isNaN(date.getTime())) date = new Date();

      // ！！关键：projection 必须是 'stereographic'（不是 'stereo'）
      // container 传 id 字符串，不带 '#'
      Celestial.display({
        container: 'celestial-map',
        datapath: '/vendor/celestial/data/',
        projection: 'stereographic',
        width,
        transform: 'equatorial',
        stars: { show: true, limit: 6, colors: true, names: true },
        constellations: { show: true, lines: true, names: true, boundaries: false },
        horizon: { show: true },
        geopos: [lat, lon],
        date
      });

      // 画布是否生成（canvas 或 svg 二选一）
      const child = document.querySelector('#celestial-map canvas, #celestial-map svg');
      console.log('[Celestial] child present?', !!child, child);

      // 简单的可视化“测试点”（就算星表没加载也能看到一个点）
      Celestial.add({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'TEST • RA0° Dec0°' },
            geometry: { type: 'Point', coordinates: [0, 0] }
          }
        ]
      }, { id: 'diagnostic-point', type: 'point', size: 4, color: '#00ffff', names: true });

      // 你的高亮层
      Celestial.add(toGeoJSONPoints(highlights), {
        id: 'visible-highlights',
        type: 'point',
        color: '#ffcc88',
        size: 2.2,
        magnitude: true,
        names: true,
        style: { fill: '#ffcc88', stroke: '#000', width: 1 }
      });

      Celestial.redraw?.();
      console.log('[Celestial] redraw done');
    } catch (e) {
      console.error('[Celestial] init error', e);
    }
  });

  // 可选：当外部 props 变化时，刷新地点/时间与高亮
  $: (async () => {
    const Celestial = (typeof window !== 'undefined') && (window as any).Celestial;
    if (!Celestial) return;

    try {
      // 更新视图（H()里挂的 API）
      Celestial.skyview?.({ location: [lat, lon], date });

      // 重绘高亮
      Celestial.remove?.('visible-highlights');
      Celestial.add(toGeoJSONPoints(highlights), {
        id: 'visible-highlights',
        type: 'point',
        color: '#ffcc88',
        size: 2.2,
        magnitude: true,
        names: true,
        style: { fill: '#ffcc88', stroke: '#000', width: 1 }
      });

      Celestial.redraw?.();
    } catch {
      /* noop */
    }
  })();
</script>

<style>
  /* 让库插入的 canvas/svg 自适应容器大小 */
  #celestial-map > canvas,
  #celestial-map > svg {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
</style>
