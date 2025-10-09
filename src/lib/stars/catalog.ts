import type { Star, Asterism } from '../../types/Star';

// 备注：坐标为近似 J2000 度数，已足够“今晚可见/不可见”判定。
// 已覆盖：天狼星、织女一、老人星、北河三、北河二、五车二、南门二、北落师门、河鼓二、天津四、心宿二、参宿四、水委一、毕宿五、角宿一、参宿七、南河三、轩辕十四、大角、五帝座一、（大三角/四边形所需的几颗）、昴星团中心。
export const STARS: Star[] = [
  { id: 'Sirius',        cn: '天狼星',   raDeg: 101.287, decDeg: -16.716, mag: -1.46 },
  { id: 'Vega',          cn: '织女一',   raDeg: 279.234, decDeg: 38.783,  mag: 0.03  },
  { id: 'Canopus',       cn: '老人星',   raDeg: 95.987,  decDeg: -52.695, mag: -0.72 },
  { id: 'Castor',        cn: '北河三',   raDeg: 113.649, decDeg: 31.888,  mag: 1.6   },
  { id: 'Pollux',        cn: '北河二',   raDeg: 116.329, decDeg: 28.026,  mag: 1.1   },
  { id: 'Capella',       cn: '五车二',   raDeg: 79.172,  decDeg: 45.998,  mag: 0.08  },
  { id: 'Alpha_Cen',     cn: '南门二',   raDeg: 219.902, decDeg: -60.835, mag: -0.27 }, // Rigil Kentaurus
  { id: 'Fomalhaut',     cn: '北落师门', raDeg: 344.412, decDeg: -29.622, mag: 1.16  },
  { id: 'Altair',        cn: '河鼓二',   raDeg: 297.695, decDeg: 8.868,   mag: 0.77  },
  { id: 'Deneb',         cn: '天津四',   raDeg: 310.358, decDeg: 45.280,  mag: 1.25  },
  { id: 'Antares',       cn: '心宿二',   raDeg: 247.351, decDeg: -26.432, mag: 1.09  },
  { id: 'Betelgeuse',    cn: '参宿四',   raDeg: 88.792,  decDeg: 7.407,   mag: 0.5   },
  { id: 'Alphard',       cn: '水委一',   raDeg: 141.896, decDeg: -8.658,  mag: 2.0   },
  { id: 'Aldebaran',     cn: '毕宿五',   raDeg: 68.980,  decDeg: 16.509,  mag: 0.86  },
  { id: 'Spica',         cn: '角宿一',   raDeg: 201.298, decDeg: -11.161, mag: 1.0   },
  { id: 'Rigel',         cn: '参宿七',   raDeg: 78.634,  decDeg: -8.201,  mag: 0.13  },
  { id: 'Procyon',       cn: '南河三',   raDeg: 114.825, decDeg: 5.225,   mag: 0.40  },
  { id: 'Regulus',       cn: '轩辕十四', raDeg: 152.093, decDeg: 11.967,  mag: 1.35  },
  { id: 'Arcturus',      cn: '大角',     raDeg: 213.915, decDeg: 19.182,  mag: -0.05 },
  { id: 'Polaris',       cn: '五帝座一', raDeg: 37.954,  decDeg: 89.264,  mag: 1.97  },

  // 季节四边形/三角形补充成员
  { id: 'Denebola',      cn: '五帝座增一(狮后座β)', raDeg: 177.264, decDeg: 14.572 },
  { id: 'Alpheratz',     cn: '仙女座α(角宿增一)',   raDeg: 2.096,   decDeg: 29.090 },
  { id: 'Scheat',        cn: '飞马座β(壁宿二)',     raDeg: 345.0,   decDeg: 28.083 },
  { id: 'Markab',        cn: '飞马座α(室宿一)',     raDeg: 346.190, decDeg: 15.205 },
  { id: 'Algenib',       cn: '飞马座γ(室宿四)',     raDeg: 3.308,   decDeg: 15.183 },

  // 昴星团（用中心坐标近似）
  { id: 'Pleiades',      cn: '昴星团',   raDeg: 56.75,   decDeg: 24.12 }
];

// 北斗七星（取常见三颗判断可见性也足够；这里列全名供扩展）
const BIG_DIPPER = ['Dubhe','Merak','Phecda','Megrez','Alioth','Mizar','Alkaid'] as const;
// 暂给三颗近似坐标（足够“是否能看到北斗”判断）
STARS.push(
  { id: 'Dubhe',   cn: '北斗(天枢/Dubhe)',  raDeg: 165.46, decDeg: 61.75 },
  { id: 'Alioth',  cn: '北斗(玉衡/Alioth)', raDeg: 193.51, decDeg: 55.96 },
  { id: 'Alkaid',  cn: '北斗(摇光/Alkaid)', raDeg: 206.89, decDeg: 49.31 }
);

// 季节性星象与星群
export const ASTERISMS: Asterism[] = [
  { id: 'SpringTriangle', cn: '春季大三角', members: ['Arcturus','Spica','Regulus'] },
  { id: 'SummerTriangle', cn: '夏季大三角', members: ['Vega','Altair','Deneb'] },
  { id: 'WinterTriangle', cn: '冬季大三角', members: ['Sirius','Betelgeuse','Procyon'] },
  { id: 'AutumnSquare',   cn: '秋季四边形', members: ['Alpheratz','Scheat','Markab','Algenib'] },
  { id: 'BigDipper',      cn: '北斗七星',   members: ['Dubhe','Alioth','Alkaid'] }, // 用三颗代表
  { id: 'PleiadesGrp',    cn: '昴星团',     members: ['Pleiades'] }
  // 南斗六星、勾陈一(已由 Polaris 覆盖)、十字架二/三、马腹一、火鸟六、土司空 —— 后续可补充更精确成员与坐标
];
