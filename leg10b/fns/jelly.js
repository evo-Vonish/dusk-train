/* 第十棒第七版 · 水母（梦一点、多一点）
   原来是深夜里偶尔浮上来一两只，青色的，四根短须。现在晴朗的夜里，海下面总有一群（桌面二十多只，手机十几只），远小近大：
   · 颜色不一样：青、蓝、紫、粉、杏、薄荷；每一只身后一团同色的光晕。
   · 伞：半透明的穹顶，顶上亮、边缘深；一收一放地游——收得快、放得慢，收的时候往上一窜，伞变高变窄，须子被拉长。
     伞里有四个小环（海月水母那样）、几道辐管；伞缘一圈小光点，一波一波地亮过去。
   · 伞下：四条带褶边的口腕，八到十六根很长的细须，一道道波从上往下传，跟着漂的方向往后拖。
   · 有几只是栉水母：椭圆的身子，八排栉板上一道彩虹的光一直往下流。
   · 每一只有自己的一辈子（半分钟到一分多钟）：从深处淡出来，一边一收一放一边慢慢往上浮，再淡回去；轮着来，总有一群在。
   · 近的跟着镜头走得快一些，远的慢（视差）；下雨、白天、暴风雨里看不见。揭卡还是那一张「水母」，揭最近的那只。 */
