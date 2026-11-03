// 四季：节气章会盖上、花吹雪会来、中秋的月是圆的、收集簿里有节气一栏，全程没有报错
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  // 1. 早春出发，开着跑三站：节气一个个盖上，花吹雪至少来一次
  await page.goto('file://' + process.cwd() + '/test.html?s0=0.05');
  await page.waitForTimeout(1500);
  const r1 = await page.evaluate(() => {
    const T = __T(), S = T.S; S.paused = true; S.tramMode = 'cruising'; S.tramV = 0.205; S.tramTimer = Infinity; S.stopAt = Infinity;
    let storms = 0, wasStorm = false, terms = new Set();
    for (let i = 0; i < 30 * 160; i++) { T.update(1 / 30); const b = !!T.NX.blossomStorm; if (b && !wasStorm) storms++; wasStorm = b; if (i % 30 === 0) T.draw(); }
    for (const k of Object.keys(T.store.got)) if (k.startsWith('term-')) terms.add(k);
    return { stations: (S.travel / T.G()).toFixed(2), terms: [...terms].sort(), storms, season: T.NX.seasonForce };
  });
  console.log('spring run', JSON.stringify(r1));
  // 2. 秋天经过月见的夜：月亮是圆的
  await page.goto('about:blank'); await page.goto('file://' + process.cwd() + '/test.html?s0=1.83#st=2');
  await page.waitForTimeout(1500);
  const r2 = await page.evaluate(() => { const T = __T(), S = T.S; S.paused = true; S.timeMode = 'night'; S.nightF = 1; for (let i = 0; i < 30 * 100; i++) T.update(1 / 30); T.draw(); return { lit: T.SKY2.moonLit.toFixed(3), moonA: T.SKY2.moonA.toFixed(2), hits: T.PEEL.hits.filter(h => ['midautumn', 'dango', 'fullmoon', 'moon'].includes(h.key)).map(h => h.key) }; });
  console.log('mid-autumn', JSON.stringify(r2));
  // 3. 收集簿里有「节气」一栏，盖过的是红章
  await page.evaluate(() => { const T = __T(); T.S.paused = false; });
  await page.click('#album-open'); await page.waitForTimeout(500);
  await page.click('#album-tabs [data-rank="special"]'); await page.waitForTimeout(400);
  const r3 = await page.evaluate(() => { const secs = [...document.querySelectorAll('#album-body section')].map(s => (s.querySelector('h3') || s).textContent.slice(0, 12)); const seals = document.querySelectorAll('#album-body .term-seal').length; return { secs, seals }; });
  console.log('album', JSON.stringify(r3));
  await page.evaluate(() => { const el = [...document.querySelectorAll('#album-body .term-seal')].pop(); if (el) el.scrollIntoView(); });
  await page.waitForTimeout(300); await page.screenshot({ path: 'shots/album-terms.png' });
  const got = await page.$('#album-body .slot.got .term-seal');
  if (got) { await got.click(); await page.waitForTimeout(900); await page.screenshot({ path: 'shots/term-card.png' }); console.log('term card', await page.evaluate(() => document.getElementById('card-name').textContent)); }
  console.log('errors:', errs.length ? errs.join(' || ') : 'none');
  await browser.close();
})();
