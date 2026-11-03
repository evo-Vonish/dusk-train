// 沿着一场戏的时间踩点：在每个镜头开始的时刻（或 --at 指定的时刻）出一张全景，并记下画里每件东西的位置
//   node tscout.js I            → tscout/I/<秒>.jpg + hits.json
//   node tscout.js K --at=150,152,154
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const argv = {}; const pos = [];
for (const a of process.argv.slice(2)) { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); if (m) argv[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const SC = require(path.resolve(argv.scenes || './scenes.js'));
const FPS = require('./mvconf.json').FPS, fr = t => Math.round(t * FPS);
const src = f => (typeof f === 'function' ? f.toString() : String(f));
(async () => {
  const browser = await chromium.launch();
  for (const id of pos) {
    const scene = SC.scenes.find(s => s.id === id); if (!scene) { console.log('no scene', id); continue; }
    const out = path.join('kscout', id); fs.mkdirSync(out, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript({ content: 'window.__FPS = ' + FPS + '; window.__OUTK = 1;' });
    for (const f of ['vclock.js', 'mvlib.js', 'mvdrive.js']) await ctx.addInitScript({ path: path.resolve(f) });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('pageerror', e.message));
    await page.goto('file://' + path.resolve('mv.html') + '?seed=' + (scene.seed || 7) + (scene.hash || ''));
    await page.waitForFunction(() => window.__T && window.__mv);
    await page.evaluate(([s]) => (0, eval)('(' + s + ')')(__T(), __fx), [src(scene.init || '() => {}')]);
    const F0 = fr(scene.t0), P = Math.round((scene.preroll || 0) * FPS);
    const events = (scene.events || []).map(([t, fn, args, label]) => ({ f: fr(t), src: src(fn), args: args === undefined ? null : args, label: label || '' }));
    const shots = scene.shots.map((s, i) => ({ id: scene.id + (i + 1), f0: fr(s.t0), f1: fr(s.t1), mode: 'cam', cam: s.cam }));
    await page.evaluate(cfg => __mv.setup(cfg), { frame0: F0 - P - 1, events, shots: shots.map(s => ({ id: s.id, f0: s.f0, f1: s.f1, mode: s.mode, cam: s.cam })) });
    const times = argv.at ? String(argv.at).split(',').map(Number) : scene.shots.map(s => s.t0);
    const all = {};
    for (const t of times.sort((a, b) => a - b)) {
      const f = fr(t);
      const info = await page.evaluate(([f]) => {
        __mv.runTo(f, 'cam'); const T = __T(); T.draw();
        const r = v => Math.round(v);
        const P = T.KUN.pose; return P ? [['kun', r(P.x), r(P.y), r(P.L), 0]] : [];
      }, [f]);
      const data = await page.evaluate(() => __MV.renderRect(0, 0, 1280, 720, 1).toDataURL('image/jpeg', 0.82));
      fs.writeFileSync(path.join(out, t.toFixed(2) + '.jpg'), Buffer.from(data.split(',')[1], 'base64'));
      all[t.toFixed(2)] = info;
      console.log(id, t.toFixed(2), info.map(h => `${h[0]}(${h[1]},${h[2]}) L=${h[3]}`).join(' '));
    }
    fs.writeFileSync(path.join(out, 'hits.json'), JSON.stringify(all));
    await ctx.close();
  }
  await browser.close();
})();
