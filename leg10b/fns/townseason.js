/* 第十棒第三版 · 四季：小镇也跟着换季
   小镇在第 7.4～11 站之间，三站一季，路过小镇的时候总会换一次季。
   · 山坡（buildMid）每一季各烤一张：春天的樱、秋天的红叶、冬天的雪；两季之间两张叠着慢慢换。
   · 广场、街道只有冬天不一样：原来的图上直接画上雪，另存一张「冬天的」（屋顶、檐口、烟囱、墙头、井栏、邮筒、路灯、
     神社、树和松的顶上一层雪，堤岸顶上一道白）；深冬只画这一张，换季时和原图叠着换。
   · 远山很薄，冬天在原图上叠一层白头。
   · 新的图一帧最多烤一张；眼前这一季的那张等不得，马上烤。用不着的季节那几张放掉。 */
const TBUD = { t: -1, n: 0 };
function townBudget(must) {
  if (TBUD.t !== S.t) { TBUD.t = S.t; TBUD.n = 0; }
  if (!must && TBUD.n >= 1) return false;
  TBUD.n++; return true;
}
// 眼下最重的两季：[主季, 次季, 次季的分量 0..0.5]
function townSeasons() {
  let a = 1, b = 1, wa = -1, wb = -1;
  for (let i = 0; i < 4; i++) { const w = seasonWeight(i); if (w > wa) { b = a; wb = wa; a = i; wa = w; } else if (w > wb) { b = i; wb = w; } }
  return [a, b, wb > 0.004 ? wb / (wa + wb) : 0];
}
function midKey(s, mode) { return mode === 'lights' ? 'lights' : mode === 'day' ? 'day' + s : 'dusk' + (s === 3 ? 3 : 1); }
function midTile(L, build, s, mode, must) {
  const k = midKey(s, mode);
  if (L.t[k]) return L.t[k];
  if (!townBudget(must)) return null;
  const r = build(s, mode); L.t[k] = r.c; if (!L.meta) L.meta = r.meta;
  return r.c;
}
/* 两季叠着画：黄昏打底、白天按 dayF 盖上，两季各按分量——
   A 黄昏 → B 黄昏(α=w) → A 白天(α=d(1-w)/(1-dw)) → B 白天(α=dw)，结果正好是 (1-d)·黄昏的混合 + d·白天的混合；最后叠灯 */
function drawMix(g, DA, DB, YA, YB, wB, LT, x, y, w, h) {
  const d = S.dayF, la = lightsAlpha(), wd = DB ? wB : 0, wy = YB ? wB : 0;
  if (d < 0.999 && DA) { g.drawImage(DA, x, y, w, h); if (wd > 0.004) { g.globalAlpha = wd; g.drawImage(DB, x, y, w, h); g.globalAlpha = 1; } }
  if (d > 0.001 && YA) {
    g.globalAlpha = d * (1 - wy) / (1 - d * wy); g.drawImage(YA, x, y, w, h);
    if (wy > 0.004) { g.globalAlpha = d * wy; g.drawImage(YB, x, y, w, h); }
    g.globalAlpha = 1;
  }
  if (la > 0.01 && LT) { g.globalAlpha = la; g.drawImage(LT, x, y, w, h); g.globalAlpha = 1; }
}
/* 换季那一站里，两张按分量混成一张（量化成 1/32 一档，一档约 3%，看不出跳）：每帧只画一张，不用两张叠着画；
   换档时一帧最多重混一张，来不及的先用上一档的 */
