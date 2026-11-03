# 小改动（锚点必须恰好出现一次）
# ---- 流畅：颗粒烤进暗角（每帧少铺一整屏）；揭卡的高清重画用不带颗粒的那一张
rep("let sky = null, vig = null, world = null, wctx = null, glowSpr = null, glowSprCyan = null;",
    "let sky = null, vig = null, vigPlain = null, world = null, wctx = null, glowSpr = null, glowSprCyan = null;")
rep("""function buildVignette() {
  const { W, H, dpr } = S;
  vig = document.createElement('canvas');
  vig.width = canvas.width; vig.height = canvas.height;
  const g = vig.getContext('2d');
  g.scale(dpr, dpr);
  const gl = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.4, W / 2, H * 0.5, Math.hypot(W, H) * 0.62);
  gl.addColorStop(0, 'rgba(8,8,28,0)');
  gl.addColorStop(1, 'rgba(8,8,28,0.24)');
  g.fillStyle = gl; g.fillRect(0, 0, W, H);
}""", """function buildVignette() {
  const { W, H, dpr } = S;
  const make = withGrain => {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const gl = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.4, W / 2, H * 0.5, Math.hypot(W, H) * 0.62);
    gl.addColorStop(0, 'rgba(8,8,28,0)');
    gl.addColorStop(1, 'rgba(8,8,28,0.24)');
    g.fillStyle = gl; g.fillRect(0, 0, W, H);
    if (withGrain) { g.fillStyle = g.createPattern(grainTile(), 'repeat'); g.fillRect(0, 0, W, H); }
    return c;
  };
  vig = make(true); vigPlain = make(false);
}
let grainTileC = null;
function grainTile() {
  if (grainTileC) return grainTileC;
  const tile = document.createElement('canvas'); tile.width = tile.height = 128;
  const g = tile.getContext('2d'), data = g.createImageData(128, 128), rnd = mulberry32(81);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = rnd() > 0.5 ? 220 : 20;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = Math.floor(rnd() * 15);
  }
  g.putImageData(data, 0, 0); grainTileC = tile; return tile;
}""")
rep("""  g.putImageData(data, 0, 0); grain = ctx.createPattern(tile, 'repeat');""",
    """  g.putImageData(data, 0, 0); grain = ctx.createPattern(grainTile(), 'repeat');""")
rep("""  ctx.drawImage(vig, 0, 0, W, H);
  if (RX) return;
  ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H);""", """  ctx.drawImage(RX ? vigPlain : vig, 0, 0, W, H);
  if (RX) return;""")
# ---- 流畅：天空底色（黄昏的天 + 白天的天 + 雨的灰 + 夜的暗）合成一张，只在天色真的变了时重画
rep("""  wctx.drawImage(sky, -PAD, 0, W + PAD * 2, yM + 1);
  if (S.dayF > 0.001) { wctx.globalAlpha = S.dayF; wctx.drawImage(skyDay, -PAD, 0, W + PAD * 2, yM + 1); wctx.globalAlpha = 1; }
  if (S.dayF > 0.001 && S.rainI > 0.01) { wctx.fillStyle = 'rgba(150,160,175,' + (0.5 * S.rainI * S.dayF).toFixed(3) + ')'; wctx.fillRect(-PAD, 0, W + PAD * 2, yM); }
  if (S.nightF > 0.001) {
    wctx.fillStyle = 'rgba(8,12,42,' + (0.64 * S.nightF).toFixed(3) + ')';
    wctx.fillRect(-PAD, 0, W + PAD * 2, yM);
  }""", """  wctx.drawImage(skyMixed(), -PAD, 0, W + PAD * 2, yM + 1);""")

# ---- 细节：车站的新东西都能揭下来（插在「远汀的树」后面）
rep("""  C('islet', 'common', 'sea', '远汀的树', '一块很小的沙洲，只够长一棵树。树一直歪向一边——那是风的方向。', '远汀附近的海上。'),
""", """  C('islet', 'common', 'sea', '远汀的树', '一块很小的沙洲，只够长一棵树。树一直歪向一边——那是风的方向。', '远汀附近的海上。'),
  C('pampas', 'common', 'sea', '芒草', '月见站两头的芒草。风一过，穗子就朝海那边低下去，像在替月亮鞠躬。', '月见站的月台两头。'),
  C('tidepole', 'common', 'sea', '潮位尺', '潮生站外的潮位尺，一格一格刷着红白漆。涨潮的时候，数字一格一格地沉下去。', '潮生站外的水里。'),
  C('capelight', 'common', 'sea', '灯岬的灯塔', '离站台最近的一座灯塔。光柱每扫过一圈，站名牌就亮一下，像有人在念站名。', '灯岬站的后面。'),
  C('bellbuoy', 'common', 'sea', '浮标钟', '汐音站外的浮标钟。浪一推它就响一声，汐音这个名字，大概就是从这里来的。', '汐音站外的海上。'),
  C('windsock', 'common', 'sea', '风向袋', '听风站的风向袋。它鼓起来、朝着车头那边指的时候，你就知道风从海上来。', '听风站候车室的房顶上。'),
  C('pinwheel', 'common', 'sea', '纸风车', '有人插在候车室窗下花槽里的三只纸风车。风大一点，它们就转成三朵花。', '听风站，风大的时候。'),
  C('lightjars', 'common', 'sea', '光瓶', '拾光站的长椅上放着几只玻璃瓶，里面装着白天剩下的一点光。天黑以后，它们自己亮起来。', '拾光站的长椅上。'),
""")
# ---- 细节：水里的光柱、汐音的浮标钟；浮标钟的声音
rep("drawFogWater(); drawFirelightWater(); drawSeaSparkles();", "drawFogWater(); drawFirelightWater(); drawLampWater(); drawSeaSparkles();")
rep("drawShoal(); drawBoat(); drawWhale();", "drawShoal(); drawBoat(); drawBellBuoy(); drawWhale();")
rep("  updateWindChime(dt);\n  if (roofFlock)", "  updateWindChime(dt); updateStationProps();\n  if (roofFlock)")

# ---- 细节：拾光的天不再是半白天半黄昏的一锅粥
#   1. 小镇的太阳晚一点亮：停在拾光时还是黄昏（只亮了一点点），开出拾光以后才一路亮起来；
#   2. 黄昏的云先退场，白天的云后到场，中间是一段干净的、刚刚放晴的天。
rep("const TOWN_SUN = [[6.4, 0, 0], [7.4, 1, 0], [8.5, 1, 0],", "const TOWN_SUN = [[6.4, 0, 0], [7.0, 0.12, 0], [7.6, 1, 0], [8.5, 1, 0],")
rep("const driftAlpha = (skyArtReady ? 0.22 : 1) * (1 - Math.max(NX.galaxy, NX.meteor * .5) * .82), dayC = S.dayF;",
    "const driftAlpha = (skyArtReady ? 0.22 : 1) * (1 - Math.max(NX.galaxy, NX.meteor * .5) * .82), duskC = 1 - smooth(S.dayF / 0.75), dayC = smooth((S.dayF - 0.25) / 0.75);")
rep("for (const c of cloudsLit) { const a = c.a * (1 - S.nightF * 0.55) * driftAlpha * (1 - dayC);", "for (const c of cloudsLit) { const a = c.a * (1 - S.nightF * 0.55) * driftAlpha * duskC;")
rep("for (const c of cloudsDark) { const a = c.a * driftAlpha * (1 - dayC);", "for (const c of cloudsDark) { const a = c.a * driftAlpha * duskC;")

# ---- 细节：茶屋露台的小灯（傍晚亮）
rep("  if (TW.tea) { for (const [fx, need] of [[0.22, 0], [0.66, 1]]) { if (need && day < 0.5) continue;",
    "  if (TW.tea) { if (onScreen(X(TW.tea.wHi)) || onScreen(X(TW.tea.wLo))) drawTeaLights(g, X(TW.tea.wHi), TW.tea.w * ref, base, day); for (const [fx, need] of [[0.22, 0], [0.66, 1]]) { if (need && day < 0.5) continue;")

# ---- 细节：远汀的松不再挤在月见的站棚后面——沙洲近一点（视差 0.11 → 0.2），停在月见时它已经出了画面
rep("const ISLET_DEPTH = 0.11;", "const ISLET_DEPTH = 0.2;")

