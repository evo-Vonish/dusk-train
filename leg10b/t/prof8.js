const { chromium } = require('playwright');
(async () => {
  const dpr = +(process.argv[2] || 1);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/test.html'); await p.waitForTimeout(1500);
  const code = `(() => {
    S.paused=true; S.weather='clear'; S.timeMode='journey'; S.nightF=1; S.travel=S.camera=2.16*G(); S.station=2; S.tramMode='cruising'; S.tramV=CRUISE; S.tramTimer=Infinity; S.stopAt=Infinity; NCH.done.ev0=true; NX.seasonForce=1; NCH.cur={kind:'kun',key:'ev0',phase:'hold',t:0}; NCH.k=1; beginEncounter('kun','x');
    for (let i = 0; i < AGE * 30; i++) update(1 / 30);
    draw();
    const time = (fn, n) => { n = n || 20; const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); return +((performance.now() - t0) / n).toFixed(2); };
    return {
      draw: time(() => draw(), 10), skyBack: time(() => drawKunSkyBack(wctx)), horizon: time(() => drawKunHorizon(wctx)), kun: time(() => drawKun(wctx)),
      snap: time(() => kunSkySnap()), mirror: time(() => drawKunMirror()), jelly2: time(() => { JELLY.mul = KUN.sky; drawJellies(); JELLY.mul = 1; }),
      kunSea: time(() => drawKunSea()), gold: time(() => kunGold(ctx, 0)), ffNear: time(() => kunFireflies(ctx, false)),
      ribs: time(() => { for (const R of KUN.ribs) kunRibbon(ctx, R, 1, S.t); }), reflection: time(() => drawReflection()), jelly1: time(() => drawJellies())
    };
  })()`;
  for (const age of [12, 46]) {
    const r = await p.evaluate(([c]) => __E(c), [code.replace('AGE', String(age))]);
    console.log('dpr', dpr, 'age', age, JSON.stringify(r));
    await p.reload(); await p.waitForTimeout(1500);
  }
  if (errs.length) console.log(errs.slice(0, 3));
  await b.close();
})();
