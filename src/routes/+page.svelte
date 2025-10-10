<script lang="ts">
  import { goto } from '$app/navigation';
  import { findCity } from '$lib/geo/cities';
  import { t, locale, waitLocale } from '$lib/i18n';
  import { get } from 'svelte/store';
  import { onDestroy } from 'svelte';

  // 本地翻译函数（订阅 svelte-i18n 的 t）
  let tr: (k: string) => string = (k) => k;
  const unsubT = t.subscribe((fn) => { tr = fn; });
  onDestroy(unsubT);

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
      cityMsg = tr('city_not_found');
      return;
    }
    latitude = Number(hit.lat.toFixed(6));
    longitude = Number(hit.lon.toFixed(6));

    const prefix = tr('city_matched_prefix');
    const suffix = tr('city_matched_suffix');
    const country = hit.country ? ` · ${hit.country}` : "";
    cityMsg = `${prefix}：${hit.name}${country}${suffix ? ` ${suffix}` : ""}`;
  }

  function submit() {
    if (city.trim() && !findCity(city)) {
      cityMsg = tr('city_not_found');
      return;
    }
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      time: datetime
    });
    goto(`/result?${params.toString()}`);
  }

  // ✅ 只保留这一份切换函数（不要重复声明）
  async function toggleLang() {
    const cur = get(locale) ?? 'en';
    const next = cur.startsWith('zh') ? 'en' : 'zh';
    locale.set(next);
    await waitLocale();
  }
</script>

<main class="container">
  <div class="header">
    <h1>🌌 {tr('home_title')}</h1>
    <button type="button" class="btn" on:click={toggleLang}>{tr('lang_toggle')}</button>
  </div>

  <form class="card" on:submit|preventDefault={submit}>
    <div class="field">
      <label for="city">{tr('city_label')}</label>
      <div class="row">
        <input
          id="city"
          class="input"
          type="text"
          bind:value={city}
          placeholder={tr('city_placeholder')}
          on:blur={useCity}
        />
        <button type="button" class="btn" on:click={useCity}>
          {tr('city_fill_btn')}
        </button>
      </div>
      {#if cityMsg}
        <p class="helper" style="margin-top:.25rem;">{cityMsg}</p>
      {/if}
    </div>

    <div class="field">
      <label for="lat">{tr('lat_label')}</label>
      <input id="lat" class="input" type="number" step="0.001" min="-90" max="90" bind:value={latitude} />
    </div>

    <div class="field">
      <label for="lon">{tr('lon_label')}</label>
      <input id="lon" class="input" type="number" step="0.001" min="-180" max="180" bind:value={longitude} />
    </div>

    <div class="field">
      <label for="dt">{tr('time_label')}</label>
      <input id="dt" class="input" type="datetime-local" bind:value={datetime} />
    </div>

    <button type="submit" class="btn btn-primary">🔭 {tr('submit_cta')}</button>
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
