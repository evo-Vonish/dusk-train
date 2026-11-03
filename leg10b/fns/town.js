const MID_SEASON = [
  { ground: '#5a8777', ridge: 'rgba(232,244,214,0.42)', trees: [['#e6b0c1', '#f6d5dd'], ['#eebccb', '#fbe4ea'], ['#4f8969', 'rgba(178,218,150,0.5)'], ['#5b9473', 'rgba(188,224,162,0.5)'], ['#467d62', 'rgba(166,206,146,0.45)']] },
  null,                                                       // 夏：原来的样子
  { ground: '#6b7758', ridge: 'rgba(246,226,184,0.4)', trees: [['#b9533c', '#d77a5c'], ['#d2833a', '#eaaa62'], ['#d4ab48', '#ebcd78'], ['#a4462f', '#c66a4e'], ['#3f5f50', 'rgba(128,168,130,0.45)']] },
  { ground: '#cdd6e2', groundTop: '#b2bfd0', ridge: 'rgba(255,255,255,0.85)', trees: [['#4c6765', null], ['#56706c', null]] }
];
// 圆的上面盖一层雪（只画在圆里面）
function capCircle(g, x, y, r, col) {
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  g.fillStyle = col; g.beginPath(); g.ellipse(x - r * 0.08, y - r * 0.92, r * 1.1, r * 0.6, -0.1, 0, TAU); g.fill();
  g.restore();
}
// 三角屋顶从屋脊往下 f 那一截是雪，下沿起伏一点（还在三角里面）
function capTri(g, lx, ly, px, py, rx, ry, f, col) {
  const ax = lerp(px, lx, f), ay = lerp(py, ly, f), bx = lerp(px, rx, f), by = lerp(py, ry, f), dip = (ay - py) * 0.12;
  g.fillStyle = col; g.beginPath(); g.moveTo(px, py); g.lineTo(bx, by);
  for (let i = 1; i < 5; i++) { const u = i / 5; g.lineTo(lerp(bx, ax, u), lerp(by, ay, u) - (i % 2 ? dip : -dip * 0.4)); }
  g.lineTo(ax, ay); g.closePath(); g.fill();
}
/* 第十棒第二版 · 山坡上的人家
   原来每户只是一个盒子加两三个小黑点。现在：窗是有窗台的（有的人家挂着百叶、窗下摆着花），
   低处的人家有门，三分之一的屋顶上有烟囱，屋檐下有一道影子；人家之间长着几棵柏树，
   有两户之间牵着晾衣绳。全部烤在山坡那张图里，每帧不多花一点工夫。
   第三版 · 四季：一次只烤一季、一种天色（buildMid(s, mode)，返回 { c, meta }）。春天山坡嫩一点，四成的树开着樱；
   夏天照旧；秋天的树红的红、黄的黄，柏树还绿着；冬天山坡白了，屋顶、烟囱、钟楼顶上积着雪，树顶一层雪，窗下的花收了。
   黄昏是剪影，只有冬天的剪影上看得出一点雪（夕照里是淡粉紫的）。雪只画在原来的轮廓里，两季叠着换的时候不会跳。 */