function blendTile(L, mode, a, b, w) {
  if (!L.bl) L.bl = {};
  const q = Math.round(w * 32) / 32, e = L.bl[mode];
  if (e && e.a === a && e.b === b && e.q === q) return e.c;
  if (!townBudget(false)) return e && e.a === a && e.b === b ? e.c : null;
  const c = e && e.c.width === a.width && e.c.height === a.height ? e.c : mkCanvas(a.width, a.height), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, c.width, c.height);
  g.drawImage(a, 0, 0); g.globalAlpha = q; g.drawImage(b, 0, 0); g.globalAlpha = 1;
  L.bl[mode] = { a, b, q, c };
  return c;
}
// 两季叠着画，能混成一张的就画一张
function drawBlend(g, L, DA, DB, YA, YB, wB, LT, x, y, w, h) {
  const d = S.dayF;
  if (wB > 0.004 && (DB || YB)) {
    const BD = d < 0.999 && DB ? blendTile(L, 'dusk', DA, DB, wB) : DA, BY = d > 0.001 && YB ? blendTile(L, 'day', YA, YB, wB) : YA;
    if ((d >= 0.999 || BD) && (d <= 0.001 || BY)) return drawMix(g, BD, null, BY, null, 0, LT, x, y, w, h);
  } else L.bl = null;
  drawMix(g, DA, DB, YA, YB, wB, LT, x, y, w, h);
}
function drawLayerS(g, L, build, A, B, wB, x, y, w, h) {
  const d = S.dayF, two = wB > 0.004;
  let DA = null, DB = null, YA = null, YB = null;
  if (d < 0.999) { DA = midTile(L, build, A, 'dusk', true); if (two && midKey(B, 'dusk') !== midKey(A, 'dusk')) DB = midTile(L, build, B, 'dusk', false); }
  if (d > 0.001) { YA = midTile(L, build, A, 'day', true); if (two && midKey(B, 'day') !== midKey(A, 'day')) YB = midTile(L, build, B, 'day', false); }
  drawBlend(g, L, DA, DB, YA, YB, wB, lightsAlpha() > 0.01 ? midTile(L, build, A, 'lights', true) : null, x, y, w, h);
  const keep = [midKey(A, 'day'), midKey(A, 'dusk'), 'lights'];
  if (two) keep.push(midKey(B, 'day'), midKey(B, 'dusk'));
  for (const k in L.t) if (keep.indexOf(k) < 0) delete L.t[k];
}
/* 冬天的那一张：原图上直接画上雪（paint(mode) 返回同样大小的一层雪），黄昏、白天各一张 */
function winterTile(L, base, paint, mode, must) {
  if (!L.wint) L.wint = {};
  if (L.wint[mode]) return L.wint[mode];
  if (!townBudget(must)) return null;
  const b = base[mode], c = mkCanvas(b.width, b.height), g = c.getContext('2d');
  g.drawImage(b, 0, 0); g.drawImage(paint(mode), 0, 0);
  return L.wint[mode] = c;
}
function prepWinter(L, base, paint) {                                // 还没进画面的那块，先烤好
  const win = seasonWeight(3);
  if (win < 0.004) { L.wint = null; return; }
  if (S.dayF < 0.999) winterTile(L, base, paint, 'dusk', win > 0.3);
  if (S.dayF > 0.001) winterTile(L, base, paint, 'day', win > 0.3);
}
function drawWinterMix(g, L, base, paint, x, y, w, h) {
  const win = seasonWeight(3);
  if (win < 0.004) { L.wint = L.bl = null; drawTiles(g, base, x, y, w, h); return; }
  const must = win > 0.3, d = S.dayF;
  const WD = d < 0.999 ? winterTile(L, base, paint, 'dusk', must) : null, WY = d > 0.001 ? winterTile(L, base, paint, 'day', must) : null;
  if (win > 0.995 && (WD || d >= 0.999) && (WY || d <= 0.001)) { L.bl = null; drawMix(g, WD, null, WY, null, 0, base.lights, x, y, w, h); }   // 深冬：只画冬天那一张
  else drawBlend(g, L, base.dusk, WD, base.day, WY, win, base.lights, x, y, w, h);
}
// 冬天的那层雪：黄昏一张、白天一张，按冬天的分量叠在原来的图上；冬天过去就放掉
function snowTile(L, build, mode, must) {
  if (!L.snow) L.snow = {};
  return L.snow[mode] || (townBudget(must) ? (L.snow[mode] = build(mode)) : null);
}
function drawSnowOver(g, L, build, x, y, w, h) {
  const win = seasonWeight(3);
  if (win < 0.004) { L.snow = null; return; }
  const d = S.dayF, must = win > 0.3;
  if (d < 0.999) { const c = snowTile(L, build, 'dusk', must); if (c) { g.globalAlpha = win * (1 - d); g.drawImage(c, x, y, w, h); } }
  if (d > 0.001) { const c = snowTile(L, build, 'day', must); if (c) { g.globalAlpha = win * d; g.drawImage(c, x, y, w, h); } }
  g.globalAlpha = 1;
}

