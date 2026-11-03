const { chromium } = require('playwright');
const path = require('path');
const PROD = 'file://' + path.resolve(__dirname, '../../index.html');   // 仓库根目录的成品
(async () => {
  const b = await chromium.launch();
  for (const [vp, hash] of [[{ width: 1440, height: 900 }, ''], [{ width: 1440, height: 900 }, '#kun'], [{ width: 390, height: 844 }, '#kun']]) {
    const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: 2 })).newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver|GPU stall/.test(m.text())) errs.push(m.text()); });
    await p.goto(PROD + hash); await p.waitForTimeout(9000);
    await p.screenshot({ path: `shots/prod8-${vp.width}${hash.replace('#', '-')}.png` });
    console.log(vp.width, hash || '(start)', 'title:', await p.title(), 'toast:', await p.evaluate(() => (document.getElementById('toast') || {}).textContent), 'errors:', errs.join(' | ') || 'none');
  }
  await b.close();
})();
