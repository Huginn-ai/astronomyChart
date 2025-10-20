<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export type VisibleStar = {
    id: string;        // 英文名
    cn?: string;       // 中文名（可选）
    alt: number;       // 度
    az: number;        // 度，0=北，顺时针
    mag?: number;      // 星等（可选）
  };
  export type Asterism = { id: string; members: string[] };

  export let stars: VisibleStar[] = [];
  export let asterisms: Asterism[] = [];
  export let minAlt = 0;
  export let showGrid = true;
  export let locale: 'en' | 'zh' = 'en';

  // —— 标签参数 ——
  export let showLabels = true;
  export let labelMagLimit = 1.6;     // 显示到 ~一等星（调大显示更多）
  export let labelFontPx = 12;
  export let labelHalo = true;

  // —— 旋转参数 ——
  export let rotationDeg = 0;         // 可外部传入 / 绑定
  export let interactiveRotate = true;
  export let wheelRotate = true;

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let ro: ResizeObserver;
  let dpr = 1;

  // 拖拽状态
  let dragging = false;
  let startAngle = 0;     // 指针相对中心的起始角（弧度）
  let startRotation = 0;  // 拖拽开始时的角度（度）

  const PAD = 16;         // 与 draw() 内保持一致

  const normDeg = (a: number) => {
    let d = a % 360;
    if (d < 0) d += 360;
    return d;
  };

  function magToPx(m?: number) {
    if (m == null) return 1.5;
    const px = 3.2 - 0.55 * m;
    return Math.max(0.8, Math.min(px, 4.8));
  }

  // 东在左：x = cx - r*sin(az)，y = cy - r*cos(az)
  // 这里把 rotationDeg 加进 az，实现“圆内全部一起转”，标签仍保持水平
  function azAltToXY(azDeg: number, altDeg: number, cx: number, cy: number, R: number) {
    const θ = ((azDeg + rotationDeg) * Math.PI) / 180;
    const r = ((90 - altDeg) / 90) * R;
    return [cx - r * Math.sin(θ), cy - r * Math.cos(θ)];
  }

  function getLabel(s: VisibleStar) {
    return locale === 'zh' && s.cn ? s.cn : s.id;
  }

  // 简易矩形碰撞
  type Box = { x1: number; y1: number; x2: number; y2: number };
  const overlap = (a: Box, b: Box) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);

  function draw() {
    if (!canvas || !container) return;
    const cssSize = container.clientWidth || 512;
    const w = Math.floor(cssSize * dpr);
    const h = w;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = w; canvas.height = h;
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';

    const vars = getComputedStyle(document.documentElement);
    const bg = vars.getPropertyValue('--bg').trim() || '#0b0f16';
    const ring = vars.getPropertyValue('--border').trim() || '#9aa4b0';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w / dpr, h / dpr);

    const cx = (w / dpr) / 2;
    const cy = (h / dpr) / 2;
    const R = Math.min(cx, cy) - PAD;

    // 背景圆
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();

    // 外圈
    ctx.lineWidth = 3; ctx.strokeStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // 圆内裁剪
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.clip();

    // 网格（方位辐射线随 rotationDeg 旋转）
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;

      // 高度圈
      for (const alt of [0, 30, 60]) {
        const r = ((90 - alt) / 90) * R;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }
      // 方位射线
      for (let az = 0; az < 360; az += 30) {
        const [x1, y1] = azAltToXY(az, 0, cx, cy, R);
        const [x2, y2] = azAltToXY(az, 89.9, cx, cy, R);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
    }

    // 连线
    if (asterisms?.length) {
      const map = new Map(stars.map((s) => [s.id, s]));
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.4;
      for (const ast of asterisms) {
        const pts = ast.members.map((id) => map.get(id)).filter(Boolean) as VisibleStar[];
        if (pts.length >= 2 && pts.every((p) => p.alt >= minAlt)) {
          ctx.beginPath();
          pts.forEach((s, i) => {
            const [x, y] = azAltToXY(s.az, s.alt, cx, cy, R);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
      }
    }

    // 星点
    ctx.fillStyle = '#fff';
    for (const s of stars) {
      if (s.alt < minAlt) continue;
      const [x, y] = azAltToXY(s.az, s.alt, cx, cy, R);
      const r = magToPx(s.mag);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // 标签（保持水平不随旋转倾斜）
    if (showLabels) {
      ctx.font = `${labelFontPx}px system-ui, ui-sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';

      const placed: Box[] = [];
      const padText = 6;
      const lineH = labelFontPx * 1.2;

      const labelCandidates = stars
        .filter((s) => s.alt >= minAlt)
        .filter((s) => typeof s.mag !== 'number' || s.mag <= labelMagLimit)
        .sort((a, b) => {
          const am = (typeof a.mag === 'number') ? a.mag : 9;
          const bm = (typeof b.mag === 'number') ? b.mag : 9;
          return am - bm; // 亮的先放
        });

      for (const s of labelCandidates) {
        const text = getLabel(s);
        const [x, y] = azAltToXY(s.az, s.alt, cx, cy, R);
        const wText = ctx.measureText(text).width;
        const hText = lineH;

        const outwardX = Math.sign(x - cx) || 1;
        const outwardY = Math.sign(y - cy) || 1;

        const anchors: Array<{ tx: number; ty: number; align: CanvasTextAlign; box: Box }> = [];

        // 径向外侧优先
        {
          const tx = x + outwardX * padText;
          const ty = y + outwardY * padText;
          const align: CanvasTextAlign = outwardX >= 0 ? 'left' : 'right';
          const left = align === 'left' ? tx : tx - wText;
          anchors.push({ tx, ty, align, box: { x1: left, y1: ty - hText / 2, x2: left + wText, y2: ty + hText / 2 }});
        }
        // 其它兜底
        const candidates = [
          { ax:  1, ay: -1, align: 'left'  as const },
          { ax: -1, ay:  1, align: 'right' as const },
          { ax: -1, ay: -1, align: 'right' as const },
        ];
        for (const c of candidates) {
          const tx = x + c.ax * padText;
          const ty = y + c.ay * padText;
          const left = c.align === 'left' ? tx : tx - wText;
          anchors.push({ tx, ty, align: c.align, box: { x1: left, y1: ty - hText / 2, x2: left + wText, y2: ty + hText / 2 }});
        }

        let placedAnchor = anchors.find(a => placed.every(b => !overlap(a.box, b)));
        if (!placedAnchor) continue;

        placed.push(placedAnchor.box);
        ctx.textAlign = placedAnchor.align;

        if (labelHalo) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.strokeText(text, placedAnchor.tx, placedAnchor.ty);
        }
        ctx.fillText(text, placedAnchor.tx, placedAnchor.ty);
      }
    }

    // 退出裁剪
    ctx.restore();

    // —— 外侧方位文字（随 rotationDeg 旋转；文字保持水平） ——

  const labels = locale === 'zh'
    ? [{txt:'北', az:0},{txt:'东', az:90},{txt:'南', az:180},{txt:'西', az:270}]
    : [{txt:'North', az:0},{txt:'East', az:90},{txt:'South', az:180},{txt:'West', az:270}];

  const margin = 14; // 圆外偏移，按需要调
  ctx.fillStyle = '#fff';
  ctx.font = '14px system-ui, ui-sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const { txt, az } of labels) {
    const theta = (az + rotationDeg) * Math.PI / 180; // 跟随旋转
    const rr = R + margin;
    const x = cx - rr * Math.sin(theta); // 东在左：x = cx - r*sin(az)
    const y = cy - rr * Math.cos(theta); // y = cy - r*cos(az)
    ctx.fillText(txt, x, y);
  }
}


  // 交互：拖拽旋转
  function angleFromEvent(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    return Math.atan2(dy, dx); // 相对屏幕 x 轴
  }

  function withinDisk(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const Rcss = Math.min(rect.width, rect.height) / 2 - PAD;
    return Math.hypot(dx, dy) <= Rcss + 6;
  }

  function onPointerDown(e: PointerEvent) {
    if (!interactiveRotate) return;
    if (!withinDisk(e)) return;
    dragging = true;
    startAngle = angleFromEvent(e);
    startRotation = rotationDeg;
    canvas.setPointerCapture(e.pointerId);
    (canvas.style as any).cursor = 'grabbing';
    e.preventDefault();
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const a = angleFromEvent(e);
    const deltaDeg = (a - startAngle) * (180 / Math.PI);
    rotationDeg = normDeg(startRotation + deltaDeg);
  }
  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    (canvas.style as any).cursor = 'grab';
  }

  function onWheel(e: WheelEvent) {
    if (!wheelRotate) return;
    // 正负方向按你的直觉调整
    rotationDeg = normDeg(rotationDeg + e.deltaY * 0.05);
    e.preventDefault();
  }

  onMount(() => {
    dpr = window.devicePixelRatio || 1;
    ro = new ResizeObserver(() => draw());
    ro.observe(container);
    (canvas.style as any).cursor = interactiveRotate ? 'grab' : 'default';
    draw();
  });

  $: stars, asterisms, showGrid, locale, minAlt, showLabels, labelMagLimit, labelFontPx, labelHalo, rotationDeg, draw();

  onDestroy(() => ro?.disconnect());
</script>

<div bind:this={container} class="chart-wrap">
  <canvas
    bind:this={canvas}
    aria-label="sky chart"
    on:pointerdown={onPointerDown}
    on:pointermove={onPointerMove}
    on:pointerup={onPointerUp}
    on:pointercancel={onPointerUp}
    on:wheel={onWheel}
  ></canvas>
</div>

<style>
  .chart-wrap { width: 100%; max-width: 640px; aspect-ratio: 1 / 1; }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>