/* ---- 远山：冬天白了头，雪往山谷里淌一点；黄昏的雪是淡粉的 ---- */
function buildFarSnow(mode) {
  const ref = S.ref, sc = Math.min(S.dpr, 1.25), W = TOWN_FAR.width * ref, H = TOWN_FAR.height * ref;
  const prof = x => { const a = x / W; return H - ref * Math.max(0, 0.075 * Math.sin(a * Math.PI) + 0.03 * Math.sin(a * Math.PI * 2.2 + 0.4) + 0.012 * Math.sin(a * Math.PI * 5.3 + 1.1) + Math.max(0, 1 - Math.abs(a - 0.86) * 9) * 0.03); };
  const t = makeTile(TOWN_FAR.width, TOWN_FAR.height, sc), g = t.g;
  g.fillStyle = mode === 'day' ? 'rgba(246,249,253,0.62)' : 'rgba(226,180,206,0.3)';
  g.beginPath(); g.moveTo(0, prof(0));
  for (let x = 0; x <= W; x += 6) g.lineTo(x, prof(x));
  for (let x = Math.floor(W / 6) * 6; x >= 0; x -= 6) { const top = prof(x), dep = (H - top) * (0.26 + 0.18 * Math.abs(Math.sin(x * 0.045)) + 0.07 * Math.sin(x * 0.011 + 1)); g.lineTo(x, Math.min(H - 1, top + Math.max(0, dep))); }
  g.closePath(); g.fill();
  return t.c;
}
function drawTownFar(g) {
  const x = layerVisible(TOWN_FAR);
  if (x == null) return;
  if (!TW.far) TW.far = buildFar();
  const ref = S.ref, w = TOWN_FAR.width * ref, h = TOWN_FAR.height * ref;
  drawTiles(g, TW.far.tiles, x, S.yM - h, w, h);
  drawSnowOver(g, TW.far, buildFarSnow, x, S.yM - h, w, h);
  hitBg('townfar', x + w * 0.1, S.yM - h * 0.9, w * 0.8, h * 0.9);
  // 岬尖的港灯：亮 1.5 s 暗 0.5 s，白天不亮
  const on = mod(S.t, 2) < 1.5, a = (1 - S.dayF) * (0.35 + S.nightF * 0.65) * (on ? 1 : 0.25);
  if (a > 0.02) { const lx = x + TW.far.lampX, ly = S.yM - h + TW.far.lampY; glow(g, glowSpr, lx, ly, ref * 0.03, ref * 0.03, 0.5 * a); g.fillStyle = 'rgba(255,176,164,' + a.toFixed(2) + ')'; g.fillRect(lx - 1, ly - 1, 2, 2); }
  if (!TW.seen.far && x + w > S.W * 0.1) { TW.seen.far = true; say('远处有灯火，是小镇。'); }
}

/* ---- 山坡：每一季一张，两季叠着换 ---- */
function drawTownMid(g) {
  const span = midSpan();
  if (!span) return;
  if (!TW.mid) TW.mid = { t: {}, meta: null, snow: null };
  const ref = S.ref, w = TOWN_MID.width * ref, h = TOWN_MID.height * ref, [A, B, wB] = townSeasons();
  drawLayerS(g, TW.mid, buildMid, A, B, wB, span[0], S.yM - h, w, h);
  const M = TW.mid.meta;
  hitBg('hill', span[0] + w * 0.04, S.yM - ref * 0.2, w * 0.9, ref * 0.2);
  hitAt(null, 'tower', span[0] + M.towerX - ref * 0.014, S.yM - h + M.towerY - ref * 0.004, ref * 0.028, ref * 0.16);
  // 风向标随风转，钟在晚钟时摆
  const tx = span[0] + M.towerX, ty = S.yM - h + M.towerY;
  g.save(); g.translate(tx, ty - ref * 0.004); g.rotate(TW.vane);
  g.strokeStyle = S.dayF > 0.5 ? '#3a3a5a' : '#1c2250'; g.lineWidth = Math.max(0.8, ref * 0.0012);
  g.beginPath(); g.moveTo(-ref * 0.006, 0); g.lineTo(ref * 0.006, 0); g.lineTo(ref * 0.003, -ref * 0.003); g.stroke();
  g.restore();
  if (TW.bellSwing > 0) {
    g.save(); g.translate(tx, ty + ref * 0.055); g.rotate(Math.sin(TW.bellSwing * 6) * 0.35 * Math.min(1, TW.bellSwing));
    g.fillStyle = S.dayF > 0.5 ? '#7a5a44' : '#c9b48c'; g.beginPath(); g.moveTo(-ref * 0.003, 0); g.lineTo(ref * 0.003, 0); g.lineTo(ref * 0.004, ref * 0.007); g.lineTo(-ref * 0.004, ref * 0.007); g.closePath(); g.fill();
    g.restore();
  }
}

