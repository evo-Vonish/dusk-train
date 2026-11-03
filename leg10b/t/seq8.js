// 第八版：鲲的夜，按时间出一串快照。node seq8.js outdir "<pre js in page scope>" t1,t2,... [w h season]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, pre, times, w, h, season] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +(w || 1280), height: +(h || 720) }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/test.html'); await p.waitForTimeout(1200);
  await p.addStyleTag({ content: '#dash,#controls,#cap,#brand,.brand{display:none!important}' });
  await p.evaluate(([pre, season]) => { const T = __T(); T.S.paused = true; if (season) T.NX.seasonForce = +season; __E(pre); }, [pre, season || '']);
  let now = 0; const ts = times.split(',').map(Number), log = [];
  for (const tt of ts) {
    const info = await p.evaluate(([n]) => { const T = __T(), S = T.S; for (let i = 0; i < n; i++) T.update(1 / 30); T.draw();
      const K = T.KUN, a = T.NX.active; return { age: a && +a.age.toFixed(1), kind: a && a.kind, omen: +K.omen.toFixed(2), gold: +K.gold.toFixed(2), rib: +K.rib.toFixed(2), sky: +K.sky.toFixed(2), pose: K.pose ? [Math.round(K.pose.x), Math.round(K.pose.y), Math.round(K.pose.L), +K.pose.a.toFixed(2)] : null, nightF: +S.nightF.toFixed(2), q: +T.nightLoopQ(T.townPos()).toFixed(2), ff: K.ff.length, on: K.on }; }, [Math.round((tt - now) * 30)]);
    now = tt;
    await p.screenshot({ path: `${out}/t${String(tt).padStart(5, '0')}.png` });
    log.push(tt + ' ' + JSON.stringify(info));
  }
  console.log(log.join('\n')); if (errs.length) console.log('ERR', errs.slice(0, 5).join(' | '));
  await b.close();
})();
