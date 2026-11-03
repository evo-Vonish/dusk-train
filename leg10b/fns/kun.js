/* 第十棒第八版 · 鲲（在一个不寻常的夜里来）
   北冥有鱼，其名为鲲。第七版里，它在下午的黄昏从太阳旁边的霞里游出来——来得没有来由。现在它只在夜里来，而且那一夜先有预兆：
   · 静（0–8 秒）：海忽然静得像一面镜子，倒影一丝不晃；风声、海声低下去；星一下子多了、亮了，一阵一阵地呼吸；
     有月亮的话，月亮外面一圈淡淡的晕；海平线右边远远的一团光，一明一暗，像下面有什么在呼吸。
   · 流萤流金（8.5 秒起，突然）：从那团光开始，一圈涟漪似的荡开，整片海面亮起来——碎金顺着几道暗流淌过去，
     萤火从水面上一颗一颗升起来，明明灭灭；几缕丝带从海上飘起来，在天上、在列车前后慢慢舒展、翻转。
   · 海面隐去（16 秒起，十秒左右）：水的颜色、波纹、碎光一点点退掉，连列车、车站、灯塔的倒影也没了，海面下面只剩天——
     分不清哪里是海、哪里是天，列车像开在一条细细的轨道上、开在天上；水母还在，像在星星中间漂。
   · 鲲（24 秒起，一分钟上下）：从海平线下面那团光里浮上来（小、淡，压着海平线），越游越近、越游越高，从头顶过去，
     再往左边远处去。肚皮被下面的金光照亮，身体里的夜空更亮；光屑、雾痕、鱼群、落下去的光、往上升的光珠照旧。
   · 回来（最后十几秒）：海面慢慢回来，金光沉下去，丝带散开，星星退回平常的样子。之后海会来一封信。
   · 声音：静的时候很高、很轻的一层，像玻璃杯沿；金光荡开时一串细细的铃；海面隐去时一层很慢的和声；鲸歌照旧；海回来时几声往下走的铃。
   什么时候来：它是夜里的事之一（fns/nightch.js）——旅程里第一个夜（开出月见以后）就来，之后鲲、流星雨、满月和飞鱼、星河轮着来，
   四圈一次；时间停在「夜」的时候，二十来分钟一次。开发者 Dock 的「偶遇 · 鲲」、#kun（#whale 也跳到这里）随时能看。 */
const KUN_PRE = 24, KUN_SWIM = 58;                                            // 前奏多长；鲲自己游多久
ENCOUNTERS.kun = { name: '鲲', duration: KUN_PRE + KUN_SWIM + 10 };
NX.wake = 0;                                   // 倒影跟着晃多少（鲲从头顶过的时候）
NX.kunT = 200;                                 // 时间停在「夜」的时候：下一次鲲还要等多久
// 鲲之后的信（SKY_LETTERS.kun）登记在收集簿建卡之前：见 patches10b.py
const KUN = {
  on: false, seed: 1, cam0: 0, fish: [], motes: [], drops: [], rings: [], trails: [[], [], []], threads: [], done: {}, songs: 0, ringT: 0, dropT: 0, moteT: 0, trailT: 0, glow: 0, pose: null, beam: null,
  // 第八版：那一夜的前奏
  age: -1, kAge: -1, omen: 0, gold: 0, rib: 0, sky: 0, still: 0, hush: 0, lum: 0, swim: 0, cue: 0, ox: 0,
  stars: [], streams: [], gp: [], ff: [], ffN: 0, ffF: 0, ffT: 0, ribs: [], snap: null, snapKey: '', snapF: 1, snapN: 0
};

