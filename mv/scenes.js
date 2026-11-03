// 分镜表·第四部「沿途」：黄昏列车 × なとり「Overdose」（3:17，约 117.5 BPM），2560×1440、60 帧
// 没有主角：作品里的东西一样一样地出来，像走一整圈——暮海的黄昏出发 → 沿途八站（每一站在它最好看的时候、各在一季）
// → 冬夜的海 → 流星雨 → 暴风雨 → 雨过天晴，小镇的下午 → 落日 → 烟火 → 河灯、星河、满月和飞鱼
// → 一个不寻常的夜（静、流萤流金、丝带、海面隐去、鲲）→ 四季绕着列车轮着来、四季同框 → 白 → 黄昏又回来了，收集簿。
// 字只有片名和片尾。镜头以全景、中景为主，特写很少；夏天黄昏那张天只在四季里一闪而过。
// 一场戏 = 一次开页；一个镜头 = 一段取景；事件 = 卡在拍点上的动作。时间都是歌里的秒数；
// B(i) 是第 i 拍（可以是 95.5 这样的半拍），c(i) 是切在第 i 拍上的剪辑点（早半帧）。重拍在 3 + 4k 拍上。
// 取景 { x, y, z }：画面中心（1280×720 的世界坐标）与放大倍数。
'use strict';
const grid = require('./grid.json');
const CONF = require('./mvconf.json');
const BT = grid.beats;
const ci = k => Math.max(0, Math.min(BT.length - 1, k));
const B = i => { const k = Math.floor(i), f = i - k, a = BT[ci(k)], b = BT[ci(k + 1)]; return a + (b - a) * f; };
const FPS = CONF.FPS, LEAD = 0.5 / FPS;
const c = i => B(i) - LEAD;
const END = 194.6;                                   // 歌在 191 秒左右收尾，后面留片尾字
const fr = t => Math.round(t * FPS);
const CRUISE = 0.205, ACCEL = 0.045, BRAKE = 0.036;

// 刹车要多久：照着 updateTram 的规矩算，好让列车正好在某一拍停稳
function brakeTime(dist, v0) {
  let x = 0, v = v0, t = 0; const dt = 1 / 60;
  for (let i = 0; i < 60 * 120; i++) {
    const rem = dist - x, target = Math.min(CRUISE, Math.sqrt(Math.max(0, 2 * BRAKE * rem))), pv = v;
    v += Math.max(-BRAKE * dt, Math.min(ACCEL * dt, target - v));
    const adv = (pv + v) * .5 * dt; t += dt;
    if (adv >= rem) return t;
    x += adv;
  }
  return t;
}
function distFor(seconds) { let lo = .1, hi = 12; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (brakeTime(m, CRUISE) < seconds) lo = m; else hi = m; } return (lo + hi) / 2; }

// 取景的小写法
const C = (x, y, z, o) => Object.assign({ x, y, z }, o || {});
const K = (key, z, dx, dy, o) => Object.assign({ key, z, x: dx || 0, y: dy || 0 }, o || {});
const TR = (z, dx, dy, o) => Object.assign({ follow: 'tram', z, x: dx || 0, y: dy || 0 }, o || {});
// 跟着鲲：取景中心 = 鲲身上的某一点（身长的几分之几，头在 -0.5），每一帧现算
const KP = (fx, fy, z, o) => Object.assign({ fn: `(p, T) => { const P = T.KUN.pose; if (!P) return [640, 300, ${z}]; return [P.x + ${fx} * P.L, P.y + ${fy} * P.L, ${z} * (1 + ${(o && o.push) || .05} * p)]; }` }, o || {});
// 一串镜头：[开始时刻, 取景]；每个镜头到下一个开始为止，最后一个到场尾
const seq = (t1, list) => list.map((s, i) => ({ t0: s[0], t1: i + 1 < list.length ? list[i + 1][0] : t1, cam: s[1], mode: 'cam' }));
const withRate = (shots, from, r) => shots.forEach(s => { if (s.t0 >= from - 1e-6 && s.cam.rate == null) s.cam.rate = r; });

// 开页：钉住一季。黄昏 D、夜 N：不下雨，不起风（风由分镜来起），季节里的暴风雨不来
const D = (season, extra) => new Function('T', 'fx', `
  const S = T.S, NX = T.NX, g = T.G(); fx.clean(true);
  NX.seasonForce = ${season}; S.timeMode = 'dusk'; S.weather = 'clear'; S.rainI = 0; S.nightF = 0; S.tramTimer = Infinity; S.gustT = 1e9; T.SEAMO.nextStorm = 1e9;
  ${extra || ''}
`);
const N = (season, extra) => new Function('T', 'fx', `
  const S = T.S, NX = T.NX, g = T.G(); fx.clean(true);
  NX.seasonForce = ${season}; S.timeMode = 'night'; S.weather = 'clear'; S.rainI = 0; S.nightF = 1; S.tramTimer = Infinity; S.gustT = 1e9; T.SEAMO.nextStorm = 1e9;
  ${extra || ''}
`);
const PARK = k => `S.travel = S.camera = ${k} * g; S.station = ${k}; S.tramMode = 'parked'; S.tramV = 0; S.stopAt = S.travel; S.tramDX = 0; T.layoutTown();`;

/* ---------------- 页面里用的动作（不能引用外面的变量；参数从 args 传进去） ---------------- */
const ev = {
  depart: T => { T.depart(); },
  bell: (T, fx) => { fx.bell(); },
  gust: T => { T.S.gust = 1; },
  storm: (T, fx, t, a) => { T.NX.blossomStorm = { age: 0, dur: a, k: 0 }; },
  fire: (T, fx, t, a) => { for (const s of a) fx.fire(s[0], s[1], s[2], s[3], s[4]); },
  meteor: (T, fx, t, a) => { for (const k of [].concat(a || 'shower')) T.spawnMeteor(k); },
  bolt: (T, fx, t, a) => fx.bolt(a),
  sheet: (T, fx, t, a) => fx.sheet(a),
  fish: (T, fx, t, a) => fx.fishWave(a),
  touch: (T, fx, t, a) => { for (const p of a) T.waterTouch(p[0], p[1]); },
  night: T => { T.S.timeMode = 'night'; },
  kun: T => { T.beginEncounter('kun'); },
};

/* ---------------- 画里的时钟：有慢放、定格的场次，要按画里的时间去对拍 ---------------- */
const EASE = { sine: p => .5 - .5 * Math.cos(Math.PI * p), lin: p => p, io: p => (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) };
function clockOf(sc) {
  const F0 = fr(sc.t0), P = Math.round((sc.preroll || 0) * FPS), F1 = fr(sc.t1), base = F0 - P - 1;
  const shots = sc.shots.map(s => ({ f0: fr(s.t0), f1: fr(s.t1), cam: s.cam }));
  const g = [base / FPS];
  for (let f = base + 1; f <= F1 + 1; f++) {
    const s = shots.find(q => f >= q.f0 && f < q.f1); let r = 1;
    if (s && s.cam && s.cam.rate != null) {
      const R = s.cam.rate;
      if (typeof R === 'number') r = R;
      else { const p = (f - s.f0) / Math.max(1, s.f1 - s.f0 - 1), e = EASE[s.cam.rateEase || 'sine'](Math.min(1, Math.max(0, p))); r = R[0] + (R[1] - R[0]) * e; }
    }
    g.push(g[g.length - 1] + r / FPS);
  }
  const at = f => g[Math.max(0, Math.min(g.length - 1, f - base))];
  return {
    at,
    // 要让一样东西在第 fb 帧正好「到点」（烟花在这一帧炸开）：它的计时器从哪一帧开始走
    startFor(fb, dur, lead) { const target = at(fb) - dur - (lead || 0) + 1e-6; let h = fb - 1; while (h > base && at(h) > target) h--; return h + 1; },
  };
}
/* ---------------- 几场戏同时拍同一段：按拍子轮流出画 ---------------- */
function keepFor(sched, endT, k) {
  const out = [];
  for (let i = 0; i < sched.length; i++) { const [t, kk] = sched[i], t2 = i + 1 < sched.length ? sched[i + 1][0] : endT; if (kk === k) out.push([t, t2]); }
  return out;
}
const fireDur = (v, size) => 1.5 + v * .35 + size * .1;
function fireEvents(sc, list, lead) {
  const clk = clockOf(sc), out = [];
  for (const [b, shells] of list) for (const q0 of shells) {
    const q = q0.slice(); q[4] = Math.min(1.65, q[4] * 1.25);
    const fl = clk.startFor(fr(B(b)), fireDur(q[1], q[4]), lead == null ? .05 : lead);      // 炸开的那一下正好落在拍上
    out.push([fl / FPS, ev.fire, [q], 'shell@' + b]);
  }
  return out;
}
const SNAP = (z, o) => Object.assign({ keys: [[.12, { z: z * 1.14 }, 'xo'], [1, { z: z * 1.06 }, 'lin']] }, o || {});   // 一下推上去，再慢慢稳住
ev.bellDepart = T => { T.depart(); };
ev.noRandom = T => { T.NX.lastEnd = 1e9; };
const QUIET = ' NX.lastEnd = 1e9; NX.fishWaveT = 1e9;';          // 这一场里别的偶遇不来
const scenes = [];

