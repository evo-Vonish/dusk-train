/* 第十棒第二版 · 列车的细节：
   车顶的通风顶、受电弓的绝缘座与夜里偶尔的电火花；车厢里的灯带、吊环、座椅靠背；
   第四扇窗是车门（门框、门缝、扶手、门口的小灯），不再有一条线从窗户中间穿过；
   转向架、前灯的灯罩、车身边缘被天色照亮的一道细光；乘客是坐着的侧影，朝着车头。
   第七版：车身多了几层——上半身一道天光的反光（漆面是亮的）、窗间的板缝、上下两排铆钉、窗框一圈镀铬、
   腰下一道奶油色的细线、车号牌、侧面的行先表示（一块亮着的小牌）、车顶后面的空调、裙板上的百叶、
   转向架上的弹簧和轴箱、车厢里两张吊着的广告；下半身映着一点海的颜色。 */
function drawTram(g, P) {
  const { yM, ref, t, W } = S;
  const { th, tw, tramX } = P;
  if (tramX > W + 60 || tramX + tw < -60) return;
  hitAt(null, '__tram', tramX - 14, yM - th - ref * 0.03, tw + 28, th + ref * 0.03 + 8);
  const roll = Math.min(1, S.tramV / 0.2) * Math.sin(S.travel * 180) * ref * 0.0008;
  const y0 = yM - ref * 0.004 + roll;      // wheels/platform line
  const bodyTop = y0 - th;
  const bell = S.bellT >= 0 ? Math.exp(-S.bellT * 2.2) : 0;
  const day = S.dayF, dark = 1 - day, night = S.nightF;
  const lw = Math.max(1.2, ref * 0.0025);
  // 天色给车身镶的那道边：黄昏暖、夜里冷、白天亮
  const rimCol = mix(mix([255, 186, 150], [168, 188, 255], night), [255, 255, 255], day);
  const rimA = 0.22 + 0.18 * day;
  const roofTop = bodyTop - ref * 0.004;

  // pantograph
  const pcx = tramX + tw * 0.42, ptop = bodyTop - ref * 0.020;
  g.strokeStyle = css(INK); g.lineWidth = Math.max(1.2, ref * 0.0028); g.lineCap = 'round';
  g.beginPath();
  g.moveTo(pcx - tw * 0.10, bodyTop); g.lineTo(pcx, ptop);
  g.lineTo(pcx + tw * 0.10, bodyTop); g.moveTo(pcx - tw * 0.045, ptop); g.lineTo(pcx + tw * 0.045, ptop);
  g.stroke();
  // 第七版：受电弓的第二道臂、底座、弓头两端的弯角
  g.lineWidth = Math.max(0.7, ref * 0.0014);
  g.beginPath();
  g.moveTo(pcx - tw * 0.085, bodyTop); g.lineTo(pcx - tw * 0.012, ptop + ref * 0.002); g.moveTo(pcx + tw * 0.085, bodyTop); g.lineTo(pcx + tw * 0.012, ptop + ref * 0.002);
  g.moveTo(pcx - tw * 0.11, bodyTop - ref * 0.0035); g.lineTo(pcx + tw * 0.11, bodyTop - ref * 0.0035);
  g.moveTo(pcx - tw * 0.045, ptop); g.quadraticCurveTo(pcx - tw * 0.058, ptop, pcx - tw * 0.062, ptop + ref * 0.003);
  g.moveTo(pcx + tw * 0.045, ptop); g.quadraticCurveTo(pcx + tw * 0.058, ptop, pcx + tw * 0.062, ptop + ref * 0.003);
  g.stroke();
  if (bell > 0.05 && Math.sin(t * 47) > 0.2) glow(g, glowSpr, pcx, ptop, ref * 0.03, ref * 0.02, 0.5 * bell);
  // 夜里开着的时候，受电弓偶尔打一下蓝白的火花
  if (S.tramV > 0.08 && dark > 0.5) {
    const k = Math.sin(t * 7.31 + S.travel * 3.1) * Math.sin(t * 2.17);
    if (k > 0.965) {
      glow(g, glowSprCyan, pcx + tw * 0.02, ptop, ref * 0.03, ref * 0.024, (k - 0.965) / 0.035 * 0.9 * dark);
      g.fillStyle = 'rgba(230,248,255,0.95)'; g.fillRect(pcx + tw * 0.02 - 1, ptop - 1, 2, 2);
    }
  }

  // body
  const bg = g.createLinearGradient(0, bodyTop, 0, y0);
  bg.addColorStop(0, css(TRAM_BODY_HI)); bg.addColorStop(0.45, css(TRAM_BODY)); bg.addColorStop(1, css(TRAM_DARK));
  rr(g, tramX, bodyTop, tw, th * 0.86, ref * 0.008); g.fillStyle = bg; g.fill();
  tramSkin(g, P, bodyTop, y0, rimCol, day, night);
  rr(g, tramX, bodyTop, tw, th * 0.86, ref * 0.008);
  g.strokeStyle = css(INK, 0.9); g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
  // roof + 通风顶（中间抬高的一截，夜里缝里透一点车厢的灯）
  rr(g, tramX - ref * 0.004, roofTop, tw + ref * 0.008, ref * 0.012, ref * 0.005);
  g.fillStyle = css(TRAM_DARK); g.fill(); g.stroke();
  const cx0 = tramX + tw * 0.22, cw = tw * 0.56, ch = ref * 0.0062;
  rr(g, cx0, roofTop - ch + ref * 0.001, cw, ch, ref * 0.003); g.fillStyle = css(mix(TRAM_DARK, INK, 0.4)); g.fill();
  g.strokeStyle = css(INK, 0.9); g.lineWidth = Math.max(1, ref * 0.0018); g.stroke();
  for (let i = 0; i < 6; i++) {
    const vx = cx0 + cw * (0.11 + i * 0.16);
    g.fillStyle = css(mix([52, 62, 104], WARM, 0.55 * night * dark), 0.18 + 0.32 * night * dark);
    g.fillRect(vx, roofTop - ch * 0.6 + ref * 0.001, cw * 0.045, Math.max(0.8, ch * 0.3));
  }
  // 第七版：车尾那头车顶上的空调（格栅）
  {
    const ax = tramX + tw * 0.8, aw = tw * 0.13, ah = ref * 0.0068, ay = roofTop - ah + ref * 0.001;
    rr(g, ax, ay, aw, ah, ref * 0.0022); g.fillStyle = css(mix(TRAM_DARK, INK, 0.3)); g.fill();
    g.strokeStyle = css(INK, 0.9); g.lineWidth = Math.max(0.8, ref * 0.0014); g.stroke();
    g.fillStyle = css(mix([70, 84, 130], rimCol, 0.25), 0.45);
    for (let i = 1; i < 6; i++) g.fillRect(ax + aw * i / 6, ay + ah * 0.25, Math.max(0.6, ref * 0.0008), ah * 0.55);
    g.fillStyle = css(rimCol, rimA * 0.9); g.fillRect(ax + ref * 0.002, ay, aw - ref * 0.004, Math.max(0.7, ref * 0.0008));
  }
  // 车顶和通风顶的上沿：一道天光
  g.fillStyle = css(rimCol, rimA);
  g.fillRect(tramX - ref * 0.002, roofTop, tw + ref * 0.004, Math.max(1, ref * 0.0011));
  g.fillRect(cx0 + ref * 0.002, roofTop - ch + ref * 0.001, cw - ref * 0.004, Math.max(1, ref * 0.0009));
  // 受电弓的绝缘座
  g.fillStyle = css(INK);
  for (const s of [-1, 1]) { rr(g, pcx + s * tw * 0.1 - ref * 0.004, roofTop - ref * 0.0035, ref * 0.008, ref * 0.0035, ref * 0.0012); g.fill(); }
  // skirt
  g.fillStyle = css(INK, 0.85);
  g.fillRect(tramX + ref * 0.004, y0 - th * 0.16, tw - ref * 0.008, th * 0.16);
  // 第七版：裙板上的百叶（两台转向架之间），车头下面的连结器
  {
    const ly0 = y0 - th * 0.135, lh = th * 0.08, n = 9;
    for (let i = 0; i < n; i++) {
      const lx = tramX + tw * (0.36 + i * 0.032);
      g.fillStyle = 'rgba(2,4,16,0.55)'; g.fillRect(lx, ly0, Math.max(0.8, tw * 0.007), lh);
      g.fillStyle = css(rimCol, 0.1 + 0.08 * day); g.fillRect(lx + Math.max(0.8, tw * 0.007), ly0, Math.max(0.6, ref * 0.0007), lh);
    }
    g.fillStyle = css(INK); rr(g, tramX - ref * 0.007, y0 - th * 0.12, ref * 0.009, th * 0.05, ref * 0.0015); g.fill();
  }
  // 腰线（黄铜）与窗上的细线
  g.fillStyle = '#b89a81'; g.globalAlpha = 0.5;
  g.fillRect(tramX + tw * 0.025, bodyTop + th * 0.62, tw * 0.95, Math.max(1, ref * 0.0015));
  g.globalAlpha = 0.28;
  g.fillRect(tramX + tw * 0.025, bodyTop + th * 0.105, tw * 0.95, Math.max(0.8, ref * 0.0009));
  g.globalAlpha = 1;
  g.fillStyle = css(mix([236, 222, 196], [255, 250, 240], day), 0.42 + 0.2 * day);
  g.fillRect(tramX + tw * 0.012, y0 - th * 0.185, tw * 0.976, Math.max(0.8, ref * 0.0011));
  // 车尾被黄昏照着的一条竖边
  g.fillStyle = css(rimCol, rimA * 0.8);
  g.fillRect(tramX + tw - ref * 0.0035, bodyTop + ref * 0.006, Math.max(1, ref * 0.0012), th * 0.68);
  // 转向架（先画架子，再画轮子）
  for (const [fa, fb] of [[0.16, 0.25], [0.75, 0.84]]) {
    const xa = tramX + tw * fa, xb = tramX + tw * fb, r = th * 0.082, ay = y0 - th * 0.045;
    rr(g, xa - r * 1.25, ay - r * 0.95, xb - xa + r * 2.5, r * 1.35, r * 0.4); g.fillStyle = '#0b1030'; g.fill();
    g.fillStyle = css(rimCol, 0.12 + 0.1 * day); g.fillRect(xa - r * 1.1, ay - r * 0.95, xb - xa + r * 2.2, Math.max(0.8, ref * 0.0008));
  }
  for (const f of [0.16, 0.25, 0.75, 0.84]) {
    const x = tramX + tw * f, r = th * 0.082;
    g.fillStyle = '#090d23'; g.beginPath(); g.arc(x, y0 - th * 0.045, r, 0, TAU); g.fill();
    g.strokeStyle = '#4e5165'; g.lineWidth = Math.max(0.6, r * 0.2);
    g.beginPath(); g.arc(x, y0 - th * 0.045, r * 0.64, 0, TAU); g.stroke();
    g.fillStyle = '#5a5d72'; g.beginPath(); g.arc(x, y0 - th * 0.045, Math.max(0.6, r * 0.18), 0, TAU); g.fill();
  }
  // 第七版：转向架上的轴箱、弹簧
  for (const [fa, fb] of [[0.16, 0.25], [0.75, 0.84]]) {
    const r = th * 0.082, ay = y0 - th * 0.045, xm = tramX + tw * (fa + fb) / 2;
    g.strokeStyle = css(mix([90, 96, 120], rimCol, 0.3), 0.55); g.lineWidth = Math.max(0.6, ref * 0.0008);
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const yy = ay - r * 0.95 - k * r * 0.12, xx = xm + (k % 2 ? 1 : -1) * r * 0.32; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
    for (const f of [fa, fb]) { const x = tramX + tw * f; g.fillStyle = '#10152e'; g.fillRect(x - r * 0.32, ay - r * 0.32, r * 0.64, r * 0.64); g.fillStyle = css(rimCol, 0.18); g.fillRect(x - r * 0.32, ay - r * 0.32, r * 0.64, Math.max(0.5, ref * 0.0006)); }
  }

  // warm windows (lit), bell makes them bloom
  const nW = 5, inset = tw * 0.07, gap = tw * 0.035;
  const ww = (tw - inset * 2 - gap * (nW - 1)) / nW, wh = th * 0.34, wy = bodyTop + th * 0.16;
  const flick = i => clamp(0.92 + 0.025 * Math.sin(t * 0.7 + i * 2.7) + bell * 0.16, 0, 1);
  for (let i = 0; i < nW; i++) {
    const wx = tramX + inset + i * (ww + gap);
    glow(g, glowSpr, wx + ww / 2, wy + wh / 2, ww * 2.6, wh * 3.2, 0.16 * flick(i) * (1 - 0.85 * day));
  }
  const DOOR = 3;
  const seat = css(mix(INK, WARM, 0.22 + 0.25 * day), 0.6), seatRim = css(WARM_HI, 0.25 * dark + 0.1);
  for (let i = 0; i < nW; i++) {
    const wx = tramX + inset + i * (ww + gap), f = flick(i);
    const wg = g.createLinearGradient(0, wy, 0, wy + wh);
    wg.addColorStop(0, css(mix(mix(WARM_HI, [255, 255, 250], 0.35), DAY_GLASS, day), f));
    wg.addColorStop(0.5, css(mix(WARM, DAY_GLASS, day), f * 0.95));
    wg.addColorStop(1, css(mix(mix(WARM, [222, 160, 118], 0.45), DAY_GLASS, day), f * 0.9));
    rr(g, wx, wy, ww, wh, ref * 0.003); g.fillStyle = wg; g.fill();
    g.save(); rr(g, wx, wy, ww, wh, ref * 0.003); g.clip();
    // 车厢顶上的灯带
    g.fillStyle = css([255, 252, 238], 0.8 * dark + 0.15);
    g.fillRect(wx, wy + wh * 0.07, ww, Math.max(0.8, wh * 0.055));
    if (i !== DOOR) {
      // 座椅靠背
      g.fillStyle = seat;
      for (const sx of [0.04, 0.53]) { rr(g, wx + ww * sx, wy + wh * 0.7, ww * 0.43, wh * 0.5, wh * 0.08); g.fill(); }
      g.fillStyle = seatRim;
      for (const sx of [0.06, 0.55]) g.fillRect(wx + ww * sx, wy + wh * 0.7, ww * 0.39, Math.max(0.6, wh * 0.03));
    } else {
      // 门里：一根竖扶手
      g.fillStyle = css(mix(INK, [184, 154, 129], 0.5), 0.55);
      g.fillRect(wx + ww * 0.5 - Math.max(0.5, ww * 0.012), wy + wh * 0.12, Math.max(1, ww * 0.024), wh);
    }
    // 第七版：车厢里吊着的两张广告（在两只吊环中间）
    if (i === 1 || i === 4) {
      const ax = wx + ww * 0.5, aw = ww * 0.26, ah = wh * 0.13, ay = wy + wh * 0.13;
      g.fillStyle = css(mix(mix(i === 1 ? [236, 160, 150] : [150, 196, 210], WARM, 0.35), DAY_GLASS, day * 0.3), 0.85);
      g.fillRect(ax - aw / 2, ay, aw, ah);
      g.fillStyle = css(INK, 0.28); g.fillRect(ax - aw * 0.35, ay + ah * 0.3, aw * 0.5, Math.max(0.5, ah * 0.1)); g.fillRect(ax - aw * 0.35, ay + ah * 0.6, aw * 0.7, Math.max(0.5, ah * 0.08));
    }
    drawRiderAt(g, i, wx, wy, ww, wh);
    // 吊环
    g.strokeStyle = css(INK, 0.3); g.lineWidth = Math.max(0.6, ref * 0.0009);
    for (const sx of i === DOOR ? [0.25, 0.75] : [0.3, 0.72]) {
      const x = wx + ww * sx, sway = Math.sin(t * 1.1 + i * 1.7 + sx * 4) * ww * 0.012 * (0.4 + Math.min(1, S.tramV / 0.2));
      g.beginPath(); g.moveTo(x, wy + wh * 0.1); g.lineTo(x + sway, wy + wh * 0.24); g.stroke();
      g.beginPath(); g.arc(x + sway, wy + wh * 0.285, Math.max(0.8, wh * 0.045), 0, TAU); g.stroke();
    }
    // 玻璃上一道斜斜的天光
    g.fillStyle = 'rgba(255,255,255,' + (0.05 + 0.12 * day).toFixed(3) + ')';
    g.beginPath(); g.moveTo(wx + ww * 0.58, wy); g.lineTo(wx + ww * 0.74, wy); g.lineTo(wx + ww * 0.4, wy + wh); g.lineTo(wx + ww * 0.24, wy + wh); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = css(INK, 0.75); g.lineWidth = Math.max(1, ref * 0.0018);
    rr(g, wx, wy, ww, wh, ref * 0.003); g.stroke();
    // 窗框一圈镀铬：外面再描一道细的亮边（上沿亮、下沿暗）
    g.strokeStyle = css(mix([200, 212, 236], rimCol, 0.4), 0.22 + 0.25 * day); g.lineWidth = Math.max(0.6, ref * 0.0009);
    rr(g, wx - ref * 0.0022, wy - ref * 0.0022, ww + ref * 0.0044, wh + ref * 0.0044, ref * 0.004); g.stroke();
  }
  // 第七版：行先表示（第二扇窗上面一块亮着的小牌）、车号牌
  {
    const sx = tramX + inset + (ww + gap) - ww * 0.05, sw = ww * 0.82, sh = th * 0.075, sy = bodyTop + th * 0.035;
    rr(g, sx, sy, sw, sh, ref * 0.0012); g.fillStyle = css(INK, 0.95); g.fill();
    g.fillStyle = css(mix(mix(WARM_HI, [255, 255, 255], 0.3), [236, 238, 228], day), 0.9);
    g.fillRect(sx + sw * 0.05, sy + sh * 0.18, sw * 0.9, sh * 0.64);
    g.fillStyle = css(INK, 0.6);
    for (const [a, b] of [[0.14, 0.2], [0.38, 0.2], [0.66, 0.12], [0.82, 0.08]]) g.fillRect(sx + sw * a, sy + sh * 0.36, sw * b, Math.max(0.6, sh * 0.28));
    if (dark > 0.2) glow(g, glowSpr, sx + sw / 2, sy + sh / 2, sw * 1.6, sh * 3, 0.12 * dark);
    const nx = tramX + tw * 0.03, nw = tw * 0.05, nh = th * 0.075, ny = bodyTop + th * 0.66;
    rr(g, nx, ny, nw, nh, ref * 0.001); g.fillStyle = css(mix([226, 214, 186], [244, 238, 222], day), 0.8); g.fill();
    g.fillStyle = css(INK, 0.75); g.fillRect(nx + nw * 0.22, ny + nh * 0.25, nw * 0.22, nh * 0.5); g.fillRect(nx + nw * 0.56, ny + nh * 0.25, nw * 0.22, nh * 0.5);
  }
  // 车门：第四扇窗下面接着门板，中间一道门缝，两边一对扶手；夜里门口有一盏小灯
  {
    const wx = tramX + inset + DOOR * (ww + gap), dx0 = wx - tw * 0.011, dx1 = wx + ww + tw * 0.011;
    const dTop = wy - th * 0.05, dBot = y0 - th * 0.165;
    g.strokeStyle = css(INK, 0.62); g.lineWidth = Math.max(1, ref * 0.0016);
    g.beginPath();
    g.moveTo(dx0, dBot); g.lineTo(dx0, dTop + ref * 0.003); g.quadraticCurveTo(dx0, dTop, dx0 + ref * 0.003, dTop);
    g.lineTo(dx1 - ref * 0.003, dTop); g.quadraticCurveTo(dx1, dTop, dx1, dTop + ref * 0.003); g.lineTo(dx1, dBot);
    g.moveTo(wx + ww / 2, wy + wh + ref * 0.002); g.lineTo(wx + ww / 2, dBot);
    g.stroke();
    g.fillStyle = 'rgba(214,186,150,0.55)';
    const hy = wy + wh + (dBot - wy - wh) * 0.32, hh = Math.max(2, (dBot - wy - wh) * 0.34);
    g.fillRect(wx + ww / 2 - ref * 0.0045, hy, Math.max(0.8, ref * 0.0011), hh);
    g.fillRect(wx + ww / 2 + ref * 0.0035, hy, Math.max(0.8, ref * 0.0011), hh);
    if (dark > 0.2) {
      glow(g, glowSpr, wx + ww / 2, dBot + ref * 0.002, ww * 1.1, ref * 0.014, 0.28 * dark);
      g.fillStyle = css(WARM_HI, 0.7 * dark); g.fillRect(wx + ww * 0.3, dBot - Math.max(0.8, ref * 0.001), ww * 0.4, Math.max(0.8, ref * 0.001));
    }
  }
  // tail light
  glow(g, glowSpr, tramX + tw - ref * 0.002, y0 - th * 0.3, ref * 0.02, ref * 0.02, 0.4);
  g.fillStyle = '#ff5a4e'; g.beginPath(); g.arc(tramX + tw - ref * 0.002, y0 - th * 0.3, Math.max(1.2, ref * 0.0026), 0, TAU); g.fill();
  // head light：先画灯罩，再画光
  const lightX = tramX + ref * 0.002, lightY = y0 - th * 0.32;
  g.fillStyle = css(INK); rr(g, lightX - ref * 0.0045, lightY - ref * 0.0055, ref * 0.006, ref * 0.011, ref * 0.002); g.fill();
  g.save();
  const beam = g.createLinearGradient(lightX - ref * 0.19, lightY, lightX, lightY);
  beam.addColorStop(0, 'rgba(255,224,172,0)'); beam.addColorStop(1, 'rgba(255,224,172,' + (0.16 * dark).toFixed(3) + ')');
  g.fillStyle = beam; g.beginPath(); g.moveTo(lightX, lightY - ref * 0.002);
  g.lineTo(lightX - ref * 0.19, lightY - ref * 0.018); g.lineTo(lightX - ref * 0.19, lightY + ref * 0.022);
  g.lineTo(lightX, lightY + ref * 0.002); g.closePath(); g.fill(); g.restore();
  glow(g, glowSpr, lightX, lightY, ref * 0.05, ref * 0.035, 0.6 * (1 - 0.9 * day));
  g.fillStyle = '#fff0cc'; g.beginPath(); g.arc(lightX, lightY, Math.max(1, ref * 0.0023), 0, TAU); g.fill();
  // 车头上方的小示廓灯（琥珀色）
  tramSeasonMark(g, tramX + tw * 0.13, y0 - th * 0.17, Math.max(2.4, Math.min(th * 0.085, ref * 0.0068)));     // 车身上的季节牌
  if (dark > 0.15) { glow(g, glowSprOrange(), tramX + ref * 0.006, bodyTop + ref * 0.006, ref * 0.014, ref * 0.012, 0.45 * dark); g.fillStyle = 'rgba(255,190,110,' + (0.9 * dark).toFixed(2) + ')'; g.fillRect(tramX + ref * 0.005, bodyTop + ref * 0.005, Math.max(1, ref * 0.002), Math.max(1, ref * 0.002)); }
}

