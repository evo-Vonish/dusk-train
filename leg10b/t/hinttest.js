const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })).newPage();
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('file://' + process.cwd() + '/test.html');
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const T = __T(); T.PEEL.glintT = 0; });
  await page.waitForTimeout(700);
  const g = await page.evaluate(() => __T().PEEL.glint);
  console.log('glint', JSON.stringify(g));
  await page.screenshot({ path: 'shots/glint.png', clip: { x: Math.max(0, g.x + g.w - 60), y: Math.max(0, g.y - 60), width: 120, height: 120 } });
  await page.keyboard.press('j'); await page.keyboard.press('j'); await page.waitForTimeout(300);
  const f = await page.evaluate(() => __T().PEEL.focus);
  await page.screenshot({ path: 'shots/focus.png', clip: { x: Math.max(0, f.x - 40), y: Math.max(0, f.y - 40), width: f.w + 80, height: f.h + 80 } });
  console.log('focus', f.key);
  // passenger card
  const h = await page.evaluate(() => { const T = __T(); const h = T.PEEL.hits.find(q => q.key.startsWith('pax-')); return h && { x: h.x + h.w / 2, y: h.y + h.h / 2, k: h.key }; });
  if (h) { await page.mouse.click(h.x, h.y); await page.waitForTimeout(1700); await page.screenshot({ path: 'shots/paxcard.png' }); console.log('pax', h.k, await page.evaluate(() => document.getElementById('card-dest').textContent)); }
  await browser.close();
})();
