/* 第十棒第五版 · 四季各有一片天，都会流动
   第四版里，四季共用原来那张画，只换了调色。现在春、秋、冬各有一张自己的画（离线「照着物理」算出来的：
   真的大气把落日的光染红，云有厚度，被光从下面、侧面照着，背光的那一面是天的颜色，远处的云沉进霾里），夏天还是原来那张。
   · 春 · 春霞：太阳还没落尽，隔着一层薄霞；云是透光的纱，粉、杏、淡紫。
   · 夏 · 原来那张画：最深的蓝，和地平线上那一道烫的光。
   · 秋 · 火烧云：太阳刚落，满天鳞云从下面被烧红，天最透、最蓝。
   · 冬 · 清冷：太阳落得更深，只有最高的卷云还接着一点粉；地平线一道暗暗的层云，底下一线橘光。
   一小段着色器（WebGL）在原地「流」这几张画：云顺着风往车头那边慢慢流、慢慢翻；越高的云走得越快，
   贴着地平线的几乎不动；太阳那团光留在原地，轻轻地呼吸；每一处的节拍都错开，看不出是在循环。
   · 每片天流的快慢、幅度不一样：秋天的鳞云边最清楚，来回短一点、幅度小一点，才不会看出重影；
   · 换季的时候，两片天在同一套流动里慢慢渗过去（不是一张盖住另一张）；
   · 风大的时候流得快一点（风是一点一点积进时间里的，不会跳）；
   · 白天（小镇的下午）照旧是白天的天和白天的云；夜里把画压暗，星星和月亮在上面；
   · 「定格的晚霞」：有那么一会儿，画不再流了，像一张照片；
   · 没有 WebGL 的设备，看到的是不动的画（换季时两张交叠着渐变）。 */
const SKY_CYCLE = [9, 11, 6, 8];                           // 一处的云流一个来回的秒数（每一处错开）。夏天最高处的云一秒走六个像素左右
const SKY_FLOW = [0.7, 1, 0.3, 0.55];                      // 流的幅度。来回越短、幅度越小，两层交替时错开得越少（鳞云的边就不会重影）
const SKY_UNIT = [2, 0, 3, 4];                             // 四季的画放在哪个纹理单元（1 是噪声，5 是夏天会漂的那一层）
/* 第七版：夏天那张画是原来手绘的，云又大又软，原地流的那一下几乎看不出来（量过：别的季节每秒半个像素的光流，夏天不到十分之一）。
   所以夏天上面那一大半天，整片慢慢往车头那边漂过去：把画首尾接成一圈（SKY_SUM），一直漂，不往回退；
   地平线、那道烫的光、粉色的云带还在原地，只照旧原地流。漂一圈要六分钟左右，看不出是在循环。 */
