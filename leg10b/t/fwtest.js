const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('file://' + process.cwd() + '/test.html' + (process.argv[2] || '#fireworks'));
  await page.waitForTimeout(1000);
  const prefix = process.argv[3] || 'fw-';
  await page.evaluate(() => { __T().DEV.speed = 3; });
  const got = [];
  for (let i = 0; i < 160 && got.length < (+process.argv[4] || 3); i++) {
    await page.waitForTimeout(200);
    const h = await page.evaluate(p => { const T = __T(); if (T.PEEL.open) return 'open'; const h = T.PEEL.hits.find(q => q.key.startsWith(p) && !T.hitGot(q)); return h ? { key: h.key, x: h.x + h.w / 2, y: h.y + h.h / 2 } : null; }, prefix);
    if (h === 'open') { await page.waitForTimeout(400); await page.screenshot({ path: `shots/fw-${got.length}.png` }); await page.click('#card-ok'); await page.waitForTimeout(700); continue; }
    if (h) { await page.mouse.click(h.x, h.y); got.push(h.key); }
  }
  console.log('peeled', got.join(' '));
  console.log('errors:', errs.join('\n') || 'none');
  await browser.close();
})();
