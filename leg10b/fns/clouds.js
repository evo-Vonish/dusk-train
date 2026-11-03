/* 第十棒第三版 · 活的天：云
   原来的天是一张画：截图很好看，可是它一动不动。现在的云是一朵一朵现画的：
   · 五层：地平线上的积雨云（夏）、最高处的卷云、高处成片的鳞云（秋）、贴着地平线的层云（春、冬）、半空的积云；
   · 每一层有自己的视差和风：列车开起来，高处的云走得快一点、远处的慢；停下来，风还在把云往车头那边推；
   · 每一朵都在慢慢地胀、缩、变形；季节过去了它就散掉，新一季的云从远处长出来；
   · 光从太阳那边来：黄昏时太阳藏在地平线下，云的下沿被照暖；太阳落下去以后，高处的云还亮一会儿；
     夜里朝着月亮的一侧镶一层冷光；白天云顶是白的，底下发灰；离地平线越近的云越淡、越偏天色（空气远近）。
   · 画法：一朵云是一团重叠的圆（或椭圆），整团顺着光的方向铺一道渐变，再在受光的那几团上点一点亮，外面一圈很淡的晕。
     每朵云画进自己的小画布，光变了一档、或者过了几秒（让它变形）才重画；每帧最多重画几朵，其余照旧贴图。
     揭卡时（RX）直接按高倍率画，不用小画布。
   第四版：黄昏和夜里的天又是原来那张画（会流动，见 skypaint），这些云只在白天（小镇的下午）出来。
   修了一个毛病：原来云的位置是「总时间 × 风」，一阵风来，整层云就跳过去一大截，风停了又往回退，看起来像卡住；
   现在风是一点一点积进 CLD.wt 里的。小画布里的云形不再随时间变（以前每三秒重画一次，会跳一下），只有光变了才重画。 */
const CLOUD_LAYERS = [
  // kind：种类；depth：视差；drift：风（ref/秒，往左）；cell：一格多宽（ref）；alt：在天上的高度（yM 的比例）；dens：春夏秋冬每格出现的机会；maxW：最宽（ref）；high：高云（日落后还亮一会儿）
  { kind: 'tower', depth: 0.006, drift: 0.0006, cell: 1.3, alt: [0.94, 1.0], dens: [0.22, 0.9, 0.08, 0], maxW: 0.6, high: true },
  { kind: 'cirrus', depth: 0.05, drift: 0.004, cell: 0.85, alt: [0.05, 0.28], dens: [0.22, 0.32, 0.55, 0.45], maxW: 0.6, high: true },
  { kind: 'mackerel', depth: 0.055, drift: 0.0025, cell: 1.5, alt: [0.06, 0.3], dens: [0.1, 0.05, 0.9, 0.1], maxW: 1.7, high: true },
  { kind: 'bank', depth: 0.04, drift: 0.0028, cell: 1.1, alt: [0.2, 0.6], dens: [0.5, 0.28, 0.38, 0.75], maxW: 1.25, high: true },
  { kind: 'stratus', depth: 0.014, drift: 0.0018, cell: 0.9, alt: [0.76, 0.93], dens: [0.8, 0.25, 0.3, 0.75], maxW: 1.0, high: false },
  { kind: 'cumulus', depth: 0.032, drift: 0.003, cell: 0.55, alt: [0.42, 0.8], dens: [0.55, 0.75, 0.3, 0.2], maxW: 0.36, high: false }
];
const CLD = { cells: new Map(), ref: 0, W: 0, yM: 0, pruneT: 0, budget: 0, wt: 0 };
function buildClouds() { cloudsDark = []; cloudsLit = []; CLD.cells.clear(); }      // 老的云图不再画，也就不用再烘焙

