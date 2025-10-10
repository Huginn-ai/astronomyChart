<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { STARS, ASTERISMS } from '$lib/stars/catalog';
  import { raDecToAltAz, isVisible } from '$lib/utils/astro';

  let lat = 0, lon = 0, timeStr = '';
  let visibleStars: { name: string; alt: number; az: number }[] = [];
  let visibleAsterisms: string[] = [];

  // 🌗 新增：把方位角数值转成人类可读方向（如“西偏北15°”）
  function azToDirection(azDeg: number): string {
    const dirs = [
      { base: 0, name: '北' },
      { base: 90, name: '东' },
      { base: 180, name: '南' },
      { base: 270, name: '西' },
      { base: 360, name: '北' }
    ];

    for (let i = 0; i < dirs.length - 1; i++) {
      const a1 = dirs[i].base;
      const a2 = dirs[i + 1].base;
      if (azDeg >= a1 && azDeg < a2) {
        const diff = azDeg - a1;
        if (diff < 5) return dirs[i].name; // 接近正方向
        const next = dirs[i + 1].name;
        const offset = Math.round(diff);
        return `${next}偏${dirs[i].name}${offset}°`;
      }
    }
    return '未知';
  }

  // 🌙 主计算函数
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
          name: s.cn,
          alt: altDeg,
          az: azDeg
        });
      }
    }

    visibleAsterisms = [];
    for (const a of ASTERISMS) {
      const ok = a.members.every(m => starVisible.get(m) === true);
      if (ok) visibleAsterisms.push(a.cn);
    }

    visibleStars.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans'));
    visibleAsterisms.sort((a, b) => a.localeCompare(b, 'zh-Hans'));
  }

  $: compute();
</script>

<main>
  <h2>🪐 观测设定</h2>
  <p>地点：纬度 {lat.toFixed(3)}°，经度 {lon.toFixed(3)}°</p>
  <p>时间：{timeStr}</p>

  <h2>⭐ 当时可见的恒星</h2>
  {#if visibleStars.length === 0}
    <p>（此刻列表为空，可能是白天或目标都在地平线下）</p>
  {:else}
    <table>
      <thead>
        <tr><th>星名</th><th>高度角 (°)</th><th>方位</th></tr>
      </thead>
      <tbody>
        {#each visibleStars as s}
          <tr>
            <td>{s.name}</td>
            <td>{s.alt.toFixed(1)}</td>
            <td>{azToDirection(s.az)}</td> <!-- 🔹在这里调用转换函数 -->
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

  <button on:click={() => history.back()}>↩︎ 返回上一页</button>

  <style>
    main {
      max-width: 720px;
      margin: 2rem auto;
      font-family: system-ui, sans-serif;
      color: #ddd;
      background-color: #12121a;
      padding: 1rem 1.5rem;
      border-radius: 10px;
    }

    h2 {
      margin-top: 1.5rem;
      color: #b0b8ff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      overflow: hidden;
    }

    th, td {
      padding: 0.6rem;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    th {
      background: rgba(255,255,255,0.08);
      color: #aaa;
      font-weight: 600;
    }

    tr:hover {
      background: rgba(255,255,255,0.07);
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
