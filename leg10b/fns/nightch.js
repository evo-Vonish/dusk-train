/* 第十棒第六版 · 夜只在该来的时候来
   以前「时间跟着旅程走」：远汀以后入夜，潮生、灯岬、汐音都是夜，一圈里差不多一半是夜。
   现在旅程里大部分时候是亮的黄昏（四季那几张会流动的画）。夜只在这几种时候来：
   · 夜里的事：每走一圈（八站）有一次——流星雨、满月和飞鱼、星河轮着来，地点固定（潮生以后、灯岬以后，两圈一换）。
     到了那一段，天慢慢黑下来（十秒），夜里的事一分钟上下，过去了，黄昏再慢慢回来（十二秒）；
   · 季节里非夜不可的：秋天停在月见（中秋的月）、夏天停在月见或拾光（萤火），黑四十来秒；
   · 烟火之夜：小镇的下午过完，黄昏接着入夜——烟花、河灯、星河，然后黄昏又回来（原来就是这样，由 TOWN_SUN 管）。
   夜里的事要来的时候，阵雨先停一停（你在 Dock 里选了下雨就不停，那一段也就不入夜）；起雾、暴风雨的时候不入夜。 */
/* 第八版：鲲也是夜里的事了，而且排在第一个——旅程里第一个夜（开出月见以后）就是鲲的夜；之后一圈一件，鲲、流星雨、满月和飞鱼、星河轮着来。
   鲲的夜来得早（开出月见就来），好让那一夜的前奏、海面隐去、鲲游过去都落在夜里；季节里的中秋、萤火那一会儿让给它（天本来就是夜）。 */
const NIGHT_CH = { kinds: ['kun', 'meteor', 'moon', 'galaxy'], at: [3.3, 4.4], kunAt: [2.12, 2.72] };     // 第 L 圈：哪一件事、在这一圈的哪儿
const NCH = { cur: null, done: {}, k: 0 };
function nightLoopOf(p) { return p < 10 ? 0 : 1 + Math.floor((p - 10) / 8); }  // 第几圈（第 0 圈含小镇）
function nightLoopQ(p) { return p < 10 ? p : mod(p - 10, 8); }                 // 在这一圈里的位置（0 暮海 … 7 拾光）

/* 第七版：每一站在它最好看的时候。为夜里画的站是夜，为黄昏画的站是黄昏：
   · 暮海（樱、出发）、远汀（沙洲上那棵松的剪影）、听风（风筝、风向袋、纸风车）、拾光（光瓶从黄昏亮到夜）是黄昏；
   · 月见（芒草和月）、潮生（海上明月共潮生）、灯岬（灯塔的光柱）、汐音（夜里的浮标钟）是夜。
   开出远汀天就慢慢暗下来（1.25 → 1.85），开出汐音黄昏慢慢回来（5.35 → 5.95），停在听风时已经是黄昏。
   小镇的下午和烟火之夜还是 TOWN_SUN 管；烟火之后按站名，同一个站名，同一种天色。
   夜里的事（NIGHT_CH：流星雨、满月和飞鱼、星河）照旧一圈一次，落在这段夜里；季节里的中秋、萤火也照旧。 */
function journeyNight(p) {
  const q = nightLoopQ(p);
  return smooth((q - 1.25) / .6) * (1 - smooth((q - 5.35) / .6));
}
function modeNightNow() {
  return S.timeMode === 'journey' ? Math.max(journeyNight(townPos()), NCH.k) : S.timeMode === 'cycle' ? (1 - Math.cos(S.t * TAU / 240)) / 2 : S.timeMode === 'night' ? 1 : 0;
}
// 停靠时是夜里的站（提灯的人只在这几站等车）：烟火之后的两站；每一圈里的月见、潮生、灯岬、汐音
function stationNight(i) {
  if (i >= 10 && i <= 11) return true;
  if (i >= 6 && i <= 9) return false;
  return journeyNight(i) > .5;
}

