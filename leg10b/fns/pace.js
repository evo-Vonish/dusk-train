/* 第十棒第二版 · 流畅与省电
   · 动的时候最多 60 帧（120Hz 的屏也不画到 120），静的时候 30 帧：列车停着、天上没有快的东西、也没人碰屏幕；
   · 画质守门一直看着：实际帧距比目标长出四成、持续三秒，就降一档分辨率（最低 1.25 倍），之后至少隔 8 秒再看；
   · 颗粒已经烤进暗角里，每帧少铺一整屏。 */
const PACE = { poke: -1e9, acc: 0, want: 0, lastDrop: -1e9, start: 0, calm: false };
function pacePoke() { PACE.poke = performance.now(); }
for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, pacePoke, { passive: true });
function calmNow() {
  if (DEV.speed > 1) { PACE.why = 'DEV_speed'; return false; }
  if (performance.now() - PACE.poke < 1600) { PACE.why = 'performance_now'; return false; }                       // 刚有人碰过：跟手
  if (S.tramMode !== 'parked' || Math.abs(S.cameraV) > 0.004 || S.tramV > 0.001) { PACE.why = 'S_tramMode'; return false; }
  if (S.bellT >= 0 || roofFlock) { PACE.why = 'S_bellT'; return false; }                                  // 鸣铃、海鸟起飞
  if (meteors.length || NX.lightning || NX.sheet || NX.flash > 0.02) { PACE.why = 'meteors_length'; return false; }
  if (NX.rockets.length || NX.bursts.length || NX.sparks.length) { PACE.why = 'NX_rockets'; return false; }   // 烟花
  if (NX.fishes.length || NX.drops.length) { PACE.why = 'NX_fishes'; return false; }                        // 飞鱼、水花
  const a = NX.active;
  if (a && (a.kind === 'dolphins' || a.kind === 'storm' || a.kind === 'meteor' || a.kind === 'fireworks' || a.kind === 'flyingfish')) { PACE.why = 'a_a'; return false; }
  if (S.rainI > 0.25 || S.stormF > 0.03) { PACE.why = 'rain'; return false; }
  if (PX.walkers.length || PX.floats.length || S.girlAt === 'walking') { PACE.why = 'PX_walkers'; return false; }
  if (TW.ferry && (TW.ferry.state === 'leaving' || TW.ferry.state === 'arriving')) { PACE.why = 'TW_ferry'; return false; }
  PACE.why = '';
  return true;
}
function frame(now) {
  raf = 0;
  if (document.hidden || S.pageHidden) { last = 0; return; }
  const calm = !S.reduced && calmNow(), target = 1000 / (calm ? 30 : 60);
  PACE.calm = calm;
  if (last && now - last < target - 2.5) { raf = requestAnimationFrame(frame); return; }
  const rawDt = last ? (now - last) / 1000 : 1 / 60;
  last = now;
  if (!S.paused) for (let k = 0; k < DEV.speed; k++) update(Math.min(Math.max(0, rawDt), 0.05));
  draw();
  if (!S.paused && !document.hidden && !S.pageHidden) raf = requestAnimationFrame(frame);
  // 画质守门：只看真正在走的时候；暂停、刚恢复的那一帧不算
  if (!S.paused && rawDt < 0.25) {
    if (!PACE.start) PACE.start = now;
    PACE.acc += rawDt * 1000; PACE.want += target;
    if (PACE.acc > 3000) {
      const ratio = PACE.acc / PACE.want, early = now - PACE.start < 9000;
      if (ratio > (early ? 1.3 : 1.4) && S.dpr > 1.3 && now - PACE.lastDrop > 8000) {
        S.dprCap = Math.max(1.25, S.dpr - (early && ratio > 1.8 ? 0.5 : 0.25)); PACE.lastDrop = now; layout();
      }
      PACE.acc = PACE.want = 0;
    }
  }
}
