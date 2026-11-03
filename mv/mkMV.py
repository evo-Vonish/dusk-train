# 从第十棒第八版（夜里的鲲）做一个拍片用的版本：暴露内部状态、加一个"虚拟摄影机"（按任意矩形、任意倍率重画画面），
# 春、秋、冬换成 3072 宽的高清天；推近的时候，天按镜头的倍率现算（不是把一整张小图放大），云边是清楚的。
import sys, pathlib, re, json
# 用法：python3 mkMV.py [第七版的 dusktrain-10b.html] [高清天 sky_hi.json]（默认在旁边的 ../dusktrain/leg10b 里找）
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '../dusktrain/leg10b/dusktrain-10b.html')
HI = json.load(open(sys.argv[2] if len(sys.argv) > 2 else '../dusktrain/leg10b/skyart/final/sky_hi.json'))
src = SRC.read_text(encoding='utf-8')

# ---- 高清的三张天
m = re.search(r"const SKY_SEASON_DATA = \[\n(.*?)\n\];", src, re.S)
assert m, 'SKY_SEASON_DATA not found'
arr = "const SKY_SEASON_DATA = [\n  '%s', // 春\n  null, // 夏\n  '%s', // 秋\n  '%s', // 冬\n];" % (HI['spring'], HI['autumn'], HI['winter'])
src = src[:m.start()] + arr + src[m.end():]

# ---- 着色器：可以只算画的某几行（推近时省一大半）
a = "'uniform float uB; uniform float uGlow; uniform float uAR; uniform float uMix; uniform vec2 uPA; uniform vec2 uPB; uniform vec2 uCrop;',"
assert src.count(a) == 1, 'uniform line'
src = src.replace(a, "'uniform float uB; uniform float uGlow; uniform float uAR; uniform float uMix; uniform vec2 uPA; uniform vec2 uPB; uniform vec2 uCrop; uniform vec2 uCropY;',")
a = "'  vec2 q = vec2(uCrop.x + v.x * uCrop.y, v.y);',"
assert src.count(a) == 1, 'crop line'
src = src.replace(a, "'  vec2 q = vec2(uCrop.x + v.x * uCrop.y, uCropY.y > 0.0 ? uCropY.x + v.y * uCropY.y : v.y);',")

# ---- 镜头里的天：按镜头现算
a = "  wctx.drawImage(skyMixed(), -PAD, 0, W + PAD * 2, yM + 1);\n"
assert src.count(a) == 1, 'sky draw'
src = src.replace(a, "  if (RX && window.__skyRXon) __skyRX(wctx); else wctx.drawImage(skyMixed(), -PAD, 0, W + PAD * 2, yM + 1);\n")