const SKY_SUM = { ov: 300, drift: 5, tile: null };         // 首尾交接的宽度（原图像素）、每秒漂几个像素（原图 1536 宽）
const SKY_ART = { img: [null, null, null, null], ready: [false, false, false, false], started: false, still: null, stillKey: '' };
const SKYGL = { ok: null, cv: null, gl: null, u: null, src: null, w: 0, h: 0, t: 0, drawnT: -1, drawnW: '', drawnC: '', every: 1 / 12, cost: 0, scale: 1, slow: 0, lost: false, listen: false, up: [false, false, false, false], tex: null };
const SKY_VS = 'attribute vec2 p; varying vec2 v; void main() { v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }';
const SKY_FS = [
  '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
  'uniform sampler2D uTexA; uniform sampler2D uTexB; uniform sampler2D uNoise;',
  'uniform float uB; uniform float uGlow; uniform float uAR; uniform float uMix; uniform vec2 uPA; uniform vec2 uPB; uniform vec2 uCrop;',
  'uniform sampler2D uSum; uniform float uSA; uniform float uSB; uniform float uSW; uniform float uPer; uniform float uScr;',
  'varying vec2 v;',
  'float nz(vec2 q) { return texture2D(uNoise, q).r; }',
  // 风往车头那边（左）吹；越往下越慢，地平线几乎不动；太阳那团光不动；每一片云快慢不一
  'vec2 flowAt(vec2 q) {',
  '  float sp = mix(1.0, 0.42, smoothstep(0.45, 0.85, q.y));',
  '  sp = mix(sp, 0.1, smoothstep(0.88, 0.99, q.y));',
  '  vec2 d = q - vec2(0.885, 0.975);',
  '  sp *= 1.0 - 0.85 * exp(-dot(d, d) / 0.004);',
  '  sp *= smoothstep(0.0, 0.02, q.x) * (1.0 - smoothstep(0.96, 1.0, q.x));',
  '  sp *= 0.75 + 0.5 * nz(q * vec2(0.05, 0.03) + vec2(0.31, 0.17));',
  '  return normalize(vec2(-1.0, 0.05 * (1.0 - q.y) * sin(q.x * 3.0 + 1.3))) * sp;',
  '}',
  // 一张画流一帧：两层错开半个来回，一层隐去时回到原处，另一层正好在正中（P = 这一季的相位、幅度）
  'vec3 flowTex(sampler2D tex, vec2 q, vec2 f, float ph, vec2 b, vec2 P) {',
  '  float p0 = fract(P.x + ph), p1 = fract(P.x + ph + 0.5);',
  '  vec2 k = vec2(0.045, 0.045 * uAR) * P.y;',
  '  vec3 c0 = texture2D(tex, q - f * (p0 - 0.5) * k + b * P.y).rgb;',
  '  vec3 c1 = texture2D(tex, q - f * (p1 - 0.5) * k + b * P.y).rgb;',
  '  return mix(c0, c1, abs(2.0 * p0 - 1.0));',
  '}',
  // 夏天会漂的那一层：首尾接成一圈的画，按原图的像素一直往左漂（取的位置一直往右挪）
  'vec3 tileAt(vec2 q) { float X = mod(q.x * uSW + uScr, uPer); return texture2D(uSum, vec2((X + 0.5) / (uPer + 1.0), q.y)).rgb; }',
  'vec3 flowTile(vec2 q, vec2 f, float ph, vec2 b, vec2 P) {',
  '  float p0 = fract(P.x + ph), p1 = fract(P.x + ph + 0.5);',
  '  vec2 k = vec2(0.045, 0.045 * uAR) * P.y;',
  '  vec3 c0 = tileAt(q - f * (p0 - 0.5) * k + b * P.y);',
  '  vec3 c1 = tileAt(q - f * (p1 - 0.5) * k + b * P.y);',
  '  return mix(c0, c1, abs(2.0 * p0 - 1.0));',
  '}',
  // 夏天：上面一大半天漂着走，往下渐渐交给原地流的画（地平线、粉色的云带、太阳那团光）
  'vec3 sumTex(sampler2D tex, vec2 q, vec2 f, float ph, vec2 b, vec2 P) {',
  '  vec3 base = flowTex(tex, q, f, ph, b, P);',
  '  float m = 1.0 - smoothstep(0.5, 0.78, q.y);',
  '  if (m < 0.003) return base;',
  '  return mix(base, flowTile(q, f, ph, b, P), m);',
  '}',
  'void main() {',
  '  vec2 q = vec2(uCrop.x + v.x * uCrop.y, v.y);',          // 只算画面里看得见的那一截
  '  vec2 f = flowAt(q);',
  '  float ph = nz(q * vec2(0.078, 0.031));',
  '  vec2 bq = q * vec2(0.047, 0.02);',
  '  vec2 b = (vec2(nz(bq + vec2(uB, 0.0)), nz(bq + vec2(0.37, 0.61 + uB))) - 0.5) * vec2(0.006, 0.0103) * (1.0 - smoothstep(0.6, 0.98, q.y));',
  '  vec3 c = uSA > 0.5 ? sumTex(uTexA, q, f, ph, b, uPA) : flowTex(uTexA, q, f, ph, b, uPA);',
  '  if (uMix > 0.002) c = mix(c, uSB > 0.5 ? sumTex(uTexB, q, f, ph, b, uPB) : flowTex(uTexB, q, f, ph, b, uPB), uMix);',
  '  float L = dot(c, vec3(0.299, 0.587, 0.114));',
  '  c *= 1.0 + uGlow * smoothstep(0.55, 0.95, L) * smoothstep(0.7, 0.98, q.y);',
  '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
  '}'
].join('\n');

