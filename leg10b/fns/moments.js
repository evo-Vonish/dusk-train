/* 第十棒第三版 · 四季：每一季的高光、声音、节气章
   · 春：花吹雪——一阵大风，花瓣像一面帘子扫过画面；
   · 夏：萤火——拾光、月见的夏夜，草丛里升起萤火虫（画在 seasonst 里），第一次见到时说一句；
   · 秋：中秋——秋天经过月见的那一夜，月亮一定是圆的，从芒草后面升起来；
   · 冬：初雪——立冬那一刻，月台上等车的人都抬起头（seasonToast 说）；
   · 声音（只在声音开着时）：春天远处的树莺，夏天黄昏的暮蝉，秋夜月台草丛里的铃虫；冬天雪把一切都压低，海声小一点；
   · 节气章：走过一个节气，收集簿里就盖上一枚（不用揭，自己盖上），仪表盘上那两个字会轻轻跳一下。 */
const TERM_LINES = ['第一片花瓣落在海上。', '细雨。车窗上的水珠一颗一颗往后跑。', '远处很轻的一声春雷。', '白天和夜一样长。', '雨里有人在放风筝。', '近岸的水里，蓝眼泪开始亮了。',
  '听风站挂起了鲤鱼旗。', '海开始发烫。', '萤火虫从草丛里升起来。', '一年里最长的黄昏。', '暮蝉在傍晚叫起来。', '积雨云堆得高高的，雷阵雨来了又走。',
  '第一阵凉风吹响了风铃。', '热气散了。', '栏杆的蛛网上挂满了露水。', '雁从高处斜着飞过去。', '山上的叶子红了。', '月台上落了第一层霜。',
  '车窗起雾了。', '初雪。', '雪积起来了。', '一年里最长的夜。候车室里一碗汤圆冒着热气。', '檐下挂起了冰柱。', '流冰从北边漂来。'];
const SEAMO = { storm: -1, nextStorm: 40, said: {}, birdT: 12, cicadaT: 8, cricketT: 6, term: -1, midA: 0, snowSaid: false };
NX.blossomStorm = null;

function updateSeasonMoments(dt) {
  const spr = seasonWeight(0), sum = seasonWeight(1), aut = seasonWeight(2), win = seasonWeight(3);
  // 花吹雪
  if (NX.blossomStorm) {
    const b = NX.blossomStorm; b.age += dt; b.k = smooth(b.age / 1.2) * (1 - smooth((b.age - b.dur + 2) / 2));
    if (b.age > 2) S.gust = Math.max(S.gust, .8 * b.k);
    if (b.age >= b.dur) NX.blossomStorm = null;
  } else if (spr > .6 && S.rainI < .2 && !S.paused) {
    SEAMO.nextStorm -= dt;
    if (SEAMO.nextStorm <= 0) { SEAMO.nextStorm = 70 + Math.random() * 60; NX.blossomStorm = { age: 0, dur: 9, k: 0 }; S.gust = 1; if (!SEAMO.said.storm) { SEAMO.said.storm = 1; say('一阵大风，花瓣像帘子一样扫过去——花吹雪。', 5200); } }
  }
  // 萤火：第一次见到时说一句
  const near = stationName(Math.round(S.travel / G())), off = Math.abs(S.travel / G() - Math.round(S.travel / G()));
  if (!SEAMO.said.fire && sum > .5 && S.nightF > .55 && S.dayF < .1 && S.rainI < .2 && off < .4 && (near === '拾光' || near === '月见')) { SEAMO.said.fire = 1; say('萤火虫从草丛里升起来了。', 5000); }
  // 中秋
  const ma = midAutumn();
  SEAMO.midA = ma;
  if (ma > .7 && SKY2.moonA > .4 && !SEAMO.said['mid' + Math.round(S.travel / G())]) { SEAMO.said['mid' + Math.round(S.travel / G())] = 1; say('中秋。月亮从芒草后面升起来，是圆的。', 5600); }
  // 节气章
  const k = termIndex();
  if (k !== SEAMO.term) {
    const first = SEAMO.term < 0; SEAMO.term = k;
    const card = CARD.get('term-' + k);
    if (card && !store.got[card.id] && NX.seasonForce < 0) { albumAdd(card, null, momentWords()); if (!first) termStampBlink(); }
  }
  seasonSounds(dt, spr, sum, aut, win);
}
// 秋天经过月见的那一夜：月亮慢慢变圆
function midAutumn() {
  const aut = seasonWeight(2); if (aut < .3) return 0;
  const p = S.travel / G(); let best = 9;
  for (let i = Math.floor(p) - 1; i <= Math.floor(p) + 2; i++) if (stationName(i) === '月见') best = Math.min(best, Math.abs(p - i));
  return smooth((aut - .3) / .4) * (1 - smooth((best - .6) / 1)) * smooth((S.nightF - .2) / .4);
}
function drawMidAutumn(g) {
  const ma = SEAMO.midA; if (ma < .05 || SKY2.moonA < .2) return;
  const r = SKY2.moonR, x = SKY2.moonX, y = SKY2.moonY;
  glow(g, glowSprOrange(), x, y, r * 12, r * 12, .16 * ma * SKY2.moonA);
  if (ma > .6 && SKY2.moonLit > .9) hitAt(null, 'midautumn', x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6);
}
function termStampBlink() {
  const el = document.getElementById('dash-term'); if (!el) return;
  el.classList.remove('stamp'); void el.offsetWidth; el.classList.add('stamp');
}
// 节气章：方的红印，两个字竖着排
function termSealSVG(k, size = 92) {
  const n = TERMS[k] || '  ';
  return '<svg class="stamp term-seal" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<rect x="17" y="12" width="66" height="72" rx="7" fill="none" stroke="currentColor" stroke-width="3.2"/>' +
    '<rect x="23" y="18" width="54" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.1"/>' +
    '<text x="50" y="45" font-size="23" text-anchor="middle" fill="currentColor" font-family="Songti SC, SimSun, serif">' + n[0] + '</text>' +
    '<text x="50" y="71" font-size="23" text-anchor="middle" fill="currentColor" font-family="Songti SC, SimSun, serif">' + n[1] + '</text>' +
    '<text x="50" y="95" font-size="7.2" letter-spacing="2" text-anchor="middle" fill="currentColor" font-family="Songti SC, SimSun, serif">第 ' + (k + 1) + ' 个节气</text></svg>';
}
// 收集簿里打开一枚节气章：那一季的黄昏颜色，中间两个大字
function termArt(k, size) {
  const c = mkCanvas(size, size), g = c.getContext('2d'), P = SEASON_PAL[Math.floor(k / 6)];
  const gr = g.createLinearGradient(0, 0, 0, size);
  SKY_STOPS.forEach((s, i) => gr.addColorStop(s, css(P.dusk[i])));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const gl = g.createRadialGradient(size * .7, size, 0, size * .7, size, size * .7);
  gl.addColorStop(0, css(P.glow, .8)); gl.addColorStop(1, css(P.glow, 0)); g.fillStyle = gl; g.fillRect(0, 0, size, size);
  g.fillStyle = 'rgba(16,20,48,0.85)'; g.fillRect(0, size * .78, size, size * .22);
  g.fillStyle = 'rgba(255,240,224,0.92)'; g.font = '400 ' + (size * .2) + 'px "Songti SC", "Noto Serif CJK SC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(TERMS[k][0], size * .5, size * .33); g.fillText(TERMS[k][1], size * .5, size * .56);
  return c;
}

