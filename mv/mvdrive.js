// 片场的场记：在页面里推着虚拟时间一帧一帧走，按时点放事件，按镜头取景。
// 帧号是全片的帧号：第 f 帧 = 歌里的第 f/FPS 秒（FPS、输出倍率 K 由 render.js 先注入：window.__FPS、window.__OUTK）。
(function () {
  const FPS = window.__FPS || 30, K = window.__OUTK || 1.5;
  const ease = {
    lin: p => p,
    io: p => (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    out: p => 1 - Math.pow(1 - p, 2.2),
    in: p => Math.pow(p, 2),
    sine: p => .5 - .5 * Math.cos(Math.PI * p),
    xo: p => (p >= 1 ? 1 : (1 - Math.pow(2, -9 * p)) / (1 - Math.pow(2, -9))),     // 猛推猛拉：一下到位，再慢慢停稳
    xi: p => (p <= 0 ? 0 : (Math.pow(2, 9 * p) - 1) / (Math.pow(2, 9) - 1)),
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  // 取景：{x,y,z} 定点；to:{…} 推拉摇；key:'chime' 对准画里的某件东西；follow:'tram' 跟着列车；fn:'…' 自定义
  function anchor(spec, st, T, fx) {
    if (spec.follow === 'tram') {
      const P = T.setPieces(), S = T.S;
      return { x: P.tramX + P.tw / 2, y: S.yM - P.th * .5 };
    }
    if (spec.follow) {                               // 每帧找一次（会多画一遍，贵；只给短镜头用）
      const h = fx.find(spec.follow, spec.idx);
      if (h) st.last = { x: h.x, y: h.y };
      return st.last || { x: 640, y: 400 };
    }
    if (spec.key) {
      if (!st.k) { const h = fx.find(spec.key, spec.idx); st.k = h ? { x: h.x, y: h.y } : { x: 640, y: 400 }; if (!h) console.error('cam key not found: ' + spec.key); }
      return st.k;
    }
    return { x: 0, y: 0 };
  }
  function camAt(spec, p, st, T, fx, t, k) {
    if (spec.fn) { if (!st.fn) st.fn = (0, eval)('(' + spec.fn + ')'); return st.fn.call(st, p, T, fx, t, k); }
    const a = anchor(spec, st, T, fx);
    const e = (ease[spec.ease] || ease.io)(Math.min(1, Math.max(0, (p - (spec.d0 || 0)) / Math.max(1e-6, (spec.d1 || 1) - (spec.d0 || 0)))));
    const A = { x: spec.x || 0, y: spec.y || 0, z: spec.z || 1 };
    const Bv = spec.to ? { x: spec.to.x != null ? spec.to.x : A.x, y: spec.to.y != null ? spec.to.y : A.y, z: spec.to.z != null ? spec.to.z : A.z } : null;
    let x = A.x, y = A.y, z = A.z;
    if (spec.keys) {                                 // 关键帧：[[p, {x,y,z}, 缓动], …]——停、猛推、慢推、猛拉都能接起来
      let prev = { p: 0, x: A.x, y: A.y, z: A.z };
      for (const [kp, kv, ke] of spec.keys) {
        const cur = { p: kp, x: kv.x != null ? kv.x : prev.x, y: kv.y != null ? kv.y : prev.y, z: kv.z != null ? kv.z : prev.z };
        if (p <= kp) { const q = (ease[ke] || ease.io)(Math.min(1, Math.max(0, (p - prev.p) / Math.max(1e-6, kp - prev.p)))); x = lerp(prev.x, cur.x, q); y = lerp(prev.y, cur.y, q); z = prev.z * Math.pow(cur.z / prev.z, q); prev = null; break; }
        prev = cur;
      }
      if (prev) { x = prev.x; y = prev.y; z = prev.z; }
    }
    else if (Bv) { x = lerp(A.x, Bv.x, e); y = lerp(A.y, Bv.y, e); z = A.z * Math.pow(Bv.z / A.z, e); }
    else if (!spec.still) z = A.z * (1 + (spec.breath != null ? spec.breath : .035) * ease.sine(p));   // 定镜也轻轻往里推一点，画面不死
    if (spec.track) {                                // 跟着某一层景深走（1 = 站台与街道那一层）
      if (st.c0 == null) st.c0 = T.S.camera;
      x += (T.S.camera - st.c0) * T.S.ref * spec.track;
    }
    if (spec.shake) { const s = spec.shake * Math.max(0, 1 - (t - (st.shakeT0 != null ? st.shakeT0 : t)) * 3); x += Math.sin(t * 61) * s; y += Math.cos(t * 47) * s; }
    return [a.x + x, a.y + y, z];
  }
  window.__mv = {
    frame: 0, events: [], ei: 0, shots: [], q: 0.94, ticks: [],
    setup(cfg) {
      const ev = s => (0, eval)('(' + s + ')');
      this.frame = cfg.frame0; this.q = cfg.q || 0.94;
      this.events = cfg.events.map(e => ({ f: e.f, fn: ev(e.src), label: e.label || '', args: e.args })).sort((a, b) => a.f - b.f);
      this.ei = 0;
      this.shots = cfg.shots.map(s => ({ id: s.id, f0: s.f0, f1: s.f1, mode: s.mode, cam: s.cam, state: {} }));
      this.fire(this.frame);
    },
    fire(f) {
      const T = __T();
      while (this.ei < this.events.length && this.events[this.ei].f <= f) {
        const e = this.events[this.ei++];
        try { e.fn(T, __fx, e.f / FPS, e.args); } catch (err) { console.error('event ' + e.label + ' @' + e.f + ': ' + (err && err.message)); }
      }
    },
    step(mode) {                            // 从 frame 走到 frame + 1
      const f = this.frame + 1;
      this.fire(f);
      const T = __T();
      for (const h of this.ticks) { try { h(T, __fx, f / FPS); } catch (err) { console.error('tick ' + (err && err.message)); } }
      if (mode === 'screen') window.__vstep(1000 / FPS, true);
      else {
        const r = this.rateAt(f);            // 慢放 / 定格：画里的时间走得慢一点，或者停住（镜头照样动）
        if (r > 0) { window.__vstep(1000 / FPS * r, false); if (!T.S.paused) T.update(r / FPS); }
      }
      this.frame = f;
    },
    rateAt(f) {
      const s = this.shotAt(f); if (!s || !s.cam || s.cam.rate == null) return 1;
      const r = s.cam.rate; if (typeof r === 'number') return r;
      const p = (f - s.f0) / Math.max(1, s.f1 - s.f0 - 1), e = (ease[s.cam.rateEase] || ease.sine)(Math.min(1, Math.max(0, p)));
      return r[0] + (r[1] - r[0]) * e;
    },
    runTo(f, mode) { while (this.frame < f) this.step(mode); return this.frame; },
    shotAt(f) { for (const s of this.shots) if (f >= s.f0 && f < s.f1) return s; return null; },
    rect(f) {
      const s = this.shotAt(f); if (!s || !s.cam) return null;
      const T = __T(), { W, H } = T.S;
      const p = (f - s.f0) / Math.max(1, s.f1 - s.f0 - 1);
      let [cx, cy, z] = camAt(s.cam, p, s.state, T, __fx, f / FPS, f - s.f0);
      z = Math.max(1, z || 1);
      const w = W / z, h = H / z;
      const ox = Math.min(Math.max(cx - w / 2, 0), W - w), oy = Math.min(Math.max(cy - h / 2, 0), H - h);
      return [ox, oy, w, h, K * z];
    },
    render(f) {
      const r = this.rect(f); if (!r) return null;
      return window.__MV.renderRect(r[0], r[1], r[2], r[3], r[4]).toDataURL('image/jpeg', this.q);
    },
  };
})();
