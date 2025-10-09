<script lang="ts">
  import { goto } from '$app/navigation';
  import { findCity } from '$lib/geo/cities';

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
      cityMsg = "未找到该城市，请换一个更常见的城市名称，或直接填写经纬度。";
      return;
    }
    latitude = Number(hit.lat.toFixed(6));
    longitude = Number(hit.lon.toFixed(6));
    cityMsg = `已匹配：${hit.name}${hit.country ? " · " + hit.country : ""}（已自动填入经纬度）`;
  }

  function submit() {
    // 如果用户填了城市但未匹配，给出提示并阻止提交
    if (city.trim() && !findCity(city)) {
      cityMsg = "未找到该城市，请改用经纬度。";
      return;
    }
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      time: datetime
    });
    goto(`/result?${params.toString()}`);
  }
</script>

<main class="container">
  <h1>🌌 星空可见性（简版）</h1>

  <form class="card" on:submit|preventDefault={submit}>
    <!-- 城市优先选项 -->
    <div class="field">
      <label for="city">城市（可选）</label>
      <div style="display:flex; gap:.5rem;">
        <input id="city" class="input" type="text" bind:value={city} placeholder="例如：Beijing / 北京 / London / 伦敦" on:blur={useCity} />
        <button type="button" class="btn" on:click={useCity}>用城市填入</button>
      </div>
      {#if cityMsg}<p class="helper" style="margin-top:.25rem;">{cityMsg}</p>{/if}
    </div>

    <!-- 经纬度始终可编辑 -->
    <div class="field">
      <label for="lat">纬度 Latitude（-90 ~ 90）</label>
      <input id="lat" class="input" type="number" step="0.001" min="-90" max="90" bind:value={latitude} />
    </div>

    <div class="field">
      <label for="lon">经度 Longitude（-180 ~ 180）</label>
      <input id="lon" class="input" type="number" step="0.001" min="-180" max="180" bind:value={longitude} />
    </div>

    <div class="field">
      <label for="dt">时间 Time</label>
      <input id="dt" class="input" type="datetime-local" bind:value={datetime} />
    </div>

    <button type="submit" class="btn btn-primary">🔭 查看当晚可见目标</button>
  </form>
</main>

<style>
  .container { max-width: 680px; margin: 32px auto; padding: 0 16px; font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial; }
  h1 { margin: 0 0 16px; }
  .field { display: grid; gap: 6px; margin-bottom: 16px; }
  label { font-weight: 600; }
</style>
