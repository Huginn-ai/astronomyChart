<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURL } from 'svelte/reactivity';
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SkyChart from '$lib/components/SkyChart.svelte';
	import CelestialChart from '$lib/components/CelestialChart.svelte';
	import { createI18n } from '$lib/i18n/reactive.svelte';
	import { cityLabel, findCity } from '$lib/geo/cities';
	import {
		calculateSky,
		formatDirection,
		formatStarName,
		observingScore,
		observationQuery,
		parseObservation,
		type ChartStar,
		type NameMode
	} from '$lib/utils/observing';
	import { browserTimeZone, formatObservationTime } from '$lib/utils/time';
	import { precessJ2000 } from '$lib/utils/astro';
	import { readPreference, savePreference } from '$lib/utils/storage';

	const i18n = createI18n();
	let legacyZone = $state('UTC');
	const observation = $derived(parseObservation(page.url.searchParams, legacyZone));
	const sky = $derived(observation ? calculateSky(observation) : null);
	const city = $derived(observation?.city ? findCity(observation.city) : null);
	const location = $derived(
		city
			? cityLabel(city, i18n.lang)
			: observation
				? observation.lat.toFixed(3) + '°, ' + observation.lon.toFixed(3) + '°'
				: ''
	);
	const chartMode = $derived(
		page.url.searchParams.get('view') === 'celestial' ? 'celestial' : 'sky'
	);
	let nameMode = $state<NameMode>('popular');
	let rotation = $state(0);
	let showGrid = $state(true);
	let showLabels = $state(true);
	let showPatterns = $state(true);
	let search = $state('');
	let sort = $state('easy');
	let selectedId = $state<string | null>(null);
	const selected = $derived(sky?.visible.find((s) => s.id === selectedId) || null);
	const chartStars = $derived(
		sky?.visible.map((s) => ({ ...s, label: formatStarName(s, i18n.lang, nameMode) })) || []
	);
	const highlights = $derived(
		chartStars.map((s) => {
			const mean = observation ? precessJ2000(observation.date, s.raDeg, s.decDeg) : s;
			return { ra: mean.raDeg, dec: mean.decDeg, label: s.label, mag: s.mag };
		})
	);
	const filtered = $derived.by(() => {
		const query = search.trim().toLocaleLowerCase();
		const targets = (sky?.visible || []).filter(
			(s) =>
				!query ||
				[s.id, s.cn, formatStarName(s, i18n.lang, nameMode)].some((name) =>
					name.toLocaleLowerCase().includes(query)
				)
		);
		return [...targets].sort((a, b) => {
			if (sort === 'alt') return b.alt - a.alt;
			if (sort === 'mag') return (a.mag ?? 9) - (b.mag ?? 9);
			if (sort === 'name')
				return formatStarName(a, i18n.lang, nameMode).localeCompare(
					formatStarName(b, i18n.lang, nameMode),
					i18n.lang
				);
			return observingScore(b) - observingScore(a);
		});
	});
	const editQuery = $derived(observation ? '?' + observationQuery(observation) : '');
	let shareStatus = $state(false);
	let shareFallback = $state('');
	let statusTimeout: ReturnType<typeof setTimeout> | undefined;
	let chartHost = $state<HTMLDivElement>();

	onMount(() => {
		legacyZone = browserTimeZone();
		const savedMode = readPreference('nameMode');
		if (savedMode === 'popular' || savedMode === 'both' || savedMode === 'mansion')
			nameMode = savedMode;
		if (!page.url.searchParams.has('view') && readPreference('chartMode') === 'celestial')
			void setView('celestial');
		return () => clearTimeout(statusTimeout);
	});

	async function updateQuery(key: string, value: string) {
		if (!observation) return;
		const query = observationQuery(observation);
		query.set('view', chartMode);
		query.set(key, value);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- The pathname is resolved before appending the query.
		await goto(resolve('/result') + '?' + query, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}
	async function setView(view: 'sky' | 'celestial') {
		savePreference('chartMode', view);
		await updateQuery('view', view);
	}
	function setNameMode(value: string) {
		if (value === 'popular' || value === 'both' || value === 'mansion') {
			nameMode = value;
			savePreference('nameMode', value);
		}
	}
	function choose(id: string | null, scroll = false) {
		selectedId = selectedId === id ? null : id;
		if (scroll)
			document.getElementById('sky-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	async function changeTime(hours: number | null) {
		if (!observation) return;
		const date =
			hours === null ? new Date() : new Date(observation.date.getTime() + hours * 3600000);
		if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100) return;
		await updateQuery('time', date.toISOString());
	}
	async function share() {
		if (!observation) return;
		const url = new SvelteURL(resolve('/result'), window.location.origin);
		url.search = observationQuery(observation).toString();
		url.searchParams.set('view', chartMode);
		try {
			await navigator.clipboard.writeText(url.href);
			shareStatus = true;
			clearTimeout(statusTimeout);
			statusTimeout = setTimeout(() => {
				shareStatus = false;
			}, 2500);
		} catch {
			shareFallback = url.href;
		}
	}
	function exportMap() {
		const canvas = chartHost?.querySelector('canvas');
		canvas?.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob),
				link = document.createElement('a');
			link.href = url;
			link.download = 'astrorao-sky-map.png';
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		});
	}
	function altitudeKey(star: ChartStar) {
		return star.alt >= 45 ? 'high' : star.alt >= 20 ? 'medium' : 'low';
	}
