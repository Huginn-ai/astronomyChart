<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { STARS, ASTERISMS } from '$lib/stars/catalog';
  import { raDecToAltAz, isVisible } from '$lib/utils/astro';

  let lat=0, lon=0, timeStr='';
  let visibleStars: string[] = [];
  let visibleAsterisms: string[] = [];

  function compute() {
    const q = get(page).url.searchParams;
    lat = Number(q.get('lat') ?? 0);
    lon = Number(q.get('lon') ?? 0);
    timeStr = q.get('time') ?? '';
    const date = new Date(timeStr);

    // 1) 逐一恒星计算 Alt/Az
    const starVisible = new Map<string, boolean>();
    visibleStars = [];
    for (const s of STARS) {
      const { altDeg } = raDecToAltAz(date, lat, lon, s.raDeg, s.decDeg);
      const ok = isVisible(altDeg, 0); // 只要在地平线上方
      starVisible.set(s.id, ok);
      if (ok) visibleStars.push(s.cn);
    }

    // 2) 星象可见性（所有成员都可见则判定为可见）
    visibleAsterisms = [];
    for (const a of ASTERISMS) {
      const ok = a.members.every(m => starVisible.get(m) === true);
      if (ok) visibleAsterisms.push(a.cn);
    }

    // 排序（按中文）
    visibleStars.sort((a,b)=>a.localeCompare(b,'zh-Hans'));
    visibleAsterisms.sort((a,b)=>a.localeCompare(b,'zh-Hans'));
  }

  $: compute();
</script>

<main>
  <h2>🪐 观测设定</h2>
  <p>地点：纬度 {lat}，经度 {lon}</p>
  <p>时间：{timeStr}</p>

  <h2>⭐ 当时可见的恒星/目标</h2>
  {#if visibleStars.length === 0}
    <p>（此刻列表为空，可能是白天或目标都在地平线下）</p>
  {:else}
    <ul>
      {#each visibleStars as name}<li>{name}</li>{/each}
    </ul>
  {/if}

  <h2>✨ 可见的星象 / 星群</h2>
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
    ul {
        padding-left: 1.2rem;
    }
    li {
        line-height: 1.8;
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

<style>
  main { max-width: 720px; margin: 2rem auto; font-family: system-ui, sans-serif; }
  ul { padding-left: 1.2rem; }
  li { line-height: 1.8; }
</style>