const JELLY_HUES = [
  { core: [150, 238, 255], rim: [196, 250, 255], deep: [50, 160, 226] },    // 青
  { core: [132, 172, 255], rim: [186, 208, 255], deep: [64, 90, 220] },     // 蓝
  { core: [198, 158, 255], rim: [228, 204, 255], deep: [118, 76, 220] },    // 紫
  { core: [255, 162, 224], rim: [255, 208, 240], deep: [206, 74, 168] },    // 粉
  { core: [255, 198, 162], rim: [255, 228, 204], deep: [226, 116, 86] },    // 杏
  { core: [150, 255, 214], rim: [204, 255, 234], deep: [56, 196, 156] }     // 薄荷
];
const JELLY = { pool: null, n: 0, spr: null, rainbow: null, mul: 1 };       // mul：第八版，海面隐去时按镜子的浓淡再画一遍
function jellyPool() {
  const n = S.reduced ? 8 : S.portrait ? 20 : 34;
  if (JELLY.pool && JELLY.n === n) return JELLY.pool;
  if (!JELLY.spr) {
    JELLY.spr = JELLY_HUES.map(h => {
      const c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, css(h.core, .9)); gr.addColorStop(.3, css(h.core, .35)); gr.addColorStop(.65, css(h.deep, .1)); gr.addColorStop(1, css(h.deep, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
    });
    JELLY.rainbow = [];
    for (let i = 0; i < 12; i++) {                                     // 彩虹：栉板上流的光
      const hh = i / 12 * 6, f = hh - Math.floor(hh), q = 1 - f, sec = Math.floor(hh) % 6;
      const rgb = [[1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q]][sec];
      JELLY.rainbow.push(rgb.map(v => Math.round(150 + v * 105)));
    }
  }
  const rnd = mulberry32(9133); JELLY.n = n; JELLY.pool = [];
  for (let i = 0; i < n; i++) {
    const k = Math.pow(rnd(), 1.35);                                    // 远的多、近的少
    JELLY.pool.push({
      k, bx: rnd(), s: .7 + rnd() * .6, hue: Math.floor(rnd() * JELLY_HUES.length), per: 1.7 + rnd() * 1.6, ph: rnd(),
      life: 34 + rnd() * 44, off: rnd(), drift: (rnd() - .5) * 2, ten: 8 + Math.floor(rnd() * 9), tl: 2.4 + rnd() * 3.2,
      comb: rnd() < .22, tilt: (rnd() - .5) * .35, seed: rnd() * 100
    });
  }
  JELLY.pool.sort((a, b) => a.k - b.k);
  return JELLY.pool;
}
function drawJellies() {
  const nf = smooth((S.nightF - .42) / .4) * (1 - smooth(S.rainI / .55)) * (1 - S.dayF) * (1 - S.stormF) * JELLY.mul;
  if (nf <= 0.02) return;
  const { W, H, yM, ref, t } = S, depth = H - yM, pool = jellyPool(), hits = [];
  ctx.save(); ctx.beginPath(); ctx.rect(0, yM + 2, W, depth); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const j of pool) {
    const cyc = mod(t / j.life + j.off, 1), appear = smooth(Math.min(cyc / .14, (1 - cyc) / .14));
    if (appear < .02) continue;
    const r = ref * (.007 + .03 * Math.pow(j.k, 1.2)) * j.s, span = W + r * 12;
    const x = mod(j.bx * span + t * ref * (.004 + .006 * j.k) * j.drift + S.camera * ref * (.05 + .45 * j.k), span) - r * 6;
    const q = mod(t / j.per + j.ph, 1), c = q < .28 ? smooth(q / .28) : 1 - smooth((q - .28) / .72);   // 收得快、放得慢
    const y = yM + depth * (.08 + .84 * j.k) - depth * .08 * cyc * (.4 + j.k) + Math.sin(t * .31 + j.seed) * ref * .008 - c * r * .35;
    const a = nf * appear * (.5 + .5 * j.k);
    if (j.comb) drawCombJelly(ctx, j, x, y, r, a, t); else drawJelly(ctx, j, x, y, r, c, a, t);
    if (a > .25 && r > ref * .012 && x > 0 && x < W) hits.push({ x, y, r, k: j.k });
  }
  ctx.restore();
  hits.sort((p, q) => q.k - p.k);
  for (const h of hits.slice(0, 4)) hitAt(null, 'jelly', h.x - h.r * 1.3, h.y - h.r * 1.1, h.r * 2.6, h.r * 3.4);
}
// 一只水母：伞、伞里的环和辐管、伞缘的光点、口腕、细须、光晕
function drawJelly(g, j, x, y, r, c, a, t) {
  const Hh = JELLY_HUES[j.hue], rx = r * (1.06 - .2 * c), ry = r * (.6 + .22 * c), skirt = r * (.1 + .08 * c);
  g.save(); g.globalAlpha = a * .5; g.drawImage(JELLY.spr[j.hue], x - r * 3.4, y - r * 2.6, r * 6.8, r * 6.4); g.restore();
  if (r < 1.6) return;
  const sway = Math.sin(t * .4 + j.seed) * j.tilt;
  // 细须：从伞缘垂下来，一道道波往下传，尾巴跟着漂的方向往后拖
  const nT = r < 4 ? 3 : r < 8 ? 6 : r < 14 ? 10 : j.ten, seg = r < 10 ? 6 : 12, L = r * j.tl * (1 + .18 * c);
  if (nT) {
    const tg = g.createLinearGradient(0, y, 0, y + L);
    tg.addColorStop(0, css(JELLY_HUES[j.hue].rim, a * .34)); tg.addColorStop(.5, css(JELLY_HUES[j.hue].core, a * .14)); tg.addColorStop(1, css(JELLY_HUES[j.hue].core, 0));
    g.strokeStyle = tg; g.lineWidth = Math.max(.4, r * .026);
    for (let i = 0; i < nT; i++) {
      const u = nT === 1 ? 0 : i / (nT - 1) * 2 - 1, x0 = x + u * rx * .9 + sway * r * .3, y0 = y + skirt * .6;
      g.beginPath(); g.moveTo(x0, y0);
      for (let s = 1; s <= seg; s++) {
        const f = s / seg, w = Math.sin(t * 1.6 - f * 5 + i * 1.7 + j.seed) * r * .22 * f - j.drift * f * f * r * .5 + u * f * r * .2;
        g.lineTo(x0 + w, y0 + L * f * (1 - Math.abs(u) * .18));
      }
      g.stroke();
    }
  }
  // 口腕：四条带褶边的，短一点、亮一点
  if (r > 3) {
    for (let i = 0; i < 4; i++) {
      const bx = x + (i - 1.5) * rx * .15 + sway * r * .2, by = y, Lr = r * (1.3 + .3 * ((i * 7 + Math.floor(j.seed)) % 3)) * (1 + .12 * c), n = r < 10 ? 6 : 12;
      const left = [], right = [];
      for (let s = 0; s <= n; s++) {
        const f = s / n, cx = bx + Math.sin(t * 1.1 - f * 4 + i * 2 + j.seed) * r * .18 * f - j.drift * f * f * r * .3, cy = by + Lr * f;
        const w = r * .085 * (1 - f * .55) * (1 + .55 * Math.sin(f * 17 + t * 2.2 + i));
        left.push([cx - w, cy]); right.push([cx + w, cy]);
      }
      g.fillStyle = css(Hh.core, a * .2); g.beginPath(); g.moveTo(left[0][0], left[0][1]);
      for (const p of left) g.lineTo(p[0], p[1]);
      for (let s = right.length - 1; s >= 0; s--) g.lineTo(right[s][0], right[s][1]);
      g.closePath(); g.fill();
    }
  }
  // 伞
  g.save(); g.translate(x, y); g.rotate(sway);
  const bell = new Path2D();
  bell.moveTo(-rx, 0); bell.bezierCurveTo(-rx * 1.02, -ry * 1.3, rx * 1.02, -ry * 1.3, rx, 0);
  const lobes = 8;
  for (let i = 1; i <= lobes; i++) { const f0 = 1 - (i - .5) / lobes * 2, f1 = 1 - i / lobes * 2; bell.quadraticCurveTo(rx * f0, skirt * (1.3 + .25 * Math.sin(t * 3 + i)), rx * f1, skirt * .4); }
  bell.closePath();
  const bg = g.createRadialGradient(0, -ry * .5, 0, 0, -ry * .2, rx * 1.15);
  bg.addColorStop(0, css(Hh.rim, a * .5)); bg.addColorStop(.45, css(Hh.core, a * .26)); bg.addColorStop(.85, css(Hh.deep, a * .18)); bg.addColorStop(1, css(Hh.deep, 0));
  g.fillStyle = bg; g.fill(bell);
  g.strokeStyle = css(Hh.rim, a * .55); g.lineWidth = Math.max(.5, r * .045);
  g.beginPath(); g.moveTo(-rx, 0); g.bezierCurveTo(-rx * 1.02, -ry * 1.3, rx * 1.02, -ry * 1.3, rx, 0); g.stroke();
  if (r > 5) {
    // 伞里：一团暖暖的芯，四个很淡的小环（斜着看是扁的），几道辐管；顶上一弯高光
    const cg = g.createRadialGradient(0, -ry * .45, 0, 0, -ry * .45, rx * .55);
    cg.addColorStop(0, css(mix(Hh.rim, [255, 255, 255], .4), a * .35)); cg.addColorStop(1, css(Hh.core, 0));
    g.fillStyle = cg; g.beginPath(); g.ellipse(0, -ry * .45, rx * .55, ry * .42, 0, 0, TAU); g.fill();
    g.strokeStyle = css(Hh.core, a * .2); g.lineWidth = Math.max(.4, r * .035);
    for (let i = 0; i < 4; i++) { const an = i * TAU / 4 + Math.PI / 4 + t * .05; g.beginPath(); g.ellipse(Math.cos(an) * rx * .34, -ry * .48 + Math.sin(an) * ry * .07, rx * .12, ry * .05, 0, 0, TAU); g.stroke(); }
    g.strokeStyle = css([255, 255, 255], a * .28); g.lineWidth = Math.max(.5, r * .04);
    g.beginPath(); g.ellipse(0, -ry * .05, rx * .86, ry * 1.05, 0, Math.PI * 1.18, Math.PI * 1.42); g.stroke();
    if (r > 9) {
      g.strokeStyle = css(Hh.rim, a * .16); g.lineWidth = Math.max(.4, r * .02);
      for (let i = 0; i < 8; i++) { const f = (i + .5) / 8 * 2 - 1; g.beginPath(); g.moveTo(f * rx * .2, -ry * .62); g.quadraticCurveTo(f * rx * .75, -ry * .55, f * rx * .96, skirt * .2); g.stroke(); }
    }
    // 伞缘一圈小光点，一波一波地亮过去
    const m = r < 10 ? 10 : 18, dot = Math.max(.6, r * .035);
    for (let i = 0; i < m; i++) {
      const f = i / (m - 1), px = (f * 2 - 1) * rx * .97, tw = .5 + .5 * Math.sin(t * 4 - f * 9 + j.seed);
      g.fillStyle = css(mix(Hh.rim, [255, 255, 255], .4 * tw), a * (.2 + .6 * tw)); g.beginPath(); g.arc(px, skirt * (.55 + .2 * Math.sin(f * 30)), dot, 0, TAU); g.fill();
    }
  }
  g.restore();
}
// 栉水母：椭圆的身子，几排栉板上一道彩虹的光往下流，两根很长的须
function drawCombJelly(g, j, x, y, r, a, t) {
  const Hh = JELLY_HUES[j.hue], rx = r * .55, ry = r * .82;
  g.save(); g.globalAlpha = a * .4; g.drawImage(JELLY.spr[j.hue], x - r * 2.6, y - r * 2.8, r * 5.2, r * 5.6); g.restore();
  if (r < 1.6) return;
  const sway = Math.sin(t * .5 + j.seed) * .25;
  g.save(); g.translate(x, y); g.rotate(sway);
  if (r > 4) {
    g.strokeStyle = css(Hh.rim, a * .16); g.lineWidth = Math.max(.4, r * .02);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * rx * .3, ry * .6); g.bezierCurveTo(s * rx * .6, ry * 2, s * rx * (1.2 + .5 * Math.sin(t * 1.2 + s)), ry * 3.2, s * rx * .6, ry * 4.4); g.stroke(); }
  }
  const bg = g.createRadialGradient(0, -ry * .3, 0, 0, 0, ry);
  bg.addColorStop(0, css(Hh.rim, a * .32)); bg.addColorStop(.7, css(Hh.core, a * .14)); bg.addColorStop(1, css(Hh.deep, 0));
  g.fillStyle = bg; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = css(Hh.rim, a * .4); g.lineWidth = Math.max(.4, r * .03); g.stroke();
  if (r > 3) {
    const rows = r < 8 ? 4 : 6, dots = r < 8 ? 6 : 10, dot = Math.max(.6, r * .045);
    for (let i = 0; i < rows; i++) {
      const u = (i + .5) / rows * 2 - 1;
      for (let s = 0; s < dots; s++) {
        const f = (s + .5) / dots, yy = (f * 2 - 1) * ry * .86, xx = u * rx * .92 * Math.sqrt(Math.max(0, 1 - Math.pow(yy / ry, 2)));
        const col = JELLY.rainbow[Math.floor(mod(f * 12 - t * 6 + i * 2 + j.seed, 12))], tw = .5 + .5 * Math.sin(t * 5 - f * 8 + i);
        g.fillStyle = css(col, a * (.25 + .55 * tw)); g.beginPath(); g.arc(xx, yy, dot, 0, TAU); g.fill();
      }
    }
  }
  g.restore();
}
