/* 第十棒第五版 · 天的合成：黄昏与夜的底是那一季的画（会流动，见 skypaint）；白天、雨、夜色叠在上面
   · 画：按原来的取景（裁掉屋顶和电线，竖屏偏右，看得见那团光），最下面两行拉到地平线，再压一层那一季的雾
     （夏、秋、冬是暗蓝的远雾；春天是一层粉粉的、亮一点的霞）；
   · 白天、雨、夜色三层颜色只在颜色真的变了一档时重画，存成一张半透明的；
   · 画流动时，一秒重合成十几次（画走得很慢，看不出一帧一帧）；停着、白天、定格的时候不重合成。
   · 画还没加载好的那一小会儿，用那一季的渐变垫着。 */
const SKYMIX = { c: null, key: '', ov: null, ovKey: '' };
const FROZEN = { k: 0, age: -1, dur: 26, seen: -1e9, card: false };
function skyMixed() {
  const { W, yM, dpr } = S;
  const q = (v, n) => Math.round(clamp(v, 0, 1) * n);
  const ws = [0, 1, 2, 3].map(seasonWeight), day = S.dayF, night = S.nightF, rain = S.rainI;
  const cw = Math.max(1, Math.round((W + PAD * 2) * dpr)), ch = Math.max(1, Math.ceil((yM + 1) * dpr));     // 和世界画布一样宽：画上去一比一，不拉伸
  const fresh = cv => !cv || cv.width !== cw || cv.height !== ch;
  if (fresh(SKYMIX.c)) { SKYMIX.c = mkCanvas(cw, ch); SKYMIX.key = ''; }
  if (fresh(SKYMIX.ov)) { SKYMIX.ov = mkCanvas(cw, ch); SKYMIX.ovKey = ''; }
  const ovKey = ws.map(w => q(w, 64)).join(',') + '|' + q(day, 100) + '|' + q(night, 100) + '|' + q(rain, 50) + '|' + W + '|' + yM + '|' + dpr;
  if (SKYMIX.ovKey !== ovKey) { paintSkyOver(SKYMIX.ov, ws, day, night, rain); SKYMIX.ovKey = ovKey; }
  // 原来的取景：裁掉屋顶和电线，按高度铺满；竖屏偏右，看得见那团光。两边各多取一点，盖住世界画布的边
  let art = null, crop = null;
  const src = skyArtCrop();
  if (src && day < 0.995) {
    const sh = src.height, paintedH = yM * 0.82, sw = Math.min(src.width, sh * W / paintedH), sx = (src.width - sw) * (S.portrait ? 0.78 : 0.55);
    const ext = sw * PAD / W, sx0 = Math.max(0, Math.floor(sx - ext)), sx1 = Math.min(src.width, Math.ceil(sx + sw + ext));
    crop = { sh, paintedH, sw, sx, sx0, sx1 };
    const still = RX && !(SKYGL.ok && SKYGL.drawnC) ? skyStill() : null;
    art = RX ? (SKYGL.ok && SKYGL.drawnC ? { img: SKYGL.cv, sx: 0, sw: SKYGL.cv.width, sh: SKYGL.cv.height } : still ? { img: still, sx: sx0, sw: sx1 - sx0, sh } : null) : skyPaintFrame(sx0, sx1, false);   // 揭卡时用这一帧，不另外流
  }
  const key = ovKey + '|' + (art ? (art.img === SKYGL.cv ? 'gl' + SKYGL.drawnT + ':' + SKYGL.drawnW + ':' + SKYGL.drawnC : 'still') : 'grad');
  if (SKYMIX.key === key) { skyPaintCost(); return SKYMIX.c; }
  const g = SKYMIX.c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, PAD * dpr, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const dx0 = crop ? (crop.sx0 - crop.sx) / crop.sw * W : 0, dw = crop ? (crop.sx1 - crop.sx0) / crop.sw * W : 0;
  // 垫底：那一季黄昏的渐变（画还没好、或者画盖不到的边上）
  if (!art || dx0 > -PAD + 0.5 || dx0 + dw < W + PAD - 0.5) {
    const gr = g.createLinearGradient(0, 0, 0, yM);
    SKY_STOPS.forEach((s, i) => gr.addColorStop(s, css(seasonCol(P => P.dusk[i]))));
    g.fillStyle = gr; g.fillRect(-PAD, 0, W + PAD * 2, yM + 1);
  }
  if (art) {
    const { paintedH } = crop, ah = art.sh, row = Math.max(1, ah / crop.sh * 2);
    g.drawImage(art.img, art.sx, 0, art.sw, ah, dx0, 0, dw, paintedH);
    g.drawImage(art.img, art.sx, ah - row, art.sw, row, dx0, paintedH - 1, dw, yM - paintedH + 2);
    const haze = g.createLinearGradient(0, paintedH, 0, yM), hm = seasonCol(P => P.hz[0]), hb = seasonCol(P => P.hz[1]);
    haze.addColorStop(0, css(hm, 0));
    haze.addColorStop(0.5, css(hm, seasonNum(P => P.hz[0][3])));
    haze.addColorStop(1, css(hb, seasonNum(P => P.hz[1][3])));
    g.fillStyle = haze; g.fillRect(-PAD, paintedH, W + PAD * 2, yM - paintedH + 1);
    // 夜里颜色淡下去一些（春天的粉、秋天的红不该在半夜还那么艳）；夏天那张原来就是夜的蓝，不动它
    const ds = night * seasonNum(P => P.nightDesat);
    if (ds > 0.01) { g.globalCompositeOperation = 'saturation'; g.globalAlpha = ds; g.fillStyle = '#808080'; g.fillRect(-PAD, 0, W + PAD * 2, yM + 1); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(SKYMIX.ov, 0, 0);
  SKYMIX.key = key;
  skyPaintCost();
  return SKYMIX.c;
}
// 叠在画上面的三层：白天、雨、夜色
function paintSkyOver(c, ws, day, night, rain) {
  const { W, yM, dpr, ref } = S, g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.setTransform(dpr, 0, 0, dpr, PAD * dpr, 0); g.globalAlpha = 1;
  if (day > 0.001) {
    const gd = g.createLinearGradient(0, 0, 0, yM);
    DAY_STOPS.forEach(s => gd.addColorStop(s, css(seasonCol(P => dayAt(P, s)))));
    g.globalAlpha = day; g.fillStyle = gd; g.fillRect(-PAD, 0, W + PAD * 2, yM + 1); g.globalAlpha = 1;
    const dl = g.createLinearGradient(0, yM - ref * 0.12, 0, yM);
    dl.addColorStop(0, 'rgba(255,245,230,0)'); dl.addColorStop(1, 'rgba(255,245,230,' + (0.35 * day).toFixed(3) + ')');
    g.fillStyle = dl; g.fillRect(-PAD, yM - ref * 0.12, W + PAD * 2, ref * 0.12 + 1);
  }
  if (rain > 0.01) {
    g.fillStyle = 'rgba(96,100,130,' + (0.32 * rain * (1 - day)).toFixed(3) + ')'; g.fillRect(-PAD, 0, W + PAD * 2, yM + 1);
    if (day > 0.01) { g.fillStyle = 'rgba(150,160,175,' + (0.5 * rain * day).toFixed(3) + ')'; g.fillRect(-PAD, 0, W + PAD * 2, yM + 1); }
  }
  if (night > 0.001) {
    const nc = seasonCol(P => P.night), na = seasonNum(P => P.nightA);
    g.fillStyle = css(nc, na * night); g.fillRect(-PAD, 0, W + PAD * 2, yM + 1);
  }
}
