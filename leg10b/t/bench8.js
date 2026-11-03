// 第八版：鲲的夜，各段的每帧绘制时间（和同一处不来鲲的夜比）。node bench8.js [dpr]
const { chromium } = require('playwright');
(async () => {
  const dpr = +(process.argv[2] || 1);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/test.html'); await p.waitForTimeout(1500);
  const setup = kun => p.evaluate(([kun]) => { __E(`S.weather='clear'; S.timeMode='journey'; S.nightF=1; S.travel=S.camera=2.16*G(); S.station=2; S.tramMode='cruising'; S.tramV=CRUISE; S.tramTimer=Infinity; S.stopAt=Infinity; NCH.done.ev0=true; NX.seasonForce=1; NCH.cur={kind:'kun',key:'ev0',phase:'hold',t:0}; NCH.k=1; if (${kun}) beginEncounter('kun','x'); else { NX.active = null; }`); }, [kun]);
  // 用画面里的时间快进到某个年龄，再实测几秒的绘制
  const measure = async (to, sec) => {
    await p.evaluate(([to]) => { const T = __T(); const a = T.NX.active; let n = 0; while (a && a.age < to && n < 5000) { T.update(1 / 30); n++; } window.__drawMs = 0; window.__drawN = 0; window.__maxDraw = 0; }, [to]);
    await p.waitForTimeout(sec * 1000);
    return p.evaluate(() => ({ ms: +(window.__drawMs / Math.max(1, window.__drawN)).toFixed(2), n: window.__drawN, max: +window.__maxDraw.toFixed(1) }));
  };
  await setup(false);
  const base = await measure(0, 4);
  await setup(true);
  const r = { base, omen: await measure(4, 4), gold: await measure(11, 4), sky: await measure(22, 4), kun: await measure(46, 4), back: await measure(84, 4) };
  console.log('dpr', dpr, JSON.stringify(r), errs.slice(0, 3).join(' | '));
  await b.close();
})();