/* ============ A · 暮海，出发（0 – B19）：前奏没有贝斯——春天的黄昏，一件一件小东西；B11 贝斯进来，鸣铃、出发 ============ */
scenes.push({
  id: 'A', hash: '#st=0', t0: 0, t1: c(19), preroll: 3, seed: 81,
  init: D(0, PARK(0) + ` T.FP.on = 1; T.FP.n = 260; S.girlAt = 'platforms';` + QUIET),
  events: [
    [B(3) - .04, ev.gust, null, 'gust-3'],
    [B(11) - .03, ev.bellDepart, null, 'depart'],
  ],
  shots: seq(c(19), [
    [0, C(640, 360, 1.3, { to: { z: 1.12 }, ease: 'sine' })],                    // 暮海的黄昏，慢慢拉开
    [c(3), K('sakura', 1.8, 0, -40, { to: { z: 2.0 }, ease: 'sine' })],           // 暮海的樱
    [c(5), K('chime', 2.3, 0, 0)],                                                // 风铃、燕子窝
    [c(7), C(600, 540, 1.7, { to: { x: 660 }, ease: 'lin' })],                    // 海上的花筏
    [c(9), TR(1.7, -20, -30, { breath: .03 })],                                   // 车窗里的灯
    [c(11), C(640, 380, 1.0, { to: { z: 1.07 }, ease: 'sine' })],                 // 贝斯进来：鸣铃，出发
    [c(15), TR(1.8, 40, -40)],
    [c(17), C(1000, 340, 1.5, { breath: .03 })],                                  // 太阳那边的霞
  ]),
});

/* ============ B · 沿海（B19 – B35）：片名；秋天的黄昏，火烧云；B27 慢下来、褪一点色，再回来 ============ */
scenes.push({
  id: 'B', hash: '', t0: c(19), t1: c(35), preroll: 4, seed: 82,
  init: D(2, `S.travel = S.camera = 0.42 * g; S.tramMode = 'cruising'; S.tramV = ${CRUISE}; S.stopAt = Infinity; S.station = 0;` + QUIET),
  shots: seq(c(35), [
    [c(19), C(640, 330, 1.0, SNAP(1.0))],
    [c(21), TR(1.8, 0, -30)],
    [c(23), C(1000, 380, 1.6, { to: { x: 950 }, ease: 'lin' })],                 // 地平线上那道烫的光
    [c(25), C(640, 240, 1.4, { to: { z: 1.5 }, ease: 'sine' })],                 // 满天的火烧云
    [c(27), C(640, 300, 1.2, { to: { z: 1.32 }, ease: 'sine', rate: .3 })],      // 慢下来
    [c(29), C(640, 470, 1.3, { to: { z: 1.15 }, ease: 'sine', rate: [.45, 1] })], // 水里的云，慢慢回到原速
    [c(31), TR(1.5, 60, -70)],
    [c(33), C(860, 540, 1.8, { to: { x: 780 }, ease: 'lin' })],                  // 海上碎金
  ]),
});

/* ============ S1–S7 · 沿途（B35 – B59）：每一站在它最好看的时候，各在一季；两拍一站 ============ */
const ST = (id, n, t0, t1, init, shots, o) => scenes.push(Object.assign({ id, hash: '#st=' + n, t0, t1, preroll: 4, seed: 83 + n % 10, init, shots: seq(t1, shots) }, o || {}));
ST('S1', 1, c(35), c(39), D(3, PARK(1) + QUIET), [                               // 远汀 · 冬 · 黄昏：沙洲上那棵松、浮冰、站台的冰凌
  [c(35), K('islet', 1.7, 60, -50, { to: { z: 1.9 }, ease: 'sine' })],
  [c(37), K('icicles', 1.9, -40, 20)],
]);
ST('S2', 2, c(39), c(43), N(2, PARK(2) + ' T.SKY2.moonUp = 1;' + QUIET), [       // 月见 · 秋 · 夜：中秋的月、芒草
  [c(39), K('midautumn', 1.8, 0, 40, { to: { z: 2.1 }, ease: 'sine' })],
  [c(41), K('pampas', 2.2, 0, -30)],
], { preroll: 14 });
ST('S3', 3, c(43), c(47), N(1, PARK(3) + QUIET), [                               // 潮生 · 夏 · 夜：白鹭、海上明月
  [c(43), K('egret', 2.4, 0, -10)],
  [c(45), C(220, 460, 1.8, { to: { z: 2.0 }, ease: 'sine' })],
], { preroll: 6 });
ST('S4', 4, c(47), c(51), N(3, PARK(4) + QUIET), [                               // 灯岬 · 冬 · 夜：灯塔的光柱、流冰上的海豹
  [c(47), K('capelight', 1.7, 0, 70, { to: { z: 1.95 }, ease: 'sine' })],
  [c(49), K('seal', 2.4, 0, -20)],
], { preroll: 6 });
ST('S5', 5, c(51), c(53), N(2, PARK(5) + QUIET), [                               // 汐音 · 秋 · 夜：浮标钟
  [c(51), K('bellbuoy', 2.4, 0, -30)],
], { preroll: 6 });
ST('S6', 6, c(53), c(55), D(0, PARK(6) + QUIET), [                               // 听风 · 春 · 黄昏：纸风车、风筝
  [c(53), K('pinwheel', 2.4, 0, -20)],
  [c(54), K('kite', 2.0)],
], { events: [[B(53) - .1, ev.gust, null, 'gust']] });
ST('S7', 17, c(55), c(59), N(1, PARK(17) + ' S.gustT = 1e9;' + QUIET), [          // 拾光 · 夏 · 夜：光瓶、萤火
  [c(55), K('lightjars', 2.4, 0, -20)],
  [c(57), K('fireflies', 1.7, 0, -30)],
], { preroll: 8 });