/* 声音：全部本地合成，很轻，只在那一季、那个时辰 */
function seasonSounds(dt, spr, sum, aut, win) {
  if (!soundOk()) return;
  if (spr > .5 && S.nightF < .5 && S.rainI < .3) { SEAMO.birdT -= dt; if (SEAMO.birdT <= 0) { SEAMO.birdT = 28 + Math.random() * 34; uguisu(.2 + Math.random() * .6); } }
  if (sum > .5 && S.nightF < .6 && S.rainI < .3) { SEAMO.cicadaT -= dt; if (SEAMO.cicadaT <= 0) { SEAMO.cicadaT = 22 + Math.random() * 26; higurashi(.15 + Math.random() * .7); } }
  if (aut > .5 && S.nightF > .4 && S.rainI < .3) { SEAMO.cricketT -= dt; if (SEAMO.cricketT <= 0) { SEAMO.cricketT = 7 + Math.random() * 9; suzumushi(.3 + Math.random() * .4); } }
}
function sndTone(type, t0, dur, f0, f1, gainV, pan) {
  const o = actx.createOscillator(), gn = actx.createGain(), p = actx.createStereoPanner ? actx.createStereoPanner() : null;
  o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(gainV, t0 + Math.min(.04, dur * .3)); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); if (p) { p.pan.value = clamp(pan * 1.6 - .8, -.8, .8); gn.connect(p); p.connect(master); } else gn.connect(master);
  o.start(t0); o.stop(t0 + dur + .05); o.onended = () => { o.disconnect(); gn.disconnect(); if (p) p.disconnect(); };
}
function uguisu(pan) {                                       // 树莺：「呼——」一长声，接着「后—克—叫」
  const t0 = actx.currentTime + .05, v = .006;
  sndTone('sine', t0, 1.25, 1020, 1160, v, pan);
  sndTone('sine', t0 + 1.42, .13, 1700, 1650, v * .9, pan);
  sndTone('sine', t0 + 1.6, .09, 2650, 2550, v * .8, pan);
  sndTone('sine', t0 + 1.74, .3, 3050, 2380, v * .85, pan);
}
function higurashi(pan) {                                    // 暮蝉：「卡纳卡纳卡纳……」先响起来再慢慢弱下去
  const t0 = actx.currentTime + .05, n = 14;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), env = Math.sin(Math.PI * Math.min(1, f * 1.15)) * .7 + .3;
    sndTone('triangle', t0 + i * .17, .11, 4500 - f * 600, 4300 - f * 650, .0018 * env, pan);
  }
}
function suzumushi(pan) {                                    // 铃虫：「铃——」很高、很细，颤着
  const t0 = actx.currentTime + .05;
  for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) sndTone('sine', t0 + r * .55 + i * .045, .035, 4650, 4600, .0016, pan);
}
