// 测每一季的天流得有多明显：钉住一季、黄昏，隔 1 秒截天，算光流
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  for (const k of [0, 1, 2, 3]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); p.on('pageerror', e => console.log('err', e.message));
    await p.goto('file://' + process.cwd() + '/test.html'); await p.waitForTimeout(1500);
    await p.evaluate(k => { const T = __T(); T.NX.seasonForce = k; T.S.timeMode = 'dusk'; T.S.nightF = 0; T.S.weather = 'clear'; T.S.rainI = 0; T.S.gustT = 1e9; T.S.gust = 0; T.S.tramTimer = Infinity; }, k);
    for (let i = 0; i < 4; i++) {
      await p.evaluate(() => { const T = __T(); for (let j = 0; j < 30; j++) T.update(1 / 30); T.draw(); });
      const shot = await p.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 380 } });
      fs.writeFileSync(`${OUT}/s${k}_${i}.png`, shot);
    }
    await ctx.close();
  }
  await b.close();
})();
