const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('file://' + process.cwd() + '/test.html');
  await page.waitForTimeout(2500);
  for (const k of ['station-0', 'room', 'bench', 'chime', 'her', 'lighthouse', 'roofbirds']) {
    const h = await page.evaluate(k => { const T = __T(); const q = T.PEEL.hits.find(q => q.key === k); return q && { x: q.x + q.w / 2, y: q.y + q.h / 2 }; }, k);
    if (!h) continue;
    await page.mouse.click(h.x, h.y); await page.waitForTimeout(1500);
    if (await page.evaluate(() => __T().PEEL.open)) { await page.click('#card-ok'); await page.waitForTimeout(800); }
  }
  await page.click('#album-open'); await page.waitForTimeout(500);
  await page.click('#album-tabs [data-rank="common"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/album-common2.png' });
  await page.evaluate(() => { document.getElementById('album-body').scrollTop = 420; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'shots/album-common3.png' });
  await browser.close();
})();