// 一张 64×64、可以无缝平铺的平滑噪声（随机数糊两遍，再拉满到 0..255）
function skyNoise(n) {
  const rnd = mulberry32(2718), a = new Float32Array(n * n), b = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) a[i] = rnd();
  const blur = (src, dst, dx, dy) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let s = 0; for (let k = -2; k <= 2; k++) s += src[mod(y + k * dy, n) * n + mod(x + k * dx, n)] * [1, 4, 6, 4, 1][k + 2]; dst[y * n + x] = s / 16; } };
  for (let r = 0; r < 2; r++) { blur(a, b, 1, 0); blur(b, a, 0, 1); }
  let lo = 1, hi = 0; for (let i = 0; i < n * n; i++) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); }
  const out = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) out[i] = Math.round((a[i] - lo) / (hi - lo || 1) * 255);
  return out;
}

// 原来那张画里，天的那一截（不含屋顶和电线）：夏天的天
function skyArtCrop() {
  if (SKYGL.src || !skyArtReady) return SKYGL.src;
  const w = skyArt.naturalWidth, h = Math.round(skyArt.naturalHeight * 0.518), c = mkCanvas(w, h);
  c.getContext('2d').drawImage(skyArt, 0, 0, w, h, 0, 0, w, h);
  SKYGL.w = w; SKYGL.h = h;
  return SKYGL.src = c;
}
// 春、秋、冬三张画：一开场就解码（内嵌的 JPEG，很快）；好了一张就让天重画一次
function skySeasonLoad() {
  if (SKY_ART.started) return;
  SKY_ART.started = true;
  for (let i = 0; i < 4; i++) {
    if (!SKY_SEASON_DATA[i]) continue;
    const im = new Image();
    im.onload = () => { SKY_ART.ready[i] = true; SKYMIX.key = ''; SKY_ART.stillKey = ''; invalidate(); };
    im.src = SKY_SEASON_DATA[i];
    SKY_ART.img[i] = im;
  }
}
// 这一季的画（1536×447）
function skySrc(i) {
  return i === 1 ? skyArtCrop() : SKY_ART.img[i];
}
// 这一季的画解码好了没有（没好的那一小会儿，天用那一季的渐变垫着，不拿别一季的画顶替）
function skyReady(i) {
  return i === 1 ? !!skyArtCrop() : SKY_ART.ready[i];
}
// 不流的时候（没有 WebGL、揭卡）：这一季的画；换季时两张交叠（按 1/32 一档缓存）
function skyStill() {
  const base = skyArtCrop();
  if (!base) return null;
  const [A, B, w0] = townSeasons();
  if (!skyReady(A)) return null;
  const q = skyReady(B) ? Math.round(w0 * 32) / 32 : 0;
  if (q <= 0) return skySrc(A);
  if (q >= 1) return skySrc(B);
  const key = A + ':' + B + ':' + q + ':' + SKY_ART.ready.join('');
  if (SKY_ART.stillKey === key && SKY_ART.still) return SKY_ART.still;
  if (!SKY_ART.still) SKY_ART.still = mkCanvas(base.width, base.height);
  const g = SKY_ART.still.getContext('2d');
  g.globalAlpha = 1; g.drawImage(skySrc(A), 0, 0, base.width, base.height);
  g.globalAlpha = q; g.drawImage(skySrc(B), 0, 0, base.width, base.height); g.globalAlpha = 1;
  SKY_ART.stillKey = key;
  return SKY_ART.still;
}