function buildMid(s = 1, mode = 'day') {
  const ref = S.ref, sc = Math.min(S.dpr, 1.25), W = TOWN_MID.width * ref, H = TOWN_MID.height * ref;
  const hill = x => { const a = x / W; return H - ref * (0.17 * Math.sin(Math.min(1, a * 1.15) * Math.PI * 0.72) + 0.008 * Math.sin(a * 21 + 1)); };
  const houses = [];
  const rnd = mulberry32(77), deco = mulberry32(1077);
  for (const drop of [0, 0.04, 0.085]) for (let x = W * 0.05; x < W * 0.97; x += ref * (0.05 + rnd() * 0.06)) {
    if (rnd() < 0.24) continue;
    const w = ref * (0.026 + rnd() * 0.03), h = ref * (0.016 + rnd() * 0.02), base = hill(x + w / 2) + ref * drop + ref * 0.012 + (rnd() - 0.5) * ref * 0.012;
    if (base > H - 2) continue;
    const hs = { x, w, h, base, color: Math.floor(rnd() * 7), gable: rnd() > 0.3, wins: 1 + Math.floor(w / (ref * 0.02)), lit: rnd() < 0.55 };
    // 装饰用另一串随机数，房子的位置和原来一模一样
    hs.chimney = deco() < 0.36; hs.chimX = 0.18 + deco() * 0.5;
    hs.shutters = deco() < 0.42; hs.shutterC = SHUTTER[Math.floor(deco() * 2)];
    hs.flowers = deco() < 0.4; hs.door = drop > 0.02 && deco() < 0.55; hs.doorX = 0.15 + deco() * 0.6;
    const ww = Math.max(2.4, ref * 0.0029), wh = Math.max(2.6, ref * 0.0034);
    hs.win = [];
    for (let k = 0; k < hs.wins; k++) {
      const wx = hs.x + 3 + k * (hs.w - 5) / hs.wins, wy = hs.base - hs.h + hs.h * 0.34;
      if (hs.door && Math.abs(wx + ww / 2 - (hs.x + hs.w * hs.doorX)) < ww * 1.6 && hs.h < ref * 0.03) continue;   // 矮房子：门的上面不开窗
      hs.win.push({ x: wx, y: wy, w: ww, h: wh });
    }
    houses.push(hs);
  }
  // 柏树：插在人家之间的空处
  const r4 = mulberry32(4041), cypress = [];
  for (let i = 0; i < 14; i++) {
    const x = W * (0.07 + r4() * 0.88), y = hill(x) + ref * (0.012 + r4() * 0.07);
    if (y > H - 2 || houses.some(hs => x > hs.x - 4 && x < hs.x + hs.w + 4 && y > hs.base - hs.h - 6 && y < hs.base + 4)) continue;
    cypress.push({ x, y, h: ref * (0.026 + r4() * 0.02), w: ref * (0.006 + r4() * 0.003) });
  }
  // 晾衣绳：同一层里挨得近、高低差不多的两户之间
  const lines = [];
  for (let i = 0; i < houses.length - 1 && lines.length < 4; i++) {
    const a = houses[i], b = houses[i + 1], gap = b.x - (a.x + a.w);
    if (gap > ref * 0.012 && gap < ref * 0.05 && Math.abs(a.base - b.base) < ref * 0.008 && a.h > ref * 0.02 && b.h > ref * 0.02 && (i * 7) % 3 === 0) lines.push({ x0: a.x + a.w, y0: a.base - a.h * 0.72, x1: b.x, y1: b.base - b.h * 0.72, n: 3 + (i % 2) });
  }
  const tx = W * 0.62, ty = hill(tx) + ref * 0.02, th = ref * 0.11;
  const win = s === 3, P = mode === 'day' ? MID_SEASON[s] : null;
  const SN = mode === 'day' ? '#f1f5fa' : 'rgba(208,192,236,0.34)';       // 雪：白天是白的；黄昏的剪影上是一层淡粉紫
  {
    const t = makeTile(TOWN_MID.width, TOWN_MID.height, sc), g = t.g, day = mode === 'day';
    if (mode !== 'lights') {
      g.fillStyle = day ? (P ? P.ground : '#4d7a78') : win ? '#262e64' : '#1f2656';
      if (P && P.groundTop) { const gr = g.createLinearGradient(0, H - ref * 0.18, 0, H); gr.addColorStop(0, P.groundTop); gr.addColorStop(1, P.ground); g.fillStyle = gr; }   // 冬：雪坡上面暗一点，和发白的天分得开
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 6) g.lineTo(x, hill(x)); g.lineTo(W, H); g.closePath(); g.fill();
      // 山脊上一道亮边
      g.strokeStyle = day ? (P ? P.ridge : 'rgba(214,232,206,0.35)') : win ? 'rgba(222,206,246,0.3)' : 'rgba(255,190,150,0.12)'; g.lineWidth = win && day ? 1.4 : 1;
      g.beginPath(); for (let x = 0; x <= W; x += 6) (x ? g.lineTo(x, hill(x) + 0.6) : g.moveTo(x, hill(x) + 0.6)); g.stroke();
      if (win && day) {                                       // 雪坡上几道被风吹出来的雪棱，顺着山势
        g.strokeStyle = 'rgba(244,247,252,0.55)'; g.lineWidth = 1.2; const rd = mulberry32(919);
        for (let k = 0; k < 8; k++) {
          const x0 = W * (0.03 + rd() * 0.86), len = W * (0.05 + rd() * 0.12), off = ref * (0.022 + rd() * 0.11);
          g.beginPath(); let on = false;
          for (let x = x0; x <= Math.min(W, x0 + len); x += 5) { const y = hill(x) + off + Math.sin(x * 0.02 + k) * 1.2; if (y > H - 2) break; on ? g.lineTo(x, y) : g.moveTo(x, y); on = true; }
          g.stroke();
        }
      }
      const r3 = mulberry32(31), rc = mulberry32(3131);       // 树的颜色用另一串随机数，位置和原来一模一样
      for (let i = 0; i < 26; i++) {
        const x = W * (0.06 + r3() * 0.9), y = hill(x) + ref * (0.01 + r3() * 0.02), r = ref * (0.01 + r3() * 0.014), pick = rc();
        if (!P) { g.fillStyle = day ? 'rgba(59,101,96,0.9)' : win ? 'rgba(30,36,78,0.92)' : 'rgba(26,31,69,0.9)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
        else {
          const [c0, c1] = P.trees[Math.floor(pick * P.trees.length)];
          g.fillStyle = c0; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
          if (c1) { g.fillStyle = c1; g.beginPath(); g.arc(x + r * 0.28, y - r * 0.32, r * 0.5, 0, TAU); g.fill(); }
        }
        if (win) capCircle(g, x, y, r, SN);
      }
      // 柏树（画在房子后面）
      for (const c of cypress) {
        g.fillStyle = day ? '#2f5a4c' : win ? '#1a2150' : '#151b45';
        g.beginPath(); g.moveTo(c.x, c.y - c.h); g.quadraticCurveTo(c.x + c.w * 1.1, c.y - c.h * 0.45, c.x + c.w * 0.5, c.y); g.lineTo(c.x - c.w * 0.5, c.y); g.quadraticCurveTo(c.x - c.w * 1.1, c.y - c.h * 0.45, c.x, c.y - c.h); g.fill();
        if (day || win) { g.fillStyle = win ? (day ? 'rgba(241,245,250,0.82)' : SN) : 'rgba(160,200,150,0.25)'; g.beginPath(); g.moveTo(c.x, c.y - c.h); g.quadraticCurveTo(c.x - c.w * 1.0, c.y - c.h * 0.45, c.x - c.w * 0.45, c.y - 1); g.lineTo(c.x - c.w * 0.1, c.y - 1); g.quadraticCurveTo(c.x - c.w * 0.4, c.y - c.h * 0.45, c.x, c.y - c.h); g.fill(); }
      }
      for (const hs of houses) {
        const top = hs.base - hs.h, roofC = day ? ROOF_DAY : '#161b42';
        // 烟囱（在屋顶后面）
        if (hs.chimney) {
          const cx = hs.x + hs.w * hs.chimX, cw = Math.max(2.2, ref * 0.0034), ch = ref * 0.009 + (hs.gable ? hs.w * 0.08 : 0);
          g.fillStyle = day ? '#8b5a48' : '#141a40'; g.fillRect(cx, top - ch, cw, ch + 1);
          g.fillStyle = day ? '#6e4638' : '#121738'; g.fillRect(cx - 0.6, top - ch - 1, cw + 1.2, 1.2);
          if (win) { g.fillStyle = SN; g.fillRect(cx - 0.6, top - ch - 1, cw + 1.2, 1.2); }
        }
        if (day) { g.fillStyle = win ? 'rgba(98,118,160,0.3)' : 'rgba(22,42,50,0.15)'; g.beginPath(); g.ellipse(hs.x + hs.w * 0.42, hs.base + 0.6, hs.w * 0.66, Math.max(1.1, hs.h * 0.13), 0, 0, TAU); g.fill(); }   // 脚下一点影子，房子才站得住
        g.fillStyle = day ? FACADES[hs.color] : '#181e4a'; g.fillRect(hs.x, top, hs.w, hs.h);
        if (day) {
          sideFace(g, hs.x, top, hs.w, hs.base, ref * 0.006, lighten(FACADES[hs.color], 0.25));
          g.fillStyle = 'rgba(20,30,60,0.12)'; g.fillRect(hs.x, top, hs.w * 0.22, hs.h);                // 背光的一侧
          g.fillStyle = 'rgba(20,30,60,0.22)'; g.fillRect(hs.x, top, hs.w, 1.2);                          // 屋檐下的影子
        } else sideFace(g, hs.x, top, hs.w, hs.base, ref * 0.006, '#141a42');
        g.fillStyle = roofC;
        if (hs.gable) {
          const peak = top - 3 - hs.w * 0.12;
          g.beginPath(); g.moveTo(hs.x - 1.5, top); g.lineTo(hs.x + hs.w / 2, peak); g.lineTo(hs.x + hs.w + 1.5, top); g.closePath(); g.fill();
          if (win) capTri(g, hs.x - 1.5, top, hs.x + hs.w / 2, peak, hs.x + hs.w + 1.5, top, 0.72, SN);
          else if (day) {
            g.strokeStyle = lighten(ROOF_DAY, 0.3); g.lineWidth = 0.8; g.beginPath(); g.moveTo(hs.x - 1.5, top); g.lineTo(hs.x + hs.w / 2, peak); g.stroke();
            g.save(); g.beginPath(); g.moveTo(hs.x - 1.5, top); g.lineTo(hs.x + hs.w / 2, peak); g.lineTo(hs.x + hs.w + 1.5, top); g.closePath(); g.clip();   // 第七版：一道道瓦
            g.fillStyle = 'rgba(70,30,22,0.3)'; for (let y = top - 1.6; y > peak; y -= 1.8) g.fillRect(hs.x - 2, y, hs.w + 4, 0.6);
            g.restore();
          }
        } else {
          g.fillRect(hs.x - 1, top - 2, hs.w + 2, 2.4);
          if (win) { g.fillStyle = SN; g.fillRect(hs.x - 1, top - 2, hs.w + 2, 1.5); }
          else if (day) { g.fillStyle = lighten(ROOF_DAY, 0.3); g.fillRect(hs.x - 1, top - 2, hs.w + 2, 0.7); }
        }
        if (day) {
          g.fillStyle = 'rgba(60,40,40,0.16)'; g.fillRect(hs.x, hs.base - Math.max(1.2, hs.h * 0.12), hs.w, Math.max(1.2, hs.h * 0.12));   // 第七版：墙脚一道勒脚
          g.fillStyle = 'rgba(241,234,223,0.35)'; for (let y = top + 1.5, k = 0; y < hs.base - 2; y += 2.6, k++) g.fillRect(hs.x + hs.w - (k % 2 ? 1.8 : 1.2), y, k % 2 ? 1.8 : 1.2, 2);   // 墙角的隅石
          for (const wn of hs.win) {
            if (hs.shutters) { g.fillStyle = hs.shutterC; g.fillRect(wn.x - 1.1, wn.y, 1, wn.h); g.fillRect(wn.x + wn.w + 0.1, wn.y, 1, wn.h); }
            g.fillStyle = OPENING; g.fillRect(wn.x, wn.y, wn.w, wn.h);
            g.fillStyle = 'rgba(241,234,223,0.85)'; g.fillRect(wn.x - 0.5, wn.y + wn.h, wn.w + 1, 0.8);       // 窗台
            if (hs.flowers && !win) { g.fillStyle = ['#d9534f', '#e78fa8', '#f0c04a'][(hs.color + Math.round(wn.x)) % 3]; g.fillRect(wn.x - 0.2, wn.y + wn.h - 0.9, wn.w + 0.4, 1); }
          }
          if (hs.door) {
            const dw = Math.max(2.6, hs.w * 0.16), dh = Math.min(hs.h * 0.55, ref * 0.011), dx = hs.x + hs.w * hs.doorX - dw / 2;
            g.fillStyle = hs.shutterC || '#4d6b57'; g.fillRect(dx, hs.base - dh, dw, dh);
            g.fillStyle = 'rgba(241,234,223,0.7)'; g.fillRect(dx - 0.6, hs.base - dh - 0.8, dw + 1.2, 0.8);
          }
        } else if (hs.door) {
          const dw = Math.max(2.6, hs.w * 0.16), dh = Math.min(hs.h * 0.55, ref * 0.011), dx = hs.x + hs.w * hs.doorX - dw / 2;
          g.fillStyle = '#10153a'; g.fillRect(dx, hs.base - dh, dw, dh);
        }
      }
      // 晾衣绳与衣服
      for (const L of lines) {
        g.strokeStyle = day ? 'rgba(60,60,80,0.6)' : 'rgba(150,150,190,0.25)'; g.lineWidth = 0.6;
        const mx = (L.x0 + L.x1) / 2, my = (L.y0 + L.y1) / 2 + 2.2;
        g.beginPath(); g.moveTo(L.x0, L.y0); g.quadraticCurveTo(mx, my, L.x1, L.y1); g.stroke();
        for (let k = 0; k < L.n; k++) {
          const f = (k + 1) / (L.n + 1), x = (1 - f) * (1 - f) * L.x0 + 2 * f * (1 - f) * mx + f * f * L.x1, y = (1 - f) * (1 - f) * L.y0 + 2 * f * (1 - f) * my + f * f * L.y1;
          g.fillStyle = day ? ['#f1eadf', '#7d93b3', '#d9534f', '#f0c04a'][(k + L.n) % 4] : '#1c2252';
          g.fillRect(x - 1.3, y, 2.6, 2.4 + (k % 2) * 1.2);
        }
      }
      // 钟楼、拱门、石阶
      g.fillStyle = day ? '#a5694f' : '#171c45'; g.fillRect(tx - ref * 0.008, ty - th, ref * 0.016, th);
      if (day) sideFace(g, tx - ref * 0.008, ty - th, ref * 0.016, ty, ref * 0.006, lighten('#a5694f', 0.22));
      if (day) { g.fillStyle = 'rgba(20,30,60,0.14)'; g.fillRect(tx - ref * 0.008, ty - th, ref * 0.004, th); g.fillStyle = 'rgba(241,234,223,0.55)'; for (const f of [0.3, 0.62]) g.fillRect(tx - ref * 0.008, ty - th * f, ref * 0.016, 0.8); }
      g.fillStyle = day ? '#e9e2d3' : '#1c2250'; g.fillRect(tx - ref * 0.009, ty - th - ref * 0.02, ref * 0.018, ref * 0.02);
      g.fillStyle = day ? ROOF_DAY : '#131a3f'; g.beginPath(); g.moveTo(tx - ref * 0.01, ty - th - ref * 0.02); g.lineTo(tx, ty - th - ref * 0.042); g.lineTo(tx + ref * 0.01, ty - th - ref * 0.02); g.closePath(); g.fill();
      if (win) capTri(g, tx - ref * 0.01, ty - th - ref * 0.02, tx, ty - th - ref * 0.042, tx + ref * 0.01, ty - th - ref * 0.02, 0.62, SN);
      g.fillStyle = day ? 'rgba(43,54,84,0.8)' : '#0f1436'; for (const dx of [-0.005, 0, 0.005]) g.fillRect(tx + dx * ref - 1.2, ty - th - ref * 0.017, 2.4, ref * 0.012);
      if (day) { g.fillStyle = '#e9e2d3'; g.beginPath(); g.arc(tx, ty - th * 0.78, ref * 0.0045, 0, TAU); g.fill(); g.strokeStyle = 'rgba(43,54,84,0.8)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(tx, ty - th * 0.78); g.lineTo(tx, ty - th * 0.78 - ref * 0.003); g.moveTo(tx, ty - th * 0.78); g.lineTo(tx + ref * 0.0025, ty - th * 0.78); g.stroke(); }
      const gx = W * 0.5, gy = hill(gx) + ref * 0.03;
      g.strokeStyle = day ? '#d8cdb6' : '#131a3f'; g.lineWidth = Math.max(2, ref * 0.005);
      g.beginPath(); g.moveTo(gx - ref * 0.012, gy); g.lineTo(gx - ref * 0.012, gy - ref * 0.02); g.arc(gx, gy - ref * 0.02, ref * 0.012, Math.PI, 0); g.lineTo(gx + ref * 0.012, gy); g.stroke();
      g.fillStyle = day ? 'rgba(230,223,207,0.8)' : 'rgba(106,101,152,0.55)';
      const segs = [[W * 0.04, H - 4], [W * 0.2, H - ref * 0.05], [W * 0.34, H - ref * 0.09], [W * 0.44, H - ref * 0.12], [gx, gy]];
      for (let i = 0; i < segs.length - 1; i++) for (let k = 0; k < 12; k++) { const t2 = k / 12; g.fillRect(segs[i][0] + (segs[i + 1][0] - segs[i][0]) * t2, segs[i][1] + (segs[i + 1][1] - segs[i][1]) * t2, ref * 0.014, 1.2); }
    } else {
      for (const hs of houses) {
        if (!hs.lit) continue;
        const top = hs.base - hs.h;
        glow(g, glowSpr, hs.x + hs.w / 2, top + hs.h * 0.45, hs.w * 2.2, hs.h * 2.4, 0.3);
        g.fillStyle = css(WARM, 0.85); hs.win.forEach((wn, k) => { if ((k + hs.color) % 3 !== 1) g.fillRect(wn.x, wn.y, wn.w, wn.h * 0.85); });
        if (hs.door && hs.color % 2) { const dw = Math.max(2.6, hs.w * 0.16), dh = Math.min(hs.h * 0.55, ref * 0.011); g.fillStyle = css(WARM, 0.55); g.fillRect(hs.x + hs.w * hs.doorX - dw / 2, hs.base - dh, dw, dh); }
      }
      glow(g, glowSpr, tx, ty - th - ref * 0.011, ref * 0.04, ref * 0.03, 0.5);
      g.fillStyle = css(WARM); g.fillRect(tx - 1.2, ty - th - ref * 0.017, 2.4, ref * 0.012);
    }
    if (mode !== 'lights') townGrain(g, W, H, mode);               // 第七版：墙皮、草坡一点粗糙的质地
    return { c: t.c, meta: { W, H, towerX: tx, towerY: ty - th - ref * 0.042 } };
  }
}

/* 茶屋的露台：檐下牵一串小灯，傍晚亮起来；灯下的墙是暖的，坐着的人不再和墙混成一片 */
function drawTeaLights(g, x, w, base, day) {
  const { ref, t } = S, dark = 1 - S.dayF;
  if (dark < 0.12) return;
  const ax = x + w * 0.04, aw = w * 0.92, ay = base - ref * 0.075, k = smooth((dark - 0.12) / 0.4);
  glow(g, glowSpr, ax + aw * 0.45, base - ref * 0.036, aw * 1.15, ref * 0.085, 0.34 * k);
  const n = 9;
  g.strokeStyle = 'rgba(30,26,40,' + (0.6 * k).toFixed(3) + ')'; g.lineWidth = Math.max(0.6, ref * 0.0009);
  g.beginPath();
  const sag = f => ay + ref * 0.003 + Math.abs(Math.sin(f * Math.PI * 3)) * ref * 0.004;        // 三段，每段往下垂一点
  for (let i = 0; i <= 36; i++) { const f = i / 36; i ? g.lineTo(ax + aw * f, sag(f)) : g.moveTo(ax, sag(f)); }
  g.stroke();
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, bx = ax + aw * f, by = sag(f) + ref * 0.0012;
    const tw = 0.85 + 0.15 * Math.sin(t * 1.7 + i * 2.3);
    glow(g, glowSpr, bx, by + ref * 0.003, ref * 0.02, ref * 0.02, 0.4 * k * tw);
    g.fillStyle = css(mix(WARM_HI, [255, 214, 150], i % 3 === 1 ? 0.6 : 0), 0.95 * k); g.beginPath(); g.arc(bx, by + ref * 0.003, Math.max(0.9, ref * 0.0018), 0, TAU); g.fill();
  }
}
