// 常见大城市（含中英文别名）— 足够做教学/演示；后续可继续补充
export type City = { name: string; aliases?: string[]; lat: number; lon: number; country?: string };

export const CITY_DB: City[] = [
  { name: "Princeton", aliases: ["普林斯顿"], lat: 40.343, lon: -74.651, country: "US" },
  { name: "New York", aliases: ["纽约", "NYC"], lat: 40.7128, lon: -74.006, country: "US" },
  { name: "Los Angeles", aliases: ["洛杉矶", "LA"], lat: 34.0522, lon: -118.2437, country: "US" },
  { name: "San Francisco", aliases: ["旧金山", "SF"], lat: 37.7749, lon: -122.4194, country: "US" },
  { name: "Chicago", aliases: ["芝加哥"], lat: 41.8781, lon: -87.6298, country: "US" },
  { name: "Toronto", aliases: ["多伦多"], lat: 43.6532, lon: -79.3832, country: "CA" },
  { name: "Vancouver", aliases: ["温哥华"], lat: 49.2827, lon: -123.1207, country: "CA" },
  { name: "Mexico City", aliases: ["墨西哥城"], lat: 19.4326, lon: -99.1332, country: "MX" },
  { name: "São Paulo", aliases: ["聖保羅","圣保罗","Sao Paulo"], lat: -23.5505, lon: -46.6333, country: "BR" },
  { name: "London", aliases: ["伦敦"], lat: 51.5074, lon: -0.1278, country: "UK" },
  { name: "Paris", aliases: ["巴黎"], lat: 48.8566, lon: 2.3522, country: "FR" },
  { name: "Berlin", aliases: ["柏林"], lat: 52.52, lon: 13.405, country: "DE" },
  { name: "Rome", aliases: ["罗马"], lat: 41.9028, lon: 12.4964, country: "IT" },
  { name: "Moscow", aliases: ["莫斯科"], lat: 55.7558, lon: 37.6173, country: "RU" },
  { name: "Istanbul", aliases: ["伊斯坦布尔"], lat: 41.0082, lon: 28.9784, country: "TR" },
  { name: "Dubai", aliases: ["迪拜"], lat: 25.2048, lon: 55.2708, country: "AE" },
  { name: "Delhi", aliases: ["德里", "新德里", "New Delhi"], lat: 28.6139, lon: 77.2090, country: "IN" },
  { name: "Mumbai", aliases: ["孟买", "Bombay"], lat: 19.0760, lon: 72.8777, country: "IN" },
  { name: "Bengaluru", aliases: ["班加罗尔","Bangalore"], lat: 12.9716, lon: 77.5946, country: "IN" },
  { name: "Beijing", aliases: ["北京"], lat: 39.9042, lon: 116.4074, country: "CN" },
  { name: "Shanghai", aliases: ["上海"], lat: 31.2304, lon: 121.4737, country: "CN" },
  { name: "Shenzhen", aliases: ["深圳"], lat: 22.5431, lon: 114.0579, country: "CN" },
  { name: "Guangzhou", aliases: ["广州"], lat: 23.1291, lon: 113.2644, country: "CN" },
  { name: "Hong Kong", aliases: ["香港", "HK"], lat: 22.3193, lon: 114.1694, country: "CN" },
  { name: "Tokyo", aliases: ["东京"], lat: 35.6762, lon: 139.6503, country: "JP" },
  { name: "Seoul", aliases: ["首尔","漢城","汉城"], lat: 37.5665, lon: 126.9780, country: "KR" },
  { name: "Singapore", aliases: ["新加坡"], lat: 1.3521, lon: 103.8198, country: "SG" },
  { name: "Sydney", aliases: ["悉尼"], lat: -33.8688, lon: 151.2093, country: "AU" },
  { name: "Melbourne", aliases: ["墨尔本"], lat: -37.8136, lon: 144.9631, country: "AU" }
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
