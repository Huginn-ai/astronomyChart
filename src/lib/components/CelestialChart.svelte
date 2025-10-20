<svelte:head>
  <link rel="stylesheet" href="/vendor/celestial/celestial.css" />
</svelte:head>

<!-- 外层用于设定最大宽度；内层是 Celestial 的容器 -->
<div
  class="celestial-wrap"
  style={`--celestial-max:${width > 0 ? width + 'px' : '640px'}`}
  bind:this={host}
>
  <!-- 注意：必须是普通容器，不是 <canvas> -->
  <div id={cid} class="celestial-box"></div>
</div>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export type Highlight = { ra: number; dec: number; label: string; mag?: number | null };
  export let lat = 0;
  export let lon = 0;
  export let date: Date = new Date();

  /** 最大宽度上限（px）。设 0 表示 640 的默认上限 */
  export let width = 0;

  export let highlights: Highlight[] = [];

  const cid = 'celestial-map';
  let host!: HTMLDivElement;
  let ro: ResizeObserver | null = null;
  let raf = 0;

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

  // 防抖：容器尺寸变化时重绘
  function doResize() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      // 0 = 让库按父容器宽度自适应
      // @ts-ignore
      window.Celestial?.resize(0);
    });
  }

  onMount(async () => {
    try {
      await loadScript('/vendor/celestial/d3.v3.min.js');
      await loadScript('/vendor/celestial/celestial.min.js');
      const Celestial = (window as any).Celestial;

      if (isNaN(date.getTime())) date = new Date();

      // 关键：width: 0 → 使用父容器宽度（由 .celestial-box 决定）
      Celestial.display({
        container: cid,                  // 不带 '#'
        datapath: '/vendor/celestial/data/',
        projection: 'stereographic',     // 注意不是 'stereo'
        width: 0,                        // 响应式：按父容器宽度
        transform: 'equatorial',
        stars: { show: false, limit: 6, colors: true, names: true },
        constellations: { show: false, lines: true, names: true, boundaries: false },
        horizon: { show: false },
        geopos: [lat, lon],
        date
      });

      // 诊断点（可保留/删除）
      Celestial.add({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { name: 'TEST • RA0° Dec0°' }, geometry: { type: 'Point', coordinates: [0, 0] } }]
      }, { id: 'diagnostic-point', type: 'point', size: 4, color: '#00ffff', names: true });

      // 高亮层
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

      // 监听父容器尺寸变化（布局/列宽/侧栏变化等都会触发）
      ro = new ResizeObserver(doResize);
      ro.observe(host); // 也可以 observe document.getElementById(cid)!
      window.addEventListener('resize', doResize);
      window.addEventListener('orientationchange', doResize);
    } catch (e) {
      console.error('[Celestial] init error', e);
    }
  });

  onDestroy(() => {
    ro?.disconnect();
    window.removeEventListener('resize', doResize);
    window.removeEventListener('orientationchange', doResize);
  });

  // 外部 props 变化时刷新地点/时间与高亮（不重复 display）
  $: (async () => {
    const Celestial = (typeof window !== 'undefined') && (window as any).Celestial;
    if (!Celestial) return;

    try {
      Celestial.skyview?.({ location: [lat, lon], date });

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
  /* 外层：限制最大宽度；你也可在页面栅格里控制 */
  .celestial-wrap {
    width: 100%;
    max-width: var(--celestial-max, 640px);
  }

  /* 关键：让容器成为自适应的正方形（高度随宽度变） */
  .celestial-box {
    width: 100%;
    aspect-ratio: 1 / 1;
    background: #0a0e17;
    border: 1px solid #444;
  }

  /* 让库插入的 canvas/svg 占满容器 —— 全局选择器 */
  :global(#celestial-map > canvas),
  :global(#celestial-map > svg) {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
</style>