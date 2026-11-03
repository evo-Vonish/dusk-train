/* 第十棒第二版 · 车站的细节：
   · 她不再站在柱子上：她和等车的人都站在两根柱子之间的空处；
   · 吊灯有灯罩，夜里往下落一束很淡的光，月台上留一小片光；飞蛾是看得见的小亮点，扑着翅膀绕灯；
   · 站名牌：站名、拼音，下面一道细线，左边是下一站（列车往左开），右边是上一站；
   · 候车室：门上方一只钟（走的是你那边的时间，慢七分钟），墙上一张时刻表，窗里半拉的帘子；长椅有了靠背；
   · 每一站有自己的一样东西：月见的芒草、潮生的潮位尺、灯岬的灯塔（光扫过时站名牌亮一下）、
     汐音的浮标钟、听风的风向袋与纸风车、拾光长椅上的光瓶。都能揭下来。
   第七版 · 多几层：站棚的波板（下沿一排小波）、棚下的椽子、柱子上的斜撑和柱脚；候车室的护墙板、门上的小雨棚和一盏壁灯、
   门边的一张海报、一盆花、一只红邮筒；月台边一道黄色的盲道；长椅多一根横档。黄昏里都是剪影，镶着天色的一道边；夜里壁灯照着门口。 */
const PINYIN = { '暮海': 'Mùhǎi', '远汀': 'Yuǎntīng', '月见': 'Yuèjiàn', '潮生': 'Cháoshēng', '灯岬': 'Dēngjiǎ', '汐音': 'Xīyīn', '听风': 'Tīngfēng', '拾光': 'Shíguāng', '归帆': 'Guīfān', '烟火': 'Yānhuǒ' };
const STATION_FONT = '"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", serif';
const CAPE = { flash: 0 };                       // 灯岬的光柱扫过站名牌时，牌子亮一下

function setPieces() {
  const { W, yM, ref, portrait } = S;
  const sh = ref * (portrait ? 0.150 : 0.115);           // shelter roof height above platform
  const th = ref * (portrait ? 0.088 : 0.077);           // tram body height
  const tw = Math.min(W * 0.32, ref * 0.32);             // enough room for the windows on a phone
  const tramX = (portrait ? W * 0.14 : W * 0.31) + S.tramDX;
  const roofX0 = portrait ? W * 0.42 : W * 0.57, roofX1 = portrait ? W * 0.95 : W * 0.88;
  const roomW = ref * (portrait ? 0.115 : 0.17), roomH = sh * 0.94;
  const roomX = roofX1 - roomW - ref * 0.012;
  const girlX = lerp(roofX0, roofX1, 0.52);              // 两根柱子之间，风铃的右边
  return { sh, th, tw, tramX, roofX0, roofX1, roomW, roomH, roomX, girlX };
}
function waitX(P, slot) { return lerp(P.roofX0, P.roofX1, [0.08, 0.2, 0.62][slot] || 0.2); }