function cloudCell(li, k, s) {
  const key = li * 100000 + s * 10000 + mod(k, 10000);
  const e = CLD.cells.get(key);
  if (e && e.k === k) return e.list;
  const L = CLOUD_LAYERS[li], rnd = mulberry32(((k * 2654435761) ^ (li * 40503 + s * 9176 + 77)) >>> 0), list = [];
  const dens = Math.min(1, L.dens[s] * (S.portrait ? 1.3 : 1));                    // 竖屏一次看得见的格子少，云稍密一点
  const n = L.kind === 'cumulus' ? (rnd() < dens ? 1 + (rnd() < dens * 0.5 ? 1 : 0) : 0) : (rnd() < dens ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const u = (k + (n > 1 ? (i + rnd() * 0.8) / n : 0.15 + rnd() * 0.7)) * L.cell, alt = lerp(L.alt[0], L.alt[1], rnd());
    const persp = L.kind === 'cumulus' ? lerp(1.15, 0.58, (alt - 0.42) / 0.38) : 1;       // 越高的云离我们越近，越大
    const c = L.kind === 'cumulus' ? makeCumulus(rnd, s, persp, alt) : L.kind === 'tower' ? makeTower(rnd) : L.kind === 'stratus' ? makeStratus(rnd) : L.kind === 'mackerel' ? makeMackerel(rnd) : L.kind === 'bank' ? makeBank(rnd) : makeCirrus(rnd);
    Object.assign(c, { kind: L.kind, u, alt, P: 40 + rnd() * 70, ph: rnd() * TAU, li, s, high: L.high, spr: null, key: '' });
    cloudBox(c);
    list.push(c);
  }
  CLD.cells.set(key, { k, li, list });
  return list;
}
function makeCumulus(rnd, s, persp, alt) {
  const w = (0.08 + rnd() * (s === 1 ? 0.16 : 0.12)) * persp, h = w * (0.3 + rnd() * 0.14) * (alt > 0.68 ? 0.8 : 1), n = 5 + Math.floor(rnd() * 4), puffs = [];
  for (let i = 0; i < n; i++) {
    const fx = (i + 0.5) / n + (rnd() - 0.5) * 0.12;
    const r = h * (0.36 + 0.64 * Math.pow(Math.sin(Math.PI * clamp(fx, 0.03, 0.97)), 0.8)) * (0.72 + rnd() * 0.34);
    puffs.push({ x: (fx - 0.5) * w, y: -r * 0.78, r, ph: rnd() * TAU, sp: 0.12 + rnd() * 0.2, sq: 1 });
  }
  const tops = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < tops; i++) puffs.push({ x: (0.3 + rnd() * 0.4 - 0.5) * w, y: -h * (0.62 + rnd() * 0.3), r: h * (0.3 + rnd() * 0.22), ph: rnd() * TAU, sp: 0.1 + rnd() * 0.16, sq: 1 });
  for (let i = 0; i < 3; i++) puffs.push({ x: ((i + 0.5) / 3 - 0.5) * w * 0.8, y: -h * 0.08, r: w * 0.2, ph: rnd() * TAU, sp: 0.1, sq: 0.34 });   // 平平的底
  return { w, h, puffs };
}
function makeTower(rnd) {
  const w = 0.2 + rnd() * 0.2, h = 0.2 + rnd() * 0.16, puffs = [];
  for (let i = 0; i < 5; i++) { const r = w * (0.12 + rnd() * 0.05); puffs.push({ x: ((i + 0.5) / 5 - 0.5) * w * 0.95, y: -r * 0.7, r, ph: rnd() * TAU, sp: 0.06 + rnd() * 0.08, sq: 1 }); }
  const lean = (rnd() - 0.5) * 0.12;
  for (let j = 1; j <= 6; j++) {
    const f = j / 6, cw = w * (0.62 - 0.3 * f), y = -h * (0.12 + 0.66 * f), n = 2 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) puffs.push({ x: (rnd() - 0.5) * cw * 0.75 + lean * h * f, y, r: cw * (0.3 + rnd() * 0.12), ph: rnd() * TAU, sp: 0.05 + rnd() * 0.08, sq: 1 });
  }
  const anvil = rnd() < 0.65 ? { x: lean * h + w * 0.06, y: -h * 0.86, rx: w * (0.5 + rnd() * 0.22), ry: h * 0.055 } : null;
  if (anvil) for (let i = 0; i < 4; i++) puffs.push({ x: anvil.x + ((i + 0.5) / 4 - 0.5) * anvil.rx * 1.4, y: anvil.y + h * 0.03, r: w * (0.06 + rnd() * 0.04), ph: rnd() * TAU, sp: 0.05 + rnd() * 0.06, sq: 0.7 });
  return { w, h, puffs, anvil, flash: rnd() < 0.7 };
}
function makeStratus(rnd) {
  const L = 0.3 + rnd() * 0.6, T = 0.008 + rnd() * 0.012, n = 9 + Math.floor(rnd() * 6), puffs = [];
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, taper = Math.pow(Math.sin(Math.PI * f), 0.6);
    puffs.push({ x: (f - 0.5) * L + (rnd() - 0.5) * L / n, y: (rnd() - 0.5) * T * 0.6, r: L / n * (0.9 + rnd() * 0.6) * (0.6 + 0.4 * taper), ry: T * (0.55 + rnd() * 0.5) * taper + T * 0.15, ph: rnd() * TAU, sp: 0.05 + rnd() * 0.08 });
  }
  const twin = rnd() < 0.4;
  if (twin) { const dx = (rnd() - 0.5) * L * 0.4, dy = -T * (2.2 + rnd()), k = 0.5 + rnd() * 0.2; for (let i = 0; i < 6; i++) { const f = (i + 0.5) / 6; puffs.push({ x: dx + (f - 0.5) * L * k, y: dy, r: L * k / 6 * 1.2, ry: T * 0.5 * Math.pow(Math.sin(Math.PI * f), 0.6) + T * 0.1, ph: rnd() * TAU, sp: 0.06 }); } }
  return { w: L, h: T * 3, puffs };
}
// 云堤：一长条，上沿一团团鼓起，下沿平；黄昏时下沿被照得最亮
function makeBank(rnd) {
  const L = 0.45 + rnd() * 0.7, T = 0.026 + rnd() * 0.036, n = 12 + Math.floor(rnd() * 8), puffs = [];
  const f1 = 1 + rnd() * 2, p1 = rnd() * TAU, tilt = (rnd() - 0.5) * 0.05;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, taper = Math.pow(Math.sin(Math.PI * f), 0.5), wave = Math.sin(f * f1 * TAU + p1) * T * 0.35 + (f - 0.5) * L * tilt;
    const rx = L / n * (1.3 + rnd() * 0.7) * (0.55 + 0.45 * taper), ry = T * (0.42 + rnd() * 0.4) * (0.4 + 0.6 * taper);
    puffs.push({ x: (f - 0.5) * L, y: wave - ry * 0.3, r: rx, ry, ph: rnd() * TAU, sp: 0.05 + rnd() * 0.08 });
    if (rnd() < 0.5 && taper > 0.45) puffs.push({ x: (f - 0.5) * L + (rnd() - 0.5) * L / n, y: wave - ry * (0.8 + rnd() * 0.5), r: rx * (0.45 + rnd() * 0.3), ry: ry * (0.6 + rnd() * 0.35), ph: rnd() * TAU, sp: 0.05 + rnd() * 0.08 });
  }
  return { w: L, h: T * 2.4, puffs };
}
function makeMackerel(rnd) {
  const FW = 0.7 + rnd() * 0.85, rows = 5 + Math.floor(rnd() * 4), lets = [];
  const waveF = 3 + rnd() * 4, wavePh = rnd() * TAU, tilt = (rnd() - 0.5) * 0.08;
  let y = 0;
  for (let r = 0; r < rows; r++) {
    const s = 0.0118 * (1 - r * 0.07) * (0.85 + rnd() * 0.3), n = Math.round(FW / (s * 1.55));
    for (let i = 0; i < n; i++) {
      const fx = (i + 0.5) / n + (rnd() - 0.5) * 0.6 / n;
      const edge = 1 - Math.pow(Math.abs(fx - 0.5) * 2, 2.4) - Math.pow(Math.abs(r / Math.max(1, rows - 1) - 0.45) * 1.5, 3);
      if (rnd() > edge + 0.2) continue;
      const x = (fx - 0.5) * FW;
      const big = rnd() < 0.18 ? 1.7 : 1;                                   // 有几片连成一长条
      lets.push({ x, y: y + Math.sin(fx * waveF * Math.PI + wavePh + r * 0.6) * s * 0.8 + x * tilt + (rnd() - 0.5) * s * 0.4, rx: s * (0.7 + rnd() * 0.6) * big, ry: s * (0.26 + rnd() * 0.14), rot: (rnd() - 0.5) * 0.35, ph: rnd() * TAU });
    }
    y += s * 1.25;
  }
  return { w: FW, h: y, lets };
}
function makeCirrus(rnd) {
  const n = 3 + Math.floor(rnd() * 4), L = 0.18 + rnd() * 0.28, strands = [];
  for (let i = 0; i < n; i++) { const len = L * (0.6 + rnd() * 0.5); strands.push({ x0: (rnd() - 0.5) * L * 0.3 - len * 0.5, y0: (i - (n - 1) / 2) * 0.011 + (rnd() - 0.5) * 0.01, len, bend: 0.015 + rnd() * 0.04, hook: rnd() < 0.6 ? 0.01 + rnd() * 0.018 : 0, w: 0.002 + rnd() * 0.003, a: 0.45 + rnd() * 0.4 }); }
  return { w: L, h: 0.06, ang: (rnd() - 0.5) * 0.25, strands };
}
// 一朵云在自己坐标里（ref 为单位）占多大：小画布按这个开
function cloudBox(c) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const add = (x, y, rx, ry) => { x0 = Math.min(x0, x - rx); x1 = Math.max(x1, x + rx); y0 = Math.min(y0, y - ry); y1 = Math.max(y1, y + ry); };
  if (c.puffs) for (const q of c.puffs) add(q.x, q.y, q.r * 1.12, (q.ry || q.r * (q.sq || 1)) * 1.12);
  if (c.anvil) add(c.anvil.x, c.anvil.y, c.anvil.rx * 1.1, c.anvil.ry * 1.4);
  if (c.lets) for (const e of c.lets) add(e.x, e.y, e.rx * 1.3, e.ry * 1.6);
  if (c.strands) { const r = c.w * 0.9; add(0, 0, r, r * 0.45); }
  c.box = [x0, y0, x1, y1];
}

