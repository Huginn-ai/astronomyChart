export const DEFAULT_TIME_ZONE = 'America/New_York';
const formatters = new Map<string, Intl.DateTimeFormat>();

export function isTimeZone(zone: string): boolean {
	try {
		new Intl.DateTimeFormat('en', { timeZone: zone }).format();
		return true;
	} catch {
		return false;
	}
}

export function browserTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function formatter(zone: string): Intl.DateTimeFormat {
	let fmt = formatters.get(zone);
	if (!fmt) {
		fmt = new Intl.DateTimeFormat('en-CA', {
			timeZone: zone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		});
		formatters.set(zone, fmt);
	}
	return fmt;
}

function parts(date: Date, zone: string): Record<string, string> {
	return Object.fromEntries(
		formatter(zone)
			.formatToParts(date)
			.map((p) => [p.type, p.value])
	);
}

export function toDatetimeValue(date: Date, zone: string): string {
	const p = parts(date, zone);
	return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Resolve an observer's wall-clock time without depending on the viewer's
// browser timezone. Reject DST gaps; choose the earlier instant in a fold.
export function wallTimeToDate(
	value: string,
	zone: string
): { date: Date; ambiguous: boolean } | null {
	if (!isTimeZone(zone) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
	const wall = new Date(`${value}:00Z`);
	if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 16) !== value) return null;
	const offsets = new Set<number>();
	for (const hours of [-24, -6, 0, 6, 24]) {
		const sample = new Date(wall.getTime() + hours * 3600000);
		const p = parts(sample, zone);
		const localAsUtc = Date.parse(
			`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`
		);
		offsets.add(localAsUtc - sample.getTime());
	}
	const candidates = [...offsets]
		.map((offset) => new Date(wall.getTime() - offset))
		.filter((date) => toDatetimeValue(date, zone) === value)
		.sort((a, b) => a.getTime() - b.getTime());
	return candidates.length ? { date: candidates[0], ambiguous: candidates.length > 1 } : null;
}

export function formatObservationTime(date: Date, zone: string, lang: 'en' | 'zh'): string {
	return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
		timeZone: zone,
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
		timeZoneName: 'short'
	}).format(date);
}