function drawStation(g, P, index = 0) {
  const { yM, ref, t } = S;
  const { sh, roofX0, roofX1, roomW, roomH, roomX } = P;
  const roofY = yM - sh, span = roofX1 - roofX0, name = stationName(index);
  const day = S.dayF, lit = 1 - day, night = S.nightF;
  const rimCol = mix(mix([255, 186, 150], [168, 188, 255], night), [255, 255, 255], day);
  drawStationBack(g, P, index, name);

  // pillars first (behind room edge)
  g.fillStyle = css(INK, 0.95);
  const pw = Math.max(2, ref * 0.0045);
  for (const fx of [0.03, 0.36, 0.68, 0.97]) {
    const px = lerp(roofX0, roofX1, fx);
    g.fillRect(px - pw / 2, roofY, pw, sh);
  }
  g.fillStyle = css(rimCol, 0.16 + 0.1 * day);
  for (const fx of [0.03, 0.36, 0.68]) { const px = lerp(roofX0, roofX1, fx); g.fillRect(px + pw / 2 - Math.max(0.6, ref * 0.0008), roofY + ref * 0.006, Math.max(0.6, ref * 0.0008), sh - ref * 0.006); }
  // 第七版：柱脚、斜撑
  g.fillStyle = css(INK, 0.95); g.strokeStyle = css(INK, 0.95); g.lineWidth = Math.max(1, pw * 0.55); g.lineCap = 'butt';
  [0.03, 0.36, 0.68, 0.97].forEach((fx, k) => {
    const px = lerp(roofX0, roofX1, fx), bl = Math.min(ref * 0.022, span * 0.06);
    g.fillRect(px - pw * 1.1, yM - ref * 0.0055, pw * 2.2, ref * 0.0055);
    g.beginPath();
    if (k > 0) { g.moveTo(px, roofY + sh * 0.2); g.lineTo(px - bl, roofY + ref * 0.004); }
    if (k < 3) { g.moveTo(px, roofY + sh * 0.2); g.lineTo(px + bl, roofY + ref * 0.004); }
    g.stroke();
  });
  // roof slab
  g.fillStyle = css(INK); g.fillRect(roofX0, roofY - ref * 0.006, span, ref * 0.011);
  g.fillStyle = 'rgba(255,190,150,0.28)';
  g.fillRect(roofX0, roofY + ref * 0.005, span, Math.max(1, ref * 0.0016));
  g.fillStyle = css(rimCol, 0.2 + 0.15 * day);
  g.fillRect(roofX0, roofY - ref * 0.006, span, Math.max(0.8, ref * 0.001));
  // 第七版：波板的下沿一排小波、棚下的椽子、板上很淡的竖纹
  {
    const wr = Math.max(1, ref * 0.0021), by = roofY + ref * 0.005;
    g.fillStyle = css(INK);
    g.beginPath(); for (let x = roofX0 + wr; x < roofX1; x += wr * 2) { g.moveTo(x + wr, by); g.arc(x, by, wr, 0, Math.PI); } g.fill();
    const rs = Math.max(6, ref * 0.016);
    for (let x = roofX0 + rs * 0.5; x < roofX1; x += rs) g.fillRect(x, by, Math.max(1, ref * 0.002), ref * 0.0045);
    g.fillStyle = css(rimCol, 0.06 + 0.06 * day);
    for (let x = roofX0 + wr; x < roofX1; x += wr * 2) g.fillRect(x, roofY - ref * 0.005, Math.max(0.5, ref * 0.0006), ref * 0.009);
  }

  // station room with a lit window
  const roomTop = yM - roomH;
  rr(g, roomX, roomTop, roomW, roomH, ref * 0.004);
  g.fillStyle = rgb2css(mix(INK, TRAM_DARK, 0.4)); g.fill();
  g.strokeStyle = css(INK, 0.9); g.lineWidth = Math.max(1.2, ref * 0.0025); g.stroke();
  // 第七版：护墙板（一道亮、一道暗），墙脚一道深的
  {
    g.save(); rr(g, roomX, roomTop, roomW, roomH, ref * 0.004); g.clip();
    const st = Math.max(2.6, ref * 0.0058);
    for (let y = roomTop + st; y < yM - st * 0.5; y += st) {
      g.fillStyle = css(INK, 0.32); g.fillRect(roomX, y, roomW, Math.max(0.6, ref * 0.0008));
      g.fillStyle = css(rimCol, 0.035 + 0.05 * day); g.fillRect(roomX, y + Math.max(0.6, ref * 0.0008), roomW, Math.max(0.5, ref * 0.0006));
    }
    g.fillStyle = css(INK, 0.5); g.fillRect(roomX, yM - ref * 0.007, roomW, ref * 0.007);
    g.restore();
  }
  g.fillStyle = css(INK); g.fillRect(roomX - ref * 0.004, roomTop - ref * 0.004, roomW + ref * 0.008, ref * 0.008);
  const winW = roomW * 0.34, winH = roomH * 0.34, winX = roomX + roomW * 0.18, winY = roomTop + roomH * 0.24;
  const fl = 0.9 + 0.025 * Math.sin(t * 0.8);
  glow(g, glowSpr, winX + winW / 2, winY + winH / 2, winW * 2.8, winH * 3, 0.2 * fl * (1 - 0.8 * day));
  const wg = g.createLinearGradient(0, winY, 0, winY + winH);
  wg.addColorStop(0, css(mix(WARM_HI, DAY_GLASS, day), fl)); wg.addColorStop(1, css(mix(WARM, DAY_GLASS, day), fl * 0.9));
  rr(g, winX, winY, winW, winH, ref * 0.002); g.fillStyle = wg; g.fill();
  // 半拉的帘子
  g.save(); rr(g, winX, winY, winW, winH, ref * 0.002); g.clip();
  g.fillStyle = css(mix(mix(WARM, [196, 132, 104], 0.55), [150, 168, 190], day), 0.55);
  g.beginPath(); g.moveTo(winX, winY); g.lineTo(winX + winW * 0.36, winY); g.quadraticCurveTo(winX + winW * 0.3, winY + winH * 0.55, winX + winW * 0.12, winY + winH * 0.62);
  g.quadraticCurveTo(winX + winW * 0.2, winY + winH * 0.8, winX + winW * 0.16, winY + winH); g.lineTo(winX, winY + winH); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = css(INK, 0.8); g.lineWidth = Math.max(1, ref * 0.0016);
  rr(g, winX, winY, winW, winH, ref * 0.002); g.stroke();
  g.beginPath(); g.moveTo(winX + winW / 2, winY); g.lineTo(winX + winW / 2, winY + winH); g.stroke();
  // 门：门板、门上的小窗、门把手；门下的缝里漏出一线光
  {
    const dX = roomX + roomW * 0.62, dY = roomTop + roomH * 0.18, dW = roomW * 0.26, dH = roomH * 0.82;
    g.fillStyle = css(mix(mix(INK, TRAM_DARK, 0.8), [92, 98, 124], day * 0.6)); g.fillRect(dX, dY, dW, dH);
    g.strokeStyle = css(INK, 0.85); g.lineWidth = Math.max(1, ref * 0.0016); g.strokeRect(dX, dY, dW, dH);
    const dwX = dX + dW * 0.22, dwY = dY + dH * 0.1, dwW = dW * 0.56, dwH = dH * 0.24;
    g.fillStyle = css(mix(WARM, DAY_GLASS, day), 0.72 * fl); g.fillRect(dwX, dwY, dwW, dwH);
    g.strokeStyle = css(INK, 0.7); g.lineWidth = Math.max(0.6, ref * 0.0009); g.strokeRect(dwX, dwY, dwW, dwH);
    g.fillStyle = css(mix([196, 156, 92], [214, 180, 112], day), 0.9);
    g.beginPath(); g.arc(dX + dW * 0.8, dY + dH * 0.56, Math.max(0.8, ref * 0.0014), 0, TAU); g.fill();
    if (lit > 0.1) { g.fillStyle = css(WARM, 0.6 * lit); g.fillRect(dX + dW * 0.08, yM - Math.max(1, ref * 0.0013), dW * 0.84, Math.max(1, ref * 0.0013)); }
    stationDoorExtras(g, P, dX, dY, dW, dH, rimCol, day, lit, night, index);
  }
  // 墙上的时刻表
  {
    const bx = roomX + roomW * 0.045, by = roomTop + roomH * 0.3, bw = roomW * 0.1, bh = roomH * 0.3;
    g.fillStyle = css(mix([60, 64, 96], [228, 220, 200], 0.35 + 0.5 * day), 0.6 + 0.3 * day); g.fillRect(bx, by, bw, bh);
    g.fillStyle = css(INK, 0.45);
    for (let k = 0; k < 5; k++) g.fillRect(bx + bw * 0.15, by + bh * (0.16 + k * 0.16), bw * (k % 2 ? 0.5 : 0.7), Math.max(0.5, ref * 0.0007));
  }
  // 门上方的钟：走的是你那边的时间——慢了七分钟，一直没有人去拨
  {
    const cx = winX + winW / 2, cy = roomTop + roomH * 0.12, r = Math.max(2.4, ref * 0.0068);
    if (lit > 0.1) glow(g, glowSpr, cx, cy, r * 6, r * 6, 0.16 * lit);
    g.fillStyle = css(mix([236, 224, 198], [244, 240, 230], day)); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.strokeStyle = css(INK, 0.9); g.lineWidth = Math.max(0.8, r * 0.18); g.stroke();
    const d = new Date(Date.now() - 7 * 60000), mm = d.getMinutes() + d.getSeconds() / 60, hh = (d.getHours() % 12) + mm / 60;
    g.lineCap = 'round'; g.lineWidth = Math.max(0.6, r * 0.16);
    g.beginPath();
    g.moveTo(cx, cy); g.lineTo(cx + Math.sin(hh / 12 * TAU) * r * 0.5, cy - Math.cos(hh / 12 * TAU) * r * 0.5);
    g.moveTo(cx, cy); g.lineTo(cx + Math.sin(mm / 60 * TAU) * r * 0.78, cy - Math.cos(mm / 60 * TAU) * r * 0.78);
    g.stroke();
  }
  hitAt(g, 'room', roomX, roomTop, roomW, roomH);
  // Pendant lights：灯罩、往下的一束光、月台上的一小片光；夜里飞蛾绕着灯
  [0.18, 0.52, 0.87].forEach((f, li) => {
    const lx = lerp(roofX0, roofX1, f), ly = roofY + ref * 0.016;
    g.strokeStyle = css(INK); g.lineWidth = 1;
    g.beginPath(); g.moveTo(lx, roofY); g.lineTo(lx, ly - ref * 0.004); g.stroke();
    const on = (0.18 + night * 0.14) * lit;
    glow(g, glowSpr, lx, ly, ref * 0.105, ref * 0.10, on);
    if (li < 2 && lit > 0.05) {
      const cone = g.createLinearGradient(0, ly, 0, yM);
      cone.addColorStop(0, 'rgba(255,214,162,' + (0.11 * lit * (0.45 + 0.55 * night)).toFixed(3) + ')');
      cone.addColorStop(1, 'rgba(255,214,162,0)');
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = cone;
      g.beginPath(); g.moveTo(lx - ref * 0.007, ly + ref * 0.001); g.lineTo(lx + ref * 0.007, ly + ref * 0.001);
      g.lineTo(lx + ref * 0.05, yM); g.lineTo(lx - ref * 0.05, yM); g.closePath(); g.fill(); g.restore();
      glow(g, glowSpr, lx, yM - ref * 0.002, ref * 0.12, ref * 0.014, 0.34 * lit * (0.35 + 0.65 * night));
    }
    // 灯罩
    g.fillStyle = css(INK);
    g.beginPath(); g.moveTo(lx - ref * 0.0035, ly - ref * 0.0042); g.lineTo(lx + ref * 0.0035, ly - ref * 0.0042);
    g.lineTo(lx + ref * 0.0085, ly + ref * 0.0006); g.lineTo(lx - ref * 0.0085, ly + ref * 0.0006); g.closePath(); g.fill();
    g.fillStyle = css(rimCol, 0.3); g.fillRect(lx - ref * 0.003, ly - ref * 0.0042, ref * 0.006, Math.max(0.5, ref * 0.0006));
    g.fillStyle = '#ffe3ad'; g.fillRect(lx - ref * 0.006, ly + ref * 0.0006, ref * 0.012, Math.max(1, ref * 0.002));
    // moths wake up with the moon and circle the warm lamps
    if (night > 0.3) {
      if (night > 0.4) hitAt(g, 'moths', lx - ref * 0.03, ly - ref * 0.004, ref * 0.06, ref * 0.04);
      const ma = (night - 0.3) / 0.7, ms = Math.max(1.1, ref * 0.0024);
      for (let m = 0; m < 3; m++) {
        const ph = li * 2.4 + m * 2.1 + index * 1.7;
        const mx = lx + (Math.sin(t * 1.6 + ph) * 0.017 + Math.sin(t * 3.4 + ph * 1.7) * 0.006) * ref;
        const my = ly + ref * 0.011 + Math.cos(t * 2.2 + ph) * ref * 0.011 + Math.sin(t * 5.1 + ph) * ref * 0.002;
        const flap = Math.abs(Math.sin(t * 26 + ph * 5)), a = ma * (0.6 + 0.4 * Math.sin(t * 6.3 + ph));
        glow(g, glowSpr, mx, my, ref * 0.013, ref * 0.013, 0.3 * a);
        g.fillStyle = 'rgba(255,232,196,' + (0.8 * a).toFixed(3) + ')';
        g.beginPath(); g.ellipse(mx - ms * 0.45, my, ms * 0.5, ms * (0.18 + 0.42 * flap), -0.5, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(mx + ms * 0.45, my, ms * 0.5, ms * (0.18 + 0.42 * flap), 0.5, 0, TAU); g.fill();
      }
    }
  });
  drawStationBoard(g, P, index, roofY, name);
  // bench：座面、靠背、四条腿
  const benchX = roofX0 + span * 0.13;
  g.strokeStyle = css(INK); g.lineWidth = Math.max(1.3, ref * 0.003);
  g.beginPath(); g.moveTo(benchX, yM - ref * 0.021); g.lineTo(benchX + ref * 0.075, yM - ref * 0.021);
  g.moveTo(benchX + ref * 0.01, yM - ref * 0.021); g.lineTo(benchX + ref * 0.01, yM);
  g.moveTo(benchX + ref * 0.065, yM - ref * 0.021); g.lineTo(benchX + ref * 0.065, yM); g.stroke();
  g.lineWidth = Math.max(1, ref * 0.0022);
  g.beginPath(); g.moveTo(benchX + ref * 0.004, yM - ref * 0.035); g.lineTo(benchX + ref * 0.071, yM - ref * 0.035);
  g.moveTo(benchX + ref * 0.012, yM - ref * 0.035); g.lineTo(benchX + ref * 0.012, yM - ref * 0.021);
  g.moveTo(benchX + ref * 0.063, yM - ref * 0.035); g.lineTo(benchX + ref * 0.063, yM - ref * 0.021); g.stroke();
  g.fillStyle = css(rimCol, 0.18); g.fillRect(benchX + ref * 0.004, yM - ref * 0.0365, ref * 0.067, Math.max(0.5, ref * 0.0007));
  g.strokeStyle = css(INK); g.lineWidth = Math.max(0.8, ref * 0.0016);
  g.beginPath(); g.moveTo(benchX + ref * 0.004, yM - ref * 0.029); g.lineTo(benchX + ref * 0.071, yM - ref * 0.029); g.stroke();
  // 第七版：月台边一道黄色的盲道（黄昏里只看得出一点黄）
  {
    const y = yM - Math.max(1, ref * 0.0016), dl = Math.max(3, ref * 0.006), x0 = roofX0 - ref * 0.03, x1 = roofX1 + ref * 0.02;
    g.fillStyle = css(mix(mix([232, 190, 72], INK, 0.62 - 0.5 * day), WARM, 0.25 * night * lit), 0.85);
    for (let x = x0; x < x1; x += dl * 1.6) g.fillRect(x, y, dl, Math.max(1, ref * 0.0013));
  }
  // 靠背的右端，有人刻了一个很小的月亮
  {
    const cx = benchX + ref * 0.058, cy = yM - ref * 0.0287, r = ref * 0.0026;
    g.fillStyle = css(mix(WARM, [255, 255, 255], day), 0.34 + 0.2 * day);
    g.beginPath(); g.moveTo(cx, cy - r); g.quadraticCurveTo(cx - r * 1.4, cy, cx, cy + r); g.quadraticCurveTo(cx - r * 0.6, cy, cx, cy - r); g.fill();
  }
  hitAt(g, 'bench', benchX - ref * 0.004, yM - ref * 0.04, ref * 0.083, ref * 0.04);
  drawStationFront(g, P, index, name, benchX);
}
function rgb2css(c) { return css(c); }

/* 站名牌：站名、拼音、一道细线；左边下一站，右边上一站 */
function drawStationBoard(g, P, index, roofY, name) {
  const { ref } = S, span = P.roofX1 - P.roofX0;
  const bw = ref * 0.1, bh = ref * 0.047, sx = P.roofX0 + span * 0.105, sy = roofY + ref * 0.021;
  g.strokeStyle = css(INK, 0.85); g.lineWidth = Math.max(0.7, ref * 0.001);
  g.beginPath(); g.moveTo(sx + bw * 0.14, roofY); g.lineTo(sx + bw * 0.14, sy); g.moveTo(sx + bw * 0.86, roofY); g.lineTo(sx + bw * 0.86, sy); g.stroke();
  g.fillStyle = '#141b32'; g.fillRect(sx, sy, bw, bh);
  if (name === '灯岬' && CAPE.flash > 0.01) { g.fillStyle = 'rgba(255,236,196,' + (0.28 * CAPE.flash).toFixed(3) + ')'; g.fillRect(sx, sy, bw, bh); }
  g.strokeStyle = 'rgba(236,206,161,0.4)'; g.lineWidth = Math.max(0.5, ref * 0.0008);
  g.strokeRect(sx, sy, bw, bh);
  g.fillStyle = '#edd2ac'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '400 ' + Math.max(8, ref * 0.0165) + 'px ' + STATION_FONT;
  g.fillText(name, sx + bw / 2, sy + bh * 0.36);
  const small = ref * 0.0062, tiny = ref * 0.0056;
  const prev = index > 0 ? stationName(index - 1) : null, next = stationName(index + 1);
  g.fillStyle = 'rgba(236,206,161,0.26)'; g.fillRect(sx + bw * 0.07, sy + bh * 0.755, bw * 0.86, Math.max(0.5, ref * 0.0006));
  if (small >= 3.6 || small * (RX ? RX.z : S.dpr) >= 9) {          // 手机上太小就只留一道线；揭下来的高清卡片上照样有拼音和邻站
    g.font = 'italic 400 ' + small + 'px Georgia, "Times New Roman", serif'; g.fillStyle = 'rgba(214,190,152,0.82)';
    g.fillText(PINYIN[name] || '', sx + bw / 2, sy + bh * 0.62);
    g.font = '400 ' + tiny + 'px ' + STATION_FONT; g.fillStyle = 'rgba(214,190,152,0.72)';
    g.textAlign = 'left'; g.fillText('‹ ' + next, sx + bw * 0.07, sy + bh * 0.88);
    if (prev) { g.textAlign = 'right'; g.fillText(prev + ' ›', sx + bw * 0.93, sy + bh * 0.88); }
    g.textAlign = 'center';
  } else {
    g.fillStyle = 'rgba(214,190,152,0.35)';
    g.fillRect(sx + bw * 0.3, sy + bh * 0.6, bw * 0.4, Math.max(0.5, ref * 0.0008));
  }
  // 右上角一枚小红章：这一站走到的节气
  {
    const term = TERMS[termAtStation(index)], ss = bh * 0.42, cx = sx + bw - ss * 0.62, cy = sy + ss * 0.62;
    g.fillStyle = 'rgba(178,52,44,0.92)'; rr(g, cx - ss / 2, cy - ss / 2, ss, ss, ss * 0.12); g.fill();
    g.strokeStyle = 'rgba(255,220,200,0.35)'; g.lineWidth = Math.max(0.4, ss * 0.05); rr(g, cx - ss * 0.42, cy - ss * 0.42, ss * 0.84, ss * 0.84, ss * 0.08); g.stroke();
    if (ss * 0.36 * (RX ? RX.z : S.dpr) >= 5) {
      g.fillStyle = '#ffe9dc'; g.font = '400 ' + (ss * 0.36) + 'px ' + STATION_FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(term[0], cx, cy - ss * 0.19); g.fillText(term[1], cx, cy + ss * 0.21);
    }
  }
  hitAt(g, stationKey(index), sx - ref * 0.004, sy - ref * 0.012, bw + ref * 0.008, bh + ref * 0.016);
}

/* 每一站自己的东西：在车站后面画的 */
function drawStationBack(g, P, index, name) {
  const { yM, ref, t } = S, span = P.roofX1 - P.roofX0;
  stationSeasonBack(g, P, index, name);
  if (name === '月见') { drawPampas(g, P.roofX0 - ref * 0.022, index * 11 + 1, 1); drawPampas(g, P.roofX1 + ref * (S.portrait ? 0.004 : 0.016), index * 11 + 5, 0.85); }
  if (name === '灯岬') drawCapeLight(g, P, index);
  if (name === '听风') drawWindsock(g, lerp(P.roofX0, P.roofX1, 0.9), yM - P.sh - ref * 0.006, index);
}
/* 在车站前面画的 */
function drawStationFront(g, P, index, name, benchX) {
  const { yM, ref } = S;
  if (name === '潮生') drawTidePole(g, P.roofX1 + ref * 0.018, index);
  if (name === '听风') drawPinwheels(g, P.roomX + P.roomW * 0.35 - ref * 0.017, index);
  if (name === '拾光') drawLightJars(g, benchX, index);
  stationSeasonFront(g, P, index, name, benchX);
}

/* 月见的芒草：叶片从根部拱出去、叶尖垂下；穗子是柔软的一束，被风吹得朝车头那边低下去 */
function drawPampas(g, x, seed, scale) {
  const { yM, ref, t } = S, rnd = mulberry32(seed), day = S.dayF, night = S.nightF, moon = SKY2.moonA || 0;
  const wind = 0.35 + S.gust * 0.9, gustK = 1 + S.gust * 2.5;
  const plumeC = mix(mix([236, 200, 186], [208, 216, 236], night), [240, 230, 204], day);
  const plumeA = 0.42 + 0.22 * moon * night + 0.3 * day;
  const stemC = mix(INK, rgb('#66704f'), day);
  hitAt(g, 'pampas', x - ref * 0.035 * scale, yM - ref * 0.085 * scale, ref * 0.07 * scale, ref * 0.085 * scale);
  // 叶片
  g.fillStyle = css(stemC, 0.95);
  for (let k = 0; k < 8; k++) {
    const dir = k % 2 ? 1 : -1, len = ref * (0.026 + rnd() * 0.024) * scale, bx = x + (rnd() - 0.5) * ref * 0.008 * scale;
    const lift = 0.6 + rnd() * 0.35, w = Math.max(0.55, ref * 0.0014 * scale);
    const sw = Math.sin(t * 1.3 + k * 1.1 + seed) * ref * 0.0012 * gustK;
    const tipX = bx + dir * len + sw, tipY = yM - len * lift * 0.42, cX = bx + dir * len * 0.38, cY = yM - len * lift * 1.02;
    g.beginPath(); g.moveTo(bx - w, yM); g.quadraticCurveTo(cX - w * dir, cY - w, tipX, tipY); g.quadraticCurveTo(cX + w * dir, cY + w * 1.6, bx + w, yM); g.closePath(); g.fill();
  }
  // 秆与穗
  const n = 8;
  for (let j = 0; j < n; j++) {
    const bx = x + (j - (n - 1) / 2) * ref * 0.0034 * scale + (rnd() - 0.5) * ref * 0.002, h = ref * (0.048 + rnd() * 0.034) * scale, lean = (rnd() - 0.5) * 0.3 - 0.06;
    const sway = (Math.sin(t * 1.25 + j * 0.7 + seed) * 0.6 + Math.sin(t * 2.9 + j) * 0.25) * ref * 0.0026 * gustK - wind * ref * 0.004;
    const tx = bx + lean * h * 0.45 + sway, ty = yM - h + Math.abs(sway) * 0.25;
    g.strokeStyle = css(stemC, 0.9); g.lineWidth = Math.max(0.6, ref * 0.0009); g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx, yM); g.quadraticCurveTo(bx + lean * h * 0.12, yM - h * 0.55, tx, ty); g.stroke();
    // 穗：从秆顶往左下垂的一束，中间饱满、两头尖
    const pl = ref * (0.015 + rnd() * 0.009) * scale, ang = -Math.PI / 2 - (0.75 + 0.6 * wind) + (rnd() - 0.5) * 0.3;
    const ex = tx + Math.cos(ang) * pl, ey = ty + Math.sin(ang) * pl + pl * (0.25 + 0.35 * wind);
    const dx = ex - tx, dy = ey - ty, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl, bw = ref * 0.0034 * scale;
    const mx = tx + dx * 0.45, my = ty + dy * 0.45;
    g.fillStyle = css(plumeC, plumeA * 0.6);
    g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(mx + nx * bw, my + ny * bw, ex, ey); g.quadraticCurveTo(mx - nx * bw * 0.7, my - ny * bw * 0.7, tx, ty); g.fill();
    g.strokeStyle = css(plumeC, plumeA); g.lineWidth = Math.max(0.5, ref * 0.0006);
    g.beginPath();
    for (let q = 1; q <= 4; q++) {
      const f = q / 5, px = tx + dx * f, py = ty + dy * f, sl = bw * (1.5 - f * 0.7);
      g.moveTo(px, py); g.lineTo(px + dx / dl * sl * 0.7 + nx * sl * 0.8, py + dy / dl * sl * 0.7 + ny * sl * 0.8);
      g.moveTo(px, py); g.lineTo(px + dx / dl * sl * 0.7 - nx * sl * 0.6, py + dy / dl * sl * 0.7 - ny * sl * 0.6);
    }
    g.stroke();
  }
}

