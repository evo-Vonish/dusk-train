/* 第十棒第三版 · 四季：月台、站上的东西、她、猫、屋檐上的海鸟
   · 每个站都有的：冬天站棚顶上积雪、檐口挂冰柱、长椅上一层雪、候车室的窗结霜花、吊灯的光里飘着雪；
     秋天月台边落着几片叶子，墙边靠一把扫帚；春天站棚下有个燕子窝，三只小燕子探着头；夏天一根柱子上爬着夕颜（傍晚才开的白花）；
   · 各站自己的：暮海春天的老樱树、冬天的雪人、秋天檐下的一串柿子；月见秋天的月见团子；潮生夏天站在尺顶的白鹭、
     秋天的台风旗；听风夏天的鲤鱼旗、春天的风筝；拾光夏夜的萤火、冬天月台边的雪灯；
   · 她：春天头发上落着一片花瓣，夏天戴草帽，秋天系一条暗红的围巾，冬天裹着外套、呵出白气；
   · 猫：夏天摊在长椅下的阴影里，冬天缩成一团；屋檐上的三只海鸟冬天缩成三个圆球，背上落着雪。 */
function seasonDominant() { let b = 0, bw = -1; for (let i = 0; i < 4; i++) { const w = seasonWeight(i); if (w > bw) { bw = w; b = i; } } return b; }

function stationSeasonBack(g, P, index, name) {
  const spr = seasonWeight(0);
  if (name === '暮海' && spr > .03) drawSakura(g, P.roofX0 - S.ref * (S.portrait ? .012 : .055), index, spr);
}
function stationSeasonFront(g, P, index, name, benchX) {
  const { yM, ref, t } = S, span = P.roofX1 - P.roofX0, roofY = yM - P.sh;
  const spr = seasonWeight(0), sum = seasonWeight(1), aut = seasonWeight(2), win = seasonWeight(3);
  // 夏：夕颜爬在 0.36 那根柱子上
  if (sum > .03) drawMoonflower(g, lerp(P.roofX0, P.roofX1, .36), roofY, yM, sum, index);
  // 春、夏：燕子窝
  const nest = Math.max(spr, sum * .8);
  if (nest > .03) drawSwallowNest(g, lerp(P.roofX0, P.roofX1, .6), roofY + ref * .005, nest, index);      // 候车室左边，不压着钟
  // 秋：月台边的落叶，墙边一把扫帚
  if (aut > .03) {
    const rnd = mulberry32(index * 13 + 5), cols = [[200, 70, 50], [228, 128, 46], [222, 178, 62]];
    for (let i = 0; i < 9; i++) {
      const x = lerp(P.roofX0, P.roofX1, rnd()), r = ref * (.0045 + rnd() * .003);
      g.globalAlpha = aut * .95; g.fillStyle = css(mix(cols[i % 3], INK, .35 + .4 * S.nightF));
      g.save(); g.translate(x, yM - ref * .0045); g.scale(1, .32); g.rotate(rnd() * TAU); mapleLeaf(g, r); g.fill(); g.restore();
    }
    g.globalAlpha = aut;
    const bx = P.roomX - ref * .006;                                   // 扫帚靠在候车室的墙边
    g.strokeStyle = css(INK); g.lineWidth = Math.max(1, ref * .0016); g.beginPath(); g.moveTo(bx - ref * .004, yM - ref * .052); g.lineTo(bx + ref * .002, yM - ref * .012); g.stroke();
    g.fillStyle = css(mix(INK, [150, 120, 70], .35)); g.beginPath(); g.moveTo(bx - ref * .002, yM - ref * .014); g.lineTo(bx + ref * .009, yM); g.lineTo(bx - ref * .005, yM); g.closePath(); g.fill();
    g.globalAlpha = 1;
    if (aut > .5) hitAt(g, 'fallenleaves', P.roofX0, yM - ref * .012, span, ref * .014);
  }
  // 冬：站棚顶上的雪、檐下的冰柱、长椅上的雪、候车室窗上的霜花、吊灯光里的雪
  if (win > .03) {
    const a = win * .92;
    snowCap(g, P.roofX0 - ref * .006, P.roofX1 + ref * .006, roofY - ref * .006, ref * .0085, a);
    const rnd = mulberry32(index * 31 + 7);
    g.fillStyle = css([236, 242, 255], a * .85);
    for (let x = P.roofX0 + ref * .006; x < P.roofX1 - ref * .004; x += ref * (.006 + rnd() * .009)) {
      const L = ref * (.004 + rnd() * rnd() * .02), w = ref * (.0016 + rnd() * .0012);
      g.beginPath(); g.moveTo(x - w, roofY + ref * .005); g.lineTo(x + w, roofY + ref * .005); g.lineTo(x + w * .15, roofY + ref * .005 + L); g.closePath(); g.fill();
    }
    snowCap(g, benchX - ref * .002, benchX + ref * .077, yM - ref * .021, ref * .004, a * .9);
    snowCap(g, benchX + ref * .003, benchX + ref * .072, yM - ref * .035, ref * .003, a * .8);
    frostWindow(g, P, a);
    if (S.nightF > .2 || S.dayF < .5) [0.18, 0.52, 0.87].forEach((f, li) => lampSnow(g, lerp(P.roofX0, P.roofX1, f), roofY + ref * .016, yM, a * (1 - S.dayF), li + index * 3));
    if (win > .5) hitAt(g, 'icicles', P.roofX0, roofY - ref * .012, span, ref * .03);
  }
  // 各站自己的
  if (name === '暮海' && win > .03) drawSnowman(g, P.roofX0 + span * .06, yM, win, index);
  if (name === '暮海' && aut > .03) drawPersimmons(g, lerp(P.roofX0, P.roofX1, .955), roofY + ref * .005, aut, index);
  if (name === '月见' && aut > .03) drawDango(g, benchX + ref * .09, yM, aut);
  if (name === '潮生' && sum > .03) drawEgret(g, P.roofX1 + ref * (S.portrait ? .01 : .018), yM - ref * .078, sum);
  if (name === '潮生' && aut > .03) drawStormFlag(g, P.roofX1 + ref * (S.portrait ? .01 : .018), yM - ref * .078, aut);
  if (name === '听风' && sum > .03) drawKoinobori(g, P.roofX0 - ref * .02, yM, sum, index);
  if (name === '听风' && spr > .03) drawKite(g, P, spr, index);
  if ((name === '拾光' || name === '月见') && sum > .03) drawFireflies(g, P, benchX, sum, index, name === '拾光');
  if (name === '拾光' && win > .03) drawSnowLanterns(g, P, win, index);
}

