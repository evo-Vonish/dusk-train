// 第八版：鲲从头顶过的时候揭它（揭卡要按高倍率重画那一小块：镜子、拍的那张天也得对）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/GL Driver/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/test.html'); await p.waitForTimeout(1500);
  const h = await p.evaluate(() => { __E(`S.weather='clear'; S.timeMode='journey'; S.nightF=1; S.travel=S.camera=2.16*G(); S.station=2; S.tramMode='cruising'; S.tramV=CRUISE; S.tramTimer=Infinity; S.stopAt=Infinity; NCH.done.ev0=true; NX.seasonForce=2; NCH.cur={kind:'kun',key:'ev0',phase:'hold',t:0}; NCH.k=1; beginEncounter('kun','x');`);
    const T = __T(); T.S.paused = true; for (let i = 0; i < 44 * 30; i++) T.update(1 / 30); T.S.paused = false; T.draw();
    const q = T.PEEL.hits.find(q => q.key === 'kun'); const j = T.PEEL.hits.filter(q => q.key === 'jelly').length; return q && { x: q.x + q.w / 2, y: q.y + q.h / 2, jelly: j, sky: T.KUN.sky }; });
  console.log('kun hit', JSON.stringify(h));
  if (h) { await p.mouse.click(h.x, Math.min(h.y, 300)); await p.waitForTimeout(1600); await p.screenshot({ path: 'shots/kun8-peel.png' });
    console.log(await p.evaluate(() => ({ open: __T().PEEL.open, name: document.getElementById('card-name').textContent, text: document.getElementById('card-text') ? document.getElementById('card-text').textContent.slice(0, 60) : '' }))); }
  console.log('errors:', errs.join(' | ') || 'none');
  await b.close();
})();