/* 潮生的潮位尺：红白相间，脚下有一圈小浪 */
function drawTidePole(g, x, index) {
  const { yM, ref, t } = S, day = S.dayF;
  const h = ref * 0.078, w = Math.max(2, ref * 0.0055), seg = h / 10;
  hitAt(g, 'tidepole', x - ref * 0.012, yM - h - ref * 0.012, ref * 0.024, h + ref * 0.012);
  for (let k = 0; k < 10; k++) {
    const red = k % 2 === 0;
    g.fillStyle = red ? css(mix(mix(INK, [170, 52, 48], 0.55), [196, 70, 58], day)) : css(mix(mix(INK, [220, 214, 200], 0.42), [240, 236, 226], day));
    g.fillRect(x - w / 2, yM - (k + 1) * seg, w, seg + 0.3);
  }
  g.fillStyle = css(INK, 0.7);
  for (let k = 0; k < 10; k++) g.fillRect(x + w / 2, yM - k * seg - seg * 0.5, Math.max(0.8, w * 0.5), Math.max(0.5, ref * 0.0006));
  // 顶上的小红灯，夜里慢慢闪
  const on = (1 - day) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.4 + index)));
  g.fillStyle = css(INK); g.fillRect(x - w * 0.8, yM - h - ref * 0.003, w * 1.6, ref * 0.003);
  if (on > 0.05) { glow(g, glowSpr, x, yM - h - ref * 0.006, ref * 0.02, ref * 0.02, 0.4 * on); g.fillStyle = 'rgba(255,120,96,' + (0.9 * on).toFixed(2) + ')'; g.fillRect(x - 1, yM - h - ref * 0.007, 2, 2); }
  // 脚下的浪
  g.strokeStyle = 'rgba(236,230,255,' + (0.3 + 0.2 * day).toFixed(2) + ')'; g.lineWidth = Math.max(0.7, ref * 0.0009);
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.7 + k / 3) % 1, rx = w * (1.2 + ph * 3.5);
    g.globalAlpha = 1 - ph;
    g.beginPath(); g.ellipse(x, yM - ref * 0.001, rx, rx * 0.18, 0, Math.PI, TAU); g.stroke();
  }
  g.globalAlpha = 1;
}

