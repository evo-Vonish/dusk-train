/* 第十棒第三版 · 四季：山、星、月，和「定格的晚霞」
   · 远山：冬天山顶积雪（远的那层白得多），春天近的那层山坡上一点点樱花，秋天一点点红叶；
   · 星：冬天的星更亮更多，春天的星隔着一层霾；冬夜能认出猎户座，夏夜能认出夏季大三角；
   · 月：春天的月亮带一圈晕（朦胧月），秋天的月亮更大；
   · 定格的晚霞：原来那张黄昏的画只在这一刻出现——在暮海的黄昏，偶尔，晚霞停住，像一张照片，二十几秒后又动起来。 */
function buildLandscape() {
  landLayers = [];
  for (let layer = 0; layer < 2; layer++) {
    const tile = document.createElement('canvas');
    const width = Math.ceil(S.ref * 4), height = Math.max(1, Math.ceil(S.ref * 0.15));
    tile.width = width; tile.height = height;
    const g = tile.getContext('2d');
    const ridge = x => {
      const a = x / width * TAU;
      return height * (0.76 - 0.17 * Math.sin(a + layer * 2) - 0.11 * Math.sin(3 * a + 1) - 0.045 * Math.cos(7 * a));
    };
    g.fillStyle = layer ? '#444066' : '#7b527b';
    g.beginPath(); g.moveTo(0, height);
    for (let x = 0; x <= width; x += 2) g.lineTo(x, ridge(x));
    g.lineTo(width, height); g.closePath(); g.fill();
    if (layer === 1) {
      const rnd = mulberry32(204);
      for (let i = 0; i < 28; i++) {
        const x = rnd() * width, y = ridge(x), h = S.ref * (0.004 + rnd() * 0.013);
        g.fillRect(x, y - h, Math.max(1, h * 0.4), h + 2);
        if (i % 5 === 0) { g.fillStyle = '#deb18e'; g.fillRect(x, y - h * 0.5, 1.3, 1); g.fillStyle = '#444066'; }
      }
    }
    landLayers.push({ tile, width, height, depth: layer ? 0.09 : 0.035, snow: landSnow(width, height, ridge, layer), leaf: layer ? landLeaves(width, height, ridge) : null });
  }
}
// 积雪：山脊往下一截，峰顶厚、山腰薄，下沿参差
function landSnow(width, height, ridge, layer) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const g = c.getContext('2d'), rnd = mulberry32(611 + layer);
  const top = Math.min(...Array.from({ length: 64 }, (_, i) => ridge(i / 63 * width)));
  g.save(); g.beginPath(); g.moveTo(0, height); for (let x = 0; x <= width; x += 2) g.lineTo(x, ridge(x)); g.lineTo(width, height); g.closePath(); g.clip();
  g.fillStyle = '#f4f2fa'; g.beginPath(); g.moveTo(0, 0);
  for (let x = 0; x <= width; x += 3) {
    const r = ridge(x), peak = 1 - (r - top) / (height - top);                         // 1 在最高处
    const depth = height * (layer ? 0.05 : 0.1) * (0.35 + 1.4 * peak * peak) * (0.75 + 0.5 * Math.abs(Math.sin(x * 0.07 + Math.sin(x * 0.013) * 3)));
    g.lineTo(x, r + depth);
  }
  g.lineTo(width, 0); g.closePath(); g.fill();
  // 背阴的一面淡一点
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(150,160,200,0.35)';
  for (let x = 0; x < width; x += 6) { const r0 = ridge(x), r1 = ridge(x + 6); if (r1 < r0) g.fillRect(x, 0, 6, height); }     // 太阳在右边：朝左的坡背阴
  g.restore();
  return c;
}
// 樱花 / 红叶：近的那层山坡上的一点一点（白色画好，用的时候按季节上色：画两张）
function landLeaves(width, height, ridge) {
  const make = cols => {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const g = c.getContext('2d'), rnd = mulberry32(733);
    for (let i = 0; i < Math.round(width / (S.ref * 0.007)); i++) {
      const x = rnd() * width, r = ridge(x), y = r + (height - r) * (0.06 + rnd() * 0.7), s = S.ref * (0.0015 + rnd() * 0.0024);
      g.fillStyle = cols[Math.floor(rnd() * cols.length)];
      g.beginPath(); g.ellipse(x, y, s * 1.4, s, 0, 0, TAU); g.fill();
      if (rnd() < 0.5) { g.beginPath(); g.ellipse(x + s * 1.6, y + s * 0.4, s, s * 0.8, 0, 0, TAU); g.fill(); }
    }
    return c;
  };
  return { spring: make(['#f4b6c8', '#f8cad6', '#e99ab4']), autumn: make(['#d0503e', '#e2803c', '#d8a640', '#b8402e']) };
}
function drawLandscape(g) {
  const win = seasonWeight(3), spr = seasonWeight(0), aut = seasonWeight(2), lit = 1 - S.nightF * .55;
  landLayers.forEach((l, li) => {
    const offset = mod(S.camera * S.ref * l.depth, l.width), a = 0.30 + l.depth * 1.5;
    for (let x = offset - l.width; x < S.W + PAD; x += l.width) {
      if (S.dayF < 0.999) { g.globalAlpha = a * (1 - S.dayF); g.drawImage(l.tile, x, S.yM - l.height, l.width + 0.5, l.height); }
      if (S.dayF > 0.001 && landDay[li]) { g.globalAlpha = a * S.dayF; g.drawImage(landDay[li], x, S.yM - l.height, l.width + 0.5, l.height); }
      if (win > .02 && l.snow) { g.globalAlpha = win * (li ? .42 : .62) * lit * (.6 + .4 * S.dayF + .4 * (1 - S.dayF)); g.drawImage(l.snow, x, S.yM - l.height, l.width + 0.5, l.height); }
      if (l.leaf && spr > .02) { g.globalAlpha = spr * .7 * lit; g.drawImage(l.leaf.spring, x, S.yM - l.height, l.width + 0.5, l.height); }
      if (l.leaf && aut > .02) { g.globalAlpha = aut * .62 * lit; g.drawImage(l.leaf.autumn, x, S.yM - l.height, l.width + 0.5, l.height); }
    }
    g.globalAlpha = 1;
    if (li === 0) drawTownFar(g);   // 远山在两层山脊之间，视差才是对的
  });
  g.globalAlpha = 1;
  hitBg('ridge', 0, S.yM - S.ref * 0.1, S.W, S.ref * 0.1);
  if (win > .6) hitBg('snowpeak', 0, S.yM - S.ref * 0.14, S.W, S.ref * 0.06);
}