hook = r"""
/* ---- 拍片版：镜头里的天按镜头的倍率现算 ---- */
function __skyPaintRX(s0, s1, y0f, y1f, W2, H2) {
  if (!skyGLInit() || !SKYGL.gl || SKYGL.gl.isContextLost()) return null;
  const src = skyArtCrop(); if (!src) return null;
  const [A, B, w0] = townSeasons(); if (!skyReady(A)) return null;
  const gl = SKYGL.gl, u = SKYGL.u, cv = SKYGL.cv, t = SKYGL.t;
  const wB = skyReady(B) ? w0 : 0, ua = skyGLUnit(A), ub = wB > .002 ? skyGLUnit(B) : ua;
  if (cv.width !== W2 || cv.height !== H2) { cv.width = W2; cv.height = H2; }
  gl.viewport(0, 0, W2, H2);
  if (!u.uCropY) u.uCropY = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'uCropY');
  gl.uniform2f(u.uCrop, s0 / src.width, (s1 - s0) / src.width);
  gl.uniform2f(u.uCropY, y0f, y1f - y0f);
  gl.uniform1f(u.uB, mod(t / 6400, 1));
  gl.uniform1f(u.uGlow, 0.035 * Math.sin(t * 0.19) + 0.02 * Math.sin(t * 0.53 + 1.3));
  gl.uniform1i(u.uTexA, ua); gl.uniform1i(u.uTexB, ub);
  gl.uniform1f(u.uMix, wB > 0.002 ? wB : 0);
  gl.uniform2f(u.uPA, mod(t / SKY_CYCLE[A], 1), SKY_FLOW[A]); gl.uniform2f(u.uPB, mod(t / SKY_CYCLE[B], 1), SKY_FLOW[B]);
  if (typeof skySumUniforms === 'function') skySumUniforms(gl, u, A, B, t, src.width);     // 第七版：夏天的云也漂
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.uniform2f(u.uCropY, 0, 0);
  SKYGL.drawnC = '';
  return cv;
}
function __skyOverRX(g, xa, xb, ws, day, night, rain) {
  const { yM, ref } = S;
  if (day > 0.001) {
    const gd = g.createLinearGradient(0, 0, 0, yM);
    DAY_STOPS.forEach(s => gd.addColorStop(s, css(seasonCol(P => dayAt(P, s)))));
    g.globalAlpha = day; g.fillStyle = gd; g.fillRect(xa, 0, xb - xa, yM + 1); g.globalAlpha = 1;
    const dl = g.createLinearGradient(0, yM - ref * 0.12, 0, yM);
    dl.addColorStop(0, 'rgba(255,245,230,0)'); dl.addColorStop(1, 'rgba(255,245,230,' + (0.35 * day).toFixed(3) + ')');
    g.fillStyle = dl; g.fillRect(xa, yM - ref * 0.12, xb - xa, ref * 0.12 + 1);
  }
  if (rain > 0.01) {
    g.fillStyle = 'rgba(96,100,130,' + (0.32 * rain * (1 - day)).toFixed(3) + ')'; g.fillRect(xa, 0, xb - xa, yM + 1);
    if (day > 0.01) { g.fillStyle = 'rgba(150,160,175,' + (0.5 * rain * day).toFixed(3) + ')'; g.fillRect(xa, 0, xb - xa, yM + 1); }
  }
  if (night > 0.001) { const nc = seasonCol(P => P.night), na = seasonNum(P => P.nightA); g.fillStyle = css(nc, na * night); g.fillRect(xa, 0, xb - xa, yM + 1); }
}
function __skyRX(g) {
  const { W, yM } = S, src = skyArtCrop();
  const ws = [0, 1, 2, 3].map(seasonWeight), day = S.dayF, night = S.nightF, rain = S.rainI;
  const xa = Math.max(-PAD, RX.wx - 3), xb = Math.min(W + PAD, RX.wx + RX.ww + 3);
  const ya = Math.max(0, RX.wy - 3), yb = Math.min(yM + 1, RX.wy + RX.wh + 3);
  g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const gr = g.createLinearGradient(0, 0, 0, yM);
  SKY_STOPS.forEach((s, i) => gr.addColorStop(s, css(seasonCol(P => P.dusk[i]))));
  g.fillStyle = gr; g.fillRect(xa, 0, xb - xa, yM + 1);
  if (src && day < 0.995) {
    const sh = src.height, paintedH = yM * 0.82, sw = Math.min(src.width, sh * W / paintedH), sx = (src.width - sw) * (S.portrait ? 0.78 : 0.55);
    const s0 = Math.max(0, sx + xa / W * sw), s1 = Math.min(src.width, sx + xb / W * sw);
    const X0 = (s0 - sx) / sw * W, X1 = (s1 - sx) / sw * W;
    const yTop = Math.max(0, Math.min(ya, paintedH - 2)), yBot = Math.min(paintedH, Math.max(yb, yTop + 2));
    const Wpx = Math.max(16, Math.min(4096, Math.round((X1 - X0) * RX.z))), Hpx = Math.max(4, Math.min(4096, Math.round((yBot - yTop) * RX.z)));
    const cv = s1 > s0 + 1 ? __skyPaintRX(s0, s1, yTop / paintedH, yBot / paintedH, Wpx, Hpx) : null;
    if (cv) {
      g.drawImage(cv, 0, 0, Wpx, Hpx, X0, yTop, X1 - X0, yBot - yTop);
      if (yb > paintedH - 1) {
        const rowPx = Math.max(1, Math.round(2 * Hpx / ((yBot - yTop) / paintedH * sh)));
        g.drawImage(cv, 0, Hpx - rowPx, Wpx, rowPx, X0, paintedH - 1, X1 - X0, yM - paintedH + 2);
      }
    } else {
      const st = skyStill();
      if (st) {
        const dx0 = -sx / sw * W, dw = src.width / sw * W;
        g.drawImage(st, 0, 0, st.width, st.height, dx0, 0, dw, paintedH);
        g.drawImage(st, 0, st.height - 2, st.width, 2, dx0, paintedH - 1, dw, yM - paintedH + 2);
      }
    }
    if (yb > paintedH) {
      const haze = g.createLinearGradient(0, paintedH, 0, yM), hm = seasonCol(P => P.hz[0]), hb = seasonCol(P => P.hz[1]);
      haze.addColorStop(0, css(hm, 0)); haze.addColorStop(0.5, css(hm, seasonNum(P => P.hz[0][3]))); haze.addColorStop(1, css(hb, seasonNum(P => P.hz[1][3])));
      g.fillStyle = haze; g.fillRect(xa, paintedH, xb - xa, yM - paintedH + 1);
    }
    const ds = night * seasonNum(P => P.nightDesat);
    if (ds > 0.01) { g.globalCompositeOperation = 'saturation'; g.globalAlpha = ds; g.fillStyle = '#808080'; g.fillRect(xa, 0, xb - xa, yM + 1); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  }
  __skyOverRX(g, xa, xb, ws, day, night, rain);
  g.restore();
}
window.__skyRXon = true;

/* ---- 拍片版：远处的一层花瓣（画在世界里、站台和她的后面，海里也有倒影）——风从她身后吹过去 ---- */
const __FP = { list: [], on: 0, n: 520 };
function __farPetalsUpdate(dt) {
  const { W, yM, ref } = S, k = NX.blossomStorm ? NX.blossomStorm.k : 0;
  const target = Math.round(__FP.on * k * __FP.n * seasonWeight(0));
  while (__FP.list.length < target) __FP.list.push({ x: W + PAD + Math.random() * ref * .5, y: yM * (.54 + Math.random() * .44), s: .45 + Math.random() * .85, ph: Math.random() * TAU, spin: (Math.random() - .5) * 4, a: .5 + Math.random() * .45, v: .75 + Math.random() * .6, c: Math.random() < .3 ? 1 : 0 });
  if (__FP.list.length > target) __FP.list.length = target;
  for (const p of __FP.list) {
    p.x -= ref * (.08 + .03 * Math.sin(S.t * .5 + p.ph)) * p.v * (1 + S.gust * 1.5) * dt;
    p.y += ref * .006 * Math.sin(S.t * 1.3 + p.ph * 2) * dt;
    p.ph += p.spin * dt * .5;
    if (p.x < -PAD - ref * .02) { p.x = W + PAD + Math.random() * ref * .25; p.y = yM * (.54 + Math.random() * .44); }
  }
}
function __farPetals(g) {
  if (!__FP.list.length) return;
  const { ref } = S, a = seasonWeight(0) * (1 - S.rainI * .6);
  if (a < .02) return;
  const cols = [css([255, 200, 218]), css([255, 230, 238])];
  g.save();
  for (const p of __FP.list) {
    const w = ref * .0046 * p.s, h = w * (.42 + .58 * Math.abs(Math.cos(p.ph)));
    g.globalAlpha = a * p.a * (.45 + .55 * Math.abs(Math.sin(p.ph * .7)));
    g.fillStyle = cols[p.c];
    g.beginPath(); g.ellipse(p.x, p.y, w, h, p.ph * .4, 0, TAU); g.fill();
  }
  g.restore();
}

const __cam = { out: null, octx: null, wc: null, wctx: null, layer: null };
function __renderRect(ox, oy, w, h, z) {
  const { yM } = S;
  let wy0 = Infinity, wy1 = -Infinity;
  if (oy < yM) { wy0 = oy; wy1 = Math.min(yM, oy + h); }
  if (oy + h > yM) { const a = Math.max(oy, yM), b = oy + h; wy0 = Math.min(wy0, Math.max(0, 2 * yM - b - 4)); wy1 = Math.max(wy1, Math.min(yM, 2 * yM - a + 4)); }
  wy0 = Math.max(0, Math.floor(wy0) - 2); wy1 = Math.min(yM + 1, Math.ceil(wy1) + 2);
  const OW = Math.round(w * z), OH = Math.round(h * z);
  if (!__cam.out || __cam.out.width !== OW || __cam.out.height !== OH) { __cam.out = mkCanvas(OW, OH); __cam.octx = __cam.out.getContext('2d', { alpha: false }); }
  const WW = Math.ceil((w + PAD * 2) * z), WH = Math.ceil((yM + 3) * z);
  if (!__cam.wc || __cam.wc.width < WW || __cam.wc.height < WH) {
    const nw = Math.max(WW, __cam.wc ? __cam.wc.width : 0), nh = Math.max(WH, __cam.wc ? __cam.wc.height : 0);
    __cam.wc = mkCanvas(nw, nh); __cam.wctx = __cam.wc.getContext('2d'); __cam.layer = mkCanvas(nw, nh);
  }
  const keep = { ctx, world, wctx };
  ctx = __cam.octx; world = __cam.wc; wctx = __cam.wctx;
  RX = { z, ox, oy, cw: w, ch: h, wx: ox, wy: wy0, ww: w, wh: wy1 - wy0, layer: __cam.layer };
  try { draw(); } finally { ctx = keep.ctx; world = keep.world; wctx = keep.wctx; RX = null; }
  const GK = window.__OUTK || 1.5, g = __cam.octx; g.save(); g.setTransform(GK, 0, 0, GK, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = grain; g.fillRect(0, 0, OW / GK, OH / GK); g.restore();   // 颗粒按屏幕的大小铺，推近了也不变粗
  return __cam.out;
}
window.__MV = { renderRect: __renderRect, cam: __cam }; SKYGL.keepScale = true; window.__noFloats = true;
window.__albumAdd = albumAdd; window.__moment = momentWords; window.__saveStore = saveStore;
window.__T = () => ({ S, TW, NX, SKY2, SKYGL, SKYMIX, FROZEN, SKY_ART, NCH, SEAMO, CLD, PEEL, FP: __FP, PX, store, CARD, CARDS, ALBUM, DEV, bottle, boat, shoal, meteors, ripples, roofFlock,
  seasonWeight, seasonPos, townSeasons, skyGLUnit,
  tryPeel, pickHit, renderRegion, draw, update, setDev, openAlbum, closeAlbum, closeCard, devEncounter, waitAt, ridersArrive, ridersDepart, journey, depart,
  beginEncounter, endChapter, G, townPos, setPieces, layoutTown, syncDash, syncUI, journeyNight, stationName, nudge, peel, hitGot, focusNext, peelFocused, invalidate,
  spawnMeteor, makeLightning, launchFirework, burstFirework, liftRoofBirds, waterTouch, callFish, spawnSeaLanterns, beginKun, KUN, kunPose, JELLY, jellyPool, modeNightNow, stationNight, launchFishWave,
  showRank, fillCard, layout, say, wake, startGirlWalk, FIRE_SCORE, SHELLS, setBottle: b => { bottle = b; }, setBoat: b => { boat = b; }, setShoal: s => { shoal = s; } });
"""
a = "  drawSeasonAir(wctx); drawGeese(wctx); drawFogFar(wctx); drawKunHorizon(wctx);\n"; assert src.count(a) == 1, 'far petals draw'
src = src.replace(a, "  drawSeasonAir(wctx); drawGeese(wctx); drawFogFar(wctx); drawKunHorizon(wctx); __farPetals(wctx);\n")
a = "  updateRain(dt);\n  if (S.bellT >= 0)"; assert src.count(a) == 1, 'far petals update'
src = src.replace(a, "  updateRain(dt); __farPetalsUpdate(dt);\n  if (S.bellT >= 0)")
a = "  for (const f of PX.floats) {\n"; assert src.count(a) == 1, 'floats'
src = src.replace(a, "  for (const f of (window.__noFloats ? [] : PX.floats)) {\n")      # 拍片版：不画乘客上下车时冒出来的 +1
anchor = "/* ---------------- go ---------------- */"
assert src.count(anchor) == 1
src = src.replace(anchor, hook + anchor)
a = "ridersInit(); syncDash(); devBoot(); introHint();"; assert src.count(a) == 1
src = src.replace(a, "ridersInit(); syncDash(); devBoot();")
a = "let dpr = Math.min(window.devicePixelRatio || 1, 2, S.dprCap);"; assert src.count(a) == 1
src = src.replace(a, "let dpr = Math.min(window.devicePixelRatio || 1, 3, S.dprCap);")
a = "W: 0, H: 0, dpr: 1, dprCap: 2, portrait: false,"; assert src.count(a) == 1
src = src.replace(a, "W: 0, H: 0, dpr: 1, dprCap: 3, portrait: false,")
a = "top = Math.max(wy, 2 * yM - H, 0), f = dpr >= 1.5 ? .5 : 1;"; assert src.count(a) == 1, 'kun snap scale'
src = src.replace(a, "top = Math.max(wy, 2 * yM - H, 0), f = RX ? 1 : dpr >= 1.5 ? .5 : 1;")     # 拍片版：镜子里的天按镜头的倍率拍，推近了也清楚
pathlib.Path('mv.html').write_text(src, encoding='utf-8')
m = re.findall(r'<script>(.*?)</script>', src, re.S)
pathlib.Path('mv-main.js').write_text(m[-1], encoding='utf-8')
print('ok', len(src))