/* 灯岬的灯塔：站在候车室后面，比远处的都高；光柱扫过来的时候，站名牌亮一下 */
function drawCapeLight(g, P, index) {
  const { yM, ref, t } = S, day = S.dayF;
  const x = lerp(P.roofX0, P.roofX1, 0.9), by = yM, bh = ref * (S.portrait ? 0.26 : 0.215);
  const bw = ref * 0.017, tw2 = ref * 0.0105, lh2 = ref * 0.02, lampY = by - bh - lh2 * 0.55;
  const beamA = clamp((S.nightF - 0.12) / 0.5, 0, 1);
  hitAt(g, 'capelight', x - bw * 1.4, by - bh - lh2 * 1.8, bw * 2.8, bh * 0.55);
  const body = mix(rgb('#1b2050'), rgb('#e4e2dc'), day), band = mix(mix(rgb('#1b2050'), rgb('#9a3a3a'), 0.4), rgb('#b8463e'), day);
  g.fillStyle = css(body);
  g.beginPath(); g.moveTo(x - bw, by); g.lineTo(x - tw2, by - bh); g.lineTo(x + tw2, by - bh); g.lineTo(x + bw, by); g.closePath(); g.fill();
  // 两道红带
  g.save(); g.beginPath(); g.moveTo(x - bw, by); g.lineTo(x - tw2, by - bh); g.lineTo(x + tw2, by - bh); g.lineTo(x + bw, by); g.closePath(); g.clip();
  g.fillStyle = css(band); g.fillRect(x - bw, by - bh * 0.72, bw * 2, bh * 0.1); g.fillRect(x - bw, by - bh * 0.42, bw * 2, bh * 0.1);
  g.restore();
  // 灯室、走廊、圆顶
  g.fillStyle = css(mix(rgb('#141844'), rgb('#3a3f52'), day));
  g.fillRect(x - lh2 * 0.95, by - bh - ref * 0.0025, lh2 * 1.9, Math.max(1, ref * 0.0025));
  g.fillRect(x - lh2 * 0.55, by - bh - lh2, lh2 * 1.1, lh2);
  g.beginPath(); g.arc(x, by - bh - lh2, lh2 * 0.5, Math.PI, 0); g.fill();
  g.strokeStyle = 'rgba(255,170,130,' + (0.25 * (1 - beamA * 0.8)).toFixed(3) + ')'; g.lineWidth = Math.max(0.8, ref * 0.0012);
  g.beginPath(); g.moveTo(x + tw2, by - bh); g.lineTo(x + bw, by); g.stroke();
  const roll = t * TAU / 9.1 + index;
  CAPE.flash = Math.max(CAPE.flash * 0.9, beamA * Math.pow(Math.max(0, -Math.cos(roll)), 14));
  if (beamA <= 0.02) { g.fillStyle = css(mix(rgb('#2a2f5a'), rgb('#cfd8e0'), day)); g.fillRect(x - lh2 * 0.32, lampY - lh2 * 0.3, lh2 * 0.64, lh2 * 0.6); return; }
  glow(g, glowSpr, x, lampY, ref * 0.08, ref * 0.08, (0.5 + 0.1 * Math.sin(t * 2.6)) * beamA);
  g.fillStyle = 'rgba(255,240,200,' + (0.95 * beamA).toFixed(3) + ')';
  g.fillRect(x - lh2 * 0.32, lampY - lh2 * 0.3, lh2 * 0.64, lh2 * 0.6);
  const BL = ref * 0.9, half = 0.085;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const dir of [roll, roll + Math.PI]) {
    const fade = 1 - Math.max(0, Math.sin(dir)) * 1.6;
    if (fade <= 0.03) continue;
    const bg = g.createRadialGradient(x, lampY, 0, x, lampY, BL);
    bg.addColorStop(0, 'rgba(255,232,180,' + (0.2 * beamA * fade).toFixed(3) + ')');
    bg.addColorStop(1, 'rgba(255,232,180,0)');
    g.fillStyle = bg;
    g.beginPath(); g.moveTo(x, lampY); g.arc(x, lampY, BL, dir - half, dir + half); g.closePath(); g.fill();
  }
  g.restore();
}