# ---- 给下一棒：第二版说了什么
rep("""   · 新增：远汀的树（海上的沙洲）、广场的大树（夜里冠子里有小灯）、神社的松；后门 #st=N 停在第 N 站。 */
""", """   · 新增：远汀的树（海上的沙洲）、广场的大树（夜里冠子里有小灯）、神社的松；后门 #st=N 停在第 N 站。 */

/* 第十棒「沿途」· 第二版（打磨：画面细节与流畅度）：
   · 流畅与省电：动的时候最多 60 帧；静的时候（列车停着、天上没有快的东西、没人碰屏幕）30 帧（PACE / calmNow）。
     画质守门：实际帧距比目标长出四成、持续三秒，就降一档分辨率（最低 1.25 倍）。
     天空底色（黄昏、白天、雨、夜四层）合成一张（skyMixed），星河的底（压深的天、星野、银河、亮星四层）合成一张（GALC），
     都只在天色真的变了才重画；颗粒烤进暗角，每帧少铺一整屏。同样分辨率下，手机上每帧少 4%～51%（星夜省得最多）。
   · 列车：通风顶、受电弓的绝缘座与夜里偶尔的电火花；车厢的灯带、吊环、座椅靠背；第四扇窗是车门；
     转向架、前灯罩、天色镶的一道边；乘客是坐着的侧影，各有各的帽子、琴颈、行李、花、书、孩子、灯笼。
   · 车站：她和等车的人站在柱子之间；吊灯有灯罩、往下的一束光和地上的一小片光；飞蛾看得见了；
     站名牌有拼音，左边下一站、右边上一站；候车室有钟（走的是你那边的时间，慢七分钟）、时刻表、门、半拉的帘子；
     长椅有靠背，刻着一个小月亮。每一站一样自己的东西：月见的芒草、潮生的潮位尺、灯岬的灯塔（光扫过时站名牌亮一下）、
     汐音的浮标钟（浪推一下响一声）、听风的风向袋与纸风车、拾光长椅上的光瓶——收集簿添了这七张。
   · 水：灯在水里拉成一根根晃动的光柱（吊灯、候车室的窗、车窗、栏杆的小灯），黄昏淡，入夜才亮。
   · 天：停在拾光时还是黄昏，开出拾光才一路天亮；黄昏的云先退、白天的云后到。
   · 小镇：山坡上的人家有了窗台、百叶、花、门、烟囱，人家之间有柏树和晾衣绳；茶屋的露台傍晚亮一串小灯。
   · 远汀的沙洲视差 0.11 → 0.2：停在月见时，那棵松不再挤在站棚后面。
   · 第二版新加的函数在「第十棒第二版 · …」那几段里；改过的函数还在原来的位置。接力继续。 */
""")

HTML_PATCHES = [("<title>黄昏列车 · 第十棒「沿途」｜没有终点</title>", "<title>黄昏列车 · 第十棒「沿途」第二版｜没有终点</title>", 1)]

# ================= 第三版 · 四季 =================
# ---- 活的天：老的两层云图换成现画的云；黄昏的光
import re as _re
_m = _re.search(r"  const driftAlpha = \(skyArtReady \? 0\.22 : 1\).*?\n  for \(const c of cloudsLit\).*?\n  for \(const c of cloudsDark\).*?\n  wctx\.globalAlpha = 1;\n", js)
assert _m, 'old cloud block not found'
js = js[:_m.start()] + "  drawSkyClouds(wctx); drawDuskRays(wctx);\n" + js[_m.end():]
rep("const SEASONS_ON_JOURNEY = false;", "const SEASONS_ON_JOURNEY = true;")
# ---- 海的颜色跟着季节；黄昏那团光的位置跟着季节
rep("  const WT = mix(WATER_TOP, DAY_WATER_TOP, S.dayF), WB = mix(WATER_BOT, DAY_WATER_BOT, S.dayF);", "  const WT = seaTop(), WB = seaBot();")
rep("  ctx.fillStyle = css(mix(WATER_BOT, DAY_WATER_BOT, S.dayF)); ctx.fillRect(0, yM, W, H - yM);", "  ctx.fillStyle = css(seaBot()); ctx.fillRect(0, yM, W, H - yM);")
rep("  ctx.drawImage(glowSpr, W * (S.portrait ? 0.62 : 0.74) - S.ref * 0.4, yM, S.ref * 0.8, depth * 0.5);", "  ctx.drawImage(glowSpr, duskGlowX() - S.ref * 0.4, yM, S.ref * 0.8, depth * 0.5);")
rep("    { x: W * (S.portrait ? 0.62 : 0.74), col: [255, 186, 152], k: (1 - S.nightF * 0.65) * (1 - S.dayF) * (1 - moonOn * .8), n: 42, spread: 1 },",
    "    { x: duskGlowX(), col: mix([255, 186, 152], seasonCol(P => P.glow), .6), k: (1 - S.nightF * 0.65) * (1 - S.dayF) * (1 - moonOn * .8) * seasonNum(P => P.glint), n: 42, spread: 1 },")
# ---- 新的卡片：积雨云、鳞云
rep("""  C('pampas', 'common', 'sea', '芒草',""", """  C('cumulonimbus', 'common', 'sea', '积雨云', '夏天傍晚，地平线上堆起一座云山。太阳落下去以后，只有山顶还亮着。夜里它会在里面无声地闪。', '夏天，远处的地平线上。'),
  C('mackerel', 'common', 'sea', '鳞云', '秋天的高处铺满一片片小云，像鱼鳞。黄昏的时候，每一片的下沿都被照红。', '秋天黄昏的高处。'),
  C('pampas', 'common', 'sea', '芒草',""")
# ---- 月：秋天的更大；春天的带一圈晕（朦胧月）
rep("  SKY2.moonR = ref * (.033 + .009 * SKY2.moonLit) * (1 + .3 * (1 - u));", "  SKY2.moonR = ref * (.033 + .009 * SKY2.moonLit) * (1 + .3 * (1 - u)) * (1 + .12 * seasonWeight(2));")
rep("  if (lit > .6) glow(g, glowSprCyan, x, y, r * 3.2, r * 3.2, .12 * (lit - .6));       // 满月边上一点银",
    """  if (lit > .6) glow(g, glowSprCyan, x, y, r * 3.2, r * 3.2, .12 * (lit - .6));       // 满月边上一点银
  const spr = seasonWeight(0);
  if (spr > .03) {                                                                       // 春天的月亮隔着一层霾：一大团柔光，外面一圈淡淡的晕
    glow(g, glowSpr, x, y, r * 15, r * 15, .16 * spr * (.4 + .6 * lit));
    g.strokeStyle = css([255, 236, 220], .06 * spr * lit); g.lineWidth = r * .5; g.beginPath(); g.arc(x, y, r * 3.3, 0, TAU); g.stroke();
  }""")
# ---- 定格的晚霞：每帧看一眼
rep("  updateWindChime(dt); updateStationProps();\n", "  updateWindChime(dt); updateStationProps(); updateFrozen(dt);\n")
# ---- 卡片：天上的
rep("""  C('cumulonimbus', 'common', 'sea', '积雨云',""", """  C('orion', 'common', 'sea', '猎户座', '冬夜最好认的一组星：三颗排成一条腰带，左上一颗发红，右下一颗发蓝。腰带下面那一小团雾，是一片星云。', '冬天晴朗的夜里。'),
  C('summertri', 'common', 'sea', '夏季大三角', '织女、牛郎，和天鹅尾巴上的那一颗。夏天的夜里，它们差不多在头顶上，银河从中间流过去。', '夏天晴朗的夜里。'),
  C('snowpeak', 'common', 'sea', '雪山', '冬天的远山白了头。黄昏的时候，雪是粉色的。', '冬天，远处的山。'),
  C('cumulonimbus', 'common', 'sea', '积雨云',""")
rep("""  C('sunset', 'high', 'sky', '落日',""", """  C('frozendusk', 'high', 'sky', '定格的晚霞', '有那么一会儿，晚霞停住了，像一张照片。列车没有停，它也没有再动。', '暮海的黄昏，偶尔。'),
  C('sunset', 'high', 'sky', '落日',""")
