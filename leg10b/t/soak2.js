const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const phone = process.argv[2] === 'phone';
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('file://' + process.cwd() + '/test.html');
  await page.waitForTimeout(800);
  await page.evaluate(() => { __T().DEV.speed = 8; });
  const seen = new Set(); let peels = 0, lastP = -1, stuck = 0;
  const minutes = +(process.argv[3] || 4);
  const t0 = Date.now();
  while (Date.now() - t0 < minutes * 60000) {
    await page.waitForTimeout(350);
    const st = await page.evaluate(() => {
      const T = __T(), S = T.S;
      // 自动乘务：有人要下或有人在等，就靠站；停稳、上下完了就出发
      if (S.tramMode === 'cruising' && !isFinite(S.stopAt)) { const n = Math.floor(S.travel / T.G() + 1e-6) + 1; if ((T.PX.riders.some(r => r.dest === n) || T.waitAt(n).length) && n * T.G() - S.travel > 0.9) T.journey(); }
      if (S.tramMode === 'parked' && S.station !== 9 && !T.PEEL.open && !T.PX.walkers.some(w => w.mode === 'board' && !w.done) && !window.__dep) window.__dep = setTimeout(() => { window.__dep = 0; const T2 = __T(); if (T2.S.tramMode === 'parked' && !T2.PEEL.open) T2.journey(); }, 1500);
      const fresh = T.PEEL.hits.filter(h => h.key !== '__tram' && !T.hitGot(h) && h.x > 0 && h.x + h.w < innerWidth && h.y > 0 && h.y + h.h < innerHeight);
      return { toast: document.getElementById("toast").textContent, mode: S.tramMode, p: T.townPos(), open: T.PEEL.open, fresh: fresh.map(h => ({ key: h.key, x: h.x + h.w / 2, y: h.y + h.h / 2 })), count: T.store.count, pts: T.store.points, km: T.store.km, night: S.nightF, day: S.dayF, enc: T.NX.active && T.NX.active.kind };
    });
    if (st.open) { await page.waitForTimeout(500); await page.click('#card-ok').catch(() => {}); continue; }
    if (process.env.PEEL && st.fresh.length && Math.random() < 0.45) {
      const h = st.fresh[Math.floor(Math.random() * st.fresh.length)];
      if (phone) await page.touchscreen.tap(h.x, h.y); else await page.mouse.click(h.x, h.y);
      peels++; seen.add(h.key);
    }
    if (Math.abs(st.p - lastP) < 1e-4) stuck++; else stuck = 0;
    lastP = st.p;
    if (stuck > 60) { console.log('STUCK at', st.p); await page.evaluate(() => { const T = __T(); if (T.S.tramMode === 'parked') T.journey(); }); stuck = 0; }
    if (st.toast !== globalThis.__lt) { globalThis.__lt = st.toast; console.log(st.mode + " " + st.toast); } if (0) console.log(`p=${st.p.toFixed(2)} n=${st.night.toFixed(2)} d=${st.day.toFixed(2)} enc=${st.enc} got=${st.count} pts=${st.pts} km=${st.km.toFixed(1)}`);
  }
  const fin = await page.evaluate(() => { const T = __T(); return { got: Object.keys(T.store.got), ls: (localStorage.getItem('dusktrain.collection.v1') || '').length, p: T.townPos() }; });
  console.log('peels tried', peels, 'collected', fin.got.length, 'ls bytes', fin.ls, 'end p', fin.p.toFixed(2));
  console.log(fin.got.join(' '));
  console.log('errors:', errs.length ? errs.slice(0, 20).join('\n') : 'none');
  await browser.close();
})();