function updateNightChapters(dt) {
  if (S.timeMode !== 'journey') { NCH.cur = null; NCH.k = 0; return; }
  const p = townPos(), L = nightLoopOf(p), q = nightLoopQ(p), kindL = NIGHT_CH.kinds[L % NIGHT_CH.kinds.length];
  const town = p > 6.0 && p < 12.6;                                       // 小镇的下午和烟火之夜，天色由 TOWN_SUN 管
  const calm = S.rainI < .5 && S.stormF < .05 && NX.fog < .2 && !NX.active && S.weather !== 'rain';
  if (kindL === 'kun' && !town && calm && q >= NIGHT_CH.kunAt[0] && q < NIGHT_CH.kunAt[1] && !NCH.done['ev' + L] && (!NCH.cur || NCH.cur.kind === 'midautumn' || NCH.cur.kind === 'fireflies')) {
    NCH.cur = { kind: 'kun', key: 'ev' + L, phase: 'fall', t: 0 }; NCH.done['ev' + L] = true;
  }
  if (!NCH.cur) {
    if (!town && calm) {
      const st = Math.round(p), near = Math.abs(p - st) < .45, name = stationName(st);
      let kind = null, key = '';
      if (near && name === '月见' && seasonWeight(2) > .55 && !NCH.done['ma' + st]) { kind = 'midautumn'; key = 'ma' + st; }
      else if (near && (name === '月见' || name === '拾光') && seasonWeight(1) > .55 && !NCH.done['ff' + st]) { kind = 'fireflies'; key = 'ff' + st; }
      else if (kindL !== 'kun') {
        const at = NIGHT_CH.at[L % 2];
        if (q >= at && q < at + 1.2 && !NCH.done['ev' + L]) { kind = kindL; key = 'ev' + L; }
      }
      if (kind) {
        NCH.cur = { kind, key, phase: 'fall', t: 0 }; NCH.done[key] = true;
        if (kind === 'moon') SKY2.moonSeed = mod(.5 - (S.travel + G() * .8) / (G() * 12), 1);   // 这一夜是满月
      }
    }
  }
  const c = NCH.cur;
  if (!c) { NCH.k = Math.max(0, NCH.k - dt / 12); return; }
  c.t += dt;
  if (c.phase === 'fall') {
    NCH.k = Math.min(1, NCH.k + dt / 10);
    if (NX.active && NX.active.kind !== 'storm' && NX.active.kind !== 'fog') { c.phase = 'hold'; c.t = 0; }        // 别的夜里的事先来了：就是它
    else if (NCH.k >= 1 && S.nightF > .66) { c.phase = 'hold'; c.t = 0; nightChapterStart(c); }
    if (S.stormF > .1 || S.weather === 'rain') c.phase = 'rise';
  } else if (c.phase === 'hold') {
    const ev = c.kind === 'meteor' || c.kind === 'galaxy' || c.kind === 'moon' || c.kind === 'kun';
    if ((ev ? c.t > 6 && !NX.active : c.t > 44) || S.stormF > .1 || S.weather === 'rain') c.phase = 'rise';
  } else {
    NCH.k = Math.max(0, NCH.k - dt / 12);
    if (NCH.k <= 0) NCH.cur = null;
  }
  if ((c.kind === 'moon' || c.kind === 'midautumn') && c.phase !== 'rise') SKY2.moonUp = Math.min(1, SKY2.moonUp + dt / 10);   // 这一夜的月亮升得快一点
}
function nightChapterStart(c) {
  if (c.kind === 'meteor') beginEncounter('meteor', '天黑下来了。第一颗流星正在赶来。', 52);
  else if (c.kind === 'galaxy') beginEncounter('galaxy', '天黑下来了。让暮云散开，等星河落进海里。', 58);
  else if (c.kind === 'moon') { NX.seen.fishMoon = Math.floor(SKY2.moonSeed + S.travel / (G() * 12)); beginEncounter('flyingfish', '月亮圆了。海面上，飞鱼成群地滑翔。', 50); }
  else if (c.kind === 'kun') beginEncounter('kun', '今晚的海，静得出奇。');
  else if (c.kind === 'midautumn') say('中秋。月亮从芒草后面升起来了。', 5000);
  else if (c.kind === 'fireflies') say('天黑下来了。草丛里升起了萤火。', 5000);
}
