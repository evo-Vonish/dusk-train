const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('file://' + process.cwd() + '/test.html');
  await page.waitForTimeout(1000);
  await page.evaluate(() => { __T().DEV.speed = 8; });
  let lastToast = '';
  const log = [];
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(400);
    const s = await page.evaluate(() => { const T = __T(); const S = T.S; return { p: +T.townPos().toFixed(2), mode: S.tramMode, st: S.station, night: +S.nightF.toFixed(2), day: +S.dayF.toFixed(2), riders: T.PX.riders.map(r => r.kind + '>' + r.dest).join(','), pts: T.store.points, km: +T.store.km.toFixed(1), toast: document.getElementById('toast').textContent, next: document.getElementById('dash-next').textContent + document.getElementById('dash-off').textContent, stopAt: isFinite(S.stopAt) ? Math.round(S.stopAt / T.G()) : -1 }; });
    if (s.toast !== lastToast) { log.push(`[${s.p}G ${s.mode} st${s.st}] toast: ${s.toast}`); lastToast = s.toast; }
    // auto-player: when riders want to get off at next station, request stop; when parked (not at start) and boarding done, depart
    await page.evaluate(() => {
      const T = __T(), S = T.S;
      if (S.tramMode === 'cruising' && !isFinite(S.stopAt)) { const n = Math.floor(S.travel / T.G() + 1e-6) + 1; const wantOff = T.PX.riders.some(r => r.dest === n); const waiting = T.waitAt(n).length; if ((wantOff || waiting) && (n * T.G() - S.travel) > 0.9) T.journey(); }
      if (S.tramMode === 'parked' && S.station > 0 && S.station !== 9 && !T.PX.walkers.some(w => w.age < (w.dur || 0) && w.mode === 'board' && !w.done) && !window.__dep) { window.__dep = setTimeout(() => { window.__dep = 0; if (__T().S.tramMode === 'parked') __T().journey(); }, 2500); }
    });
    if (i % 25 === 0) log.push(JSON.stringify(s));
    if (s.p > 6.2) break;
  }
  console.log(log.join('\n'));
  await page.screenshot({ path: 'shots/flow-end.png' });
  console.log('errors:', errs.join('\n'));
  await browser.close();
})();