/* ============ D · 冬夜的海（B59 – B91）：潮生，雪、流冰、猎户座；海下面一群水母；蓝眼泪一拍一亮；两拍 → 一拍 → 半拍一切 ============ */
{
  const evs = [];
  for (let b = 60; b < 75; b += 2) evs.push([B(b), ev.touch, [[260 + ((b * 137) % 760), 580 + ((b * 53) % 110)]], 't' + b]);
  for (let b = 75; b < 87; b++) evs.push([B(b), ev.touch, [[200 + ((b * 211) % 880), 570 + ((b * 71) % 120)]], 't' + b]);
  for (let i = 0; i < 8; i++) evs.push([B(87 + i * .5), ev.touch, [[240 + ((i * 263) % 800), 590 + ((i * 97) % 100)]], 'th' + i]);
  scenes.push({
    id: 'D', hash: '#st=3', t0: c(59), t1: c(91), preroll: 6, seed: 90,
    init: N(3, PARK(3) + QUIET), events: evs,
    shots: seq(c(91), [
      [c(59), C(640, 340, 1.0, { to: { z: 1.08 }, ease: 'sine' })],              // 下雪的夜，海下面亮着水母
      [c(61), C(640, 600, 1.7, { to: { x: 700 }, ease: 'lin' })],
      [c(63), C(900, 260, 1.6, { to: { z: 1.72 }, ease: 'sine' })],              // 猎户座挂在潮生站上面
      [c(65), C(760, 560, 1.6, { to: { x: 820 }, ease: 'lin' })],                // 流冰
      [c(67), K('icicles', 1.8, -40, 20)],                                        // 站台的冰凌、她
      [c(69), C(640, 470, 1.3, { to: { z: 1.4 }, ease: 'sine' })],               // 镜子一样的海
      [c(71), TR(1.6, 0, -30)],
      [c(73), C(300, 520, 1.6)],                                                  // 海上的月亮和它的倒影
      [c(75), K('jelly', 2.2, 0, 10, { idx: 2 })], [c(76), C(640, 330, 1.0)], [c(77), K('moths', 2.0, 0, -10)], [c(78), C(1000, 520, 1.7)],
      [c(79), C(640, 330, 1.05, SNAP(1.05))], [c(80), C(560, 620, 1.8)], [c(81), K('chime', 2.2)], [c(82), K('tidepole', 2.0, -60, 0)],
      [c(83), C(640, 560, 1.4, SNAP(1.4))], [c(84), TR(1.8, 0, -20)], [c(85), C(900, 250, 1.5)], [c(86), C(740, 580, 1.8)],
      [c(87), C(560, 640, 2.0)], [c(87.5), C(640, 200, 1.5)], [c(88), K('jelly', 2.4, 0, 12, { idx: 1 })], [c(88.5), TR(1.8, 0, -20)],
      [c(89), C(640, 600, 1.8)], [c(89.5), C(900, 240, 1.7)], [c(90), K('jelly', 2.6, 0, 14)], [c(90.5), C(640, 330, 1.2, { to: { z: 1.0 }, ease: 'out' })],
    ]),
  });
}

/* ============ E · 流星雨（B91 – B131）：灯岬，秋夜；屏住气的八拍里先落几颗；B99 夜满了：每拍两颗，重拍上一颗火流星 ============ */
{
  const evs = [[B(93), ev.meteor, ['lone'], 'm93'], [B(95), ev.meteor, ['lone'], 'm95'], [B(96), (T) => { T.beginEncounter('meteor'); T.NX.active.age = 10; }, null, 'meteor-on'], [B(97), ev.meteor, ['shower'], 'm97']];
  for (let b = 99; b < 131; b++) evs.push([B(b), ev.meteor, b % 2 ? ['shower'] : ['shower', 'shower'], 'm' + b]);
  for (const b of [99, 107, 115, 123]) evs.push([B(b) - .12, ev.meteor, ['bolide'], 'bolide' + b]);
  for (const b of [103, 111, 119, 127]) evs.push([B(b), ev.meteor, ['grazer'], 'grazer' + b]);
  for (let b = 100; b < 131; b += 2) evs.push([B(b), ev.touch, [[200 + ((b * 137) % 880), 560 + ((b * 53) % 130)]], 'tears' + b]);
  scenes.push({
    id: 'E', hash: '#st=4', t0: c(91), t1: c(131), preroll: 6, seed: 91,
    init: N(2, PARK(4) + ` S.girlAt = 'platforms';` + QUIET), events: evs,
    shots: seq(c(131), [
      [c(91), K('capelight', 1.6, 0, 60, { to: { z: 1.9 }, ease: 'sine' })],     // 灯塔的光柱扫过来
      [c(95), C(640, 260, 1.15, { to: { z: 1.0 }, ease: 'out' })],                // 屏住气
      [c(99), C(640, 280, 1.0, SNAP(1.0))],                                        // 夜满了
      [c(100), K('her', 2.2, 0, -20)],
      [c(101), C(860, 220, 1.5)],
      [c(102), C(640, 600, 1.6)],
      [c(103), C(420, 240, 1.6, SNAP(1.6))],
      [c(104), K('moths', 2.0)],
      [c(105), C(640, 560, 1.6)],
      [c(106), K('moonrise', 2.4, 0, -10)],                                       // 海平线上升起来的月亮，水里还有一个
      [c(107), C(640, 300, 1.05, SNAP(1.05))],
      [c(108), K('station-4', 2.0, 0, -20)],
      [c(109), K('980', 210, 1.8)],
      [c(110), C(760, 620, 1.7)],
      [c(111), K('capelight', 2.0, 0, 20, SNAP(2.0))],
      [c(112), TR(2.0, 0, -20)],
      [c(113), C(330, 330, 1.6)],
      [c(114), K('room', 1.8)],
      [c(115), C(640, 300, 1.0, SNAP(1.0))],
      [c(116), C(500, 610, 1.8)],
      [c(117), C(760, 250, 1.5)],
      [c(118), C(520, 600, 2.0)],
      [c(119), K('fallenleaves', 2.0, 0, -20, SNAP(2.0))],
      [c(120), K('jelly', 2.2, 0, 10, { idx: 1 })],
      [c(121), C(640, 240, 1.4)],
      [c(122), C(880, 590, 2.0)],
      [c(123), K('jelly', 2.6, 0, 18)],                                           // 副歌的尾巴：慢下来
      [c(127), C(640, 330, 1.0, { to: { z: 1.12 }, ease: 'sine', rate: .55 })],
    ]),
  });
}

/* ============ F · 暴风雨（B131 – B147）：闪电劈在重音上（131、136、138、143），雨；B147 雨过天晴 ============ */
{
  const bolts = [[131, .6, 'bolt'], [133, .3, 'sheet'], [134.5, .72, 'bolt'], [136, .4, 'bolt'], [137, .7, 'sheet'], [138, .5, 'bolt'], [139.5, .25, 'bolt'],
    [140, .66, 'sheet'], [141, .45, 'bolt'], [142, .2, 'bolt'], [143, .55, 'bolt'], [144, .35, 'sheet'], [145, .7, 'bolt'], [145.5, .3, 'bolt']];
  scenes.push({
    id: 'F', hash: '#storm', t0: c(131), t1: c(147), preroll: 15, seed: 92,
    init: (T) => { T.NX.seasonForce = 1; T.S.tramTimer = Infinity; T.NX.thunderT = 1e9; document.body.classList.add('mv-clean'); },
    events: [
      [c(131) - 10, (T) => { T.NX.thunderT = 1e9; }, null, 'no-auto-thunder'],
      ...bolts.map(([b, x, k]) => [B(b) - .02, k === 'bolt' ? ev.bolt : ev.sheet, x, k + b]),
    ],
    shots: seq(c(147), [
      [c(131), C(640, 330, 1.0, SNAP(1.0))],
      [c(133), TR(1.6, 40, -40)],
      [c(134.5), C(640, 240, 1.5, { to: { z: 1.6 } })],
      [c(136), C(800, 200, 1.8, SNAP(1.8))],
      [c(137), C(640, 560, 1.8)],
      [c(138), C(640, 330, 1.0, SNAP(1.0))],
      [c(139.5), TR(2.0, 20, -20)],
      [c(141), C(480, 260, 1.6)],
      [c(142), C(640, 600, 1.7)],
      [c(143), C(640, 300, 1.25, SNAP(1.25))],
      [c(145), TR(1.6, 60, -40)],
      [c(146), C(640, 330, 1.0, { to: { z: 1.15 }, ease: 'in' })],
    ]),
  });
}