function skyGLInit() {
  if (SKYGL.ok !== null) return SKYGL.ok;
  if (!skyArtReady) return false;                                       // 画还没加载好：下次再试
  SKYGL.ok = false;
  try {
    const src = skyArtCrop(), w = src.width, h = src.height;
    if (/[?&]nogl\b/.test(location.search)) return false;                // 审片：看看没有 WebGL 时的样子
    if (!SKYGL.cv) SKYGL.cv = mkCanvas(w, h);
    const cv = SKYGL.cv;
    if (!SKYGL.listen) {
      SKYGL.listen = true;
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); SKYGL.lost = true; SKYGL.ok = null; SKYGL.gl = null; SKYMIX.key = ''; }, false);
      cv.addEventListener('webglcontextrestored', () => { SKYGL.lost = false; SKYGL.ok = null; SKYMIX.key = ''; }, false);
    }
    if (SKYGL.lost) { SKYGL.ok = null; return false; }
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' };
    const gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
    if (!gl) return false;
    const shader = (type, text) => { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, SKY_VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, SKY_FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    SKYGL.tex = (unit, wrap, upload) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); upload();
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    };
    SKYGL.up = [false, false, false, false];
    SKYGL.tex(0, gl.CLAMP_TO_EDGE, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src)); SKYGL.up[1] = true;
    SKYGL.tex(1, gl.REPEAT, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 64, 64, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, skyNoise(64)));
    const tile = SKY_SUM.tile || (SKY_SUM.tile = skySumTile(src));
    SKYGL.tex(5, gl.CLAMP_TO_EDGE, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tile));
    const u = {};
    for (const n of ['uTexA', 'uTexB', 'uNoise', 'uB', 'uGlow', 'uAR', 'uMix', 'uPA', 'uPB', 'uCrop', 'uSum', 'uSA', 'uSB', 'uSW', 'uPer', 'uScr']) u[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(u.uTexA, 0); gl.uniform1i(u.uTexB, 0); gl.uniform1i(u.uNoise, 1); gl.uniform1f(u.uAR, w / h);
    gl.uniform1i(u.uSum, 5); gl.uniform1f(u.uSW, w); gl.uniform1f(u.uPer, w - SKY_SUM.ov);
    SKYGL.gl = gl; SKYGL.u = u; SKYGL.ok = true; SKYGL.drawnT = -1; SKYGL.drawnC = '';
  } catch (e) { console.warn('sky gl', e); SKYGL.ok = false; }
  return SKYGL.ok;
}
// 这一季的画放进它的纹理单元（解码好了才放；万一放不进去，就用夏天那张）
function skyGLUnit(i) {
  if (SKYGL.up[i]) return SKY_UNIT[i];
  if (!SKY_ART.ready[i] || !SKYGL.gl) return 0;
  const gl = SKYGL.gl;
  try { SKYGL.tex(SKY_UNIT[i], gl.CLAMP_TO_EDGE, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, SKY_ART.img[i])); SKYGL.up[i] = true; }
  catch (e) { console.warn('sky tex', e); return 0; }
  return SKY_UNIT[i];
}

/* 这一帧的画（只要画面里看得见的那一截 [x0, x1)，按原图的像素算）。返回 { img, sx, sw, sh }：从 img 的 (sx, 0) 起取 sw × sh。
   能动就流一帧：云走得很慢，场景时间每过十二分之一秒才重画一次（慢的设备隔得更久）；不能动就是不动的画；还没加载好时是 null */
