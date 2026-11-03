// 第四、五版：天的检查——会流、定格时停、没有 WebGL 时是不动的画、WebGL 丢了能接上、白天的云不跟着阵风跳；四季各有一片天，换季两片渗过去
const { chromium } = require('playwright');
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const page = async (q) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
    await p.goto('file://' + process.cwd() + '/test.html' + q); await p.waitForTimeout(1800); return p;
  };
  const skyPix = p => p.evaluate(() => { const T = __T(); T.draw(); const c = document.getElementById('scene'), g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, Math.floor(T.S.yM * T.S.dpr * 0.8)).data; let s = 0; for (let i = 0; i < d.length; i += 97) s += d[i] + d[i + 1] * 3 + d[i + 2] * 7; return s; });
  const step = (p, n) => p.evaluate(n => { const T = __T(); for (let i = 0; i < n; i++) T.update(1 / 30); }, n);
  // 1. 会流
  let p = await page('');
  const st = await p.evaluate(() => ({ ok: __T().SKYGL.ok, t: __T().SKYGL.t }));
  ok(st.ok === true, 'WebGL 天在用：' + JSON.stringify(st));
  const a = await skyPix(p); await step(p, 90); const a2 = await skyPix(p);
  ok(a !== a2, '三秒后天变了（' + a + ' → ' + a2 + '）');
  // 2. 定格时停
  await p.evaluate(() => { const T = __T(); T.FROZEN.age = 5; T.FROZEN.k = 1; });
  const t0 = await p.evaluate(() => __T().SKYGL.t); await step(p, 60);
  const t1 = await p.evaluate(() => { const T = __T(); T.FROZEN.age = 5; return T.SKYGL.t; });
  ok(Math.abs(t1 - t0) < 0.2, '定格的那一会儿，画不流了（t ' + t0.toFixed(2) + ' → ' + t1.toFixed(2) + '）');
  ok(!p.errs.length, '没有报错 ' + p.errs.join(' | '));
  // 3. 丢了 WebGL 再接上
  const lost = await p.evaluate(async () => { const T = __T(); const gl = T.SKYGL.gl, ext = gl.getExtension('WEBGL_lose_context'); if (!ext) return 'no-ext'; ext.loseContext(); await new Promise(r => setTimeout(r, 50)); T.draw(); const mid = T.SKYGL.ok; ext.restoreContext(); await new Promise(r => setTimeout(r, 200)); T.update(1 / 30); T.draw(); return { mid, after: T.SKYGL.ok }; });
  ok(lost === 'no-ext' || lost.after === true, 'WebGL 丢了又回来：' + JSON.stringify(lost));
  ok(!p.errs.length, '丢了 WebGL 也没有报错 ' + p.errs.join(' | '));
  await p.context().close();
  // 4. 没有 WebGL：原来那张画
  p = await page('?nogl');
  const ng = await p.evaluate(() => ({ ok: __T().SKYGL.ok, src: !!__T().SKYGL.src }));
  ok(ng.ok === false && ng.src, '没有 WebGL 时用原来那张画 ' + JSON.stringify(ng));
  const n1 = await skyPix(p); await step(p, 60); const n2 = await skyPix(p);
  ok(Math.abs(n1 - n2) / n1 < 0.002, '没有 WebGL 时画不动（' + n1 + ' / ' + n2 + '）');
  ok(!p.errs.length, '没有报错 ' + p.errs.join(' | '));
  await p.context().close();
  // 5. 白天的云：阵风来了不跳
  p = await page('#noon');
  await p.evaluate(() => { const T = __T(); T.S.gustT = 1e9; T.S.gust = 0; for (let i = 0; i < 60; i++) T.update(1 / 30); });
  const jump = await p.evaluate(() => {
    const T = __T(), S = T.S;
    const offs = () => [S.camera, S.gustI || 0];
    const c0 = document.getElementById('scene'); T.draw(); const g = c0.getContext('2d');
    const row = () => { const d = g.getImageData(0, Math.floor(S.yM * S.dpr * 0.3), c0.width, 1).data; return Array.from(d); };
    const r0 = row(); T.update(1 / 30); T.draw(); const r1 = row();
    S.gust = 1; T.update(1 / 30); T.draw(); const r2 = row();
    const diff = (x, y) => { let s = 0; for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]); return s / x.length; };
    return { calm: diff(r0, r1), gust: diff(r1, r2) };
  });
  ok(jump.gust < Math.max(2, jump.calm * 4), '阵风那一帧，云没有跳（平常 ' + jump.calm.toFixed(2) + '，阵风 ' + jump.gust.toFixed(2) + '）');
  ok(!p.errs.length, '没有报错 ' + p.errs.join(' | '));
  await p.context().close();
  // 6. 第五版：四季各有一片天（春、秋、冬是新画的，夏天是原来那张）
  const skyMean = p => p.evaluate(() => { const T = __T(); T.draw(); const c = document.getElementById('scene'), g = c.getContext('2d'); const h = Math.floor(T.S.yM * T.S.dpr * 0.7); const d = g.getImageData(0, 0, c.width, h).data; const m = [0, 0, 0]; let n = 0; for (let i = 0; i < d.length; i += 4 * 13) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; n++; } return m.map(v => v / n); });
  const means = [];
  for (const [i, tag] of [[0, 'spring'], [1, 'summer'], [2, 'autumn'], [3, 'winter']]) {
    p = await page('#' + tag);
    await step(p, 3);
    const st = await p.evaluate(i => { const T = __T(); T.draw(); return { ready: T.SKY_ART.ready[i], up: T.SKYGL.up[i], pair: T.townSeasons(), w: T.SKYGL.drawnW, day: T.S.dayF }; }, i);
    ok((i === 1 || st.ready) && st.up && st.pair[0] === i, tag + '：那一季的画在用 ' + JSON.stringify(st));
    means.push(await skyMean(p));
    ok(!p.errs.length, tag + '：没有报错 ' + p.errs.join(' | '));
    await p.context().close();
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let minD = 1e9; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) minD = Math.min(minD, dist(means[i], means[j]));
  ok(minD > 12, '四季的天互相不一样（最接近的两季差 ' + minD.toFixed(1) + '）：' + means.map(m => m.map(v => v.toFixed(0)).join('/')).join('  '));
  // 7. 换季：两片天在同一套流动里渗过去
  p = await page('#dusk');
  const mix = await p.evaluate(() => {
    const T = __T(), S = T.S, G = T.G();
    const go = pos => { const cur = T.seasonPos(); S.travel += (((pos - cur) % 4) + 4) % 4 * G * 3; T.update(1 / 30); T.draw(); return { pos: T.seasonPos(), pair: T.townSeasons(), w: T.SKYGL.drawnW }; };
    return [go(2.0), go(2.08), go(3.5)];
  });
  ok(mix[0].pair[2] > 0.3 && mix[0].pair[2] < 0.7 && /^[12]:[12]:/.test(mix[0].w), '秋夏之交，两片天各一半 ' + JSON.stringify(mix[0]));
  ok(mix[1].pair[0] === 2 && mix[1].pair[2] > 0 && mix[1].pair[2] < 0.5, '再往前一点，秋天多一些 ' + JSON.stringify(mix[1]));
  ok(mix[2].pair[0] === 3 && mix[2].pair[2] === 0, '冬天正中只有冬天 ' + JSON.stringify(mix[2]));
  ok(!p.errs.length, '换季：没有报错 ' + p.errs.join(' | '));
  await p.context().close();
  // 8. 没有 WebGL 的换季：两张交叠
  p = await page('?nogl#dusk');
  const still = await p.evaluate(() => {
    const T = __T(), S = T.S, G = T.G();
    const cur = T.seasonPos(); S.travel += (((2.0 - cur) % 4) + 4) % 4 * G * 3; T.update(1 / 30); T.draw();
    return { pair: T.townSeasons(), key: T.SKY_ART.stillKey };
  });
  ok(/^[12]:[12]:0\.[0-9]+/.test(still.key), '没有 WebGL 时，换季是两张交叠 ' + JSON.stringify(still));
  ok(!p.errs.length, '没有 WebGL 的换季：没有报错 ' + p.errs.join(' | '));
  await b.close();
})();