/* 听风的风向袋：插在候车室的房顶上，跟着风鼓起来、摆过去 */
function drawWindsock(g, x, roofTop, index) {
  const { ref, t } = S, day = S.dayF;
  const ph = ref * 0.075, top = roofTop - ph, wind = clamp(0.3 + S.gust * 0.8 + 0.08 * Math.sin(t * 0.5 + index), 0, 1);
  g.strokeStyle = css(day > 0.5 ? rgb('#3a4058') : INK); g.lineWidth = Math.max(1, ref * 0.0016);
  g.beginPath(); g.moveTo(x, roofTop); g.lineTo(x, top); g.stroke();
  g.fillStyle = css(INK); g.beginPath(); g.arc(x, top, Math.max(1, ref * 0.0018), 0, TAU); g.fill();
  hitAt(g, 'windsock', x - ref * 0.05, top - ref * 0.01, ref * 0.055, ph + ref * 0.012);
  // 袋子分五节，一节比一节细；风小时往下垂，风大时平平地指向车头那边
  const segs = 5, L = ref * 0.042;
  let px = x, py = top + ref * 0.003, a = lerp(1.15, 0.06, wind);      // a：袋子往下垂的角度（0 = 水平朝左）
  for (let k = 0; k < segs; k++) {
    const r0 = ref * 0.0055 * (1 - k * 0.12), r1 = ref * 0.0055 * (1 - (k + 1) * 0.12);
    a += Math.sin(t * 6.8 + (S.gustI || 0) * 4.8 - k * 0.9) * 0.05 * wind + (1 - wind) * 0.1;     // 风积分进相位里：风变了只是抖得快慢不同，不会乱跳
    const nx = px - Math.cos(a) * L / segs, ny = py + Math.sin(a) * L / segs;
    const ox = Math.sin(a), oy = Math.cos(a);
    const orange = k % 2 === 0;
    g.fillStyle = orange ? css(mix(mix(INK, [222, 108, 58], 0.5), [238, 122, 64], day)) : css(mix(mix(INK, [226, 222, 214], 0.45), [244, 242, 236], day));
    g.beginPath(); g.moveTo(px + ox * r0, py + oy * r0); g.lineTo(nx + ox * r1, ny + oy * r1); g.lineTo(nx - ox * r1, ny - oy * r1); g.lineTo(px - ox * r0, py - oy * r0); g.closePath(); g.fill();
    px = nx; py = ny;
  }
}

