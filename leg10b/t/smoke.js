const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const out = process.argv[2] || 'shots';
  for (const [name, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.goto('file://' + process.cwd() + '/test.html');
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `${out}/${name}-start.png` });
    const info = await page.evaluate(() => { const T = __T(); return { frames: __frames, hits: T.PEEL.hits.map(h => h.key + '@' + Math.round(h.x) + ',' + Math.round(h.y) + ' ' + Math.round(h.w) + 'x' + Math.round(h.h)), riders: T.PX.riders.length, walkers: T.PX.walkers.length, waiting: T.waitAt(0).length, mode: T.S.tramMode }; });
    console.log(name, JSON.stringify(info, null, 1));
    console.log('errors:', errs.join('\n'));
    await ctx.close();
  }
  await browser.close();
})();