/* 这一帧的光：三种时辰的颜色按季节混好，再按黄昏、夜、白天混 */
function cloudLight() {
  const day = S.dayF, night = S.nightF, rain = S.rainI;
  const c3 = (t, i) => seasonCol(P => P.cl[t][i]);
  const dB = c3('dusk', 0), dL = c3('dusk', 1), dR = c3('dusk', 2), nB = c3('night', 0), nL = c3('night', 1), nR = c3('night', 2), yB = c3('day', 0), yL = c3('day', 1), yR = c3('day', 2);
  const horizon = mix(seasonCol(P => P.dusk[5]), seasonCol(P => P.day[2]), day);
  const pal = high => {
    const hold = clamp(1 - night * (high ? 1.15 : 1.9), 0, 1);               // 太阳落下以后，高处的云还亮一会儿
    let b = mix(dB, nB, night), l = mix(nL, dL, hold), r = mix(nR, dR, hold);
    b = mix(b, yB, day); l = mix(l, yL, day); r = mix(r, yR, day);
    if (rain > .01) { const gy = [118, 122, 146]; b = mix(b, gy, .45 * rain); l = mix(l, mix(gy, [206, 208, 220], day), .5 * rain); r = mix(r, [212, 212, 224], .4 * rain); }
    return { b, l, r, m: mix(b, l, .45) };
  };
  const q = v => Math.round(clamp(v, 0, 1) * 24);
  return {
    low: pal(false), high: pal(true), day, night, rain, horizon,
    sun: [duskGlowX(), S.yM * 1.04],
    moon: SKY2.moonA > .15 ? [SKY2.moonX, SKY2.moonY] : null,
    sunDay: SKY2.sunA > .1 ? [SKY2.sunX, SKY2.sunY] : [S.W * .6, -S.yM * .6],
    alpha: (.94 - .12 * night * (1 - day)) * (1 + .1 * rain),
    key: [0, 1, 2, 3].map(i => q(seasonWeight(i))).join('') + '|' + q(day) + q(night) + q(rain)
  };
}
// 光从哪边来（单位向量，指向光）：黄昏是地平线下的太阳，夜里是月亮（没有就是头顶），白天是太阳
function lightDir(L, cx, cy) {
  let vx = 0, vy = 0;
  const wD = (1 - L.day) * (1 - L.night), wN = (1 - L.day) * L.night, wY = L.day;
  const pull = (p, k) => { const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy) || 1; vx += dx / d * k; vy += dy / d * k; };
  if (wD > .001) pull(L.sun, wD);
  if (wN > .001) { if (L.moon) pull(L.moon, wN); else vy -= wN; }
  if (wY > .001) pull(L.sunDay, wY);
  const d = Math.hypot(vx, vy) || 1;
  return [vx / d, vy / d];
}