function beginKun() {
  KUN.on = true; KUN.seed = 101 + Math.floor(Math.random() * 1000);
  KUN.cam0 = S.camera; KUN.songs = 0; KUN.cue = 0; KUN.age = 0; KUN.kAge = -KUN_PRE;
  KUN.ringT = KUN.dropT = KUN.moteT = KUN.trailT = KUN.ffT = 0;
  KUN.motes.length = KUN.drops.length = KUN.rings.length = KUN.ff.length = 0; KUN.ffN = KUN.ffF = 0;
  for (const tr of KUN.trails) tr.length = 0;
  const rnd = mulberry32(KUN.seed);
  KUN.fish = [];
  const n = S.reduced ? 14 : S.portrait ? 26 : 40;
  for (let i = 0; i < n; i++) {
    // 鱼群绕着它的头和喉：局部坐标（身长 = 1），各自一个小小的圈
    const front = rnd() < .66;
    KUN.fish.push({ ox: front ? -.66 + rnd() * .3 : -.36 + rnd() * .5, oy: front ? -.04 + rnd() * .16 : .1 + rnd() * .12, r: .012 + rnd() * .04, ph: rnd() * TAU, sp: .5 + rnd() * .7, s: .6 + rnd() * .7 });
  }
  // 光珠一串一串地升：每一串在它身下的一个位置（占身长的几分之几）、从海上多远的地方起
  kunSkinTex();
  KUN.threads = [];
  const nt = S.reduced ? 3 : 7;
  for (let i = 0; i < nt; i++) KUN.threads.push({ f: -.36 + i * (.72 / (nt - 1)) + (rnd() - .5) * .06, k: .08 + rnd() * .55, t: rnd() * .4 });
  kunPrelude(rnd);
}
// 前奏要用的东西：多出来的星、海上的几道暗流和碎金、几缕丝带（每一次都重新撒一遍）
function kunPrelude(rnd) {
  const { W, yM } = S, k = S.reduced ? .3 : S.portrait ? .55 : 1;
  KUN.ox = W * (S.portrait ? .8 : .84);                                    // 海平线右边那团光：也是鲲浮上来的地方
  KUN.stars = [];
  for (let i = 0, n = Math.round(280 * k); i < n; i++) {
    const c = rnd();
    KUN.stars.push({ x: rnd() * W, y: yM * Math.pow(rnd(), 1.3) * .96, s: .55 + Math.pow(rnd(), 2.2) * 1.7, ph: rnd() * TAU, sp: .5 + rnd() * 1.8, c: c < .76 ? 0 : c < .9 ? 1 : 2, big: rnd() < .02 });
  }
  // 暗流：[离海平线多远（0 海平线 … 1 最近处）, 弯多少, 一屏里弯几道]
  KUN.streams = [[.06, .022, 2], [.16, .04, 2], [.3, .06, 1], [.5, .08, 1], [.74, .1, 1]].map(([k0, amp, f]) => ({ k: k0, amp, f, ph: rnd() * TAU, ph2: rnd() * TAU, w: .08 + rnd() * .12, sp: .01 + rnd() * .012 }));
  KUN.gp = [];
  for (let i = 0, n = Math.round(820 * k); i < n; i++) {
    const si = Math.min(4, Math.floor(rnd() * 5)), c = rnd(), tight = rnd() < .62;          // 多数贴着暗流走，少数散在两边
    KUN.gp.push({ si, bx: rnd(), dk: (rnd() - .5) * (tight ? .006 + KUN.streams[si].k * .025 : .02 + KUN.streams[si].k * .12), sp: .5 + rnd(), len: .5 + rnd(), ph: rnd() * TAU, tw: .8 + rnd() * 2.6, c: c < .55 ? 0 : c < .85 ? 1 : 2 });
  }
  // 丝带：layer 0 在鲲后面，1 在鲲前面、列车后面，2 在列车前面；cy 是 yM（layer 2 是整个画面）的几分之几
  const R = (layer, cx, cy, span, wid, amp, tilt, cA, cB, born, al) => ({ layer, cx, cy, span, wid, amp, tilt, cA, cB, born, al, vx: (rnd() - .5) * .006, f1: .55 + rnd() * .5, w1: .03 + rnd() * .04, p1: rnd() * TAU, f2: 1.3 + rnd() * .9, w2: .02 + rnd() * .03, p2: rnd() * TAU, tf: 1.3 + rnd() * 1.1, tw: .05 + rnd() * .06, tp: rnd() * TAU, rv: 0 });
  const all = [
    R(0, .4, .26, 1.1, .013, .055, .06, [182, 170, 255], [150, 206, 255], 10.6, .85),
    R(0, .62, .5, .9, .015, .045, -.1, [255, 168, 198], [255, 214, 160], 11.5, .9),
    R(1, .48, .78, .85, .018, .04, .05, [255, 206, 132], [255, 172, 142], 12.3, 1),
    R(2, .42, .87, 1.25, .024, .05, -.04, [255, 222, 150], [168, 240, 222], 13.1, .65),
    R(2, .66, .6, .62, .011, .03, .12, [230, 234, 255], [255, 192, 212], 14.0, .85)
  ];
  KUN.ribs = S.reduced ? [all[2], all[3]] : S.portrait ? [all[0], all[2], all[3]] : all;
}
// 第 st 道暗流在 u（随海一起走的横坐标，一圈是 1）处离海平线多远
const kunStreamK = (st, u, t) => st.k + st.amp * (Math.sin(TAU * u * st.f + t * st.w + st.ph) * .75 + Math.sin(TAU * u * (st.f + 2) - t * st.w * .7 + st.ph2) * .25);
// 一个值慢慢跟上目标：往上用 up 秒、往下用 down 秒（时间常数）
const kunEase = (v, target, up, down, dt) => lerp(v, target, 1 - Math.exp(-dt / (target > v ? up : down)));
// 夜里的颜色：背是夜，肚皮被下面的金光照着
function kunPalette() {
  const n = S.nightF * (1 - S.dayF);
  return {
    sh: mix(seasonCol(Q => Q.cl.dusk[0]), [30, 36, 92], .8 * n),
    lit: mix(seasonCol(Q => Q.cl.dusk[1]), [255, 186, 104], .7 * n),
    hi: mix(seasonCol(Q => Q.cl.dusk[2]), [255, 230, 178], .7 * n)
  };
}
// 它此刻在哪儿（kAge：鲲自己游了多久）：x, y（身子正中，屏幕坐标）、身长 L、看得见多少 a、离得多远 haze、走到了哪 u（0..1）、多近 near
function kunPose(kAge) {
  const { W, yM, ref } = S, dur = KUN_SWIM;
  const u = clamp((kAge - 1) / (dur - 4), 0, 1);
  const near = Math.pow(Math.sin(Math.PI * u), 1.3);                  // 中间最近
  const Lmax = Math.max(W * .95, ref * 1.3);
  const L = Lmax * (.2 + .8 * near);
  // 从海平线下面那团光里浮上来（先压着海平线，半个身子还在下面），一边变大一边往左上来，正中间离得最近，然后加快往左边远处去
  const x = (KUN.ox || W * .85) + W * (-.3 * u - .85 * u * u + .1 * u * u * u) + (S.camera - KUN.cam0) * ref * .012;
  const rise = smooth(kAge / 10);
  const y = yM * (.74 - .47 * near) + (1 - rise) * yM * .26 + Math.sin(kAge * .23) * ref * .006;
  const vis = smooth(kAge / 5) * smooth((dur - kAge) / 5) * KUN.swim;
  return { x, y, L, a: vis, haze: .7 - .6 * near, u, near };
}
function updateKun(dt) {
  const a = NX.active, on = !!(a && a.kind === 'kun'), { ref, W, H, yM } = S, depth = H - yM;
  const age = on ? a.age : -1, left = on ? a.duration - a.age : 0;
  KUN.age = age;
  // 前奏的几样东西：各自慢慢来、慢慢走（被叫停的时候也是慢慢收，不会一下子跳掉）
  KUN.omen = kunEase(KUN.omen, on && left > 6 ? 1 : 0, 2.2, 2.6, dt);
  KUN.gold = kunEase(KUN.gold, on && age > 8.5 && left > 11 ? 1 : 0, .45, 2.8, dt);
  KUN.rib = kunEase(KUN.rib, on && age > 10.5 && left > 12 ? 1 : 0, 1.4, 2.6, dt);
  KUN.sky = kunEase(KUN.sky, on && age > 16 && left > 16 ? 1 : 0, 2.6, 2.6, dt);
  KUN.swim = kunEase(KUN.swim, on && !a.closing ? 1 : 0, .8, 1.4, dt);
  KUN.still = Math.max(KUN.omen, KUN.sky); KUN.hush = Math.max(KUN.omen * .65, KUN.sky); KUN.lum = .25 + .75 * KUN.gold;
  for (const R of KUN.ribs) {
    if (on) R.rv = smooth((age - R.born) / 3.4);                       // 丝带一点点舒展开
    R.cx += R.vx * dt; if (R.cx > 1.45) R.cx -= 1.9; else if (R.cx < -.45) R.cx += 1.9;
  }
  if (on && !a.closing) {
    if (age > 1 && age < 8.4 && Math.floor((age - dt) / 3.8) !== Math.floor(age / 3.8)) KUN.rings.push({ x: KUN.ox, k: .015, age: 0, life: 3.6, s: 2.6, pulse: 1 });   // 那团光呼一下，海平线上荡开一圈
    if (KUN.cue === 0 && age > 1) { KUN.cue = 1; kunShimmer(); }
    if (KUN.cue === 1 && age > 8.5) { KUN.cue = 2; kunBloom(); say('海面上，流萤流金。', 4200); }
    if (KUN.cue === 2 && age > 17) { KUN.cue = 3; kunPad(); say('海面隐去了，列车像开在天上。', 4800); }
    if (KUN.cue === 3 && age > KUN_PRE + 2.5) { KUN.cue = 4; say('有什么，从海平线下面浮上来了。', 4800); }
    if (KUN.cue === 4 && left < 16) { KUN.cue = 5; kunReturn(); }
  }
  // 萤火：近处的从水面上升起来（画在列车前面），远处的从海平线上升起来（在列车后面，倒影里也有）
  const capN = S.reduced ? 16 : S.portrait ? 38 : 64, capF = S.reduced ? 8 : S.portrait ? 22 : 36;
  KUN.ffT -= dt * KUN.gold;
  while (on && KUN.ffT <= 0 && KUN.gold > .2 && left > 10 && (KUN.ffN < capN || KUN.ffF < capF)) {
    KUN.ffT += .045 + Math.random() * .07;
    const far = KUN.ffF < capF && (KUN.ffN >= capN || Math.random() < .38);
    if (far) { KUN.ffF++; KUN.ff.push({ far: true, x: Math.random() * W, y: yM - ref * (.002 + Math.random() * .01), k: 0, vx: ref * (Math.random() - .5) * .012, vy: -ref * (.01 + Math.random() * .016), age: 0, life: 6 + Math.random() * 6, ph: Math.random() * TAU, per: 1.2 + Math.random() * 1.6, s: .45 + Math.random() * .45, c: Math.random() < .65 ? 0 : 1 }); }
    else { const k = Math.pow(Math.random(), .85); KUN.ffN++; KUN.ff.push({ far: false, x: Math.random() * W, y: yM + depth * (.04 + .92 * k), k, vx: ref * (Math.random() - .5) * .02, vy: -ref * (.012 + .03 * k) * (.6 + Math.random() * .8), age: 0, life: 5 + Math.random() * 5, ph: Math.random() * TAU, per: 1.1 + Math.random() * 1.5, s: .6 + k * 1.3, c: Math.random() < .6 ? 0 : 1 }); }
  }
  for (let i = KUN.ff.length - 1; i >= 0; i--) {
    const f = KUN.ff[i]; f.age += dt;
    f.x += f.vx * dt + Math.sin(f.age * 1.3 + f.ph) * ref * .006 * dt + S.cameraV * ref * (f.far ? .02 : .05 + .5 * f.k) * dt;
    f.y += f.vy * dt; f.vy *= Math.exp(-dt * .04);
    if (f.age > f.life || f.y < -ref * .05 || f.x < -ref * .12 || f.x > W + ref * .12) { if (f.far) KUN.ffF--; else KUN.ffN--; KUN.ff.splice(i, 1); }
  }
  // 鲲自己：前奏过了才浮上来
  const kAge = on ? age - KUN_PRE : 999; KUN.kAge = kAge;
  KUN.glow = lerp(KUN.glow, on && kAge > 0 ? smooth(kAge / 8) * smooth((KUN_SWIM - kAge) / 10) * KUN.swim : 0, 1 - Math.exp(-dt * 1.2));
  NX.wake *= Math.exp(-dt * .6);
  const P = on && kAge > 0 && kAge < KUN_SWIM + 1 ? kunPose(kAge) : null;
  KUN.pose = P && P.a > .002 ? P : null;
  if (!on && !KUN.pose) {
    const quiet = KUN.omen + KUN.gold + KUN.rib + KUN.sky < .004;
    if (quiet && !KUN.motes.length && !KUN.drops.length && !KUN.rings.length && !KUN.ff.length && !KUN.trails.some(tr => tr.length)) { KUN.on = false; return; }
  }
  if (KUN.pose) {
    // 鲸歌：远远的一声、又一声；从头顶过的时候一声更高的
    const calls = [6, 16, 25, 40];
    if (KUN.songs < calls.length && kAge > calls[KUN.songs]) { kunSong(KUN.songs === 2 ? 'high' : KUN.songs === 3 ? 'far' : 'low', clamp(P.x / W, 0, 1)); KUN.songs++; }
    const tips = kunTips(P, kAge);
    // 鳍尖、尾叶拖着光屑
    KUN.moteT -= dt;
    if (KUN.moteT <= 0 && KUN.motes.length < (S.reduced ? 40 : 150)) {
      KUN.moteT = .05 + Math.random() * .05;
      const tp = tips[Math.floor(Math.random() * tips.length)];
      KUN.motes.push({ x: tp[0] + (Math.random() - .5) * ref * .01, y: tp[1] + (Math.random() - .5) * ref * .01, vx: ref * (.01 + Math.random() * .02), vy: -ref * (.004 + Math.random() * .01), age: 0, life: 3 + Math.random() * 3, s: .5 + Math.random() * .9, c: Math.random() < .7 ? 0 : 1 });
    }
    // 雾痕：鳍尖和两片尾叶尖在湿的空气里划过去
    KUN.trailT -= dt;
    if (KUN.trailT <= 0) { KUN.trailT = .09; for (let j = 0; j < 3; j++) KUN.trails[j].push({ x: tips[j][0], y: tips[j][1], age: 0 }); }
    // 海的回应：它在头顶附近的时候
    const resp = smooth((P.near - .3) / .4) * P.a;
    NX.wake = Math.max(NX.wake, resp * .5 * (1 - KUN.sky));
    KUN.ringT -= dt * resp;
    if (KUN.ringT <= 0 && resp > .05) {
      KUN.ringT = .5 + Math.random() * .5;
      const k = .1 + Math.random() * .8, x = clamp(P.x + (Math.random() - .5) * P.L * .9, -ref * .1, W + ref * .1);
      KUN.rings.push({ x, k, age: 0, life: 3.2 + Math.random() * 1.6, s: .6 + k * .9 });
    }
    const cap = S.reduced ? 70 : 260;
    KUN.dropT -= dt * resp;
    while (KUN.dropT <= 0 && resp > .05 && KUN.drops.length < cap) {
      KUN.dropT += .03 + Math.random() * .04;
      const k = Math.pow(Math.random(), .8), x = P.x + (Math.random() - .5) * P.L * 1.1;
      if (x < -ref * .05 || x > W + ref * .05) continue;
      KUN.drops.push({ x, y: yM + depth * (.04 + k * .9), k, vy: -ref * (.01 + Math.random() * .025), age: 0, life: 4 + Math.random() * 3, s: .5 + k * 1.1, ph: Math.random() * TAU, c: Math.random() < .6 ? 0 : 1, sway: 1 });
    }
    // 一串一串的光珠：从海上同一个地方接连升起来
    for (const th of KUN.threads) {
      th.t -= dt * resp;
      if (th.t > 0 || resp < .12 || KUN.drops.length >= cap) continue;
      th.t = .2 + Math.random() * .14;
      const x = P.x + th.f * P.L;
      if (x < -ref * .03 || x > W + ref * .03) continue;
      KUN.drops.push({ x, y: yM + depth * th.k, k: th.k, vy: -ref * .03, age: 0, life: 6, s: .7 + th.k * .8, ph: Math.random() * TAU, c: Math.random() < .5 ? 0 : 1, sway: .25 });
    }
  }
  for (let i = KUN.motes.length - 1; i >= 0; i--) {
    const m = KUN.motes[i]; m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= Math.exp(-dt * .4);
    if (m.age > m.life) KUN.motes.splice(i, 1);
  }
  const bellyY = P ? P.y + P.L * .07 : -1e9;
  for (let i = KUN.drops.length - 1; i >= 0; i--) {
    const d = KUN.drops[i]; d.age += dt; d.vy -= ref * (.012 + .01 * d.k) * dt; d.y += d.vy * dt; d.x += Math.sin(d.age * 1.7 + d.ph) * ref * .006 * d.sway * dt;
    if (d.age > d.life || d.y < -ref * .05 || d.y < bellyY) KUN.drops.splice(i, 1);
  }
  for (let i = KUN.rings.length - 1; i >= 0; i--) { const r = KUN.rings[i]; r.age += dt; if (r.age > r.life) KUN.rings.splice(i, 1); }
  for (const tr of KUN.trails) {
    for (const q of tr) { q.age += dt; q.x += ref * .01 * dt; q.y -= ref * .002 * dt; }
    while (tr.length && tr[0].age > 2.2) tr.shift();
  }
}
// 胸鳍尖、上下尾叶尖（屏幕坐标）：拖雾痕、光屑用
function kunTips(P, age) {
  const fin = kunFin(age), tail = kunFluke(age), c = Math.cos(fin), s = Math.sin(fin), len = KUN_FIN, ty = .016;
  const pts = [[-.22 + c * len - s * ty, .062 + s * len + c * ty], [.548, -.088 + tail * 1.1], [.548, .088 + tail * 1.1], [-.18 + Math.cos(fin - .3) * .22, .045 + Math.sin(fin - .3) * .22]];
  return pts.map(([lx, ly]) => [P.x + lx * P.L, P.y + ly * P.L]);
}
const kunFin = age => .27 + .12 * Math.sin(age * TAU / 7.4);              // 胸鳍往后下方张开的角度（像翅膀那样慢慢扇）
const KUN_FIN = .225;                                                        // 胸鳍多长（身长的几分之几）
const kunFluke = age => .03 * Math.sin(age * TAU / 6.2 + 1.1);             // 尾叶上下摆