/* ============ G · 雨过天晴，小镇的下午（B147 – B179）：两拍一个镜头，甩着切 ============ */
scenes.push({
  id: 'G', hash: '#noon', t0: c(147), t1: c(179), preroll: 3, seed: 93,
  init: (T) => { T.S.gustT = 1e9; T.NX.lastEnd = 1e9; document.body.classList.add('mv-clean'); },
  shots: seq(c(179), [
    [c(147), C(640, 380, 1.0, SNAP(1.0))],
    [c(149), C(740, 250, 1.7, { to: { z: 1.85 }, ease: 'sine' })],               // 雨过天晴：太阳、钟楼、云
    [c(151), K('rower', 2.0, 0, -20, { track: .85 })],                            // 镜子一样的水上，有人划船
    [c(153), K('kids', 2.2, 40, -30, { track: .36 })],
    [c(155), K('cumulonimbus', 1.7, 0, -40)],                                    // 大朵的夏云底下，列车慢慢走
    [c(157), K('tower', 2.0, 0, 30, { track: .2 })],
    [c(159), TR(1.7, 0, -30)],
    [c(161), K('mole', 1.8, 0, -20, { track: .45 })],
    [c(163), K('bigtree', 1.8, 40, -10, { track: 1 })],                           // 大树、孩子、猫
    [c(165), TR(1.6, -20, -40)],
    [c(167), K('market', 1.7, 0, -30, { track: 1 })],
    [c(169), K('sail', 2.0, 0, -40, { track: 1 })],
    [c(171), C(640, 300, 1.2, SNAP(1.2))],
    [c(173), C(640, 420, 1.4, { to: { z: 1.5 }, ease: 'sine' })],
    [c(175), C(600, 540, 1.7, { to: { z: 1.85 }, ease: 'sine' })],               // 水里的小镇
    [c(177), TR(1.8, 0, -30)],
  ]),
});

/* ============ H · 小镇的黄昏（B179 – B203）：太阳落进港里，灯一盏一盏亮起来 ============ */
scenes.push({
  id: 'H', hash: '#sunset', t0: c(179), t1: c(203), preroll: 3, seed: 94,
  // 天色钉在列车位置上（游戏里天色追位置要慢三秒；片子里的太阳要落得准）：8.74G 金色的低太阳 → 8.80 碰到山坡 → 8.86 落下、灯亮 → 8.94 暮色
  init: (T, fx) => { const S = T.S, g = T.G(); S.gustT = 1e9; S.travel = S.camera = 8.69 * g; T.layoutTown(); T.NX.lastEnd = 1e9; document.body.classList.add('mv-clean');
    const pin = () => { const t = Math.min(1, Math.max(0, (S.travel / g - 8.5) / .5)), sm = t * t * (3 - 2 * t); S.dayF = 1 - sm; S.nightF = .15 * sm; };
    pin(); fx.tick(pin); },
  shots: seq(c(203), [
    [c(179), C(640, 360, 1.0, SNAP(1.0))],                                       // 金色的低太阳
    [c(181), K('sunset', 1.8, -60, 20, { breath: .05 })],
    [c(183), K('bath', 1.7, 40, -20, { track: 1 })],                              // 澡堂的烟囱冒着烟
    [c(185), C(905, 440, 1.6, { to: { z: 1.75 }, ease: 'sine' })],             // 天上一个太阳，水里也有一个               // 水里也有一个太阳
    [c(187), K('bakery', 1.8, 40, -20, { track: 1 })],
    [c(189), K('townlanterns', 2.0, 0, 20, { track: 1 })],                        // 灯一盏一盏亮起来
    [c(191), K('towncat', 2.4, 0, -20, { track: 1 })],
    [c(193), K('sunset', 2.0, -40, -10, { to: { z: 2.2 }, ease: 'sine' })],         // 最后一点被山坡吞掉
    [c(195), TR(1.7, 0, -30)],                                                    // 滑进烟火站
    [c(197), K('her', 2.2, 0, -30, { track: 1 })],
    [c(199), K('station-9', 1.8, 60, -40, { track: 1 })],                         // 烟火站
    [c(201), C(640, 360, 1.12, { to: { z: 1.0 }, ease: 'out' })],
  ]),
});

/* ============ I · 烟火（B203 – B243）：烟火站的傍晚，灯笼、露台、她；B211 三朵同时炸开，之后一拍一朵、半拍一朵 ============ */
{
  const sc = {
    id: 'I', hash: '#fireworks', t0: c(203), t1: c(243), preroll: 4, seed: 95,
    init: (T) => { const S = T.S; T.NX.seen.fireworks = true; S.tramTimer = Infinity; S.dwellT = 4; S.nightF = 0.18; S.gustT = 1e9; document.body.classList.add('mv-clean');
      T.beginEncounter('fireworks'); const a = T.NX.active; a.cue = T.FIRE_SCORE.length; a.age = 12; },
    shots: seq(c(243), [
      [c(203), C(640, 360, 1.0, { to: { z: 1.06 }, ease: 'sine' })],
      [c(205), K('townlanterns', 2.0, 0, 20)],
      [c(207), K('terrace', 1.9, 0, -20)],
      [c(209), K('her', 2.2, 0, -30, { to: { z: 2.0 }, ease: 'in' })],
      [c(211), C(640, 260, 1.0, SNAP(1.0))],
      [c(212), C(470, 210, 1.45)], [c(213), C(810, 200, 1.45)], [c(214), K('laundry', 1.9, 0, -60)],
      [c(215), C(640, 230, 1.25, SNAP(1.25))], [c(216), C(380, 240, 1.6)], [c(217), C(900, 230, 1.6)], [c(218), TR(1.6, 80, -120)],
      [c(219), C(640, 210, 1.4, SNAP(1.4))], [c(220), C(560, 190, 1.7)], [c(221), C(760, 210, 1.7)], [c(222), C(640, 600, 1.5)],
      [c(223), C(640, 280, 1.0, SNAP(1.0))], [c(224), C(420, 200, 1.5)], [c(225), C(860, 210, 1.5)], [c(226), K('house', 1.7, 0, -80)],
      [c(227), C(640, 250, 1.15, SNAP(1.15))], [c(228), C(500, 240, 1.6)], [c(229), C(780, 190, 1.6)], [c(230), C(640, 590, 1.6)],
      [c(231), C(640, 280, 1.0, SNAP(1.0))], [c(232), C(380, 220, 1.7)], [c(233), C(900, 230, 1.7)], [c(234), TR(1.6, 40, -80)],
      [c(235), C(640, 210, 1.3)], [c(235.5), C(500, 210, 1.8)], [c(236), C(780, 200, 1.8)], [c(236.5), C(640, 250, 1.5)],
      [c(237), C(420, 240, 1.8)], [c(237.5), C(880, 220, 1.8)], [c(238), C(640, 600, 1.7)], [c(238.5), C(640, 230, 1.3)],
      [c(239), C(640, 280, 1.0, { to: { z: 1.12 }, ease: 'sine' })],
    ]),
  };
  const P = [   // 烟花：[拍号, [[u, v, 种类, 颜色, 大小], …]]（u, v 是它在画面上炸开的位置）
    [211, [[.5, .2, 'chrys', 'gold', 1.35], [.25, .3, 'peony', 'rose', .95], [.75, .28, 'peony', 'ice', .95]]],
    [212, [[.36, .26, 'ring', 'mint', .9]]], [213, [[.64, .24, 'peony', 'peach', .95]]], [214, [[.5, .32, 'peony', 'gold', .7]]],
    [215, [[.46, .18, 'willow', 'gold', 1.2]]], [216, [[.3, .27, 'crossette', 'gold', 1.0]]], [217, [[.7, .25, 'peony', 'rose', .95]]], [218, [[.55, .22, 'palm', 'gold', 1.0]]],
    [219, [[.5, .2, 'chrys', 'peach', 1.1]]], [220, [[.42, .23, 'peony', 'ice', .9]]], [221, [[.6, .22, 'ring', 'rose', .9]]],
    [222, [[.5, .3, 'strobe', 'white', .8]]], [223, [[.5, .18, 'palm', 'gold', 1.2], [.28, .27, 'peony', 'mint', .8]]],
    [224, [[.33, .24, 'peony', 'rose', .9]]], [225, [[.68, .23, 'peony', 'gold', .9]]], [226, [[.5, .16, 'ring', 'ice', 1.0]]],
    [227, [[.5, .22, 'chrys', 'gold', 1.2]]], [228, [[.4, .25, 'peony', 'peach', .9]]], [229, [[.62, .2, 'crossette', 'gold', 1.0]]],
    [230, [[.5, .34, 'peony', 'rose', .7]]], [231, [[.3, .24, 'willow', 'gold', 1.15], [.7, .24, 'willow', 'gold', 1.15]]],
    [232, [[.3, .27, 'peony', 'mint', .9]]], [233, [[.7, .27, 'peony', 'ice', .9]]], [234, [[.5, .2, 'strobe', 'white', .9]]],
    [235, [[.5, .21, 'chrys', 'rose', 1.1]]], [235.5, [[.4, .24, 'peony', 'gold', .8]]], [236, [[.6, .22, 'peony', 'peach', .8]]],
    [236.5, [[.5, .27, 'ring', 'mint', .8]]], [237, [[.33, .25, 'peony', 'rose', .8]]], [237.5, [[.67, .24, 'peony', 'ice', .8]]],
    [238, [[.5, .32, 'peony', 'gold', .7]]], [238.5, [[.5, .2, 'chrys', 'gold', 1.0]]],
    [239, [[.5, .18, 'chrys', 'gold', 1.35], [.26, .3, 'peony', 'rose', .9], [.74, .3, 'peony', 'peach', .9]]],
    [241, [[.4, .21, 'willow', 'gold', 1.2], [.6, .21, 'willow', 'gold', 1.2]]],
  ];
  sc.events = fireEvents(sc, P, .05);
  scenes.push(sc);
}

