// 快照：node shot8.js out.png "<js run in page before>" seconds [w h]
const { chromium } = require('playwright');
(async () => {
  const [out, pre, sec, w, h] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +(w || 1280), height: +(h || 720) }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/test.html'); await p.waitForTimeout(1200);
  const info = await p.evaluate(([pre, sec]) => {
    const T = __T(), S = T.S; T.S.paused = true;
    (0, eval)('(T, S, G) => {' + pre + '}')(T, S, T.G());
    const n = Math.round(+sec * 30); for (let i = 0; i < n; i++) T.update(1 / 30);
    T.draw();
    return { nightF: +S.nightF.toFixed(2), act: T.NX.active && T.NX.active.kind, age: T.NX.active && +T.NX.active.age.toFixed(1), q: +T.nightLoopQ(T.townPos()).toFixed(2), mode: S.tramMode };
  }, [pre || '', sec || '0']);
  await p.screenshot({ path: out });
  console.log(JSON.stringify(info), errs.slice(0, 3).join(' | '));
  await b.close();
})();
