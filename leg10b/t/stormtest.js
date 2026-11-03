const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const toasts = [];
  await page.exposeFunction('__toast', s => toasts.push(s));
  await page.goto('file://' + process.cwd() + '/test.html?s0=0.3');
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const T = __T(), S = T.S; S.weather = 'clear'; S.tramMode = 'cruising'; S.tramV = 0.05; S.tramTimer = Infinity; S.stopAt = Infinity; S.paused = false;
    const tEl = document.getElementById('toast'); let last = '';
    let storms = 0, was = false, maxK = 0;
    for (let i = 0; i < 30 * 200; i++) { T.update(1 / 30); const b = T.NX.blossomStorm; if (b && !was) storms++; was = !!b; if (b) maxK = Math.max(maxK, b.k); if (tEl.textContent !== last) { last = tEl.textContent; window.__toast(last); } }
    return { storms, maxK: maxK.toFixed(2), petals: T.NX.petals.length, pos: (S.travel / T.G()).toFixed(2) };
  });
  console.log(JSON.stringify(r)); console.log('toasts:', toasts.join(' | ')); console.log('errors:', errs.join(' | ') || 'none');
  await browser.close();
})();
