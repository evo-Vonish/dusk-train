const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ width: 1440, height: 900, d: 2 }, { width: 390, height: 844, d: 3, m: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.d, isMobile: !!vp.m, hasTouch: !!vp.m });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') (/GL Driver Message|GPU stall/.test(m.text()) || errs.push(m.text())); });
    await page.goto('file://' + process.cwd() + '/dusktrain-10.html');
    await page.waitForTimeout(3000);
    // 点站棚中间一带：应当揭下点什么
    const box = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    const x = box.w * (vp.m ? 0.62 : 0.66), y = box.h * (vp.m ? 0.585 : 0.6);
    if (vp.m) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(1700);
    const card = await page.evaluate(() => !document.getElementById('card').hidden && document.getElementById('card-name').textContent);
    if (card) await page.click('#card-ok');
    await page.waitForTimeout(800);
    console.log(vp.width + 'x' + vp.height, 'card:', card, 'hasTestHook:', await page.evaluate(() => typeof window.__T), 'errors:', errs.join(' | ') || 'none');
    await ctx.close();
  }
  await browser.close();
})();