/* 光柱的贴图：上窄下宽、两边柔、往下渐淡（只做一次） */
function kunBeamSprite() {
  if (KUN.beam) return KUN.beam;
  const w = 48, h = 192, c = mkCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  for (let j = 0; j < h; j++) {
    const v = j / (h - 1), half = .1 + .9 * v, along = Math.pow(1 - v, .7) * smooth(v / .05);
    for (let i = 0; i < w; i++) {
      const u = (i / (w - 1) - .5) * 2 / half, k = (j * w + i) * 4;
      d[k] = 255; d[k + 1] = 238; d[k + 2] = 214; d[k + 3] = Math.round(255 * Math.exp(-u * u * 2.6) * along);
    }
  }
  x.putImageData(im, 0, 0);
  return KUN.beam = c;
}

/* 画在世界里、在星星之上、月亮之下：多出来的星、月晕、海平线上那团呼吸的光、远处的萤火、鲲后面的丝带 */
function drawKunSkyBack(g) {
  if (!KUN.on) return;
  const { W, yM, ref, t } = S, om = KUN.omen * (1 - S.dayF);
  if (om > .01 && KUN.stars.length) {
    // 星一下子多了、亮了，一阵一阵地呼吸：一道很慢的波，从右往左走过去
    const cols = [[236, 240, 255], [255, 236, 200], [200, 222, 255]], b = kunBuckets(3, 6), big = [];
    for (const s of KUN.stars) {
      const fade = 1 - .55 * s.y / yM, breathe = .68 + .32 * Math.sin(t * .9 + s.x / W * 5.5), tw = .55 + .45 * Math.sin(t * s.sp + s.ph);
      const al = om * fade * breathe * tw;
      if (al < .03) continue;
      b.at(s.c, al).rect(s.x - s.s * .5, s.y - s.s * .5, s.s, s.s);
      if (s.big) big.push([s.x, s.y, al, s.c]);
    }
    b.fill(g, cols, 1);
    if (big.length) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineWidth = Math.max(.6, ref * .0009);
      for (const [x, y, al, c] of big) {
        const l = ref * (.007 + .006 * al);
        g.strokeStyle = css(cols[c], .5 * al);
        g.beginPath(); g.moveTo(x - l, y); g.lineTo(x + l, y); g.moveTo(x, y - l); g.lineTo(x, y + l); g.stroke();
        glow(g, glowSpr, x, y, ref * .02, ref * .02, .25 * al);
      }
      g.restore();
    }
  }
  // 有月亮的话：外面一圈淡淡的晕（里面暖一点，外面冷一点）
  if (om > .02 && SKY2.moonA > .2 && SKY2.moonY < yM) {
    const x = SKY2.moonX, y = SKY2.moonY, al = om * SKY2.moonA;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = css([255, 226, 190], .07 * al); g.lineWidth = ref * .007; g.beginPath(); g.arc(x, y, ref * .15, 0, TAU); g.stroke();
    g.strokeStyle = css([190, 210, 255], .05 * al); g.lineWidth = ref * .004; g.beginPath(); g.arc(x, y, ref * .162, 0, TAU); g.stroke();
    g.restore();
  }
  kunFireflies(g, true);
  for (const R of KUN.ribs) if (R.layer === 0) kunRibbon(g, R, KUN.rib * R.al, t);
}
/* 海平线右边远远的一团光（画在远山前面）：一明一暗，像下面有什么在呼吸；金光荡开时它最亮，鲲浮上来以后慢慢收起来 */
function drawKunHorizon(g) {
  if (!KUN.on) return;
  const { yM, ref } = S, om = KUN.omen * (1 - S.dayF);
  const P = KUN.pose, pa = om * (1 - (P ? smooth(P.near / .35) : 0) * .85);
  if (pa > .01) {
    const ph = .5 - .5 * Math.cos(TAU * Math.max(0, KUN.age) / 3.8), k = .35 + .65 * ph, grow = .6 + .4 * KUN.gold;
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(KUN.ox, yM - ref * .006); g.scale(1, .4);
    const R0 = ref * (.5 + .25 * KUN.gold) * grow, hg = g.createRadialGradient(0, 0, 0, 0, 0, R0);
    hg.addColorStop(0, css([255, 212, 142], .6 * pa * k)); hg.addColorStop(.3, css([255, 182, 112], .26 * pa * k)); hg.addColorStop(1, css([255, 160, 100], 0));
    g.fillStyle = hg; g.fillRect(-R0, -R0, R0 * 2, R0 * 2);
    g.restore();
    glow(g, glowSpr, KUN.ox, yM, ref * .12, ref * .035, .7 * pa * k);
  }
}

