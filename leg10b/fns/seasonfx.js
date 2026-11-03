/* 第十棒第三版 · 四季：空气里的东西（花瓣、落叶、雪、雁）与换季时的一句话
   草样里铺在天上的几层季节色已经并进了天的底色（skyMixed），这里只留贴着海面抖的热气。 */
NX.leaves = [];
function updateSeasons(dt) {
  const { W, H, yM, ref } = S;
  const win = seasonWeight(3), spr = seasonWeight(0), aut = seasonWeight(2);
  const precip = S.weather === 'auto' ? rainLevel() : S.weather === 'rain' ? 1 : 0;
  // 雪：慢，飘，不成条；三层深浅。冬天一直有一点，阴下来时更密
  const snowTarget = Math.round(win * (S.reduced ? 60 : S.portrait ? 240 : 480) * (.4 + .6 * precip) * (1 - S.stormF * .5));
  while (NX.snow.length < snowTarget) NX.snow.push({ x: Math.random() * W, y: Math.random() * H, s: .35 + Math.random() * .9, ph: Math.random() * TAU, layer: Math.random() });
  if (NX.snow.length > snowTarget) NX.snow.length = snowTarget;
  for (const f of NX.snow) {
    f.y += ref * (.012 + f.s * .022) * (1 + S.gust * .5) * dt;
    f.x += (ref * .004 * Math.sin(S.t * .5 + f.ph) - ref * (.004 + S.gust * .03)) * dt;   // 风往车头那边（左）吹
    if (f.y > H + 4) { f.y = -6 - Math.random() * 30; f.x = Math.random() * (W + 80) - 40; }
    if (f.x < -30) f.x += W + 60;
  }
  // 花瓣：少而慢，只在近处；起风时多一些
  const petalTarget = Math.round(spr * (S.reduced ? 8 : S.portrait ? 20 : 34) * (1 + S.gust * .8 + (NX.blossomStorm ? NX.blossomStorm.k * 5 : 0)));
  while (NX.petals.length < petalTarget) NX.petals.push({ x: W + Math.random() * ref * .3, y: yM * (.35 + Math.random() * .7), s: .6 + Math.random() * .7, ph: Math.random() * TAU, spin: (Math.random() - .5) * 3 });
  if (NX.petals.length > petalTarget) NX.petals.length = petalTarget;
  for (const p of NX.petals) {
    p.x -= ref * (.045 + .02 * Math.sin(S.t * .4 + p.ph)) * (1 + S.gust * 1.2) * dt;
    p.y += ref * (.008 + .01 * Math.sin(S.t * .9 + p.ph)) * dt;
    p.ph += p.spin * dt * .5;
    if (p.x < -ref * .04 || p.y > H) { p.x = W + ref * (.02 + Math.random() * .3); p.y = yM * (.3 + Math.random() * .6); }
  }
  // 落叶：秋天，偶尔有几片翻着跟头从画面里飘过去
  const leafTarget = Math.round(aut * (S.reduced ? 3 : S.portrait ? 7 : 12) * (1 + S.gust));
  while (NX.leaves.length < leafTarget) NX.leaves.push({ x: W + Math.random() * ref * .4, y: yM * (.2 + Math.random() * .75), s: .7 + Math.random() * .6, ph: Math.random() * TAU, spin: (Math.random() - .5) * 4, c: Math.floor(Math.random() * 3) });
  if (NX.leaves.length > leafTarget) NX.leaves.length = leafTarget;
  for (const p of NX.leaves) {
    p.x -= ref * (.05 + .025 * Math.sin(S.t * .5 + p.ph)) * (1 + S.gust * 1.4) * dt;
    p.y += ref * (.012 + .016 * Math.sin(S.t * 1.1 + p.ph)) * dt;
    p.ph += p.spin * dt * .6;
    if (p.x < -ref * .05 || p.y > H) { p.x = W + ref * (.03 + Math.random() * .3); p.y = yM * (.15 + Math.random() * .6); }
  }
  // 雁阵：秋天，高处，斜斜地过去，很少
  if (aut > .45 && !NX.geese && S.rainI < .3) {
    NX.gooseT -= dt;
    if (NX.gooseT <= 0) { NX.gooseT = 50 + Math.random() * 60; NX.geese = { x: W + ref * .2, y: yM * (.12 + Math.random() * .12), n: 7 + Math.floor(Math.random() * 6), age: 0 }; }
  }
  if (NX.geese) { const g0 = NX.geese; g0.age += dt; g0.x -= ref * .055 * dt; g0.y += ref * .004 * dt; if (g0.x < -ref * .5) NX.geese = null; }
}
function drawSeasonAir(g) {
  const sum = seasonWeight(1);
  if (sum < .02 || S.nightF > .98) return;
  // 夏：贴着海面抖动的热气
  const { W, yM, ref, t } = S;
  g.save(); g.globalAlpha = .5 * sum * (1 - S.nightF);
  for (let i = 0; i < 5; i++) { const y = yM - ref * (.004 + i * .006), o = Math.sin(t * 1.3 + i * 2.1) * ref * .002; g.fillStyle = css([255, 252, 244], .05); g.fillRect(-PAD + o, y, W + PAD * 2, ref * .003); }
  g.restore();
}
function drawSeasonWater() {}                               // 海的季节色已经在 seaTop / seaBot 里
function drawPetals(g) {
  const { ref } = S;
  if (NX.blossomStorm && NX.blossomStorm.k > .5) hitBg('blossomstorm', 0, 0, S.W, S.H * .9);
  if (NX.petals.length) {
    const a = seasonWeight(0) * (1 - S.rainI * .6);
    g.save(); g.fillStyle = css([255, 196, 214], .9);
    for (const p of NX.petals) {
      const w = ref * .0085 * p.s, h = w * (.42 + .58 * Math.abs(Math.cos(p.ph)));
      g.globalAlpha = a * (.5 + .5 * Math.abs(Math.sin(p.ph * .7)));
      g.beginPath(); g.ellipse(p.x, p.y, w, h, p.ph * .4, 0, TAU); g.fill();
    }
    g.restore();
  }
  if (NX.leaves.length) {
    const a = seasonWeight(2) * (1 - S.rainI * .5), cols = [[206, 74, 52], [232, 132, 48], [226, 180, 64]];
    g.save();
    for (const p of NX.leaves) {
      const r = ref * .009 * p.s, flip = Math.cos(p.ph);
      g.globalAlpha = a * .9; g.fillStyle = css(mix(cols[p.c], INK, S.nightF * .55));
      g.save(); g.translate(p.x, p.y); g.rotate(p.ph * .5); g.scale(1, .35 + .65 * Math.abs(flip));
      mapleLeaf(g, r); g.fill(); g.restore();
    }
    g.restore();
  }
}
function mapleLeaf(g, r) {                                   // 一片五个角的叶子，带一截柄
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r * (i === 4 || i === 6 ? .8 : 1);
    i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath(); g.moveTo(0, r * .3); g.lineTo(r * .08, r * .9); g.lineTo(-r * .04, r * .9); g.closePath();
}
function seasonToast() {                                   // 换季时，很轻的一句
  const i = Math.floor(seasonPos());
  if (i === NX.seasonSaid) return;
  const first = NX.seasonSaid < 0; NX.seasonSaid = i;
  if (first) return;
  if (i === 3) SEAMO.snowAt = S.t;
  say(['立春。海上也有春天了。', '立夏。海面发烫，云堆得高高的。', '立秋。天一下子高了。', '立冬，初雪。月台上等车的人都抬起头。'][i], 5200);
}

/* 雪：一层一条路径（原来一片一片地填，手机上很费） */
function drawSnowFall(g) {
  if (!NX.snow.length) return;
  const { ref } = S, win = seasonWeight(3);
  if (win > .4 && SEAMO.snowAt != null && S.t - SEAMO.snowAt < 40) hitBg('firstsnow', 0, 0, S.W, S.H * .9);
  g.save();
  for (let layer = 0; layer < 3; layer++) {
    g.fillStyle = css([248, 252, 255], win * (.4 + layer * .28));
    g.beginPath();
    for (const f of NX.snow) {
      if (Math.min(2, Math.floor(f.layer * 3)) !== layer) continue;
      const r = Math.max(.7, ref * .0016 * f.s * (.7 + layer * .4));
      g.moveTo(f.x + r, f.y); g.arc(f.x, f.y, r, 0, TAU);
    }
    g.fill();
  }
  g.restore();
}
