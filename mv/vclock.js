// 虚拟时钟：页面里的时间只在 __vstep(ms) 时才走。rAF、setTimeout、performance.now、Date.now、CSS/WAAPI 动画都跟着它。
(() => {
  // 可复现的随机数：同一个 seed，同一场戏每次拍出来都一样（预览和正片对得上）
  let seed = 20261025; try { const m = /[?&]seed=(\d+)/.exec(location.search); if (m) seed = +m[1]; } catch (e) { /* */ }
  Math.random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let vt = 0;
  const D0 = Date.now();
  performance.now = () => vt;
  Date.now = () => D0 + vt;
  const realRAF = window.requestAnimationFrame.bind(window);
  window.__realFrame = () => new Promise(r => realRAF(() => r()));   // 等浏览器真的出一帧：WAAPI 的 finish 事件这时才派发
  let rafQ = [], rafId = 1, timers = [], tid = 1;
  window.requestAnimationFrame = cb => { const id = rafId++; rafQ.push({ id, cb }); return id; };
  window.cancelAnimationFrame = id => { rafQ = rafQ.filter(r => r.id !== id); };
  window.setTimeout = (cb, ms, ...args) => { const id = tid++; timers.push({ id, at: vt + Math.max(0, +ms || 0), cb, args }); return id; };
  window.clearTimeout = id => { timers = timers.filter(t => t.id !== id); };
  window.setInterval = (cb, ms, ...args) => { const id = tid++; const every = Math.max(1, +ms || 1); const tick = () => { timers.push({ id, at: vt + every, cb: () => { cb(...args); tick(); }, args: [] }); }; tick(); return id; };
  window.clearInterval = id => { timers = timers.filter(t => t.id !== id); };
  const tracked = new WeakMap();
  function stepAnimations(ms) {
    let list = [];
    try { list = document.getAnimations(); } catch (e) { return; }
    for (const a of list) {
      let st = tracked.get(a);
      if (!st) { st = { t: 0 }; tracked.set(a, st); try { a.pause(); a.currentTime = 0; } catch (e) { /* */ } continue; }
      st.t += ms;
      let end = Infinity;
      try { const tm = a.effect && a.effect.getComputedTiming(); end = tm ? tm.endTime : Infinity; } catch (e) { /* */ }
      try { if (st.t >= end) { a.finish(); } else { a.currentTime = st.t; } } catch (e) { /* */ }
    }
  }
  window.__vtime = () => vt;
  window.__vstep = (ms, runRaf = true) => {
    const end = vt + ms;
    for (let guard = 0; guard < 500; guard++) {
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > end) break;
      timers.shift(); vt = Math.max(vt, t.at);
      try { t.cb(...t.args); } catch (e) { console.error('timer', e && e.message); }
    }
    vt = end;
    stepAnimations(ms);
    if (runRaf) {
      const q = rafQ; rafQ = [];
      for (const r of q) { try { r.cb(vt); } catch (e) { console.error('raf', e && e.message, e && e.stack); } }
    }
    stepAnimations(0);         // 刚刚生成的动画也先停在 0
  };
})();