/* 画一朵云：原点是云的锚点（积云、积雨云是底的中点，层云、鳞云是中线），R 是 1 ref 合多少像素 */
function paintCloud(g, c, P, dir, R, t, haze) {
  const tone = (col, k) => css(mix(col, P.hz, haze), k);
  if (c.kind === 'cirrus') {
    // 卷云：一缕一缕细长的羽毛，头上粗、尾巴细，里面几根更亮的丝
    g.save(); g.rotate(c.ang);
    for (const s of c.strands) {
      const N = 16, pts = [];
      for (let i = 0; i <= N; i++) {
        const f = i / N, a = (1 - f) * (1 - f), b = 2 * f * (1 - f), d = f * f;
        pts.push([(a * s.x0 + b * (s.x0 + s.len * .5) + d * (s.x0 + s.len)) * R, (a * s.y0 + b * (s.y0 - s.bend) + d * (s.y0 + s.hook)) * R]);
      }
      const wk = i => s.w * R * 2.4 * Math.pow(Math.sin(Math.PI * Math.min(1, i / N * 1.08 + .02)), .6) * (1 - .5 * i / N);
      const nrm = i => { const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; };
      g.beginPath();
      for (let i = 0; i <= N; i++) { const n = nrm(i), w = wk(i); i ? g.lineTo(pts[i][0] + n[0] * w, pts[i][1] + n[1] * w) : g.moveTo(pts[i][0] + n[0] * w, pts[i][1] + n[1] * w); }
      for (let i = N; i >= 0; i--) { const n = nrm(i), w = wk(i) * .7; g.lineTo(pts[i][0] - n[0] * w, pts[i][1] - n[1] * w); }
      g.closePath(); g.fillStyle = tone(P.m, .28 * s.a); g.fill();
      g.lineCap = 'round';
      for (const [o, col, ak, lw] of [[-.3, P.l, .38, .45], [.05, P.r, .5, .32], [.35, P.l, .3, .3]]) {
        g.beginPath();
        for (let i = 1; i < N; i++) { const n = nrm(i), w = wk(i) * o; i > 1 ? g.lineTo(pts[i][0] + n[0] * w, pts[i][1] + n[1] * w) : g.moveTo(pts[i][0] + n[0] * w, pts[i][1] + n[1] * w); }
        g.strokeStyle = tone(col, ak * s.a); g.lineWidth = Math.max(.5, s.w * R * lw); g.stroke();
      }
    }
    g.restore(); return;
  }
  if (c.kind === 'mackerel') {
    // 一片片小云：外面一圈淡晕，云身，朝光的那一侧一弯亮
    const lets = c.lets.map(e => { const b = 1 + .06 * Math.sin(t * .35 + e.ph); return [e.x * R, e.y * R, e.rx * R * b, e.ry * R * b, e.rot]; });
    const pass = (k, col, a, ox, oy) => { g.fillStyle = tone(col, a); g.beginPath(); for (const [x, y, rx, ry, rot] of lets) { const X = x + ox * ry, Y = y + oy * ry; g.moveTo(X + rx * k * Math.cos(rot), Y + rx * k * Math.sin(rot)); g.ellipse(X, Y, rx * k, ry * k, rot, 0, TAU); } g.fill(); };
    // 底下先铺一层很淡的纱，把一片片连成一整片
    const [bx0, by0, bx1, by1] = c.box;
    g.fillStyle = tone(P.b, .1 * P.vis); g.beginPath(); g.ellipse((bx0 + bx1) / 2 * R, (by0 + by1) / 2 * R, (bx1 - bx0) / 2 * R * .92, (by1 - by0) / 2 * R * 1.1, 0, 0, TAU); g.fill();
    pass(1.28, P.b, .16 * P.vis, 0, 0); pass(1, P.m, .84 * P.vis, 0, 0); pass(.86, P.l, .62 * P.vis, dir[0] * .36, dir[1] * .36); pass(.5, P.r, .3 * P.vis, dir[0] * .62, dir[1] * .62);
    return;
  }
  // 积云、积雨云、层云：一团圆
  const pu = c.puffs.map(q => { const b = 1 + .045 * Math.sin(t * q.sp + q.ph); return [q.x * R, q.y * R, q.r * R * b, (q.ry ? q.ry * R : q.r * R * (q.sq || 1)) * b]; });
  const body = k => { const p = new Path2D(); for (const [x, y, rx, ry] of pu) { p.moveTo(x + rx * k, y); p.ellipse(x, y, rx * k, ry * k, 0, 0, TAU); } if (c.anvil && k) { const a = c.anvil, b = 1 + .05 * Math.sin(t * .2 + c.ph); p.moveTo((a.x + a.rx * b * k) * R, a.y * R); p.ellipse(a.x * R, a.y * R, a.rx * R * b * k, a.ry * R * k, 0, 0, TAU); } return p; };
  const [x0, y0, x1, y1] = c.box, cx = (x0 + x1) / 2 * R, cy = (y0 + y1) / 2 * R, ext = Math.max(x1 - x0, y1 - y0) * R * .5;
  // 晕
  g.fillStyle = tone(P.b, .2); g.fill(body(1.1));
  // 云身：顺着光铺一道渐变，朝光的一侧亮
  const p = body(1);
  const gr = g.createLinearGradient(cx + dir[0] * ext, cy + dir[1] * ext, cx - dir[0] * ext, cy - dir[1] * ext);
  gr.addColorStop(0, tone(P.r, 1)); gr.addColorStop(.22, tone(P.l, 1)); gr.addColorStop(.55, tone(P.m, 1)); gr.addColorStop(1, tone(P.b, 1));
  g.fillStyle = gr; g.fill(p);
  // 受光的那几团再点一点亮（一团一团的体积感）
  g.save(); g.clip(p);
  for (const [x, y, rx, ry] of pu) {
    const facing = ((x - cx) * dir[0] + (y - cy) * dir[1]) / (ext || 1);
    if (facing < -.15) continue;
    g.fillStyle = tone(P.l, .22 + .25 * clamp(facing, 0, 1));
    g.beginPath(); g.ellipse(x + dir[0] * rx * .3, y + dir[1] * ry * .3, rx * .62, ry * .62, 0, 0, TAU); g.fill();
  }
  if (c.kind === 'tower') {
    // 积雨云：太阳落到海下面以后，只有顶上还被照着；下半截沉进影子里
    const dk = (1 - P.day) * .7, h = c.h * R;
    if (dk > .02) { const gd = g.createLinearGradient(0, -h * .75, 0, 0); gd.addColorStop(0, css(P.b, 0)); gd.addColorStop(1, css(mix(P.b, [20, 22, 60], .25), dk)); g.fillStyle = gd; g.fillRect(x0 * R, -h * .8, (x1 - x0) * R, h * .85); }
  } else if (c.kind === 'cumulus' && P.day > .05) {
    const h = c.h * R, gd = g.createLinearGradient(0, -h * .35, 0, h * .1);           // 白天：底下发灰
    gd.addColorStop(0, css(P.b, 0)); gd.addColorStop(1, css(P.b, .55 * P.day)); g.fillStyle = gd; g.fillRect(x0 * R, -h * .35, (x1 - x0) * R, h * .5);
  }
  g.restore();
}

