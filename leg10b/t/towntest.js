const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const phone = process.argv[3] === 'phone';
  const vp = phone ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { width: 1440, height: 900, deviceScaleFactor: 2 };
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  const hash = process.argv[2] || '#noon';
  await page.goto('file://' + process.cwd() + '/test.html' + hash);
  await page.waitForTimeout(Number(process.argv[4] || 3500));
  await page.evaluate(() => { const T = __T(); T.PEEL.overlay = true; T.S.paused = true; T.invalidate(); });
  await page.waitForTimeout(300);
  const tag = (phone ? 'phone' : 'desk') + '-' + hash.replace('#', '');
  await page.screenshot({ path: `shots/${tag}-hits.png` });
  const keys = await page.evaluate(() => __T().PEEL.hits.map(h => h.key));
  console.log(keys.join(' '));
  const want = process.argv[5];
  if (want) {
    await page.evaluate(() => { const T = __T(); T.PEEL.overlay = false; T.invalidate(); });
    await page.waitForTimeout(200);
    const h = await page.evaluate(k => { const T = __T(); const h = T.PEEL.hits.find(q => q.key === k); return h && { x: h.x + h.w / 2, y: h.y + h.h / 2 }; }, want);
    if (h) { if (phone) await page.touchscreen.tap(h.x, h.y); else await page.mouse.click(h.x, h.y); await page.waitForTimeout(1800); await page.screenshot({ path: `shots/${tag}-${want}.png` }); }
    else console.log('no hit', want);
  }
  console.log('errors:', errs.join('\n'));
  await browser.close();
})();