/* 车窗里的人：坐着的侧影，脸朝车头（左边）。按上车的先后坐（SEAT_ORDER 沿用原来的） */
function drawRiderAt(g, wi, wx, wy, ww, wh) {
  const k = SEAT_ORDER.indexOf(wi); if (k < 0 || k >= PX.riders.length) return;
  const p = PX.riders[k], ph = p.ph || 0, t = S.t, day = S.dayF;
  const bob = Math.sin(t * 1.3 + ph) * wh * 0.015 + Math.min(1, S.tramV / 0.2) * Math.sin(t * 9 + ph) * wh * 0.006;
  const ink = day > 0.5 ? 'rgba(40,46,72,0.46)' : 'rgba(44,36,52,0.6)';
  const rH = wh * (p.kind === 'student' ? 0.108 : 0.122);
  const hx = wx + ww * (0.36 + 0.26 * ((p.id * 0.37) % 1));
  let hy = wy + wh * 0.52 + bob;
  // 老人会打瞌睡：慢慢点头；学生低着头看书
  let tilt = 0;
  if (p.kind === 'elder') tilt = Math.max(0, Math.sin(t * 0.37 + ph)) * 0.35;
  if (p.kind === 'student') tilt = 0.22;
  hy += tilt * rH * 0.5;
  g.fillStyle = ink;
  // 行李架上的箱子
  if (p.kind === 'suitcase') { rr(g, hx - ww * 0.16, wy + wh * 0.13, ww * 0.3, wh * 0.13, wh * 0.025); g.fill(); g.fillRect(hx - ww * 0.22, wy + wh * 0.26, ww * 0.42, Math.max(0.6, wh * 0.02)); }
  // 背的琴：琴颈从肩后伸出来
  if (p.kind === 'cello') { rr(g, hx + rH * 0.6, hy - rH * 2.0, rH * 0.42, rH * 3.4, rH * 0.2); g.fill(); g.beginPath(); g.arc(hx + rH * 0.81, hy - rH * 2.05, rH * 0.3, 0, TAU); g.fill(); }
  // 肩与上身
  g.beginPath();
  g.moveTo(hx - rH * 1.55, wy + wh * 1.08);
  g.quadraticCurveTo(hx - rH * 1.7, hy + rH * 1.25, hx - rH * 0.45, hy + rH * 0.95);
  g.lineTo(hx + rH * 0.55, hy + rH * 0.95);
  g.quadraticCurveTo(hx + rH * 1.8, hy + rH * 1.3, hx + rH * 1.7, wy + wh * 1.08);
  g.closePath(); g.fill();
  // 头（侧脸朝左：一点点鼻尖）
  g.save(); g.translate(hx, hy); g.rotate(-tilt);
  g.beginPath(); g.arc(0, 0, rH, 0, TAU); g.fill();
  g.beginPath(); g.arc(-rH * 0.92, rH * 0.12, rH * 0.2, 0, TAU); g.fill();
  if (p.kind === 'elder') { g.fillRect(-rH * 1.45, -rH * 0.72, rH * 2.6, rH * 0.26); rr(g, -rH * 0.78, -rH * 1.45, rH * 1.56, rH * 0.85, rH * 0.2); g.fill(); }
  else if (p.kind === 'fisher') { g.beginPath(); g.ellipse(0, -rH * 0.55, rH * 1.0, rH * 0.5, 0, Math.PI, 0); g.fill(); g.fillRect(-rH * 1.6, -rH * 0.66, rH * 0.95, rH * 0.22); }
  else if (p.kind === 'mother' || p.kind === 'flowers') { g.beginPath(); g.moveTo(rH * 0.2, -rH * 0.9); g.quadraticCurveTo(rH * 1.5, -rH * 0.4, rH * 0.95, rH * 1.3); g.lineTo(rH * 0.3, rH * 0.9); g.closePath(); g.fill(); }
  else if (p.kind === 'umbrella' || p.kind === 'lantern') { g.beginPath(); g.arc(rH * 0.55, -rH * 0.35, rH * 0.45, 0, TAU); g.fill(); }
  g.restore();
  // 手里的东西
  if (p.kind === 'student') { g.fillRect(hx - rH * 1.55, hy + rH * 1.45, rH * 1.1, rH * 0.75); g.fillStyle = day > 0.5 ? 'rgba(240,236,224,0.6)' : 'rgba(255,236,200,0.45)'; g.fillRect(hx - rH * 1.48, hy + rH * 1.5, rH * 0.95, rH * 0.12); g.fillStyle = ink; }
  if (p.kind === 'flowers') { g.fillStyle = day > 0.5 ? 'rgba(246,238,226,0.85)' : 'rgba(250,232,214,0.75)'; for (const [bx, by] of [[-1.3, 1.25], [-1.0, 1.05], [-1.55, 1.0], [-1.2, 0.85]]) { g.beginPath(); g.arc(hx + rH * bx, hy + rH * by, rH * 0.24, 0, TAU); g.fill(); } g.fillStyle = ink; }
  if (p.kind === 'backpack') { rr(g, hx - rH * 1.35, hy + rH * 1.15, rH * 1.4, rH * 1.4, rH * 0.3); g.fill(); }
  if (p.kind === 'mother') { g.beginPath(); g.arc(hx - ww * 0.21, hy + wh * 0.16, rH * 0.68, 0, TAU); g.fill(); g.beginPath(); g.arc(hx - ww * 0.21 - rH * 0.62, hy + wh * 0.17, rH * 0.14, 0, TAU); g.fill(); }
  if (p.kind === 'lantern' && S.nightF > 0.3) glow(g, glowSprOrange(), hx - rH * 1.2, hy + rH * 1.8, ww * 0.6, wh * 0.6, 0.35);
}

