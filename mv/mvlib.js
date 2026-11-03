// 拍片用的小工具：导演脚本在页面里调用。全部在 __T() 可用之后才会被调用。
(function () {
  // 让下一次 Math.random() 返回指定的值（用来定下闪电是不是叉状、飞鱼从哪边来）
  function withFirstRandom(values, fn) {
    const r = Math.random; let i = 0;
    Math.random = () => (i < values.length ? values[i++] : r());
    try { return fn(); } finally { Math.random = r; }
  }
  window.__fx = {
    clean(on) { document.body.classList.toggle('mv-clean', !!on); },
    bell() { const T = __T(); T.S.bellT = 0; T.liftRoofBirds(); },
    depart() { const T = __T(); if (T.S.tramMode === 'parked') T.depart(); },
    meteor(kind) { __T().spawnMeteor(kind || 'shower'); },
    // 一道叉状闪电（不要云里的片闪）；x 是它在画面上的横向位置 0..1
    bolt(x) { const T = __T(); const u = x == null ? Math.random() : Math.max(0, Math.min(1, (x - .15) / .7)); withFirstRandom([u, 0.95], () => T.makeLightning()); },
    sheet(x) { const T = __T(); const u = x == null ? Math.random() : Math.max(0, Math.min(1, (x - .15) / .7)); withFirstRandom([u, 0.1], () => T.makeLightning()); },
    // dir: -1 从右边来往左飞，1 从左边来往右飞
    fishWave(dir) { const T = __T(); if (dir === -1 || dir === 1) withFirstRandom([dir < 0 ? 0.2 : 0.9], () => T.launchFishWave()); else T.launchFishWave(); },
    fire(u, v, kind, color, size) { __T().launchFirework([u, v, kind, color, size]); },
    fireDur(v, size) { return 1.5 + v * 0.35 + size * 0.1; },
    // 找画面里某件东西的中心（先在屏幕上画一帧，热区才是新的）
    find(key, idx) {
      const T = __T(); T.draw();
      let list = T.PEEL.hits.filter(q => q.key === key);
      if (!list.length) list = T.PEEL.hits.filter(q => q.key.startsWith(key));
      const h = list[Math.min(list.length - 1, idx || 0)];
      return h ? { x: h.x + h.w / 2, y: h.y + h.h / 2, w: h.w, h: h.h, key: h.key, raw: h } : null;
    },
    // 屏幕模式里：像手指一样轻触一下画里的东西（揭下来）
    peel(key, idx) { const T = __T(); const h = this.find(key, idx); if (!h) { console.error('peel: not found ' + key); return false; } return T.tryPeel(h.x, h.y); },
    gotIt() { const b = document.getElementById('card-ok'); if (b && !document.getElementById('card').hidden) b.click(); },
    // 悄悄收进收集簿（带一张和揭卡一样的高清小图），给片尾的收集簿用
    collect(key, idx) {
      const T = __T(); const h = this.find(key, idx); if (!h) return false;
      const card = T.CARD.get(h.key); if (!card || T.store.got[h.key]) return false;
      const S = T.S, size = Math.max(Math.min(S.ref * 0.26, Math.max(h.w, h.h) * 1.6 + S.ref * 0.05), S.ref * 0.2);
      const ox = Math.max(0, Math.min(S.W - size, h.x - size / 2)), oy = Math.max(0, Math.min(S.H - size, h.y - size / 2));
      const shot = T.renderRegion(ox, oy, size, 3);
      window.__albumAdd(card, card.letter || card.keepsake ? null : shot, window.__moment(), {});
      return true;
    },
    collectAt(id, x, y, size) {
      const T = __T(); const card = T.CARD.get(id); if (!card || T.store.got[id]) return false;
      const S = T.S; const shot = T.renderRegion(Math.max(0, Math.min(S.W - size, x - size / 2)), Math.max(0, Math.min(S.H - size, y - size / 2)), size, 3);
      window.__albumAdd(card, card.letter || card.keepsake ? null : shot, window.__moment(), {}); return true;
    },
    collectPlain(id) { const T = __T(); const card = T.CARD.get(id); if (!card || T.store.got[id]) return false; window.__albumAdd(card, null, window.__moment(), {}); return true; },
    night(v) { __T().S.nightF = v; },
    tick(fn) { window.__mv.ticks.push(fn); },
    untick() { window.__mv.ticks.length = 0; },
  };
  // 片尾收集簿：一次贴上 n 张（按页面上的顺序），并把簿子慢慢卷到最新贴上的那一张
  window.__popNext = n => {
    const list = Array.from(document.querySelectorAll('#album .slot.got:not(.pop)'));
    const now = list.slice(0, n); now.forEach(el => el.classList.add('pop'));
    const last = now[now.length - 1], body = document.getElementById('album-body');
    if (last && body) {
      const r = last.getBoundingClientRect(), b = body.getBoundingClientRect();
      window.__albumTarget = Math.max(0, Math.min(body.scrollHeight - body.clientHeight, body.scrollTop + (r.bottom - b.top) - body.clientHeight * 0.8));
    }
  };
  window.__albumTarget = 0;
  window.__albumTick = () => { const body = document.getElementById('album-body'); if (body) { const d = window.__albumTarget - body.scrollTop; if (Math.abs(d) > .5) body.scrollTop += d * 0.22; } };
  const st = document.createElement('style');
  st.textContent = `
    body.mv-hidegot #album .slot.got:not(.pop) .pic, body.mv-hidegot #album .slot.got:not(.pop) .nm { opacity: 0; }
    #album .slot.pop .nm { animation: mv-fade .45s ease .08s both; }
    @keyframes mv-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    body.mv-clean #controls, body.mv-clean #cap, body.mv-clean #toast, body.mv-clean #bottle-pickup { display: none !important; }
    body.mv-nodash #dash { display: none !important; }
    body.mv-noctl #controls { opacity: 0 !important; }
    body.mv-nocap #cap { opacity: 0 !important; }
    #album .slot.pop .pic { animation: mv-pop .5s cubic-bezier(.2, 1.5, .4, 1) both; }
    @keyframes mv-pop { 0% { transform: scale(1.7) rotate(-14deg); opacity: 0; } 55% { opacity: 1; } 100% { transform: rotate(var(--tilt, 0deg)); opacity: 1; } }
    *, *::before, *::after { caret-color: transparent !important; }
  `;
  const add = () => document.head.appendChild(st);
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
})();
