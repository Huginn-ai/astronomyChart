<script lang="ts">
  import { page } from '$app/stores';
  import { get, writable } from 'svelte/store';
  import { STARS, ASTERISMS } from '$lib/stars/catalog';
  import { raDecToAltAz, isVisible } from '$lib/utils/astro';
  import { t, locale, waitLocale } from '$lib/i18n';
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';

  import SkyChart from '$lib/components/SkyChart.svelte';
  import CelestialChart from '$lib/components/CelestialChart.svelte';

  // —— 视图模式：'sky'（自绘 SkyChart）或 'celestial'（CelestialChart）——
  type ChartMode = 'sky' | 'celestial';
  let chartMode: ChartMode = 'sky';

  const browser = typeof window !== 'undefined';

  // 初始：优先读 URL ?view=，否则读 localStorage
  onMount(() => {
    if (!browser) return;
    const sp = new URLSearchParams(window.location.search);
    const view = (sp.get('view') || '').toLowerCase();
    if (view === 'celestial' || view === 'sky') {
      chartMode = view as ChartMode;
    } else {
      const saved = localStorage.getItem('chartMode') as ChartMode | null;
      if (saved === 'celestial' || saved === 'sky') chartMode = saved;
    }
  });

  // 切换图表模式
  function setChartMode(m: ChartMode) {
    chartMode = m;
    if (browser) localStorage.setItem('chartMode', m);
  }
  function toggleChartMode() {
    setChartMode(chartMode === 'sky' ? 'celestial' : 'sky');
  }

  // 本地翻译函数
  let tr: (k: string) => string = (k) => k;
  const unsubT = t.subscribe((fn) => { tr = fn; });
  onDestroy(unsubT);

  // 触发依赖 locale 的 $: 语句
  // @ts-ignore - Svelte store magic
  $: $locale;

  let lat = 0, lon = 0, timeStr = '';

  // —— 名称风格：popular / both / mansion ——
  type NameMode = 'popular' | 'mansion' | 'both';
  function splitCn(raw = '') {
    const m = raw.match(/^(.*?)(?:[（(]\s*(.+?)\s*[)）])?$/);
    return { main: (m?.[1] ?? '').trim(), alias: (m?.[2] ?? '').trim() };
  }
  function formatStarNameZh(opts: { rawCn: string; mode: NameMode }): string {
    const { rawCn, mode } = opts;
    const text = (rawCn ?? '').trim();
    if (!text) return ''; // 防守式兜底
    const m = text.match(/^(.*?)(?:[（(]\s*(.+?)\s*[)）])?$/);
    const main = (m?.[1] ?? '').trim();
    const alias = (m?.[2] ?? '').trim();
    if (mode === 'mansion') return alias || main || '';
    if (mode === 'both')    return alias ? `${main}（${alias}）` : main;
    return main || alias || '';
  }

  const savedName = browser ? (localStorage.getItem('nameMode') as NameMode | null) : null;
  export const nameMode = writable<NameMode>(savedName || 'popular');
  nameMode.subscribe(v => { if (browser) localStorage.setItem('nameMode', v); });
  let curNameMode: NameMode = savedName || 'popular';
  const unsubNameMode = nameMode.subscribe(v => (curNameMode = v));
  onDestroy(unsubNameMode);
  function cycleNameMode() {
    nameMode.update(v => (v === 'popular' ? 'both' : v === 'both' ? 'mansion' : 'popular'));
  }

  // 表格数据类型
  type VisibleStar = {
    nameKey: string;
    alt: number;
    az: number;
    mag?: number | null;
    fallback: { cn: string; id: string };
  };

  let visibleStars: VisibleStar[] = [];
  let visibleAsterisms: string[] = [];

  let visibleStarsSorted: VisibleStar[] = [];
  let visibleAsterismsSorted: string[] = [];

  function azToDirectionLocalized(azDeg: number, lang: string): string {
    const dir = { N: tr('dir_N'), E: tr('dir_E'), S: tr('dir_S'), W: tr('dir_W'), of: tr('dir_of') };
    const bases = [
      { base: 0,   name: dir.N },
      { base: 90,  name: dir.E },
      { base: 180, name: dir.S },
      { base: 270, name: dir.W },
      { base: 360, name: dir.N }
    ];
    for (let i = 0; i < bases.length - 1; i++) {
      const a1 = bases[i].base, a2 = bases[i + 1].base;
      if (azDeg >= a1 && azDeg < a2) {
        const diff = azDeg - a1;
        if (diff < 5) return bases[i].name;
        const next = bases[i + 1].name;
        const offset = Math.round(diff);
        return lang.startsWith('zh')
          ? `${next}${dir.of}${bases[i].name}${offset}°`
          : `${next} ${dir.of} ${bases[i].name} ${offset}°`;
      }
    }
    return (lang.startsWith('zh') ? '未知' : 'Unknown');
  }

  function fmtMag(m?: number | null): string {
    return (typeof m === 'number' && isFinite(m)) ? m.toFixed(2) : '—';
  }

  // 计算可见星 & 星群
  function compute() {
    const q = get(page).url.searchParams;
    lat = Number(q.get('lat') ?? 0);
    lon = Number(q.get('lon') ?? 0);
    timeStr = q.get('time') ?? '';
    const date = new Date(timeStr);

    const starVisible = new Map<string, boolean>();
    visibleStars = [];

    for (const s of STARS) {
      const { altDeg, azDeg } = raDecToAltAz(date, lat, lon, s.raDeg, s.decDeg);
      const ok = isVisible(altDeg, 0);
      starVisible.set(s.id, ok);
      if (ok) {
        visibleStars.push({
          nameKey: `star:${s.id}`,
          alt: altDeg,
          az: azDeg,
          mag: typeof (s as any).mag === 'number' ? (s as any).mag : null,
          fallback: { cn: (s as any).cn, id: s.id }
        });
      }
    }

    visibleAsterisms = ASTERISMS
      .filter(a => a.members.every(m => starVisible.get(m) === true))
      .map(a => `asterism:${a.id}`);
  }

  // 初次与每次查询参数变化时重算
  $: compute();

  // 排序
  $: {
    const lang = ($locale as string) ?? 'en';
    visibleStarsSorted = [...visibleStars].sort((a, b) => {
      const byAlt = b.alt - a.alt;
      if (byAlt !== 0) return byAlt;
      const an = tr(a.nameKey);
      const bn = tr(b.nameKey);
      return an.localeCompare(bn, lang, { sensitivity: 'base', numeric: true });
    });
    visibleAsterismsSorted = [...visibleAsterisms].sort((a, b) => {
      const an = tr(a);
      const bn = tr(b);
      return an.localeCompare(bn, lang, { sensitivity: 'base', numeric: true });
    });
  }

  async function toggleLang() {
    const cur = get(locale) ?? 'en';
    const next = cur.startsWith('zh') ? 'en' : 'zh';
    locale.set(next);
    await waitLocale();
  }

  function goBack() { if (history.length > 1) history.back(); else goto('/'); }

  // 缺省翻译回退（表格用）
  function displayWithFallbackStar(
    s: VisibleStar,
    lang: string,
    mode: NameMode
  ): string {
    const label = tr(s.nameKey);

    // 英文：优先翻译，否则回退 id
    if (!lang.startsWith('zh')) {
      return label === s.nameKey ? s.fallback.id : label;
    }

    // 中文：按模式格式化
    const star = STARS.find(x => x.id === s.fallback.id);
    const rawCn = star?.cn ?? s.fallback.cn;
    return formatStarNameZh({ rawCn, mode }); // ✅ 别忘了 return；用传入的 mode
  }




  // —— SkyChart 所需数据（Alt/Az） ——
  type ChartStar = { id: string; cn?: string; alt: number; az: number; mag?: number };
  type ChartAsterism = { id: string; members: string[] };

  let chartStars: ChartStar[] = [];
  let chartAsterisms: ChartAsterism[] = [];
  let chartLocale: 'en' | 'zh' = 'en';

  // 这里把 s.cn 预先格式化为当前 NameMode，SkyChart 的中文标签自动同步
  $: chartStars = visibleStarsSorted.map((s) => {
    const star = STARS.find(x => x.id === s.fallback.id);
    const rawCn = star?.cn ?? s.fallback.cn;
    return {
      id: s.fallback.id,
      cn: formatStarNameZh({ rawCn, mode: curNameMode }),
      alt: s.alt,
      az: s.az,
      mag: s.mag ?? undefined
    };
  });

  $: {
    const visibleIds = new Set(visibleAsterisms.map((k) => k.replace(/^asterism:/, '')));
    chartAsterisms = ASTERISMS
      .filter((a) => visibleIds.has(a.id))
      .map((a) => ({ id: a.id, members: a.members }));
  }

  $: chartLocale = ((($locale as string) || 'en').startsWith('zh') ? 'zh' : 'en') as 'en' | 'zh';

  // —— CelestialChart 所需数据（RA/Dec 高亮） ——
  type Highlight = { ra: number; dec: number; label: string; mag?: number | null };
  let highlights: Highlight[] = [];
  $: highlights = visibleStarsSorted.map((s) => {
    const star = STARS.find((x) => x.id === s.fallback.id);
    if (!star) return null;
    return {
      ra: star.raDeg,
      dec: star.decDeg,
      label: displayWithFallbackStar(s, (($locale as string) ?? 'en'), curNameMode),
      mag: s.mag ?? null
    };
  }).filter(Boolean) as Highlight[];

  // time 兜底
  let safeDate: Date = new Date();
  $: safeDate = timeStr ? new Date(timeStr) : new Date();

  // SkyChart 旋转角（仅 Sky 模式可见）
  let rot = 0;
  function resetRot() { rot = 0; }