/* 画在世界里（天上）：雾痕、晕、落下去的光、它自己、鱼群、光屑；最后是鲲前面、列车后面的那缕丝带 */
function drawKun(g) {
  if (!KUN.on) return;
  const P = KUN.pose, { ref, t, yM } = S;
  const dusk = Math.max((1 - S.nightF * .7) * (1 - S.dayF), KUN.lum * (1 - S.dayF));
  const { sh, lit, hi } = kunPalette();
  // 雾痕：越旧越宽、越淡
  if (KUN.trails.some(tr => tr.length)) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const NL = 8, paths = [];
    for (const tr of KUN.trails) for (let i = 1; i < tr.length; i++) {
      const q0 = tr[i - 1], q1 = tr[i], l = Math.min(NL - 1, Math.floor(q1.age / 2.2 * NL));
      if (q1.age < .25) continue;
      const pa = paths[l] || (paths[l] = new Path2D()); pa.moveTo(q0.x, q0.y); pa.lineTo(q1.x, q1.y);
    }
    const tc = mix(hi, [255, 255, 255], .3);
    paths.forEach((pa, l) => { if (!pa) return; const k = (l + .5) / NL, al = (1 - k) * (1 - k) * .07 * dusk; g.strokeStyle = css(tc, al); g.lineWidth = Math.max(1.5, ref * (.006 + k * .03)); g.stroke(pa); });
    g.restore();
  }
  if (P && P.a > .003) {
    const age = KUN.kAge, L = P.L, A = P.a;
    g.save(); g.globalCompositeOperation = 'lighter';
    // 身后的一圈晕（扁的，跟着身子）
    g.save(); g.translate(P.x + L * .02, P.y); g.scale(1, .5);
    const hr = L * .6 * (1 - .38 * P.near);                                   // 近了晕收紧一点（也省得每帧铺一大片）
    const halo = g.createRadialGradient(0, 0, L * .04, 0, 0, hr);
    halo.addColorStop(0, css(hi, .17 * A * dusk)); halo.addColorStop(.45, css(lit, .075 * A * dusk)); halo.addColorStop(1, css(lit, 0));
    g.fillStyle = halo; g.fillRect(-hr, -hr, hr * 2, hr * 2);
    g.restore();
    // 光：从它肚子下面落到远处的海上
    const beamA = smooth((P.near - .4) / .35) * A * dusk * KUN.glow;
    if (beamA > .01 && yM - P.y > L * .1) {
      const spr = kunBeamSprite();
      for (let i = 0; i < 4; i++) {
        const lx = -.28 + i * .19 + .03 * Math.sin(t * .17 + i * 1.3), bx = P.x + lx * L, by = P.y + .06 * L, len = yM - by + ref * .01;
        const wb = L * (.11 + .05 * ((i * 7) % 3) / 2), ba = beamA * (.55 + .45 * Math.sin(t * (.27 + i * .06) + i * 2.1)) * .4;
        g.save(); g.globalAlpha = ba; g.translate(bx, by); g.rotate(-.12 - .03 * i + .015 * Math.sin(t * .13 + i));
        g.drawImage(spr, -wb / 2, 0, wb, len / Math.cos(.15)); g.restore();
      }
    }
    g.restore();
    g.save(); g.globalAlpha = A;
    g.translate(P.x, P.y); g.scale(L, L);
    hitAt(g, 'kun', -.5, -.1, 1.06, .3);
    kunBody(g, age, P, sh, lit, hi, dusk);
    g.restore();
    // 鱼群：小小的一群，衬出它有多大
    kunFishSchool(g, P, age, dusk, sh, hi);
  }
  // 光屑：鳍尖和尾叶上拖下来的
  if (KUN.motes.length) {
    const cols = [[255, 232, 196], [196, 232, 255]], core = kunBuckets(2), halo = kunBuckets(2);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const m of KUN.motes) {
      const k = m.age / m.life, al = smooth(m.age / .4) * (1 - k) * .75 * dusk, r = Math.max(.6, ref * .0022 * m.s * (1 - k * .4));
      if (al < .01) continue;
      const pc = core.at(m.c, al); pc.moveTo(m.x + r, m.y); pc.arc(m.x, m.y, r, 0, TAU);
      if (m.s > 1.1) { const ph = halo.at(m.c, al), R2 = r * 3; ph.moveTo(m.x + R2, m.y); ph.arc(m.x, m.y, R2, 0, TAU); }
    }
    halo.fill(g, cols, .08); core.fill(g, cols, 1);
    g.restore();
  }
  for (const R of KUN.ribs) if (R.layer === 1) kunRibbon(g, R, KUN.rib * R.al, t);
}
/* 身子的轮廓（局部坐标：身长 1，吻在 x = -0.5，尾叶尖在 x ≈ 0.55，y 向下） */
function kunBodyPath(tl) {
  const b = new Path2D();
  b.moveTo(-.5, .006);
  b.bezierCurveTo(-.503, -.014, -.488, -.034, -.455, -.046);              // 吻、额
  b.bezierCurveTo(-.4, -.064, -.3, -.074, -.2, -.078);                    // 头顶
  b.bezierCurveTo(-.1, -.084, 0, -.084, .08, -.077);                       // 背最高处
  b.bezierCurveTo(.115, -.073, .135, -.07, .15, -.068);
  b.quadraticCurveTo(.172, -.088, .196, -.086);                            // 背鳍：小小的一个驼峰
  b.quadraticCurveTo(.192, -.07, .21, -.06);
  b.bezierCurveTo(.27, -.048, .35, -.026, .425, -.013 + tl * .3);          // 尾柄
  b.bezierCurveTo(.46, -.03 + tl * .8, .5, -.062 + tl, .548, -.088 + tl * 1.1);   // 上尾叶外缘
  b.bezierCurveTo(.54, -.06 + tl, .528, -.03 + tl, .515, tl * .95);               // 上尾叶后缘到缺口
  b.bezierCurveTo(.528, .03 + tl, .54, .06 + tl, .548, .088 + tl * 1.1);          // 下尾叶后缘
  b.bezierCurveTo(.5, .062 + tl, .46, .03 + tl * .8, .425, .013 + tl * .3);       // 下尾叶外缘
  b.bezierCurveTo(.34, .03, .22, .056, .08, .073);                          // 肚子
  b.bezierCurveTo(-.05, .09, -.2, .094, -.3, .085);
  b.bezierCurveTo(-.4, .075, -.47, .045, -.495, .022);                      // 喉、下颌
  b.closePath();
  return b;
}
function kunBody(g, age, P, sh, lit, hi, dusk) {
  const hz = P.haze, fin = kunFin(age), tl = kunFluke(age), lw = 1 / P.L, px = Math.max(1, S.ref * .0014) * lw, t = S.t;
  const fog = mix(sh, lit, .22), H = c => mix(c, fog, hz);                  // 越远，霞色盖上去越多
  const deep = [10, 12, 34];
  const top = H(mix(deep, sh, .2)), core = H(mix(deep, sh, .06)), mid = H(mix(mix(deep, sh, .16), lit, .08)), belly = H(mix(mix([60, 38, 70], lit, .26), sh, .05));
  const near = 1 - hz * .75, dl = dusk * near;
  const tex = kunSkinTex(), sky = (.55 + .45 * dusk) * near;
  // 远的那片胸鳍：从身子后面露出一截，更暗、更淡
  g.save(); g.translate(-.18, .045); g.rotate(fin - .3);
  g.fillStyle = css(H(mix(core, sh, .22))); kunFinPath(g, KUN_FIN * .82); g.fill();
  g.restore();
  // 身子：背深、肚皮暖
  const body = kunBodyPath(tl);
  const gr = g.createLinearGradient(0, -.085, 0, .095);
  gr.addColorStop(0, css(top)); gr.addColorStop(.3, css(core)); gr.addColorStop(.62, css(mid)); gr.addColorStop(1, css(belly));
  g.fillStyle = gr; g.fill(body);
  g.save(); g.clip(body);
  // 身体里的夜空：星云、尘带、很多很淡的星（一张贴图，叠加上去）
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = sky * .9; g.drawImage(tex, -.52, -.1, 1.1, .2); g.restore();
  // 肚皮那一片（反荫蔽）：靠太阳那边（右、尾）更暖
  const bp = new Path2D();
  bp.moveTo(-.52, .004); bp.bezierCurveTo(-.4, .03, -.25, .034, -.1, .04); bp.bezierCurveTo(.05, .044, .25, .032, .44, .008 + tl * .3); bp.lineTo(.44, .2); bp.lineTo(-.52, .2); bp.closePath();
  const bv = g.createLinearGradient(0, .022, 0, .08);
  bv.addColorStop(0, css(belly, 0)); bv.addColorStop(.6, css(belly, .75)); bv.addColorStop(1, css(belly, .92));
  g.fillStyle = bv; g.fill(bp);
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(.32, .085); g.scale(1, .22);
  const bw = g.createRadialGradient(0, 0, 0, 0, 0, .5);
  bw.addColorStop(0, css(lit, .26 * dl)); bw.addColorStop(.5, css(lit, .09 * dl)); bw.addColorStop(1, css(lit, 0));
  g.fillStyle = bw; g.fillRect(-.5, -.5, 1, 1); g.restore();
  // 喉褶：一道亮一道暗，沿着肚子往后
  g.lineCap = 'round';
  {
    const pl = [new Path2D(), new Path2D()];
    for (let k = 0; k <= 10; k++) { const q = pl[k % 2]; q.moveTo(-.47 + k * .003, .02 + k * .0045); q.bezierCurveTo(-.38, .045 + k * .0042, -.22, .062 + k * .0028, -.02 - k * .004, .05 + k * .003); }
    g.strokeStyle = css(H(mix(belly, hi, .35)), .12 * near); g.lineWidth = px * .8; g.stroke(pl[0]);
    g.strokeStyle = css(H(mix(belly, deep, .45)), .14 * near); g.lineWidth = px * 1.1; g.stroke(pl[1]);
  }
  // 背上的斑和旧伤：很淡
  const rnd = mulberry32(KUN.seed);
  {
    const sp = [new Path2D(), new Path2D()];
    for (let i = 0; i < 40; i++) {
      const x = -.44 + rnd() * .82, y = -.07 + rnd() * .06 + Math.abs(x) * .03, light = rnd() < .65; rnd();
      const rx = .003 + rnd() * .009, ry = .0016 + rnd() * .004, rot = rnd() * .6 - .3, q = sp[light ? 0 : 1];
      q.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); q.ellipse(x, y, rx, ry, rot, 0, TAU);
    }
    g.fillStyle = css(H(mix(top, hi, .3)), .095 * near); g.fill(sp[0]);
    g.fillStyle = css(H(mix(top, deep, .6)), .12 * near); g.fill(sp[1]);
    const sc = new Path2D();
    for (let i = 0; i < 7; i++) { const x = -.36 + rnd() * .62, y = -.055 + rnd() * .05, l = .015 + rnd() * .03; sc.moveTo(x, y); sc.quadraticCurveTo(x + l * .5, y - .004 + rnd() * .008, x + l, y + rnd() * .006 - .003); }
    g.strokeStyle = css(H(mix(top, hi, .45)), .14 * near); g.lineWidth = px * .9; g.stroke(sc);
  }
  // 吻上一排小疙瘩、下巴上几簇藤壶
  const knobs = [[-.489, -.011], [-.479, -.022], [-.467, -.031], [-.453, -.039], [-.437, -.046], [-.419, -.052], [-.399, -.057], [-.49, .019], [-.477, .029], [-.462, .037]];
  {
    const kd = new Path2D(), kl = new Path2D(), ba = new Path2D();
    for (const [x, y] of knobs) { kd.moveTo(x + .0039, y + .0012); kd.arc(x + .0008, y + .0012, .0031, 0, TAU); kl.moveTo(x + .0026, y); kl.arc(x, y, .0026, 0, TAU); }
    g.fillStyle = css(H(mix(top, deep, .5)), .5); g.fill(kd);
    g.fillStyle = css(H(mix(top, hi, .32)), .55 * near); g.fill(kl);
    for (let i = 0; i < 46; i++) {
      const cl = i < 26 ? [-.47, .03] : [-.43, .052], x = cl[0] + (rnd() - .5) * .035, y = cl[1] + (rnd() - .5) * .018; rnd();
      const r = .0007 + rnd() * .0016; ba.moveTo(x + r, y); ba.arc(x, y, r, 0, TAU);
    }
    g.fillStyle = css(H(mix(belly, [236, 230, 222], .6)), .4 * near); g.fill(ba);
  }
  // 嘴线、眼
  g.strokeStyle = css(H(mix(top, deep, .6)), .55); g.lineWidth = px * 1.3;
  g.beginPath(); g.moveTo(-.498, .008); g.bezierCurveTo(-.46, .005, -.4, .012, -.345, .034); g.stroke();
  g.fillStyle = css(H(deep), .9); g.beginPath(); g.ellipse(-.322, .022, .0062, .0042, -.15, 0, TAU); g.fill();
  // 胸鳍根下面的一团影
  const ao = g.createRadialGradient(-.2, .066, 0, -.2, .066, .06);
  ao.addColorStop(0, css(H(deep), .32)); ao.addColorStop(1, css(H(deep), 0));
  g.fillStyle = ao; g.fillRect(-.27, .0, .14, .13);
  // 上半身一层冷的天光（看得出它是圆的）
  g.strokeStyle = css(H(mix(hi, [196, 212, 255], .6)), 1);
  for (const [w, al] of [[.024, .04], [.008, .05]]) {
    g.globalAlpha = al * near * (.4 + .6 * dusk); g.lineWidth = w;
    g.beginPath(); g.moveTo(-.45, -.028); g.bezierCurveTo(-.3, -.054, -.05, -.064, .15, -.051); g.bezierCurveTo(.25, -.042, .33, -.026, .4, -.016); g.stroke();
  }
  g.globalAlpha = 1;
  // 身体里很淡的一片夜空：星云、星点，明明灭灭
  g.globalCompositeOperation = 'lighter';
  const stars = (.35 + .65 * dusk) * (1 - hz * .8);
  for (const [x, y, r] of [[-.12, -.035, .13], [.17, -.025, .09]]) {
    const nb = g.createRadialGradient(x, y, 0, x, y, r);
    nb.addColorStop(0, css(mix(hi, [176, 160, 255], .55), .06 * stars)); nb.addColorStop(1, css(hi, 0));
    g.fillStyle = nb; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const r2 = mulberry32(KUN.seed + 7), sb = kunBuckets(2, 6);
  for (let i = 0; i < 34; i++) {
    const x = -.42 + r2() * .8, y = -.068 + r2() * .07 + Math.abs(x) * .02, tw = .5 + .5 * Math.sin(t * (.6 + r2() * 1.4) + r2() * TAU), c = r2() < .7 ? 0 : 1, r = (.0008 + r2() * .0012) * (.7 + .3 * tw);
    const q = sb.at(c, (.15 + .55 * tw)); q.moveTo(x + r, y); q.arc(x, y, r, 0, TAU);
  }
  sb.fill(g, [[255, 240, 214], [200, 226, 255]], stars);
  g.restore();
  // 轮廓上的光（叠加）：肚皮、尾叶一道暖金（太阳在右下），背上一线冷光，眼睛里一点暖光
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  const rim = new Path2D();
  rim.moveTo(-.482, .03); rim.bezierCurveTo(-.44, .062, -.36, .08, -.3, .085); rim.bezierCurveTo(-.2, .094, -.05, .09, .08, .073); rim.bezierCurveTo(.22, .056, .34, .03, .425, .013 + tl * .3);
  rim.bezierCurveTo(.46, .03 + tl * .8, .5, .062 + tl, .548, .088 + tl * 1.1);
  const rg = g.createLinearGradient(-.5, 0, .55, 0);
  rg.addColorStop(0, css(lit, .25 * dl)); rg.addColorStop(.6, css(mix(lit, hi, .4), .55 * dl)); rg.addColorStop(1, css(hi, .75 * dl));
  g.strokeStyle = rg;
  g.globalAlpha = .22; g.lineWidth = px * 6; g.stroke(rim);
  g.globalAlpha = 1; g.lineWidth = px * 1.5; g.stroke(rim);
  g.strokeStyle = css(hi, .6 * dl); g.lineWidth = px * 1.2;
  g.beginPath(); g.moveTo(.515, tl * .95); g.bezierCurveTo(.528, -.03 + tl, .54, -.06 + tl, .548, -.088 + tl * 1.1); g.stroke();
  g.strokeStyle = css(mix(hi, [190, 210, 255], .55), .3 * dl); g.lineWidth = px;
  g.beginPath(); g.moveTo(-.455, -.046); g.bezierCurveTo(-.4, -.064, -.3, -.074, -.2, -.078); g.bezierCurveTo(-.1, -.084, 0, -.084, .08, -.077); g.bezierCurveTo(.2, -.066, .33, -.03, .425, -.013 + tl * .3); g.stroke();
  const eg = g.createRadialGradient(-.322, .022, 0, -.322, .022, .022);
  eg.addColorStop(0, css(hi, .3 * dl)); eg.addColorStop(1, css(hi, 0));
  g.fillStyle = eg; g.fillRect(-.345, 0, .046, .045);
  g.fillStyle = css([255, 244, 220], .8 * dl); g.beginPath(); g.arc(-.3195, .0205, .0014, 0, TAU); g.fill();
  // 两条光带：从尾叶尖拖出去，慢慢地飘
  for (const sgn of [-1, 1]) {
    const x0 = .548, y0 = sgn * .088 + tl * 1.1, w1 = Math.sin(t * .7 + sgn) * .02, w2 = Math.sin(t * .5 + sgn * 2) * .03;
    const sg = g.createLinearGradient(x0, y0, x0 + .26, y0);
    sg.addColorStop(0, css(hi, .3 * dl)); sg.addColorStop(1, css(hi, 0));
    g.strokeStyle = sg; g.lineWidth = px * 1.4;
    g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + .08, y0 + sgn * .015 + w1, x0 + .16, y0 + sgn * .03 - w2, x0 + .26, y0 + sgn * .02 + w1 + w2); g.stroke();
  }
  g.restore();
  // 近的那片胸鳍：很长，前缘一排小凸起（座头鲸那样），后缘拖着一层会发光的薄纱
  g.save(); g.translate(-.22, .062); g.rotate(fin);
  const len = KUN_FIN;
  kunVeil(g, len, t, hi, lit, dl, px);
  const fg = g.createLinearGradient(0, -.02, 0, .04);
  fg.addColorStop(0, css(core)); fg.addColorStop(.55, css(mid)); fg.addColorStop(1, css(mix(mid, belly, .7)));
  g.fillStyle = fg; kunFinPath(g, len); g.fill();
  g.save(); g.clip();
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = sky * .75; g.drawImage(tex, 40, 10, 200, 48, 0, -.03, len, .075);
  g.restore();
  { const tb = new Path2D(); for (let i = 1; i <= 8; i++) { const k = i / 9.5, [x, y] = kunFinEdge(len, k, -1), r = .002 * (1 - k * .5); tb.moveTo(x + r, y + .0012); tb.arc(x, y + .0012, r, 0, TAU); } g.fillStyle = css(H(mix(top, hi, .4)), .5 * near); g.fill(tb); }
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = css(lit, .55 * dl); g.lineWidth = px * 1.3; g.lineCap = 'round';
  g.beginPath(); for (let i = 1; i <= 20; i++) { const [x, y] = kunFinEdge(len, i / 20 * .98, 1); i === 1 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  g.strokeStyle = css(mix(hi, [196, 214, 255], .5), .28 * dl); g.lineWidth = px;
  g.beginPath(); for (let i = 1; i <= 20; i++) { const [x, y] = kunFinEdge(len, i / 20 * .97, -1); i === 1 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  g.restore();
}
// 胸鳍：根部在原点，往 +x 伸、慢慢往下弯，越往尖越窄；前缘（side = -1）一排小凸起，后缘（side = 1）微微起伏
function kunFinEdge(len, k, side) {
  const cx = len * k, cy = .004 + .045 * k * k * (1.2 - .2 * k), w = .021 * Math.pow(1 - k, .55) * (1 - .25 * k) + .0015;
  const bump = side < 0 ? .0022 * Math.pow(Math.abs(Math.sin(k * Math.PI * 8)), 1.6) * (1 - k * .7) : .0015 * Math.sin(k * Math.PI * 3);
  const ny = 1, nx = -.17 * k;                                              // 弯过去以后，法线跟着转一点
  return [cx + nx * side * w, cy + ny * side * (w * (side < 0 ? 1 : 1.12) + bump)];
}
function kunFinPath(g, len) {
  g.beginPath();
  const n = 36;
  for (let i = 0; i <= n; i++) { const [x, y] = kunFinEdge(len, i / n, -1); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  for (let i = n; i >= 0; i--) { const [x, y] = kunFinEdge(len, i / n, 1); g.lineTo(x, y); }
  g.closePath();
}
// 身体里那片夜空的贴图（第一次见到它时算一次，铺满身子的外框 [-0.52, 0.58] × [-0.1, 0.1]）：
// 沿着身子一条斜斜的星云带，紫、蓝、玫瑰几种颜色；几道暗的尘带；几百颗很淡的星
const KUN_SKIN = { tex: null };
function kunSkinTex() {
  if (KUN_SKIN.tex) return KUN_SKIN.tex;
  const w = 640, h = 128, c = mkCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data, rnd = mulberry32(77);
  const grid = (mx, my) => {
    const a = new Float32Array((mx + 2) * (my + 2)); for (let i = 0; i < a.length; i++) a[i] = rnd();
    return (u, v) => { const X = u * mx, Y = v * my, i0 = Math.floor(X), j0 = Math.floor(Y), fx = smooth(X - i0), fy = smooth(Y - j0), at = (i, j) => a[j * (mx + 2) + i]; return lerp(lerp(at(i0, j0), at(i0 + 1, j0), fx), lerp(at(i0, j0 + 1), at(i0 + 1, j0 + 1), fx), fy); };
  };
  const o1 = [grid(9, 2), grid(18, 4), grid(36, 8), grid(72, 15)], o2 = [grid(6, 2), grid(13, 3)], o3 = [grid(14, 3), grid(30, 6)];
  const violet = [168, 118, 236], blue = [86, 150, 238], rose = [238, 128, 186];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const u = i / w, v = j / h;
    const f = o1[0](u, v) * .45 + o1[1](u, v) * .28 + o1[2](u, v) * .17 + o1[3](u, v) * .1;
    const hue = o2[0](u, v) * .65 + o2[1](u, v) * .35, lane = o3[0](u, v) * .6 + o3[1](u, v) * .4;
    const vc = .4 + .07 * Math.sin(u * TAU + 1) - .08 * u, band = Math.exp(-Math.pow((v - vc) / .19, 2));
    const dens = band * smooth((f - .34) / .42) * (1 - .75 * smooth((lane - .52) / .16));
    const col = hue < .5 ? mix(blue, violet, hue * 2) : mix(violet, rose, (hue - .5) * 2), k = (j * w + i) * 4;
    d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = Math.round(clamp(dens * 1.15, 0, 1) * 190);
  }
  x.putImageData(im, 0, 0);
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 520; i++) {
    const sx = rnd() * w, sy = h * (.1 + .8 * rnd()), b = Math.pow(rnd(), 3), r = .5 + b * 1.1;
    x.fillStyle = css(rnd() < .75 ? [255, 244, 226] : [206, 226, 255], .25 + .6 * b); x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fill();
  }
  return KUN_SKIN.tex = c;
}
// 鳍后缘的薄纱（叠加）：一层会飘的光，几道纱上的纹
function kunVeil(g, len, t, hi, lit, dl, px) {
  if (dl < .02) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const n = 9, edge = [], out = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, [x, y] = kunFinEdge(len, .08 + k * .88, 1);
    const wv = Math.sin(t * .9 - k * 3.2) * .012 + Math.sin(t * .53 + k * 5) * .006, d = .05 + .07 * Math.sin(Math.PI * (.2 + k * .8));
    edge.push([x, y]); out.push([x + d * .55, y + d + wv]);
  }
  const vg = g.createLinearGradient(0, .02, 0, .15);
  vg.addColorStop(0, css(hi, .11 * dl)); vg.addColorStop(.35, css(lit, .04 * dl)); vg.addColorStop(1, css(lit, 0));
  g.fillStyle = vg; g.beginPath(); g.moveTo(edge[0][0], edge[0][1]);
  for (const [x, y] of edge) g.lineTo(x, y);
  for (let i = out.length - 1; i >= 0; i--) g.lineTo(out[i][0], out[i][1]);
  g.closePath(); g.fill();
  g.strokeStyle = css(hi, .1 * dl); g.lineWidth = px * .8;
  for (let i = 1; i < n; i += 2) { g.beginPath(); g.moveTo(edge[i][0], edge[i][1]); g.lineTo(lerp(edge[i][0], out[i][0], .85), lerp(edge[i][1], out[i][1], .85)); g.stroke(); }
  g.restore();
}
function kunFishSchool(g, P, age, dusk, sh, hi) {
  const { ref } = S, L = P.L, sz = Math.max(1.6, ref * .0072 * (.5 + P.near * .6));
  const body = mix(mix([18, 22, 48], sh, .15), mix(sh, seasonCol(Q => Q.cl.dusk[1]), .22), P.haze * .8), glint = mix(hi, [255, 255, 255], .3);
  g.save(); g.globalAlpha = P.a * .9;
  const fp = new Path2D(), gb = kunBuckets(1, 5);
  for (const f of KUN.fish) {
    const ph = f.ph + age * f.sp, x = P.x + (f.ox + Math.cos(ph) * f.r * 1.6) * L, y = P.y + (f.oy + Math.sin(ph * 1.3) * f.r) * L;
    const s = sz * f.s, tail = Math.sin(age * 9 + f.ph) * .35;
    fp.moveTo(x - s, y); fp.quadraticCurveTo(x, y - s * .38, x + s * .7, y); fp.quadraticCurveTo(x, y + s * .38, x - s, y); fp.closePath();
    fp.moveTo(x + s * .62, y); fp.lineTo(x + s * 1.05, y - s * (.32 + tail * .3)); fp.lineTo(x + s * 1.05, y + s * (.32 - tail * .3)); fp.closePath();
    const gl = Math.max(0, Math.sin(ph * 2 + f.s * 7));
    if (dusk > .3 && gl > .6) gb.at(0, (gl - .6) * 2.5).rect(x - s * .45, y + s * .1, s * .9, Math.max(.6, s * .12));
  }
  g.fillStyle = css(body); g.fill(fp);
  gb.fill(g, [glint], dusk * (1 - P.haze * .6));
  g.restore();
}