/* ============ J · 河灯与星河（B243 – B259）：镇上的河灯漂到海上，星河从天顶落进海里；画里的时间慢一点 ============ */
scenes.push({
  id: 'J', hash: '#lanterns', t0: c(243), t1: c(259), preroll: 16, seed: 96,
  init: (T) => { T.NX.seasonForce = 0; T.S.gustT = 1e9; T.S.tramMode = 'cruising'; T.S.tramV = .12; T.S.stopAt = Infinity; document.body.classList.add('mv-clean'); T.beginEncounter('galaxy', null, 90); },
  events: [[B(247), ev.touch, [[320, 600], [380, 640]], 'tears1'], [B(251), ev.touch, [[860, 620]], 'tears2'], [B(255), ev.touch, [[560, 650], [700, 610]], 'tears3']],
  shots: seq(c(259), [
    [c(243), C(640, 300, 1.0, { to: { z: 1.1, y: 320 }, ease: 'sine', rate: .8 })],
    [c(247), C(860, 500, 2.0, { to: { x: 920 }, ease: 'lin', rate: .8 })],          // 河灯：花瓣、水母和河灯一起漂
    [c(251), C(640, 200, 1.7, { to: { z: 1.9 }, ease: 'sine', rate: .8 })],          // 星河
    [c(255), TR(1.7, 30, -50, { rate: .8 })],
  ]),
});

/* ============ J3 · 满月与飞鱼（B259 – B267）：飞鱼一波一波地滑过去，有一波是慢的 ============ */
scenes.push({
  id: 'J3', hash: '#fullmoon', t0: c(259), t1: c(267), preroll: 4, seed: 97,
  init: (T) => { const NX = T.NX; NX.seasonForce = 1; T.S.gustT = 1e9; T.beginEncounter('flyingfish'); NX.active.age = 13; NX.fish = 1; NX.fishWaveT = 1e9; document.body.classList.add('mv-clean'); },
  events: [[B(259) - .6, ev.fish, -1, 'wave1'], [B(263) - .3, ev.fish, 1, 'wave2']],
  shots: seq(c(267), [
    [c(259), C(640, 360, 1.0, { to: { z: 1.06 } })],
    [c(261), K('fullmoon', 2.0)],
    [c(263), C(760, 520, 1.7, { to: { x: 640 }, ease: 'lin', rate: .45 })],
    [c(265), C(640, 330, 1.0, { to: { z: 1.12 }, ease: 'in' })],
  ]),
});

/* ============ K · 一个不寻常的夜（B267 – B299）：秋夜，开出月见
   B267 静（遮幅合上）→ B275 流萤流金从那团光里荡开 → 丝带 → B283 海面隐去，列车开在天上 → 鲲从海平线下面浮上来 → B299 从头顶过去 ============ */
const KUN_INIT = N(2, `S.travel = S.camera = 2.16 * g; S.station = 2; S.tramMode = 'cruising'; S.tramV = ${CRUISE}; S.stopAt = Infinity; NX.lastEnd = 1e9; T.beginEncounter('kun');`);
const kunPre = (tStart, ageAt, tAge) => +(ageAt - (tAge - tStart)).toFixed(4);     // 要让第 tAge 秒时这一幕走到 ageAt 秒，开拍时它该走了多久
scenes.push({
  id: 'K1', hash: '', t0: c(267), t1: c(283), preroll: kunPre(c(267), 8.5, B(275)), seed: 98, init: KUN_INIT,
  shots: seq(c(283), [
    [c(267), C(640, 330, 1.0, { to: { z: 1.07 }, ease: 'sine' })],             // 静得出奇
    [c(269), K('midautumn', 2.0, 0, 0, { to: { z: 2.3 }, ease: 'sine' })],     // 月亮外面一圈晕
    [c(271), C(1040, 440, 2.0, { to: { z: 2.3 }, ease: 'sine' })],              // 海平线右边那团光，一明一暗
    [c(273), C(640, 200, 1.5, { breath: .02 })],                                // 星一阵一阵地呼吸
    [c(275), C(860, 520, 1.25, SNAP(1.25))],                                    // 流萤流金：一圈涟漪荡开
    [c(277), C(640, 580, 1.7, { to: { x: 580 }, ease: 'lin' })],
    [c(279), C(400, 540, 1.9, { to: { y: 510 }, ease: 'sine' })],               // 萤火从水面上升起来
    [c(281), C(640, 260, 1.3, { to: { z: 1.42 }, ease: 'sine' })],              // 丝带舒展开
  ]),
});
scenes.push({
  id: 'K2', hash: '', t0: c(283), t1: c(299), preroll: kunPre(c(283), 21.5, c(283)), seed: 98, init: KUN_INIT,
  shots: seq(c(299), [
    [c(283), C(640, 400, 1.0, SNAP(1.0))],                                      // 海面隐去：列车开在天上
    [c(285), TR(1.7, 0, -40)],
    [c(287), C(640, 580, 1.8, { to: { x: 700 }, ease: 'lin' })],                // 水母在星星中间漂
    [c(289), C(1040, 430, 1.8, { to: { z: 2.0 }, ease: 'sine' })],              // 海平线下面，有什么浮上来了
    [c(291), C(640, 330, 1.0, SNAP(1.0))],
    [c(293), KP(0, 0, 1.6, { push: .1 })],
    [c(295), TR(1.6, 120, -120)],
    [c(297), KP(-.4, .02, 2.2)],
  ]),
});
/* ============ R · 四季绕着列车轮着来（B299 – B331）：鲲从头顶过去以后，时间流起来——秋 → 冬 → 春 → 夏，
   两拍一季 → 一拍一季 → 半拍一季 → 四季竖着同框、一条一条推下来再轮转 → 半拍一季 → 白。
   每一季取它最好看的样子：秋 = 鲲的那个夜，冬 = 下雪的黄昏，春 = 暮海花吹雪的黄昏，夏 = 满月与飞鱼的夜（夏天黄昏那张天不用）。
   一拍、半拍那几段四季用同一个跟车镜头：列车不动，世界绕着它换季 ============ */