</script>

<main class="card">
  <div class="lang-switch">
    <button type="button" class="btn" on:click={toggleLang}>{tr('lang_toggle')}</button>
    {#if ((($locale as string) || 'en').startsWith('zh'))}
      <button type="button" class="btn" on:click={cycleNameMode} style="margin-left:.5rem">
        {tr('name_mode.switch')}: {tr(`name_mode.${curNameMode}`)}
      </button>
    {/if}
  </div>

  <h2>{tr('settings')}</h2>
  <p>{tr('place')}: {tr('latitude')} {lat.toFixed(3)}°, {tr('longitude')} {lon.toFixed(3)}°</p>
  <p>{tr('time')}: {timeStr}</p>

  <h2>🗺️ {tr('skyMap')}</h2>

  <!-- 切换工具条 -->
  <div class="chart-toolbar">
    <div class="segmented">
      <button
        type="button"
        class="btn"
        class:active={chartMode === 'sky'}
        aria-pressed={chartMode === 'sky'}
        on:click={() => setChartMode('sky')}>
        SkyMap
      </button>
      <button
        type="button"
        class="btn"
        class:active={chartMode === 'celestial'}
        aria-pressed={chartMode === 'celestial'}
        on:click={() => setChartMode('celestial')}>
        Celestial
      </button>
    </div>

    {#if chartMode === 'sky'}
      <button type="button" class="btn" on:click={resetRot}>↺ {tr('reset') ?? 'Reset'}</button>
    {/if}
  </div>

  {#if chartMode === 'sky'}
    <!-- Canvas 版天图 -->
    <SkyChart
      stars={chartStars}
      asterisms={chartAsterisms}
      locale={chartLocale}
      showGrid={true}
      minAlt={0}
      showLabels={true}
      labelMagLimit={2.2}
      labelFontPx={12}
      labelHalo={true}
      bind:rotationDeg={rot}
    />
    <p class="helper">Rotation: {rot.toFixed(1)}°</p>
  {:else}
    <!-- 基于 Celestial.js 的赤道投影 -->
    <CelestialChart
      {lat}
      {lon}
      date={safeDate}
      width={520}
      {highlights}
    />
  {/if}

  <h2>{tr('visibleStars')}</h2>
  {#if visibleStarsSorted.length === 0}
    <p>{tr('noStars')}</p>
  {:else}
    <table class="table">
      <thead>
        <tr>
          <th>{tr('star_name')}</th>
          <th>{tr('alt')}</th>
          <th>{tr('az')}</th>
          <th>{tr('mag')}</th>
        </tr>
      </thead>
      <tbody>
        {#each visibleStarsSorted as s}
          <tr>
            <td>{displayWithFallbackStar(s, (($locale as string) ?? 'en'), curNameMode)}</td>
            <td>{s.alt.toFixed(1)}</td>
            <td>{azToDirectionLocalized(s.az, (($locale as string) ?? 'en'))}</td>
            <td>{fmtMag(s.mag)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <h2>✨ {tr('visibleAsterisms')}</h2>
  {#if visibleAsterismsSorted.length === 0}
    <p>—</p>
  {:else}
    <ul>
      {#each visibleAsterismsSorted as key}
        {#if tr(key) === key}
          <li>{key.replace(/^asterism:/, '')}</li>
        {:else}
          <li>{tr(key)}</li>
        {/if}
      {/each}
    </ul>
  {/if}

  <div class="back-row">
    <button type="button" class="btn btn-primary" on:click={goBack}>
      {tr('back')}
    </button>
  </div>
</main>

<style>
  .lang-switch { display: flex; justify-content: flex-end; margin-bottom: .5rem; }
  .chart-toolbar { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; }
  .segmented {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  .segmented .btn {
    border: none;
    border-right: 1px solid var(--border);
    background: #0f1626;
  }
  .segmented .btn:last-child { border-right: none; }
  .segmented .btn.active {
    background: var(--primary);
    color: #fff;
    box-shadow: 0 8px 20px rgba(59,130,246,.25);
  }

  .table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { padding: .6rem; text-align: center; border-bottom: 1px solid var(--border); }
  th { font-weight: 600; }
  .back-row { margin-top: 1.25rem; display: flex; justify-content: flex-start; }
  .helper { color: var(--muted); font-size: .9rem; }
</style>