/* 听风的纸风车：插在候车室窗下的花槽里，风越大转得越快 */
function drawPinwheels(g, x0, index) {
  const { yM, ref, t } = S, day = S.dayF;
  const boxW = ref * 0.034, boxH = ref * 0.008;
  g.fillStyle = css(mix(INK, rgb('#4f6a46'), 0.25 + 0.55 * day));
  for (let k = 0; k < 6; k++) {
    const lx = x0 + boxW * (0.08 + k * 0.17), lh = ref * (0.006 + (k % 3) * 0.002);
    g.beginPath(); g.moveTo(lx - ref * 0.002, yM - boxH); g.quadraticCurveTo(lx + ref * 0.001, yM - boxH - lh, lx + ref * 0.0035, yM - boxH - lh * 0.8); g.lineTo(lx + ref * 0.002, yM - boxH); g.closePath(); g.fill();
  }
  g.fillStyle = css(mix(INK, rgb('#6a4a3a'), 0.2 + 0.8 * day)); g.fillRect(x0, yM - boxH, boxW, boxH);
  g.fillStyle = css(mix([255, 190, 150], [255, 255, 255], day), 0.18); g.fillRect(x0, yM - boxH, boxW, Math.max(0.5, ref * 0.0008));
  hitAt(g, 'pinwheel', x0 - ref * 0.004, yM - ref * 0.05, boxW + ref * 0.008, ref * 0.05);
  const cols = [[222, 86, 76], [236, 196, 84], [86, 148, 210]];
  const spin = t * 2.2 + (S.gustI || 0) * 9 + index;                    // 转过的角度是积分出来的：风一来转得快，风停了慢下来，不会倒着转
  for (let k = 0; k < 3; k++) {
    const x = x0 + boxW * (0.2 + k * 0.3), h = ref * (0.026 + (k % 2) * 0.007), cy = yM - boxH - h, r = ref * 0.0058;
    g.strokeStyle = css(INK, 0.9); g.lineWidth = Math.max(0.7, ref * 0.001);
    g.beginPath(); g.moveTo(x, yM - boxH); g.lineTo(x, cy); g.stroke();
    const c = mix(mix(INK, cols[k], 0.45 + 0.15 * (1 - S.nightF)), cols[k], day);
    for (let b = 0; b < 4; b++) {
      const a = spin * (1 + k * 0.17) + b * Math.PI / 2;
      g.fillStyle = css(b % 2 ? mix(c, [255, 255, 255], 0.25 * day) : c);
      g.beginPath(); g.moveTo(x, cy); g.lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(x + Math.cos(a + 0.9) * r * 0.7, cy + Math.sin(a + 0.9) * r * 0.7); g.closePath(); g.fill();
    }
    g.fillStyle = css(INK); g.beginPath(); g.arc(x, cy, Math.max(0.7, r * 0.16), 0, TAU); g.fill();
  }
}