const ROT = [];
[0, 1, 2, 3].forEach((k, i) => ROT.push([c(299 + i * 2), k]));          // 两拍一季
for (let i = 0; i < 8; i++) ROT.push([c(307 + i), i % 4]);                // 一拍一季
for (let i = 0; i < 8; i++) ROT.push([c(315 + i * .5), i % 4]);           // 半拍一季
const ROT_SPLIT = [c(319), c(327)];
ROT.push([c(319), -1]);                                                    // 四季同框：各场只出 layers
for (let i = 0; i < 8; i++) ROT.push([c(327 + i * .5), i % 4]);           // 再半拍一季 → 白
const ROT_END = c(331);
// 同一个跟车镜头（一拍、半拍那几段四季共用），和同框用的全景
const RT1 = () => TR(1.35, 30, -90), RT2 = () => TR(1.7, 0, -40), RWIDE = () => C(640, 360, 1.0, { breath: .02 }), RLAST = () => C(640, 330, 1.05);
const rot = (k, o) => Object.assign({ id: 'R' + k, hash: '', t0: c(299), t1: ROT_END, keep: keepFor(ROT, ROT_END, k), layer: { tag: 'R' + k, ranges: [ROT_SPLIT] } }, o);
// R0 · 秋：鲲的那个夜（接着 K2 往下走）
scenes.push(rot(0, {
  preroll: kunPre(c(299), 44, c(299)), seed: 98, init: KUN_INIT,
  shots: seq(ROT_END, [[c(299), C(640, 300, 1.0, SNAP(1.0))], [c(307), KP(-.33, .02, 2.2)], [c(311), RT1()], [c(315), RT2()], [c(319), RWIDE()], [c(327), RLAST()]]),
}));
// R1 · 冬：下雪的黄昏，雪山的倒影、浮冰
scenes.push(rot(1, {
  preroll: 6, seed: 99, init: D(3, `S.travel = S.camera = 0.62 * g; S.tramMode = 'cruising'; S.tramV = ${CRUISE}; S.stopAt = Infinity; S.station = 0;` + QUIET),
  shots: seq(ROT_END, [[c(299), C(640, 330, 1.0)], [c(301), C(640, 330, 1.0, { to: { z: 1.08 }, ease: 'sine' })], [c(308), C(700, 540, 1.6)], [c(312), RT1()], [c(315.5), RT2()], [c(319), RWIDE()], [c(327.5), RLAST()]]),
}));
// R2 · 春：暮海的花吹雪
scenes.push(rot(2, {
  preroll: 6, seed: 100, init: D(0, `S.travel = S.camera = 0.12 * g; S.tramMode = 'cruising'; S.tramV = ${CRUISE}; S.stopAt = Infinity; S.station = 0; T.FP.on = 1; T.FP.n = 360;` + QUIET),
  events: [[c(299) - 6, ev.storm, 40, 'petal-storm'], [B(303) - .04, ev.gust, null, 'gust-303'], [B(309) - .04, ev.gust, null, 'gust-309'], [B(319) - .04, ev.gust, null, 'gust-319']],
  shots: seq(ROT_END, [[c(299), C(640, 330, 1.0)], [c(303), C(640, 330, 1.0, { to: { z: 1.08 }, ease: 'sine' })], [c(309), C(820, 330, 1.6)], [c(313), RT1()], [c(316), RT2()], [c(319), RWIDE()], [c(328), RLAST()]]),
}));
// R3 · 夏：满月，飞鱼成群
scenes.push(rot(3, {
  hash: '#fullmoon', preroll: 4, seed: 101,
  init: (T) => { const NX = T.NX; NX.seasonForce = 1; T.S.gustT = 1e9; T.beginEncounter('flyingfish'); NX.active.age = 13; NX.fish = 1; NX.fishWaveT = 1e9; document.body.classList.add('mv-clean'); },
  events: [[B(305) - .6, ev.fish, -1, 'wave1'], [B(309.5) - .5, ev.fish, 1, 'wave2'], [B(313.5) - .5, ev.fish, -1, 'wave3'], [B(318.5) - .6, ev.fish, 1, 'wave4'], [B(326.5) - .5, ev.fish, -1, 'wave5']],
  shots: seq(ROT_END, [[c(299), C(640, 330, 1.0)], [c(305), C(640, 330, 1.0, { to: { z: 1.08 }, ease: 'sine' })], [c(310), K('fullmoon', 1.8)], [c(314), RT1()], [c(316.5), RT2()], [c(319), RWIDE()], [c(328.5), RLAST()]]),
}));

/* ============ Z · 黄昏又回来了（B331 – 终）：春天的暮海，列车进站；揭下一张卡，收集簿一拍一张；片尾字 ============ */
{
  const tPark = B(339), t0 = c(331), pre = 3, d = distFor(tPark - (t0 - pre));
  const peelOn = key => new Function('T', 'fx', `fx.peel(${JSON.stringify(key)});`);
  const tab = rank => new Function('T', 'fx', `const b = document.querySelector('#album-tabs [data-rank="${rank}"]'); if (b) b.click();`);
  const pop = n => [(T, fx, t, a) => window.__popNext(a), n];
  scenes.push({
    id: 'Z', hash: '#st=0', t0, t1: END, preroll: pre, seed: 100, dpr: 2, store: 'album-store.json',
    init: D(0, `T.FP.on = 1; T.FP.n = 360; S.travel = S.camera = -${d.toFixed(5)}; S.tramMode = 'cruising'; S.tramV = ${CRUISE}; S.stopAt = 0; S.station = -1; S.tramDX = 0; T.layoutTown(); S.girlAt = 'platforms';` + QUIET + `
      document.body.classList.add('mv-hidegot'); fx.tick(() => window.__albumTick());
      const st = document.createElement('style'); st.textContent = '#toast{display:none!important}'; document.head.appendChild(st);`),
    events: [
      [B(333) - .04, ev.gust, null, 'gust-333'],
      [B(337) - .04, ev.gust, null, 'gust-337'],
      [B(341) - .2, (T, fx) => fx.clean(false), null, 'ui-on'],
      [B(342) - 1.18, peelOn('sakura'), null, 'peel-sakura'],
      [B(344) - .1, (T, fx) => fx.gotIt(), null, 'got'],
      [B(345) + .04, () => document.getElementById('album-open').click(), null, 'album'],      // 卡片飞回去要 0.56 秒；飞完了才开得了
      [B(345) + .08, (T) => T.showRank('high'), null, 'rank-high'],
      [B(346), ...pop(1), 'pop'], [B(347), ...pop(1), 'pop'], [B(348), ...pop(1), 'pop'], [B(349), ...pop(2), 'pop'],
      [B(350), tab('common'), null, 'tab-common'],
      [B(350) + .02, ...pop(2), 'pop'], [B(351), ...pop(2), 'pop'], [B(352), ...pop(3), 'pop'], [B(353), ...pop(99), 'pop-rest'],
      [B(354), tab('special'), null, 'tab-special'],
      [B(354) + .02, ...pop(2), 'pop'], [B(355), ...pop(2), 'pop'], [B(356), ...pop(3), 'pop'], [B(357), ...pop(99), 'pop-rest'],
      [B(358) - .1, () => document.getElementById('album-close').click(), null, 'album-close'],
    ],
    shots: [
      ...seq(c(341), [
        [c(331), C(640, 380, 1.0, { to: { z: 1.06 }, ease: 'sine' })],
        [c(333), K('sakura', 1.8, 0, -40, { to: { z: 2.0 }, ease: 'sine' })],
        [c(335), TR(1.7, 30, -40)],
        [c(337), K('chime', 2.2)],
        [c(339), C(700, 400, 1.6, { to: { z: 1.35, x: 660 }, ease: 'out' })],
      ]),
      { t0: c(341), t1: c(359), mode: 'screen' },
      { t0: c(359), t1: END, cam: C(640, 380, 1.25, { to: { z: 1.0, y: 360 }, ease: 'out', rate: .8 }), mode: 'cam' },
    ],
  });
}

