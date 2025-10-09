// 简化天文工具：J2000坐标 → 当地地平坐标（近似，夜观足够）
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function toJulianDate(date: Date): number {
  // Meeus 简式
  const time = date.getTime();                    // ms since 1970-01-01 UTC
  return time / 86400000 + 2440587.5;            // 转 JD
}

export function gstInDegrees(date: Date): number {
  // 粗略格林尼治平恒星时 (Meeus 11.4 近似)
  const jd = toJulianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  let gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
          + 0.000387933 * T*T - (T*T*T) / 38710000.0;
  gst = ((gst % 360) + 360) % 360;
  return gst;
}

export function lstInDegrees(date: Date, lonDeg: number): number {
  // 地方恒星时 = GST + 经度
  let lst = gstInDegrees(date) + lonDeg;
  lst = ((lst % 360) + 360) % 360;
  return lst;
}

export function raDecToAltAz(
  date: Date,
  latDeg: number,
  lonDeg: number,
  raDeg: number,
  decDeg: number
) {
  const lst = lstInDegrees(date, lonDeg);
  let H = lst - raDeg;                 // 时角(度)
  H = ((H % 360) + 360) % 360;
  const Hrad = H * DEG2RAD;
  const lat = latDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(Hrad);
  const alt = Math.asin(sinAlt);

  const y = -Math.sin(Hrad) * Math.cos(dec);
  const x = Math.sin(dec) - Math.sin(alt) * Math.sin(lat);
  const az = Math.atan2(y, x / Math.cos(lat));

  let azDeg = az * RAD2DEG;
  azDeg = ((azDeg % 360) + 360) % 360;

  return { altDeg: alt * RAD2DEG, azDeg };
}

export function isVisible(altDeg: number, minAltDeg = 0): boolean {
  return altDeg > minAltDeg;
}
