// 第七版：每一站在它最好看的时候——暮海、远汀、听风、拾光是黄昏；月见、潮生、灯岬、汐音是夜；夜里的事一圈一次
// 第八版：鲲是夜里的事之一，旅程里第一个夜（开出月见以后）就来；之后流星雨、满月和飞鱼、星河、鲲轮着来
const { chromium } = require('playwright');
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const page = async (q) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
    await p.goto('file://' + process.cwd() + '/test.html' + q); await p.waitForTimeout(1500); return p;
  };
  // 在某个位置上跑 sec 秒（每一步把列车放回那个位置附近，慢慢往前挪），返回沿途的天色
  const run = (p, at, sec, opt) => p.evaluate(([at, sec, opt]) => {
    const T = __T(), S = T.S, G = T.G();
    if (opt && opt.season != null) T.NX.seasonForce = opt.season;
    if (opt && opt.weather) S.weather = opt.weather;
    if (opt && opt.rain != null) S.rainI = opt.rain;
    S.travel = S.camera = at * G; S.tramMode = 'parked'; S.tramTimer = Infinity; S.stopAt = Infinity;
    let maxN = 0, kinds = new Set(), endN = 0;
    for (let i = 0; i < sec * 30; i++) {
      if (opt && opt.move) { S.travel = S.camera = (at + opt.move * i / (sec * 30)) * G; }
      if (opt && opt.rain != null) S.rainI = opt.rain;
      T.update(1 / 30); maxN = Math.max(maxN, S.nightF);
      if (T.NX.active) kinds.add(T.NX.active.kind);
    }
    endN = S.nightF;
    return { maxN: +maxN.toFixed(2), endN: +endN.toFixed(2), kinds: [...kinds], ch: T.NCH.cur && T.NCH.cur.kind, phase: T.NCH.cur && T.NCH.cur.phase, midA: +T.SEAMO.midA.toFixed(2), moonLit: +T.SKY2.moonLit.toFixed(2) };
  }, [at, sec, opt || null]);
  // 1. 第七版：暮海、远汀是黄昏
  let p = await page('');
  let r = await run(p, 0.2, 40, { season: 0, move: 1.0 });
  ok(r.maxN < 0.05, '暮海到远汀是黄昏 ' + JSON.stringify(r));
  // 2. 月见是夜（开出远汀天就慢慢暗下来）
  r = await run(p, 2.0, 20, { season: 0, weather: 'clear' });
  ok(r.endN > 0.9, '月见是夜 ' + JSON.stringify(r));
  // 3. 第一圈的夜里的事是鲲（开出月见就来）；第二圈灯岬以后是流星雨
  r = await run(p, 2.14, 40, { season: 0, move: 0.2, weather: 'clear' });
  ok(r.maxN > 0.9 && r.kinds.includes('kun') && r.ch === 'kun', '第一个夜：开出月见，鲲的夜来了 ' + JSON.stringify(r));
  await p.context().close(); p = await page('');
  r = await run(p, 14.42, 30, { season: 0, move: 0.2, weather: 'clear' });
  ok(r.maxN > 0.7 && r.kinds.includes('meteor'), '第二圈灯岬以后，流星雨来了 ' + JSON.stringify(r));
  // 4. 灯岬、汐音还是夜；开出汐音黄昏回来，停在听风时是黄昏
  r = await run(p, 4.0, 20, { season: 0 });
  ok(r.endN > 0.9, '灯岬是夜 ' + JSON.stringify(r));
  r = await run(p, 5.0, 60, { season: 0, move: 1.0 });
  ok(r.endN < 0.1, '开出汐音，到听风时黄昏回来了 ' + JSON.stringify(r));
  r = await run(p, 6.0, 40, { season: 0, move: 1.0 });
  ok(r.maxN < 0.08, '听风、拾光是黄昏 ' + JSON.stringify(r));
  const sn = await p.evaluate(() => { const T = __T(); return [0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 15, 16].map(i => T.stationNight(i) ? 1 : 0).join(''); });
  ok(sn === '001111001110', '提灯的人只在夜里的站等车（月见、潮生、灯岬、汐音） ' + sn);
  ok(!p.errs.length, '没有报错 ' + p.errs.join(' | '));
  await p.context().close();
  // 5. 秋天停在月见：中秋的月
  p = await page('');
  r = await run(p, 2.0, 30, { season: 2 });
  ok(r.ch === 'midautumn' && r.maxN > 0.7 && r.midA > 0.5 && r.moonLit > 0.9, '秋天停在月见，天黑下来，是中秋的满月 ' + JSON.stringify(r));
  r = await run(p, 2.0, 90, { season: 2 });
  ok(r.endN > 0.9 && !r.ch, '中秋那一会儿过去，月见本来就是夜 ' + JSON.stringify(r));
  await p.context().close();
  // 6. 夏天停在拾光（第二圈）：萤火的夜
  p = await page('');
  r = await run(p, 17.0, 30, { season: 1 });
  ok(r.ch === 'fireflies' && r.maxN > 0.7, '夏天停在拾光，萤火的夜 ' + JSON.stringify(r));
  await p.context().close();
  // 7. 第三圈潮生以后：满月和飞鱼
  p = await page('');
  r = await run(p, 21.32, 40, { season: 0, move: 0.3 });
  ok(r.maxN > 0.7 && r.kinds.includes('flyingfish') && r.moonLit > 0.85, '第三圈潮生以后，满月和飞鱼 ' + JSON.stringify(r));
  await p.context().close();
  // 8. 阵雨里到了那一段：雨先停，天黑下来；你在 Dock 里选了下雨：不入夜
  p = await page('');
  r = await p.evaluate(() => { const T = __T(), S = T.S, G = T.G(); T.NX.seasonForce = 0; S.weather = 'auto'; S.t = 170 * 0.43 + 27; S.rainI = 0.45;
    S.travel = S.camera = 14.42 * G; S.tramMode = 'parked'; S.tramTimer = Infinity; S.stopAt = Infinity;
    let maxN = 0, minR = 1; for (let i = 0; i < 40 * 30; i++) { T.update(1 / 30); maxN = Math.max(maxN, S.nightF); minR = Math.min(minR, S.rainI); }
    return { maxN: +maxN.toFixed(2), minR: +minR.toFixed(2), kind: T.NX.active && T.NX.active.kind }; });
  ok(r.maxN > 0.7 && r.minR < 0.2, '阵雨里到了那一段：雨停了，天黑下来 ' + JSON.stringify(r));
  await p.context().close();
  p = await page('');
  r = await run(p, 14.42, 30, { season: 0, weather: 'rain' });
  ok(r.maxN > 0.7 && !r.kinds.includes('meteor'), '选了下雨：灯岬照旧是夜，只是流星雨不来 ' + JSON.stringify(r));
  await p.context().close();
  // 10. 鲲（第八版）：黄昏里不来；开出月见，一个不寻常的夜——静、流萤流金、丝带、海面隐去、鲲、海回来，一封信
  p = await page('');
  r = await p.evaluate(() => { const T = __T(), S = T.S, G = T.G(); S.weather = 'clear'; S.rainI = 0; T.NX.seasonForce = 1; T.depart(); const seen = [];
    for (let i = 0; i < 70 * 30; i++) { T.update(1 / 30); const a = T.NX.active; if (a && !seen.includes(a.kind)) seen.push(a.kind); }
    return { seen, q: +T.nightLoopQ(T.townPos()).toFixed(2), maxN: +S.nightF.toFixed(2) }; });
  ok(!r.seen.includes('kun'), '暮海、远汀的黄昏里，鲲不来 ' + JSON.stringify(r));
  r = await p.evaluate(() => { const T = __T(), S = T.S, G = T.G(), K = T.KUN; S.travel = S.camera = 2.05 * G; S.tramMode = 'cruising'; S.tramV = 0.205; S.stopAt = Infinity;
    const log = {}, mark = (k, v) => { if (log[k] == null) log[k] = v; }; let t0 = null, minN = 1, maxStill = 0, poseFirst = null, poseNear = 0;
    for (let i = 0; i < 140 * 30; i++) {
      T.update(1 / 30); const a = T.NX.active;
      if (a && a.kind === 'kun') { if (t0 == null) t0 = i / 30; const age = +a.age.toFixed(1); minN = Math.min(minN, S.nightF);
        if (K.omen > .8) mark('omen', age); if (K.gold > .8) mark('gold', age); if (K.rib > .8) mark('rib', age); if (K.sky > .9) mark('sky', age);
        if (K.pose && poseFirst == null) poseFirst = { age, x: Math.round(K.pose.x / S.W * 100), y: Math.round(K.pose.y / S.yM * 100) };
        if (K.pose) poseNear = Math.max(poseNear, K.pose.near); maxStill = Math.max(maxStill, K.still); }
      if (t0 != null && !a && log.end == null) { log.end = +(i / 30 - t0).toFixed(1); log.skyAtEnd = +K.sky.toFixed(2); }
    }
    return { log, minN: +minN.toFixed(2), poseFirst, poseNear: +poseNear.toFixed(2), maxStill: +maxStill.toFixed(2), ch: T.NCH.cur && T.NCH.cur.kind, letter: T.NX.letterDue.includes('kun') || !!T.NX.lettersSent.kun, on: K.on, ff: K.ff.length }; });
  const L = r.log;
  ok(L.omen < 8 && L.gold > 8.5 && L.gold < 11 && L.rib > 10 && L.rib < 15 && L.sky > 16 && L.sky < 26, '那一夜的前奏：先静，再流萤流金、丝带，然后海面隐去 ' + JSON.stringify(r));
  ok(r.poseFirst && r.poseFirst.age > 24 && r.poseFirst.x > 70 && r.poseFirst.y > 80 && r.poseNear > .95, '鲲在前奏之后，从右边的海平线下面浮上来，再从头顶过去 ' + JSON.stringify(r.poseFirst));
  ok(r.minN > .9, '鲲的夜一直是夜 ' + r.minN);
  ok(L.end > 85 && L.skyAtEnd < .05 && !r.on && !r.ff, '鲲走了，海面回来，金光、萤火都收了 ' + JSON.stringify(L));
  ok(r.letter, '鲲过去以后，海会来一封信 ' + JSON.stringify(r));
  ok(!p.errs.length, '没有报错 ' + p.errs.join(' | '));
  await p.context().close();
  // 11. Dock 里的「偶遇 · 鲲」：在黄昏里点，也会先变成夜；#kun 直接是那一夜
  p = await page('');
  r = await p.evaluate(() => { const T = __T(), S = T.S; S.travel = S.camera = 0.3 * T.G(); T.devEncounter('kun'); for (let i = 0; i < 30 * 30; i++) T.update(1 / 30);
    return { mode: S.timeMode, nightF: +S.nightF.toFixed(2), kind: T.NX.active && T.NX.active.kind, gold: +T.KUN.gold.toFixed(2) }; });
  ok(r.mode === 'night' && r.nightF > .9 && r.kind === 'kun' && r.gold > .9, 'Dock 的「偶遇 · 鲲」：先入夜，再来 ' + JSON.stringify(r));
  await p.context().close();
  p = await page('#kun'); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const T = __T(), S = T.S; for (let i = 0; i < 20 * 30; i++) T.update(1 / 30); return { kind: T.NX.active && T.NX.active.kind, nightF: +S.nightF.toFixed(2), q: +T.nightLoopQ(T.townPos()).toFixed(2), ch: T.NCH.cur && T.NCH.cur.kind }; });
  ok(r.kind === 'kun' && r.nightF > .9 && r.ch === 'kun', '#kun：开出月见的那一夜 ' + JSON.stringify(r));
  // 12. 时间停在「夜」：鲲也会来
  r = await p.evaluate(() => { const T = __T(), S = T.S, NX = T.NX; NX.active = null; NX.lastEnd = -1e9; S.timeMode = 'night'; S.travel = S.camera = 1.2 * T.G(); S.tramMode = 'cruising'; S.tramV = .205; S.stopAt = Infinity; __E('NX.kunT = 1;');
    let seen = null; for (let i = 0; i < 60 * 30 && !seen; i++) { T.update(1 / 30); if (NX.active) seen = NX.active.kind; } return { seen }; });
  ok(r.seen === 'kun', '时间停在夜：鲲也会来 ' + JSON.stringify(r));
  ok(!p.errs.length, '没有报错 ' + p.errs.join(' | '));
  await p.context().close();
  p = await page('');
  // 9. 「时间」选了夜：一直是夜
  p = await page('');
  const nm = await p.evaluate(() => { const T = __T(); T.S.timeMode = 'night'; for (let i = 0; i < 600; i++) T.update(1 / 30); return T.S.nightF; });
  ok(nm > 0.95, '时间选了夜，就一直是夜 ' + nm.toFixed(2));
  ok(!p.errs.length, '没有报错 ' + p.errs.join(' | '));
  await b.close();
})();