/* ================================================================
   post：合成时加在画面上的东西（compose.py 读 post.json；像素量按 1080p 写）
   whip：切点前后几帧横着甩一下（运动模糊）；stutter：这一段每 n 帧停一下（一顿一顿的）；
   recap：这一段的画从前面某一刻取（一闪而过的这一路，不另拍）
   ================================================================ */
const post = { end: END, flash: [], punch: [], shake: [], rgb: [], zblur: [], black: [], text: [], strips: [], tracks: {}, whip: [], stutter: [], recap: [] };
const FL = (t, a = .4, d = .2, col = [255, 250, 242]) => post.flash.push([+t.toFixed(4), a, d, col]);
const PU = (t, a = .04, d = .14) => post.punch.push([+t.toFixed(4), a, d]);
const SH = (t, a = 8, d = .3) => post.shake.push([+t.toFixed(4), a, d]);
const RG = (t, a = 5, d = .14) => post.rgb.push([+t.toFixed(4), a, d]);
const ZB = (t, d = .2, a = .6) => post.zblur.push([+t.toFixed(4), +(t + d).toFixed(4), a]);
const WH = (t, a = 40, dir = 1, d = .09) => post.whip.push([+t.toFixed(4), a, dir, d]);
const STUT = (t0, t1, hold = 3) => post.stutter.push([+t0.toFixed(4), +t1.toFixed(4), hold]);
const TX = (name, a0, a1, b0, b1, o) => post.text.push(Object.assign({ name, a0: +a0.toFixed(3), a1: +a1.toFixed(3), b0: +b0.toFixed(3), b1: +b1.toFixed(3) }, o || {}));
const WARM = [255, 236, 214], COLD = [222, 232, 255], VIOLET = [236, 222, 255], GOLD = [255, 226, 168];
const SHELL = { gold: [255, 226, 160], rose: [255, 206, 222], ice: [214, 230, 255], mint: [208, 255, 232], peach: [255, 216, 190], white: [255, 255, 255] };

// 亮度：从黑里亮起来；片尾字出来时暗一点；最后淡到黑。遮幅：前奏 2.39:1，片名打开；B267 一下合上，B275 炸开；片尾合上
post.tracks.bright = [[0, 0], [B(0) - .25, 0], [B(0) + .6, 1, 'sine'], [B(359), 1], [B(363), .72, 'sine']];
post.tracks.fade = [[0, 1], [END - 2.2, 1], [END - .05, 0, 'sine']];
post.tracks.lb = [[0, 138], [c(19) - .02, 138], [c(19) + .3, 0, 'xo'], [c(267) - .02, 0], [c(267) + .28, 138, 'xo'], [c(275) - .02, 138], [c(275) + .3, 0, 'xo'], [B(359), 0], [B(364), 138, 'sine']];
post.tracks.desat = [[0, 0], [c(27) - .001, 0], [c(27), .3, 'step'], [c(29) - .001, .3], [c(29) + .5, 0, 'sine'], [c(267), 0], [B(271), .3, 'sine'], [c(275) - .001, .3], [c(275), 0, 'step']];
post.tracks.white = [[0, 0], [c(146.5), 0], [c(147) - .02, .85, 'in'], [c(147) + .5, 0, 'out'], [c(329), 0], [c(331) - .02, 1, 'in'], [c(331) + .8, 0, 'out']];
post.tracks.bloom = [[0, 0], [c(59) - .01, 0], [c(59), .3, 'step'], [c(99) - .01, .3], [c(99), .45, 'step'], [c(131) - .01, .45], [c(131), .2, 'step'], [c(147) - .01, .2], [c(147), 0, 'step'],
  [c(211) - .01, 0], [c(211), .55, 'step'], [c(243) - .01, .55], [c(243), .4, 'step'], [c(267) - .01, .4], [c(267), .35, 'step'], [c(275) - .01, .35], [c(275), .5, 'step'], [c(299) - .01, .5], [c(299), .3, 'step'], [c(319) - .01, .3], [c(319), .2, 'step'], [c(331) - .01, .2], [c(331), 0, 'step']];

// A：前奏 → 贝斯进来，出发 → 片名
FL(B(0), .25, .5, WARM);
for (const b of [3, 5, 7, 9]) { PU(c(b), .02, .2); FL(c(b), .1, .25, WARM); }
FL(c(11), .28, .3, WARM); PU(c(11), .045, .2); for (const b of [15, 17]) PU(c(b), .03, .16);
TX('title', c(19), c(19) + .12, c(27) - .5, c(27) - .1, { slam: 1 });
FL(c(19), .65, .35, WARM); PU(c(19), .08, .25); RG(c(19), 6); SH(c(19), 7, .3); ZB(c(19) - LEAD, .25, .6);
// B：沿海；B27 停住
for (const b of [21, 23, 25]) PU(c(b), .03, .14);
FL(c(27), .35, .25); PU(c(27), .05, .18); PU(c(29), .035, .2); PU(c(31), .04, .14); WH(c(31), 46, 1); PU(c(33), .03, .14); WH(c(33), 40, -1);
// S：沿途八站，两拍一站，甩着切
[[35, WARM, 1], [37, WARM, -1], [39, COLD, 1], [41, COLD, -1], [43, COLD, 1], [45, COLD, -1], [47, COLD, 1], [49, COLD, -1], [51, COLD, 1], [53, WARM, -1], [54, WARM, 1], [55, COLD, -1], [57, COLD, 1]]
  .forEach(([b, col, dir]) => { const big = b % 4 === 3; FL(c(b), big ? .3 : .14, .2, col); PU(c(b), big ? .055 : .028, .13); WH(c(b), big ? 52 : 38, dir); if (big) RG(c(b), 3.5); });