# 定格的那一刻，整片天可以揭
rep("  drawSkyClouds(wctx); drawDuskRays(wctx);\n", "  drawSkyClouds(wctx); drawDuskRays(wctx);\n  if (FROZEN.k > .6) hitBg('frozendusk', 0, 0, W, yM * .8);\n")
# ---- 海：季节里的东西；渔火；倒影的晃动跟着季节
rep("drawFirelightWater(); drawLampWater(); drawSeaSparkles();", "drawFirelightWater(); drawLampWater(); drawSeaSeason(); drawSeaSparkles();")
rep("  drawLandscape(wctx); drawIslets(wctx);", "  drawLandscape(wctx); drawFishingFleet(wctx); drawIslets(wctx);")
rep("  const strip = 3;\n  const depth = H - yM;", "  const strip = 3, calm = seasonNum(P => P.calm);\n  const depth = H - yM;")
rep("    off = clamp(off * (1 - 0.5 * S.harbourF) * (1 + S.stormF * 3.6)", "    off = clamp(off * (1 - 0.5 * S.harbourF) * calm * (1 + S.stormF * 3.6)")
rep("""  C('frozendusk', 'high', 'sky', '定格的晚霞',""", """  C('seal', 'high', 'sea', '流冰上的海豹', '冬天快过完的时候，海上漂来一块一块的冰。最大的那一块上趴着一只海豹，隔一会儿抬起头看一看列车。', '冬末，海上的流冰。'),
  C('frozendusk', 'high', 'sky', '定格的晚霞',""")
rep("""  C('orion', 'common', 'sea', '猎户座',""", """  C('petalraft', 'common', 'sea', '花筏', '樱花落在水面上，聚成一小片一小片，像一只只粉色的小筏子，慢慢漂。', '春天的水面上。'),
  C('floatleaf', 'common', 'sea', '漂着的落叶', '一片红叶落在海上，没有沉下去。它会一直漂到哪里呢。', '秋天的水面上。'),
  C('fishingfleet', 'common', 'sea', '秋夜的渔火', '远处的海平线上一排小灯，是出海的渔船。每一盏都在水里拉出一根长长的光。', '秋天的夜里，看海平线。'),
  C('seasmoke', 'common', 'sea', '海烟', '冷天的海比空气暖，海面上一缕一缕地冒白气，像整片海在慢慢地呼吸。', '冬天，冷的时候。'),
  C('driftice', 'common', 'sea', '流冰', '一块一块的冰从北边漂来，碰到一起，轻轻地响。', '冬天快过完的时候。'),
  C('orion', 'common', 'sea', '猎户座',""")
# ---- 仪表盘：本站旁边写着现在的节气
HTML_PATCHES.append(('<span id="dash-on" class="pip on" hidden><span aria-hidden="true">等车 </span><i>0</i></span></div>',
                     '<span id="dash-on" class="pip on" hidden><span aria-hidden="true">等车 </span><i>0</i></span><span id="dash-term" class="term" title="节气"></span></div>', 1))
HTML_PATCHES.append(('  .pip { font: 500 11px/1 system-ui, sans-serif;',
                     '  .dash-next .term { margin-left: auto; padding-left: 6px; font: 400 11.5px/1 "Noto Serif SC", "Songti SC", "Source Han Serif SC", serif; letter-spacing: 0.2em; color: rgba(var(--cream), 0.58); white-space: nowrap; }\n  .pip { font: 500 11px/1 system-ui, sans-serif;', 1))
rep("function syncDash(bump) {\n  const km = store.km.toFixed(1);", "let dashTermEl = null;\nfunction syncDash(bump) {\n  const tm = TERMS[termIndex()];\n  if (tm !== DASH.term) { DASH.term = tm; (dashTermEl || (dashTermEl = document.getElementById('dash-term'))).textContent = tm; }\n  const km = store.km.toFixed(1);")
# ---- 她随季节换一点点
rep("  g.quadraticCurveTo(gx + gh * 0.09, gy - gh * 0.4, gx + gh * 0.11, gy - gh * 0.15);\n  g.stroke();\n}", "  g.quadraticCurveTo(gx + gh * 0.09, gy - gh * 0.4, gx + gh * 0.11, gy - gh * 0.15);\n  g.stroke();\n  girlSeason(g, gx, gy, gh, sway);\n}")
# ---- 卡片：月台上的四季
rep("""  C('pampas', 'common', 'sea', '芒草',""", """  C('sakura', 'common', 'sea', '暮海的樱', '暮海站边上的一棵老樱树。开花的那几天，月台上的长椅都是粉的。', '春天，暮海。'),
  C('swallows', 'common', 'sea', '燕子窝', '站棚底下有一个泥做的窝，三只小燕子探着头，张着黄嘴，等大燕子飞回来。', '春天和夏天，站棚底下。'),
  C('moonflower', 'common', 'sea', '夕颜', '爬在站棚柱子上的白花。别的花傍晚合上了，它偏偏在这时候开，一直开到天亮。', '夏天的傍晚，站棚的柱子上。'),
  C('fallenleaves', 'common', 'sea', '月台上的落叶', '风把叶子吹到月台上，一片一片。墙边靠着一把扫帚，可是谁也舍不得扫。', '秋天的月台。'),
  C('icicles', 'common', 'sea', '冰柱', '站棚的檐口挂着一排冰柱，长短不一。灯一照，每一根都亮。', '冬天，站棚的檐口。'),
  C('snowman', 'common', 'sea', '雪人', '不知道是谁堆的。头上扣着一只水桶，围巾是一截红毛线，胡萝卜鼻子朝着车头。', '冬天，暮海的月台。'),
  C('persimmons', 'common', 'sea', '一串柿子', '暮海的檐下挂着一串柿子，风吹过来轻轻地晃。等到冬天，它们就成了柿饼。', '秋天，暮海的檐下。'),
  C('dango', 'common', 'sea', '月见团子', '三方台上叠着十五颗白团子，旁边插着芒草。是给月亮的。', '秋天，月见站。'),
  C('egret', 'common', 'sea', '白鹭', '夏天，潮位尺的顶上站着一只白鹭，一条腿收着。它偶尔伸长脖子看一看海。', '夏天，潮生站外。'),
  C('koinobori', 'common', 'sea', '鲤鱼旗', '黑的、红的、蓝的三条鲤鱼，风一来就在杆子上游起来。', '夏天，听风站。'),
  C('kite', 'common', 'sea', '风筝', '有人把风筝的线拴在月台的栏杆上，自己走了。风筝一直在天上。', '春天，听风站。'),
  C('snowlanterns', 'common', 'sea', '雪灯', '月台边一排雪做的小灯，里面点着蜡烛。走过的人都放慢了脚步。', '冬天，拾光站。'),
  C('seasonmark', 'common', 'sea', '车身上的季节牌', '车身上一块小圆牌，跟着季节换：樱、烟花、红叶、雪花。司机说，换牌的那天他会早到一会儿。', '车身上，第一扇窗下面。'),
  C('pampas', 'common', 'sea', '芒草',""")
rep("""  C('seal', 'high', 'sea', '流冰上的海豹',""", """  C('fireflies', 'high', 'sea', '萤火', '夏天的夜里，草丛里慢慢升起一点一点的光。有几只飞进了长椅上的光瓶，就不出来了。', '夏夜，拾光和月见。'),
  C('seal', 'high', 'sea', '流冰上的海豹',""")
