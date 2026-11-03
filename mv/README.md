# 黄昏列车 · 第四部「沿途」· 拍摄工具（2K · 60 帧，第十棒第八版的画面）

配乐是なとり「Overdose」。这一部没有主角：作品里的东西一样一样地出来，像沿着这条线走一整圈；画面上的字只有片名和片尾。

转一圈下来，镜头多半是全景和中景，特写很少；夏天黄昏那张静态的天不出现，夏天只出夏夜（潮生、拾光、满月与飞鱼）。
过了一个不寻常的夜（B267 起），鲲从头顶过去以后，四季绕着列车轮着来：秋（鲲的那个夜）→ 冬（下雪的黄昏）→ 春（暮海的花吹雪）→ 夏（满月与飞鱼），两拍 → 一拍 → 半拍一季 → 四季竖着同框、一条一条推下来再轮转 → 半拍 → 白。
四个季节是同一段时间同时拍的四场戏（R0–R3）：keep 决定哪一拍出哪一季，layer 另存一份给四季同框；一拍、半拍那几段四季用同一个跟车镜头，列车不动，世界绕着它换季。
季节之外的卡点都在 post 里：whip 是切点前后横着甩一下，stutter 是一顿一顿的几拍，闪的颜色跟着季节走（秋金、冬冷、春粉、夏蓝）。
还有几段天色是钉住的：小镇的落日按列车的位置现算（游戏里天色要慢三秒才追上，片子里的太阳得落在拍上）。
是不是录屏？不是：每一帧都用作品自己的 draw() 按镜头重画；尺寸、帧率、拍摄倍率和歌都在 mvconf.json 里：2560×1440、60 帧，页面按 1280×720 布局、2 倍出图，c(i) 是切在第 i 拍上的剪辑点，比拍早半帧。
你想重剪的话，只改 scenes.js 里的镜头和 post：时刻、取景、闪的轻重都在那儿；先看预览（node render.js --preview，每个镜头出首、中、尾三帧，psheet.py 拼成接触印样），tscout.js 告诉你那一刻画里有什么、在哪儿。

## 场次（拍号 → 内容）
- A 0–19 暮海的春日黄昏，鸣铃、出发 → B 19–35 片名砸在贝斯进来的那一下；秋天的火烧云，B27 慢下来
- S1–S7 35–59 沿途七站，两拍一站：远汀（冬 · 黄昏）、月见（秋夜）、潮生（夏夜）、灯岬（冬夜）、汐音（秋夜）、听风（春 · 黄昏）、拾光（夏夜）
- D 59–91 冬夜的海：水母、蓝眼泪，两拍 → 一拍 → 半拍一切，最后一顿一顿
- E 91–131 灯岬的流星雨 → F 131–147 暴风雨，闪电劈在重音上 → G 147–179 雨过天晴，小镇的下午
- H 179–203 小镇的落日，灯一盏一盏亮起来，滑进烟火站 → I 203–243 烟火 → J 243–259 河灯与星河 → J3 259–267 满月和飞鱼
- K1–K2 267–299 一个不寻常的夜：静 → 流萤流金 → 丝带 → 海面隐去 → 鲲浮上来
- R0–R3 299–331 鲲从头顶过去，四季绕着列车轮着来 → 四季同框 → 白
- Z 331–终 黄昏又回来了：列车进站，当着镜头揭下暮海的樱（界面戏 mode: 'screen'；卡片飞回簿子要 0.56 秒，飞完了才开得了簿子），收集簿一拍一张，片尾

## 文件
- `mkMV.py` 从第十棒第八版（dusktrain-10b.html）生成拍片版 mv.html：高清的天、按镜头倍率现算的天、远处一层花瓣、鲲的快照按倍率取、导出鲲与水母。
- `render.js` 导演：照着 scenes.js 一镜一镜地拍。`--preview`、`--only=A,C`、`--worker=0/2`、`--at=12.5`、`--out=`、`--keepgoing`、`--collect`。
- `mvdrive.js` 场记：虚拟时间一帧一帧走，按时点放事件，按镜头取景；`keys` 关键帧、`fn` 函数取景、`rate` 慢放与定格、`track` 跟着一层景深走、`ticks` 每帧钉住一点东西（比如落日的天色）。
- `mvlib.js`、`vclock.js` 页面里的小工具和虚拟时钟（rAF、setTimeout、performance.now、动画都跟着它）。
- `collect.js` 片尾收集簿要的卡：一站一站悄悄收好，存成 album-store.json（`node render.js --collect`）。
- `tscout.js` 沿着一场戏的时间踩点；`kscout.js` 只记鲲；`scout4.js` 按一份设定表（setups.json）踩点。
- `analyze.py`、`grid.py`、`sections.py` 听歌：拍点、重拍、段落（librosa）→ `grid.json`。
- `overlays.js` 片名与片尾。`compose.py` 合成与压制：闪、推、震、色散、径向模糊、甩、顿、回顾（这一版没用上）、四季分屏、遮幅；`--noaudio` 只出画面，用来分段合成。`post.json` 由 `node scenes.js` 生成。

## 流程
1. `python3 mkMV.py`
2. `node scenes.js`（检查分镜、写出 post.json）
3. `node render.js --collect`（收集簿的卡）
4. `node render.js --preview` → `python3 psheet.py preview sheet_`
5. `node render.js --worker=0/2` 与 `node render.js --worker=1/2` 同时跑 → frames/ 与 layers/
6. `node overlays.js`
7. `python3 compose.py --crf 20 --preset medium --out out/dusktrain-mv4-overdose.mp4`（也可以 `--from/--to --noaudio` 分两段同时合成，拼起来再配一次声音）

需要 Playwright（Chromium）、ffmpeg、numpy、OpenCV，听歌那一步要 librosa。歌不在包里，放一份 song.flac 在旁边。
