import type { Star, Asterism } from '../../types/Stars';

// 备注：坐标为近似 J2000 度数，已足够“今晚可见/不可见”判定。
export const STARS: Star[] = [
	{ id: 'Sirius', cn: '大犬座α（天狼星）', raDeg: 101.287, decDeg: -16.716, mag: -1.46 },
	{ id: 'Vega', cn: '天琴座α（织女一）', raDeg: 279.234, decDeg: 38.783, mag: 0.03 },
	{ id: 'Canopus', cn: '船底座α（老人星）', raDeg: 95.987, decDeg: -52.695, mag: -0.72 },
	{ id: 'Castor', cn: '双子座α（北河二）', raDeg: 113.649, decDeg: 31.888, mag: 1.6 },
	{ id: 'Pollux', cn: '双子座β（北河三）', raDeg: 116.329, decDeg: 28.026, mag: 1.1 },
	{ id: 'Capella', cn: '御夫座α（五车二）', raDeg: 79.172, decDeg: 45.998, mag: 0.08 },
	{ id: 'Alpha_Cen', cn: '半人马座α（南门二）', raDeg: 219.902, decDeg: -60.835, mag: -0.27 }, // Rigil Kentaurus
	{ id: 'Fomalhaut', cn: '南鱼座α（北落师门）', raDeg: 344.412, decDeg: -29.622, mag: 1.16 },
	{ id: 'Altair', cn: '天鹰座α（河鼓二）', raDeg: 297.695, decDeg: 8.868, mag: 0.77 },
	{ id: 'Deneb', cn: '天鹅座α（天津四）', raDeg: 310.358, decDeg: 45.28, mag: 1.25 },
	{ id: 'Antares', cn: '天蝎座α（心宿二）', raDeg: 247.351, decDeg: -26.432, mag: 1.09 },
	{ id: 'Betelgeuse', cn: '猎户座α（参宿四）', raDeg: 88.792, decDeg: 7.407, mag: 0.5 },
	{ id: 'Alphard', cn: '长蛇座α（星宿一）', raDeg: 141.896, decDeg: -8.658, mag: 2.0 },
	{ id: 'Aldebaran', cn: '金牛座α（毕宿五）', raDeg: 68.98, decDeg: 16.509, mag: 0.86 },
	{ id: 'Spica', cn: '室女座α（角宿一）', raDeg: 201.298, decDeg: -11.161, mag: 1.0 },
	{ id: 'Rigel', cn: '猎户座β（参宿七）', raDeg: 78.634, decDeg: -8.201, mag: 0.13 },
	{ id: 'Procyon', cn: '小犬座α（南河三）', raDeg: 114.825, decDeg: 5.225, mag: 0.4 },
	{ id: 'Regulus', cn: '狮子座α（轩辕十四）', raDeg: 152.093, decDeg: 11.967, mag: 1.35 },
	{ id: 'Arcturus', cn: '牧夫座α（大角）', raDeg: 213.915, decDeg: 19.182, mag: -0.05 },
	{ id: 'Polaris', cn: '小熊座α（勾陈一）', raDeg: 37.954, decDeg: 89.264, mag: 1.97 },

	// 季节四边形/三角形补充成员
	{ id: 'Denebola', cn: '狮子座β（五帝座一）', raDeg: 177.264, decDeg: 14.572, mag: 2.14 },
	{ id: 'Alpheratz', cn: '仙女座α（壁宿二）', raDeg: 2.096, decDeg: 29.09, mag: 2.06 },
	{ id: 'Scheat', cn: '飞马座β（室宿二）', raDeg: 345.944, decDeg: 28.083, mag: 2.44 }, // 变星，取典型视觉星等
	{ id: 'Markab', cn: '飞马座α（室宿一）', raDeg: 346.19, decDeg: 15.205, mag: 2.49 },
	{ id: 'Algenib', cn: '飞马座γ（壁宿一）', raDeg: 3.308, decDeg: 15.183, mag: 2.83 },

	// 昴星团（星团对象）
	{
		id: 'Pleiades',
		cn: '金牛座M45（昴星团）',
		raDeg: 56.75,
		decDeg: 24.12,
		mag: 1.6,
		kind: 'cluster'
	}
];

// All seven Big Dipper stars; coordinates are approximate J2000 positions.
STARS.push(
	{ id: 'Dubhe', cn: '大熊座α（天枢）', raDeg: 165.46, decDeg: 61.75, mag: 1.79 },
	{ id: 'Merak', cn: '大熊座β（天璇）', raDeg: 165.932, decDeg: 56.382, mag: 2.37 },
	{ id: 'Phecda', cn: '大熊座γ（天玑）', raDeg: 178.458, decDeg: 53.695, mag: 2.44 },
	{ id: 'Megrez', cn: '大熊座δ（天权）', raDeg: 183.857, decDeg: 57.033, mag: 3.31 },
	{ id: 'Mizar', cn: '大熊座ζ（开阳）', raDeg: 200.981, decDeg: 54.925, mag: 2.23 },
	{ id: 'Alioth', cn: '大熊座ε（玉衡）', raDeg: 193.51, decDeg: 55.96, mag: 1.76 },
	{ id: 'Alkaid', cn: '大熊座η（摇光）', raDeg: 206.89, decDeg: 49.31, mag: 1.86 }
);

// 季节性星象与星群
export const ASTERISMS: Asterism[] = [
	{ id: 'SpringTriangle', cn: '春季大三角', members: ['Arcturus', 'Spica', 'Regulus'] },
	{ id: 'SummerTriangle', cn: '夏季大三角', members: ['Vega', 'Altair', 'Deneb'] },
	{ id: 'WinterTriangle', cn: '冬季大三角', members: ['Sirius', 'Betelgeuse', 'Procyon'] },
	{ id: 'AutumnSquare', cn: '秋季四边形', members: ['Alpheratz', 'Scheat', 'Markab', 'Algenib'] },
	{
		id: 'BigDipper',
		cn: '北斗七星',
		members: ['Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth', 'Mizar', 'Alkaid'],
		edges: [
			['Dubhe', 'Merak'],
			['Merak', 'Phecda'],
			['Phecda', 'Megrez'],
			['Megrez', 'Dubhe'],
			['Megrez', 'Alioth'],
			['Alioth', 'Mizar'],
			['Mizar', 'Alkaid']
		]
	},
	{ id: 'PleiadesGrp', cn: '昴星团', members: ['Pleiades'] }
	// 南斗六星、勾陈一(已由 Polaris 覆盖)、十字架二/三、马腹一、火鸟六、土司空 —— 后续可补充更精确成员与坐标
];