/* ---- 广场：冬天地上一层雪，屋顶和鱼市的棚子上一层雪 ---- */
function buildPiazzaSnow(mode) {
  const ref = S.ref, sc = tileScale(), W = TOWN_PIAZZA.width * ref, H = TOWN_PIAZZA.height * ref;
  const PY = H - (TOWN_PIAZZA.lift - QUAY_LIFT) * ref;
  const row = [[0.03, 0.09, 0.07, 5], [0.135, 0.08, 0.085, 2], [0.225, 0.1, 0.065, 0], [0.335, 0.085, 0.09, 3], [0.43, 0.095, 0.07, 6], [0.535, 0.09, 0.08, 1], [0.64, 0.08, 0.075, 4], [0.73, 0.1, 0.085, 2], [0.84, 0.09, 0.07, 0]];
  const t = makeTile(TOWN_PIAZZA.width, TOWN_PIAZZA.height, sc), g = t.g, day = mode === 'day';
  const SN = day ? '#e9eef4' : 'rgba(208,192,236,0.3)';
  g.fillStyle = day ? '#e1e6ec' : 'rgba(150,160,220,0.12)'; g.fillRect(0, PY, W, H - PY);
  g.fillStyle = day ? 'rgba(255,255,255,0.9)' : 'rgba(222,212,255,0.24)'; g.fillRect(0, PY, W, 1.2);
  g.fillStyle = SN;
  for (const [fx, fw, fh] of row) {
    const x = fx * W, w = fw * ref, top = PY - fh * ref;
    g.fillRect(x - 2, top - ref * 0.0092, w + 4, ref * 0.0058);
    // 侧面那一截屋顶也白
    const D = SIDE_D * ref * 0.7; g.beginPath(); g.moveTo(x + w + 2, top - ref * 0.0092); g.lineTo(x + w + 2 + D, top - ref * 0.0092 - D * 0.55); g.lineTo(x + w + 2 + D, top - ref * 0.0034 - D * 0.55); g.lineTo(x + w + 2, top - ref * 0.0034); g.closePath(); g.fill();
  }
  if (day) for (let i = 0; i < 3; i++) {
    const sx = W * (0.42 + i * 0.1), sw = ref * 0.07, by = H - ref * 0.012;
    g.beginPath(); g.moveTo(sx - 3, by - ref * 0.05); g.lineTo(sx + sw + 3, by - ref * 0.05); g.lineTo(sx + sw + 2.2, by - ref * 0.0455); g.lineTo(sx - 2.2, by - ref * 0.0455); g.closePath(); g.fill();
  }
  return t.c;
}
function drawTownPiazza(g) {
  const x = layerVisible(TOWN_PIAZZA);
  if (x == null) return;
  if (!TW.piazza) TW.piazza = buildPiazza();
  const ref = S.ref, w = TOWN_PIAZZA.width * ref, h = TOWN_PIAZZA.height * ref;
  drawWinterMix(g, TW.piazza, TW.piazza.tiles, buildPiazzaSnow, x, S.yM - QUAY_LIFT * ref - h, w, h);
  const top = S.yM - QUAY_LIFT * ref - h;
  hitAt(null, 'market', x + w * 0.42 - 3, top + h - ref * 0.064, w * 0.2 + ref * 0.07 + 6, ref * 0.054);
}