/* 海面隐去：海成了一面完整的镜子（不晃、不着水色），盖住水色、波纹、碎光——镜子里只有天。
   海比天还深的时候，镜子照不到的那一截铺一层夜最深的颜色。揭卡时只照那一小块（和 drawReflection 一样的对法）。 */
// 世界画到天为止的那一刻拍一张（只拍镜子用得到的那几行）：高分屏上拍一半大小，隔一帧拍一次（天走得慢，看不出差一帧）
function kunSkySnap() {
  if (KUN.sky < .01) { if (KUN.snap && !KUN.on) KUN.snap = null; return; }
  const { H, yM } = S, dpr = RX ? RX.z : S.dpr, wy = RX ? RX.wy : 0, top = Math.max(wy, 2 * yM - H, 0), f = dpr >= 1.5 ? .5 : 1;
  const w = Math.ceil(world.width * f), h = Math.ceil(world.height * f), key = (RX ? 'rx' : 'main') + w + 'x' + h + ':' + top;
  if (!KUN.snap || KUN.snap.width !== w || KUN.snap.height !== h) { KUN.snap = mkCanvas(w, h); KUN.snapKey = ''; }
  KUN.snapF = f; KUN.snapN = (KUN.snapN || 0) + 1;
  if (!RX && key === KUN.snapKey && KUN.snapN % 2) return;
  KUN.snapKey = key;
  const sy = Math.max(0, Math.floor((top - wy) * dpr) - 2), sh = Math.min(world.height, Math.ceil((yM - wy) * dpr) + 1) - sy;
  if (sh <= 0) return;
  const g = KUN.snap.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true;
  g.drawImage(world, 0, sy, world.width, sh, 0, sy * f, w, sh * f); g.globalCompositeOperation = 'source-over';
}
function drawKunMirror() {
  const s = KUN.sky; if (s < .01) return;
  const { W, H, yM } = S, dpr = RX ? RX.z : S.dpr, wx = RX ? RX.wx : 0, wy = RX ? RX.wy : 0, ww = RX ? RX.ww : W;
  const src = KUN.snap || world, f = KUN.snap ? KUN.snapF : 1, top = Math.max(wy, 2 * yM - H, 0), al = s > .985 ? 1 : s * .97;
  ctx.save();
  if (2 * yM - top < H) { ctx.globalAlpha = al; ctx.fillStyle = css(mix(seaBot(), [8, 10, 30], .6)); ctx.fillRect(0, yM, W, H - yM); }
  ctx.globalAlpha = al;
  ctx.translate(0, yM * 2); ctx.scale(1, -1);
  if (yM - top > 1) ctx.drawImage(src, PAD * dpr * f, (top - wy) * dpr * f, ww * dpr * f, (yM - top) * dpr * f, wx, top, ww, yM - top);
  ctx.restore();
}

