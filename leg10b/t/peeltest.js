const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const vp = process.argv[2] === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { width: 1440, height: 900, deviceScaleFactor: 2 };
  const tag = process.argv[2] || 'desk';
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.goto('file://' + process.cwd() + '/test.html');
  await page.waitForTimeout(3000);
  const want = process.argv[3] || 'cat';
  const h = await page.evaluate(k => { const T = __T(); const h = T.PEEL.hits.find(q => q.key === k) || T.PEEL.hits.find(q => q.key.startsWith(k)); return h && { key: h.key, x: h.x + h.w / 2, y: h.y + h.h / 2 }; }, want);
  console.log('target', JSON.stringify(h));
  if (!h) { console.log(await page.evaluate(() => __T().PEEL.hits.map(h => h.key).join(' '))); await browser.close(); return; }
  if (vp.hasTouch) await page.touchscreen.tap(h.x, h.y); else await page.mouse.click(h.x, h.y);
  for (const [t, n] of [[180, 'a'], [420, 'b'], [700, 'c'], [1500, 'd']]) { await page.waitForTimeout(t - (n === 'a' ? 0 : 0)); await page.screenshot({ path: `shots/${tag}-peel-${n}.png` }); }
  const st = await page.evaluate(() => { const T = __T(); return { open: T.PEEL.open, paused: T.S.paused, got: Object.keys(T.store.got), name: document.getElementById('card-name').textContent }; });
  console.log(JSON.stringify(st));
  await page.click('#card-ok');
  await page.waitForTimeout(250); await page.screenshot({ path: `shots/${tag}-peel-e.png` });
  await page.waitForTimeout(900); await page.screenshot({ path: `shots/${tag}-peel-f.png` });
  const st2 = await page.evaluate(() => { const T = __T(); return { open: T.PEEL.open, paused: T.S.paused, count: T.store.count, ls: (localStorage.getItem('dusktrain.collection.v1') || '').length }; });
  console.log(JSON.stringify(st2));
  // tap again: should nudge
  if (vp.hasTouch) await page.touchscreen.tap(h.x, h.y); else await page.mouse.click(h.x, h.y);
  await page.waitForTimeout(300); await page.screenshot({ path: `shots/${tag}-peel-g.png` });
  console.log('toast:', await page.evaluate(() => document.getElementById('toast').textContent));
  console.log('errors:', errs.join('\n'));
  await browser.close();
})();
