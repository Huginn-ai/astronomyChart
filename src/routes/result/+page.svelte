<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { STARS, ASTERISMS } from '$lib/stars/catalog';
  import { raDecToAltAz, isVisible } from '$lib/utils/astro';

  let lat = 0, lon = 0, timeStr = '';
  // 每颗可见星保存: 中文名 + 高度角 + 方位角
  let visibleStars: { name: string; alt: number; az: number }[] = [];
  let visibleAsterisms: string[] = [];

  function compute() {
    const q = get(page).url.searchParams;
    lat = Number(q.get('lat') ?? 0);
    lon = Number(q.get('lon') ?? 0);
    timeStr = q.get('time') ?? '';
    const date = new Date(timeStr);

    const starVisible = new Map<string, boolean>();
    visibleStars = [];

    // 1️⃣ 对每颗星计算 Alt/Az
    for (const s of STARS) {
      const { altDeg, azDeg } = raDecToAltAz(date, lat, lon, s.raDeg, s.decDeg);
      const ok = isVisible(altDeg, 0);
      starVisible.set(s.id, ok);
      if (ok) {
        visibleStars.push({
          name: s.cn,
          alt: altDeg,
          az: azDeg
        });
      }
    }

    // 2️⃣ 星群：所有成员都可见则判定为可见
    visibleAsterisms = [];
    for (const a of ASTERISMS) {
      const ok = a.members.every(m => starVisible.get(m) === true);
      if (ok) visibleAsterisms.push(a.cn);
    }

    // 3️⃣ 排序
    visibleStars.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans'));
    visibleAsterisms.sort((a, b) => a.localeCompare(b, 'zh-Hans'));
  }

  $: compute();
</script>

<main>
  <h2>🪐 观测设定</h2>
  <p>地点：纬度 {lat}°，经度 {lon}°</p>
  <p>时间：{timeStr}</p>

  <h2>⭐ 当时可见的恒星</h2>
  {#if visibleStars.length === 0}
    <p>（此刻列表为空，可能是白天或目标都在地平线下）</p>
  {:else}
    <table>
      <thead>
        <tr><th>星名</th><th>高度角 (°)</th><th>方位角 (°)</th></tr>
      </thead>
      <tbody>
        {#each visibleStars as s}
          <tr>
            <td>{s.name}</td>
            <td>{s.alt.toFixed(1)}</td>
            <td>{s.az.toFixed(1)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <h2>✨ 可见的星群 / 星象</h2>
  {#if visibleAsterisms.length === 0}
    <p>（无）</p>
  {:else}
    <ul>
      {#each visibleAsterisms as name}<li>{name}</li>{/each}
    </ul>
  {/if}

  <button class="btn btn-primary" on:click={() => history.back()}>↩︎ 返回上一页</button>

  <style>
    main {
      max-width: 720px;
      margin: 2rem auto;
      font-family: system-ui, sans-serif;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    th, td {
      padding: 0.5rem;
      border-bottom: 1px solid #ddd;
      text-align: center;
    }
    th {
      background: #f0f0ff;
    }
    button {
      margin-top: 2rem;
      padding: 0.6rem 1rem;
      background-color: #4444ff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: 0.2s;
    }
    button:hover {
      background-color: #2222cc;
    }
  </style>
</main>
