// 片尾收集簿用的「收集」：一站一站、一幕一幕地走过去，悄悄把看得见的东西收进簿子（每张都是那一刻的高清小图）
// 第四部：第十棒第八版的卡片（鲲是夜里的，四季的东西各在它那一季）
const take = keys => new Function('T', 'fx', 'return ' + JSON.stringify(keys) + '.map(k => [k, fx.collect(k)]).filter(q => q[1]).map(q => q[0]);');
const steps = n => `for (let i = 0; i < ${n}; i++) { __vstep(1000 / 30, false); T.update(1 / 30); }`;
const season = (k, night) => new Function('T', 'fx', `T.NX.seasonForce = ${k}; T.S.timeMode = '${night ? 'night' : 'dusk'}'; T.S.weather = 'clear'; T.S.nightF = ${night ? 1 : 0}; T.S.tramTimer = Infinity; T.NX.lastEnd = 1e9; T.SKY2.moonUp = 1;`);
module.exports = [
  // 暮海的樱不在这里收：片尾 Z 要当着镜头揭下它（新收的一张）
  { hash: '#st=0', preroll: 3, init: season(0), take: take(['station-0', 'swallows', 'chime', 'roofbirds', 'bench', 'room', 'clouds', 'ridge', 'lighthouse', 'birds', 'pole', 'railing', 'her', 'petalraft', 'seasonmark', 'pax-student', 'pax-backpack']) },
  { hash: '#st=1', preroll: 3, init: season(1), take: take(['station-1', 'islet', 'moonflower', 'pax-flowers']) },
  { hash: '#st=2', preroll: 14, init: season(2, true), take: take(['station-2', 'midautumn', 'pampas', 'dango', 'moths', 'cat', 'fallenleaves', 'floatleaf', 'jelly']) },
  { hash: '#st=3', preroll: 6, init: season(1, true), take: take(['station-3', 'egret', 'tidepole', 'summertri', 'fullmoon']) },
  { hash: '#st=4', preroll: 6, init: season(3, true), take: take(['station-4', 'capelight', 'orion', 'icicles', 'driftice', 'seal', 'moonrise']) },
  { hash: '#st=5', preroll: 6, init: season(2, true), take: take(['station-5', 'bellbuoy']) },
  { hash: '#st=6', preroll: 4, init: season(0), take: take(['station-6', 'windsock', 'pinwheel', 'kite', 'pax-suitcase']) },
  { hash: '#st=17', preroll: 8, init: season(1, true), take: take(['station-7', 'lightjars', 'fireflies', 'pax-umbrella']) },
  { hash: '#fullmoon', preroll: 4, init: T => { T.beginEncounter('flyingfish'); T.NX.active.age = 13; T.NX.fish = 1; T.NX.fishWaveT = 1e9; },
    take: new Function('T', 'fx', `fx.fishWave(-1); ${steps(95)} return ['flyingfish'].map(k => [k, fx.collect(k)]);`) },
  { hash: '#lanterns', preroll: 18, init: T => T.beginEncounter('galaxy', null, 90), take: take(['galaxy', 'lanterns']) },
  { hash: '#meteor', preroll: 18, take: new Function('T', 'fx', `const out = [['meteorshower', fx.collect('meteorshower')]]; T.spawnMeteor('bolide'); ${steps(14)} out.push(['bolide', fx.collect('bolide')]); T.spawnMeteor('lone'); ${steps(8)} out.push(['meteor', fx.collect('meteor')]); return out;`) },
  { hash: '#storm', preroll: 18, take: new Function('T', 'fx', `const out = [['storm', fx.collect('storm')]]; fx.bolt(0.5); ${steps(4)} out.push(['lightning', fx.collect('lightning')]); return out;`) },
  { hash: '#noon', preroll: 3, take: take(['sun', 'townfar', 'hill', 'tower', 'mole', 'well', 'bollard', 'netmender', 'kids', 'harbourboats', 'rower', 'streetlamp', 'cumulonimbus']) },
  { hash: '#sunset', preroll: 3, take: take(['sunset', 'market', 'gulls', 'sail']) },
  { hash: '#fireworks', preroll: 6, init: T => { T.NX.seen.fireworks = true; T.S.tramTimer = Infinity; T.S.dwellT = 26; T.S.nightF = .62; T.beginEncounter('fireworks'); T.NX.active.cue = T.FIRE_SCORE.length; T.NX.active.age = 12; },
    take: new Function('T', 'fx', `
      const out = [];
      for (const k of ['station-9', 'bakery', 'tea', 'house', 'laundry', 'terrace', 'walker', 'towncat', 'postbox', 'alley', 'townlanterns']) out.push([k, fx.collect(k)]);
      const kinds = [['peony', 'rose'], ['chrys', 'gold'], ['willow', 'gold'], ['ring', 'mint'], ['crossette', 'gold'], ['palm', 'rose'], ['strobe', 'white']];
      for (const [kind, col] of kinds) {
        fx.fire(.5, .26, kind, col, 1.1);
        ${steps(Math.round((1.5 + .26 * .35 + 1.1 * .1 + .9) * 30))}
        out.push(['fw-' + kind, fx.collect('fw-' + kind)]);
        ${steps(150)}
      }
      return out;`) },
  { hash: '#kun', preroll: 50, take: take(['kun']) },
  { hash: '#st=0', preroll: 1, take: new Function('T', 'fx', `
      return ['letter-1', 'letter-2', 'letter-3', 'letter-4', 'letter-5', 'letter-6', 'letter-7', 'ks-shell', 'ks-ticket', 'ks-flower', 'ks-marble', 'ks-feather', 'ks-key', 'ks-photo', 'ks-starmap']
        .map(k => [k, fx.collectPlain(k)]);`) },
];