# ---- 四季的高光、声音、节气章
rep("  updateWindChime(dt); updateStationProps(); updateFrozen(dt);\n", "  updateWindChime(dt); updateStationProps(); updateFrozen(dt); updateSeasonMoments(dt);\n")
rep("drawStars(wctx); drawMoon(wctx); drawMeteors(wctx);", "drawStars(wctx); drawMoon(wctx); drawMidAutumn(wctx); drawMeteors(wctx);")
rep("  SKY2.moonPhase = mod(SKY2.moonSeed + S.travel / (G() * 12), 1);\n", "  SKY2.moonPhase = mod(SKY2.moonSeed + S.travel / (G() * 12), 1);\n  { const ma = midAutumn(); if (ma > .001) SKY2.moonPhase = mod(SKY2.moonPhase + (mod(.5 - SKY2.moonPhase + .5, 1) - .5) * ma, 1); }   // 中秋那一站的月亮一定是圆的\n")
rep(" * (1 - .35 * NX.fog), now, 0.6);   // 港是避风的", " * (1 - .35 * NX.fog) * (1 - .3 * seasonWeight(3)), now, 0.6);   // 港是避风的；冬天雪把海声压低")
rep("  rainGain.gain.setTargetAtTime(S.rainI * 0.105, now, 0.5);", "  rainGain.gain.setTargetAtTime(S.rainI * 0.105 * (1 - .85 * seasonWeight(3)), now, 0.5);      // 冬天落的是雪，没有雨声")
rep("  if(S.rainI<.02)return;\n  const {ref}=S,it=S.rainI,storm=S.stormF;", "  if(S.rainI<.02||seasonWeight(3)>.97)return;\n  const {ref}=S,it=S.rainI*(1-seasonWeight(3)),storm=S.stormF;")
rep("  rainAcc+=it*(9+storm*24)*dt;", "  rainAcc+=it*(9+storm*24)*dt*(1-seasonWeight(3)*.9);")
# 节气章进收集簿
rep("  special: [['her', '她'], ['letter', '海的来信'], ['keepsake', '瓶中物']]", "  special: [['her', '她'], ['letter', '海的来信'], ['keepsake', '瓶中物'], ['term', '节气']]")
rep("\nconst CARD = new Map(CARDS.map((c, i) => { c.no = i + 1; return [c.id, c]; }));", """
// 特殊 · 节气：沿途走过一个，就盖上一枚
['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'].forEach((n, k) => CARDS.push(C('term-' + k, 'special', 'term', '节气 · ' + n,
  ['第一片花瓣落在海上。', '细雨。车窗上的水珠一颗一颗往后跑。', '远处很轻的一声春雷。', '白天和夜一样长。', '雨里有人在放风筝。', '近岸的水里，蓝眼泪开始亮了。', '听风站挂起了鲤鱼旗。', '海开始发烫。', '萤火虫从草丛里升起来。', '一年里最长的黄昏。', '暮蝉在傍晚叫起来。', '积雨云堆得高高的，雷阵雨来了又走。', '第一阵凉风吹响了风铃。', '热气散了。', '栏杆的蛛网上挂满了露水。', '雁从高处斜着飞过去。', '山上的叶子红了。', '月台上落了第一层霜。', '车窗起雾了。', '初雪。', '雪积起来了。', '一年里最长的夜。候车室里一碗汤圆冒着热气。', '檐下挂起了冰柱。', '流冰从北边漂来。'][k],
  '沿途走过这个节气，就会盖上。', { term: k })));
const CARD = new Map(CARDS.map((c, i) => { c.no = i + 1; return [c.id, c]; }));""")
rep("  el.className = 'slot ' + (e ? 'got ' : 'locked ') + c.rank + (c.st != null ? ' stamp-slot' : '') + (c.letter ? ' letter-slot' : '');", "  el.className = 'slot ' + (e ? 'got ' : 'locked ') + c.rank + (c.st != null || c.term != null ? ' stamp-slot' : '') + (c.letter ? ' letter-slot' : '');")
rep("  if (c.st != null) pic.innerHTML = stampSVG(c.st, 92);\n", "  if (c.st != null) pic.innerHTML = stampSVG(c.st, 92);\n  else if (c.term != null) pic.innerHTML = termSealSVG(c.term, 92);\n")
rep("nm.textContent = e ? c.name : c.st != null ? '？？' : '？？？';", "nm.textContent = e ? c.name : c.st != null || c.term != null ? '？？' : '？？？';")
rep("(card.st != null ? ' is-station' : '')", "(card.st != null || card.term != null ? ' is-station' : '')")
rep("  if (card.st != null) { const sp = document.createElement('span'); sp.className = 'card-stamp'; sp.innerHTML = stampSVG(card.st, 84); cardArt.appendChild(sp); }",
    "  if (card.st != null) { const sp = document.createElement('span'); sp.className = 'card-stamp'; sp.innerHTML = stampSVG(card.st, 84); cardArt.appendChild(sp); }\n  else if (card.term != null) { const sp = document.createElement('span'); sp.className = 'card-stamp'; sp.innerHTML = termSealSVG(card.term, 84); cardArt.appendChild(sp); }")
rep("  if (!c.letter && !c.keepsake) {\n    const blob = await idbGet(c.id);", "  if (c.term != null) shot = termArt(c.term, dims.art * 2);\n  else if (!c.letter && !c.keepsake) {\n    const blob = await idbGet(c.id);")
rep("if (c.st != null) cardEl.classList.add('stamped'); });", "if (c.st != null || c.term != null) cardEl.classList.add('stamped'); });")
rep("""  C('fireflies', 'high', 'sea', '萤火',""", """  C('blossomstorm', 'high', 'sky', '花吹雪', '一阵大风，满树的花一下子都飞起来，像一面粉色的帘子扫过月台，落进海里。', '春天，起大风的时候。'),
  C('midautumn', 'high', 'sky', '中秋的月', '那一夜的月亮一定是圆的。它从月见站的芒草后面升起来，月台上摆着月见团子。', '秋天的夜里，经过月见。'),
  C('firstsnow', 'high', 'sky', '初雪', '第一片雪落下来的时候，月台上等车的人都抬起头。', '立冬那一刻。'),
  C('fireflies', 'high', 'sea', '萤火',""")
HTML_PATCHES.append(('  .dash-next .term { margin-left: auto;', '  .dash-next .term.stamp { animation: termStamp 1s ease; }\n  @keyframes termStamp { 0% { transform: scale(1); } 25% { transform: scale(1.4); color: #ffb0a0; } 100% { transform: scale(1); } }\n  .dash-next .term { display: inline-block; margin-left: auto;', 1))

# ---- 给下一棒：第三版说了什么
rep("""   · 第二版新加的函数在「第十棒第二版 · …」那几段里；改过的函数还在原来的位置。接力继续。 */
""", """   · 第二版新加的函数在「第十棒第二版 · …」那几段里；改过的函数还在原来的位置。接力继续。 */

/* 第十棒「沿途」· 第三版（四季）：
   · 季节的钟：从你那边今天的节气出发，三站一季（一站走过两个节气），十二站一年（seasonPos / seasonWeight）。
     相邻两季之间半站左右的过渡；仪表盘「本站」旁边写着现在的节气，站名牌右上角盖着这一站的节气小红章。
   · 天不再是一张画：每一季各有一套黄昏、夜、白天的颜色（SEASON_PAL）；云是一朵一朵现画的（CLOUD_LAYERS）：
     夏天地平线上的积雨云、秋天高处的鳞云、春冬贴着地平线的层云、半空的云堤和积云、最高处的卷云。
     每一层有自己的视差和风，每一朵会胀缩变形；光从太阳那边来，日落后高处的云还亮一会儿。黄昏有几道光从地平线往上散开。
     原来那张黄昏的画只在「定格的晚霞」那一刻出现：暮海的黄昏，偶尔，晚霞停住二十几秒，像一张照片。
   · 山：冬天积雪，春天一点点樱花，秋天一点点红叶。星：冬夜的猎户座，夏夜的大三角；春天的月亮带晕，秋天的月亮更大。
   · 海：颜色、倒影的晃动跟着季节；春天的花筏，秋天漂着的落叶和远处的渔火，冬天的海烟、流冰和冰上的海豹。
   · 月台：冬天积雪、冰柱、霜花、灯光里的雪；秋天的落叶和扫帚；春天的燕子窝；夏天柱子上的夕颜。
     各站：暮海的樱、雪人、柿子；月见的团子；潮生的白鹭、台风旗；听风的鲤鱼旗、风筝；拾光的萤火、雪灯。
     她：花瓣、草帽、围巾、外套与白气；猫：夏天摊着、冬天缩成一团；屋檐上的海鸟冬天缩成圆球；车身上的季节牌。
   · 高光：花吹雪、萤火、中秋的月（秋天经过月见的那一夜一定是圆月）、初雪；声音：树莺、暮蝉、铃虫，冬天海声压低、没有雨声。
   · 小镇：路过小镇时总会换一次季。山坡上春天开樱、秋天红叶、冬天积雪；冬天广场、街道的屋顶、檐口、烟囱、墙头、路灯、树和松
     都盖着雪，远山白了头（buildMid(s, mode) 一季一张，两季叠着换；街道和广场冬天另烤一张带雪的，深冬只画那一张）。
   · 收集簿：特殊里添了「节气」一栏，走过一个节气就盖上一枚；天上海上月台上的新东西都能揭下来。
   · 审片：?s0=2.5 指定出发的季节（0 立春、1 立夏、2 立秋、3 立冬）；#spring #summer #autumn #winter 钉住一季。 */
""")
HTML_PATCHES[0] = ("<title>黄昏列车 · 第十棒「沿途」｜没有终点</title>", "<title>黄昏列车 · 第十棒「沿途」第三版 · 四季｜没有终点</title>", 1)

# ---- 第三版 · 四季：广场那层薄雾只罩在房子上（原来罩住整张图的上半截，山坡上留下一道竖的接缝）
rep("      if (day) { g.fillStyle = 'rgba(200,220,235,0.2)'; g.fillRect(0, 0, W, PY); }",
    "      if (day) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(200,220,235,0.2)'; g.fillRect(0, 0, W, PY); g.restore(); }")

