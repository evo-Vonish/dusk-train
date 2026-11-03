/* 第十棒第二版 · 星河的底：压深的天、星野、银河、亮星四层，原来每帧各铺一整片天；
   现在合成一张，只在明暗变了、或星空转过半个像素时才重画（星空本来就一秒才挪零点几个像素）。
   眨眼的星、气辉照旧每帧画。揭卡时（RX）不用这张，直接按高倍率画。 */
const GALC = { c: null, key: '' };
function drawChapterSky(g) {
  const { W, yM, t } = S;
  const deep = Math.max(NX.galaxy, NX.meteor * .55);       // 只在星河（和流星雨）时把天压深一点，黄昏本身从不被改
  if (deep <= .002) return;
  const ready = !!NX.galaxyMap;
  if (!ready) ensureGalaxy();                                 // 还在算：先只压深天色，星星几秒后跟上
  const clear = 1 - S.rainI;
  // 整片星空慢慢往一边挪：天在转（画得比屏幕宽一点，挪的时候不露边）
  const ox = W * .035, dx = ox - clamp(NX.drift * S.ref * .0009, 0, ox * 2), ww = W + ox * 2;
  const paintBase = (c, dxv) => {
    const gr = c.createLinearGradient(0, 0, 0, yM);
    gr.addColorStop(0, css([4, 10, 30], .92 * deep)); gr.addColorStop(.62, css([13, 21, 48], .85 * deep)); gr.addColorStop(1, css([46, 40, 72], .7 * deep));
    c.fillStyle = gr; c.fillRect(-PAD, 0, W + PAD * 2, yM);
    if (!ready) return;
    const sx = Math.round(dxv - ox), fw = NX.starfield.width / NX.starfield.sc;
    c.globalAlpha = deep * (.42 + NX.galaxy * .58) * clear; c.drawImage(NX.starfield, sx, 0, fw, yM);
    if (NX.galaxy > .005) { c.globalAlpha = NX.galaxy * clear; c.drawImage(NX.galaxyMap, dxv - ox, 0, ww, yM); }
    c.globalAlpha = deep * (.5 + NX.galaxy * .5) * clear; c.drawImage(NX.starBright, sx, 0, fw, yM);
    c.globalAlpha = 1;
  };
  if (RX) { g.save(); paintBase(g, dx); g.restore(); }
  else {
    const dpr = S.dpr, q = v => Math.round(v * 200);
    const dxq = Math.round(dx * dpr * 2) / (dpr * 2);
    const key = q(deep) + '|' + q(NX.galaxy) + '|' + q(clear) + '|' + dxq.toFixed(3) + '|' + (ready ? 1 : 0) + '|' + W + '|' + yM + '|' + dpr;
    const cw = Math.ceil((W + PAD * 2) * dpr), ch = Math.ceil(yM * dpr);
    let c = GALC.c;
    if (!c || c.width !== cw || c.height !== ch) { c = GALC.c = document.createElement('canvas'); c.width = cw; c.height = ch; GALC.key = ''; }
    if (GALC.key !== key) {
      const cg = c.getContext('2d');
      cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalAlpha = 1; cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, cw, ch);
      cg.setTransform(dpr, 0, 0, dpr, PAD * dpr, 0);
      paintBase(cg, dxq); GALC.key = key;
    }
    g.drawImage(c, 0, 0, cw, ch, -PAD, 0, cw / dpr, ch / dpr);
  }
  if (!ready) return;
  if (NX.galaxy > .5) hitBg('galaxy', 0, 0, W, yM * .86); else if (NX.meteor > .45) hitBg('meteorshower', 0, 0, W, yM * .8);
  g.save();
  // 眨眼的星
  g.globalCompositeOperation = 'lighter';
  for (const s of NX.twinkle) {
    const a = (.25 + .75 * Math.pow(.5 + .5 * Math.sin(t * s.sp + s.ph), 3)) * deep * clear, x = dx - ox + s.u * ww, y = s.v * yM, r = s.sz * (W / 960) * (.8 + .6 * a);
    g.globalAlpha = a; g.fillStyle = css(s.col, .9); g.beginPath(); g.arc(x, y, r * .45, 0, TAU); g.fill();
    if (a > .5) glow(g, glowSpr, x, y, r * 8, r * 8, (a - .5) * .7);
  }
  // 地平线上一层很淡的气辉
  if (NX.galaxy > .02) {
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1;
    const ag = g.createLinearGradient(0, yM * .74, 0, yM);
    ag.addColorStop(0, css([110, 210, 180], 0)); ag.addColorStop(.7, css([120, 215, 185], .05 * NX.galaxy * clear)); ag.addColorStop(1, css([140, 210, 200], .02 * NX.galaxy * clear));
    g.fillStyle = ag; g.fillRect(-PAD, yM * .74, W + PAD * 2, yM * .26);
  }
  g.restore();
}
