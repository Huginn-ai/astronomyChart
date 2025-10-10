<script lang="ts">
  import { goto } from '$app/navigation';
  import { findCity } from '$lib/geo/cities';
  import { locale, waitLocale } from '$lib/i18n';
  import { get } from 'svelte/store';




export async function toggleLang() {
  const cur = get(locale) ?? 'en';
  const next = cur.startsWith('zh') ? 'en' : 'zh';
  locale.set(next);
  await waitLocale();
}


  // 默认 Princeton
  let city = "";
  let latitude = 40.343;
  let longitude = -74.651;
  let datetime = new Date().toISOString().slice(0, 16);

  let cityMsg: string | null = null;

  function useCity() {
    cityMsg = null;
    if (!city.trim()) return;

    const hit = findCity(city);
    if (!hit) {
      cityMsg = get(t)('city_not_found');
      return;
    }
    latitude = Number(hit.lat.toFixed(6));
    longitude = Number(hit.lon.toFixed(6));

    // 组合提示文案（中英都通用）
    const prefix = get(t)('city_matched_prefix');
    const suffix = get(t)('city_matched_suffix');
    const country = hit.country ? ` · ${hit.country}` : "";
    cityMsg = `${prefix}：${hit.name}${country}${suffix ? ` ${suffix}` : ""}`;
  }

  function submit() {
    // 如果用户填了城市但未匹配，给出提示并阻止提交
    if (city.trim() && !findCity(city)) {
      cityMsg = get(t)('city_not_found');
      return;
    }
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      time: datetime
    });
    goto(`/result?${params.toString()}`);
  }

  function toggleLang() {
    locale.update(v => (v === 'zh' ? 'en' : 'zh'));
  }
</script>

<main class="container">
  <div class="header">
    <h1>🌌 {$t('home_title')}</h1>
    <button type="button" class="btn" on:click={toggleLang}>{$t('lang_toggle')}
</button>
  </div>

  <form class="card" on:submit|preventDefault={submit}>
    <!-- 城市优先选项 -->
    <div class="field">
      <label for="city">{$t('city_label')}</label>
      <div class="row">
        <input
          id="city"
          class="input"
          type="text"
          bind:value={city}
          placeholder={$t('city_placeholder')}
          on:blur={useCity}
        />
        <button type="button" class="btn" on:click={useCity}>
          {$t('city_fill_btn')}
        </button>
      </div>
      {#if cityMsg}
        <p class="helper" style="margin-top:.25rem;">{cityMsg}</p>
      {/if}
    </div>

    <!-- 经纬度始终可编辑 -->
    <div class="field">
      <label for="lat">{$t('lat_label')}</label>
      <input id="lat" class="input" type="number" step="0.001" min="-90" max="90" bind:value={latitude} />
    </div>

    <div class="field">
      <label for="lon">{$t('lon_label')}</label>
      <input id="lon" class="input" type="number" step="0.001" min="-180" max="180" bind:value={longitude} />
    </div>

    <div class="field">
      <label for="dt">{$t('time_label')}</label>
      <input id="dt" class="input" type="datetime-local" bind:value={datetime} />
    </div>

    <button type="submit" class="btn btn-primary">🔭 {$t('submit_cta')}</button>
  </form>
</main>

<style>
  .container { max-width: 680px; margin: 32px auto; padding: 0 16px; font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial; }
  .header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 16px; }
  h1 { margin: 0; }
  .field { display: grid; gap: 6px; margin-bottom: 16px; }
  label { font-weight: 600; }
  .row { display: flex; gap: .5rem; }
</style>
