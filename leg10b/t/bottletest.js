const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const phone = process.argv[2] === 'phone';
  const vp = phone ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { width: 1440, height: 900, deviceScaleFactor: 2 };
  const tag = phone ? 'phone' : 'desk';
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.goto('file://' + process.cwd() + '/test.html');
  await page.waitForTimeout(1500);
  const tap = async (x, y) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  for (let round = 0; round < 3; round++) {
    await page.evaluate(() => __T().devEncounter('bottle'));
    let h = null;
    for (let i = 0; i < 60 && !h; i++) { await page.waitForTimeout(250); await page.evaluate(() => { const T = __T(); if (T.bottle && !T.bottle.placed) { T.bottle.x = innerWidth * (0.3 + Math.random() * 0.4); T.bottle.placed = true; } }); h = await page.evaluate(() => { const T = __T(); const h = T.PEEL.hits.find(q => q.key === 'bottle'); return h && h.x > 30 && h.x < innerWidth - 60 && !T.hitGot(h) ? { x: h.x + h.w / 2, y: h.y + h.h / 2 } : null; }); }
    console.log('bottle at', JSON.stringify(h));
    if (!h) break;
    await tap(h.x, h.y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `shots/${tag}-bottle-${round}.png` });
    console.log(await page.evaluate(() => document.getElementById('card-name').textContent + ' | ' + document.getElementById('card-text').textContent));
    await page.click('#card-ok');
    await page.waitForTimeout(800);
    await page.evaluate(() => { const T = __T(); if (T.bottle) { T.bottle.x = -9999; } });
    await page.waitForTimeout(300);
  }
  await page.click('#album-open');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `shots/${tag}-album-common.png` });
  await page.click('#album-tabs [data-rank="special"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `shots/${tag}-album-special.png` });
  const first = await page.$('#album .slot.got');
  if (first) { await first.click(); await page.waitForTimeout(700); await page.screenshot({ path: `shots/${tag}-album-view.png` }); await page.click('#card-ok'); await page.waitForTimeout(400); }
  await page.click('#album-tabs [data-rank="high"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `shots/${tag}-album-high.png` });
  console.log('errors:', errs.join('\n'));
  await browser.close();
})();
