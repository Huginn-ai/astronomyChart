<script lang="ts">
  // 全局样式
  import '../app.css';
  import { i18nReady } from '$lib/i18n'; // ⬅️ 关键：拿到就绪 Promise
  import favicon from '$lib/assets/favicon.svg';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <!-- 可选：避免 /favicon.ico 404 -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
</svelte:head>

{#await i18nReady}
  <div style="max-width:680px;margin:32px auto;color:#9aa3b2;">Loading…</div>
{:then}
  {@render children?.()}
{/await}
