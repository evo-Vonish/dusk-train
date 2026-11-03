// 导演：照着 scenes.js 一镜一镜地拍。
//   node render.js                     全部镜头，写 frames/f00000.jpg …
//   node render.js --preview           每个镜头只出首、中、尾三帧（时间照常走），写 preview/
//   node render.js --only=A,C          只拍这几场
//   node render.js --worker=0/2        两个进程分着拍（按帧数均分场次）
//   node render.js --collect           先跑「收集」：把片尾收集簿要用的卡片悄悄收好，存到 album-store.json
//   node render.js --at=12.5,40        预览时另外指定要看的时刻（秒）
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const CONF = require('./mvconf.json');
const FPS = CONF.FPS, VW = CONF.VW, VH = CONF.VH, K = CONF.K;
const argv = {};
for (const a of process.argv.slice(2)) { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); if (m) argv[m[1]] = m[2] === undefined ? true : m[2]; }
const SC = require(path.resolve(argv.scenes || './scenes.js'));
const preview = !!argv.preview;
const OUT = path.resolve(argv.out || (preview ? 'preview' : 'frames'));
fs.mkdirSync(OUT, { recursive: true });
const PAGE = 'file://' + path.resolve(__dirname, 'mv.html');
const fr = t => Math.round(t * FPS);
const src = f => (typeof f === 'function' ? f.toString() : String(f));
const pad = n => String(n).padStart(5, '0');
const logf = fs.createWriteStream(path.resolve(__dirname, 'render-' + (argv.worker ? argv.worker.replace('/', 'of') : 'all') + '.log'), { flags: 'a' });
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };

async function newPage(browser, scene) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: scene.dpr || K });
  await ctx.addInitScript({ content: 'window.__FPS = ' + FPS + '; window.__OUTK = ' + K + ';' });
  await ctx.addInitScript({ path: path.resolve(__dirname, 'vclock.js') });
  if (scene.store) {
    const js = fs.readFileSync(path.resolve(__dirname, scene.store), 'utf8');
    await ctx.addInitScript({ content: 'try { if (!sessionStorage.getItem("mv-seeded")) { localStorage.setItem("dusktrain.collection.v1", ' + JSON.stringify(js) + '); sessionStorage.setItem("mv-seeded", "1"); } } catch (e) {}' });
  }
  await ctx.addInitScript({ path: path.resolve(__dirname, 'mvlib.js') });
  await ctx.addInitScript({ path: path.resolve(__dirname, 'mvdrive.js') });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('  [pageerror]', scene.id, e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log('  [console]', scene.id, m.text().slice(0, 300)); });
  await page.goto(PAGE + '?seed=' + (scene.seed || 7) + (scene.hash || ''));
  await page.waitForFunction(() => window.__T && window.__MV && window.__fx && window.__mv);
  return { ctx, page };
}

// 屏幕镜头的裁切（UI 特写）：{x,y,z} 中心与倍数，可带 to:{…} 推拉
function clipAt(c, p) {
  const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const A = { x: c.x, y: c.y, z: c.z }, Bv = c.to ? Object.assign({}, A, c.to) : A;
  const x = A.x + (Bv.x - A.x) * e, y = A.y + (Bv.y - A.y) * e, z = A.z * Math.pow(Bv.z / A.z, e);
  const w = VW / z, h = VH / z;
  return { x: Math.min(Math.max(x - w / 2, 0), VW - w), y: Math.min(Math.max(y - h / 2, 0), VH - h), width: w, height: h };
}

// 把一场戏的镜头、事件折算成帧号
function plan(scene) {
  const F0 = fr(scene.t0), F1 = fr(scene.t1);
  const P = Math.round((scene.preroll || 0) * FPS);
  const shots = scene.shots.map((s, i) => ({ id: scene.id + (i + 1), f0: fr(s.t0), f1: fr(s.t1), mode: s.mode || (s.cam ? 'cam' : 'screen'), cam: s.cam || null, enter: s.enter ? src(s.enter) : null, enterArgs: s.enterArgs, at: s.at, clip: s.clip || null }));
  for (let i = 0; i < shots.length; i++) {
    if (i === 0 && shots[i].f0 !== F0) throw new Error(scene.id + ': first shot does not start at scene start');
    if (i > 0 && shots[i].f0 !== shots[i - 1].f1) throw new Error(scene.id + ': gap/overlap before shot ' + (i + 1));
    if (shots[i].f1 <= shots[i].f0) throw new Error(scene.id + ': empty shot ' + (i + 1));
  }
  if (shots[shots.length - 1].f1 !== F1) throw new Error(scene.id + ': last shot does not end at scene end');
  const events = (scene.events || []).map(([t, fn, args, label]) => ({ f: fr(t), src: src(fn), args: args === undefined ? null : args, label: label || '' }));
  for (const s of shots) if (s.enter) events.push({ f: s.f0, src: s.enter, args: s.enterArgs === undefined ? null : s.enterArgs, label: s.id + ':enter' });
  for (const e of events) if (e.f < F0 - P) throw new Error(scene.id + ': event ' + e.label + ' before preroll start');
  // keep：这一场只出这几段的帧（别的帧照样走时间，不出画）——几场同时拍同一段，按拍子轮流出画（四季换着来）
  const keep = scene.keep ? scene.keep.map(([a, b]) => [fr(a), fr(b)]).filter(([a, b]) => b > a) : null;
  // layer：另外把这几段的帧存到 layers/<tag>/（分屏用：同一刻的四季，各拍一张，合成时拼起来）
  const layer = scene.layer ? { tag: scene.layer.tag || scene.id, ranges: scene.layer.ranges.map(([a, b]) => [fr(a), fr(b)]).filter(([a, b]) => b > a) } : null;
  return { F0, F1, P, shots, events, keep, layer };
}

