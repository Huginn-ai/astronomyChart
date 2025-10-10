<script lang="ts">
  // 全局样式
  import '../app.css';
  import { i18nReady } from '$lib/i18n';   // 等 i18n 初始化&词条加载
  import favicon from '$lib/assets/favicon.svg';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
</svelte:head>

{@render children?.()}