function skyPaintFrame(x0, x1, force) {
  const src = skyArtCrop();
  if (!src) return null;
  if (!skyGLInit() || !SKYGL.gl || SKYGL.gl.isContextLost()) { const st = skyStill(); return st ? { img: st, sx: x0, sw: x1 - x0, sh: src.height } : null; }
  const cw = Math.max(1, Math.ceil(x1 - x0)), sc = SKYGL.scale, W2 = Math.max(1, Math.ceil(cw * sc)), H2 = Math.max(1, Math.round(src.height * sc)), ck = Math.round(x0) + ':' + cw + ':' + sc;
  const [A, B, w0] = townSeasons();
  if (!skyReady(A)) return null;
  const wB = skyReady(B) ? w0 : 0, ua = skyGLUnit(A), ub = wB > 0.002 ? skyGLUnit(B) : ua;
  const wk = A + ':' + B + ':' + Math.round(wB * 200) + ':' + ua + ub;
  const fresh = SKYGL.drawnC === ck && SKYGL.drawnW === wk;
  if (fresh && (SKYGL.drawnT === SKYGL.t || !force && Math.abs(SKYGL.t - SKYGL.drawnT) < SKYGL.every)) return { img: SKYGL.cv, sx: 0, sw: W2, sh: H2 };
  const t0 = performance.now(), gl = SKYGL.gl, u = SKYGL.u, t = SKYGL.t, cv = SKYGL.cv;
  if (cv.width !== W2 || cv.height !== H2) { cv.width = W2; cv.height = H2; }
  gl.viewport(0, 0, W2, H2);
  gl.uniform2f(u.uCrop, Math.round(x0) / src.width, cw / src.width);
  gl.uniform1f(u.uB, mod(t / 6400, 1));
  gl.uniform1f(u.uGlow, 0.035 * Math.sin(t * 0.19) + 0.02 * Math.sin(t * 0.53 + 1.3));
  gl.uniform1i(u.uTexA, ua); gl.uniform1i(u.uTexB, ub);
  gl.uniform1f(u.uMix, wB > 0.002 ? wB : 0);
  gl.uniform2f(u.uPA, mod(t / SKY_CYCLE[A], 1), SKY_FLOW[A]); gl.uniform2f(u.uPB, mod(t / SKY_CYCLE[B], 1), SKY_FLOW[B]);
  skySumUniforms(gl, u, A, B, t, src.width);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  SKYGL.drawnT = t; SKYGL.drawnW = wk; SKYGL.drawnC = ck;
  SKYGL.mark = t0;
  return { img: cv, sx: 0, sw: W2, sh: H2 };
}
// 合成完了再量这一次花了多久：慢的设备就隔久一点再重画（最慢一秒六次）；一直很慢（多半是没有显卡、全靠 CPU 在画），就只算一半大小
function skyPaintCost() {
  if (SKYGL.mark == null) return;
  const ms = performance.now() - SKYGL.mark; SKYGL.mark = null;
  SKYGL.cost = SKYGL.cost ? SKYGL.cost * 0.8 + ms * 0.2 : ms;
  SKYGL.every = SKYGL.cost > 14 ? 1 / 6 : SKYGL.cost > 7 ? 1 / 8 : 1 / 12;
  if (SKYGL.keepScale) return;                                       // 审片版：一直按原大小画
  if (SKYGL.scale === 1 && ms > 10) { if (++SKYGL.slow >= 6) { SKYGL.scale = 0.5; SKYGL.cost = 0; } } else if (SKYGL.scale === 1) SKYGL.slow = Math.max(0, SKYGL.slow - 1);
}

/* 天和云的时间：风是积分进去的，阵风来了云只是流得快一点，不会整片跳过去 */
function updateSkyMotion(dt) {
  SKYGL.t += dt * (1 + S.gust * 0.5) * (1 - FROZEN.k);
  CLD.wt += dt * (1 + S.gust * 0.6);
}

/* 黄昏那团光在画面上的位置（水里的碎金、倒影的闪动跟着它） */
function duskGlowX() {
  const { W, yM } = S, src = SKYGL.src;
  if (!src) return W * (S.portrait ? 0.62 : 0.74);
  const paintedH = yM * 0.82, sw = Math.min(src.width, src.height * W / paintedH), sx = (src.width - sw) * (S.portrait ? 0.78 : 0.55);
  return clamp((src.width * 0.885 - sx) / sw * W, W * 0.5, W * 0.97);
}

/* 第七版：夏天那张画首尾接成一圈（左边 ov 宽的一截里，右端渐渐过渡进来），好让上面的云一直往左漂 */
function skySumTile(src) {
  const w = src.width, h = src.height, ov = SKY_SUM.ov, P = w - ov;
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const c = mkCanvas(P + 1, h), g = c.getContext('2d'), out = g.createImageData(P + 1, h), od = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x <= P; x++) {
      const o = (y * (P + 1) + x) * 4, i1 = (y * w + x) * 4, i0 = (y * w + Math.min(w - 1, x + P)) * 4;
      const s = x < ov ? x / ov : 1, a = s * s * (3 - 2 * s);
      od[o] = sd[i0] * (1 - a) + sd[i1] * a; od[o + 1] = sd[i0 + 1] * (1 - a) + sd[i1 + 1] * a; od[o + 2] = sd[i0 + 2] * (1 - a) + sd[i1 + 2] * a; od[o + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}
function skySumUniforms(gl, u, A, B, t, w) {
  gl.uniform1f(u.uSA, A === 1 ? 1 : 0); gl.uniform1f(u.uSB, B === 1 ? 1 : 0);
  gl.uniform1f(u.uScr, mod(t * SKY_SUM.drift, w - SKY_SUM.ov));
}
