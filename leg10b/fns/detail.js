/* 第十棒第七版 · 细节和纹理（多几层）
   · 远山（buildLandscape）：山脊上一线天光、从山脊往下的几道沟、近的那层山脊上一排树冠、坡上一丛一丛的树、
     贴着海平线的一层薄雾。形状和原来一样（雪、樱、红叶照旧落在原来的山脊上），只是不再是一块平的颜色。
   · 小镇烤好的图（街道、广场、山坡）上叠一层颗粒：墙皮、石头、草坡都有了一点粗糙的质地（只叠在画过的地方）。
   · 街上的房子（drawProp 'house' 之后 houseExtras）：墙角的隅石、墙脚一道深色的勒脚、两层楼中间一道腰线、檐下一排齿饰、
     屋顶一道道瓦、墙边一根落水管、二楼的小阳台和花盆、门边的壁灯（入夜亮）；黄昏的剪影上，屋顶多了天线和水箱。 */
function buildLandscape() {
  landLayers = [];
  for (let layer = 0; layer < 2; layer++) {
    const tile = document.createElement('canvas');
    const width = Math.ceil(S.ref * 4), height = Math.max(1, Math.ceil(S.ref * 0.15));
    tile.width = width; tile.height = height;
    const g = tile.getContext('2d');
    const ridge = x => {
      const a = x / width * TAU;
      return height * (0.76 - 0.17 * Math.sin(a + layer * 2) - 0.11 * Math.sin(3 * a + 1) - 0.045 * Math.cos(7 * a));
    };
    const base = layer ? [68, 64, 102] : [123, 82, 123], rnd = mulberry32(300 + layer);
    const twice = (x, m, fn) => { fn(x); if (x < m) fn(x + width); if (x > width - m) fn(x - width); };   // 贴近两头的，另一头也画一份：图块接得上
    // 近的那层：山脊上一排树冠（凸出山脊线），远的那层：几处小小的岩头
    g.fillStyle = css(base);
    if (layer) {
      for (let x = 0; x < width; x += Math.max(2, S.ref * (0.003 + rnd() * 0.004))) {
        const r = S.ref * (0.0022 + rnd() * 0.0042);
        if (rnd() < 0.12) continue;
        twice(x, r * 2, xx => { g.beginPath(); g.arc(xx, ridge(xx) + r * 0.55, r, 0, TAU); g.fill(); });
      }
    }
    g.beginPath(); g.moveTo(0, height);
    for (let x = 0; x <= width; x += 2) g.lineTo(x, ridge(x));
    g.lineTo(width, height); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = 'source-atop';
    // 沟：从山脊往下斜着的几道暗纹
    g.strokeStyle = css(mix(base, INK, 0.45), layer ? 0.28 : 0.2); g.lineCap = 'round';
    for (let i = 0; i < (layer ? 70 : 50); i++) {
      const x0 = rnd() * width, len = height * (0.15 + rnd() * 0.4), dir = rnd() < 0.5 ? -1 : 1, lwid = Math.max(0.8, S.ref * (0.001 + rnd() * 0.0016));
      twice(x0, len, xx => { const y0 = ridge(xx) + 2; g.lineWidth = lwid; g.beginPath(); g.moveTo(xx, y0); g.quadraticCurveTo(xx + dir * len * 0.2, y0 + len * 0.5, xx + dir * len * 0.45, y0 + len); g.stroke(); });
    }
    // 坡上一丛一丛的树（近的那层）、远的那层一些明暗斑
    for (let i = 0; i < (layer ? 160 : 60); i++) {
      const x = rnd() * width, r = S.ref * (layer ? 0.002 + rnd() * 0.004 : 0.006 + rnd() * 0.012), dk = rnd() < 0.7, fy = rnd();
      twice(x, r * 2, xx => {
        const y = ridge(xx) + r + fy * (height - ridge(xx)) * 0.8;
        g.fillStyle = dk ? css(mix(base, INK, 0.35), layer ? 0.5 : 0.18) : css(mix(base, [255, 200, 180], 0.25), layer ? 0.25 : 0.12);
        g.beginPath(); g.ellipse(xx, y, r * (layer ? 1 : 2.2), r, 0, 0, TAU); g.fill();
      });
    }
    // 山脊上一线天光
    g.strokeStyle = css(mix(base, [255, 206, 180], 0.55), layer ? 0.22 : 0.3); g.lineWidth = Math.max(0.8, S.ref * 0.0012);
    g.beginPath(); for (let x = 0; x <= width; x += 3) (x ? g.lineTo(x, ridge(x) + 0.8) : g.moveTo(x, ridge(x) + 0.8)); g.stroke();
    // 贴着海平线的一层薄雾
    const hz = g.createLinearGradient(0, height * 0.55, 0, height);
    hz.addColorStop(0, css(mix(base, [255, 210, 210], 0.4), 0)); hz.addColorStop(1, css(mix(base, [255, 210, 210], 0.4), layer ? 0.32 : 0.4));
    g.fillStyle = hz; g.fillRect(0, 0, width, height);
    g.restore();
    if (layer === 1) {
      const r2 = mulberry32(204);
      g.fillStyle = '#444066';
      for (let i = 0; i < 28; i++) {
        const x = r2() * width, y = ridge(x), h = S.ref * (0.004 + r2() * 0.013);
        g.fillRect(x, y - h, Math.max(1, h * 0.4), h + 2);
        if (i % 5 === 0) { g.fillStyle = '#deb18e'; g.fillRect(x, y - h * 0.5, 1.3, 1); g.fillStyle = '#444066'; }
      }
    }
    landLayers.push({ tile, width, height, depth: layer ? 0.09 : 0.035, snow: landSnow(width, height, ridge, layer), leaf: layer ? landLeaves(width, height, ridge) : null });
  }
}