# ================= 第十棒第四版 · 黄昏那张画活过来了 =================
# 天和云的时间、阵风的积分
rep("updateFrozen(dt); updateSeasonMoments(dt);\n", "updateFrozen(dt); updateSeasonMoments(dt); updateSkyMotion(dt);\n")
rep("""  S.gust = Math.max(0, S.gust - dt * 0.35, S.stormF * (.55 + .45 * Math.pow(Math.sin(S.t * .7), 2)));
}""", """  S.gust = Math.max(0, S.gust - dt * 0.35, S.stormF * (.55 + .45 * Math.pow(Math.sin(S.t * .7), 2)));
  S.gustI = (S.gustI || 0) + S.gust * dt;                           // 第四版：阵风积分。摆动的相位用它，风变了不会跳
}""")
# 她的裙摆、镇上晾的衣服：同一个毛病（总时间 × 风）
rep("  const sway = Math.sin(t * (1.4 + S.gust * 2.2)) * ref * 0.0012 * wind;", "  const sway = Math.sin(t * 1.4 + (S.gustI || 0) * 2.2) * ref * 0.0012 * wind;")
rep("          const sway = Math.sin(t * (1.6 + S.gust * 2.2) + i) * ref * 0.004 * (1 + S.gust * 3);", "          const sway = Math.sin(t * 1.6 + (S.gustI || 0) * 2.2 + i) * ref * 0.004 * (1 + S.gust * 3);")

# 第四版的说明（接在第三版后面）
rep("钉住一季。 */\n", """钉住一季。 */

/* 第十棒「沿途」· 第四版（会流动的晚霞）：
   和第三版不一样，黄昏和夜里的天又是原来那张画了——第三版把它拆成渐变加一朵朵的云，好看不过原来的画。
   你那边有 WebGL，就有一小段着色器在原地「流」这张画（skypaint：SKYGL / skyPaintFrame）；没有，就是原来那张不动的画。
   看上去，云顺着风往车头那边慢慢流、慢慢翻：越高的云走得越快，贴着地平线的几乎不动。
   过一会儿再看，太阳那团光还在原地，只是轻轻地呼吸；每一处的节拍都错开（一张平铺的噪声），看不出是在循环。
   的确也有风：阵风来时流得快一点。风是一点一点积进时间里的（SKYGL.t、CLD.wt、S.gustI），不会再整片跳过去、又往回退。
   黄昏的四季是这张画的四种心情（着色器里调色）：春天软一点、粉一点，夏天最深的蓝和金，秋天最透、最红，冬天冷、淡，地平线淡粉。
   昏暗下来以后，画压暗一层，星星和月亮在上面；白天（小镇的下午）照旧是白天的天，一朵朵的云只在白天出来，云形不再每三秒跳一下。
   最后还有「定格的晚霞」：那一会儿画不再流了，像一张照片。她的裙摆、风向袋、纸风车、晾衣绳的「总时间 × 风」也一起改了。
   美中不足的是慢的设备：重画隔得久一点（一秒六到十二次，云走得慢，看不出），一直很慢就只算一半大小；揭卡时用当下那一帧。 */
""")
HTML_PATCHES[0] = ("<title>黄昏列车 · 第十棒「沿途」｜没有终点</title>", "<title>黄昏列车 · 第十棒「沿途」第四版 · 会流动的晚霞｜没有终点</title>", 1)
# 积雨云、鳞云只在白天出来了：卡片的话跟着改
rep("C('cumulonimbus', 'common', 'sea', '积雨云', '夏天傍晚，地平线上堆起一座云山。太阳落下去以后，只有山顶还亮着。夜里它会在里面无声地闪。', '夏天，远处的地平线上。')",
    "C('cumulonimbus', 'common', 'sea', '积雨云', '夏天的下午，海那边堆起一座云山，云顶白得发亮，底下压着一层灰。傍晚来之前，它慢慢地散了。', '夏天，小镇的下午，远处的地平线上。')")
rep("C('mackerel', 'common', 'sea', '鳞云', '秋天的高处铺满一片片小云，像鱼鳞。黄昏的时候，每一片的下沿都被照红。', '秋天黄昏的高处。')",
    "C('mackerel', 'common', 'sea', '鳞云', '秋天的高处铺满一片片小云，像鱼鳞。小镇的下午，天一下子高了好多。', '秋天，小镇的下午，高处。')")

# ================= 第十棒第五版 · 四季各有一片天 =================
# 春、秋、冬的画一开场就解码（夏天是原来那张，和它一起加载）
rep("skyArt.onload = () => { skyArtReady = true; buildSky(); invalidate(); };\n",
    "skyArt.onload = () => { skyArtReady = true; buildSky(); invalidate(); };\nskySeasonLoad();\n")
# 第五版的说明（接在第四版后面）
rep("揭卡时用当下那一帧。 */\n", """揭卡时用当下那一帧。 */

/* 第十棒「沿途」· 第五版（四季的天）：
   四季各有一片天了。第四版里四季共用原来那张画、只换了调色；这一版春、秋、冬各画了一张，夏天还是原来那张。
   季节的画是离线算出来的（skyart/render：pbr.py 是照着物理的大气和体积云，look.py 冲洗、调色），取景和原来那张一样：1536×447，太阳在 x≈0.885。
   都用同一段着色器在原地流（skypaint：两张画放在两个纹理单元，换季时在同一套流动里按权重渗过去）；每一季流的来回 SKY_CYCLE、幅度 SKY_FLOW 不一样，秋天的鳞云边最清楚，来回最短、幅度最小，免得看出重影。
   想改哪一季，就改 scenes.py 里那一季的参数，再跑 final.py、export.py：画会写进 fns/skyart.js（内嵌的 JPEG）。
   和画配套的颜色也换了：渐变底色（画还没解码好时垫着）、水里那团光的颜色、地平线上那层雾（春天是粉粉亮亮的霞，另外三季是暗蓝的远雾）。
   你那边没有 WebGL，就看到不动的画；换季时两张交叠着渐变（skyStill，按 1/32 一档缓存），揭卡时也用它。
   一些没变的：白天、雨、夜色照旧叠在画上；定格的晚霞照旧；慢的设备照旧隔久一点才重画，一直很慢就只算一半大小。
   起风的时候还是流得快一点，风积在时间里，不会跳。
   看的时候，可以用 #spring、#summer、#autumn、#winter 钉住一季，?nogl 看没有 WebGL 时的样子。 */

/* 第十棒「沿途」· 第五版（二稿：天更丰富，颜色更多）：
   每一季的天多了几层云：秋天加了半空的积云、几片高层云和最高处的卷云；冬天靠太阳那边加了几片细细的高积云；春天加了几缕卷云。
   一样的光，离太阳远近，颜色就不一样：调色按「离太阳多远」在两套颜色之间渐变（look.py：lum_map2、sky_gradient2）——太阳那边金、橙，远处绯红、品红、紫。
   朵朵云的纹理不再一模一样地重复：噪声是平铺的，现在竖的那一维跟着横的位置慢慢漂（pbr.py 里那几处 tex3）。
   云少一点细碎的噪点：冬天卷云的细丝可以单独调（fine），远处太小的云点去掉了。
   里面没变的：取景、太阳的位置、流动、换季、夜里的淡色，都和第五版一样。
   都在 skyart/render/scenes.py 里：改了参数，python3 final.py 某一季 → export.py → build10b.py；只改颜色不改云，用 regrade.py，不用重画。
   有一个小限制照旧：画只有 1536 宽，高分屏上要放大近两倍。
   你要是觉得哪一季太浓或太淡，改那一季 look 里的 key 和 k 就好。 */
""")
HTML_PATCHES[0] = ("<title>黄昏列车 · 第十棒「沿途」｜没有终点</title>", "<title>黄昏列车 · 第十棒「沿途」第五版 · 四季的天｜没有终点</title>", 1)

