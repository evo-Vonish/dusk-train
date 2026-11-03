/* 第十棒第二版 · 水上的光与汐音的浮标钟
   · 灯在水里拉成一根根晃动的光柱：月台的吊灯、候车室的窗、车窗、栏杆上的小灯；黄昏淡，入夜才亮；
   · 汐音站外的海上有一只浮标钟：随浪起伏、摇晃，浪推得大一点，钟就响一声（看得见它的时候才听得见），
     声音一圈一圈散开；夜里顶上有一盏绿灯，隔几秒闪一下。 */
const BUOYS = { heard: -1 };
const BUOY_PERIOD = 6.4;
function bbHash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function buoyStrike(i) {
  const ph = (S.t + mod(i, 97) * 1.37) / BUOY_PERIOD, n = Math.floor(ph);
  return { n, age: (ph - n) * BUOY_PERIOD, on: bbHash(n * 7 + mod(i, 97) * 31) < 0.7 };
}
function buoyBaseX(P) { return S.portrait ? lerp(P.roofX0, P.roofX1, 0.6) : P.roofX1 + S.ref * 0.05; }

/* 一根光柱：x 是光的位置，y0 是水面，h 是光离水面的高度（倒影落在 y0 + h 附近）。
   倒影那一点有一团竖着的柔光；往下是一截一截长短不一、轻轻错动的碎光 */
function lampColumn(x, y0, h, w0, a, seed, col, glowK = 1) {
  const { H, ref, t } = S;
  const len = Math.min((H - y0) * 0.92, h * 2.2 + ref * 0.012);
  const n = Math.min(26, Math.max(6, Math.round(len / Math.max(2, ref * 0.0046))));
  const jig = 0.3 + 0.7 * S.motion;
  ctx.globalAlpha = 1;
  if (glowK > 0) glow(ctx, glowSpr, x, y0 + h, w0 * 2.6, Math.max(h * 1.5, ref * 0.012), a * 0.3 * glowK);
  ctx.fillStyle = css(col);
  for (let j = 0; j < n; j++) {
    const q = Math.sin(j * 12.9898 + seed * 78.233) * 43758.5453, r = q - Math.floor(q);       // 每一截自己的随机数（不随时间变）
    const kk = (j + 0.5 + (r - 0.5) * 0.6) / n, d = kk * len;
    const near = Math.exp(-Math.pow((d - h) / (h * 0.75 + ref * 0.004), 2));
    const aa = a * (0.2 * (1 - kk) + 0.8 * near) * (0.5 + 0.5 * Math.sin(t * (1.8 + r * 1.6) + j * 1.71 + seed));
    if (aa < 0.006) continue;
    const w = w0 * (0.35 + 0.65 * Math.abs(Math.sin(j * 2.13 + seed + t * (0.6 + r * 0.8)))) * (1 + kk * 0.7);
    const xj = x + Math.sin(j * 3.7 + t * 1.6 + seed) * ref * (0.0015 + kk * 0.0055) * jig;
    ctx.globalAlpha = Math.min(0.9, aa);
    ctx.fillRect(xj - w / 2, y0 + d, w, Math.max(0.9, ref * (0.0012 + r * 0.0012)));
  }
  ctx.globalAlpha = 1;
}

function drawLampWater() {
  const { W, yM, ref, t } = S;
  const k0 = (1 - S.dayF) * (0.35 + 0.65 * S.nightF) * (1 - 0.45 * S.rainI) * (1 - 0.7 * NX.fog) * (1 - 0.5 * S.stormF);
  if (k0 < 0.03) return;
  const P = setPieces();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // 月台的吊灯与候车室的窗
  const closest = Math.floor(S.camera / S.stationGap);
  for (let i = closest - 1; i <= closest + 2; i++) {
    const off = (S.camera - i * S.stationGap) * ref;
    if (P.roofX1 + off < -20 || P.roofX0 + off > W + 20) continue;
    [0.18, 0.52, 0.87].forEach((f, li) => lampColumn(lerp(P.roofX0, P.roofX1, f) + off, yM, P.sh - ref * 0.016, ref * 0.013, 0.3 * k0, li * 2.1 + i, [255, 212, 160]));
    lampColumn(P.roomX + P.roomW * 0.35 + off, yM, P.roomH * 0.59, P.roomW * 0.2, 0.2 * k0 * (0.9 + 0.025 * Math.sin(t * 0.8)), 5.3 + i, [255, 206, 150]);
  }
  // 车窗
  const { tw, th, tramX } = P;
  if (tramX < W + 20 && tramX + tw > -20) {
    const nW = 5, inset = tw * 0.07, gap = tw * 0.035, ww = (tw - inset * 2 - gap * (nW - 1)) / nW;
    const bell = S.bellT >= 0 ? Math.exp(-S.bellT * 2.2) : 0;
    for (let i = 0; i < nW; i++) lampColumn(tramX + inset + i * (ww + gap) + ww / 2, yM, ref * 0.004 + th * 0.67, ww * 0.55, (0.17 + 0.08 * bell) * k0, i * 1.9 + 0.4, [255, 220, 172], 0.6);
  }
  // 栏杆上的小灯（和 drawRailing 同一套位置）
  const postGap = ref * 0.21, rh = ref * 0.028, worldOffset = S.camera * ref + ref * 0.05;
  let i = -Math.floor(worldOffset / postGap) - 1;
  for (let x = mod(worldOffset, postGap) - postGap; x < W + postGap; x += postGap, i++) {
    if (mod(i, 4) !== 1) continue;
    lampColumn(x, yM, rh * 1.5, ref * 0.0065, 0.26 * k0 * (0.35 + 0.1 * Math.sin(t * 2.1 + i)) / 0.4, i * 0.77, [255, 232, 196], 0.7);
  }
  ctx.restore();
}

