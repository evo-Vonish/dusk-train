const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext()).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/test.html'); await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    await __E('setSound(true, false)');
    await new Promise(r => setTimeout(r, 400));
    return __E(`(() => { const st = actx && actx.state; const ok = soundOk(); kunShimmer(); kunBloom(); kunPad(); kunReturn(); kunSong('low', .5); kunSong('high', .3);
      S.weather='clear'; S.timeMode='night'; S.nightF=1; beginEncounter('kun','x'); for (let i = 0; i < 30 * 30; i++) update(1 / 30); return { st, ok, cue: KUN.cue, hush: +KUN.hush.toFixed(2) }; })()`);
  });
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(r), 'errors:', errs.join(' | ') || 'none');
  await b.close();
})();
