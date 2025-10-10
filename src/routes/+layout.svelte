<script lang="ts">
  // 全局样式
  import '../app.css';

  // 全局初始化 i18n
  import '$lib/i18n';

  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <!-- 可选：避免浏览器自动请求 /favicon.ico 404 -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
</svelte:head>

{#await i18nReady}
  <!-- i18n 异步加载期间的占位 UI（可自定义样式） -->
  <div style="max-width:680px;margin:32px auto;padding:16px;color:#9aa3b2;">
    Loading…
  </div>
{:then}
  {@render children?.()}
{/await}
