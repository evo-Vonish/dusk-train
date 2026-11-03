const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const hashes = ['', '#town', '#noon', '#after', '#sunset', '#fireworks', '#fullmoon', '#galaxy', '#meteor', '#storm', '#fog', '#lanterns', '#kun', '#whale', '#spring', '#summer', '#autumn', '#winter', '#st=3', '#st=8', '#st=12', '#dev'];
  for (const vp of [{ width: 1280, height: 800, deviceScaleFactor: 1 }, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errs.push(m.text()); });
    let n = 0;
    for (const h of hashes) {
      await page.goto('file://' + process.cwd() + '/test.html' + h);
      await page.evaluate(() => { __T().DEV.speed = 3; });
      await page.waitForTimeout(2200);
      // 每个场景都揭一样东西（如果有）
      const hit = await page.evaluate(() => { const T = __T(); const c = T.PEEL.hits.filter(q => q.key !== '__tram' && !T.hitGot(q) && T.pickHit(q.x + q.w / 2, q.y + q.h / 2) === q && q.x > 0 && q.y > 0 && q.x + q.w < innerWidth); const q = c[Math.floor(Math.random() * c.length)]; return q && { x: q.x + q.w / 2, y: q.y + q.h / 2, k: q.key }; });
      if (hit) { if (vp.hasTouch) await page.touchscreen.tap(hit.x, hit.y); else await page.mouse.click(hit.x, hit.y); await page.waitForTimeout(1500); const open = await page.evaluate(() => __T().PEEL.open); if (open) { await page.click('#card-ok'); n++; } await page.waitForTimeout(500); }
    }
    console.log(vp.width + 'x' + vp.height, 'peeled', n, 'of', hashes.length, 'errors:', errs.length ? errs.slice(0, 8).join(' || ') : 'none');
    await ctx.close();
  }
  await browser.close();
})();
