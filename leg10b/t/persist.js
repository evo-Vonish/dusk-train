const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + process.cwd() + '/test.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(2500);
  // 1) 键盘：J 选中、Enter 揭下、Enter 收下
  await page.keyboard.press('j');
  await page.waitForTimeout(200);
  const sel = await page.evaluate(() => document.getElementById('toast').textContent);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
  const open1 = await page.evaluate(() => ({ open: __T().PEEL.open, name: document.getElementById('card-name').textContent, focus: document.activeElement && document.activeElement.id }));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  const after1 = await page.evaluate(() => ({ open: __T().PEEL.open, count: __T().store.count }));
  console.log('keyboard:', sel, '|', JSON.stringify(open1), JSON.stringify(after1));
  // 2) C 打开收集簿，Esc 合上
  await page.keyboard.press('c'); await page.waitForTimeout(400);
  const alb = await page.evaluate(() => ({ open: __T().ALBUM.open, paused: __T().S.paused, count: document.getElementById('album-count').textContent }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const alb2 = await page.evaluate(() => ({ open: __T().ALBUM.open, paused: __T().S.paused }));
  console.log('album:', JSON.stringify(alb), JSON.stringify(alb2));
  // 3) 里程走一点，然后重新载入：收集簿和里程都还在
  await page.evaluate(() => { __T().DEV.speed = 8; __T().journey(); });
  await page.waitForTimeout(4000);
  const before = await page.evaluate(() => ({ km: __T().store.km, got: Object.keys(__T().store.got) }));
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.reload(); await page.waitForTimeout(2500);
  const afterR = await page.evaluate(() => ({ km: __T().store.km, got: Object.keys(__T().store.got), dash: document.getElementById('km-v').textContent, album: document.getElementById('album-v').textContent }));
  console.log('before reload', JSON.stringify(before), '\nafter reload', JSON.stringify(afterR));
  // 4) 揭过的东西再点：只翘一下角
  const key = afterR.got[0];
  const h = await page.evaluate(k => { const T = __T(); const h = T.PEEL.hits.find(q => q.key === k); return h && { x: h.x + h.w / 2, y: h.y + h.h / 2 }; }, key);
  if (h) { await page.mouse.click(h.x, h.y); await page.waitForTimeout(300); console.log('nudge:', await page.evaluate(() => ({ open: __T().PEEL.open, toast: document.getElementById('toast').textContent }))); }
  else console.log('collected item', key, 'not on screen now');
  // 5) IndexedDB 里有大图
  console.log('idb:', await page.evaluate(() => new Promise(res => { const r = indexedDB.open('dusktrain', 1); r.onsuccess = () => { const q = r.result.transaction('img').objectStore('img').getAllKeys(); q.onsuccess = () => res(q.result); }; r.onerror = () => res('err'); })));
  console.log('errors:', errs.join('\n') || 'none');
  // 6) 减少动态：画面默认暂停，揭卡不飞，直接淡入
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const p2 = await ctx2.newPage();
  await p2.goto('file://' + process.cwd() + '/test.html'); await p2.waitForTimeout(1500);
  const h2 = await p2.evaluate(() => { const T = __T(); const h = T.PEEL.hits.find(q => q.key === 'room' && !T.hitGot(q)) || T.PEEL.hits.find(q => q.key !== '__tram' && !T.hitGot(q)); return h && { k: h.key, x: h.x + h.w / 2, y: h.y + h.h / 2, paused: T.S.paused }; });
  if (h2) { await p2.mouse.click(h2.x, h2.y); await p2.waitForTimeout(600); console.log('reduced:', JSON.stringify(h2), await p2.evaluate(() => ({ open: __T().PEEL.open, sheetHidden: document.getElementById('peel-sheet').hidden }))); await p2.screenshot({ path: 'shots/reduced-card.png' }); }
  await browser.close();
})();
