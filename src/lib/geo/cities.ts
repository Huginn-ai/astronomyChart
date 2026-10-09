// 常见大城市（含中英文别名）— 足够做教学/演示；后续可继续补充
export type City = {
	name: string;
	aliases?: string[];
	lat: number;
	lon: number;
	country?: string;
	timeZone: string;
};

export const CITY_DB: City[] = [
	{
		name: 'Princeton',
		aliases: ['普林斯顿'],
		lat: 40.34,
		lon: -74.65,
		country: 'US',
		timeZone: 'America/New_York'
	},
	{
		name: 'New York',
		aliases: ['纽约', 'NYC'],
		lat: 40.71,
		lon: -74.0,
		country: 'US',
		timeZone: 'America/New_York'
	},
	{
		name: 'Los Angeles',
		aliases: ['洛杉矶', 'LA'],
		lat: 34.05,
		lon: -118.24,
		country: 'US',
		timeZone: 'America/Los_Angeles'
	},
	{
		name: 'San Francisco',
		aliases: ['旧金山', 'SF'],
		lat: 37.77,
		lon: -122.42,
		country: 'US',
		timeZone: 'America/Los_Angeles'
	},
	{
		name: 'Chicago',
		aliases: ['芝加哥'],
		lat: 41.88,
		lon: -87.63,
		country: 'US',
		timeZone: 'America/Chicago'
	},
	{
		name: 'Toronto',
		aliases: ['多伦多'],
		lat: 43.65,
		lon: -79.38,
		country: 'CA',
		timeZone: 'America/Toronto'
	},
	{
		name: 'Vancouver',
		aliases: ['温哥华'],
		lat: 49.28,
		lon: -123.12,
		country: 'CA',
		timeZone: 'America/Vancouver'
	},
	{
		name: 'Mexico City',
		aliases: ['墨西哥城'],
		lat: 19.43,
		lon: -99.13,
		country: 'MX',
		timeZone: 'America/Mexico_City'
	},
	{
		name: 'São Paulo',
		aliases: ['聖保羅', '圣保罗', 'Sao Paulo'],
		lat: -23.55,
		lon: -46.63,
		country: 'BR',
		timeZone: 'America/Sao_Paulo'
	},
	{
		name: 'London',
		aliases: ['伦敦'],
		lat: 51.51,
		lon: -0.13,
		country: 'UK',
		timeZone: 'Europe/London'
	},
	{
		name: 'Paris',
		aliases: ['巴黎'],
		lat: 48.86,
		lon: 2.35,
		country: 'FR',
		timeZone: 'Europe/Paris'
	},
	{
		name: 'Berlin',
		aliases: ['柏林'],
		lat: 52.52,
		lon: 13.41,
		country: 'DE',
		timeZone: 'Europe/Berlin'
	},
	{ name: 'Rome', aliases: ['罗马'], lat: 41.9, lon: 12.5, country: 'IT', timeZone: 'Europe/Rome' },
	{
		name: 'Moscow',
		aliases: ['莫斯科'],
		lat: 55.76,
		lon: 37.62,
		country: 'RU',
		timeZone: 'Europe/Moscow'
	},
	{
		name: 'Istanbul',
		aliases: ['伊斯坦布尔'],
		lat: 41.01,
		lon: 28.98,
		country: 'TR',
		timeZone: 'Europe/Istanbul'
	},
	{
		name: 'Dubai',
		aliases: ['迪拜'],
		lat: 25.2,
		lon: 55.27,
		country: 'AE',
		timeZone: 'Asia/Dubai'
	},
	{
		name: 'Delhi',
		aliases: ['德里', '新德里', 'New Delhi'],
		lat: 28.61,
		lon: 77.21,
		country: 'IN',
		timeZone: 'Asia/Kolkata'
	},
	{
		name: 'Mumbai',
		aliases: ['孟买', 'Bombay'],
		lat: 19.08,
		lon: 72.88,
		country: 'IN',
		timeZone: 'Asia/Kolkata'
	},
	{
		name: 'Bengaluru',
		aliases: ['班加罗尔', 'Bangalore'],
		lat: 12.97,
		lon: 77.59,
		country: 'IN',
		timeZone: 'Asia/Kolkata'
	},
	{
		name: 'Beijing',
		aliases: ['北京'],
		lat: 39.9,
		lon: 116.41,
		country: 'CN',
		timeZone: 'Asia/Shanghai'
	},
	{
		name: 'Shanghai',
		aliases: ['上海'],
		lat: 31.23,
		lon: 121.47,
		country: 'CN',
		timeZone: 'Asia/Shanghai'
	},
	{
		name: 'Shenzhen',
		aliases: ['深圳'],
		lat: 22.54,
		lon: 114.06,
		country: 'CN',
		timeZone: 'Asia/Shanghai'
	},
	{
		name: 'Guangzhou',
		aliases: ['广州'],
		lat: 23.13,
		lon: 113.26,
		country: 'CN',
		timeZone: 'Asia/Shanghai'
	},
	{
		name: 'Hong Kong',
		aliases: ['香港', 'HK'],
		lat: 22.32,
		lon: 114.17,
		country: 'CN',
		timeZone: 'Asia/Hong_Kong'
	},
	{
		name: 'Tokyo',
		aliases: ['东京'],
		lat: 35.68,
		lon: 139.65,
		country: 'JP',
		timeZone: 'Asia/Tokyo'
	},
	{
		name: 'Seoul',
		aliases: ['首尔', '漢城', '汉城'],
		lat: 37.57,
		lon: 126.98,
		country: 'KR',
		timeZone: 'Asia/Seoul'
	},
	{
		name: 'Singapore',
		aliases: ['新加坡'],
		lat: 1.35,
		lon: 103.82,
		country: 'SG',
		timeZone: 'Asia/Singapore'
	},
	{
		name: 'Sydney',
		aliases: ['悉尼'],
		lat: -33.87,
		lon: 151.21,
		country: 'AU',
		timeZone: 'Australia/Sydney'
	},
	{
		name: 'Melbourne',
		aliases: ['墨尔本'],
		lat: -37.81,
		lon: 144.96,
		country: 'AU',
		timeZone: 'Australia/Melbourne'
	}
];

export const cityLabel = (city: City, lang: 'en' | 'zh') =>
	lang === 'zh' ? city.aliases?.[0] || city.name : city.name;
const normalize = (text: string) =>
	text
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ');

export function findCity(query: string): City | null {
	if (!query) return null;
	const q = normalize(query);
	return (
		CITY_DB.find((c) => normalize(c.name) === q) ||
		CITY_DB.find((c) => c.aliases?.some((a) => normalize(a) === q)) ||
		null
	);
}