</script>

<svelte:head><title>{i18n.tr('skyMap')} · AstroRao</title></svelte:head>

<main id="main-content" class="site-shell results">
	{#if !observation || !sky}
		<section class="invalid card">
			<Icon name="compass" size={42} />
			<h1>{i18n.tr('invalid_settings')}</h1>
			<p>{i18n.tr('invalid_description')}</p>
			<a href={resolve('/')} class="btn btn-primary"
				>{i18n.tr('start_observing')}<Icon name="arrow" size={18} /></a
			>
		</section>
	{:else}
		<section class="results-heading">
			<div>
				<p class="eyebrow">{i18n.tr('results_eyebrow')}</p>
				<h1>{i18n.tr('your_sky')}</h1>
				<p class="heading-description">{i18n.tr('results_description')}</p>
			</div>
			<div class="heading-actions">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The pathname is resolved before appending the query. -->
				<a href={resolve('/') + editQuery} class="btn"
					><Icon name="edit" size={16} />{i18n.tr('edit_settings')}</a
				><button type="button" class="btn btn-quiet share-button" onclick={share}
					><Icon name={shareStatus ? 'check' : 'copy'} size={16} /><span aria-live="polite"
						>{i18n.tr(shareStatus ? 'copied' : 'share')}</span
					></button
				>
			</div>
		</section>
		{#if shareFallback}<div class="share-fallback">
				<label for="share-url" class="helper">{i18n.tr('share_fallback')}</label><input
					id="share-url"
					class="input"
					readonly
					value={shareFallback}
					onclick={(e) => e.currentTarget.select()}
				/>
			</div>{/if}

		<div class="observation-bar">
			<div class="observation-location">
				<Icon name="pin" size={17} /><span
					>{location}<small
						>{i18n.tr('latitude')}
						{observation.lat.toFixed(3)}° · {i18n.tr('longitude')}
						{observation.lon.toFixed(3)}°</small
					></span
				>
			</div>
			<div class="observation-time">
				<Icon name="clock" size={17} /><span
					>{formatObservationTime(observation.date, observation.timeZone, i18n.lang)}<small
						>{observation.timeZone}</small
					></span
				>
			</div>
			<div class="time-buttons">
				<button type="button" class="btn btn-small" onclick={() => changeTime(-1)}>−1 h</button
				><button type="button" class="btn btn-small" onclick={() => changeTime(null)}
					>{i18n.tr('now')}</button
				><button type="button" class="btn btn-small" onclick={() => changeTime(1)}>+1 h</button>
			</div>
		</div>

		<div class="overview">
			<div>
				<span class="overview-value">{sky.visible.length.toString().padStart(2, '0')}</span><span
					class="overview-label">{i18n.tr('filtered_targets')}</span
				>
			</div>
			<div>
				<span class="overview-value">{sky.asterisms.length.toString().padStart(2, '0')}</span><span
					class="overview-label">{i18n.tr('patterns_count')}</span
				>
			</div>
			<div class="condition-summary">
				<Icon name={sky.condition === 'day' ? 'sun' : 'moon'} size={22} />
				<div>
					<strong>{i18n.tr('status_' + sky.condition)}</strong><span
						>{i18n.tr('sun_altitude')} {sky.solarAltitude.toFixed(1)}°</span
					>
				</div>
			</div>
		</div>
		<p class="sky-notice" class:daylight={sky.condition === 'day'}>
			<Icon name="info" size={16} />{i18n.tr(
				sky.condition === 'day'
					? 'daylight_note'
					: sky.condition === 'dark'
						? 'dark_note'
						: 'twilight_note'
			)}
		</p>
		{#if observation.legacy}<p class="helper legacy-note">{i18n.tr('legacy_time')}</p>{/if}

		<section class="recommendations" aria-labelledby="start-here">
			<div class="section-heading">
				<div>
					<h2 id="start-here">{i18n.tr('start_here')}</h2>
					<p class="helper">{i18n.tr('recommended_hint')}</p>
				</div>
				<span class="pill pill-accent"><Icon name="sparkle" size={12} />{i18n.tr('no_gear')}</span>
			</div>
			{#if sky.recommended.length}
				<div class="recommendation-grid">
					{#each sky.recommended as star, index (star.id)}
						<button
							type="button"
							class="recommendation card"
							class:chosen={selectedId === star.id}
							aria-pressed={selectedId === star.id}
							onclick={() => choose(star.id, true)}
						>
							<div class="recommendation-top">
								<span class="target-number">0{index + 1}</span><Icon name="sparkle" size={18} />
							</div>
							<h3>{formatStarName(star, i18n.lang, nameMode)}</h3>
							<span class="recommendation-alias"
								>{i18n.lang === 'zh'
									? formatStarName(star, 'en')
									: formatStarName(star, 'zh')}</span
							>
							<div class="recommendation-data">
								<span><Icon name="compass" size={14} />{formatDirection(star.az, i18n.lang)}</span
								><span>{star.alt.toFixed(0)}° <small>{i18n.tr('altitude_short')}</small></span>
							</div>
						</button>
					{/each}
				</div>
			{:else}<p class="empty-state">{i18n.tr('no_recommendations')}</p>{/if}
		</section>

		<div class="map-layout">
			<section id="sky-map" class="map-card card" aria-label={i18n.tr('skyMap')}>
				<div class="map-top">
					<h2><Icon name="compass" size={21} />{i18n.tr('skyMap')}</h2>
					<div class="segmented">
						<button
							type="button"
							class:active={chartMode === 'sky'}
							aria-pressed={chartMode === 'sky'}
							onclick={() => setView('sky')}>{i18n.tr('horizon_map')}</button
						><button
							type="button"
							class:active={chartMode === 'celestial'}
							aria-pressed={chartMode === 'celestial'}
							onclick={() => setView('celestial')}>{i18n.tr('celestial_map')}</button
						>
					</div>
				</div>
				{#if chartMode === 'sky'}
					<div class="map-controls">
						<div class="map-checks">
							<label
								><input type="checkbox" bind:checked={showLabels} />{i18n.tr('show_labels')}</label
							><label
								><input type="checkbox" bind:checked={showPatterns} />{i18n.tr(
									'show_patterns'
								)}</label
							><label><input type="checkbox" bind:checked={showGrid} />{i18n.tr('show_grid')}</label
							>
						</div>
						<button
							type="button"
							class="btn btn-small btn-quiet"
							onclick={() => {
								rotation = 0;
							}}><Icon name="reset" size={14} />{i18n.tr('reset')}</button
						>
					</div>
					<div class="chart-host" bind:this={chartHost}>
						<SkyChart
							stars={chartStars}
							asterisms={sky.asterisms}
							locale={i18n.lang}
							minAlt={observation.minAlt}
							{showLabels}
							{showPatterns}
							{showGrid}
							bind:rotationDeg={rotation}
							selectedId={selected?.id || null}
							onselect={(id) => choose(id)}
						/>
					</div>
					<div class="rotation-control">
						<label for="rotation">{i18n.tr('rotation')}</label><input
							type="range"
							id="rotation"
							min="0"
							max="360"
							step="1"
							bind:value={rotation}
						/><output for="rotation">{rotation.toFixed(0)}°</output><button
							type="button"
							class="btn btn-small btn-quiet"
							onclick={exportMap}
							title={i18n.tr('export_map')}
							aria-label={i18n.tr('export_map')}><Icon name="download" size={16} /></button
						>
					</div>
					<p class="map-caption">{i18n.tr('map_interaction')}</p>
				{:else}
					<CelestialChart
						lat={observation.lat}
						lon={observation.lon}
						date={observation.date}
						{highlights}
					/>
					<p class="map-caption celestial-caption">{i18n.tr('celestial_hint')}</p>
				{/if}
				{#if selected}
					<div class="selected-detail" role="status">
						<div>
							<span class="eyebrow">{i18n.tr('selected')}</span><strong
								>{formatStarName(selected, i18n.lang, nameMode)}</strong
							>
						</div>
						<span>{selected.alt.toFixed(1)}° · {formatDirection(selected.az, i18n.lang)}</span
						><button
							type="button"
							class="btn btn-small btn-quiet"
							onclick={() => {
								selectedId = null;
							}}
							aria-label={i18n.tr('clear_selection')}>×</button
						>
					</div>
				{/if}
			</section>

			<aside class="map-sidebar">
				<section class="reading-card card">
					<span class="guide-icon"><Icon name="compass" size={22} /></span>
					<h3>{i18n.tr('map_guide')}</h3>
					<p>{i18n.tr('map_guide_body')}</p>
					<div class="guide-facts">
						<span
							><strong>90°</strong>{i18n.lang === 'zh'
								? '天顶 · 正上方'
								: 'Zenith · overhead'}</span
						><span
							><strong>0°</strong>{i18n.lang === 'zh'
								? '地平线 · 图的边缘'
								: 'Horizon · map edge'}</span
						>
					</div>
				</section>
				<section class="patterns-card card">
					<h3><Icon name="sparkle" size={18} />{i18n.tr('visibleAsterisms')}</h3>
					{#if sky.asterisms.length}<div class="pattern-list">
							{#each sky.asterisms as pattern (pattern.id)}<details>
									<summary
										>{i18n.lang === 'zh' ? pattern.cn : i18n.tr('asterism:' + pattern.id)}<small
											>{pattern.id === 'PleiadesGrp'
												? i18n.tr('cluster')
												: pattern.members.length + ' ' + i18n.tr('members')}</small
										></summary
									>
									<div class="pattern-members">
										{#each pattern.members as id (id)}{@const member = sky.visible.find(
												(s) => s.id === id
											)}{#if member}<button type="button" onclick={() => choose(id)}
													>{formatStarName(member, i18n.lang, nameMode)}</button
												>{/if}{/each}
									</div>
								</details>{/each}
						</div>{:else}<p class="helper pattern-empty">{i18n.tr('no_patterns')}</p>{/if}
					<p class="helper pattern-hint">{i18n.tr('pattern_hint')}</p>
				</section>
			</aside>
		</div>

		<section class="targets-card card" aria-labelledby="targets-title">
			<div class="section-heading">
				<div>
					<h2 id="targets-title">{i18n.tr('visibleStars')}</h2>
					<p class="helper">{i18n.tr('table_hint')}</p>
				</div>
				<span class="pill">{filtered.length} / {sky.visible.length}</span>
			</div>
			<div class="filters">
				<div class="search-field">
					<label class="sr-only" for="target-search">{i18n.tr('search_targets')}</label><Icon
						name="search"
						size={17}
					/><input
						class="input"
						id="target-search"
						type="search"
						bind:value={search}
						placeholder={i18n.tr('search_placeholder')}
					/>
				</div>
				<div class="field">
					<label for="altitude-filter">{i18n.tr('min_altitude')}</label><select
						id="altitude-filter"
						class="input"
						value={observation.minAlt}
						onchange={(e) => updateQuery('minAlt', e.currentTarget.value)}
						>{#each [...new Set( [0, 10, 20, 30, observation.minAlt] )].sort((a, b) => a - b) as value (value)}<option
								{value}>{value}°</option
							>{/each}</select
					>
				</div>
				<div class="field">
					<label for="mag-filter">{i18n.tr('magnitude_limit')}</label><select
						id="mag-filter"
						class="input"
						value={observation.magLimit}
						onchange={(e) => updateQuery('mag', e.currentTarget.value)}
						><option value={4}>{i18n.tr('mag_all')}</option><option value={2.5}
							>{i18n.tr('mag_medium')}</option
						><option value={1.5}>{i18n.tr('mag_bright')}</option
						>{#if ![4, 2.5, 1.5].includes(observation.magLimit)}<option value={observation.magLimit}
								>≤ {observation.magLimit}</option
							>{/if}</select
					>
				</div>
				<div class="field">
					<label for="sort">{i18n.tr('sort')}</label><select
						id="sort"
						class="input"
						bind:value={sort}
						><option value="easy">{i18n.tr('sort_easy')}</option><option value="alt"
							>{i18n.tr('sort_alt')}</option
						><option value="mag">{i18n.tr('sort_mag')}</option><option value="name"
							>{i18n.tr('sort_name')}</option
						></select
					>
				</div>
			</div>
			{#if i18n.lang === 'zh'}<div class="name-mode">
					<label for="name-mode">{i18n.tr('name_mode.switch')}</label><select
						id="name-mode"
						class="input"
						value={nameMode}
						onchange={(e) => setNameMode(e.currentTarget.value)}
						><option value="popular">{i18n.tr('name_mode.popular')}</option><option value="both"
							>{i18n.tr('name_mode.both')}</option
						><option value="mansion">{i18n.tr('name_mode.mansion')}</option></select
					>
				</div>{/if}
			{#if !filtered.length}
				<div class="empty-state">
					<p>{i18n.tr(search ? 'no_search' : 'noStars')}</p>
					<button
						class="btn btn-small"
						type="button"
						onclick={async () => {
							search = '';
							if (observation) {
								const query = observationQuery({ ...observation, minAlt: 0, magLimit: 4 });
								query.set('view', chartMode);
								// eslint-disable-next-line svelte/no-navigation-without-resolve -- The pathname is resolved before appending the query.
								await goto(resolve('/result') + '?' + query, {
									replaceState: true,
									noScroll: true,
									keepFocus: true
								});
							}
						}}>{i18n.tr('clear_filters')}</button
					>
				</div>
			{:else}
				<div class="table-wrap">
					<table>
						<thead
							><tr
								><th scope="col">{i18n.tr('star_name')}</th><th scope="col"
									>{i18n.tr('altitude_short')}</th
								><th scope="col">{i18n.tr('azimuth_short')}</th><th scope="col">{i18n.tr('mag')}</th
								></tr
							></thead
						><tbody>
							{#each filtered as star (star.id)}
								<tr class:chosen={selected?.id === star.id}>
									<td
										><button
											type="button"
											class="target-button"
											aria-pressed={selected?.id === star.id}
											onclick={() => choose(star.id)}
											><span class="target-dot" class:cluster-dot={star.kind === 'cluster'}
											></span><span
												><strong>{formatStarName(star, i18n.lang, nameMode)}</strong><small
													>{star.kind === 'cluster'
														? i18n.tr('cluster')
														: i18n.lang === 'zh'
															? formatStarName(star, 'en')
															: formatStarName(star, 'zh')}</small
												></span
											></button
										></td
									>
									<td
										><span class="alt-number">{star.alt.toFixed(1)}°</span><span class="alt-tag"
											>{i18n.tr(altitudeKey(star))}</span
										></td
									>
									<td
										><span class="direction"
											>{star.alt > 89.9
												? i18n.lang === 'zh'
													? '接近天顶'
													: 'Near zenith'
												: formatDirection(star.az, i18n.lang)}</span
										><small class="az-number">{star.az.toFixed(1)}°</small></td
									>
									<td class="mag-cell">{star.mag?.toFixed(2) || '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			<details class="table-explainer">
				<summary
					>{i18n.lang === 'zh'
						? '高度角、方位角和星等是什么意思？'
						: 'What do altitude, azimuth, and magnitude mean?'}</summary
				>
				<p>{i18n.tr('altitude_explain')}</p>
				<p>{i18n.tr('azimuth_explain')}</p>
				<p>{i18n.tr('mag_explain')}</p>
			</details>
		</section>
		<div class="results-bottom">
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The pathname is resolved before appending the query. -->
			<a href={resolve('/') + editQuery} class="btn btn-quiet"
				><Icon name="back" size={16} />{i18n.tr('back')}</a
			>
			<p>{i18n.tr('accuracy_note')}</p>
		</div>
	{/if}
</main>

<style>
	.results {
		padding-top: 35px;
		padding-bottom: 35px;
	}
	.results-heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 25px;
		margin-bottom: 30px;
	}
	.results-heading h1 {
		font-size: clamp(2rem, 3.5vw, 2.9rem);
		margin-top: 13px;
	}
	.heading-description {
		color: var(--muted);
		margin-top: 12px;
		font-size: 0.87rem;
	}
	.heading-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}
	.share-button {
		font-size: 0.72rem;
		min-height: 34px;
	}
	.share-fallback {
		margin-bottom: 20px;
		display: grid;
		gap: 7px;
	}
	.observation-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 22px;
		padding: 20px 23px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 13px;
	}
	.observation-location,
	.observation-time {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 0.82rem;
	}
	.observation-location :global(svg),
	.observation-time :global(svg) {
		color: var(--primary);
	}
	.observation-bar small {
		display: block;
		color: var(--muted);
		font-size: 0.65rem;
		margin-top: 4px;
	}
	.time-buttons {
		display: flex;
		gap: 6px;
	}
	.time-buttons .btn {
		font-size: 0.72rem;
	}
	.overview {
		display: grid;
		grid-template-columns: 1fr 1fr 1.3fr;
		padding: 30px 0 20px;
	}
	.overview > div {
		display: flex;
		align-items: center;
		gap: 14px;
		border-right: 1px solid var(--border);
		padding: 0 25px;
	}
	.overview > div:first-child {
		padding-left: 4px;
	}
	.overview > div:last-child {
		border: 0;
	}
	.overview-value {
		font-size: 2.15rem;
		color: var(--primary);
		font-weight: 450;
		letter-spacing: -0.04em;
	}
	.overview-label {
		color: var(--muted);
		font-size: 0.75rem;
	}
	.condition-summary :global(svg) {
		color: var(--accent);
	}
	.condition-summary strong {
		font-size: 0.95rem;
		font-weight: 550;
	}
	.condition-summary span {
		display: block;
		color: var(--muted);
		font-size: 0.7rem;
		margin-top: 3px;
	}
	.sky-notice {
		display: flex;
		align-items: flex-start;
		gap: 9px;
		color: var(--muted);
		font-size: 0.74rem;
		margin-bottom: 34px;
	}
	.sky-notice :global(svg) {
		color: var(--accent);
		margin-top: 3px;
	}
	.sky-notice.daylight {
		color: var(--danger);
	}
	.legacy-note {
		margin-top: -20px;
		margin-bottom: 25px;
	}
	.recommendations {
		margin-bottom: 34px;
	}
	.recommendation-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 15px;
		margin-top: 20px;
	}
	.recommendation {
		display: block;
		text-align: left;
		padding: 20px;
		border-radius: 13px;
		transition: border-color 0.18s;
	}
	.recommendation:hover,
	.recommendation.chosen {
		border-color: var(--primary);
		background: var(--surface);
	}
	.recommendation-top {
		display: flex;
		justify-content: space-between;
		color: var(--primary);
		margin-bottom: 14px;
	}
	.target-number {
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.recommendation h3 {
		font-size: 1.2rem;
		font-weight: 550;
	}
	.recommendation-alias {
		display: block;
		margin-top: 5px;
		font-size: 0.69rem;
		color: var(--muted);
	}
	.recommendation-data {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 7px;
		padding-top: 17px;
		margin-top: 16px;
		border-top: 1px solid var(--border);
		font-size: 0.76rem;
	}
	.recommendation-data span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.recommendation-data :global(svg) {
		color: var(--accent);
	}
	.recommendation-data small {
		color: var(--muted);
		font-size: 0.65rem;
	}
	.map-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 285px;
		gap: 22px;
		margin-bottom: 28px;
	}
	.map-card {
		padding: 23px;
		scroll-margin-top: 18px;
	}
	.map-top {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	.map-top h2 {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 1.2rem;
	}
	.map-top h2 :global(svg) {
		color: var(--primary);
	}
	.map-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 17px 0 2px;
	}
	.map-checks {
		display: flex;
		gap: 13px;
	}
	.map-checks label {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--muted);
		font-size: 0.7rem;
		cursor: pointer;
	}
	.chart-host {
		max-width: 620px;
		margin: 0 auto;
	}
	.rotation-control {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 0;
		border-top: 1px solid var(--border);
	}
	.rotation-control label {
		font-size: 0.67rem;
		color: var(--muted);
		white-space: nowrap;
	}
	.rotation-control input {
		flex: 1;
		min-width: 0;
	}
	.rotation-control output {
		width: 33px;
		text-align: right;
		font-size: 0.69rem;
		color: var(--muted);
	}
	.map-caption {
		text-align: center;
		color: var(--muted);
		font-size: 0.66rem;
		margin-top: 2px;
	}
	.celestial-caption {
		margin-top: 16px;
	}
	.map-sidebar {
		display: flex;
		flex-direction: column;
		gap: 17px;
	}
	.reading-card,
	.patterns-card {
		padding: 23px;
	}
	.guide-icon {
		color: var(--accent);
		display: inline-block;
		margin-bottom: 18px;
	}
	.reading-card p {
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.9;
		margin-top: 13px;
	}
	.guide-facts {
		padding-top: 17px;
		margin-top: 20px;
		border-top: 1px solid var(--border);
		display: grid;
		gap: 10px;
	}
	.guide-facts span {
		font-size: 0.72rem;
		color: var(--muted);
		display: flex;
		gap: 12px;
	}
	.guide-facts strong {
		width: 30px;
		color: var(--primary);
		font-weight: 500;
	}
	.patterns-card h3 {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.patterns-card h3 :global(svg) {
		color: var(--accent);
	}
	.pattern-list {
		margin-top: 15px;
	}
	.pattern-list details {
		border-bottom: 1px solid var(--border);
		padding: 12px 0;
	}
	.pattern-list summary {
		font-size: 0.82rem;
		color: var(--text);
	}
	.pattern-list summary small {
		display: block;
		font-size: 0.62rem;
		color: var(--muted);
		margin-top: 4px;
	}
	.pattern-members {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.pattern-members button {
		border: 1px solid var(--border);
		border-radius: 5px;
		background: var(--surface);
		padding: 5px 7px;
		color: var(--primary);
		font-size: 0.65rem;
	}
	.pattern-hint {
		font-size: 0.66rem;
		line-height: 1.8;
		margin-top: 18px;
	}
	.pattern-empty {
		margin-top: 17px;
	}
	.selected-detail {
		margin-top: 15px;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 10px;
		align-items: center;
		border-top: 1px solid var(--border);
		padding-top: 15px;
	}
	.selected-detail strong {
		display: block;
		margin-top: 5px;
		font-size: 0.91rem;
	}
	.selected-detail .eyebrow {
		font-size: 0.55rem;
	}
	.selected-detail > span {
		color: var(--accent);
		font-size: 0.77rem;
	}
	.targets-card {
		padding: 27px;
	}
	.filters {
		display: grid;
		grid-template-columns: 1.3fr 0.65fr 1fr 1fr;
		align-items: end;
		gap: 13px;
		margin: 24px 0;
	}
	.filters .input {
		font-size: 0.76rem;
	}
	.search-field {
		position: relative;
	}
	.search-field :global(svg) {
		position: absolute;
		left: 12px;
		top: 14px;
		color: var(--muted);
	}
	.search-field .input {
		padding-left: 36px;
	}
	.name-mode {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: -7px 0 18px;
		font-size: 0.74rem;
		color: var(--muted);
	}
	.name-mode .input {
		width: 190px;
		min-height: 36px;
		font-size: 0.74rem;
		padding: 6px 10px;
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}
	th {
		color: var(--muted);
		font-weight: 450;
		font-size: 0.7rem;
		text-align: left;
		background: var(--surface);
	}
	th,
	td {
		padding: 13px 16px;
		border-bottom: 1px solid var(--border);
	}
	th:first-child {
		border-radius: 7px 0 0 7px;
	}
	th:last-child {
		border-radius: 0 7px 7px 0;
		text-align: right;
	}
	td {
		line-height: 1.5;
	}
	tr:last-child td {
		border: 0;
	}
	tr.chosen {
		background: var(--surface);
	}
	.target-button {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		text-align: left;
		background: transparent;
		border: 0;
		padding: 4px 0;
		color: var(--text);
	}
	.target-button strong {
		font-size: 0.87rem;
		font-weight: 520;
	}
	.target-button small {
		display: block;
		font-size: 0.67rem;
		color: var(--muted);
		margin-top: 3px;
	}
	.target-button:hover strong,
	.target-button[aria-pressed='true'] strong {
		color: var(--primary);
	}
	.target-dot {
		background: var(--star);
		width: 5px;
		height: 5px;
		border-radius: 50%;
	}
	.cluster-dot {
		width: 8px;
		height: 8px;
		border: 1px solid var(--accent);
		background: transparent;
	}
	.alt-number {
		font-variant-numeric: tabular-nums;
	}
	.alt-tag {
		display: block;
		color: var(--muted);
		font-size: 0.64rem;
		margin-top: 3px;
	}
	.direction {
		font-size: 0.77rem;
		white-space: nowrap;
	}
	.az-number {
		display: block;
		color: var(--muted);
		font-size: 0.65rem;
		margin-top: 3px;
	}
	.mag-cell {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	.table-explainer {
		border-top: 1px solid var(--border);
		padding-top: 19px;
		margin-top: 14px;
	}
	.table-explainer p {
		color: var(--muted);
		font-size: 0.75rem;
		margin-top: 10px;
	}
	.empty-state .btn {
		margin-top: 15px;
	}
	.results-bottom {
		display: flex;
		align-items: flex-start;
		gap: 25px;
		margin-top: 22px;
	}
	.results-bottom p {
		color: var(--muted);
		font-size: 0.65rem;
		margin-top: 12px;
	}
	.invalid {
		margin: 35px auto 80px;
		padding: 55px 30px;
		max-width: 650px;
		text-align: center;
	}
	.invalid :global(svg) {
		color: var(--accent);
	}
	.invalid h1 {
		font-size: 2rem;
		margin-top: 25px;
	}
	.invalid p {
		color: var(--muted);
		margin: 20px 0 28px;
		font-size: 0.9rem;
	}
	@media (max-width: 1000px) {
		.map-layout {
			grid-template-columns: minmax(0, 1fr) 250px;
			gap: 16px;
		}
		.map-card {
			padding: 20px;
		}
		.reading-card,
		.patterns-card {
			padding: 20px;
		}
		.observation-bar {
			gap: 16px;
		}
		.filters {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 760px) {
		.results {
			padding-top: 23px;
		}
		.results-heading {
			flex-direction: column;
			align-items: flex-start;
			gap: 18px;
		}
		.heading-actions {
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
		}
		.heading-description {
			font-size: 0.8rem;
		}
		.observation-bar {
			padding: 17px;
			flex-direction: column;
			align-items: flex-start;
			gap: 17px;
		}
		.time-buttons {
			align-self: stretch;
		}
		.time-buttons button {
			flex: 1;
		}
		.overview {
			grid-template-columns: 1fr 1fr;
			row-gap: 16px;
			padding-top: 23px;
		}
		.overview > div {
			padding: 0 15px;
			gap: 10px;
		}
		.overview > div:nth-child(2) {
			border: 0;
		}
		.overview > div:last-child {
			grid-column: 1 / -1;
			padding: 13px 0 0;
			border-top: 1px solid var(--border);
		}
		.overview-value {
			font-size: 1.9rem;
		}
		.overview-label {
			font-size: 0.65rem;
		}
		.recommendations .section-heading {
			flex-direction: column;
			gap: 10px;
		}
		.recommendation-grid {
			gap: 9px;
		}
		.recommendation {
			padding: 13px;
		}
		.recommendation h3 {
			font-size: 0.9rem;
		}
		.recommendation-alias {
			font-size: 0.6rem;
		}
		.recommendation-data {
			flex-direction: column;
			font-size: 0.66rem;
			gap: 8px;
		}
		.recommendation-data small {
			font-size: 0.58rem;
		}
		.map-layout {
			grid-template-columns: 1fr;
			gap: 17px;
		}
		.map-card {
			padding: 17px;
		}
		.map-top h2 {
			font-size: 1.1rem;
		}
		.segmented button {
			padding: 7px 9px;
			font-size: 0.67rem;
		}
		.map-checks {
			gap: 9px;
		}
		.map-sidebar {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px;
		}
		.reading-card,
		.patterns-card {
			padding: 17px;
		}
		.reading-card p {
			font-size: 0.72rem;
		}
		.map-sidebar h3 {
			font-size: 0.88rem;
		}
		.targets-card {
			padding: 20px 15px;
		}
		.filters {
			gap: 13px 10px;
		}
		.search-field {
			grid-column: 1 / -1;
		}
		.filters .field:last-child {
			grid-column: 1 / -1;
		}
		th,
		td {
			padding: 12px 9px;
		}
		.target-button {
			gap: 7px;
		}
		.target-button strong {
			font-size: 0.77rem;
		}
		.direction {
			font-size: 0.67rem;
		}
		.alt-tag {
			display: none;
		}
		.alt-number {
			font-size: 0.74rem;
		}
		.results-bottom {
			flex-direction: column;
			gap: 0;
		}
		.results-bottom p {
			margin: 0 10px 10px;
		}
	}
	@media (max-width: 420px) {
		.map-sidebar {
			grid-template-columns: 1fr;
		}
		.recommendation-grid {
			grid-template-columns: 1fr;
		}
		.recommendation {
			padding: 15px;
		}
		.recommendation-top {
			margin-bottom: 8px;
		}
		.recommendation h3 {
			font-size: 1rem;
		}
		.recommendation-data {
			flex-direction: row;
			margin-top: 12px;
			padding-top: 12px;
		}
		.recommendation-alias {
			font-size: 0.66rem;
		}
		table {
			min-width: 360px;
		}
	}
</style>