/* 小镇烤好的图上叠一层颗粒（只叠在画过的地方） */
const GRAIN7 = { tile: null };
function grainTile7() {
  if (GRAIN7.tile) return GRAIN7.tile;
  const n = 96, c = mkCanvas(n, n), x = c.getContext('2d'), im = x.createImageData(n, n), d = im.data, rnd = mulberry32(707);
  for (let i = 0; i < n * n; i++) {
    const v = rnd(), k = i * 4, light = v > 0.5;
    d[k] = d[k + 1] = d[k + 2] = light ? 255 : 0; d[k + 3] = Math.floor(Math.pow(Math.abs(v - 0.5) * 2, 3) * 64);
  }
  x.putImageData(im, 0, 0);
  for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(Math.floor(rnd() * n), Math.floor(rnd() * n), 1, 4 + rnd() * 16); }   // 雨水流过的竖痕
  return GRAIN7.tile = c;
}
function townGrain(g, w, h, mode) {
  try {
    const pat = g.createPattern(grainTile7(), 'repeat'); if (!pat) return;
    g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = mode === 'day' ? 0.6 : 0.4;
    g.fillStyle = pat; g.fillRect(0, 0, w, h); g.restore();
  } catch (e) { /* 很旧的浏览器：不叠 */ }
}