/* 星：按季节亮暗；冬夜的猎户座、夏夜的大三角 */
const ORION = [[-4.8, -7.4, [255, 182, 146], 1.5], [2.7, -6.35, [214, 226, 255], 1.1], [-1.2, 1.94, [220, 230, 255], 1.05], [-0.05, 1.2, [220, 230, 255], 1.1], [1, 0.3, [220, 230, 255], 1], [-2.9, 9.67, [214, 226, 255], 1], [5.4, 8.2, [196, 218, 255], 1.45]];
const SUMMER_TRI = [[13.1, -7.8, [214, 230, 255], 1.5], [-10.1, -14.3, [232, 236, 255], 1.25], [-1.7, 22.1, [244, 244, 255], 1.35]];
function drawStars(g) {
  const sb = seasonNum(P => P.stars);
  const boost = (0.25 + S.nightF * 0.95) * (1 - S.dayF) * (1 - S.rainI * .85) * (1 - S.stormF) * sb; // stars wake up as night falls, and sleep in the town's afternoon
  if (boost <= 0.01) return;
  for (const st of stars) {
    const fade = 1 - st.y / (S.yM * 0.6); if (fade <= 0) continue;
    const tw = 0.5 + 0.5 * Math.sin(S.t * st.sp + st.ph);
    g.fillStyle = 'rgba(235,238,255,' + Math.min(1, fade * fade * tw * 0.7 * boost).toFixed(3) + ')';
    g.fillRect(st.x, st.y, st.s, st.s);
  }
  const nk = smooth((S.nightF - .35) / .4) * (1 - S.dayF) * (1 - S.rainI) * (1 - S.stormF) * (1 - NX.fog) * (1 - NX.galaxy * .5);
  if (nk < .02) return;
  const capTop = S.W <= 980 || S.H <= 480, { W, yM, ref, t } = S;
  const win = seasonWeight(3), sum = seasonWeight(1);
  if (win > .05) drawConstellation(g, ORION, W * (capTop ? .3 : .74), yM * .24, ref * .0075, win * nk, t, 'orion');
  if (sum > .05) drawConstellation(g, SUMMER_TRI, W * .5, yM * .22, ref * .0058, sum * nk, t, 'summertri');
}
function drawConstellation(g, list, cx, cy, deg, a, t, key) {
  list.forEach(([x, y, col, m], i) => {
    const X = cx + x * deg, Y = cy + y * deg, tw = .8 + .2 * Math.sin(t * (1.3 + i * .37) + i * 2.1), r = Math.max(.9, S.ref * .0016 * m);
    glow(g, glowSpr, X, Y, r * 9, r * 9, .28 * a * tw);
    g.fillStyle = css(col, Math.min(1, a * tw)); g.beginPath(); g.arc(X, Y, r, 0, TAU); g.fill();
  });
  if (key === 'orion') { glow(g, glowSprCyan, cx + 0.2 * deg, cy + 5.4 * deg, deg * 2.6, deg * 2.2, .3 * a); }   // 猎户座大星云，很淡的一团
  if (a > .5) { const xs = list.map(p => cx + p[0] * deg), ys = list.map(p => cy + p[1] * deg); hitAt(null, key, Math.min(...xs) - deg * 2, Math.min(...ys) - deg * 2, Math.max(...xs) - Math.min(...xs) + deg * 4, Math.max(...ys) - Math.min(...ys) + deg * 4); }
}

/* 定格的晚霞：暮海的黄昏，偶尔 */
function updateFrozen(dt) {
  const F = FROZEN;
  if (F.age >= 0) {
    F.age += dt;
    F.k = smooth(F.age / 3) * (1 - smooth((F.age - (F.dur - 3)) / 3));
    if (S.nightF > .3 || S.dayF > .1 || S.rainI > .3 || S.stormF > .05) F.age = Math.max(F.age, F.dur - 3);
    if (F.age >= F.dur) { F.age = -1; F.k = 0; }
    return;
  }
  const near = Math.round(S.travel / G()), off = Math.abs(S.travel / G() - near);
  if (stationName(near) !== '暮海' || off > .3 || near === F.at) return;
  F.at = near;                                                       // 每次经过暮海只抽一次签
  if (S.t < 120 || S.nightF > .15 || S.dayF > .05 || S.rainI > .1 || NX.active || S.t - F.seen < 600 || Math.random() > .4) return;   // 刚打开的时候不出现：开场就是活的天
  F.age = 0; F.seen = S.t; say('晚霞停住了，像一张照片。', 5200);
}
