<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { STARS, ASTERISMS } from '$lib/stars/catalog';
  import { raDecToAltAz, isVisible } from '$lib/utils/astro';

  import { t, locale, waitLocale } from '$lib/i18n';
  import { onDestroy } from 'svelte';

  // 本地翻译函数
  let tr: (k: string) => string = (k) => k;
  const unsubT = t.subscribe((fn) => { tr = fn; });
  onDestroy(unsubT);

  let lat = 0, lon = 0, timeStr = '';
  let visibleStars: { name: string; alt: number; az: number }[] = [];
  let visibleAsterisms: string[] = [];

  function azToDirectionLocalized(azDeg: number, lang: string): string {
    const dir =
      lang.startsWith('zh')
        ? { N: '北', E: '东', S: '南', W: '西', of: '偏' }
        : { N: 'N',  E: 'E',  S: 'S',  W: 'W',  of: 'of' };

    const bases = [
      { base: 0,   name: dir.N },
      { base: 90,  name: dir.E },
      { base: 180, name: dir.S },
      { base: 270, name: dir.W },
      { base: 360, name: dir.N }
    ];

    for (let i = 0; i < bases.length - 1; i++) {
      const a1 = bases[i].base;
      const a2 = bases[i + 1].base;
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
    return lang.startsWith('zh') ? '未知' : 'Unknown';
  }

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
      if (ok) visibleStars.push({ name: s.cn, alt: altDeg, az: azDeg });
    }

    visibleAsterisms = ASTERISMS
      .filter(a => a.members.every(m => starVisible.get(m) === true))
      .map(a => a.cn);

    visibleStars.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans'));
    visibleAsterisms.sort((a, b) => a.localeCompare(b, 'zh-Hans'));
  }

  $: compute();

  async function toggleLang() {
    const cur = get(locale) ?? 'en';
    const next = cur.startsWith('zh') ? 'en' : 'zh';
    locale.set(next);
    await waitLocale();
  }

  // 放在同文件 <script> 里
  import { goto } from '$app/navigation';

  function goBack() {
    if (history.length > 1) {
      history.back();
    } else {
      goto('/'); // 没有历史时回首页，避免无效
    }
  }

</script>

<main class="card">
  <div class="lang-switch">
    <button type="button" class="btn" on:click={toggleLang}>{tr('lang_toggle')}</button>
  </div>

  <h2>🪐 {tr('settings')}</h2>
  <p>{tr('place')}: {tr('latitude')} {lat.toFixed(3)}°, {tr('longitude')} {lon.toFixed(3)}°</p>
  <p>{tr('time')}: {timeStr}</p>

  <h2>⭐ {tr('visibleStars')}</h2>
  {#if visibleStars.length === 0}
    <p>{tr('noStars')}</p>
  {:else}
    <table class="table">
      <thead>
        <tr><th>{tr('star_name')}</th><th>{tr('alt')}</th><th>{tr('az')}</th></tr>
      </thead>
      <tbody>
        {#each visibleStars as s}
          <tr>
            <td>{s.name}</td>
            <td>{s.alt.toFixed(1)}</td>
            <td>{azToDirectionLocalized(s.az, get(locale) ?? 'en')}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <h2>✨ {tr('visibleAsterisms')}</h2>
  {#if visibleAsterisms.length === 0}
    <p>—</p>
  {:else}
    <ul>
      {#each visibleAsterisms as name}<li>{name}</li>{/each}
    </ul>
  {/if}


  <!-- 你的表格和列表... -->

  <div class="back-row">
    <button type="button" class="btn btn-primary" on:click={goBack}>
      {tr('back')}
    </button>
  </div>

</main>

<style>
  .lang-switch { display: flex; justify-content: flex-end; margin-bottom: .5rem; }
  .table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { padding: .6rem; text-align: center; border-bottom: 1px solid var(--border); }
  th { font-weight: 600; }
  .back-row { margin-top: 1.25rem; display: flex; justify-content: flex-start; }

</style>