/* 海上（镜子之后）：星星中间的水母、鲲下面的光、亮环、往上升的光珠、流金、近处的萤火、列车前面的丝带 */
function drawKunSea() {
  if (!KUN.on) return;
  const { W, H, yM, ref, t } = S, depth = H - yM, P = KUN.pose;
  // 海面隐去的时候，水母像在星星中间漂（镜子盖住了第一遍，这里按镜子的浓淡再画一遍）
  if (KUN.sky > .015) { JELLY.mul = KUN.sky; drawJellies(); JELLY.mul = 1; }
  const dusk = Math.max((1 - S.nightF * .6) * (1 - S.dayF), KUN.lum * (1 - S.dayF));
  const { lit, hi } = kunPalette(), water = 1 - KUN.sky;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (P && P.a > .01) {
    const resp = smooth((P.near - .3) / .45) * P.a * KUN.glow * (1 - .6 * KUN.sky);
    if (resp > .01) {
      // 它正下方的海亮起来：一条从海平线铺过来的光路，近处散开
      const cx = clamp(P.x, -ref * .2, W + ref * .2);
      const gr = ctx.createLinearGradient(0, yM, 0, H);
      gr.addColorStop(0, css(hi, .156 * resp * dusk)); gr.addColorStop(.35, css(lit, .084 * resp * dusk)); gr.addColorStop(1, css(lit, .024 * resp * dusk));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(cx - P.L * .15, yM + 1); ctx.lineTo(cx + P.L * .15, yM + 1); ctx.lineTo(cx + P.L * .41, H); ctx.lineTo(cx - P.L * .41, H); ctx.closePath(); ctx.fill();
      glow(ctx, glowSpr, cx, yM + depth * .05, P.L * .9, depth * .22, .3 * resp * dusk);
      // 光路里的碎光：一闪一闪
      const rnd = mulberry32(KUN.seed + 31), bk = kunBuckets(2);
      for (let i = 0; i < 80; i++) {
        const k = Math.pow(rnd(), 1.4), y = yM + 2 + depth * k, half = lerp(P.L * .17, P.L * .45, k), x = cx + (rnd() * 2 - 1) * half;
        const tw = Math.max(0, Math.sin(t * (1.1 + rnd() * 2.2) + rnd() * TAU));
        const len = ref * (.004 + k * .018) * (.5 + rnd()), al = tw * tw * resp * (.25 + .5 * k) * dusk, c = rnd() < .5 ? 0 : 1;
        if (al < .02) continue;
        bk.at(c, al).rect(x - len / 2, y, len, Math.max(.6, ref * (.0008 + k * .0012)));
      }
      bk.fill(ctx, [hi, [255, 250, 236]], 1);
    }
  }
  // 一圈圈亮环：一道软的宽边，一道细的亮边（海面隐去了，环也就淡了）
  for (const r of KUN.rings) {
    const k = r.age / r.life, y = yM + depth * r.k, rx = ref * (.02 + .16 * Math.sqrt(k)) * r.s, ry = rx * (.07 + r.k * .2);
    const al = (1 - k) * smooth(r.age / .3) * .42 * (r.pulse ? .8 : dusk) * (1 - .75 * KUN.sky);
    if (al < .01) continue;
    ctx.strokeStyle = css(lit, al * .3); ctx.lineWidth = Math.max(2, ref * (.004 + r.k * .006) * (1 - k * .5));
    ctx.beginPath(); ctx.ellipse(r.x, y, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = css(hi, al); ctx.lineWidth = Math.max(.7, ref * (.001 + r.k * .0016) * (1 - k * .5));
    ctx.beginPath(); ctx.ellipse(r.x, y, rx, ry, 0, 0, TAU); ctx.stroke();
    if (k < .25) glow(ctx, glowSpr, r.x, y, rx * 2.2, ry * 4, al * .6);
  }
  // 一滴滴光往上升，越升越小，越过海平线，到它肚子底下就没了（按颜色、亮度分几档，每档一笔画完）
  if (KUN.drops.length) {
    const cols = [[255, 238, 206], [206, 236, 255]], bellyY = P ? P.y + P.L * .07 : -1e9;
    const core = kunBuckets(2), halo = kunBuckets(2), tail = kunBuckets(2);
    for (const d of KUN.drops) {
      const k = d.age / d.life, top = smooth((d.y - bellyY) / (ref * .08));
      const al = smooth(d.age / .5) * (1 - k) * (.5 + .4 * d.k) * dusk * top, r = Math.max(.7, ref * .0026 * d.s * (1 - k * .55));
      if (al < .01) continue;
      const pc = core.at(d.c, al); pc.moveTo(d.x + r * .8, d.y); pc.ellipse(d.x, d.y, r * .8, r * 1.3, 0, 0, TAU);
      if (d.s > .9) {
        const ph = halo.at(d.c, al), R2 = r * 2.6; ph.moveTo(d.x + R2, d.y); ph.arc(d.x, d.y, R2, 0, TAU);
        const pt = tail.at(d.c, al); pt.moveTo(d.x, d.y + r); pt.lineTo(d.x, d.y + r + Math.min(ref * .035, -d.vy * .14));
      }
    }
    halo.fill(ctx, cols, .1); core.fill(ctx, cols, 1);
    ctx.lineWidth = Math.max(.6, ref * .0014); tail.stroke(ctx, cols, .35);
  }
  ctx.restore();
  kunGold(ctx, water);
  kunFireflies(ctx, false);
  for (const R of KUN.ribs) if (R.layer === 2) kunRibbon(ctx, R, KUN.rib * R.al, t);
}

/* 流金：几道暗流上一层软软的金光，碎金顺着暗流淌过去（近大远小、近快远慢）；
   金光是从海平线右边那团光开始，一圈涟漪似的荡开的（kunArrive）。海面隐去以后，它们就像浮在天里的一条条光河。 */
function kunArrive(x, y, age) {
  if (age < 0 || age > 14) return 1;
  const d = Math.hypot((x - KUN.ox) / S.ref, (y - S.yM) / S.ref * 2.6);
  return smooth((age - 8.5 - d * .5) / .4);
}
function kunGold(g, water) {
  const { W, H, yM, ref, t } = S, depth = H - yM, span = W + ref * .3, age = KUN.age;
  // 金光荡开的那一下：从那团光开始，一圈亮的涟漪往近处扫过来（和 kunArrive 一样快）
  if (age > 8.5 && age < 11.2) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const lag of [0, .28]) {
      const tau = age - 8.5 - lag; if (tau <= 0) continue;
      const rx = tau * 2 * ref, ry = rx / 2.6, e = clamp(tau / 2.4, 0, 1);
      g.strokeStyle = css([255, 196, 104], .32 * (1 - e) * (lag ? .6 : 1)); g.lineWidth = Math.max(1.5, ref * .012 * (1 - e * .5));
      g.beginPath(); g.ellipse(KUN.ox, yM, rx, ry, 0, 0, Math.PI); g.stroke();
      g.strokeStyle = css([255, 224, 160], .55 * (1 - e) * (lag ? .6 : 1)); g.lineWidth = Math.max(.8, ref * .0016);
      g.beginPath(); g.ellipse(KUN.ox, yM, rx, ry, 0, 0, Math.PI); g.stroke();
    }
    g.restore();
  }
  const G0 = KUN.gold * (1 - S.dayF); if (G0 < .01 || !KUN.gp.length) return;
  const cols = [[255, 198, 100], [255, 228, 156], [255, 164, 72]], spr = glowSprOrange();
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  // 暗流：一道道金色的河，弯弯地流过去（宽的一层软光、窄的一层亮线；按荡开的先后分几档，一档一笔）
  const n = 36;
  for (const st of KUN.streams) {
    const par = S.camera * ref * (.05 + .5 * st.k) / span, bk = kunBuckets(1, 5);
    let px = 0, py = 0;
    for (let i = 0; i <= n; i++) {
      const xn = i / n, x = xn * span - ref * .15, y = yM + depth * kunStreamK(st, xn - par, t);
      if (i) {
        const arr = kunArrive((x + px) / 2, (y + py) / 2, age), fl = .55 + .45 * Math.sin(TAU * (xn * 2.2 - t * st.sp * 9) + st.ph);   // 亮的一段一段往前流
        if (arr > .02) { const q = bk.at(0, arr * fl); q.moveTo(px, py); q.lineTo(x, y); }
      }
      px = x; py = y;
    }
    g.lineWidth = depth * (.012 + .045 * st.k); bk.stroke(g, [cols[0]], .1 * G0);
    g.lineWidth = Math.max(.9, ref * (.0012 + .004 * st.k)); bk.stroke(g, [cols[1]], .42 * G0);
  }
  for (const st of KUN.streams) {
    const par = S.camera * ref * (.05 + .5 * st.k) / span;
    for (let j = 0; j < 5; j++) {
      const xn = mod(j / 5 - t * st.sp * .6 + par, 1), x = xn * span - ref * .15, y = yM + depth * kunStreamK(st, xn - par, t);
      glow(g, spr, x, y, W * (.18 + .22 * st.k), depth * (.025 + .07 * st.k), (.12 + .06 * water) * G0 * kunArrive(x, y, age));
    }
  }
  const b = kunBuckets(3, 7), hb = kunBuckets(3, 4);
  for (const p of KUN.gp) {
    const st = KUN.streams[p.si];
    const par = S.camera * ref * (.05 + .5 * st.k) / span, xn = mod(p.bx - t * st.sp * p.sp + par, 1), x = xn * span - ref * .15;
    const k = clamp(kunStreamK(st, xn - par, t) + p.dk, .005, 1), y = yM + depth * k;
    const arr = kunArrive(x, y, age); if (arr < .02) continue;
    const tw = .4 + .6 * Math.pow(.5 + .5 * Math.sin(t * p.tw + p.ph), 2), al = G0 * arr * tw * (.5 + .5 * k);
    if (al < .03) continue;
    const len = ref * (.004 + .024 * k) * p.len, hh = Math.max(.8, ref * (.0011 + .0028 * k));
    b.at(p.c, al).rect(x - len / 2, y - hh / 2, len, hh);
    if (tw > .85 && k > .25) { const q = hb.at(p.c, al * .6); q.moveTo(x + len * .9, y); q.ellipse(x, y, len * .9, hh * 3, 0, 0, TAU); }
  }
  hb.fill(g, cols, .22); b.fill(g, cols, 1);
  g.restore();
}
/* 萤火：一明一暗地往上飘；far = 远处那一层（画在世界里，在列车后面） */
function kunFireflies(g, far) {
  if (!KUN.ff.length) return;
  const { ref } = S, cols = [[255, 228, 140], [214, 255, 156]], core = kunBuckets(2, 6), halo = kunBuckets(2, 4), G0 = .4 + .6 * KUN.gold;
  for (const f of KUN.ff) {
    if (f.far !== far) continue;
    const b = Math.pow(Math.max(0, Math.sin(TAU * f.age / f.per + f.ph)), 2);
    const al = b * smooth(f.age / .6) * smooth((f.life - f.age) / 1.4) * (far ? .7 : 1) * G0 * (1 - S.dayF);
    if (al < .03) continue;
    const r = Math.max(.9, ref * .0024 * f.s), R2 = r * 3.6;
    const c = core.at(f.c, al); c.moveTo(f.x + r, f.y); c.arc(f.x, f.y, r, 0, TAU);
    const h = halo.at(f.c, al); h.moveTo(f.x + R2, f.y); h.arc(f.x, f.y, R2, 0, TAU);
  }
  g.save(); g.globalCompositeOperation = 'lighter'; halo.fill(g, cols, .22); core.fill(g, cols, 1); g.restore();
}
/* 一缕丝带：一条慢慢起伏的脊线，两头收窄；一边飘一边翻——翻到侧面时窄成一线，亮边从上缘换到下缘；
   出来的时候从一头一点点舒展开（R.rv） */
