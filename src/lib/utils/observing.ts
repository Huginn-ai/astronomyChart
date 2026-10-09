import type { Star } from '../../types/Stars';
import { STARS, ASTERISMS } from '../stars/catalog';
import {
	normalizeDegrees,
	precessJ2000,
	raDecToAltAz,
	isVisible,
	solarCoordinates,
	skyCondition
} from './astro';
import { isTimeZone, wallTimeToDate } from './time';

export type Language = 'en' | 'zh';
export type NameMode = 'popular' | 'both' | 'mansion';
export type ChartStar = Star & { alt: number; az: number; label?: string };
export type Observation = {
	lat: number;
	lon: number;
	date: Date;
	timeZone: string;
	minAlt: number;
	magLimit: number;
	city: string;
	legacy: boolean;
};

export function parseObservation(query: URLSearchParams, legacyZone = 'UTC'): Observation | null {
	const rawLat = query.get('lat');
	const rawLon = query.get('lon');
	const time = query.get('time');
	if (!rawLat?.trim() || !rawLon?.trim() || !time) return null;
	const lat = Number(rawLat),
		lon = Number(rawLon);
	const minAlt = Number(query.get('minAlt') ?? 0),
		magLimit = Number(query.get('mag') ?? 4);
	if (
		![lat, lon, minAlt, magLimit].every(Number.isFinite) ||
		Math.abs(lat) > 90 ||
		Math.abs(lon) > 180 ||
		minAlt < 0 ||
		minAlt > 60 ||
		magLimit < -2 ||
		magLimit > 6
	)
		return null;
	const timeZone = query.get('tz') || legacyZone;
	if (!isTimeZone(timeZone)) return null;
	const legacy = !/(Z|[+-]\d{2}:\d{2})$/i.test(time);
	if (
		!legacy &&
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/i.test(time)
	)
		return null;
	const date = legacy ? wallTimeToDate(time, timeZone)?.date : new Date(time);
	if (
		!date ||
		!Number.isFinite(date.getTime()) ||
		date.getUTCFullYear() < 1900 ||
		date.getUTCFullYear() > 2100
	)
		return null;
	// Native Date normalizes some impossible calendar dates; reject them.
	const calendar = new Date(`${time.slice(0, 10)}T12:00:00Z`);
	if (
		!Number.isFinite(calendar.getTime()) ||
		calendar.toISOString().slice(0, 10) !== time.slice(0, 10)
	)
		return null;
	return { lat, lon, date, timeZone, minAlt, magLimit, city: query.get('city') || '', legacy };
}

export function observationQuery(observation: Observation): URLSearchParams {
	return new URLSearchParams({
		lat: String(observation.lat),
		lon: String(observation.lon),
		time: observation.date.toISOString(),
		tz: observation.timeZone,
		minAlt: String(observation.minAlt),
		mag: String(observation.magLimit),
		...(observation.city ? { city: observation.city } : {})
	});
}

export function calculateSky(observation: Observation) {
	const { date, lat, lon, minAlt, magLimit } = observation;
	const stars: ChartStar[] = STARS.map((star) => {
		const mean = precessJ2000(date, star.raDeg, star.decDeg);
		const pos = raDecToAltAz(date, lat, lon, mean.raDeg, mean.decDeg);
		return { ...star, alt: pos.altDeg, az: pos.azDeg };
	});
	const aboveHorizon = stars.filter((star) => isVisible(star.alt));
	const visible = aboveHorizon.filter(
		(star) => isVisible(star.alt, minAlt) && (star.mag === undefined || star.mag <= magLimit)
	);
	const ids = new Set(visible.map((star) => star.id));
	const asterisms = ASTERISMS.filter((a) => a.members.every((id) => ids.has(id)));
	const sun = solarCoordinates(date);
	const solarAltitude = raDecToAltAz(date, lat, lon, sun.raDeg, sun.decDeg).altDeg;
	// Bright, high stars first. Clusters are listed separately because
	// integrated magnitude does not describe the brightness of each star.
	const recommended = [...visible]
		.filter((s) => s.kind !== 'cluster')
		.sort((a, b) => observingScore(b) - observingScore(a))
		.slice(0, 3);
	return {
		stars,
		aboveHorizon,
		visible,
		asterisms,
		recommended,
		solarAltitude,
		condition: skyCondition(solarAltitude)
	};
}

export function observingScore(star: ChartStar): number {
	const altitudeWeight = Math.sin((Math.max(0, star.alt) * Math.PI) / 180);
	return altitudeWeight * 2 - (star.mag ?? 4) * 0.45;
}

export function formatStarName(star: Star, language: Language, mode: NameMode = 'popular'): string {
	if (language === 'en') return star.id.replaceAll('_', ' ').replace('Alpha Cen', 'Alpha Centauri');
	const match = star.cn.match(/^(.*?)(?:[（(](.*?)[)）])?$/);
	const bayer = match?.[1]?.trim() || star.id;
	const chinese = match?.[2]?.trim();
	if (mode === 'mansion') return bayer;
	if (mode === 'both' && chinese) return `${chinese} · ${bayer}`;
	return chinese || bayer;
}

export function formatDirection(az: number, lang: Language): string {
	if (!Number.isFinite(az)) return lang === 'zh' ? '未知' : 'Unknown';
	const angle = normalizeDegrees(az);
	const cardinal = Math.round(angle / 90) % 4;
	const base = cardinal * 90;
	const offset = ((angle - base + 540) % 360) - 180;
	const degrees = Math.round(Math.abs(offset));
	const en = ['N', 'E', 'S', 'W'],
		zh = ['北', '东', '南', '西'];
	if (degrees === 0) return lang === 'zh' ? zh[cardinal] : en[cardinal];
	const toward = (cardinal + (offset > 0 ? 1 : 3)) % 4;
	return lang === 'zh'
		? `${zh[cardinal]}偏${zh[toward]} ${degrees}°`
		: `${en[toward]} of ${en[cardinal]} ${degrees}°`;
}
