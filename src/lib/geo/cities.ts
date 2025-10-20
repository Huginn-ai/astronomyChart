// 常见大城市（含中英文别名）— 足够做教学/演示；后续可继续补充
export type City = { name: string; aliases?: string[]; lat: number; lon: number; country?: string };

export const CITY_DB: City[] = [
  { name: "Princeton", aliases: ["普林斯顿"], lat: 40.34, lon: -74.65, country: "US" },
  { name: "New York", aliases: ["纽约", "NYC"], lat: 40.71, lon: -74.0, country: "US" },
  { name: "Los Angeles", aliases: ["洛杉矶", "LA"], lat: 34.05, lon: -118.24, country: "US" },
  { name: "San Francisco", aliases: ["旧金山", "SF"], lat: 37.77, lon: -122.42, country: "US" },
  { name: "Chicago", aliases: ["芝加哥"], lat: 41.88, lon: -87.63, country: "US" },
  { name: "Toronto", aliases: ["多伦多"], lat: 43.65, lon: -79.38, country: "CA" },
  { name: "Vancouver", aliases: ["温哥华"], lat: 49.28, lon: -123.12, country: "CA" },
  { name: "Mexico City", aliases: ["墨西哥城"], lat: 19.43, lon: -99.13, country: "MX" },
  { name: "São Paulo", aliases: ["聖保羅","圣保罗","Sao Paulo"], lat: -23.55, lon: -46.63, country: "BR" },
  { name: "London", aliases: ["伦敦"], lat: 51.51, lon: -0.13, country: "UK" },
  { name: "Paris", aliases: ["巴黎"], lat: 48.86, lon: 2.35, country: "FR" },
  { name: "Berlin", aliases: ["柏林"], lat: 52.52, lon: 13.41, country: "DE" },
  { name: "Rome", aliases: ["罗马"], lat: 41.90, lon: 12.50, country: "IT" },
  { name: "Moscow", aliases: ["莫斯科"], lat: 55.76, lon: 37.62, country: "RU" },
  { name: "Istanbul", aliases: ["伊斯坦布尔"], lat: 41.01, lon: 28.98, country: "TR" },
  { name: "Dubai", aliases: ["迪拜"], lat: 25.20, lon: 55.27, country: "AE" },
  { name: "Delhi", aliases: ["德里", "新德里", "New Delhi"], lat: 28.61, lon: 77.21, country: "IN" },
  { name: "Mumbai", aliases: ["孟买", "Bombay"], lat: 19.08, lon: 72.88, country: "IN" },
  { name: "Bengaluru", aliases: ["班加罗尔","Bangalore"], lat: 12.97, lon: 77.59, country: "IN" },
  { name: "Beijing", aliases: ["北京"], lat: 39.90, lon: 116.41, country: "CN" },
  { name: "Shanghai", aliases: ["上海"], lat: 31.23, lon: 121.47, country: "CN" },
  { name: "Shenzhen", aliases: ["深圳"], lat: 22.54, lon: 114.06, country: "CN" },
  { name: "Guangzhou", aliases: ["广州"], lat: 23.13, lon: 113.26, country: "CN" },
  { name: "Hong Kong", aliases: ["香港", "HK"], lat: 22.32, lon: 114.17, country: "CN" },
  { name: "Tokyo", aliases: ["东京"], lat: 35.68, lon: 139.65, country: "JP" },
  { name: "Seoul", aliases: ["首尔","漢城","汉城"], lat: 37.57, lon: 126.98, country: "KR" },
  { name: "Singapore", aliases: ["新加坡"], lat: 1.35, lon: 103.82, country: "SG" },
  { name: "Sydney", aliases: ["悉尼"], lat: -33.87, lon: 151.21, country: "AU" },
  { name: "Melbourne", aliases: ["墨尔本"], lat: -37.81, lon: 144.96, country: "AU" }
];

export function findCity(query: string): City | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  return (
    CITY_DB.find(c => c.name.toLowerCase() === q) ||
    CITY_DB.find(c => c.aliases?.some(a => a.toLowerCase() === q)) ||
    null
  );
}
