/* 第十棒第三版 · 四季：季节的钟与天色
   · 从你那边今天的节气出发，之后三站一季（一站走过两个节气），十二站一年；
   · 季节改天、云、海、山和月台上的东西，不改你选的时间：黄昏还是黄昏，夜还是夜；
   · 每一季的天各有一套颜色：黄昏、夜、白天（小镇的下午）。相邻两季之间有半站左右的过渡。 */
const TERMS = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];
const TERM_DAYS = [[2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20], [5, 6], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 8], [8, 23], [9, 8], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22], [1, 6], [1, 20]];
const SEASON_STATIONS = 3;                                  // 三站一季
const SEASON_BLEND = 0.17;                                  // 换季：边界前后各 0.17 季（约半站）慢慢渗过去
// 0 = 立春，1 = 立夏，2 = 立秋，3 = 立冬；小数是这一季走了多少
function realSeasonPos(d) {
  const y = d.getFullYear(), at = (k, yy) => new Date(yy, TERM_DAYS[k][0] - 1, TERM_DAYS[k][1]).getTime();
  const Y = d.getTime() >= at(0, y) ? y : y - 1;
  const when = k => k >= 24 ? at(0, Y + 1) : at(k, k >= 22 ? Y + 1 : Y);
  const now = d.getTime();
  for (let k = 0; k < 24; k++) {
    const a = when(k), b = when(k + 1);
    if (now >= a && now < b) return (k + (now - a) / (b - a)) / 6;
  }
  return 0;
}
const SEASON0 = (() => {
  const m = /[?&]s0=([\d.]+)/.exec(location.search);            // 审片用：?s0=2.5 从立秋后半出发
  return m ? mod(+m[1], 4) : realSeasonPos(new Date());
})();
function seasonPos() {
  if (NX.seasonForce >= 0) return NX.seasonForce + 0.5;           // 后门钉住某一季：那一季的正中
  return mod(SEASON0 + S.travel / (G() * SEASON_STATIONS), 4);
}
function seasonPhase() { return mod(seasonPos() - 0.5, 4); }      // 0 = 春的正中（老代码按这个算）
function seasonWeight(i) {
  const d = Math.abs(mod(seasonPos() - (i + 0.5) + 2, 4) - 2);    // 到这一季正中的环形距离，0..2
  return smooth((0.5 + SEASON_BLEND - d) / (2 * SEASON_BLEND));
}
function termIndex(pos) { return mod(Math.floor((pos == null ? seasonPos() : pos) * 6), 24); }
function termAtStation(i) { return termIndex(NX.seasonForce >= 0 ? NX.seasonForce + 0.5 : mod(SEASON0 + i / SEASON_STATIONS, 4)); }

