import test from 'node:test';
import assert from 'node:assert/strict';
import {
	toJulianDate,
	gstInDegrees,
	lstInDegrees,
	precessJ2000,
	raDecToAltAz,
	solarCoordinates,
	isVisible,
	skyCondition
} from '../src/lib/utils/astro';
import {
	parseObservation,
	observationQuery,
	calculateSky,
	formatDirection,
	formatStarName
} from '../src/lib/utils/observing';
import { wallTimeToDate, toDatetimeValue } from '../src/lib/utils/time';
import { STARS, ASTERISMS } from '../src/lib/stars/catalog';
import { findCity } from '../src/lib/geo/cities';
import en from '../src/lib/i18n/en.json';
import zh from '../src/lib/i18n/zh.json';

const close = (actual: number, expected: number, tolerance = 1e-6) =>
	assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
const epoch = new Date('2000-01-01T12:00:00Z');
const settings = new URLSearchParams({
	lat: '40.34',
	lon: '-74.65',
	time: '2026-10-06T01:00:00.000Z',
	tz: 'America/New_York',
	minAlt: '10',
	mag: '4',
	city: 'Princeton'
});

test('J2000 Julian date and Greenwich mean sidereal time match reference values', () => {
	close(toJulianDate(epoch), 2451545);
	close(gstInDegrees(epoch), 280.46061837);
	close(lstInDegrees(epoch, 90), 10.46061837);
});

test('Equatorial rising, setting, and transit agree with horizon geometry', () => {
	const sidereal = lstInDegrees(epoch, 0);
	const rising = raDecToAltAz(epoch, 0, 0, sidereal + 90, 0);
	close(rising.altDeg, 0);
	close(rising.azDeg, 90);
	const setting = raDecToAltAz(epoch, 0, 0, sidereal - 90, 0);
	close(setting.altDeg, 0);
	close(setting.azDeg, 270);
	close(raDecToAltAz(epoch, 40, 0, sidereal, 10).altDeg, 60);
});

test('Geographic poles produce finite coordinates and expected altitude', () => {
	for (const latitude of [-90, 90]) {
		const position = raDecToAltAz(epoch, latitude, 0, 123, 30);
		close(position.altDeg, latitude > 0 ? 30 : -30);
		assert.ok(Number.isFinite(position.azDeg));
	}
});

test('Precession preserves J2000 positions and angular separations', () => {
	const initial = precessJ2000(epoch, 123, 89);
	close(initial.raDeg, 123);
	close(initial.decDeg, 89);
	function separation(a: { raDeg: number; decDeg: number }, b: { raDeg: number; decDeg: number }) {
		const rad = Math.PI / 180;
		return (
			Math.sin(a.decDeg * rad) * Math.sin(b.decDeg * rad) +
			Math.cos(a.decDeg * rad) * Math.cos(b.decDeg * rad) * Math.cos((a.raDeg - b.raDeg) * rad)
		);
	}
	const a = { raDeg: 32, decDeg: 45 },
		b = { raDeg: 143, decDeg: -10 };
	close(
		separation(a, b),
		separation(
			precessJ2000(new Date('2100-01-01T00:00Z'), a.raDeg, a.decDeg),
			precessJ2000(new Date('2100-01-01T00:00Z'), b.raDeg, b.decDeg)
		)
	);
});

test('Solar declination agrees with the equinox and solstice geometry', () => {
	close(solarCoordinates(new Date('2026-03-20T15:00Z')).decDeg, 0, 0.1);
	close(solarCoordinates(new Date('2026-06-21T09:00Z')).decDeg, 23.44, 0.05);
	close(solarCoordinates(new Date('2026-12-21T21:00Z')).decDeg, -23.44, 0.05);
});

test('Observation wall time is independent of the browser timezone', () => {
	assert.equal(
		wallTimeToDate('2026-10-05T21:00', 'America/New_York')?.date.toISOString(),
		'2026-10-06T01:00:00.000Z'
	);
	assert.equal(
		wallTimeToDate('2026-10-05T21:00', 'Asia/Shanghai')?.date.toISOString(),
		'2026-10-05T13:00:00.000Z'
	);
	assert.equal(
		wallTimeToDate('2026-10-05T21:00', 'Asia/Kathmandu')?.date.toISOString(),
		'2026-10-05T15:15:00.000Z'
	);
	assert.equal(
		toDatetimeValue(new Date('2026-10-06T01:00Z'), 'America/New_York'),
		'2026-10-05T21:00'
	);
});

test('DST gaps are rejected and repeated times choose the earlier occurrence', () => {
	assert.equal(wallTimeToDate('2026-03-08T02:30', 'America/New_York'), null);
	const fold = wallTimeToDate('2026-11-01T01:30', 'America/New_York');
	assert.equal(fold?.ambiguous, true);
	assert.equal(fold?.date.toISOString(), '2026-11-01T05:30:00.000Z');
	assert.equal(wallTimeToDate('2026-02-30T12:00', 'UTC'), null);
	assert.equal(wallTimeToDate('2026-10-05T21:00', 'invalid'), null);
});