# ================= 第十棒第六版 · 夜只在该来的时候来 =================
rep("  updateEncounters(dt);\n  const baseRain", "  updateNightChapters(dt); updateEncounters(dt);\n  const baseRain")
rep("const night = journeyNight(i) > .5 || i >= 10 && i <= 14;", "const night = stationNight(i);")
rep("  const rainTarget = lerp(baseRain * (1 - .92 * shelter), 1, S.stormF);", "  const rainTarget = lerp(baseRain * (1 - .92 * shelter) * (S.weather === 'auto' ? 1 - NCH.k : 1), 1, S.stormF);   // 第六版：夜里的事来的时候，阵雨先停")
rep("改那一季 look 里的 key 和 k 就好。 */\n", """改那一季 look 里的 key 和 k 就好。 */

/* 第十棒「沿途」· 第六版（亮的黄昏）：
   夜只在该来的时候来了：旅程里大部分时候是亮的黄昏，就是四季那几张会流动的画（nightch：updateNightChapters、NCH）。
   里程每走一圈（八站），有一件夜里的事：流星雨、满月和飞鱼、星河轮着来，在潮生以后或灯岬以后（NIGHT_CH）；天黑十秒，夜里的事一分钟上下，过去了，黄昏十二秒回来。
   也有季节里非夜不可的：秋天停在月见是中秋的月，夏天停在月见、拾光是萤火，各黑四十来秒。
   想要一直是夜，或者一直是黄昏，开发者 Dock 里的「时间」照旧可以选；烟火之夜还是原来那样，由 TOWN_SUN 管。
   陪着列车等车的提灯的人，只在夜里停靠的那几站出现（stationNight）。
   着急看夜的话：#meteor、#galaxy、#fullmoon 这些后门还在。
   你看到这里的时候，天多半还亮着。 */
""")
HTML_PATCHES[0] = ("<title>黄昏列车 · 第十棒「沿途」｜没有终点</title>", "<title>黄昏列车 · 第十棒「沿途」第六版 · 亮的黄昏｜没有终点</title>", 1)

# ================= 第十棒第七版 · 鲲、水母、各站最美的时候、细节 =================
# ---- 鲲替换原来从水里冒出来的鲸；海豚删掉（跳的方向是反的）
_i0 = js.index("/* ---------------- 第十棒的草样「鲸」")
_i1 = js.index("/* ---------------- 第十棒的草样「四季」")
# 鲲之后的信要在收集簿建卡（CARDS）之前登记，所以写在原来鲸的位置上（fns/kun.js 的其余部分插在脚本后面）
js = js[:_i0] + "/* 第十棒第七版：鲲之后，海来的信（鲲本身在 fns/kun.js） */\nSKY_LETTERS.kun = { label: '鲲之后', text: '「黄昏的时候，鲲从头顶游过去了。海一滴一滴往上升，去接它身上的光。它没有停，我们也没有。」' };\n\n" + js[_i1:]
rep("  if (kind === 'whale') beginWhale();\n  if (kind === 'dolphins') beginDolphins();\n", "  if (kind === 'kun') beginKun();\n")
rep("""      if (!NX.active && DOLPHINS_ON_JOURNEY && !NX.dolphinSeen && S.tramMode === 'cruising' && S.dayF < .1 && S.rainI < .15 && S.stormF < .05 && NX.fog < .1 && S.t > 90) { NX.dolphinT -= dt; if (NX.dolphinT <= 0) { NX.dolphinSeen = true; beginEncounter('dolphins', '海豚来了，在追列车。'); } }
      if (!NX.active && WHALE_ON_JOURNEY && !NX.whaleSeen && night && S.rainI < .15 && S.t > 200) { NX.whaleT -= dt; if (NX.whaleT <= 0) { NX.whaleSeen = true; beginEncounter('whale', '海面上有什么在动。'); } }
""", "")
rep("    } else if (rested && openSea()) {\n",
    "    } else if (S.t - NX.lastEnd > 12 && kunCanBegin()) {\n      beginEncounter('kun', '云里有什么在游。');           // 鲲：一圈一次，开出站不久（不等「歇一歇」那四十秒，窗口很短）\n    } else if (rested && openSea()) {\n")
rep("  updateWhale(dt);\n  updateDolphins(dt);\n", "  updateKun(dt);\n")
rep("drawSkyClouds(wctx); drawDuskRays(wctx);\n", "drawSkyClouds(wctx); drawDuskRays(wctx); drawKun(wctx);\n")
rep("drawBellBuoy(); drawWhale(); drawHarbourWater(); drawLanterns(); drawDolphins(); drawBottle();", "drawBellBuoy(); drawKunSea(); drawHarbourWater(); drawLanterns(); drawBottle();")
# 后门：#kun（#whale 也跳到这里）；#dolphins 没有了
rep("h === '#lanterns' || h === '#whale' || h === '#dolphins' || h === '#spring'", "h === '#lanterns' || h === '#kun' || h === '#whale' || h === '#spring'")
rep("""    else if (h === '#whale') { S.timeMode = 'night'; S.nightF = 1; S.weather = 'clear'; SKY2.moonSeed = mod(.42 - S.travel / (g * 12), 1); SKY2.moonUp = 1; setTimeout(() => beginEncounter('whale', '海面上有什么在动。'), 1500); }""",
    """    else if (h === '#kun' || h === '#whale') { S.weather = 'clear'; S.timeMode = 'journey'; S.nightF = 0; S.travel = S.camera = 0.12 * g; setTimeout(() => beginEncounter('kun', '云里有什么在游。'), 1500); }""")
rep("""    else if (h === '#dolphins') { S.weather = 'clear'; setTimeout(() => beginEncounter('dolphins', '海豚来了，在追列车。'), 1500); }\n""", "")
# 收集簿：鲸、海豚两张草样卡去掉，天象里添一张「鲲」
rep("""  C('whale', 'high', 'sea', '鲸', '一道黑背从倒影下面升起来，喷出的水汽接住了月光。它没有停，我们也没有。', '很平静的夜里。', { proto: 'whale' }),
  C('dolphins', 'high', 'sea', '海豚', '三四条，在近处追着列车跳。跳了三回，落后了，转头又去追浪。', '行进中的黄昏或夜里。', { proto: 'dolphins' }),
""", "")
_sun = js.index("  C('sunset', 'high', 'sky', '落日'"); _eol = js.index("\n", _sun) + 1
js = js[:_eol] + "  C('kun', 'high', 'sky', '鲲', '北冥有鱼，其名为鲲。黄昏的时候它从云里游出来，大得望不到边，肚皮上镶着一道金。从头顶过去的时候，海一滴一滴往上升，去接它身上的光。', '晴朗的黄昏，刚开出站的海上。一圈一次。'),\n" + js[_eol:]
rep("for (const k of ['galaxy', 'meteor', 'storm', 'flyingfish', 'fog', 'lanterns', 'whale', 'dolphins']) {", "for (const k of ['galaxy', 'meteor', 'storm', 'flyingfish', 'fog', 'lanterns', 'kun']) {")
rep("proto: ['fog', 'lanterns', 'whale', 'dolphins'].includes(k) ? k : undefined", "proto: ['fog', 'lanterns'].includes(k) ? k : undefined")
rep("const protoOn = c => !c.proto || ({ whale: WHALE_ON_JOURNEY, dolphins: DOLPHINS_ON_JOURNEY, lanterns: LANTERNS_ON_JOURNEY, fog: FOG_ON_JOURNEY })[c.proto]", "const protoOn = c => !c.proto || ({ lanterns: LANTERNS_ON_JOURNEY, fog: FOG_ON_JOURNEY })[c.proto]")
# 开发者 Dock：偶遇 · 鲲
rep("""  else if (kind === 'fog' || kind === 'whale' || kind === 'dolphins') {
    NX.protoSeen[kind] = true; S.weather = 'clear'; S.rainI = 0;
    if (kind === 'whale') { S.timeMode = 'night'; S.nightF = 1; }
    if (kind === 'dolphins' && S.tramMode === 'parked') depart();
    beginEncounter(kind, { fog: '雾从海上来了。', whale: '海面上有什么在动。', dolphins: '海豚来了，在追列车。' }[kind]);
  }""", """  else if (kind === 'fog') { NX.protoSeen.fog = true; S.weather = 'clear'; S.rainI = 0; beginEncounter('fog', '雾从海上来了。'); }
  else if (kind === 'kun') {
    S.weather = 'clear'; S.rainI = 0;
    if (S.timeMode === 'night' || modeNightNow() > .3) { S.timeMode = 'dusk'; S.nightF = 0; }
    if (S.tramMode === 'parked') depart();
    beginEncounter('kun', '云里有什么在游。');
  }""")