function drawBellBuoy() {
  const { W, H, yM, ref } = S;
  const P = setPieces(), closest = Math.floor(S.camera / S.stationGap);
  for (let i = closest - 1; i <= closest + 2; i++) {
    if (stationName(i) !== '汐音') continue;
    const x = buoyBaseX(P) + (S.camera - i * S.stationGap) * ref;
    if (x < -ref * 0.06 || x > W + ref * 0.06) continue;
    paintBellBuoy(x, yM + (S.portrait ? P.sh * 1.35 : (H - yM) * 0.15), i);     // 竖屏时它在车站倒影的下面，不压在倒影里
  }
}
function paintBellBuoy(x, wy, i) {
  const { ref, t } = S, day = S.dayF, dark = 1 - day, night = S.nightF, s = ref * 0.001;
  const st = buoyStrike(i), push = st.on ? Math.exp(-st.age * 1.6) : 0, mo = 0.4 + 0.6 * S.motion;
  const rock = (Math.sin(t * 1.15 + i) * 0.085 + Math.sin(t * 2.4 + i * 2.1) * 0.03) * mo + push * 0.13 * Math.sin(st.age * 5.2) * mo;
  const swing = -rock * 1.5 + push * 0.5 * Math.sin(st.age * 7.4 + 0.6) * mo;
  const y = wy + Math.sin(t * 1.15 + i + 0.9) * ref * 0.0022 * mo;
  const red = mix(mix(INK, [178, 58, 50], 0.42), [198, 68, 56], day), white = mix(mix(INK, [222, 216, 206], 0.36), [242, 238, 228], day);
  const frame = day > 0.5 ? css(mix(INK, [70, 74, 96], day)) : css(INK);
  const brass = mix(mix(INK, [190, 150, 80], 0.42 + 0.2 * push), [204, 164, 88], day);
  const lightOn = dark > 0.25, blink = lightOn ? Math.pow(Math.max(0, Math.sin(t * TAU / 4.2 + i)), 18) : 0;
  const shape = (ghost) => {
    // 浮体：露出水面的一个扁圆顶，一道白带
    ctx.fillStyle = css(red);
    ctx.beginPath(); ctx.ellipse(0, 0, 13 * s, 6.5 * s, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 13 * s, 6.5 * s, 0, Math.PI, TAU); ctx.closePath(); ctx.clip();
    ctx.fillStyle = css(white); ctx.fillRect(-13 * s, -4.2 * s, 26 * s, 1.8 * s); ctx.restore();
    ctx.fillStyle = frame; ctx.fillRect(-9 * s, -7.6 * s, 18 * s, 1.6 * s);
    // 塔架：两条腿，一道横撑，一个交叉
    ctx.strokeStyle = frame; ctx.lineWidth = Math.max(0.9, 1.5 * s); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7.5 * s, -7 * s); ctx.lineTo(-3.6 * s, -31 * s); ctx.moveTo(7.5 * s, -7 * s); ctx.lineTo(3.6 * s, -31 * s);
    ctx.moveTo(-6.3 * s, -14 * s); ctx.lineTo(6.3 * s, -14 * s);
    ctx.moveTo(-6.3 * s, -14 * s); ctx.lineTo(5.1 * s, -22 * s); ctx.moveTo(6.3 * s, -14 * s); ctx.lineTo(-5.1 * s, -22 * s);
    ctx.stroke();
    ctx.fillStyle = frame; ctx.fillRect(-5.2 * s, -32.4 * s, 10.4 * s, 1.8 * s);
    // 顶上的灯
    ctx.fillRect(-1.9 * s, -36.6 * s, 3.8 * s, 4.4 * s); ctx.fillRect(-2.6 * s, -37.6 * s, 5.2 * s, 1.2 * s);
    if (!ghost && lightOn) { ctx.fillStyle = 'rgba(176,255,210,' + (0.35 + 0.6 * blink).toFixed(3) + ')'; ctx.fillRect(-1.3 * s, -35.8 * s, 2.6 * s, 2.8 * s); }
    // 钟：挂在横梁下面，比塔架摆得更晚一点
    ctx.save(); ctx.translate(0, -30.4 * s); ctx.rotate(swing);
    ctx.strokeStyle = frame; ctx.lineWidth = Math.max(0.7, 0.9 * s);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.6 * s); ctx.stroke();
    ctx.fillStyle = css(brass);
    ctx.beginPath(); ctx.moveTo(-1.4 * s, 1.4 * s);
    ctx.bezierCurveTo(-3.4 * s, 1.6 * s, -2.8 * s, 6.4 * s, -4.6 * s, 8.6 * s); ctx.lineTo(4.6 * s, 8.6 * s);
    ctx.bezierCurveTo(2.8 * s, 6.4 * s, 3.4 * s, 1.6 * s, 1.4 * s, 1.4 * s); ctx.closePath(); ctx.fill();
    if (!ghost) {
      ctx.fillStyle = 'rgba(255,236,190,' + (0.18 + 0.25 * day + 0.5 * push).toFixed(3) + ')';
      ctx.fillRect(-2.4 * s, 3 * s, 0.9 * s, 4.6 * s);
      ctx.fillStyle = frame; ctx.beginPath(); ctx.arc(Math.sin(swing * 2.2 + st.age * 3) * 1.6 * s * push, 9.4 * s, 1.1 * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  // 倒影：翻过来，压扁，很淡
  ctx.save(); ctx.translate(x, y + 1.2 * s); ctx.scale(1, -0.72); ctx.rotate(-rock); ctx.globalAlpha = 0.16 + 0.1 * day;
  ctx.beginPath(); ctx.rect(-40 * s, -40 * s, 80 * s, 40 * s); ctx.clip(); shape(true); ctx.restore();
  // 夜里绿灯落在水里的一小段光
  if (lightOn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; lampColumn(x, y, 30 * s, 3.5 * s, (0.12 + 0.35 * blink) * dark, i * 3.1, [150, 255, 200], 0.5); ctx.restore(); }
  // 水线：一圈白沫，两道往外散的小浪
  ctx.strokeStyle = 'rgba(236,236,255,' + (0.28 + 0.22 * day).toFixed(2) + ')'; ctx.lineWidth = Math.max(0.7, 0.9 * s);
  ctx.beginPath(); ctx.ellipse(x, y + 0.6 * s, (14 + Math.sin(t * 2.3) * 0.8) * s, 2.4 * s, 0, 0, TAU); ctx.stroke();
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.45 + k / 2 + i * 0.13) % 1;
    ctx.globalAlpha = (1 - ph) * 0.8;
    ctx.beginPath(); ctx.ellipse(x, y + 0.8 * s, (15 + ph * 26) * s, (2.6 + ph * 4.2) * s, 0, 0, Math.PI); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 浮标本体
  ctx.save(); ctx.translate(x, y); ctx.rotate(rock); shape(false); ctx.restore();
  if (blink > 0.05) glow(ctx, glowSprCyan, x + Math.sin(rock) * 34 * s, y - Math.cos(rock) * 34 * s, 26 * s, 26 * s, 0.55 * blink * dark);
  else if (lightOn) glow(ctx, glowSprCyan, x + Math.sin(rock) * 34 * s, y - Math.cos(rock) * 34 * s, 14 * s, 14 * s, 0.18 * dark);
  // 钟声：一圈一圈散开的弧
  if (st.on && st.age < 2.2) {
    const bx = x + Math.sin(rock) * 25 * s, by = y - Math.cos(rock) * 25 * s;
    ctx.strokeStyle = day > 0.5 ? 'rgba(60,70,100,1)' : 'rgba(255,240,214,1)'; ctx.lineWidth = Math.max(0.7, 0.9 * s);
    for (let r = 0; r < 3; r++) {
      const a = st.age - r * 0.2; if (a <= 0 || a > 1.9) continue;
      const rad = (8 + a * 20) * s;
      ctx.globalAlpha = Math.pow(1 - a / 1.9, 1.5) * (0.3 + 0.15 * dark);
      ctx.beginPath(); ctx.arc(bx, by, rad, -0.55, 0.55); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, rad, Math.PI - 0.55, Math.PI + 0.55); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  hitAt(ctx, 'bellbuoy', x - 18 * s, y - 40 * s, 36 * s, 47 * s);
}

/* 声音：浮标钟就在眼前时，浪推它一下它就响一声 */
function updateStationProps() {
  const { W, ref } = S, idx = Math.round(S.camera / S.stationGap);
  for (let i = idx - 1; i <= idx + 1; i++) {
    if (stationName(i) !== '汐音') continue;
    const x = buoyBaseX(setPieces()) + (S.camera - i * S.stationGap) * ref;
    if (x < 0 || x > W) continue;
    const st = buoyStrike(i);
    if (st.on && st.n !== BUOYS.heard && st.age < 0.3) { BUOYS.heard = st.n; xiyinBell(x / W); }
  }
}
function xiyinBell(pan) {
  if (!soundOk()) return;
  const f = 349.23;
  townTone(f, 'sine', 0.011, 0.006, 2.9, pan);
  townTone(f * 2.0, 'sine', 0.0038, 0.006, 1.9, pan);
  townTone(f * 2.76, 'sine', 0.0026, 0.004, 1.3, pan);
  townTone(f * 5.4, 'sine', 0.0008, 0.003, 0.6, pan);
}