/* ---- 街道：每一块各有一层雪 ---- */
function buildChunkSnow(n, mode) {
  const [wa, wb] = chunkRange(n), ref = S.ref, sc = tileScale();
  const H = TOWN_H * ref, floor = H, base = H - QUAY_LIFT * ref;
  const townLo = TOWN_STREET[0] * G(), townHi = TOWN_STREET[1] * G();
  const t = makeTile(CHUNK_W, TOWN_H, sc), g = t.g;
  g.lineJoin = 'round';
  const xOf = w => (wb - w) * ref;
  let x0 = 0, x1 = -1;
  if (wb > townLo && wa < townHi) { x0 = Math.max(0, xOf(Math.min(wb, townHi))); x1 = Math.min(CHUNK_W * ref, xOf(Math.max(wa, townLo))); }
  paintStreetSnow(g, mode, TW.props.filter(p => p.wLo < wb + 0.3 && p.wHi > wa - 0.3), xOf, base, floor, x0, x1);
  return t.c;
}
function paintStreetSnow(g, mode, props, xOf, base, floor, x0, x1) {
  const ref = S.ref, day = mode === 'day', groundOf = p => p.tag === 'O' ? floor - ref * 0.004 : base;
  if (x1 > x0) { g.fillStyle = day ? '#f3f6fa' : 'rgba(208,192,236,0.3)'; g.fillRect(x0, base - ref * 0.0012, x1 - x0, Math.max(1.6, ref * 0.0042)); }   // 堤岸顶上一道雪
  for (const p of props) propSnow(g, p, mode, xOf(p.wHi), groundOf(p), ref);
}
function snowCapEllipse(g, x, y, rx, ry, rot, col) {                // 椭圆（松针团）的上面一层雪
  g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.clip();
  g.fillStyle = col; g.beginPath(); g.ellipse(x - rx * 0.05, y - ry * 0.95, rx * 1.05, ry * 0.75, rot, 0, TAU); g.fill();
  g.restore();
}
function snowEdges(g, pts, th, col) {                                 // 沿着几条边，往里一道雪檐（画在多边形里面）
  g.save(); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.clip();
  g.strokeStyle = col; g.lineWidth = th * 2; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
  g.restore();
}
function propSnow(g, p, mode, x, base, ref) {
  const day = mode === 'day', SN = day ? '#f3f6fa' : 'rgba(208,192,236,0.32)';
  const D = SIDE_D * ref, w = p.w * ref;
  g.fillStyle = SN;
  switch (p.k) {
    case 'house': {
      const h = p.h * ref, top = base - h;
      if (p.roof === 'gable') {
        const peak = top - ref * 0.045, L = x - ref * 0.008, R = x + w + ref * 0.008;
        g.beginPath(); g.moveTo(x + w / 2, peak); g.lineTo(R, top); g.lineTo(R + D, top - D * 0.55); g.lineTo(x + w / 2 + D, peak - D * 0.55); g.closePath(); g.fill();   // 往后去的那片屋面
        snowEdges(g, [[L, top], [x + w / 2, peak], [R, top]], ref * 0.0065, SN);                                                                              // 正面两条斜边上的雪檐
      } else {
        const hh = ref * 0.02, f = 0.66, lx = x + ref * 0.02, rx = x + w - ref * 0.02, yb = top - hh + hh * f;
        g.beginPath(); g.moveTo(lx, top - hh); g.lineTo(rx, top - hh); g.lineTo(lerp(rx, x + w + ref * 0.008, f), yb);
        for (let i = 1; i < 6; i++) { const u = i / 6; g.lineTo(lerp(lerp(rx, x + w + ref * 0.008, f), lerp(lx, x - ref * 0.008, f), u), yb - (i % 2 ? hh * 0.1 : -hh * 0.05)); }
        g.lineTo(lerp(lx, x - ref * 0.008, f), yb); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(rx, top - hh); g.lineTo(x + w + ref * 0.008, top); g.lineTo(x + w + ref * 0.008 + D, top - D * 0.55); g.lineTo(rx + D, top - hh - D * 0.55); g.closePath(); g.fill();
      }
      if (p.chimney) { const cx = x + w * 0.7, cw = ref * 0.03, ch = ref * 0.14; g.fillRect(cx - ref * 0.006, top - ch - ref * 0.016, cw + ref * 0.012, ref * 0.009); }
      if (p.awning) {
        const ax = x + w * 0.08, ay = base - h * 0.5 - ref * 0.02, aw = w * 0.5;
        g.beginPath(); g.moveTo(ax, ay - ref * 0.0135); g.lineTo(ax + aw, ay - ref * 0.0135); g.lineTo(ax + aw + ref * 0.002, ay - ref * 0.008); g.lineTo(ax - ref * 0.002, ay - ref * 0.008); g.closePath(); g.fill();
      }
      if (p.terrace) {
        const ax = x + w * 0.04, aw = w * 0.92, ay = base - ref * 0.075;
        g.beginPath(); g.moveTo(ax, ay - ref * 0.0175); g.lineTo(ax + aw, ay - ref * 0.0175); g.lineTo(ax + aw + ref * 0.003, ay - ref * 0.0115); g.lineTo(ax - ref * 0.003, ay - ref * 0.0115); g.closePath(); g.fill();
      }
      if (day) for (const wn of houseWindows(p, x, w, top, h, ref)) if (wn.box) { g.beginPath(); g.ellipse(wn.x + wn.w / 2, wn.y + wn.h - ref * 0.0005, wn.w * 0.6, ref * 0.0042, 0, Math.PI, TAU); g.fill(); g.fillRect(wn.x - 1, wn.y + wn.h - ref * 0.0005, wn.w + 2, ref * 0.0028); }   // 花盆里是雪
      return;
    }
    case 'shed': { const top = base - ref * 0.07; capTri(g, x - ref * 0.006, top, x + w / 2, top - ref * 0.03, x + w + ref * 0.006, top, 0.66, SN); return; }
    case 'wall': { const h = ref * 0.04; g.fillRect(x, base - h - ref * 0.0085, w, ref * 0.0065); return; }
    case 'well': g.fillRect(x - ref * 0.004, base - ref * 0.037, w + ref * 0.008, ref * 0.0055); return;
    case 'crates': { const s = ref * 0.026; g.fillRect(x, base - s - 1, s, s * 0.2); g.fillRect(x + s * 1.15, base - s - 1, s, s * 0.2); g.fillRect(x + s * 0.55, base - s * 1.95 - 1, s, s * 0.2); return; }
    case 'postbox': g.beginPath(); g.ellipse(x + w / 2, base - ref * 0.031, w * 0.46, ref * 0.0035, 0, Math.PI, TAU); g.fill(); return;
    case 'bollard': g.beginPath(); g.ellipse(x + w / 2, base - ref * 0.0175, w * 0.42, ref * 0.0028, 0, Math.PI, TAU); g.fill(); return;
    case 'lamp': { const cx = x + w / 2, hh = ref * 0.11; g.fillRect(cx - ref * 0.008, base - hh - ref * 0.0065, ref * 0.016, ref * 0.003); return; }
    case 'pierTop': g.fillRect(x, base - ref * 0.0068, w, ref * 0.0032); return;
    case 'bench': g.fillRect(x, base - ref * 0.0245, w, ref * 0.0026); return;
    case 'busstop': g.fillRect(x + w * 0.3 - ref * 0.012, base - ref * 0.1035, ref * 0.028, ref * 0.0045); g.fillRect(x + w * 0.45, base - ref * 0.0232, w * 0.55, ref * 0.0022); return;
    case 'shrine': {
      capTri(g, x + w * 0.15, base - ref * 0.05, x + w * 0.5, base - ref * 0.075, x + w * 0.85, base - ref * 0.05, 0.7, SN);
      g.fillStyle = SN; g.fillRect(x - ref * 0.006, base - ref * 0.0665, w + ref * 0.012, ref * 0.0035); return;
    }
    case 'tree': {                                                  // 老樟树：冠子顶上一层雪（只在露在外面的团上）
      const h = p.h * ref, cx = x + w * 0.5, rnd = mulberry32(57), blobs = [];
      for (let i = 0; i < 10; i++) blobs.push([cx + (rnd() - 0.5) * w * 0.82, base - h * (0.56 + rnd() * 0.36), w * (0.16 + rnd() * 0.13)]);
      for (const [bx, by, br] of blobs) {
        const tx = bx, ty = by - br * 0.85;
        if (blobs.some(o => o[0] !== bx && Math.hypot(tx - o[0], ty - o[1]) < o[2] * 0.92)) continue;
        capCircle(g, bx, by, br, SN);
      }
      return;
    }
    case 'pine': {
      const h = ref * 0.13, cx = x + w * 0.62;
      const pads = [[cx - w * 0.38, base - h * 0.92, w * 0.33, h * 0.1], [cx + w * 0.44, base - h * 0.65, w * 0.25, h * 0.08], [cx + w * 0.06, base - h * 0.79, w * 0.24, h * 0.075]];
      for (const [px, py, pw, ph] of pads) snowCapEllipse(g, px, py, pw, ph, -0.08, SN);
      return;
    }
    default: return;
  }
}
function drawTownStreet(g, P) {
  const p = townPos();
  if (p < TOWN_STREET[0] - 2.5 || p > OUTSKIRTS[1] + 2) return;
  const ref = S.ref, H = TOWN_H * ref;
  const wLeftEdge = S.camera + P.roofX0 / ref + 0.3, wRightEdge = S.camera - (S.W - P.roofX0) / ref - 0.3;   // 画面左边缘的世界坐标更大
  const n0 = chunkIndexAt(wRightEdge), n1 = chunkIndexAt(wLeftEdge + 1.5);
  const lo = TOWN_STREET[0] * G() - 1.0, hi = OUTSKIRTS[1] * G() + 1;
  if (RX) drawStreetRX(g, P);
  else for (let n = Math.max(0, n0); n <= n1; n++) {
    const [wa, wb] = chunkRange(n);
    if (wa > hi || wb < lo) continue;
    const c = chunkAt(n);
    const sx = P.roofX0 + (S.camera - wb) * ref;
    const paint = mode => buildChunkSnow(n, mode);
    if (sx > S.W + PAD || sx + CHUNK_W * ref < -PAD) { prepWinter(c, c.tiles, paint); continue; }   // 还没进画面的那块，先把冬天那张烤好
    drawWinterMix(g, c, c.tiles, paint, sx, S.yM - H, CHUNK_W * ref + 0.5, H);
  }
  if (!RX) { townPropHits(P); for (const [k, c] of TW.chunks) if (k < n0 - 1 && (c.wint || c.bl)) c.wint = c.bl = null; }   // 开过去的那几块，冬天那张和混好的那张先放掉
  // 潮线：下午退潮湿痕宽，夜里涨潮湿痕窄
  if (p > TOWN_STREET[0] - 1 && p < TOWN_STREET[1] + 1) {
    const x0 = P.roofX0 + (S.camera - TOWN_STREET[1] * G()) * ref, x1 = P.roofX0 + (S.camera - TOWN_STREET[0] * G()) * ref;
    const hgt = ref * (0.004 + 0.006 * S.dayF);
    g.fillStyle = 'rgba(30,50,80,' + (0.3 + 0.1 * S.dayF).toFixed(2) + ')'; g.fillRect(Math.max(-PAD, x0), S.yM - ref * 0.004 - hgt, Math.min(S.W + PAD, x1) - Math.max(-PAD, x0), hgt);
  }
  pruneChunks();
}
function drawStreetRX(g, P) {                      // 揭卡时：堤岸与道具按高倍率直接画，一种天色一层，再按透明度叠（冬天连雪一起画）
  const ref = S.ref, d = S.dayF, la = lightsAlpha(), xOf = w => quayScreenX(P, w), base = quayTop(), floor = S.yM;
  const lo = RX.wx - PAD - ref * 0.4, hi = RX.wx + RX.ww + PAD + ref * 0.4;
  const props = TW.props.filter(p => xOf(p.wLo) > lo && xOf(p.wHi) < hi);
  const x0 = Math.max(lo, xOf(TOWN_STREET[1] * G())), x1 = Math.min(hi, xOf(TOWN_STREET[0] * G()));
  const win = seasonWeight(3);
  if (!RX.layer) RX.layer = mkCanvas(world.width, world.height);
  const L = RX.layer, lg = L.getContext('2d');
  const modes = [];
  if (d < 0.999) modes.push(['dusk', 1]);
  if (d > 0.001) modes.push(['day', d]);
  if (la > 0.01) modes.push(['lights', la]);
  for (const [mode, a] of modes) {
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, L.width, L.height);
    lg.setTransform(RX.z, 0, 0, RX.z, (PAD - RX.wx) * RX.z, -RX.wy * RX.z); lg.lineJoin = 'round'; lg.globalAlpha = 1;
    if (mode !== 'lights' && x1 > x0) {
      lg.fillStyle = mode === 'day' ? '#b9b3a5' : '#0f1536'; lg.fillRect(x0, base, x1 - x0, floor - base);
      lg.fillStyle = mode === 'day' ? 'rgba(255,255,255,0.5)' : 'rgba(255,190,150,0.14)'; lg.fillRect(x0, base, x1 - x0, 1.2);
    }
    paintStreetProps(lg, mode, props, xOf, base, floor);
    if (win > 0.004 && mode !== 'lights') { lg.globalAlpha = win; paintStreetSnow(lg, mode, props, xOf, base, floor, x0, x1); lg.globalAlpha = 1; }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(L, 0, 0); g.restore();
  }
}
