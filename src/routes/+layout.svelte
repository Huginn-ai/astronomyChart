<script lang="ts">
<<<<<<< HEAD
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/i18n';

=======
  // 全局样式
  import '../app.css';
>>>>>>> fefd5dd (debugging)

  // 全局初始化 i18n
  import '$lib/i18n';

  import favicon from '$lib/assets/favicon.svg';

  // Svelte 5：通过 runes 获取 children
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- 渲染子路由 -->
{@render children?.()}