/* 第七版：车身的漆面——上半身一道天光的反光、下半身映着的海、窗间的板缝、上下两排铆钉 */
function tramSkin(g, P, bodyTop, y0, rimCol, day, night) {
  const { ref } = S, { th, tw, tramX } = P, bh = th * 0.86;
  g.save(); rr(g, tramX, bodyTop, tw, bh, ref * 0.008); g.clip();
  const gl = g.createLinearGradient(0, bodyTop, 0, bodyTop + th * 0.16);
  gl.addColorStop(0, css(mix([255, 255, 255], rimCol, 0.5), 0)); gl.addColorStop(0.45, css(mix([255, 255, 255], rimCol, 0.5), 0.07 + 0.08 * day)); gl.addColorStop(1, css(rimCol, 0));
  g.fillStyle = gl; g.fillRect(tramX, bodyTop, tw, th * 0.16);
  const sb = g.createLinearGradient(0, bodyTop + bh * 0.62, 0, bodyTop + bh);
  sb.addColorStop(0, css(seaTop(), 0)); sb.addColorStop(1, css(mix(seaTop(), rimCol, 0.3), 0.12 + 0.06 * day));
  g.fillStyle = sb; g.fillRect(tramX, bodyTop + bh * 0.62, tw, bh * 0.38);
  // 板缝：窗与窗之间，一道暗、一道亮
  const nW = 5, inset = tw * 0.07, gap = tw * 0.035, ww = (tw - inset * 2 - gap * (nW - 1)) / nW, lw = Math.max(0.6, ref * 0.0009);
  for (let i = 0; i <= nW; i++) {
    const x = i === 0 ? tramX + inset * 0.5 : i === nW ? tramX + tw - inset * 0.5 : tramX + inset + i * (ww + gap) - gap / 2;
    g.fillStyle = css(INK, 0.3); g.fillRect(x, bodyTop + th * 0.12, lw, bh - th * 0.12);
    g.fillStyle = css(rimCol, 0.05 + 0.06 * day); g.fillRect(x + lw, bodyTop + th * 0.12, lw, bh - th * 0.12);
  }
  // 铆钉：窗上一排、腰线下一排
  const step = Math.max(3.2, ref * 0.0075), rv = Math.max(0.55, ref * 0.0007);
  g.fillStyle = css(mix(TRAM_BODY_HI, [230, 236, 255], 0.35), 0.32 + 0.2 * day);
  for (const yy of [bodyTop + th * 0.135, bodyTop + th * 0.66]) for (let x = tramX + step; x < tramX + tw - step * 0.5; x += step) g.fillRect(x, yy, rv, rv);
  g.restore();
}
