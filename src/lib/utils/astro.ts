// Mean positions for finding bright targets, not telescope pointing.
// Longitude is east-positive; azimuth is clockwise from true north.
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
export const normalizeDegrees = (angle: number) => ((angle % 360) + 360) % 360;
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function toJulianDate(date: Date): number {
	return date.getTime() / 86400000 + 2440587.5;
}

export function gstInDegrees(date: Date): number {
	const days = toJulianDate(date) - 2451545;
	const t = days / 36525;
	return normalizeDegrees(
		280.46061837 + 360.98564736629 * days + 0.000387933 * t ** 2 - t ** 3 / 38710000
	);
}

export function lstInDegrees(date: Date, longitude: number): number {
	return normalizeDegrees(gstInDegrees(date) + longitude);
}

// Meeus / IAU 1976, J2000 -> mean equator and equinox of date.
// Proper motion, nutation, aberration and atmospheric refraction are omitted.
export function precessJ2000(date: Date, raDeg: number, decDeg: number) {
	const t = (toJulianDate(date) - 2451545) / 36525;
	const zeta = ((2306.2181 * t + 0.30188 * t ** 2 + 0.017998 * t ** 3) * RAD) / 3600;
	const z = ((2306.2181 * t + 1.09468 * t ** 2 + 0.018203 * t ** 3) * RAD) / 3600;
	const theta = ((2004.3109 * t - 0.42665 * t ** 2 - 0.041833 * t ** 3) * RAD) / 3600;
	const ra = raDeg * RAD + zeta;
	const dec = decDeg * RAD;
	const a = Math.cos(dec) * Math.sin(ra);
	const b = Math.cos(theta) * Math.cos(dec) * Math.cos(ra) - Math.sin(theta) * Math.sin(dec);
	const c = Math.sin(theta) * Math.cos(dec) * Math.cos(ra) + Math.cos(theta) * Math.sin(dec);
	return {
		raDeg: normalizeDegrees((Math.atan2(a, b) + z) * DEG),
		decDeg: Math.atan2(c, Math.hypot(a, b)) * DEG
	};
}

// Input coordinates refer to the equator/equinox of date. The vector form
// avoids dividing by cos(latitude), including at either geographic pole.
export function raDecToAltAz(
	date: Date,
	latDeg: number,
	lonDeg: number,
	raDeg: number,
	decDeg: number
) {
	const hourAngle = (lstInDegrees(date, lonDeg) - raDeg) * RAD;
	const latitude = latDeg * RAD;
	const declination = decDeg * RAD;
	const east = -Math.cos(declination) * Math.sin(hourAngle);
	const north =
		Math.sin(declination) * Math.cos(latitude) -
		Math.cos(declination) * Math.cos(hourAngle) * Math.sin(latitude);
	const up =
		Math.sin(declination) * Math.sin(latitude) +
		Math.cos(declination) * Math.cos(hourAngle) * Math.cos(latitude);
	return {
		altDeg: Math.asin(clamp(up)) * DEG,
		azDeg: normalizeDegrees(Math.atan2(east, north) * DEG)
	};
}

export function isVisible(altDeg: number, minAltDeg = 0): boolean {
	return Number.isFinite(altDeg) && altDeg > minAltDeg;
}

// US Naval Observatory's approximate solar coordinates, near J2000.
export function solarCoordinates(date: Date) {
	const days = toJulianDate(date) - 2451545;
	const g = normalizeDegrees(357.529 + 0.98560028 * days) * RAD;
	const longitude =
		(normalizeDegrees(280.459 + 0.98564736 * days) + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) *
		RAD;
	const obliquity = (23.439 - 0.00000036 * days) * RAD;
	return {
		raDeg: normalizeDegrees(
			Math.atan2(Math.cos(obliquity) * Math.sin(longitude), Math.cos(longitude)) * DEG
		),
		decDeg: Math.asin(Math.sin(obliquity) * Math.sin(longitude)) * DEG
	};
}

export type SkyCondition = 'day' | 'civil' | 'nautical' | 'astronomical' | 'dark';
export function skyCondition(solarAltitude: number): SkyCondition {
	if (solarAltitude >= -0.833) return 'day';
	if (solarAltitude >= -6) return 'civil';
	if (solarAltitude >= -12) return 'nautical';
	if (solarAltitude >= -18) return 'astronomical';
	return 'dark';
}