rep("if (a && (a.kind === 'dolphins' || a.kind === 'storm'", "if (a && (a.kind === 'kun' || a.kind === 'storm'")
# 开头的说明里，两份草样的去向
rep("""   · 第三份草样「鲸」只在 #whale 后门里（WHALE_ON_JOURNEY = false）：夜里平静的海上，一道黑背从倒影下面升起来，
     喷出的水汽接住月光，尾鳍抬起来沉下去；倒影跟着晃；一次旅程最多一次；之后有一封信；
   · 第四份草样「海豚」只在 #dolphins 后门里（DOLPHINS_ON_JOURNEY = false）：黄昏或夜里行进中，三四条海豚在近处追着列车，
     各跳三次，跳完落后了；之后有一封信；
""", """   · 第三份草样「鲸」到第十棒第七版换成了天上的「鲲」（fns/kun.js，#kun；#whale 也跳到那里），接进了旅程；
   · 第四份草样「海豚」第十棒第七版删掉了（跳起来的方向是反的，也不好看）；
""")
HTML_PATCHES.append(('<button type="button" data-enc="whale">鲸</button><button type="button" data-enc="dolphins">海豚</button>', '<button type="button" data-enc="kun">鲲</button>', 1))
HTML_PATCHES.append(('<option value="#whale">鲸</option><option value="#dolphins">海豚</option>', '<option value="#kun">鲲</option>', 1))
# 水母：夜里海下面一群（fns/jelly.js），卡片的话跟着改
rep("C('jelly', 'high', 'sea', '水母', '一收一放地游，泛着和蓝眼泪同族的光。它不赶时间，也不往哪里去。', '晴朗的深夜，偶尔浮上来。'),",
    "C('jelly', 'high', 'sea', '水母', '夜里的海下面亮着一群：青的、紫的、粉的、杏色的，一收一放地往上浮。有几只身上流着彩虹。它们不赶时间，也不往哪里去。', '晴朗的夜里，海下面。'),")
# ---- 每一站在它最好看的时候（fns/nightch.js 的 journeyNight）：旅程里的夜事只由 NCH 一圈排一次，随机的流星雨、星河只在「月色」里
rep("      if (night && (S.timeMode === 'night' || S.timeMode === 'journey') && SKY2.moonLit < .6) { NX.galaxyT -= dt;", "      if (night && S.timeMode === 'night' && SKY2.moonLit < .6) { NX.galaxyT -= dt;")
rep("      if (!NX.active && night) { NX.meteorT -= dt;", "      if (!NX.active && night && S.timeMode !== 'journey') { NX.meteorT -= dt;")
# ---- 细节和纹理：街上的房子多几层（fns/detail.js 的 houseExtras）；街道、广场烤好的图叠一层颗粒
rep("""        g.fillText(p.sign, sx + sw / 2, sy + sh / 2 + 0.5);
      }
      return;
    }
    case 'shed': {""", """        g.fillText(p.sign, sx + sw / 2, sy + sh / 2 + 0.5);
      }
      houseExtras(g, p, mode, x, w, top, h, base, ref, wins);
      return;
    }
    case 'shed': {""")
rep("""      if (p.door) glow(g, glowSpr, x + w * 0.62 + ref * 0.015, base - ref * 0.03, ref * 0.06, ref * 0.05, 0.2);
        return;""", """      if (p.door) glow(g, glowSpr, x + w * 0.62 + ref * 0.015, base - ref * 0.03, ref * 0.06, ref * 0.05, 0.2);
        houseExtras(g, p, mode, x, w, top, h, base, ref, wins);
        return;""")
rep("""    paintStreetProps(g, mode, here, xOf, base, floor);
    tiles[mode] = t.c;""", """    paintStreetProps(g, mode, here, xOf, base, floor);
    if (mode !== 'lights') townGrain(g, CHUNK_W * ref, TOWN_H * ref, mode);
    tiles[mode] = t.c;""")
rep("""      g.fillStyle = css(INK); g.fillRect(sx - 0.6, by - ref * 0.064, 1.2, ref * 0.02);
    }
    tiles[mode] = t.c;""", """      g.fillStyle = css(INK); g.fillRect(sx - 0.6, by - ref * 0.064, 1.2, ref * 0.02);
    }
    if (mode !== 'lights') townGrain(g, W, H, mode);
    tiles[mode] = t.c;""")
# ---- 第七版的说明（接在第六版后面）
rep("你看到这里的时候，天多半还亮着。 */\n", """你看到这里的时候，天多半还亮着。 */

/* 第十棒「沿途」· 第七版（鲲、水母、各站最美的时候、细节）：
   做了一头鲲：原来从水里冒出来的那头鲸，换成了天上的鲲（fns/kun.js）。黄昏、晴、刚开出站的海上，一圈一次：第一圈在暮海和远汀之间，之后在听风和拾光之间。
   梦一样的样子：深靛色的身子里是一片夜空（星云、尘带、几百颗星），肚皮暖、镶一道金，长长的胸鳍后缘拖一层光纱，尾叶拖两条光带；
     从太阳旁边的霞里浮出来，越游越近、越游越高，从头顶过去，再往左边远处去，一分钟上下。
   也要海回应它：倒影跟着晃，它下面的海亮成一条路，一圈圈亮环荡开，一串串光珠从海面升起来、越过海平线去接它；
     几束光从它肚子下面落到海上，还有两三声鲸歌。#kun（#whale 也跳到这里）、Dock 的「偶遇 · 鲲」随时能看；它走了以后海会来一封信。
   想念海豚的话，它们先不来了：跳起来的方向是反的，也不好看，代码、卡片、信、后门都拿掉了。
   带着光的水母多了（fns/jelly.js）：夜里海下面总有一群，青、蓝、紫、粉、杏、薄荷，远小近大；伞一收一放，伞缘的光点一波一波地亮，
     四条带褶边的口腕、十来根长须；有几只是栉水母，身上流着彩虹。
   你说有些地方本来就是为某个时候画的：现在每一站在它最好看的时候（fns/nightch.js 的 journeyNight）——
     暮海、远汀、听风、拾光是黄昏，月见、潮生、灯岬、汐音是夜；夜里的事（流星雨、满月和飞鱼、星河）一圈一次，落在这段夜里；提灯的人在夜里的站等车。
   去看夏天的天，也在流了（fns/skypaint.js 的 skySumTile）：原来那张画首尾接成一圈，高处的云一直往车头那边漂，地平线和那团光不动。
   看得见的细节多了几层：列车的板缝、铆钉、镀铬窗框、行先牌、车号、车顶空调、裙板百叶、转向架的弹簧、车厢里的广告；
     车站的波板、椽子、斜撑、柱脚、护墙板、雨棚、壁灯、海报、盆花、红邮筒、盲道；灯塔的色带、小窗、栏杆、守塔人的小屋；
     远山的树冠、沟和雾；小镇烤好的图上一层颗粒，街上的房子有了隅石、腰线、齿饰、瓦、落水管、阳台、壁灯、天线（fns/detail.js）。
   鲲的样子都在 kunBody 里，想让它更大、更慢，改 kunPose 里的 Lmax 和 ENCOUNTERS.kun.duration。 */
""")
HTML_PATCHES[0] = ("<title>黄昏列车 · 第十棒「沿途」｜没有终点</title>", "<title>黄昏列车 · 第十棒「沿途」第七版 · 鲲｜没有终点</title>", 1)

# ================= 第十棒第八版 · 夜里的鲲（fns/kun.js、fns/nightch.js） =================
# ---- 鲲不再在黄昏的窗口里来：它是夜里的事之一（updateNightChapters 排它），时间停在「夜」的时候二十来分钟一次
rep("    } else if (S.t - NX.lastEnd > 12 && kunCanBegin()) {\n      beginEncounter('kun', '云里有什么在游。');           // 鲲：一圈一次，开出站不久（不等「歇一歇」那四十秒，窗口很短）\n    } else if (rested && openSea()) {\n",
    "    } else if (rested && openSea()) {\n")
rep("      if (!NX.active && night && S.timeMode !== 'journey') { NX.meteorT -= dt; if (NX.meteorT <= 0) { NX.meteorT = 360 + Math.random() * 300; beginEncounter('meteor', '第一颗流星正在赶来。'); } }\n",
    "      if (!NX.active && night && S.timeMode !== 'journey') { NX.meteorT -= dt; if (NX.meteorT <= 0) { NX.meteorT = 360 + Math.random() * 300; beginEncounter('meteor', '第一颗流星正在赶来。'); } }\n"
    "      if (!NX.active && night && S.timeMode === 'night') { NX.kunT -= dt; if (NX.kunT <= 0) { NX.kunT = 900 + Math.random() * 600; beginEncounter('kun', '今晚的海，静得出奇。'); } }   // 第八版：一直是夜的时候\n")