/* 街上的房子：在原来的样子上多几层（烤在街道的图里，每帧不多花） */
function houseExtras(g, p, mode, x, w, top, h, base, ref, wins) {
  const day = mode === 'day', hs = Math.abs(Math.round((p.wLo || 0) * 997)) % 11;
  if (mode === 'lights') {
    if (p.door) { const lx = x + w * 0.62 + ref * 0.036, ly = base - ref * 0.05; glow(g, glowSpr, lx, ly, ref * 0.04, ref * 0.04, 0.35); g.fillStyle = css(WARM_HI, 0.95); g.beginPath(); g.arc(lx, ly, Math.max(1.2, ref * 0.0028), 0, TAU); g.fill(); }
    return;
  }
  const gable = p.roof === 'gable', peak = top - ref * 0.045, hh = ref * 0.02;
  if (day) {
    // 屋顶一道道瓦
    g.save(); g.beginPath();
    if (gable) { g.moveTo(x - ref * 0.008, top); g.lineTo(x + w / 2, peak); g.lineTo(x + w + ref * 0.008, top); }
    else { g.moveTo(x - ref * 0.008, top); g.lineTo(x + ref * 0.02, top - hh); g.lineTo(x + w - ref * 0.02, top - hh); g.lineTo(x + w + ref * 0.008, top); }
    g.closePath(); g.clip();
    g.fillStyle = 'rgba(70,30,22,0.28)';
    for (let y = top - ref * 0.004; y > (gable ? peak : top - hh); y -= Math.max(2, ref * 0.0055)) g.fillRect(x - ref * 0.01, y, w + ref * 0.02, Math.max(0.7, ref * 0.0011));
    g.fillStyle = 'rgba(255,220,200,0.14)';
    for (let xx = x - ref * 0.006; xx < x + w + ref * 0.01; xx += Math.max(2.5, ref * 0.007)) g.fillRect(xx, gable ? peak : top - hh, Math.max(0.6, ref * 0.0008), ref * 0.05);
    g.restore();
    // 檐下一排齿饰
    g.fillStyle = 'rgba(241,234,223,0.75)';
    for (let xx = x + ref * 0.003; xx < x + w - ref * 0.003; xx += Math.max(3, ref * 0.008)) g.fillRect(xx, top + ref * 0.002, Math.max(1, ref * 0.003), Math.max(1, ref * 0.0028));
    // 墙角的隅石（右边那条，受光）
    for (let y = top + ref * 0.006, k = 0; y < base - ref * 0.012; y += ref * 0.012, k++) {
      g.fillStyle = 'rgba(241,234,223,0.4)'; g.fillRect(x + w - ref * (k % 2 ? 0.009 : 0.006), y, ref * (k % 2 ? 0.009 : 0.006), ref * 0.01);
      g.fillStyle = 'rgba(20,30,60,0.12)'; g.fillRect(x, y, ref * (k % 2 ? 0.007 : 0.004), ref * 0.01);
    }
    // 两层楼中间一道腰线、墙脚一道勒脚
    if (h > ref * 0.15) { g.fillStyle = 'rgba(241,234,223,0.65)'; g.fillRect(x, top + h * 0.46, w, Math.max(1, ref * 0.0024)); g.fillStyle = 'rgba(20,30,60,0.14)'; g.fillRect(x, top + h * 0.46 + Math.max(1, ref * 0.0024), w, Math.max(0.8, ref * 0.0014)); }
    g.fillStyle = 'rgba(60,40,40,0.2)'; g.fillRect(x, base - h * 0.07, w, h * 0.07);
    g.fillStyle = 'rgba(241,234,223,0.35)'; g.fillRect(x, base - h * 0.07, w, Math.max(0.7, ref * 0.0012));
    // 窗下雨水流过的一道淡痕
    for (const wn of wins) { if (wn.big) continue; const sg = g.createLinearGradient(0, wn.y + wn.h, 0, wn.y + wn.h + ref * 0.03); sg.addColorStop(0, 'rgba(40,40,60,0.12)'); sg.addColorStop(1, 'rgba(40,40,60,0)'); g.fillStyle = sg; g.fillRect(wn.x + wn.w * 0.2, wn.y + wn.h, wn.w * 0.6, ref * 0.03); }
    // 落水管
    if (hs % 2 === 0) {
      const px = x + w - ref * 0.012;
      g.fillStyle = 'rgba(70,64,70,0.55)'; g.fillRect(px, top + ref * 0.002, Math.max(1, ref * 0.0022), h - ref * 0.002);
      for (let y = top + ref * 0.02; y < base; y += ref * 0.03) g.fillRect(px - ref * 0.001, y, Math.max(1.6, ref * 0.0042), Math.max(0.7, ref * 0.001));
    }
    // 二楼的小阳台：栏杆、花盆
    if (h > ref * 0.19) for (const wn of wins) {
      if (wn.big || wn.y > top + h * 0.4 || (Math.round(wn.x) + hs) % 3) continue;
      const bx = wn.x - ref * 0.006, bw = wn.w + ref * 0.012, by = wn.y + wn.h;
      g.fillStyle = 'rgba(230,222,206,0.9)'; g.fillRect(bx - ref * 0.002, by, bw + ref * 0.004, Math.max(1.2, ref * 0.003));
      g.strokeStyle = 'rgba(40,46,64,0.75)'; g.lineWidth = Math.max(0.6, ref * 0.0009);
      g.beginPath(); g.moveTo(bx, by - ref * 0.012); g.lineTo(bx + bw, by - ref * 0.012);
      for (let xx = bx; xx <= bx + bw + 0.1; xx += bw / 6) { g.moveTo(xx, by - ref * 0.012); g.lineTo(xx, by); }
      g.stroke();
      g.fillStyle = '#b5493a'; g.fillRect(bx + bw * 0.1, by - ref * 0.006, ref * 0.006, ref * 0.006);
      g.fillStyle = '#5f8f5a'; g.beginPath(); g.arc(bx + bw * 0.1 + ref * 0.003, by - ref * 0.008, ref * 0.0045, 0, TAU); g.fill();
    }
    // 门边一盏壁灯（白天熄着）
    if (p.door) { const lx = x + w * 0.62 + ref * 0.036, ly = base - ref * 0.05; g.fillStyle = 'rgba(40,46,64,0.85)'; g.fillRect(lx - ref * 0.004, ly - ref * 0.001, ref * 0.004, Math.max(1, ref * 0.0014)); g.beginPath(); g.arc(lx, ly, Math.max(1.4, ref * 0.0032), 0, TAU); g.fill(); }
  } else if (p.door) {
    const lx = x + w * 0.62 + ref * 0.036, ly = base - ref * 0.05; g.fillStyle = css(INK); g.beginPath(); g.arc(lx, ly, Math.max(1.4, ref * 0.0032), 0, TAU); g.fill();
  }
  // 屋顶上的天线、平顶上的水箱：白天、黄昏的剪影上都看得见
  const ink = day ? 'rgba(42,51,80,0.85)' : css(INK);
  if (hs % 3 === 0) {
    const ax = x + w * (gable ? 0.5 : 0.3), ay = gable ? peak : top - hh, ah = ref * 0.03;
    g.strokeStyle = ink; g.lineWidth = Math.max(0.8, ref * 0.0012);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay - ah);
    for (const [f, l] of [[0.35, 0.016], [0.6, 0.012], [0.85, 0.008]]) { g.moveTo(ax - ref * l, ay - ah * f); g.lineTo(ax + ref * l, ay - ah * f); }
    g.stroke();
  } else if (!gable && hs % 3 === 1) {
    const tx = x + w * 0.62, tw2 = ref * 0.022, th2 = ref * 0.014, ty = top - hh;
    g.fillStyle = ink; g.fillRect(tx, ty - th2, tw2, th2); g.fillRect(tx + tw2 * 0.1, ty - th2 - ref * 0.002, tw2 * 0.8, ref * 0.002);
    if (day) { g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(tx + tw2 * 0.75, ty - th2, tw2 * 0.25, th2); }
  }
}

