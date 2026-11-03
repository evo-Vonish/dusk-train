const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('file://' + process.cwd() + '/test.html');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/land-start.png' });
  const h = await page.evaluate(() => { const T = __T(); const q = T.PEEL.hits.find(q => q.key === 'room'); return { x: q.x + q.w / 2, y: q.y + q.h / 2 }; });
  await page.touchscreen.tap(h.x, h.y); await page.waitForTimeout(1800);
  await page.screenshot({ path: 'shots/land-card.png' });
  await page.click('#card-ok'); await page.waitForTimeout(900);
  await page.click('#album-open'); await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/land-album.png' });
  await browser.close();
})();
