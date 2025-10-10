<script lang="ts">
  import { page } from '$app/stores';
  import { STARS, ASTERISMS } from '$lib/stars/catalog';
  import { raDecToAltAz, isVisible } from '$lib/utils/astro';

  // i18n
  import { locale, waitLocale } from '$lib/i18n';
  import { get } from 'svelte/store';

  let lat = 0, lon = 0, timeStr = '';
  let visibleStars: { name: string; alt: number; az: number }[] = [];
  let visibleAsterisms: string[] = [];

  // 将 0–360° 方位角转为本地化描述：
  //  - zh:  "西偏北15°"
  //  - en:  "W of N 15°"
  function azToDirectionLocalized(azDeg: number, lang: string): string {
    const dir =
      lang === 'zh'
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
        if (diff < 5) return bases[i].name; // 接近正方向
        const next = bases[i + 1].name;
        const offset = Math.round(diff);
        return lang === 'zh'
          ? `${next}${dir.of}${bases[i].name}${offset}°`
          : `${next} ${dir.of} ${bases[i].name} ${offset}°`;
      }
    }
    return lang === 'zh' ? '未知' : 'Unknown';
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

  function toggleLang() {
    // @ts-ignore 直接取 store 值
    locale.set($locale === 'zh' ? 'en' : 'zh');
  }
</script>

<main class="card">
  <div class="lang-switch">
  <button type="button" class="btn" on:click={toggleLang}>{t('lang_toggle')}
</button>
  </div>

  <h2>🪐 {$t('settings')}</h2>
  <p>{$t('place')}: {$t('latitude')} {lat.toFixed(3)}°, {$t('longitude')} {lon.toFixed(3)}°</p>
  <p>{$t('time')}: {timeStr}</p>

  <h2>⭐ {$t('visibleStars')}</h2>
  {#if visibleStars.length === 0}
    <p>{$t('noStars')}</p>
  {:else}
    <table class="table">
      <thead>
        <tr>
          <th>{$t('star_name') /* 新键：表头“星名” */}</th>
          <th>{$t('alt')}</th>
          <th>{$t('az')}</th>
        </tr>
      </thead>
      <tbody>
        {#each visibleStars as s}
          <tr>
            <td>{s.name}</td>
            <td>{s.alt.toFixed(1)}</td>
            <td>{azToDirectionLocalized(s.az, $locale || 'zh')}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <h2>✨ {$t('visibleAsterisms')}</h2>
  {#if visibleAsterisms.length === 0}
    <p>—</p>
  {:else}
    <ul>
      {#each visibleAsterisms as name}<li>{name}</li>{/each}
    </ul>
  {/if}

  <button class="btn btn-primary" on:click={() => history.back()}>↩︎ {$t('back')}</button>

  <style>
    .lang-switch { display: flex; justify-content: flex-end; margin-bottom: .5rem; }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      color: var(--text);
    }
    th, td {
      padding: .6rem;
      text-align: center;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: color-mix(in srgb, var(--card) 85%, var(--primary) 15%);
      color: var(--text);
      font-weight: 600;
    }
    tr:hover {
      background: color-mix(in srgb, var(--card) 80%, var(--primary) 20%);
    }
  </style>
</main>