test('Shared sky links preserve one exact instant and validate settings', () => {
	const observation = parseObservation(settings)!;
	assert.ok(observation);
	assert.equal(
		parseObservation(observationQuery(observation), 'Asia/Shanghai')?.date.getTime(),
		observation.date.getTime()
	);
	for (const [key, value] of [
		['lat', '91'],
		['lon', '-181'],
		['lat', ''],
		['lon', 'oops'],
		['time', 'not-a-time'],
		['time', '2026-02-30T00:00:00Z'],
		['time', '1800-01-01T00:00Z'],
		['tz', 'Invalid/Zone'],
		['minAlt', 'NaN'],
		['mag', '99']
	]) {
		const invalid = new URLSearchParams(settings);
		invalid.set(key, value);
		assert.equal(parseObservation(invalid), null, key + '=' + value);
	}
	assert.equal(parseObservation(new URLSearchParams()), null);
});

test('Legacy links still use a specified local zone', () => {
	const legacy = new URLSearchParams(settings);
	legacy.set('time', '2026-10-05T21:00');
	legacy.delete('tz');
	assert.equal(
		parseObservation(legacy, 'America/New_York')?.date.toISOString(),
		'2026-10-06T01:00:00.000Z'
	);
});

test('Compass descriptions match both hemispheres of every quadrant', () => {
	for (const [angle, english, chinese] of [
		[0, 'N', '北'],
		[15, 'E of N 15°', '北偏东 15°'],
		[75, 'N of E 15°', '东偏北 15°'],
		[90, 'E', '东'],
		[105, 'S of E 15°', '东偏南 15°'],
		[165, 'E of S 15°', '南偏东 15°'],
		[180, 'S', '南'],
		[195, 'W of S 15°', '南偏西 15°'],
		[255, 'S of W 15°', '西偏南 15°'],
		[270, 'W', '西'],
		[285, 'N of W 15°', '西偏北 15°'],
		[345, 'W of N 15°', '北偏西 15°'],
		[360, 'N', '北'],
		[-15, 'W of N 15°', '北偏西 15°']
	] as [number, string, string][]) {
		assert.equal(formatDirection(angle, 'en'), english);
		assert.equal(formatDirection(angle, 'zh'), chinese);
	}
});

test('Big Dipper has seven unique members and the bowl plus handle', () => {
	const dipper = ASTERISMS.find((a) => a.id === 'BigDipper')!;
	assert.equal(new Set(dipper.members).size, 7);
	assert.equal(dipper.edges?.length, 7);
	assert.ok(dipper.members.every((id) => STARS.some((s) => s.id === id)));
	assert.equal(formatStarName(STARS.find((s) => s.id === 'Castor')!, 'zh'), '北河二');
	assert.equal(formatStarName(STARS.find((s) => s.id === 'Pollux')!, 'zh'), '北河三');
	assert.equal(findCity('上海')?.timeZone, 'Asia/Shanghai');
	assert.equal(findCity('  SAO PAULO ')?.name, 'São Paulo');
});

test('Filters and pattern completeness reflect real positions', () => {
	const observation = parseObservation(settings)!;
	const all = calculateSky({ ...observation, minAlt: 0 });
	const high = calculateSky({ ...observation, minAlt: 30 });
	assert.ok(all.visible.length > 0);
	assert.ok(high.visible.length < all.visible.length);
	assert.ok(high.visible.every((s) => s.alt > 30));
	const bright = calculateSky({ ...observation, minAlt: 0, magLimit: 1.5 });
	assert.ok(bright.visible.every((s) => s.mag === undefined || s.mag <= 1.5));
	assert.ok(
		bright.asterisms.every((a) => a.members.every((id) => bright.visible.some((s) => s.id === id)))
	);
	assert.ok(all.recommended.every((s) => s.kind !== 'cluster'));
	assert.equal(isVisible(Number.NaN), false);
	assert.equal(isVisible(0), false);
});

test('Daylight status does not depend on whether stars are above the horizon', () => {
	const daytime = calculateSky({
		...parseObservation(settings)!,
		date: new Date('2026-10-05T16:00Z')
	});
	assert.equal(daytime.condition, 'day');
	assert.ok(daytime.visible.length > 0);
	assert.equal(skyCondition(-20), 'dark');
	assert.equal(skyCondition(-10), 'nautical');
});

test('Every interface translation exists in both languages', () => {
	function keys(object: Record<string, unknown>, prefix = ''): string[] {
		return Object.entries(object).flatMap(([key, value]) =>
			typeof value === 'object' && value
				? keys(value as Record<string, unknown>, prefix + key + '.')
				: [prefix + key]
		);
	}
	assert.deepEqual(keys(en).sort(), keys(zh).sort());
});