// D：冬夜的海，越切越快
FL(c(59), .35, .28, COLD); PU(c(59), .06); RG(c(59), 4);
for (let b = 61; b < 75; b += 2) PU(c(b), .028, .14);
for (let b = 75; b < 87; b++) { const big = b % 4 === 3; PU(c(b), big ? .055 : .028, .1); if (big) { FL(c(b), .22, .18, COLD); RG(c(b), 4); } }
for (let i = 0; i < 8; i++) { PU(c(87 + i * .5), .025, .08); if (i % 2 === 0) RG(c(87 + i * .5), 3, .07); }
STUT(c(89), c(90.75), 3);
post.black.push([+c(90.75).toFixed(4), +c(91).toFixed(4)]);
// E：流星雨
FL(c(91), .25, .4, COLD); PU(c(95), .035, .2); FL(B(95), .12, .3, COLD);
post.black.push([+c(98.5).toFixed(4), +c(99).toFixed(4)]);
FL(c(99), .8, .35, COLD); PU(c(99), .11, .26); SH(c(99), 11, .4); RG(c(99), 9); ZB(c(99) - LEAD, .25, .7);
for (let b = 100; b < 123; b++) { const big = b % 4 === 3; PU(c(b), big ? .06 : .03, .12); if (big) { FL(B(b), .32, .22, COLD); RG(c(b), 4.5); } }
for (const b of [101, 105, 109, 113, 117, 121]) WH(c(b), 34, b % 8 === 1 ? 1 : -1);
FL(c(123), .3, .3, COLD); PU(c(127), .03, .3);
// F：暴风雨
FL(c(131), .7, .3, COLD); PU(c(131), .09, .24); SH(c(131), 13, .45); RG(c(131), 8);
for (const [b, big] of [[133, 0], [134.5, 0], [136, 1], [137, 0], [138, 1], [139.5, 0], [140, 0], [141, 0], [142, 0], [143, 1], [144, 0], [145, 0], [145.5, 0]]) {
  FL(B(b), big ? .6 : .32, .2, COLD); PU(B(b), big ? .07 : .035, .14); if (big) { SH(B(b), 12, .4); RG(B(b), 7); } else SH(B(b), 4, .2);
}
// G：雨过天晴，小镇的下午：一刀一甩
FL(c(147), .45, .3); PU(c(147), .07, .22); RG(c(147), 4);
for (let b = 149, i = 0; b < 179; b += 2, i++) { const big = b % 4 === 3; PU(c(b), big ? .05 : .028, .13); WH(c(b), big ? 54 : 40, i % 2 ? 1 : -1); if (big) FL(c(b), .12, .18); }
// H：落日
FL(c(179), .3, .3, WARM); PU(c(179), .05, .2);
for (let b = 181; b < 203; b += 2) { const big = b % 4 === 3; PU(c(b), big ? .045 : .025, .14); if (big) FL(c(b), .14, .22, WARM); }
WH(c(183), 40, 1); WH(c(187), 40, -1); WH(c(195), 40, 1); WH(c(199), 40, -1);
// I：烟火
for (const b of [205, 207, 209]) PU(c(b), .025, .16);
FL(c(211), .9, .38); PU(c(211), .12, .28); SH(c(211), 14, .5); RG(c(211), 10, .2); ZB(c(211) - LEAD, .3, .8);
for (let b = 212; b < 235; b++) { const big = b % 4 === 3; PU(c(b), big ? .06 : .03, .12); }
[[212, 'mint'], [213, 'peach'], [214, 'gold'], [215, 'gold'], [216, 'gold'], [217, 'rose'], [218, 'gold'], [219, 'peach'], [220, 'ice'], [221, 'rose'], [222, 'white'], [223, 'gold'],
 [224, 'rose'], [225, 'gold'], [226, 'ice'], [227, 'gold'], [228, 'peach'], [229, 'gold'], [230, 'rose'], [231, 'gold'], [232, 'mint'], [233, 'ice'], [234, 'white']]
  .forEach(([b, col]) => FL(B(b), b % 4 === 3 ? .24 : col === 'white' ? .3 : .09, .14, SHELL[col]));
for (let i = 0; i < 8; i++) { PU(c(235 + i * .5), .025, .08); if (i % 2 === 0) RG(c(235 + i * .5), 3, .07); FL(B(235 + i * .5), .07, .1, WARM); }
STUT(c(237), c(239) - .01, 2);
FL(B(239), .5, .25, WARM); PU(B(239), .08); SH(B(239), 9, .3); RG(B(239), 6);
// J：河灯、星河、满月和飞鱼
FL(c(243), .4, .45, COLD); PU(c(243), .04, .25);
for (const b of [247, 251, 255]) PU(c(b), .03, .2);
FL(c(259), .3, .3, COLD); PU(c(259), .05); PU(c(261), .03); FL(B(263), .2, .3, COLD); PU(c(265), .03);
// K：一个不寻常的夜
FL(c(267), .22, .4, COLD); PU(c(267), .05, .3);
for (const b of [269, 271, 273]) PU(c(b), .02, .24);
post.black.push([+c(274.75).toFixed(4), +c(275).toFixed(4)]);
FL(B(275), .95, .42, GOLD); PU(B(275), .13, .3); SH(B(275), 16, .55); RG(B(275), 11, .2); ZB(B(275) - LEAD, .3, .85);
for (const b of [277, 279, 281]) { PU(c(b), .05, .14); FL(c(b), .18, .18, GOLD); }
FL(c(283), .55, .32, VIOLET); PU(c(283), .08, .22); RG(c(283), 5); SH(c(283), 6, .25);
for (const b of [285, 287, 289, 291, 293, 295, 297]) { const big = b % 4 === 3; PU(c(b), big ? .055 : .03, .14); if (big) FL(c(b), .2, .2, GOLD); }
WH(c(285), 36, -1); WH(c(293), 36, 1);
// R：四季绕着列车轮着来——两拍 → 一拍 → 半拍一季 → 四季同框 → 半拍 → 白（闪的颜色跟着季节：秋金、冬冷、春粉、夏蓝）
const SEASON_COL = [GOLD, COLD, [255, 222, 236], [214, 226, 255]];
FL(c(299), .65, .35, GOLD); PU(c(299), .1, .26); SH(c(299), 9, .35); RG(c(299), 7); ZB(c(299) - LEAD, .25, .6);
[301, 303, 305].forEach((b, i) => { FL(c(b), .32, .22, SEASON_COL[i + 1]); PU(c(b), .07, .18); RG(c(b), 4); ZB(c(b) - LEAD, .15, .45); WH(c(b), 44, i % 2 ? 1 : -1); });
for (let i = 0; i < 8; i++) { const b = 307 + i, big = b % 4 === 3; PU(c(b), big ? .06 : .035, .1); FL(c(b), big ? .26 : .12, .14, SEASON_COL[i % 4]); if (big) { RG(c(b), 5); SH(c(b), 6, .22); } }
for (let i = 0; i < 8; i++) { const t = c(315 + i * .5); PU(t, .03, .08); FL(t, .1, .1, SEASON_COL[i % 4]); if (i % 2 === 0) RG(t, 3.5, .07); }
FL(c(319), .6, .3); PU(c(319), .08); SH(c(319), 8, .3); RG(c(319), 8);
post.strips.push({ t0: +ROT_SPLIT[0].toFixed(4), t1: +ROT_SPLIT[1].toFixed(4), layers: ['R0', 'R1', 'R2', 'R3'], init: [0, 0, 0, 0], center: false,
  flips: [[c(320), [2, 0, 0, 0]], [c(321), [2, 3, 0, 0]], [c(322), [2, 3, 0, 1]], [c(323), [3, 0, 1, 2]], [c(324), [0, 1, 2, 3]], [c(325), [1, 2, 3, 0]],
          [c(325.5), [2, 3, 0, 1]], [c(326), [3, 0, 1, 2]], [c(326.5), [0, 1, 2, 3]]].map(([t, l]) => [+t.toFixed(4), l]) });
for (const b of [320, 321, 322]) { PU(c(b), .045, .12); FL(c(b), .14, .12); }
for (const b of [323, 324, 325, 325.5, 326, 326.5]) PU(c(b), .035, .1);
for (let i = 0; i < 8; i++) { const t = c(327 + i * .5); PU(t, .03, .08); RG(t, 3 + (i % 4), .07); FL(t, .1, .1, SEASON_COL[i % 4]); }
// Z：黄昏又回来了 → 收集簿 → 片尾
for (const b of [333, 335, 337]) PU(c(b), .03, .16);
PU(c(339), .045, .2); FL(c(339), .15, .25, WARM);
for (let b = 346; b < 358; b++) PU(B(b), .012, .1);
TX('end', B(359) + .4, B(359) + 1.6, 999, 1000, { scrim: [960, 420, 620, 260, .45] });

module.exports = { scenes, B, c, END, post, FPS, collect: require('./collect.js') };
if (require.main === module) {
  const fs = require('fs');
  fs.writeFileSync('post.json', JSON.stringify(post));
  let total = 0;
  for (const s of scenes) { const n = s.keep ? s.keep.reduce((m, [a, b]) => m + fr(b) - fr(a), 0) : fr(s.t1) - fr(s.t0); total += n; }
  const recapF = post.recap.reduce((m, [a, b]) => m + fr(b) - fr(a), 0);
  console.log('scenes', scenes.length, 'shots', scenes.reduce((m, s) => m + s.shots.length, 0), 'main frames', total, '+ recap', recapF, 'of', fr(END));
}