# 鲲的夜在落下来的那十秒里，别的偶遇先不来
rep("  if (!a) {\n    const rested = S.t - NX.lastEnd > 40;", "  if (!a && !(NCH.cur && NCH.cur.kind === 'kun' && NCH.cur.phase === 'fall')) {\n    const rested = S.t - NX.lastEnd > 40;")
# 天色变了（黄昏回来、天亮了、下大雨），鲲的夜也慢慢收场；收场时不跳到最后，各样东西自己慢慢收（fns/kun.js 的 kunEase）
rep("if (!a.closing && (a.kind === 'galaxy' || a.kind === 'meteor' || a.kind === 'flyingfish') && (S.nightF < .5", "if (!a.closing && (a.kind === 'galaxy' || a.kind === 'meteor' || a.kind === 'flyingfish' || a.kind === 'kun') && (S.nightF < .5")
rep("    NX.active.age = Math.max(NX.active.age, NX.active.duration - 8);",
    "    if (NX.active.kind === 'kun') NX.active.duration = Math.min(NX.active.duration, NX.active.age + 8);\n    else NX.active.age = Math.max(NX.active.age, NX.active.duration - 8);")
rep("sky = a.kind === 'galaxy' || a.kind === 'meteor' || a.kind === 'flyingfish';", "sky = a.kind === 'galaxy' || a.kind === 'meteor' || a.kind === 'flyingfish' || a.kind === 'kun';")
# ---- 画：多出来的星、呼吸的那团光、远处的萤火和丝带在天上；海面隐去的镜子、流金、近处的萤火和丝带在海上
rep("drawSun(wctx); drawChapterSky(wctx); drawStars(wctx); drawMoon(wctx);", "drawSun(wctx); drawChapterSky(wctx); drawStars(wctx); drawKunSkyBack(wctx); drawMoon(wctx);")
rep("  drawSunGlare(wctx); drawStormSky(wctx);\n", "  drawSunGlare(wctx); drawStormSky(wctx); kunSkySnap();          // 第八版：镜子里只要天\n")
rep("  drawSeasonAir(wctx); drawGeese(wctx); drawFogFar(wctx);", "  drawSeasonAir(wctx); drawGeese(wctx); drawFogFar(wctx); drawKunHorizon(wctx);")
# 海面完全隐去的时候（镜子不透明），水面上那些本来就看不见的东西不画了，也不留着能揭的热区
rep("drawReflection(); drawSeasonWater(); drawChapterWater(); drawFogWater(); drawFirelightWater(); drawLampWater(); drawSeaSeason(); drawSeaSparkles(); drawJellies(); drawShoal(); drawBoat(); drawBellBuoy(); drawKunSea(); drawHarbourWater(); drawLanterns(); drawBottle(); drawWaterGlints(); drawLighthouseGlints(ctx); drawNear();",
    "if (KUN.sky < .985) { drawReflection(); drawSeasonWater(); drawChapterWater(); drawFogWater(); drawFirelightWater(); drawLampWater(); drawSeaSeason(); drawSeaSparkles(); drawJellies(); drawShoal(); drawBoat(); drawBellBuoy(); drawHarbourWater(); drawLanterns(); drawBottle(); drawWaterGlints(); drawLighthouseGlints(ctx); } drawKunMirror(); drawKunSea(); drawNear();")
# 静：倒影一丝不晃；风声、海声低下去
rep("off = clamp(off * (1 - 0.5 * S.harbourF) * calm * (1 + S.stormF * 3.6)", "off = clamp(off * (1 - 0.5 * S.harbourF) * calm * (1 - .92 * KUN.still) * (1 + S.stormF * 3.6)")
rep("* (1 - .3 * seasonWeight(3)), now, 0.6);", "* (1 - .3 * seasonWeight(3)) * (1 - .7 * KUN.hush), now, 0.6);")
rep("(0.012 + S.gust * 0.018 + S.stormF * .043) * (1 - 0.15 * S.townF) * (1 - .3 * NX.fog), now, 0.7);", "(0.012 + S.gust * 0.018 + S.stormF * .043) * (1 - 0.15 * S.townF) * (1 - .3 * NX.fog) * (1 - .6 * KUN.hush), now, 0.7);")
# ---- 信、卡片、Dock、#kun
rep("SKY_LETTERS.kun = { label: '鲲之后', text: '「黄昏的时候，鲲从头顶游过去了。海一滴一滴往上升，去接它身上的光。它没有停，我们也没有。」' };",
    "SKY_LETTERS.kun = { label: '鲲之后', text: '「那天夜里，海忽然静得像一面镜子。然后水面上流起了萤火和碎金，几缕丝带飘起来，海不见了，我们像是开在天上。鲲就是那时候从下面浮上来的。它没有停，我们也没有。」' };")
rep("C('kun', 'high', 'sky', '鲲', '北冥有鱼，其名为鲲。黄昏的时候它从云里游出来，大得望不到边，肚皮上镶着一道金。从头顶过去的时候，海一滴一滴往上升，去接它身上的光。', '晴朗的黄昏，刚开出站的海上。一圈一次。'),",
    "C('kun', 'high', 'sky', '鲲', '北冥有鱼，其名为鲲。它只在不寻常的夜里来：海先静得像一面镜子，水面上流起萤火和碎金，飘起几缕丝带；海面隐去，列车像开在天上——然后它从海平线下面浮上来，大得望不到边，身体里装着一片夜空。', '晴朗的夜里，开出月见以后。旅程里第一个夜就来，之后四圈一次。'),")
rep("""  else if (kind === 'kun') {
    S.weather = 'clear'; S.rainI = 0;
    if (S.timeMode === 'night' || modeNightNow() > .3) { S.timeMode = 'dusk'; S.nightF = 0; }
    if (S.tramMode === 'parked') depart();
    beginEncounter('kun', '云里有什么在游。');
  }""", """  else if (kind === 'kun') {
    S.weather = 'clear'; S.rainI = 0;
    if (modeNightNow() < .9) { S.timeMode = 'night'; S.nightF = Math.max(S.nightF, .9); }     // 第八版：鲲只在夜里来
    if (S.tramMode === 'parked') depart();
    beginEncounter('kun', '今晚的海，静得出奇。');
  }""")
rep("""    else if (h === '#kun' || h === '#whale') { S.weather = 'clear'; S.timeMode = 'journey'; S.nightF = 0; S.travel = S.camera = 0.12 * g; setTimeout(() => beginEncounter('kun', '云里有什么在游。'), 1500); }""",
    """    else if (h === '#kun' || h === '#whale') { S.weather = 'clear'; S.timeMode = 'journey'; S.nightF = 1; S.travel = S.camera = 2.16 * g; S.station = 2; S.tramMode = 'cruising'; S.tramV = CRUISE; S.tramTimer = Infinity; S.stopAt = Infinity; setTimeout(() => { NCH.done.ev0 = true; NCH.cur = { kind: 'kun', key: 'ev0', phase: 'hold', t: 0 }; NCH.k = 1; beginEncounter('kun', '今晚的海，静得出奇。'); }, 1200); }""")
# ---- 第八版的说明（接在第七版后面）
rep("改 kunPose 里的 Lmax 和 ENCOUNTERS.kun.duration。 */\n", """改 kunPose 里的 Lmax 和 ENCOUNTERS.kun.duration。 */

/* 第十棒「沿途」· 第八版（夜里的鲲）：
   陪着列车的那头鲲，不再在下午的黄昏里莫名其妙地游出来了：它只在夜里来，而且那一夜先有预兆（fns/kun.js）。
   你先会觉得海静得出奇：倒影一丝不晃，风声、海声低下去，星一下子多了、一阵一阵地呼吸，有月亮的话外面一圈晕，海平线右边一团光一明一暗。
   开头那团光里忽然荡开一圈涟漪：碎金顺着几道暗流淌过整片海，萤火从水面上一颗一颗升起来，几缕丝带从海上飘起，在列车前后舒展、翻转。
   到了十六秒左右，海面一点点隐去：水色、波纹、碎光退掉，海成了一面完整的镜子，分不清哪是海、哪是天，水母像在星星中间漂。
   天上开着列车的时候，鲲从海平线下面那团光里浮上来，越游越近，从头顶过去，肚皮被下面的金光照亮；最后十几秒，海面、星星、金光慢慢回到平常。
   上一版在黄昏里的窗口拿掉了：鲲现在是夜里的事之一，旅程里第一个夜（开出月见以后）就来，之后和流星雨、满月和飞鱼、星河轮着来，四圈一次（fns/nightch.js）；时间停在「夜」的时候，二十来分钟一次。
   去看它最快的办法是 #kun，或者 Dock 的「偶遇 · 鲲」；前奏多长在 KUN_PRE，鲲自己游多久在 KUN_SWIM。 */
""")
HTML_PATCHES[0] = ("<title>黄昏列车 · 第十棒「沿途」｜没有终点</title>", "<title>黄昏列车 · 第十棒「沿途」第八版 · 夜里的鲲｜没有终点</title>", 1)