function kunRibbon(g, R, A, t) {
  A *= 1 - S.dayF;
  if (A < .01 || R.rv < .02) return;
  const { W, H, yM, ref } = S, n = 40, rv = R.rv;
  const cx = W * R.cx, cy = (R.layer === 2 ? H : yM) * R.cy + ref * .02 * Math.sin(t * .11 + R.p1), span = W * R.span, hw0 = ref * R.wid, amp = ref * R.amp;
  const X = new Float32Array(n + 1), Y = new Float32Array(n + 1), TW = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const s = i / n * rv;
    X[i] = cx + span * (s - .5) + span * .04 * Math.sin(TAU * (s * .7 - t * .025) + R.p2);
    Y[i] = cy + R.tilt * span * (s - .5) + amp * Math.sin(TAU * (s * R.f1 - t * R.w1) + R.p1) + amp * .45 * Math.sin(TAU * (s * R.f2 + t * R.w2) + R.p2);
    TW[i] = Math.cos(TAU * (s * R.tf - t * R.tw) + R.tp);
  }
  const left = new Float32Array(n * 2 + 2), right = new Float32Array(n * 2 + 2);
  for (let i = 0; i <= n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n, i + 1), dx = X[i1] - X[i0], dy = Y[i1] - Y[i0], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, hw = hw0 * Math.pow(Math.sin(Math.PI * i / n), .6) * (.16 + .84 * Math.abs(TW[i]));
    left[i * 2] = X[i] + nx * hw; left[i * 2 + 1] = Y[i] + ny * hw; right[i * 2] = X[i] - nx * hw; right[i * 2 + 1] = Y[i] - ny * hw;
  }
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
  const gr = g.createLinearGradient(X[0], Y[0], X[n], Y[n]);
  const mid = .5 + .12 * Math.sin(t * .23 + R.p1);                                       // 中间那段颜色慢慢顺着丝带走
  gr.addColorStop(0, css(R.cA, 0)); gr.addColorStop(.18, css(R.cA, .26 * A)); gr.addColorStop(mid, css(R.cB, .2 * A)); gr.addColorStop(.84, css(R.cA, .24 * A)); gr.addColorStop(1, css(R.cB, 0));
  g.fillStyle = gr; g.beginPath(); g.moveTo(left[0], left[1]);
  for (let i = 1; i <= n; i++) g.lineTo(left[i * 2], left[i * 2 + 1]);
  for (let i = n; i >= 0; i--) g.lineTo(right[i * 2], right[i * 2 + 1]);
  g.closePath(); g.fill();
  // 丝的光：朝上的那一面亮边在上缘，翻过去以后换到下缘
  const hiC = mix(R.cA, [255, 255, 255], .45), eg = g.createLinearGradient(X[0], Y[0], X[n], Y[n]);
  eg.addColorStop(0, css(hiC, 0)); eg.addColorStop(.22, css(hiC, .62 * A)); eg.addColorStop(.78, css(hiC, .56 * A)); eg.addColorStop(1, css(hiC, 0));
  g.strokeStyle = eg; g.lineWidth = Math.max(.7, ref * .0012);
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const e = TW[i] >= 0 ? left : right;
    if (!i || (TW[i] >= 0) !== (TW[i - 1] >= 0)) g.moveTo(e[i * 2], e[i * 2 + 1]); else g.lineTo(e[i * 2], e[i * 2 + 1]);
  }
  g.stroke();
  // 丝带上几点亮，顺着它慢慢走
  g.fillStyle = css(hiC, 1);
  for (let j = 0; j < 5; j++) {
    const i = Math.round(mod(j * .21 + t * .035 + R.p1, 1) * n), al = A * .7 * (.5 + .5 * Math.sin(t * 2.6 + j * 1.9));
    if (al < .03 || i < 2 || i > n - 2) continue;
    g.globalAlpha = al; g.beginPath(); g.arc(X[i], Y[i], Math.max(.8, ref * .0017), 0, TAU); g.fill();
  }
  g.restore();
}

