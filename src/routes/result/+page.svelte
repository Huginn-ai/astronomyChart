<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { STARS, ASTERISMS } from '$lib/stars/catalog';
  import { raDecToAltAz, isVisible } from '$lib/utils/astro';

  import { t, locale, waitLocale } from '$lib/i18n';
  import { onDestroy } from 'svelte';
  import { goto } from '$app/navigation';

  // 本地翻译函数（从 i18n store 取出函数）
  let tr: (k: string) => string = (k) => k;
  const unsubT = t.subscribe((fn) => { tr = fn; });
  onDestroy(unsubT);

  // 允许使用 $locale（Svelte store 自动订阅）
  // 只要在代码里用到 $locale，语言切换就会触发响应式更新
  // @ts-ignore - Svelte store magic
  $: $locale;

  let lat = 0, lon = 0, timeStr = '';

  type VisibleStar = {
    nameKey: string;  // e.g. "star:Vega"
    alt: number;
    az: number;
    // 用于缺失翻译的安全回退
    fallback: { cn: string; id: string };
  };

  let visibleStars: VisibleStar[] = [];
  let visibleAsterisms: string[] = [];        // e.g. ["asterism:SummerTriangle"]

  // 渲染用的“已按当前语言排好序”的副本
  let visibleStarsSorted: VisibleStar[] = [];
  let visibleAsterismsSorted: string[] = [];

  function azToDirectionLocalized(azDeg: number, lang: string): string {
    const dir = {
      N: tr('dir_N'), E: tr('dir_E'), S: tr('dir_S'), W: tr('dir_W'),
      of: tr('dir_of'), unk: tr('dir_unknown')
    };

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

      if (ok) {
        visibleStars.push({
          nameKey: `star:${s.id}`,       // 统一用翻译键
          alt: altDeg,
          az: azDeg,
          fallback: { cn: s.cn, id: s.id }
        });
      }
    }

    visibleAsterisms = ASTERISMS
      .filter(a => a.members.every(m => starVisible.get(m) === true))
      .map(a => `asterism:${a.id}`);
  }

  // 初次计算（依赖于 URL 查询）
  $: compute();

  // 任何时候可见列表或语言变动，都按当前语言译名进行排序
  $: {
    const lang = ($locale as string) ?? 'en';

    visibleStarsSorted = [...visibleStars].sort((a, b) => {
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
    // 切换语言后，$: 排序块会自动触发，不需要手动再排
  }

  function goBack() {
    if (history.length > 1) {
      history.back();
    } else {
      goto('/');
    }
  }

  // 缺省翻译回退：若 tr(key) 原样返回 key，回退到 cn/id
  function displayWithFallbackStar(s: VisibleStar, lang: string): string {
    const label = tr(s.nameKey);
    if (label === s.nameKey) {
      return lang.startsWith('zh') ? s.fallback.cn : s.fallback.id;
    }
    return label;
  }
</script>

<main class="card">
  <div class="lang-switch">
    <button type="button" class="btn" on:click={toggleLang}>{tr('lang_toggle')}</button>
  </div>

  <h2>{tr('settings')}</h2>
  <p>{tr('place')}: {tr('latitude')} {lat.toFixed(3)}°, {tr('longitude')} {lon.toFixed(3)}°</p>
  <p>{tr('time')}: {timeStr}</p>

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
        </tr>
      </thead>
      <tbody>
        {#each visibleStarsSorted as s}
          <tr>
            <td>{displayWithFallbackStar(s, ($locale as string) ?? 'en')}</td>
            <td>{s.alt.toFixed(1)}</td>
            <td>{azToDirectionLocalized(s.az, (($locale as string) ?? 'en'))}</td>
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
          <!-- 星群缺翻译时：直接显示 key 的末段或 id（可按需改造） -->
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
  .table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { padding: .6rem; text-align: center; border-bottom: 1px solid var(--border); }
  th { font-weight: 600; }
  .back-row { margin-top: 1.25rem; display: flex; justify-content: flex-start; }
</style>
