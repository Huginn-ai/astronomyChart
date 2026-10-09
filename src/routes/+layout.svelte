<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import Icon from '$lib/components/Icon.svelte';
	import { createI18n } from '$lib/i18n/reactive.svelte';
	import { restoreLanguage, setLanguage } from '$lib/i18n';
	import { readPreference, savePreference } from '$lib/utils/storage';
	import { onMount } from 'svelte';
	let { children } = $props();
	const i18n = createI18n();
	let nightMode = $state(false);
	onMount(() => {
		restoreLanguage();
		nightMode = readPreference('nightMode') === 'true';
	});
	$effect(() => {
		document.documentElement.lang = i18n.lang === 'zh' ? 'zh-CN' : 'en';
		document.documentElement.dataset.night = String(nightMode);
	});
	function toggleNight() {
		nightMode = !nightMode;
		savePreference('nightMode', String(nightMode));
	}
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<meta name="theme-color" content="#080e1a" />
	<meta name="description" content={i18n.tr('hero_description')} />
</svelte:head>

<a class="skip-link" href="#main-content">{i18n.tr('skip')}</a>
<header class="site-header site-shell">
	<a class="brand" href={resolve('/')} aria-label="AstroRao">
		<svg
			class="brand-symbol"
			viewBox="0 0 40 40"
			width="34"
			height="34"
			fill="none"
			aria-hidden="true"
		>
			<ellipse
				cx="20"
				cy="20"
				rx="18"
				ry="10"
				transform="rotate(-35 20 20)"
				stroke="currentColor"
				stroke-width="1.2"
				opacity=".65"
			/>
			<path
				d="M20 9c0 7-4 11-11 11 7 0 11 4 11 11 0-7 4-11 11-11-7 0-11-4-11-11Z"
				fill="currentColor"
			/>
			<circle cx="34" cy="11" r="2.2" fill="currentColor" />
		</svg>
		<span
			>Astro<span class="brand-accent">Rao</span><small
				>{i18n.lang === 'zh' ? '认识你的星空' : 'Know your night sky'}</small
			></span
		>
	</a>
	<nav aria-label={i18n.tr('settings')} class="header-actions">
		<button
			type="button"
			class="btn btn-quiet night-toggle"
			onclick={toggleNight}
			aria-pressed={nightMode}
			title={i18n.tr(nightMode ? 'night_on' : 'night_off')}
		>
			<Icon name="moon" size={17} /><span>{i18n.tr('night_mode')}</span>
		</button>
		<span class="nav-divider"></span>
		<button
			type="button"
			class="btn language-button"
			onclick={() => setLanguage(i18n.lang === 'zh' ? 'en' : 'zh')}
			aria-label={i18n.tr('language_label')}
		>
			<Icon name="globe" size={16} />{i18n.tr('lang_toggle')}
		</button>
	</nav>
</header>

{@render children()}

<footer class="site-shell site-footer">
	<div class="footer-left">
		<Icon name="sparkle" size={16} /><span>{i18n.tr('footer_tagline')}</span>
	</div>
	<div class="footer-right">
		<span>{i18n.tr('footer_credit')}</span><a
			href="https://github.com/Huginn-ai/astronomyChart"
			target="_blank"
			rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a
		>
	</div>
</footer>

<style>
	.site-header {
		height: 104px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 18px;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 1.25rem;
		font-weight: 620;
		letter-spacing: -0.025em;
		line-height: 1.2;
	}
	.brand-symbol,
	.brand-accent {
		color: var(--primary);
	}
	.brand small {
		display: block;
		font-size: 0.6rem;
		font-weight: 400;
		letter-spacing: 0.07em;
		color: var(--muted);
		margin-top: 5px;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.language-button {
		min-height: 36px;
		font-size: 0.78rem;
		padding: 8px 12px;
	}
	.nav-divider {
		width: 1px;
		height: 19px;
		background: var(--border);
		margin: 0 3px;
	}
	.night-toggle {
		font-size: 0.75rem;
		min-height: 36px;
		padding: 8px;
	}
	.night-toggle[aria-pressed='true'] {
		color: var(--accent);
		background: var(--surface);
	}
	.site-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding-top: 24px;
		padding-bottom: 28px;
		border-top: 1px solid var(--border);
		font-size: 0.7rem;
		color: var(--muted);
	}
	.footer-left,
	.footer-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.footer-left :global(svg) {
		color: var(--primary);
	}
	.footer-right a:hover {
		color: var(--primary);
	}
	.skip-link {
		position: fixed;
		top: -100px;
		left: 20px;
		z-index: 100;
		background: var(--primary);
		color: var(--primary-text);
		border-radius: 8px;
		padding: 8px 14px;
	}
	.skip-link:focus-visible {
		top: 10px;
	}
	@media (max-width: 760px) {
		.site-header {
			height: 86px;
		}
		.brand {
			font-size: 1.15rem;
		}
		.night-toggle span,
		.nav-divider {
			display: none;
		}
		.header-actions {
			gap: 4px;
		}
		.site-footer {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}
	}
</style>