function drawSkyClouds(g) {
  const { W, yM, ref, t } = S;
  if (CLD.ref !== ref || CLD.W !== W || CLD.yM !== yM) { CLD.cells.clear(); CLD.ref = ref; CLD.W = W; CLD.yM = yM; }
  const clear = smooth((S.dayF - 0.12) / 0.6) * (1 - Math.max(NX.galaxy, NX.meteor * .5) * .85) * (1 - S.stormF * .8) * (1 - NX.fog * .5) * (1 - NX.fire * .75);      // 只在白天；放烟花的时候云让开
  if (clear < .01) return;
  const L = cloudLight(), ws = [0, 1, 2, 3].map(seasonWeight);
  CLD.budget = RX ? 0 : 2;                                                // 每帧最多重画几朵云的小画布
  for (let li = 0; li < CLOUD_LAYERS.length; li++) {
    const C = CLOUD_LAYERS[li], off = S.camera * C.depth - CLD.wt * C.drift;      // 列车往左开：画面往右走；风往左吹（风积分在 CLD.wt 里）
    const uMin = (-W / 2 - PAD) / ref - C.maxW - off, uMax = (W / 2 + PAD) / ref + C.maxW - off;
    const k0 = Math.floor(uMin / C.cell), k1 = Math.floor(uMax / C.cell);
    for (let s = 0; s < 4; s++) {
      if (ws[s] < .01) continue;
      for (let k = k0; k <= k1; k++) for (const c of cloudCell(li, k, s)) {
        const x = W / 2 + (c.u + off) * ref;
        if (x + c.box[2] * ref < -PAD * 2 || x + c.box[0] * ref > W + PAD * 2) continue;
        drawOneCloud(g, c, x, yM * c.alt, ws[s], clear, L);
      }
    }
  }
  g.globalAlpha = 1;
  if ((CLD.pruneT -= 1) <= 0) { CLD.pruneT = 120; if (CLD.cells.size > 260) pruneCloudCells(); }
}
function pruneCloudCells() {
  const { W, ref, t } = S;
  for (const [key, e] of CLD.cells) {
    const C = CLOUD_LAYERS[e.li], off = S.camera * C.depth - CLD.wt * C.drift, mid = (-off) / C.cell;
    if (Math.abs(e.k - mid) > (W / ref + C.maxW * 2) / C.cell + 4) CLD.cells.delete(key);
  }
}
function drawOneCloud(g, c, x, y, w, clear, L) {
  const { ref, t, yM } = S;
  const life = 0.92 + 0.08 * Math.sin(t * TAU / c.P + c.ph);               // 一朵云自己慢慢地胀、缩
  const sz = (0.45 + 0.55 * w) * life;
  const alpha = smooth(w * 1.4) * clear * L.alpha * (c.kind === 'cirrus' ? 1 - .5 * L.night * (1 - L.day) : 1);
  if (alpha < .01) return;
  const P0 = c.high ? L.high : L.low;
  const haze = clamp((c.alt - .55) / .45, 0, 1) * (c.kind === 'tower' ? .14 : .45) * (1 - L.night * .5);     // 离地平线越近越淡
  const [bx0, by0, bx1, by1] = c.box;
  let dir = lightDir(L, x + (bx0 + bx1) / 2 * ref * sz, y + (by0 + by1) / 2 * ref * sz);
  if (c.kind === 'tower' && L.night < .8) { const ux = dir[0] * .55, uy = lerp(-1, dir[1], L.night), d = Math.hypot(ux, uy) || 1; dir = [ux / d, uy / d]; }   // 积雨云：最后的光落在顶上
  const P = { b: P0.b, l: P0.l, r: P0.r, m: P0.m, hz: L.horizon, day: L.day, vis: c.kind === 'mackerel' ? 1 - .45 * L.night * (1 - L.day) : 1 };     // 夜里的鳞云只是淡淡的一片
  if (RX) { g.save(); g.globalAlpha = alpha; g.translate(x, y); paintCloud(g, c, P, dir, ref * sz, c.ph * 10, haze); g.restore(); }
  else {
    // 小画布：光的档位、方向的档位、或者过了几秒（让它慢慢变形）才重画
    const sc = Math.min(S.dpr, 1.5), ang = Math.round(Math.atan2(dir[1], dir[0]) / TAU * 64);
    const key = L.key + '|' + ang + '|' + Math.round(haze * 20) + '|' + ref + '|' + sc;
    if (!c.spr || (c.key !== key && CLD.budget > 0)) {
      if (c.spr) CLD.budget--;
      const pw = Math.ceil((bx1 - bx0) * ref * sc) + 4, ph = Math.ceil((by1 - by0) * ref * sc) + 4;
      if (!c.spr || c.spr.width !== pw || c.spr.height !== ph) { c.spr = document.createElement('canvas'); c.spr.width = pw; c.spr.height = ph; }
      const cg = c.spr.getContext('2d');
      cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, pw, ph);
      cg.setTransform(sc, 0, 0, sc, (2 / sc - bx0 * ref) * sc, (2 / sc - by0 * ref) * sc);
      paintCloud(cg, c, P, dir, ref, c.ph * 10, haze);                      // 云形固定（不随时间变），只有光变了才重画
      c.key = key;
    }
    const s2 = sz / sc;
    g.globalAlpha = alpha;
    g.drawImage(c.spr, x + (bx0 * ref - 2 / sc) * sz, y + (by0 * ref - 2 / sc) * sz, c.spr.width * s2, c.spr.height * s2);
    g.globalAlpha = 1;
  }
  if (c.kind === 'tower') {
    // 夏夜：远处的积雨云里有无声的闪电
    if (c.flash && L.night > .45 && seasonWeight(1) > .3) {
      const f = Math.pow(Math.max(0, Math.sin(t * .73 + c.ph * 3)), 40) * Math.pow(Math.max(0, Math.sin(t * 2.9 + c.ph)), 3);
      if (f > .02) glow(g, glowSprCyan, x + Math.sin(c.ph) * c.w * ref * .2 * sz, y - c.h * ref * sz * (.45 + .2 * Math.cos(c.ph)), c.w * ref * sz, c.h * ref * sz * .8, .5 * f * L.night * alpha);
    }
    if (alpha > .45 && w > .5 && NX.fire < .2) hitAt(g, 'cumulonimbus', x + bx0 * ref * sz, y + by0 * ref * sz, (bx1 - bx0) * ref * sz, -by0 * ref * sz);
  } else if (c.kind === 'mackerel' && alpha > .45 && w > .5 && L.night < .6 && NX.fire < .2) hitAt(g, 'mackerel', x + bx0 * ref * sz, y + by0 * ref * sz, (bx1 - bx0) * ref * sz, (by1 - by0) * ref * sz);
}

/* 黄昏的光束：第四版不要了（原来那张画里本来就有光） */
function drawDuskRays() {}
