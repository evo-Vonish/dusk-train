/* 第十棒第三版 · 四季：海
   · 海的颜色跟着季节（seaTop / seaBot）：春天发软发粉，夏天亮，秋天深，冬天发黑；倒影的晃动也跟着变：夏天活泼，冬天几乎不动；
   · 春：花瓣落在水面，聚成一小片一小片的花筏，慢慢漂；
   · 秋：落叶漂在水上；夜里远处的海平线上一排渔火（秋刀鱼的船），每一盏在水里拉出一根光柱；
   · 冬：冷天的海面冒起一缕缕白气（海烟）；冬天快过完的时候有流冰漂过，最大的那一块上趴着一只海豹。
   水面上的东西离你越近越大、走得越快（近处的水在铁轨前面）。 */
let mistSpr = null;
function mistSprite() {
  if (mistSpr) return mistSpr;
  mistSpr = document.createElement('canvas'); mistSpr.width = mistSpr.height = 96;
  const g = mistSpr.getContext('2d'), gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(.45, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
  return mistSpr;
}
// 水面上一件东西的位置：k 是离你多近（0 在铁轨下，1 在画面底），u 是它在这一圈里的位置
function floatPos(u, k, cur, margin) {
  const { W, H, yM, ref, t } = S, span = W + margin * 2, dep = 1 + 1.4 * k;
  const x = mod(u * span + S.camera * ref * dep - t * ref * cur * (0.6 + 0.8 * k), span) - margin;
  return [x, yM + k * (H - yM) * 0.94, 0.5 + 1.3 * k];
}
const SEAF = { rafts: null, leaves: null, smoke: null, ice: null, fleet: null };
function seaFloats() {
  if (SEAF.rafts) return SEAF;
  const rnd = mulberry32(2026);
  SEAF.rafts = Array.from({ length: 11 }, () => ({ u: rnd(), k: .08 + rnd() * .8, n: 8 + Math.floor(rnd() * 12), r: .018 + rnd() * .022, ph: rnd() * TAU, petals: Array.from({ length: 22 }, () => [rnd(), rnd(), rnd(), rnd()]) }));
  SEAF.leaves = Array.from({ length: 15 }, () => ({ u: rnd(), k: .06 + rnd() * .85, c: Math.floor(rnd() * 3), s: .7 + rnd() * .6, ph: rnd() * TAU, spin: (rnd() - .5) * .3 }));
  SEAF.smoke = Array.from({ length: 22 }, () => ({ u: rnd(), k: Math.pow(rnd(), 1.6) * .75, h: .04 + rnd() * .06, ph: rnd(), sp: .05 + rnd() * .05 }));
  SEAF.ice = Array.from({ length: 10 }, (_, i) => { const n = 6 + Math.floor(rnd() * 4), pts = []; for (let j = 0; j < n; j++) pts.push((j + rnd() * .6) / n * TAU, .65 + rnd() * .45); return { u: rnd(), k: .1 + rnd() * .75, r: .02 + rnd() * .04, n, pts, seal: i === 3 }; });
  SEAF.fleet = Array.from({ length: 8 }, (_, i) => ({ u: (i + rnd() * .7) / 8, ph: rnd() * TAU, s: .7 + rnd() * .5 }));
  return SEAF;
}
function iceWeight() { const p = seasonPos(); return p >= 3.25 ? smooth((p - 3.25) / .3) : p < .4 ? 1 - smooth(p / .4) : 0; }     // 冬天快过完的时候，到立春前后化掉

function drawSeaSeason() {
  const F = seaFloats(), { W, H, yM, ref, t } = S, depth = H - yM;
  const spr = seasonWeight(0), aut = seasonWeight(2), win = seasonWeight(3), night = S.nightF, day = S.dayF;
  const calmWater = 1 - S.rainI * .5 - S.stormF * .8;
  ctx.save();
  // 春：花筏
  if (spr > .02 && calmWater > .1) {
    const a = spr * calmWater, lit = mix(mix([255, 200, 214], [150, 130, 170], night), [255, 214, 226], day);
    for (const R of F.rafts) {
      const [x, y, sc] = floatPos(R.u, R.k, .006, ref * .15);
      const rr = R.r * ref * sc;
      if (a > .4 && sc > .9) hitAt(ctx, 'petalraft', x - rr, y - rr * .4, rr * 2, rr * .8);
      for (let i = 0; i < R.n; i++) {
        const p = R.petals[i], ang = p[0] * TAU, d = Math.sqrt(p[1]) * rr, px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * .32;
        const w = ref * .0045 * sc * (.8 + p[2] * .5), rot = p[3] * TAU + t * .05 * (p[2] - .5);
        ctx.globalAlpha = a * (.55 + .4 * p[2]);
        ctx.fillStyle = css(mix(lit, [255, 244, 248], p[3] * .4));
        ctx.beginPath(); ctx.ellipse(px, py, w, w * .42, rot, 0, TAU); ctx.fill();
      }
    }
  }
  // 秋：漂着的落叶
  if (aut > .02 && calmWater > .1) {
    const cols = [[200, 70, 50], [228, 128, 46], [222, 178, 62]];
    for (const L of F.leaves) {
      const [x, y, sc] = floatPos(L.u, L.k, .007, ref * .1), r = ref * .008 * sc * L.s;
      ctx.globalAlpha = aut * calmWater * .9;
      ctx.fillStyle = css(mix(mix(cols[L.c], INK, night * .6), [255, 220, 190], day * .15));
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .42); ctx.rotate(L.ph + t * L.spin); mapleLeaf(ctx, r); ctx.fill(); ctx.restore();
      if (sc > 1.1 && aut > .5) hitAt(ctx, 'floatleaf', x - r * 1.2, y - r * .6, r * 2.4, r * 1.2);
    }
  }
  // 秋夜：渔火在水里的光柱
  const fleetA = fleetWeight();
  if (fleetA > .02) {
    ctx.globalCompositeOperation = 'lighter';
    for (const b of F.fleet) { const x = fleetX(b); if (x < -20 || x > W + 20) continue; lampColumn(x, yM, ref * .006, ref * .005 * b.s, .5 * fleetA, b.ph * 3, [255, 214, 160], .8); }
    ctx.globalCompositeOperation = 'source-over';
  }
  // 冬：流冰（冬天快过完的时候），最大的一块上趴着一只海豹
  const ice = iceWeight();
  if (ice > .02) {
    const glowC = seasonCol(P => P.glow), sky = mix(seasonCol(P => P.dusk[5]), [255, 255, 255], .55);
    const top = mix(mix(mix(sky, glowC, .12), [120, 132, 172], night), [244, 250, 255], day), side = mix(mix([132, 136, 186], [36, 44, 88], night), [140, 178, 206], day);
    const lit = mix(mix(top, [255, 250, 246], .5), top, night * .7);
    for (const I of F.ice) {
      const [x, y, sc] = floatPos(I.u, I.k, .004, ref * .2), r = I.r * ref * sc, bob = Math.sin(t * .6 + I.u * 9) * ref * .001 * sc;
      const shape = dy => { ctx.beginPath(); for (let j = 0; j < I.n; j++) { const a = I.pts[j * 2], m = I.pts[j * 2 + 1]; const px = x + Math.cos(a) * r * m, py = y + dy + Math.sin(a) * r * m * .3; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); };
      ctx.globalAlpha = ice * .3; ctx.fillStyle = css(mix(side, [10, 14, 40], .55)); shape(r * .2 + bob); ctx.fill();       // 水下的影子
      ctx.globalAlpha = ice; ctx.fillStyle = css(side); shape(r * .09 + bob); ctx.fill();                                     // 冰的侧面
      ctx.fillStyle = css(top); shape(bob); ctx.fill();
      // 冰面上朝着光的那一半亮一点，像积着一层雪
      ctx.save(); shape(bob); ctx.clip(); ctx.fillStyle = css(lit, .8); ctx.beginPath(); ctx.ellipse(x + r * .25, y + bob - r * .05, r * .75, r * .2, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.globalAlpha = ice * .45; ctx.strokeStyle = css(mix(side, [10, 14, 40], .3)); ctx.lineWidth = Math.max(.6, ref * .0009); shape(r * .09 + bob); ctx.stroke();   // 吃水的那一圈
      if (sc > .9 && ice > .5) hitAt(ctx, 'driftice', x - r, y - r * .35, r * 2, r * .8);
      if (I.seal) drawSeal(ctx, x + r * .1, y + bob - r * .05, ref * .016 * sc, ice, night, day);
    }
  }
  // 冬：海烟——冷天的海面上一缕缕往上冒的白气
  if (win > .02) {
    const k0 = win * (1 - day * .5) * (1 - S.stormF) * (.6 + .4 * (1 - S.rainI)), spr2 = mistSprite();
    const col = mix(mix([236, 226, 246], [150, 162, 206], night), [240, 244, 250], day);
    ctx.fillStyle = css(col);
    for (const M of F.smoke) {
      const [x, y, sc] = floatPos(M.u, M.k, .01, ref * .1), h = M.h * ref * sc;
      for (let b = 0; b < 4; b++) {
        const f = mod(t * M.sp + b / 4 + M.ph, 1), yy = y - f * h, xx = x + Math.sin(f * 3 + M.ph * 9) * h * .18 - f * h * .25, s = h * (.26 + .34 * f);
        ctx.globalAlpha = Math.sin(Math.PI * f) * .13 * k0;
        ctx.drawImage(spr2, xx - s, yy - s * .7, s * 2, s * 1.4);
      }
    }
    if (k0 > .5) hitBg('seasmoke', 0, yM, W, depth * .5);
  }
  ctx.restore();
}
function drawSeal(g, x, y, s, a, night, day) {
  const { t } = S, ink = css(mix(mix([60, 58, 74], [18, 20, 44], night), [86, 84, 96], day)), hi = css(mix([160, 156, 176], [70, 76, 120], night), .7);
  const lift = smooth(Math.max(0, Math.sin(t * .35)) * 1.6);                      // 隔一会儿抬起头看一看
  g.save(); g.globalAlpha = a;
  g.fillStyle = ink;
  g.beginPath(); g.ellipse(x, y - s * .28, s * .95, s * .3, 0, 0, TAU); g.fill();                         // 身子
  g.beginPath(); g.moveTo(x - s * .85, y - s * .3); g.quadraticCurveTo(x - s * 1.35, y - s * .5, x - s * 1.45, y - s * .2); g.quadraticCurveTo(x - s * 1.2, y - s * .2, x - s * .85, y - s * .15); g.fill();   // 尾鳍
  const hx = x + s * .8, hy = y - s * (.42 + .3 * lift);
  g.beginPath(); g.ellipse(hx, hy, s * .32, s * .26, -.3 * lift, 0, TAU); g.fill();                         // 头
  g.beginPath(); g.moveTo(x + s * .5, y - s * .5); g.lineTo(hx - s * .1, hy - s * .1); g.lineTo(hx + s * .05, hy + s * .2); g.lineTo(x + s * .6, y - s * .1); g.closePath(); g.fill();   // 脖子
  g.fillStyle = hi; g.beginPath(); g.ellipse(x - s * .1, y - s * .48, s * .5, s * .08, 0, 0, TAU); g.fill(); // 背上的一道光
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(hx + s * .12, hy - s * .05, Math.max(.5, s * .045), 0, TAU); g.fill();
  g.restore();
  if (a > .5) hitAt(g, 'seal', x - s * 1.5, y - s * 1.0, s * 2.7, s * 1.1);
}
// 秋夜的渔火：远处海平线上一排小船
function fleetWeight() { return seasonWeight(2) * smooth((S.nightF - .3) / .4) * (1 - S.dayF) * (1 - S.rainI) * (1 - S.stormF) * (1 - NX.fog); }
function fleetX(b) { const { W, ref } = S, span = W + ref * .4; return mod(b.u * span + S.camera * ref * .03, span) - ref * .2; }
function drawFishingFleet(g) {
  const a = fleetWeight(); if (a < .02) return;
  const F = seaFloats(), { yM, ref, t } = S;
  for (const b of F.fleet) {
    const x = fleetX(b); if (x < -20 || x > S.W + 20) continue;
    const y = yM - ref * .0025 + Math.sin(t * .9 + b.ph) * ref * .0006, s = ref * .006 * b.s;
    g.fillStyle = css(INK, .9 * a); g.fillRect(x - s, y - s * .25, s * 2, s * .3); g.fillRect(x - s * .1, y - s * 1.1, s * .14, s * .9);
    glow(g, glowSpr, x, y - s * 1.1, ref * .03, ref * .03, .5 * a);
    g.fillStyle = css([255, 236, 196], a); g.beginPath(); g.arc(x, y - s * 1.1, Math.max(.8, ref * .0016), 0, TAU); g.fill();
  }
  if (a > .5) hitBg('fishingfleet', 0, yM - ref * .03, S.W, ref * .035);
}