/* 拾光长椅上的光瓶：白天剩下的一点光，天黑以后自己亮起来 */
function drawLightJars(g, benchX, index) {
  const { yM, ref, t } = S, day = S.dayF, on = (1 - day) * (0.45 + 0.55 * S.nightF);
  const seat = yM - ref * 0.021;
  hitAt(g, 'lightjars', benchX + ref * 0.008, seat - ref * 0.016, ref * 0.06, ref * 0.016);
  const rnd = mulberry32(index * 7 + 3);
  [[0.016, 1], [0.031, 0.82], [0.052, 0.92]].forEach(([dx, s], k) => {
    const x = benchX + ref * dx, w = ref * 0.0085 * s, h = ref * 0.0115 * s, y = seat - h;
    if (on > 0.02) glow(g, glowSpr, x, y + h * 0.5, w * 5, h * 3.6, 0.42 * on * (0.85 + 0.15 * Math.sin(t * 1.7 + k)));
    rr(g, x - w / 2, y, w, h, w * 0.25);
    g.fillStyle = css(mix([214, 226, 236], [255, 224, 150], on), 0.25 + 0.55 * on); g.fill();
    g.strokeStyle = 'rgba(230,236,244,' + (0.45 + 0.2 * day).toFixed(2) + ')'; g.lineWidth = Math.max(0.6, ref * 0.0008); g.stroke();
    g.fillStyle = css(mix(INK, rgb('#8a6a4a'), 0.5 + 0.5 * day)); g.fillRect(x - w * 0.42, y - h * 0.14, w * 0.84, h * 0.16);
    // 瓶里的光点
    if (on > 0.05) for (let m = 0; m < 3; m++) {
      const ph = rnd() * TAU, mx = x + Math.sin(t * 0.9 + ph) * w * 0.28, my = y + h * (0.55 + 0.25 * Math.sin(t * 1.3 + ph * 2));
      g.fillStyle = 'rgba(255,248,214,' + (on * (0.5 + 0.5 * Math.sin(t * 3 + ph))).toFixed(2) + ')';
      g.fillRect(mx - 0.6, my - 0.6, 1.2, 1.2);
    }
  });
}