/* 暮海的老樱树 */
function drawSakura(g, x, index, a) {
  const { yM, ref, t } = S, rnd = mulberry32(905 + index), night = S.nightF, day = S.dayF;
  const trunk = css(mix(INK, [60, 40, 40], day * .5)), sway = Math.sin(t * .7) * ref * .0012 * (1 + S.gust * 2);
  g.save(); g.globalAlpha = a;
  g.strokeStyle = trunk; g.lineCap = 'round'; g.lineWidth = Math.max(1.4, ref * .0055);
  g.beginPath(); g.moveTo(x, yM); g.quadraticCurveTo(x + ref * .006, yM - ref * .05, x - ref * .004, yM - ref * .09); g.stroke();
  g.lineWidth = Math.max(1, ref * .0028);
  const br = [[-.004, -.07, -.05, -.11], [-.002, -.08, .04, -.12], [-.004, -.09, -.01, -.14]];
  for (const [x0, y0, x1, y1] of br) { g.beginPath(); g.moveTo(x + x0 * ref, yM + y0 * ref); g.quadraticCurveTo(x + (x0 + x1) * .5 * ref, yM + (y0 + y1) * .5 * ref - ref * .01, x + x1 * ref + sway, yM + y1 * ref); g.stroke(); }
  // 花：枝头一簇一簇，深浅不一，簇和簇之间露出一点枝
  const c1 = mix(mix([248, 188, 206], [150, 120, 160], night * .75), [255, 214, 226], day * .4), c2 = mix(c1, [255, 240, 244], .5), c3 = mix(c1, [200, 120, 150], .35);
  const tips = [[-.05, -.112], [-.03, -.13], [.04, -.122], [.015, -.142], [-.012, -.148], [.055, -.105], [-.065, -.095]];
  for (const [tx, ty] of tips) {
    const cx0 = x + tx * ref + sway, cy0 = yM + ty * ref;
    for (let i = 0; i < 9; i++) {
      const ang = rnd() * TAU, d = Math.sqrt(rnd()) * ref * .022, r = ref * (.0055 + rnd() * .006);
      const px = cx0 + Math.cos(ang) * d, py = cy0 + Math.sin(ang) * d * .75;
      g.fillStyle = css(i % 4 === 0 ? c3 : i % 3 ? c1 : c2, .9); g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    }
  }
  // 树下落着的花瓣
  g.fillStyle = css(c2, .85);
  for (let i = 0; i < 10; i++) { const px = x + (rnd() - .5) * ref * .12, f = mod(t * (.05 + rnd() * .04) + rnd(), 1), py = yM - ref * .09 + f * ref * .09; g.globalAlpha = a * (1 - f * .3); g.beginPath(); g.ellipse(px + Math.sin(t + i) * ref * .006, py, ref * .002, ref * .0012, i, 0, TAU); g.fill(); }
  g.restore();
  if (a > .5) hitAt(g, 'sakura', x - ref * .07, yM - ref * .16, ref * .14, ref * .16);
}
/* 夕颜：傍晚才开的白花，藤缠在柱子上 */
function drawMoonflower(g, x, top, bot, a, index) {
  const { ref, t } = S, rnd = mulberry32(index * 17 + 2), open = clamp((1 - S.dayF) * 1.4, 0, 1);
  const leaf = css(mix(INK, [40, 70, 50], .35 + .3 * S.dayF)), flower = css(mix([246, 244, 236], [150, 156, 190], S.nightF * .5), .95);
  g.save(); g.globalAlpha = a;
  g.strokeStyle = leaf; g.lineWidth = Math.max(.7, ref * .001);
  g.beginPath(); for (let i = 0; i <= 24; i++) { const f = i / 24, y = lerp(bot, top + ref * .01, f), xx = x + Math.sin(f * 14 + index) * ref * .004; i ? g.lineTo(xx, y) : g.moveTo(xx, y); } g.stroke();
  for (let i = 0; i < 9; i++) {
    const f = .08 + i / 10, y = lerp(bot, top + ref * .012, f), side = i % 2 ? 1 : -1, xx = x + side * ref * .006;
    g.fillStyle = leaf; g.beginPath(); g.ellipse(xx, y, ref * .0045, ref * .0032, side * .6, 0, TAU); g.fill();
    if (i % 3 === 1) {                                               // 花：一只白色的小喇叭，傍晚慢慢张开
      const fx = x - side * ref * .008, r = ref * (.0028 + .0014 * open);
      glow(g, glowSpr, fx, y, r * 6, r * 6, .16 * open * (1 - S.dayF));
      g.fillStyle = flower; g.beginPath();
      for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * (.72 + .1 * open) : r; k ? g.lineTo(fx + Math.cos(an) * rr2, y + Math.sin(an) * rr2 * (.45 + .55 * open)) : g.moveTo(fx + Math.cos(an) * rr2, y + Math.sin(an) * rr2 * (.45 + .55 * open)); }
      g.closePath(); g.fill();
      g.fillStyle = css([236, 230, 170], .7); g.beginPath(); g.arc(fx, y, r * .22, 0, TAU); g.fill();
    }
  }
  g.restore();
  if (a > .5) hitAt(g, 'moonflower', x - ref * .015, top, ref * .03, bot - top);
}
/* 燕子窝：站棚底下一个泥窝，三只小燕子探着头 */
function drawSwallowNest(g, x, y, a, index) {
  const { ref, t } = S, s = ref * .0075;
  g.save(); g.globalAlpha = a;
  g.fillStyle = css(mix(INK, [110, 86, 70], .35 + .3 * S.dayF));
  g.beginPath(); g.moveTo(x - s * 1.6, y); g.quadraticCurveTo(x - s * 1.4, y + s * 1.5, x, y + s * 1.6); g.quadraticCurveTo(x + s * 1.4, y + s * 1.5, x + s * 1.6, y); g.closePath(); g.fill();
  for (let i = 0; i < 3; i++) {
    const hx = x + (i - 1) * s * .9, beg = Math.max(0, Math.sin(t * 2.2 + i * 2.1 + index)), hy = y - s * (.15 + .25 * beg);
    g.fillStyle = css(INK); g.beginPath(); g.arc(hx, hy, s * .42, 0, TAU); g.fill();
    g.fillStyle = 'rgba(250,206,90,0.95)';                                // 张开的黄嘴
    g.beginPath(); g.moveTo(hx - s * .25, hy + s * .05); g.lineTo(hx, hy - s * (.05 + .25 * beg)); g.lineTo(hx + s * .25, hy + s * .05); g.closePath(); g.fill();
  }
  // 大燕子隔一会儿飞回来一趟
  const k = mod(t / 9 + index * .3, 1);
  if (k < .22) {
    const f = k / .22, bx = x + (1 - f) * ref * .18, by = y + Math.sin(f * Math.PI) * ref * .03 - ref * .01, wing = Math.sin(t * 22) * s * .8;
    g.fillStyle = css(INK); g.beginPath(); g.moveTo(bx - s * 1.4, by + wing); g.quadraticCurveTo(bx, by - s * .4, bx + s * 1.6, by - wing * .6); g.lineTo(bx + s * 2.2, by + s * .5); g.lineTo(bx + s * 1.5, by + s * .2); g.quadraticCurveTo(bx, by + s * .3, bx - s * 1.4, by + wing); g.fill();
  }
  g.restore();
  if (a > .5) hitAt(g, 'swallows', x - s * 2.4, y - s * 1, s * 4.8, s * 3);
}
/* 冬：候车室窗上的霜花；屋里的炉火把窗映得更橙 */
function frostWindow(g, P, a) {
  const { ref } = S, roomTop = S.yM - P.roomH, wx = P.roomX + P.roomW * .18, wy = roomTop + P.roomH * .24, ww = P.roomW * .34, wh = P.roomH * .34;
  g.save(); rr(g, wx, wy, ww, wh, ref * .002); g.clip();
  const lit = 1 - S.dayF;
  if (lit > .05) { const st = g.createLinearGradient(0, wy + wh * .4, 0, wy + wh); st.addColorStop(0, 'rgba(255,150,80,0)'); st.addColorStop(1, 'rgba(255,140,70,' + (.35 * lit * a).toFixed(3) + ')'); g.fillStyle = st; g.fillRect(wx, wy, ww, wh); }
  for (const [cx, cy] of [[wx, wy + wh], [wx + ww, wy + wh], [wx, wy], [wx + ww, wy]]) {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, ww * .55);
    gr.addColorStop(0, 'rgba(236,244,255,' + (.75 * a).toFixed(3) + ')'); gr.addColorStop(.6, 'rgba(230,240,255,' + (.25 * a).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(230,240,255,0)');
    g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
  }
  g.strokeStyle = 'rgba(244,250,255,' + (.55 * a).toFixed(3) + ')'; g.lineWidth = Math.max(.5, ref * .0005);
  const rnd = mulberry32(77);
  for (let i = 0; i < 7; i++) {                                         // 几道羽毛一样的冰纹
    const sx = wx + (i % 2 ? ww : 0), sy = wy + wh * (.55 + rnd() * .45), ang = (i % 2 ? Math.PI : 0) - .5 - rnd() * .5, L = ww * (.2 + rnd() * .2);
    g.beginPath(); g.moveTo(sx, sy); const ex = sx + Math.cos(ang) * L, ey = sy + Math.sin(ang) * L; g.lineTo(ex, ey);
    for (let k = 1; k < 4; k++) { const px = sx + (ex - sx) * k / 4, py = sy + (ey - sy) * k / 4; g.moveTo(px, py); g.lineTo(px + Math.cos(ang - .7) * L * .22, py + Math.sin(ang - .7) * L * .22); g.moveTo(px, py); g.lineTo(px + Math.cos(ang + .7) * L * .22, py + Math.sin(ang + .7) * L * .22); }
    g.stroke();
  }
  g.restore();
}
/* 吊灯的光里飘着雪：光照到的那几片才亮 */
function lampSnow(g, lx, ly, yM, a, seed) {
  const { ref, t } = S, h = yM - ly;
  if (a < .03) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,214,' + (.85 * a).toFixed(3) + ')';
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const f = mod(t * (.12 + (i % 3) * .03) + i * .137 + seed * .21, 1), y = ly + f * h, half = ref * (.007 + f * .043);
    const x = lx + Math.sin(i * 7.3 + seed + t * .7) * half * .8, r = Math.max(.6, ref * (.0011 + (i % 3) * .0003));
    g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
  }
  g.fill(); g.restore();
}
/* 暮海的雪人 */
function drawSnowman(g, x, yM, a, index) {
  const { ref } = S, s = ref * .012, night = S.nightF, day = S.dayF;
  const snow = css(mix(mix([236, 232, 248], [150, 160, 204], night), [250, 252, 255], day)), shade = css(mix(mix([176, 170, 214], [80, 90, 140], night), [196, 210, 228], day));
  g.save(); g.globalAlpha = a;
  g.fillStyle = snow; g.beginPath(); g.arc(x, yM - s * 1.15, s * 1.25, 0, TAU); g.fill(); g.beginPath(); g.arc(x, yM - s * 3.05, s * .85, 0, TAU); g.fill();
  g.fillStyle = shade; g.beginPath(); g.arc(x - s * .25, yM - s * 1.0, s * 1.1, Math.PI * .35, Math.PI * 1.1); g.fill();
  g.fillStyle = css(INK); g.beginPath(); g.moveTo(x - s * .75, yM - s * 3.65); g.lineTo(x + s * .75, yM - s * 3.65); g.lineTo(x + s * .55, yM - s * 4.5); g.lineTo(x - s * .55, yM - s * 4.5); g.closePath(); g.fill();   // 水桶
  g.fillStyle = css(mix([196, 54, 46], INK, night * .5)); g.fillRect(x - s * .8, yM - s * 2.35, s * 1.6, s * .3); g.fillRect(x + s * .3, yM - s * 2.35, s * .3, s * .9);   // 红围巾
  g.fillStyle = css(INK); g.beginPath(); g.arc(x - s * .3, yM - s * 3.15, s * .09, 0, TAU); g.arc(x + s * .2, yM - s * 3.15, s * .09, 0, TAU); g.fill();
  g.fillStyle = 'rgba(232,120,60,0.9)'; g.beginPath(); g.moveTo(x - s * .05, yM - s * 2.95); g.lineTo(x - s * .7, yM - s * 2.85); g.lineTo(x - s * .05, yM - s * 2.8); g.closePath(); g.fill();   // 胡萝卜鼻子朝车头
  g.strokeStyle = css(INK); g.lineWidth = Math.max(.8, s * .12); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - s * 1.1, yM - s * 1.9); g.lineTo(x - s * 2.1, yM - s * 2.6); g.moveTo(x + s * 1.1, yM - s * 1.9); g.lineTo(x + s * 2, yM - s * 2.4); g.stroke();
  g.restore();
  if (a > .5) hitAt(g, 'snowman', x - s * 2.2, yM - s * 4.6, s * 4.4, s * 4.6);
}
/* 暮海檐下的一串柿子 */
function drawPersimmons(g, x, y, a, index) {
  const { ref, t } = S, sway = Math.sin(t * 1.1 + index) * ref * .002 * (1 + S.gust * 1.5), lit = 1 - S.nightF * .55;
  g.save(); g.globalAlpha = a;
  g.strokeStyle = css(INK, .9); g.lineWidth = Math.max(.6, ref * .0008); g.beginPath(); g.moveTo(x, y); g.lineTo(x + sway, y + ref * .062); g.stroke();
  for (let i = 0; i < 6; i++) {
    const f = (i + .7) / 6.5, px = x + sway * f + (i % 2 ? 1 : -1) * ref * .0035, py = y + ref * .062 * f, r = ref * .0042;
    g.fillStyle = css(mix(mix([214, 98, 40], INK, .25), [238, 128, 52], lit * .8)); g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    g.fillStyle = css(mix(INK, [70, 90, 50], .4)); g.fillRect(px - r * .45, py - r * 1.05, r * .9, r * .35);
  }
  g.restore();
  if (a > .5) hitAt(g, 'persimmons', x - ref * .012, y, ref * .024, ref * .066);
}
/* 月见的月见团子：三方台上十五颗白团子，旁边插着芒草 */
function drawDango(g, x, yM, a) {
  const { ref } = S, s = ref * .0042, night = S.nightF;
  const wood = css(mix(INK, [150, 110, 70], .45 + .3 * S.dayF)), white = css(mix([244, 238, 226], [170, 172, 200], night * .55));
  g.save(); g.globalAlpha = a;
  g.fillStyle = wood; g.fillRect(x - s * 4, yM - s * 4, s * 8, s * 1.1); g.fillRect(x - s * 3, yM - s * 3, s * 6, s * 3);
  if (S.nightF > .3) glow(g, glowSpr, x, yM - s * 7, s * 18, s * 12, .12 * a);
  g.fillStyle = white;
  const rows = [[3, -4.9], [3, -6.4], [2, -7.9], [1, -9.3]];
  for (const [n, yy] of rows) for (let i = 0; i < n; i++) { g.beginPath(); g.arc(x + (i - (n - 1) / 2) * s * 1.55, yM + yy * s, s * .8, 0, TAU); g.fill(); }
  g.restore();
  if (a > .5) hitAt(g, 'dango', x - s * 4.5, yM - s * 10.5, s * 9, s * 10.5);
}
/* 潮生：夏天尺顶站着一只白鹭；秋天挂一面台风旗 */
function drawEgret(g, x, y, a) {
  const { ref, t } = S, s = ref * .009, day = S.dayF;
  const white = css(mix(mix([236, 234, 244], [150, 158, 200], S.nightF), [252, 252, 252], day));
  g.save(); g.globalAlpha = a; g.translate(x, y - ref * .004);
  g.strokeStyle = css(INK); g.lineWidth = Math.max(.6, s * .1); g.beginPath(); g.moveTo(-s * .1, 0); g.lineTo(-s * .15, -s * 1.1); g.moveTo(s * .15, 0); g.lineTo(s * .1, -s * 1.1); g.stroke();
  g.fillStyle = white; g.beginPath(); g.ellipse(0, -s * 1.5, s * .9, s * .45, -.25, 0, TAU); g.fill();
  const look = Math.sin(t * .3) > .7 ? 1 : 0;                                 // 偶尔把脖子伸直看一看
  g.strokeStyle = white; g.lineWidth = Math.max(.8, s * .22); g.lineCap = 'round';
  g.beginPath(); g.moveTo(-s * .6, -s * 1.7); g.quadraticCurveTo(-s * (1.2 + look * .2), -s * (2.4 + look * .6), -s * (.8 + look * .3), -s * (2.9 + look * .5)); g.stroke();
  g.fillStyle = 'rgba(230,180,70,0.9)'; g.beginPath(); g.moveTo(-s * (.8 + look * .3), -s * (2.95 + look * .5)); g.lineTo(-s * (1.6 + look * .3), -s * (2.85 + look * .5)); g.lineTo(-s * (.8 + look * .3), -s * (2.8 + look * .5)); g.fill();
  g.restore();
  if (a > .5) hitAt(g, 'egret', x - s * 1.8, y - s * 3.6, s * 3, s * 3.6);
}
function drawStormFlag(g, x, y, a) {
  const { ref, t } = S, wave = Math.sin(t * 6) * ref * .002;
  g.save(); g.globalAlpha = a;
  g.strokeStyle = css(INK); g.lineWidth = Math.max(.7, ref * .001); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - ref * .03); g.stroke();
  g.fillStyle = css(mix([200, 50, 44], INK, S.nightF * .5));
  g.beginPath(); g.moveTo(x, y - ref * .03); g.quadraticCurveTo(x - ref * .012, y - ref * .028 + wave, x - ref * .022, y - ref * .024 + wave); g.lineTo(x, y - ref * .018); g.closePath(); g.fill();
  g.restore();
}
/* 听风：夏天的鲤鱼旗，春天的风筝 */
function drawKoinobori(g, x, yM, a, index) {
  const { ref, t } = S, top = yM - ref * .16, wind = .35 + S.gust * .65;
  g.save(); g.globalAlpha = a;
  g.strokeStyle = css(INK); g.lineWidth = Math.max(1, ref * .0018); g.beginPath(); g.moveTo(x, yM); g.lineTo(x, top); g.stroke();
  g.fillStyle = css([255, 214, 120], .8); g.beginPath(); g.arc(x, top - ref * .003, ref * .0025, 0, TAU); g.fill();
  const cols = [[30, 34, 60], [196, 60, 54], [64, 110, 190]];
  cols.forEach((c, i) => {
    const y = top + ref * (.012 + i * .02), L = ref * (.05 - i * .007), droop = (1 - wind) * L * .5;
    const col = css(mix(mix(c, INK, .3 + .3 * S.nightF), c, S.dayF));
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y - ref * .006);
    for (let k = 1; k <= 8; k++) { const f = k / 8, xx = x - L * f, yy = y - ref * .006 * (1 - f) + Math.sin(t * 5 - f * 6 + i) * ref * .003 * f + droop * f * f; g.lineTo(xx, yy); }
    for (let k = 8; k >= 0; k--) { const f = k / 8, xx = x - L * f, yy = y + ref * .006 * (1 - f * .6) + Math.sin(t * 5 - f * 6 + i) * ref * .003 * f + droop * f * f; g.lineTo(xx, yy); }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - ref * .006, y - ref * .001, ref * .0016, 0, TAU); g.fill();   // 眼睛
  });
  g.restore();
  if (a > .5) hitAt(g, 'koinobori', x - ref * .055, top - ref * .01, ref * .06, ref * .07);
}
function drawKite(g, P, a, index) {
  const { yM, ref, t } = S, ax = lerp(P.roofX0, P.roofX1, .2), ay = yM - ref * .004;
  const kx = ax - ref * .18 + Math.sin(t * .4) * ref * .02, ky = yM * .38 + Math.sin(t * .55) * ref * .015;
  g.save(); g.globalAlpha = a;
  g.strokeStyle = 'rgba(236,226,214,0.45)'; g.lineWidth = Math.max(.5, ref * .0006); g.beginPath(); g.moveTo(ax, ay - ref * .03); g.quadraticCurveTo((ax + kx) / 2, (ay + ky) / 2 + ref * .06, kx, ky); g.stroke();
  g.translate(kx, ky); g.rotate(Math.sin(t * .9) * .15);
  g.fillStyle = css(mix([214, 74, 64], INK, S.nightF * .5)); g.beginPath(); g.moveTo(0, -ref * .018); g.lineTo(ref * .012, 0); g.lineTo(0, ref * .02); g.lineTo(-ref * .012, 0); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,240,220,0.6)'; g.beginPath(); g.moveTo(0, -ref * .018); g.lineTo(0, ref * .02); g.moveTo(-ref * .012, 0); g.lineTo(ref * .012, 0); g.stroke();
  g.strokeStyle = css(mix([214, 74, 64], INK, S.nightF * .5)); g.beginPath(); g.moveTo(0, ref * .02); for (let k = 1; k <= 6; k++) g.lineTo(Math.sin(t * 4 + k) * ref * .004, ref * (.02 + k * .008)); g.stroke();
  g.restore();
  if (a > .5) hitAt(g, 'kite', kx - ref * .015, ky - ref * .02, ref * .03, ref * .07);
}
/* 拾光、月见：夏夜的萤火——草丛里慢慢升起来，有几只钻进长椅上的光瓶 */
function drawFireflies(g, P, benchX, a, index, jars) {
  const { yM, ref, t } = S, on = smooth((S.nightF - .3) / .4) * (1 - S.dayF) * (1 - S.rainI) * a;
  if (on < .02) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const rnd = mulberry32(index * 7 + 41), n = 24;
  for (let i = 0; i < n; i++) {
    const bx = lerp(P.roofX0 - ref * .12, P.roofX1 + ref * .08, rnd()), by = yM - ref * (.004 + rnd() * .06), ph = rnd() * TAU, sp = .3 + rnd() * .4;
    let x = bx + Math.sin(t * sp + ph) * ref * .02, y = by + Math.sin(t * sp * 1.3 + ph * 2) * ref * .01;
    if (jars && i < 3) { const k = smooth(mod(t * .05 + i * .33, 1) * 1.6); x = lerp(x, benchX + ref * (.016 + i * .018), k); y = lerp(y, yM - ref * .027, k); }
    const blink = Math.pow(.5 + .5 * Math.sin(t * (1.7 + rnd()) + ph), 3);
    glow(g, glowSpr, x, y, ref * .026, ref * .026, .6 * on * blink);
    const fr = Math.max(.9, ref * .0013);
    g.fillStyle = 'rgba(214,255,150,' + (.95 * on * blink).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, fr, 0, TAU); g.fill();
  }
  g.restore();
  if (on > .4) hitAt(g, 'fireflies', P.roofX0 - ref * .1, yM - ref * .07, P.roofX1 - P.roofX0 + ref * .16, ref * .07);
}
/* 拾光冬天：月台边一排雪灯 */
function drawSnowLanterns(g, P, a, index) {
  const { yM, ref, t } = S, lit = 1 - S.dayF * .8;
  for (let i = 0; i < 4; i++) {
    const x = lerp(P.roofX0, P.roofX1, .22 + i * .1), s = ref * .007;
    g.globalAlpha = a; g.fillStyle = css(mix([232, 232, 248], [150, 160, 204], S.nightF));
    g.beginPath(); g.moveTo(x - s * 1.2, yM); g.quadraticCurveTo(x - s * 1.3, yM - s * 2.2, x, yM - s * 2.5); g.quadraticCurveTo(x + s * 1.3, yM - s * 2.2, x + s * 1.2, yM); g.closePath(); g.fill();
    const fl = .8 + .2 * Math.sin(t * 7 + i * 3);
    g.fillStyle = css(mix(INK, [60, 50, 70], .4), a); g.beginPath(); g.arc(x, yM - s * 1.05, s * .5, 0, TAU); g.fill();      // 雪灯的小窗洞
    glow(g, glowSpr, x, yM - s * 1.05, s * 5, s * 4, .32 * lit * fl * a);
    g.fillStyle = 'rgba(255,214,140,' + (.9 * lit * fl).toFixed(3) + ')'; g.beginPath(); g.ellipse(x, yM - s * 1.0, s * .18, s * .3, 0, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  if (a > .5) hitAt(g, 'snowlanterns', lerp(P.roofX0, P.roofX1, .2), yM - ref * .025, (P.roofX1 - P.roofX0) * .34, ref * .025);
}

/* 她：随季节换一点点 */
function girlSeason(g, gx, gy, gh, sway) {
  const { ref, t } = S, spr = seasonWeight(0), sum = seasonWeight(1), aut = seasonWeight(2), win = seasonWeight(3);
  if (spr > .3) { g.fillStyle = css([255, 190, 210], .9 * spr); g.beginPath(); g.ellipse(gx + gh * .07, gy - gh * .9, gh * .028, gh * .016, .6, 0, TAU); g.fill(); }   // 头发上的一片花瓣
  if (sum > .3) {                                                          // 草帽
    g.globalAlpha = smooth((sum - .3) / .3);
    g.fillStyle = css(INK); g.beginPath(); g.ellipse(gx + gh * .01, gy - gh * .89, gh * .2, gh * .032, -.06, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(gx + gh * .01, gy - gh * .91, gh * .09, gh * .06, 0, Math.PI, TAU); g.fill();
    g.strokeStyle = 'rgba(255,200,150,0.45)'; g.lineWidth = Math.max(.6, gh * .012); g.beginPath(); g.moveTo(gx - gh * .17, gy - gh * .895); g.lineTo(gx + gh * .2, gy - gh * .905); g.stroke();
    g.fillStyle = 'rgba(196,72,64,0.8)'; g.fillRect(gx - gh * .08, gy - gh * .92, gh * .17, gh * .012);   // 帽子上的一圈红缎带
    g.globalAlpha = 1;
  }
  const scarf = Math.max(aut, win);
  if (scarf > .3) {                                                         // 围巾：秋天暗红，冬天米白，一头被风吹起来
    const k = smooth((scarf - .3) / .3), col = aut > win ? mix([150, 46, 46], INK, .35) : mix([226, 214, 196], INK, .25 + .35 * S.nightF);
    g.globalAlpha = k; g.fillStyle = css(col);
    g.beginPath(); g.ellipse(gx, gy - gh * .71, gh * .075, gh * .03, 0, 0, TAU); g.fill();
    const fl = Math.sin(t * 3 + (S.gustI || 0) * 4) * gh * .03 * (1 + S.gust * 2);
    g.beginPath(); g.moveTo(gx + gh * .03, gy - gh * .72); g.quadraticCurveTo(gx + gh * .16, gy - gh * .74 + fl, gx + gh * .25 + sway * 2, gy - gh * .68 + fl * 1.5);
    g.lineTo(gx + gh * .24 + sway * 2, gy - gh * .64 + fl * 1.5); g.quadraticCurveTo(gx + gh * .14, gy - gh * .68 + fl, gx + gh * .03, gy - gh * .68); g.closePath(); g.fill();
    g.globalAlpha = 1;
  }
  if (win > .3) {                                                           // 冬：厚外套（下摆宽一点），呵出的白气
    g.globalAlpha = smooth((win - .3) / .3); g.fillStyle = css(INK);
    g.beginPath(); g.moveTo(gx - gh * .07, gy - gh * .7); g.quadraticCurveTo(gx - gh * .15 - sway, gy - gh * .4, gx - gh * .16 - sway, gy - gh * .2); g.lineTo(gx + gh * .13 + sway, gy - gh * .2); g.quadraticCurveTo(gx + gh * .1 + sway, gy - gh * .45, gx + gh * .06, gy - gh * .7); g.closePath(); g.fill();
    const k = mod(t / 3.2, 1);
    if (k < .5) { const f = k / .5; g.globalAlpha = (1 - f) * .45 * win; glow(g, mistSprite(), gx - gh * (.16 + f * .2), gy - gh * (.8 + f * .08), gh * (.08 + f * .2), gh * (.06 + f * .14), 1); }
    g.globalAlpha = 1;
  }
}

/* 屋檐上的三只海鸟：冬天缩成三个圆球，背上落着雪 */
function drawRoofBirds(g, P, index) {
  const size = S.ref * 0.009, win = seasonWeight(3), puff = win;
  if (!(roofFlock && roofFlock.index === index)) { const h0 = roofBirdHome(P, 0), h2 = roofBirdHome(P, 2); hitAt(g, 'roofbirds', h0.x - size * 1.1, h0.y - size * 1.25, h2.x - h0.x + size * 2.2, size * 1.35); }
  for (let i = 0; i < 3; i++) {
    if (roofFlock && roofFlock.index === index && roofFlock.age > i * 0.19 && roofFlock.age < roofFlock.life - (2 - i) * 0.2) continue;
    const home = roofBirdHome(P, i), turn = Math.sin(S.t * 0.38 + i * 2.3) > 0.82 ? 1 : -1;
    g.save(); g.translate(home.x, home.y); g.scale(turn, 1);
    g.fillStyle = '#131a35';
    g.beginPath(); g.ellipse(0, -size * (0.4 + 0.12 * puff), size * (0.7 + 0.06 * puff), size * (0.37 + 0.2 * puff), -0.12 * (1 - puff), 0, TAU); g.fill();
    g.beginPath(); g.arc(size * (0.44 - 0.1 * puff), -size * (0.78 - 0.06 * puff), size * 0.26, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(size * (0.63 - 0.1 * puff), -size * (0.82 - 0.06 * puff)); g.lineTo(size * (0.98 - 0.12 * puff), -size * (0.74 - 0.06 * puff)); g.lineTo(size * (0.59 - 0.1 * puff), -size * (0.67 - 0.06 * puff)); g.fill();
    g.strokeStyle = 'rgba(232,200,172,0.45)'; g.lineWidth = Math.max(0.65, size * 0.11);
    g.beginPath(); g.moveTo(-size * 0.5, -size * 0.54); g.quadraticCurveTo(0, -size * (0.91 + 0.15 * puff), size * 0.35, -size * 0.56); g.stroke();
    if (win > .1) { g.fillStyle = css([240, 244, 255], .85 * win); g.beginPath(); g.ellipse(-size * .1, -size * (0.86 + .1 * puff), size * .45, size * .12, -.1, 0, TAU); g.fill(); }
    g.restore();
  }
}

/* 猫：夏天摊在长椅下的阴影里，冬天缩成一团，春秋照旧坐着看海 */
function drawCat(g, P, index) {
  if (mod(index, 3) !== 2) return;
  const { yM, ref, t } = S, gh = ref * 0.030, cx = lerp(P.roofX0, P.roofX1, 0.30), cy = yM - ref * 0.004, d = seasonDominant();
  if (d === 0 || d === 2) return drawCatSitting(g, P, index);
  hitAt(g, 'cat', cx - gh * 0.6, cy - gh * 0.6, gh * 1.4, gh * 0.6);
  g.save(); g.translate(cx, cy); g.fillStyle = css(INK, 0.96);
  if (d === 1) {                                                              // 夏：侧躺，摊成长长一条
    const br = Math.sin(t * 1.1) * gh * 0.015;
    g.beginPath(); g.ellipse(gh * 0.1, -gh * 0.14 - br, gh * 0.5, gh * 0.14 + br, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(-gh * 0.42, -gh * 0.17, gh * 0.15, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-gh * 0.52, -gh * 0.26); g.lineTo(-gh * 0.6, -gh * 0.42); g.lineTo(-gh * 0.42, -gh * 0.3); g.moveTo(-gh * 0.36, -gh * 0.3); g.lineTo(-gh * 0.34, -gh * 0.46); g.lineTo(-gh * 0.24, -gh * 0.27); g.fill();
    g.strokeStyle = css(INK, 0.96); g.lineWidth = Math.max(1.1, gh * 0.08); g.lineCap = 'round';
    g.beginPath(); g.moveTo(gh * 0.58, -gh * 0.1); g.quadraticCurveTo(gh * 0.85, -gh * 0.06 + Math.sin(t * 0.7) * gh * 0.1, gh * 0.95, -gh * 0.16); g.stroke();
  } else {                                                                     // 冬：缩成一团，尾巴盖住鼻子
    g.beginPath(); g.ellipse(0, -gh * 0.22, gh * 0.36, gh * 0.23, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(-gh * 0.26, -gh * 0.24, gh * 0.15, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-gh * 0.36, -gh * 0.34); g.lineTo(-gh * 0.4, -gh * 0.5); g.lineTo(-gh * 0.26, -gh * 0.38); g.moveTo(-gh * 0.22, -gh * 0.38); g.lineTo(-gh * 0.16, -gh * 0.52); g.lineTo(-gh * 0.1, -gh * 0.34); g.fill();
    g.strokeStyle = css(INK, 0.96); g.lineWidth = Math.max(1.1, gh * 0.09); g.lineCap = 'round';
    g.beginPath(); g.moveTo(gh * 0.3, -gh * 0.12); g.quadraticCurveTo(gh * 0.1, gh * 0.02, -gh * 0.3, -gh * 0.1); g.stroke();
    g.fillStyle = css([240, 244, 255], 0.6 * seasonWeight(3)); g.beginPath(); g.ellipse(gh * 0.02, -gh * 0.42, gh * 0.18, gh * 0.04, 0, 0, TAU); g.fill();
  }
  g.restore();
}

function drawCatSitting(g, P, index) {      // 原来的坐姿（春、秋）
  // every third platform has a cat watching the sea; it never boards
  if (mod(index, 3) !== 2) return;
  const { yM, ref, t } = S;
  const gh = ref * 0.030;
  const cx = lerp(P.roofX0, P.roofX1, 0.30), cy = yM - ref * 0.004;
  const wag = Math.sin(t * 0.85 + index * 2.3) * gh * 0.18;
  hitAt(g, 'cat', cx - gh * 0.4, cy - gh * 0.98, gh * 1.16, gh * 0.98);
  g.save(); g.translate(cx, cy);
  g.fillStyle = css(INK, 0.96);
  // sitting haunches, chest facing the coming train
  g.beginPath();
  g.moveTo(-gh * 0.16, 0);
  g.quadraticCurveTo(-gh * 0.20, -gh * 0.34, -gh * 0.12, -gh * 0.52);
  g.quadraticCurveTo(gh * 0.02, -gh * 0.66, gh * 0.26, -gh * 0.56);
  g.quadraticCurveTo(gh * 0.44, -gh * 0.44, gh * 0.40, 0);
  g.closePath(); g.fill();
  // head and ears
  const hx = -gh * 0.14, hy = -gh * 0.66;
  g.beginPath(); g.arc(hx, hy, gh * 0.185, 0, TAU); g.fill();
  g.beginPath();
  g.moveTo(hx - gh * 0.15, hy - gh * 0.07); g.lineTo(hx - gh * 0.17, hy - gh * 0.30); g.lineTo(hx + gh * 0.01, hy - gh * 0.14);
  g.moveTo(hx + gh * 0.05, hy - gh * 0.13); g.lineTo(hx + gh * 0.15, hy - gh * 0.31); g.lineTo(hx + gh * 0.20, hy - gh * 0.06);
  g.closePath(); g.fill();
  // tail curled around the paws, the tip swaying slowly
  g.strokeStyle = css(INK, 0.96); g.lineWidth = Math.max(1.1, gh * 0.085); g.lineCap = 'round';
  g.beginPath();
  g.moveTo(gh * 0.36, -gh * 0.02);
  g.quadraticCurveTo(gh * 0.72, -gh * 0.10, gh * 0.66, -gh * 0.38);
  g.quadraticCurveTo(gh * 0.63, -gh * 0.55, gh * 0.42 + wag, -gh * 0.56);
  g.stroke();
  // a whisker of warm platform light along the chest
  g.strokeStyle = 'rgba(255,190,150,' + (0.20 + S.nightF * 0.12).toFixed(3) + ')';
  g.lineWidth = Math.max(0.8, gh * 0.03);
  g.beginPath(); g.moveTo(-gh * 0.17, -gh * 0.06); g.quadraticCurveTo(-gh * 0.20, -gh * 0.3, -gh * 0.13, -gh * 0.5); g.stroke();
  g.restore();
}

/* 车身上一块小圆牌，跟着季节换图：樱、烟花、红叶、雪花 */
function tramSeasonMark(g, x, y, r) {
  const ws = [0, 1, 2, 3].map(seasonWeight), day = S.dayF, lit = .75 + .25 * (1 - S.nightF);
  g.save();
  g.fillStyle = css(mix([20, 26, 56], [36, 48, 90], day)); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(214,180,112,0.85)'; g.lineWidth = Math.max(.6, r * .14); g.stroke();
  if (ws[0] > .01) {                                                   // 樱
    g.globalAlpha = ws[0] * lit; g.fillStyle = '#f4b6c8';
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .38, y + Math.sin(a) * r * .38, r * .3, r * .2, a, 0, TAU); g.fill(); }
    g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(x, y, r * .14, 0, TAU); g.fill();
  }
  if (ws[1] > .01) {                                                   // 烟花
    g.globalAlpha = ws[1] * lit; g.strokeStyle = '#ffd27a'; g.lineWidth = Math.max(.5, r * .1); g.lineCap = 'round';
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * TAU / 10; g.moveTo(x + Math.cos(a) * r * .18, y + Math.sin(a) * r * .18); g.lineTo(x + Math.cos(a) * r * .62, y + Math.sin(a) * r * .62); } g.stroke();
    g.fillStyle = '#ff8a6a'; for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + .3; g.beginPath(); g.arc(x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .7, r * .07, 0, TAU); g.fill(); }
  }
  if (ws[2] > .01) {                                                   // 红叶
    g.globalAlpha = ws[2] * lit; g.fillStyle = '#e0603c'; g.save(); g.translate(x, y + r * .05); mapleLeaf(g, r * .62); g.fill(); g.restore();
  }
  if (ws[3] > .01) {                                                   // 雪花
    g.globalAlpha = ws[3] * lit; g.strokeStyle = '#eef4ff'; g.lineWidth = Math.max(.5, r * .09); g.lineCap = 'round';
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6, ex = x + Math.cos(a) * r * .62, ey = y + Math.sin(a) * r * .62; g.moveTo(x, y); g.lineTo(ex, ey); const mx = x + Math.cos(a) * r * .38, my = y + Math.sin(a) * r * .38; g.moveTo(mx, my); g.lineTo(mx + Math.cos(a + .7) * r * .18, my + Math.sin(a + .7) * r * .18); g.moveTo(mx, my); g.lineTo(mx + Math.cos(a - .7) * r * .18, my + Math.sin(a - .7) * r * .18); } g.stroke();
  }
  g.restore();
  hitAt(g, 'seasonmark', x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);
}