/* ---- 那一夜的声音（都很轻）---- */
function kunBus(pan, delay, fbk, lpf) {
  const out = actx.createGain(), dl = actx.createDelay(2), fb = actx.createGain(), lp = actx.createBiquadFilter(), p = actx.createStereoPanner ? actx.createStereoPanner() : null;
  dl.delayTime.value = delay; fb.gain.value = fbk; lp.type = 'lowpass'; lp.frequency.value = lpf;
  dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(out);
  if (p) { p.pan.value = pan; out.connect(p); p.connect(master); } else out.connect(master);
  return { out, dl, free: ms => setTimeout(() => { for (const x of [dl, fb, lp, out, p]) if (x) x.disconnect(); }, ms) };
}
function kunTone(bus, f, t0, a, hold, rel, v, type) {
  const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a); g.gain.setValueAtTime(v, t0 + a + hold); g.gain.exponentialRampToValueAtTime(.0001, t0 + a + hold + rel);
  o.connect(g); g.connect(bus.out); g.connect(bus.dl); o.start(t0); o.stop(t0 + a + hold + rel + .05);
  o.onended = () => { o.disconnect(); g.disconnect(); };
}
function kunBell(bus, f, t0, dur, v) {
  const o = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain(), g2 = actx.createGain();
  o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.76; g2.gain.value = .22;
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(bus.out); g.connect(bus.dl);
  for (const x of [o, o2]) { x.start(t0); x.stop(t0 + dur + .05); }
  o.onended = () => { for (const x of [o, o2, g, g2]) x.disconnect(); };
}
// 静：很高、很轻的一层，像玻璃杯沿（两个音挨得很近，慢慢地拍）
function kunShimmer() {
  if (!soundOk()) return;
  const t0 = actx.currentTime + .05, bus = kunBus(.4, .42, .4, 3200);
  kunTone(bus, 1318.5, t0, 3.5, 2, 3.5, .008); kunTone(bus, 1323.9, t0, 3.5, 2, 3.5, .007); kunTone(bus, 1975.5, t0 + .6, 3, 1.6, 3.5, .004);
  bus.free(16000);
}
// 流萤流金：一串细细的铃，从远处那团光开始；底下一声很轻的暖
function kunBloom() {
  if (!soundOk()) return;
  const t0 = actx.currentTime + .03, bus = kunBus(.45, .33, .42, 4200);
  [880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3].forEach((f, i) => kunBell(bus, f, t0 + i * .085 + Math.random() * .03, 2.6, .022 - i * .0012));
  kunTone(bus, 110, t0, 1.2, .3, 3.5, .03);
  bus.free(12000);
}
// 海面隐去：一层很慢的和声，涨上来，再退下去
function kunPad() {
  if (!soundOk()) return;
  const t0 = actx.currentTime + .05, bus = kunBus(0, .5, .35, 1600);
  for (const f of [220, 277.18, 329.63, 440, 554.37]) for (const d of [-1.2, 1.3]) kunTone(bus, f + d, t0, 6, 8, 10, .0055);
  bus.free(32000);
}
// 海回来了：几声往下走的铃
function kunReturn() {
  if (!soundOk()) return;
  const t0 = actx.currentTime + .05, bus = kunBus(-.3, .4, .38, 3000);
  [2093, 1760, 1568, 1318.5, 1046.5].forEach((f, i) => kunBell(bus, f, t0 + i * .32, 3, .016));
  bus.free(12000);
}

/* 鲸歌：很长、很低，带回声。'low' 远远的一声；'high' 从头顶过的时候那一声；'far' 走远了回头的一声 */
function kunSong(kind, pan) {
  if (!soundOk()) return;
  const t0 = actx.currentTime + .05, p = actx.createStereoPanner ? actx.createStereoPanner() : null;
  const out = actx.createGain(); out.gain.value = kind === 'far' ? .5 : 1;
  const dl = actx.createDelay(2), fb = actx.createGain(), lp = actx.createBiquadFilter();
  dl.delayTime.value = .47; fb.gain.value = .42; lp.type = 'lowpass'; lp.frequency.value = 1200;
  dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(out);
  if (p) { p.pan.value = clamp(pan * 1.6 - .8, -.75, .75); out.connect(p); p.connect(master); } else out.connect(master);
  const voice = (st, f0, f1, f2, dur, v) => {
    const o = actx.createOscillator(), o2 = actx.createOscillator(), lfo = actx.createOscillator(), lg = actx.createGain(), gn = actx.createGain(), g2 = actx.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.setValueAtTime(f0, t0 + st); o.frequency.exponentialRampToValueAtTime(f1, t0 + st + dur * .55); o.frequency.exponentialRampToValueAtTime(f2, t0 + st + dur);
    o2.frequency.setValueAtTime(f0 * 2.01, t0 + st); o2.frequency.exponentialRampToValueAtTime(f1 * 2.01, t0 + st + dur * .55); o2.frequency.exponentialRampToValueAtTime(f2 * 2.01, t0 + st + dur);
    lfo.frequency.value = 4.6; lg.gain.value = f1 * .012; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    gn.gain.setValueAtTime(.0001, t0 + st); gn.gain.exponentialRampToValueAtTime(v, t0 + st + dur * .3); gn.gain.setValueAtTime(v, t0 + st + dur * .65); gn.gain.exponentialRampToValueAtTime(.0001, t0 + st + dur);
    g2.gain.value = .18;
    o.connect(gn); o2.connect(g2); g2.connect(gn); gn.connect(out); gn.connect(dl);
    for (const x of [o, o2, lfo]) { x.start(t0 + st); x.stop(t0 + st + dur + .05); }
    o.onended = () => { for (const x of [o, o2, lfo, lg, gn, g2]) x.disconnect(); };
  };
  if (kind === 'high') { voice(0, 330, 520, 410, 3.6, .05); voice(2.9, 410, 300, 250, 2.6, .035); }
  else { voice(0, 150, 96, 120, 4.2, .07); voice(3.4, 120, 170, 140, 2.8, .045); }
  setTimeout(() => { for (const x of [dl, fb, lp, out, p]) if (x) x.disconnect(); }, 14000);
}

// 按颜色、亮度分档的路径：at(颜色, 亮度) 拿到那一档的 Path2D，最后每档一笔 fill / stroke
function kunBuckets(nc, levels = 8) {
  const paths = [];
  for (let c = 0; c < nc; c++) { paths.push([]); for (let l = 0; l < levels; l++) paths[c].push(null); }
  return {
    at(c, al) { const l = Math.min(levels - 1, Math.max(0, Math.round(al * levels - .5))); return paths[c][l] || (paths[c][l] = new Path2D()); },
    fill(g, cols, k) { for (let c = 0; c < nc; c++) for (let l = 0; l < levels; l++) if (paths[c][l]) { g.fillStyle = css(cols[c], (l + .5) / levels * k); g.fill(paths[c][l]); } },
    stroke(g, cols, k) { for (let c = 0; c < nc; c++) for (let l = 0; l < levels; l++) if (paths[c][l]) { g.strokeStyle = css(cols[c], (l + .5) / levels * k); g.stroke(paths[c][l]); } }
  };
}