/* 第七版：候车室门口的小东西——门上的小雨棚、一盏壁灯、门边一张海报、一盆花、墙外一只红邮筒 */
function stationDoorExtras(g, P, dX, dY, dW, dH, rimCol, day, lit, night, index) {
  const { yM, ref, t } = S, { roomX, roomW } = P;
  // 小雨棚
  g.fillStyle = css(INK);
  g.beginPath(); g.moveTo(dX - dW * 0.2, dY - ref * 0.002); g.lineTo(dX + dW * 1.2, dY - ref * 0.002); g.lineTo(dX + dW * 1.12, dY - ref * 0.0075); g.lineTo(dX - dW * 0.12, dY - ref * 0.0075); g.closePath(); g.fill();
  g.fillStyle = css(rimCol, 0.2 + 0.15 * day); g.fillRect(dX - dW * 0.12, dY - ref * 0.0075, dW * 1.24, Math.max(0.6, ref * 0.0008));
  // 壁灯：门的右上方，黄昏起亮
  const lx = dX + dW * 1.12, ly = dY + dH * 0.08;
  g.fillStyle = css(INK); g.fillRect(lx - ref * 0.001, ly - ref * 0.004, Math.max(1, ref * 0.0035), Math.max(1, ref * 0.0012));
  if (lit > 0.05) { glow(g, glowSpr, lx + ref * 0.002, ly + ref * 0.002, ref * 0.04, ref * 0.04, (0.14 + 0.2 * night) * lit); }
  g.fillStyle = css(mix([90, 80, 70], WARM_HI, 0.3 + 0.7 * lit)); g.beginPath(); g.arc(lx + ref * 0.002, ly + ref * 0.0025, Math.max(1, ref * 0.0024), 0, TAU); g.fill();
  // 海报：门左边，一张褪了色的
  {
    const px = dX - roomW * 0.085, pw = roomW * 0.062, ph = P.roomH * 0.24, py = dY + dH * 0.2, k = index % 3;
    const col = [[196, 92, 78], [70, 128, 140], [214, 168, 82]][k];
    g.fillStyle = css(mix(mix(col, INK, 0.62 - 0.45 * day), WARM, 0.18 * lit * night), 0.9); g.fillRect(px, py, pw, ph);
    g.fillStyle = css(mix([240, 232, 214], INK, 0.55 - 0.45 * day), 0.85); g.fillRect(px + pw * 0.15, py + ph * 0.1, pw * 0.7, ph * 0.38);
    g.fillStyle = css(INK, 0.35); g.fillRect(px + pw * 0.15, py + ph * 0.6, pw * 0.7, Math.max(0.5, ph * 0.05)); g.fillRect(px + pw * 0.15, py + ph * 0.72, pw * 0.45, Math.max(0.5, ph * 0.05));
  }
  // 一盆花：门边
  {
    const bx = dX - ref * 0.0035, pw = ref * 0.009, ph = ref * 0.007;
    g.fillStyle = css(mix([150, 92, 64], INK, 0.7 - 0.5 * day));
    g.beginPath(); g.moveTo(bx - pw / 2, yM - ph); g.lineTo(bx + pw / 2, yM - ph); g.lineTo(bx + pw * 0.38, yM); g.lineTo(bx - pw * 0.38, yM); g.closePath(); g.fill();
    g.fillStyle = css(mix([84, 128, 84], INK, 0.72 - 0.5 * day));
    for (const [ox, oy, r] of [[-0.3, -1.6, 0.42], [0.25, -1.75, 0.38], [0, -2.2, 0.4]]) { g.beginPath(); g.arc(bx + ox * pw, yM - ph + oy * ph * 0.5, r * pw, 0, TAU); g.fill(); }
    g.fillStyle = css(mix([236, 120, 140], INK, 0.6 - 0.45 * day)); g.beginPath(); g.arc(bx + pw * 0.15, yM - ph * 2.05, pw * 0.13, 0, TAU); g.fill();
  }
  // 红邮筒：墙外
  {
    const bx = roomX + roomW + ref * 0.006, bw = ref * 0.0095, bh = ref * 0.027;
    if (S.portrait && bx + bw > S.W - 2) return;
    const red = mix(mix([196, 52, 40], INK, 0.66 - 0.55 * day), WARM, 0.12 * lit * night);
    g.fillStyle = css(INK); g.fillRect(bx + bw * 0.38, yM - ref * 0.006, bw * 0.24, ref * 0.006);
    g.fillStyle = css(red); rr(g, bx, yM - bh, bw, bh - ref * 0.005, bw * 0.45); g.fill();
    g.fillStyle = css(mix(red, INK, 0.4)); g.fillRect(bx - bw * 0.06, yM - bh + bw * 0.25, bw * 1.12, Math.max(0.8, ref * 0.0014));
    g.fillStyle = css(INK, 0.8); g.fillRect(bx + bw * 0.2, yM - bh * 0.62, bw * 0.6, Math.max(0.6, ref * 0.0009));
    g.fillStyle = css(rimCol, 0.25 + 0.2 * day); g.fillRect(bx + bw - Math.max(0.6, ref * 0.0008), yM - bh + bw * 0.4, Math.max(0.6, ref * 0.0008), bh * 0.7);
  }
}
