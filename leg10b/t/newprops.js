// 新加的车站物件：每一样都能在它的站上揭下来，卡片名字对，揭完存进收集簿
const { chromium } = require('playwright');
const want = [['#st=2', 'pampas', '芒草'], ['#st=3', 'tidepole', '潮位尺'], ['#st=4', 'capelight', '灯岬的灯塔'], ['#st=5', 'bellbuoy', '浮标钟'], ['#st=6', 'windsock', '风向袋'], ['#st=6', 'pinwheel', '纸风车'], ['#st=7', 'lightjars', '光瓶']];
(async () => {
  const browser = await chromium.launch();
  const VPS = [{ width: 1440, height: 900, deviceScaleFactor: 2 }, { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, { width: 844, height: 390, deviceScaleFactor: 3, isMobile: true, hasTouch: true }].filter((v, i) => !process.argv[2] || process.argv[2].split(',').includes(String(i)));
  for (const vp of VPS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const res = [];
    for (const [hash, key, name] of want) {
      await page.goto('about:blank'); await page.goto('file://' + process.cwd() + '/test.html' + hash);
      await page.waitForTimeout(2500);
      const h = await page.evaluate(k => { const T = __T(); const L = T.PEEL.hits.filter(q => q.key === k); const q = L.find(q => T.pickHit(q.x + q.w / 2, q.y + q.h / 2) === q) || L[0]; return q && { x: q.x + q.w / 2, y: q.y + q.h / 2, top: T.pickHit(q.x + q.w / 2, q.y + q.h / 2).key, w: q.w, h: q.h }; }, key);
      if (!h) { res.push(key + ':MISSING'); continue; }
      if (vp.hasTouch) await page.touchscreen.tap(h.x, h.y); else await page.mouse.click(h.x, h.y);
      await page.waitForTimeout(1600);
      const st = await page.evaluate(() => ({ open: __T().PEEL.open, name: document.getElementById('card-name').textContent }));
      if (st.open) { await page.screenshot({ path: `shots/newprop-${vp.width}-${key}.png` }); await page.click('#card-ok'); await page.waitForTimeout(600); }
      const got = await page.evaluate(k => !!__T().store.got[k], key);
      res.push(key + (st.open && st.name.includes(name) && got ? ':ok' : ':FAIL(' + JSON.stringify({ top: h.top, open: st.open, name: st.name, got }) + ')') + ' ' + Math.round(h.w) + 'x' + Math.round(h.h));
    }
    const nCards = await page.evaluate(() => __T().CARDS.length);
    console.log(vp.width + 'x' + vp.height, res.join(' | '), 'cards', nCards, 'errors:', errs.length ? errs.join(' || ') : 'none');
    await ctx.close();
  }
  await browser.close();
})();
