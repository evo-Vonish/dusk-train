// 踩点：node scout4.js setups.json → scout4/<name>.jpg + 打印每个设定里看得见的东西（热区）
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const only = process.argv[3] ? process.argv[3].split(',') : null;
(async () => {
  const b = await chromium.launch();
  fs.mkdirSync('scout4', { recursive: true });
  for (const st of list) {
    if (only && !only.includes(st.name)) continue;
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript({ content: 'window.__FPS = 60; window.__OUTK = 1;' });
    for (const f of ['vclock.js', 'mvlib.js', 'mvdrive.js']) await ctx.addInitScript({ path: path.resolve(f) });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve('mv.html') + '?seed=' + (st.seed || 7) + (st.hash || ''));
    await p.waitForFunction(() => window.__T && window.__mv);
    const info = await p.evaluate(([init, pre]) => {
      const T = __T(); if (init) (0, eval)('(T, fx) => {' + init + '}')(T, __fx);
      for (let i = 0; i < Math.round(pre * 60); i++) { window.__vstep(1000 / 60, false); T.update(1 / 60); }
      T.draw(); const r = v => Math.round(v);
      const seen = {};
      for (const h of T.PEEL.hits) { if (h.w > 900) continue; const k = h.key; if (!seen[k]) seen[k] = []; if (seen[k].length < 3) seen[k].push([r(h.x + h.w / 2), r(h.y + h.h / 2), r(h.w), r(h.h)]); }
      return { seen, nightF: +T.S.nightF.toFixed(2), dayF: +T.S.dayF.toFixed(2), act: T.NX.active && T.NX.active.kind, p: +T.townPos().toFixed(2), yM: r(T.S.yM) };
    }, [st.init || '', st.preroll || 3]);
    const data = await p.evaluate(() => __MV.renderRect(0, 0, 1280, 720, 1).toDataURL('image/jpeg', 0.8));
    fs.writeFileSync(path.join('scout4', st.name + '.jpg'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('## ' + st.name, JSON.stringify({ n: info.nightF, d: info.dayF, act: info.act, p: info.p, yM: info.yM }));
    console.log('   ' + Object.entries(info.seen).map(([k, v]) => k + '@' + v.map(q => q[0] + ',' + q[1] + (q[2] > 60 ? '(' + q[2] + 'x' + q[3] + ')' : '')).join('/')).join('  '));
    if (errs.length) console.log('   ERR', errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await b.close();
})();