const LAYERS = path.resolve(argv.layers || (preview ? 'preview-layers' : 'layers'));
function wanted(pl) {
  const want = new Map();                        // 帧号 → 要写到哪些文件
  const add = (f, p) => { if (f < pl.F0 || f >= pl.F1) return; if (!want.has(f)) want.set(f, []); if (!want.get(f).includes(p)) want.get(f).push(p); };
  const main = f => path.join(OUT, 'f' + pad(f) + '.jpg');
  const ranges = (list, fn) => {
    for (const [a, b] of list) {
      if (!preview) { for (let f = a; f < b; f++) fn(f); continue; }
      fn(a); if (b - a > 8) fn(a + Math.floor((b - a) / 2)); if (b - a > 2) fn(b - 1);
    }
  };
  if (pl.keep) ranges(pl.keep, f => add(f, main(f)));
  else if (!preview) { for (let f = pl.F0; f < pl.F1; f++) add(f, main(f)); }
  else {
    for (const s of pl.shots) {
      const len = s.f1 - s.f0;
      add(s.f0, main(s.f0)); if (len > 8) add(s.f0 + Math.floor(len / 2), main(s.f0 + Math.floor(len / 2))); if (len > 2) add(s.f1 - 1, main(s.f1 - 1));
      if (s.at) for (const t of [].concat(s.at)) { const f = fr(t); if (f >= s.f0 && f < s.f1) add(f, main(f)); }
    }
  }
  if (preview && argv.at) for (const t of String(argv.at).split(',')) { const f = fr(+t); if (!pl.keep || pl.keep.some(([a, b]) => f >= a && f < b)) add(f, main(f)); }
  if (pl.layer) {
    const dir = path.join(LAYERS, pl.layer.tag); fs.mkdirSync(dir, { recursive: true });
    ranges(pl.layer.ranges, f => add(f, path.join(dir, 'f' + pad(f) + '.jpg')));
  }
  return want;
}