const hexes = a => a.map(rgb);
const SEASON_PAL = [
  { // 春 · 软：粉、雾、湿，对比低
    dusk: hexes(['#6a6ca8', '#9a88b4', '#c391ad', '#dc9c98', '#ffd0a6', '#ffdcb4', '#ffe8c8']),
    day: hexes(['#6a97d2', '#98bce6', '#cfe0ef', '#efeee8']),
    night: [18, 20, 58], nightA: .74, nightDesat: .4,
    glow: [255, 236, 200], glowA: .72, glowW: 1.25, glowX: .72, hz: [[236, 196, 190, .35], [206, 168, 182, .7]],
    wash: [255, 190, 182], washA: .3, haze: [255, 226, 218], hazeA: .2,
    sea: hexes(['#3e4898', '#1d2b66']), seaDay: hexes(['#4a8cad', '#1e5272']),
    cl: { dusk: [[132, 112, 172], [255, 200, 204], [255, 236, 228]], night: [[46, 48, 98], [116, 124, 176], [150, 160, 206]], day: [[182, 194, 218], [250, 251, 253], [255, 255, 255]] },
    calm: .9, glint: .9, stars: .7, rays: .55
  },
  { // 夏 · 亮：金、高云、热
    dusk: hexes(['#1b2f90', '#273890', '#4a3593', '#9f428b', '#e45f7c', '#ff985f', '#ffd78a']),
    day: hexes(['#2d6ccf', '#61a2ea', '#bde0f5', '#eef5ef']),
    night: [6, 10, 40], nightA: .66, nightDesat: 0,
    glow: [255, 204, 132], glowA: .9, glowW: 1.1, glowX: .78, hz: [[36, 42, 102, .62], [29, 40, 89, .94]],
    wash: [255, 160, 110], washA: .3, haze: [255, 246, 228], hazeA: .08,
    sea: hexes(['#2e3b98', '#13205e']), seaDay: hexes(['#2a8bb2', '#135579']),
    cl: { dusk: [[98, 68, 142], [255, 170, 116], [255, 226, 166]], night: [[30, 34, 82], [100, 112, 172], [140, 150, 200]], day: [[166, 184, 214], [255, 255, 255], [255, 255, 255]] },
    calm: 1.15, glint: 1.25, stars: 1, rays: 1
  },
  { // 秋 · 远：红、高天、澄
    dusk: hexes(['#232e7f', '#2f3282', '#443a8a', '#8c4a78', '#e88a5c', '#ffb868', '#ffd27a']),
    day: hexes(['#3a6cc2', '#78a8df', '#cee1ef', '#f3ecdc']),
    night: [8, 10, 44], nightA: .72, nightDesat: .5,
    glow: [255, 176, 96], glowA: .95, glowW: 1, glowX: .7, hz: [[44, 40, 100, .55], [32, 34, 86, .9]],
    wash: [255, 130, 96], washA: .32, haze: [255, 236, 214], hazeA: .04,
    sea: hexes(['#2b3189', '#111a50']), seaDay: hexes(['#2f75a6', '#134466']),
    cl: { dusk: [[84, 56, 122], [255, 124, 98], [255, 200, 144]], night: [[30, 30, 80], [118, 122, 182], [160, 166, 214]], day: [[176, 188, 212], [250, 250, 248], [255, 255, 255]] },
    calm: .8, glint: 1.05, stars: 1.1, rays: 1.1
  },
  { // 冬 · 静：白、长夜、钟
    dusk: hexes(['#2c3460', '#465a8a', '#7f8fb4', '#c7b0a8', '#e8a080', '#f2b088', '#f6c49a']),
    day: hexes(['#7e9cc9', '#a8c0df', '#d7e2ee', '#eef0f3']),
    night: [4, 8, 30], nightA: .74, nightDesat: .25,
    glow: [255, 170, 130], glowA: .7, glowW: .9, glowX: .64, hz: [[52, 60, 104, .55], [40, 48, 90, .9]],
    wash: [246, 176, 178], washA: .26, haze: [236, 240, 250], hazeA: .12,
    sea: hexes(['#272f70', '#0d1742']), seaDay: hexes(['#4a7c98', '#1c3f58']),
    cl: { dusk: [[112, 114, 160], [246, 186, 192], [252, 232, 230]], night: [[26, 32, 72], [140, 156, 202], [176, 190, 226]], day: [[186, 196, 216], [246, 248, 252], [255, 255, 255]] },
    calm: .7, glint: .75, stars: 1.35, rays: .5
  }
];
const SKY_STOPS = [0, 0.3, 0.52, 0.7, 0.84, 0.93, 1], DAY_STOPS = [0, 0.45, 0.8, 1];
// 按四季的权重把一个数或一个颜色混起来
function seasonNum(f) { let s = 0; for (let i = 0; i < 4; i++) { const w = seasonWeight(i); if (w) s += w * f(SEASON_PAL[i]); } return s; }
function seasonCol(f) {
  const o = [0, 0, 0];
  for (let i = 0; i < 4; i++) { const w = seasonWeight(i); if (!w) continue; const c = f(SEASON_PAL[i]); o[0] += c[0] * w; o[1] += c[1] * w; o[2] += c[2] * w; }
  return o;
}
function dayAt(P, s) {                                       // 白天那条四档渐变在 s 处的颜色
  for (let i = 0; i < DAY_STOPS.length - 1; i++) if (s <= DAY_STOPS[i + 1]) return mix(P.day[i], P.day[i + 1], (s - DAY_STOPS[i]) / (DAY_STOPS[i + 1] - DAY_STOPS[i]));
  return P.day[DAY_STOPS.length - 1];
}
function seaTop() { return mix(seasonCol(P => P.sea[0]), seasonCol(P => P.seaDay[0]), S.dayF); }
function seaBot() { return mix(seasonCol(P => P.sea[1]), seasonCol(P => P.seaDay[1]), S.dayF); }
