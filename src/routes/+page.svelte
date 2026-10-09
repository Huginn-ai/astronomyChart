<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { CITY_DB, cityLabel, findCity, type City } from '$lib/geo/cities';
	import { createI18n } from '$lib/i18n/reactive.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SkyChart from '$lib/components/SkyChart.svelte';
	import {
		calculateSky,
		formatStarName,
		observationQuery,
		parseObservation,
		type Observation
	} from '$lib/utils/observing';
	import {
		DEFAULT_TIME_ZONE,
		browserTimeZone,
		isTimeZone,
		toDatetimeValue,
		wallTimeToDate
	} from '$lib/utils/time';
	import { readPreference, savePreference } from '$lib/utils/storage';

	const i18n = createI18n();
	let city = $state('Princeton');
	let matched = $state<City | null>(findCity('Princeton'));
	let latitude = $state<number | undefined>(40.34);
	let longitude = $state<number | undefined>(-74.65);
	let timeZone = $state(DEFAULT_TIME_ZONE);
	let datetime = $state('');
	let minAlt = $state(10);
	let cityMessage = $state<'matched' | 'missing' | null>(null);
	let error = $state<string | null>(null);
	let locating = $state(false);
	let submitting = $state(false);
	const quickCities = ['Princeton', 'Shanghai', 'Beijing', 'Hong Kong'].map(
		(name) => findCity(name)!
	);
	let zones = $state([...new Set(['UTC', ...CITY_DB.map((c) => c.timeZone)])]);
	const wallTime = $derived(wallTimeToDate(datetime, timeZone));
	const observation = $derived<Observation | null>(
		typeof latitude === 'number' &&
			Number.isFinite(latitude) &&
			Math.abs(latitude) <= 90 &&
			typeof longitude === 'number' &&
			Number.isFinite(longitude) &&
			Math.abs(longitude) <= 180 &&
			wallTime &&
			wallTime.date.getUTCFullYear() >= 1900 &&
			wallTime.date.getUTCFullYear() <= 2100
			? {
					lat: latitude,
					lon: longitude,
					date: wallTime.date,
					timeZone,
					minAlt,
					magLimit: 4,
					city: matched?.name || '',
					legacy: false
				}
			: null
	);
	const preview = $derived(observation ? calculateSky(observation) : null);
	const chartStars = $derived(
		preview?.visible.map((s) => ({ ...s, label: formatStarName(s, i18n.lang) })) || []
	);

	onMount(() => {
		const existing = parseObservation(page.url.searchParams, browserTimeZone());
		if (existing) {
			latitude = existing.lat;
			longitude = existing.lon;
			timeZone = existing.timeZone;
			matched = findCity(existing.city);
			city = matched?.name || '';
			minAlt = existing.minAlt;
			datetime = toDatetimeValue(existing.date, timeZone);
		} else {
			try {
				const saved = JSON.parse(readPreference('observationSettings') || 'null');
				if (
					saved &&
					Number.isFinite(saved.lat) &&
					Math.abs(saved.lat) <= 90 &&
					Number.isFinite(saved.lon) &&
					Math.abs(saved.lon) <= 180 &&
					typeof saved.timeZone === 'string' &&
					isTimeZone(saved.timeZone)
				) {
					latitude = saved.lat;
					longitude = saved.lon;
					timeZone = saved.timeZone;
					matched = typeof saved.city === 'string' ? findCity(saved.city) : null;
					city = matched?.name || '';
					if ([0, 10, 20, 30].includes(saved.minAlt)) minAlt = saved.minAlt;
				}
			} catch {
				/* Keep sensible defaults when saved settings are invalid. */
			}
			setTime('tonight');
		}
		zones = [...new Set([...zones, browserTimeZone(), timeZone])].sort();
	});

	function applyCity(hit: City) {
		city = hit.name;
		matched = hit;
		latitude = hit.lat;
		longitude = hit.lon;
		timeZone = hit.timeZone;
		cityMessage = 'matched';
		error = null;
	}
	function resolveCity() {
		if (!city.trim()) {
			cityMessage = null;
			matched = null;
			return;
		}
		const hit = findCity(city);
		if (hit) applyCity(hit);
		else {
			cityMessage = 'missing';
			matched = null;
		}
	}
	function manualLocation() {
		matched = null;
		city = '';
		cityMessage = null;
		error = null;
	}
	function setTime(mode: 'now' | 'tonight') {
		if (!isTimeZone(timeZone)) return;
		const now = toDatetimeValue(new Date(), timeZone);
		datetime = mode === 'now' ? now : now.slice(0, 10) + 'T21:00';
		error = null;
	}
	function useLocation() {
		if (!navigator.geolocation) {
			error = 'location_denied';
			return;
		}
		locating = true;
		error = null;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				latitude = Number(position.coords.latitude.toFixed(5));
				longitude = Number(position.coords.longitude.toFixed(5));
				manualLocation();
				timeZone = browserTimeZone();
				locating = false;
			},
			() => {
				locating = false;
				error = 'location_denied';
			},
			{ timeout: 10000, maximumAge: 300000 }
		);
	}
	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const hit = findCity(city);
		if (hit && hit.name !== matched?.name) applyCity(hit);
		if (!observation) {
			error = isTimeZone(timeZone) && datetime && !wallTime ? 'dst_gap' : 'invalid_form';
			return;
		}
		const snapshot = observation;
		savePreference(
			'observationSettings',
			JSON.stringify({
				lat: snapshot.lat,
				lon: snapshot.lon,
				timeZone,
				minAlt,
				city: snapshot.city
			})
		);
		submitting = true;
		try {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- The pathname is resolved before appending the query.
			await goto(resolve('/result') + '?' + observationQuery(snapshot));
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head
	><title>AstroRao · {i18n.lang === 'zh' ? '认识你的星空' : 'Know your night sky'}</title
	></svelte:head
>

<main id="main-content" class="site-shell home">
	<section class="hero" aria-labelledby="hero-title">
		<p class="eyebrow"><span class="line"></span>{i18n.tr('eyebrow')}</p>
		<h1 id="hero-title">{i18n.tr('hero_title')}<br /><span>{i18n.tr('hero_accent')}</span></h1>
		<p class="hero-description">{i18n.tr('hero_description')}</p>
		<div class="hero-notes">
			<span><Icon name="star" size={14} />{i18n.tr('no_gear')}</span>
			<span><Icon name="globe" size={14} />{i18n.tr('bilingual')}</span>
			<span><Icon name="sparkle" size={14} />{i18n.tr('lightweight')}</span>
		</div>
	</section>

	<section class="planning-grid" aria-label={i18n.tr('start_observing')}>
		<form class="card settings-card" onsubmit={submit}>
			<div class="form-heading">
				<Icon name="telescope" size={22} />
				<div>
					<h2>{i18n.tr('start_observing')}</h2>
					<p class="helper">{i18n.tr('settings_hint')}</p>
				</div>
			</div>
			<fieldset>
				<legend><span class="step">01</span>{i18n.tr('location_step')}</legend>
				<label class="sr-only" for="city">{i18n.tr('city_label')}</label>
				<div class="city-row">
					<div class="city-input">
						<Icon name="search" size={17} /><input
							id="city"
							class="input"
							type="search"
							bind:value={city}
							list="cities"
							placeholder={i18n.tr('city_placeholder')}
							onblur={resolveCity}
							oninput={() => {
								cityMessage = null;
							}}
							autocomplete="off"
						/>
					</div>
					<button class="btn" type="button" onclick={resolveCity}>{i18n.tr('city_fill_btn')}</button
					>
				</div>
				<datalist id="cities"
					>{#each CITY_DB as c (c.name)}<option value={c.name}
							>{c.aliases?.[0]} · {c.country}</option
						>{/each}</datalist
				>
				<div class="quick-cities">
					{#each quickCities as c (c.name)}<button
							type="button"
							class:chosen={matched?.name === c.name}
							onclick={() => applyCity(c)}>{cityLabel(c, i18n.lang)}</button
						>{/each}
				</div>
				<p class="city-message helper" aria-live="polite">
					{#if cityMessage === 'missing'}{i18n.tr(
							'city_not_found'
						)}{:else if cityMessage === 'matched' && matched}<span class="match"
							><Icon name="check" size={13} />{i18n.tr('city_matched_prefix')} · {cityLabel(
								matched,
								i18n.lang
							)}</span
						>{/if}
				</p>
				<div class="coordinates">
					<div class="field">
						<label for="lat">{i18n.tr('latitude')}</label><input
							id="lat"
							class="input"
							type="number"
							min="-90"
							max="90"
							step="any"
							required
							bind:value={latitude}
							oninput={manualLocation}
						/>
					</div>
					<div class="field">
						<label for="lon">{i18n.tr('longitude')}</label><input
							id="lon"
							class="input"
							type="number"
							min="-180"
							max="180"
							step="any"
							required
							bind:value={longitude}
							oninput={manualLocation}
						/>
					</div>
				</div>
				<div class="location-meta">
					<p class="helper">{i18n.tr('coordinate_hint')}</p>
					<button class="locate" type="button" onclick={useLocation} disabled={locating}
						><Icon name="pin" size={14} />{i18n.tr(locating ? 'locating' : 'use_location')}</button
					>
				</div>
			</fieldset>
			<fieldset>
				<legend><span class="step">02</span>{i18n.tr('time_step')}</legend>
				<div class="field">
					<label for="dt" class="sr-only">{i18n.tr('time_label')}</label><input
						id="dt"
						class="input"
						type="datetime-local"
						min="1900-01-01T00:00"
						max="2100-12-31T23:59"
						required
						bind:value={datetime}
					/>
				</div>
				<div class="time-shortcuts">
					<button type="button" onclick={() => setTime('now')}
						><Icon name="clock" size={13} />{i18n.tr('now')}</button
					><button type="button" onclick={() => setTime('tonight')}
						><Icon name="moon" size={13} />{i18n.tr('tonight')}</button
					>
				</div>
				<div class="field">
					<label for="timezone">{i18n.tr('time_zone')}</label><input
						id="timezone"
						class="input zone-input"
						type="text"
						list="timezones"
						required
						bind:value={timeZone}
						aria-describedby="timezone-hint"
					/><datalist id="timezones"
						>{#each zones as zone (zone)}<option value={zone}></option>{/each}</datalist
					>
				</div>
				<p id="timezone-hint" class="helper time-hint">{i18n.tr('time_zone_hint')}</p>
				{#if wallTime?.ambiguous}<p class="helper">{i18n.tr('dst_fold')}</p>{/if}
			</fieldset>
			<div class="altitude-field field">
				<label for="min-alt">{i18n.tr('min_altitude')}</label><select
					class="input"
					id="min-alt"
					bind:value={minAlt}
					><option value={0}>{i18n.tr('all_horizon')}</option><option value={10}>10°</option><option
						value={20}>20°</option
					><option value={30}>30°</option></select
				>
				<p class="helper">{i18n.tr('min_alt_hint')}</p>
			</div>
			{#if error}<p class="error form-error" role="alert">{i18n.tr(error)}</p>{/if}
			<button class="btn btn-primary submit" type="submit" disabled={submitting}
				>{i18n.tr('submit_cta')}<Icon name="arrow" size={18} /></button
			>
		</form>

		<div class="preview-column">
			<div class="preview-card card">
				<div class="preview-heading">
					<span class="eyebrow">{i18n.tr('preview')}</span><Icon name="sparkle" size={18} />
				</div>
				<p class="preview-location">
					{matched
						? cityLabel(matched, i18n.lang)
						: latitude !== undefined && longitude !== undefined
							? latitude.toFixed(2) + '°, ' + longitude.toFixed(2) + '°'
							: '—'}<span>{datetime.replace('T', ' · ')}</span>
				</p>
				{#if preview}
					<SkyChart
						stars={chartStars}
						asterisms={preview.asterisms}
						locale={i18n.lang}
						{minAlt}
						interactive={false}
						labelMagLimit={1.6}
					/>
					<div class="preview-bottom">
						<span><span class="dot"></span>{i18n.tr('preview_live')}</span><span
							>{preview.visible.length} {i18n.tr('preview_count')}</span
						>
					</div>
				{:else}
					<div class="preview-placeholder">
						<Icon name="compass" size={48} />
						<p>{i18n.tr('preview_empty')}</p>
					</div>
				{/if}
			</div>
			<div class="preview-note">
				<Icon name="compass" size={20} />
				<p>{i18n.tr('map_guide_body')}</p>
			</div>
		</div>
	</section>

	<section class="how-it-works">
		<div class="how-intro">
			<p class="eyebrow">LOOK UP · 探索</p>
			<h2>{i18n.tr('how_title')}</h2>
			<p class="helper">{i18n.tr('how_description')}</p>
		</div>
		<div class="how-grid">
			{#each [{ icon: 'pin', title: 'how_location', body: 'how_location_body' }, { icon: 'clock', title: 'how_time', body: 'how_time_body' }, { icon: 'sparkle', title: 'how_look', body: 'how_look_body' }] as item, i (item.title)}
				<div class="how-item">
					<div class="how-icon"><Icon name={item.icon} size={21} /><span>0{i + 1}</span></div>
					<h3>{i18n.tr(item.title)}</h3>
					<p>{i18n.tr(item.body)}</p>
				</div>
			{/each}
		</div>
	</section>
</main>

<style>
	.home {
		padding-top: 38px;
		padding-bottom: 68px;
	}
	.hero {
		max-width: 690px;
		margin-bottom: 42px;
	}
	.hero .eyebrow {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.line {
		width: 24px;
		height: 1px;
		background: var(--accent);
	}
	h1 {
		margin-top: 20px;
	}
	h1 span {
		color: var(--primary);
	}
	.hero-description {
		max-width: 570px;
		color: var(--muted);
		font-size: 0.96rem;
		line-height: 1.8;
		margin-top: 19px;
	}
	.hero-notes {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		color: var(--muted);
		font-size: 0.7rem;
		margin-top: 23px;
	}
	.hero-notes span {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.hero-notes :global(svg) {
		color: var(--accent);
	}
	.planning-grid {
		display: grid;
		grid-template-columns: 1fr 1.05fr;
		gap: 28px;
		align-items: start;
	}
	.settings-card {
		padding: 29px;
	}
	.form-heading {
		display: flex;
		gap: 12px;
		margin-bottom: 27px;
		align-items: flex-start;
	}
	.form-heading :global(svg) {
		color: var(--primary);
		margin-top: 3px;
	}
	.form-heading h2 {
		font-size: 1.3rem;
	}
	.form-heading .helper {
		margin-top: 5px;
	}
	fieldset {
		padding: 0;
		margin: 0 0 23px;
		border: 0;
		min-width: 0;
	}
	legend {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 0.85rem;
		font-weight: 550;
		margin-bottom: 15px;
	}
	.step {
		font-size: 0.64rem;
		color: var(--accent);
		border: 1px solid var(--border);
		padding: 1px 5px;
		border-radius: 4px;
	}
	.city-row {
		display: flex;
		gap: 8px;
	}
	.city-input {
		position: relative;
		flex: 1;
		min-width: 0;
	}
	.city-input :global(svg) {
		position: absolute;
		left: 12px;
		top: 15px;
		color: var(--muted);
	}
	.city-input .input {
		padding-left: 36px;
		font-size: 0.85rem;
	}
	.quick-cities {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}
	.quick-cities button {
		font-size: 0.71rem;
		padding: 5px 9px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: transparent;
		color: var(--muted);
	}
	.quick-cities button.chosen {
		color: var(--primary);
		background: var(--surface);
		border-color: var(--primary);
	}
	.city-message {
		margin-top: 6px;
		min-height: 22px;
		font-size: 0.71rem;
	}
	.match {
		display: flex;
		align-items: center;
		gap: 5px;
		color: var(--accent);
	}
	.coordinates {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 4px;
	}
	.location-meta {
		margin-top: 9px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}
	.location-meta .helper {
		font-size: 0.69rem;
	}
	.locate {
		display: inline-flex;
		gap: 5px;
		align-items: center;
		padding: 2px 0;
		color: var(--primary);
		font-size: 0.73rem;
		background: transparent;
		border: 0;
		min-height: 30px;
	}
	.time-shortcuts {
		display: flex;
		gap: 15px;
		margin: 9px 0 15px;
	}
	.time-shortcuts button {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border: 0;
		padding: 4px 0;
		background: transparent;
		color: var(--primary);
		font-size: 0.73rem;
		min-height: 28px;
	}
	.zone-input {
		font-size: 0.84rem;
	}
	.time-hint {
		font-size: 0.71rem;
		margin-top: 7px;
	}
	.altitude-field {
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}
	.altitude-field .helper {
		font-size: 0.7rem;
	}
	.submit {
		width: 100%;
		justify-content: space-between;
		padding: 13px 18px;
		margin-top: 23px;
	}
	.form-error {
		margin-top: 14px;
	}
	.preview-card {
		padding: 24px 20px 19px;
		background: var(--surface);
	}
	.preview-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.preview-heading :global(svg) {
		color: var(--primary);
	}
	.preview-heading .eyebrow {
		color: var(--muted);
	}
	.preview-location {
		margin: 12px 4px 5px;
		font-size: 0.9rem;
	}
	.preview-location span {
		display: block;
		color: var(--muted);
		font-size: 0.73rem;
		margin-top: 3px;
	}
	.preview-bottom {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: space-between;
		padding: 17px 3px 0;
		border-top: 1px solid var(--border);
		color: var(--muted);
		font-size: 0.65rem;
	}
	.preview-bottom span {
		display: inline-flex;
		gap: 6px;
		align-items: center;
	}
	.preview-bottom .dot {
		color: var(--accent);
		width: 5px;
		height: 5px;
	}
	.preview-placeholder {
		aspect-ratio: 1;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 20px;
		text-align: center;
		color: var(--muted);
		padding: 40px;
		font-size: 0.85rem;
	}
	.preview-note {
		display: flex;
		gap: 12px;
		padding: 22px 7px;
		color: var(--muted);
		font-size: 0.74rem;
	}
	.preview-note :global(svg) {
		color: var(--accent);
		margin-top: 3px;
	}
	.how-it-works {
		margin-top: 68px;
		padding-top: 35px;
		border-top: 1px solid var(--border);
	}
	.how-intro h2 {
		margin-top: 12px;
	}
	.how-intro .helper {
		margin-top: 9px;
	}
	.how-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 32px;
		margin-top: 28px;
	}
	.how-icon {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: var(--primary);
		margin-bottom: 16px;
	}
	.how-icon span {
		font-size: 0.68rem;
		color: var(--muted);
		opacity: 0.6;
	}
	.how-item p {
		margin-top: 10px;
		color: var(--muted);
		font-size: 0.8rem;
		line-height: 1.8;
		max-width: 290px;
	}
	@media (max-width: 900px) {
		.planning-grid {
			gap: 18px;
		}
		.settings-card {
			padding: 23px;
		}
	}
	@media (max-width: 760px) {
		.home {
			padding-top: 25px;
			padding-bottom: 40px;
		}
		.hero {
			margin-bottom: 29px;
		}
		.hero-description {
			font-size: 0.87rem;
		}
		.hero-notes {
			gap: 12px;
			font-size: 0.66rem;
		}
		.planning-grid {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.settings-card {
			padding: 23px;
		}
		.preview-column {
			max-width: 540px;
			width: 100%;
			margin: 0 auto;
		}
		.how-it-works {
			margin-top: 28px;
		}
		.how-grid {
			grid-template-columns: 1fr;
			gap: 28px;
		}
		.how-icon {
			max-width: 70px;
		}
		.how-item p {
			max-width: none;
		}
	}
</style>