async function shoot(browser, scene) {
  const pl = plan(scene), want = wanted(pl);
  if (!preview && !argv.force) {                 // 已经拍好的场次跳过（断点续拍）
    let done = true; for (const [, ps] of want) { for (const p of ps) if (!fs.existsSync(p)) { done = false; break; } if (!done) break; }
    if (done) { log('skip', scene.id, '(already rendered)'); return; }
  }
  const t0 = Date.now();
  const { ctx, page } = await newPage(browser, scene);
  await page.evaluate(([initSrc]) => { const fn = (0, eval)('(' + initSrc + ')'); fn(__T(), __fx); }, [src(scene.init || '() => {}')]);
  await page.evaluate(cfg => __mv.setup(cfg), { frame0: pl.F0 - pl.P - 1, events: pl.events, shots: pl.shots.map(s => ({ id: s.id, f0: s.f0, f1: s.f1, mode: s.mode, cam: s.cam })) });
  const modeAt = f => { const s = pl.shots.find(q => f >= q.f0 && f < q.f1); return s ? s.mode : 'cam'; };
  // 预卷：不出画，只走时间
  const firstMode = modeAt(pl.F0);
  for (let f = pl.F0 - pl.P; f < pl.F0; f += 120) await page.evaluate(([to, m]) => __mv.runTo(to, m), [Math.min(pl.F0 - 1, f + 119), 'cam']);
  if (firstMode === 'screen') await page.evaluate(() => __realFrame());
  let n = 0;
  for (let f = pl.F0; f < pl.F1; f++) {
    const mode = modeAt(f), files = want.get(f), file = files ? files[0] : null;
    if (!want.has(f)) {
      if (mode === 'screen') {                     // 界面戏：一帧一帧走，每帧让浏览器真的渲染一下（动画的 finish 事件要靠它派发）
        await page.evaluate(([to]) => __mv.runTo(to, 'screen'), [f]);
        await page.evaluate(() => __realFrame());
        continue;
      }
      // 批量快进到下一张要出的帧之前（同一种模式内）
      let g = f; while (g + 1 < pl.F1 && !want.has(g + 1) && modeAt(g + 1) === mode && g - f < 240) g++;
      await page.evaluate(([to, m]) => __mv.runTo(to, m), [g, mode]);
      f = g; continue;
    }
    if (mode === 'screen') {
      await page.evaluate(([to]) => __mv.runTo(to, 'screen'), [f]);
      await page.evaluate(() => __realFrame());
      const sh = pl.shots.find(q => f >= q.f0 && f < q.f1);
      await page.screenshot({ path: file, type: 'jpeg', quality: 93, clip: sh.clip ? clipAt(sh.clip, (f - sh.f0) / Math.max(1, sh.f1 - sh.f0 - 1)) : undefined });
    } else {
      const data = await page.evaluate(([to]) => { __mv.runTo(to, 'cam'); return __mv.render(to); }, [f]);
      if (!data) throw new Error(scene.id + ': no camera for frame ' + f);
      fs.writeFileSync(file, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
    }
    for (const other of files.slice(1)) fs.copyFileSync(file, other);
    n++;
    if (n % 300 === 0) log('  ', scene.id, 'frame', f, '/', pl.F1, ((Date.now() - t0) / n).toFixed(0), 'ms/frame');
  }
  if (scene.after) { try { await page.evaluate(([s]) => (0, eval)('(' + s + ')')(__T(), __fx), [src(scene.after)]); } catch (e) { log('after failed', e.message); } }
  await ctx.close();
  log('done', scene.id, n, 'frames', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'frames', pl.F0 + '–' + (pl.F1 - 1));
}

// 片尾收集簿：先悄悄把这些卡收好（每一站各自的天色、各自的东西），存成一份收集簿
async function runCollect(browser) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: K });
  await ctx.addInitScript({ content: 'window.__FPS = ' + FPS + '; window.__OUTK = ' + K + ';' });
  await ctx.addInitScript({ path: path.resolve(__dirname, 'vclock.js') });
  await ctx.addInitScript({ path: path.resolve(__dirname, 'mvlib.js') });
  await ctx.addInitScript({ path: path.resolve(__dirname, 'mvdrive.js') });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('  [pageerror] collect', e.message));
  page.on('console', m => { if (m.type() === 'error') log('  [console] collect', m.text().slice(0, 300)); });
  let first = true, n = 0;
  for (const st of SC.collect) {
    await page.goto(PAGE + '?seed=' + (st.seed || 3) + '&stage=' + (n++) + (st.hash || ''));
    if (first) { await page.evaluate(() => localStorage.removeItem('dusktrain.collection.v1')); await page.reload(); first = false; }
    await page.waitForFunction(() => window.__T && window.__mv);
    if (st.init) await page.evaluate(([s]) => (0, eval)('(' + s + ')')(__T(), __fx), [src(st.init)]);
    await page.evaluate(([n, fps]) => { for (let i = 0; i < n; i++) { __vstep(1000 / fps, false); __T().update(1 / fps); } }, [Math.round((st.preroll || 2) * FPS), FPS]);
    const got = await page.evaluate(([s]) => (0, eval)('(' + s + ')')(__T(), __fx), [src(st.take)]);
    await page.evaluate(() => { window.__saveStore(true); });
    log('collect', st.hash || '(start)', JSON.stringify(got));
  }
  const js = await page.evaluate(() => localStorage.getItem('dusktrain.collection.v1'));
  fs.writeFileSync(path.resolve(__dirname, 'album-store.json'), js);
  const d = JSON.parse(js); log('album store:', Object.keys(d.got).length, 'cards,', js.length, 'chars');
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  try {
    if (argv.collect) { await runCollect(browser); return; }
    let list = SC.scenes.filter(s => !argv.only || String(argv.only).split(',').includes(s.id));
    if (argv.worker) {
      const [i, n] = argv.worker.split('/').map(Number);
      const span = list => list.reduce((n, [a, b]) => n + Math.max(0, fr(b) - fr(a)), 0);
      const kept = s => (s.keep ? span(s.keep) + (s.layer ? span(s.layer.ranges) : 0) : fr(s.t1) - fr(s.t0)) * (s.costK || 1);
      const cost = s => kept(s) * (s.shots.some(q => q.mode === 'screen') ? 1.3 : 1) + (fr(s.t1) - fr(s.t0)) * 0.06 + (s.preroll || 0) * 4;
      const bins = Array.from({ length: n }, () => ({ c: 0, list: [] }));
      for (const s of [...list].sort((a, b) => cost(b) - cost(a))) { const b = bins.reduce((m, q) => (q.c < m.c ? q : m)); b.c += cost(s); b.list.push(s); }
      list = bins[i].list.sort((a, b) => a.t0 - b.t0);
      log('worker', argv.worker, 'scenes', list.map(s => s.id).join(','), 'cost', bins[i].c.toFixed(0));
    }
    for (const s of list) {
      try { await shoot(browser, s); }
      catch (e) { log('FAILED', s.id, e.stack || e.message); if (!argv.keepgoing) throw e; }
    }
  } finally { await browser.close(); logf.end(); }
})();