/* 灯塔：多几层——塔身上的色带（白天红白，黄昏里淡淡的几道）、三扇小窗（入夜亮）、回廊的栏杆柱、灯室的窗棂、
   塔脚的基座和守塔人的小屋（入夜窗里有灯）。光束、灯照旧。 */
function drawLighthouses(g) {
  const { ref, t } = S;
  const beamA = clamp((S.nightF - 0.15) / 0.5, 0, 1);
  const roll = t * TAU / 7.3, span = midSpan(), day = S.dayF, lit = 1 - day;
  for (const L of lighthouses()) {
    const { x, by, bh } = L;
    const bw = ref * 0.0115, tw2 = ref * 0.0068, lh2 = ref * 0.013;
    const hidden = span && x > span[0] + ref * 0.05 && x < span[1] - ref * 0.05;   // 山坡遮住的那盏，光束也不画
    if (!hidden) hitAt(g, 'lighthouse', x - bw * 1.6, by - bh - lh2 * 1.7, bw * 3.2, bh + lh2 * 1.7);
    const ink = mix(rgb('#181d45'), rgb('#d8dde6'), day);
    // 守塔人的小屋（塔的右手边，矮矮的）
    {
      const hx = x + bw * 1.3, hw = ref * 0.016, hh = ref * 0.0085;
      g.fillStyle = css(mix(ink, rgb('#c9c2b6'), day * 0.4)); g.fillRect(hx, by - hh, hw, hh);
      g.fillStyle = css(mix(rgb('#141a3e'), rgb('#9b5b45'), day));
      g.beginPath(); g.moveTo(hx - ref * 0.0015, by - hh); g.lineTo(hx + hw * 0.5, by - hh - ref * 0.005); g.lineTo(hx + hw + ref * 0.0015, by - hh); g.closePath(); g.fill();
      const wx = hx + hw * 0.55, wy = by - hh * 0.72, ww = hw * 0.22, wh = hh * 0.38;
      if (beamA > 0.05) { glow(g, glowSpr, wx + ww / 2, wy + wh / 2, ref * 0.014, ref * 0.012, 0.35 * beamA); g.fillStyle = css(WARM, 0.85 * beamA); g.fillRect(wx, wy, ww, wh); }
      else { g.fillStyle = css(mix(rgb('#0c1030'), rgb('#2b3654'), day), 0.9); g.fillRect(wx, wy, ww, wh); }
    }
    // tower silhouette, hip to hip with the far ridge
    g.fillStyle = css(ink);
    g.beginPath();
    g.moveTo(x - bw, by);
    g.lineTo(x - tw2, by - bh);
    g.lineTo(x + tw2, by - bh);
    g.lineTo(x + bw, by);
    g.closePath(); g.fill();
    // 第七版：塔身的色带（白天红白；黄昏、夜里淡淡的几道）、基座
    g.save(); g.beginPath(); g.moveTo(x - bw, by); g.lineTo(x - tw2, by - bh); g.lineTo(x + tw2, by - bh); g.lineTo(x + bw, by); g.closePath(); g.clip();
    g.fillStyle = day > 0.02 ? css([186, 72, 60], 0.85 * day) : 'rgba(0,0,0,0)';
    for (const [f0, f1] of [[0.18, 0.32], [0.5, 0.64]]) {
      if (day > 0.02) g.fillRect(x - bw, by - bh * f1, bw * 2, bh * (f1 - f0));
      g.fillStyle = css([255, 210, 180], 0.06 * lit); g.fillRect(x - bw, by - bh * f1, bw * 2, Math.max(0.7, ref * 0.0009));
      g.fillStyle = day > 0.02 ? css([186, 72, 60], 0.85 * day) : 'rgba(0,0,0,0)';
    }
    g.fillStyle = css(mix(ink, [0, 0, 0], 0.3), 0.5); g.fillRect(x - bw, by - bh * 0.06, bw * 2, bh * 0.06);
    g.restore();
    // 三扇小窗：一扇比一扇高，入夜亮
    for (let k = 0; k < 3; k++) {
      const wy = by - bh * (0.24 + k * 0.25), ww = Math.max(1, ref * 0.0018), wh = Math.max(1.4, ref * 0.0034);
      if (beamA > 0.05 && k !== 1) { g.fillStyle = css(WARM, 0.7 * beamA); } else g.fillStyle = css(mix(rgb('#080b22'), rgb('#2b3654'), day), 0.9);
      g.fillRect(x - ww / 2 + (k - 1) * ref * 0.0008, wy, ww, wh);
    }
    // lantern room and its dome
    g.fillStyle = css(ink);
    g.fillRect(x - lh2 * 0.58, by - bh - lh2, lh2 * 1.16, lh2);
    g.beginPath(); g.arc(x, by - bh - lh2, lh2 * 0.44, Math.PI, 0); g.fill();
    g.fillRect(x - Math.max(0.5, ref * 0.0006), by - bh - lh2 * 1.44 - ref * 0.004, Math.max(1, ref * 0.0012), ref * 0.004);       // 顶上的避雷针
    // gallery rail（第七版：栏杆柱）
    g.fillRect(x - lh2 * 0.72, by - bh - ref * 0.0018, lh2 * 1.44, Math.max(1, ref * 0.0018));
    for (let k = 0; k <= 4; k++) g.fillRect(x - lh2 * 0.72 + k * lh2 * 0.36 - 0.4, by - bh - ref * 0.0055, Math.max(0.8, ref * 0.0008), ref * 0.0055);
    g.fillRect(x - lh2 * 0.72, by - bh - ref * 0.0055, lh2 * 1.44, Math.max(0.7, ref * 0.0008));
    // a last warm rim while the dusk lasts
    g.strokeStyle = 'rgba(255,170,130,' + (0.22 * (1 - beamA * 0.8)).toFixed(3) + ')';
    g.lineWidth = Math.max(0.8, ref * 0.0012);
    g.beginPath(); g.moveTo(x + tw2, by - bh); g.lineTo(x + bw, by); g.stroke();
    if (beamA <= 0.02 || hidden) continue;
    // the lamp itself
    glow(g, glowSpr, x, L.lampY, ref * 0.05, ref * 0.05, (0.45 + 0.1 * Math.sin(t * 2.6 + L.i)) * beamA);
    g.fillStyle = 'rgba(255,238,196,' + (0.95 * beamA).toFixed(3) + ')';
    g.fillRect(x - lh2 * 0.3, L.lampY - lh2 * 0.38, lh2 * 0.6, lh2 * 0.76);
    // 灯室的窗棂
    g.fillStyle = css(ink, 0.8);
    for (const f of [-0.15, 0.15]) g.fillRect(x + lh2 * f - 0.4, L.lampY - lh2 * 0.38, Math.max(0.7, ref * 0.0008), lh2 * 0.76);
    // two sweeping beams; they dim as they dip toward the sea
    const BL = ref * 0.46, half = 0.10;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const dir of [roll, roll + Math.PI]) {
      const fade = 1 - Math.max(0, Math.sin(dir)) * 1.6;
      if (fade <= 0.03) continue;
      const bg = g.createRadialGradient(x, L.lampY, 0, x, L.lampY, BL);
      bg.addColorStop(0, 'rgba(255,230,175,' + (0.16 * beamA * fade).toFixed(3) + ')');
      bg.addColorStop(1, 'rgba(255,230,175,0)');
      g.fillStyle = bg;
      g.beginPath(); g.moveTo(x, L.lampY);
      g.arc(x, L.lampY, BL, dir - half, dir + half);
      g.closePath(); g.fill();
    }
    g.restore();
  }
}
