**[English](#english) · [中文](#中文)**

<a id="english"></a>

# Dusk Train · 黄昏列车

> No last stop · 没有终点

An endless tram travels along the coastline, forever moving through an eternal dusk.
The entire work is contained in a single HTML file, runs completely offline, and has zero external dependencies: Canvas 2D draws the passing scenery, WebGL renders flowing seasonal skies in real time, and Web Audio synthesizes ocean waves, wind, and the rhythm of the rails.

## Open

- Open `index.html` directly in your browser. No internet connection, installation, or environment setup is required.
- The tram waits in silence by default. Click the lower-right corner to enable ambient audio; touch the tram body to ring the bell and depart.
- The layout adapts to phones, tablets, and desktop browsers, in both landscape and portrait orientations.

## Along the Way

- **Eight sea stations**: 暮海 (Dusk Sea), 远汀 (Distant Shore), 月见 (Moonview), 潮生 (Tideborn), 灯岬 (Lamp Cape), 汐音 (Tide Song), 听风 (Windwhisper), and 拾光 (Lightkeeper). Each station keeps its own little piece of scenery: silver grass, a tide gauge, a lighthouse, a buoy bell, a windsock, bottles of light, and more.
- **Every station at its most beautiful**: 暮海, 远汀, 听风, and 拾光 remain in dusk; 月见, 潮生, 灯岬, and 汐音 slip into night.
- **Towns**: 归帆 (Homecoming Sails) and 烟火 (Fireworks). The tram first enters a harbour town in the afternoon, where the sun slowly sinks into the bay before a night of fireworks. She steps off at 烟火, turns, and walks into the lights of a thousand homes. The tram continues alone. The stations then repeat in a loop, with no final stop.
- **Four seasons**: The journey begins with the current solar term at your location. Seasons change every three stations, and each station spans two solar terms. Every season has its own slowly flowing sunset sky.
- **Chance encounters**: Along the way, you may encounter meteor showers, a full moon with flying fish, a galaxy, thunderstorms, and fireworks. A whale swims across the twilight sky as seawater rises drop by drop to meet it; after nightfall, schools of jellyfish light up the depths.
- **Collection album**: Touch objects in the scene to peel them off and place them in the album, which contains nearly two hundred cards across high-value, common, and special categories. Drift bottles at sea hold letters and tiny keepsakes; passengers aboard the tram each have a distant place they hope to reach.

## Controls

| Action | Effect |
|---|---|
| Touch the tram | Depart and ring the bell |
| Touch objects in the scene | Peel them off and add them to the album |
| `J` / `Enter` | Cycle through collectibles / peel off the current selection |
| `C` | Open the collection album |
| `` ` `` or `Shift+D` | Open the developer debug Dock (time, weather, encounters, station jumps, speed) |
| `Esc` | Close the current card or album |

## Scene URLs for Review

URL hashes and query parameters can directly select a scene or rendering state:

- `#dev` opens the debug Dock; `#st=N` jumps directly to station N.
- `#town`, `#noon`, `#sunset`, `#fireworks`, and `#after` enter different times and story moments in the harbour town.
- `#kun`, `#fullmoon`, `#galaxy`, `#meteor`, `#storm`, `#fog`, and `#lanterns` trigger their corresponding encounters (`#whale` also jumps to `#kun`).
- `#spring`, `#summer`, `#autumn`, and `#winter` lock the scene to one season.
- `?s0=2.5` sets the initial seasonal progress (`0` = start of spring, `1` = start of summer, `2` = start of autumn, `3` = start of winter; the decimal part is progress within that season).
- `?nogl` disables WebGL to preview the Canvas 2D fallback renderer.

## Saving

Album progress, travel distance, and scores persist in the browser's local storage. Metadata is written to `dusktrain.collection.v1` in `localStorage`; high-resolution snapshots captured when items are peeled off are stored in the `dusktrain/img` IndexedDB database. Clear the site's browser data to reset all progress and begin again.

## Building from Source

Only a single HTML file is required for release. The source uses the tenth relay's base document, applying function-level replacements and incremental patches. (`build10b.py` reads the base file `leg10/dusktrain-10.html`; make sure `leg10` and `leg10b` are sibling directories.)

```
index.html                  Latest release (Tenth relay, “Along the Way,” v7 · Sky Whale)
leg10/dusktrain-10.html     Base document for the tenth relay
leg10b/
  build10b.py               Build: replaces functions from fns/ in the base, then runs patches10b.py → dusktrain-10b.html
  fns/*.js                  One group of functions per file: replace matching base functions; insert new ones before frame
  patches10b.py             Small changes (anchors must occur exactly the specified number of times) and version notes
  jsfn.js                   Locates function boundaries for the build (Node)
  skyart/render/            Offline rendering of seasonal skies (physical atmosphere + volumetric clouds + grading) → fns/skyart.js
  t/                        Playwright tests
mv/                         Optional tools for filming beat-synced short videos
```

```sh
cd leg10b
python3 build10b.py          # → dusktrain-10b.html (requires Python 3 and Node 18+)
sh t/refresh.sh              # Generate t/test.html with test hooks
cd t && node smoke.js        # Also: sweep.js, nightcheck.js, soak.js, skycheck.js, etc. (requires Playwright)
```

For offline rendering of the seasonal skies, run `cd leg10b/skyart/render && python3 final.py autumn && python3 export.py` (requires `numpy`, `scipy`, `numba`, and `Pillow`). If you only want to adjust grading without recomputing volumetric clouds, run `regrade.py` directly.

## Relay by Relay

This work has evolved as a relay, with each stage extending the canvas left by the previous one:

- **Relays 1–7**: Established the dusk, the sea, and the eight sea stations.
- **Relay 8 · “Fireworks”**: Added a seaside town at sundown and a night of fireworks.
- **Relay 9 · “Storms and the Galaxy”**: Added chance encounters with meteor showers, thunderstorms, the galaxy, and fireworks.
- **Relay 10 · “Along the Way”**: Introduced peelable cards and the collection album, passengers, seasonal change, flowing sunset skies, luminous twilight, and the sky whale.

Detailed notes for each version are recorded in comments at the beginning of the scripts.

Imaginative PRs are welcome: new encounters at sea, station scenery, tram passengers, or delightful little Easter eggs. The author is usually busy with studies and may be slow to review code or reply, but any interesting, reasonable idea is welcome aboard.

## License

This project is open source under the [MIT License](LICENSE). You are free to use, modify, and distribute it.

<a id="中文"></a>

# 黄昏列车 · Dusk Train

> 没有终点 · no last stop

一列沿着海岸线行驶的电车，永远穿行在漫长的黄昏里。
全作封装于单个 HTML 文件，支持完全离线运行，零外部依赖：基于 Canvas 2D 绘制沿途风物，通过 WebGL 实时渲染流动的四季晚霞，并由 Web Audio 现场合成海浪、风声与铁轨的律动。

## 打开

- 用浏览器直接打开 `index.html` 即可运行，无需联网，也无需安装任何环境依赖。
- 列车默认静音候车，点击右下角可开启环境音；轻触车身，电车便会鸣铃启程。
- 自适应手机、平板与桌面端浏览器，横屏与竖屏均可浏览。

## 一路上

- **八个海上小站**：暮海 · 远汀 · 月见 · 潮生 · 灯岬 · 汐音 · 听风 · 拾光。每座小站都守着一样属于自己的风物：芒草、潮位尺、灯塔、浮标钟、风向袋、光瓶……
- **每一站在它最好看的时候**：暮海、远汀、听风、拾光停留在黄昏；月见、潮生、灯岬、汐音隐入夜色。
- **小镇**：归帆、烟火。列车先驶入小镇的午后，看落日一点点沉入港湾，随后迎来漫天花火的夜晚。她在「烟火」站下车，转身走进万家灯火里，列车则独自继续向前。此后再按站名循环往复，没有终点。
- **四季**：从你所在之地当天的节气启程，三站更迭一季，每一站走过两个节气。四季各有各缓缓流淌的晚霞。
- **偶遇**：旅途中会不期而遇流星雨、满月与飞鱼、星河、暴风雨与烟花。黄昏的海面上，鲲从天际游过，海水化作水滴一粒粒升空去接它；入夜之后，幽深的海面下亮起成群的水母。
- **收集簿**：画面里的景物轻触即可揭下，收进收集簿（分为高价值 / 普通 / 特殊三类，共近两百张）。海上的漂流瓶里藏着大海的来信与瓶中物；车厢里的旅客，也各有想要抵达的远方。

## 操作

| 操作 | 作用 |
|---|---|
| 轻触列车 | 启程、鸣铃 |
| 轻触画里的东西 | 从画面中揭下，收进收集簿 |
| `J` / `Enter` | 依次选中可收集物 / 揭下当前选中项 |
| `C` | 打开收集簿 |
| `` ` `` 或 `Shift+D` | 调出开发者调试 Dock（控制时间、天气、偶遇、跳站、倍速） |
| `Esc` | 关闭当前卡片或收集簿 |

## 审片用的地址

支持通过 URL Hash 与 Query 参数直接锁定场景或渲染状态：

- `#dev` 打开调试 Dock；`#st=N` 直接跳至第 N 站。
- `#town` `#noon` `#sunset` `#fireworks` `#after`：切入小镇的不同时段与剧情节点。
- `#kun` `#fullmoon` `#galaxy` `#meteor` `#storm` `#fog` `#lanterns`：触发对应偶遇场景（`#whale` 同样跳转至 `#kun`）。
- `#spring` `#summer` `#autumn` `#winter`：锁定单一季节。
- `?s0=2.5`：指定初始季节进度（`0` 立春、`1` 立夏、`2` 立秋、`3` 立冬，小数部分表示该季内的行进比例）。
- `?nogl`：禁用 WebGL，查看纯 Canvas 2D 回退渲染效果。

## 存档

收集簿进度、行驶里程与积分均持久化保存在浏览器本地存储中：元数据写入 `localStorage` 的 `dusktrain.collection.v1`，揭下瞬间截取的高清图则存入 IndexedDB 的 `dusktrain/img`。清除浏览器站点数据即可重置存档，从头启程。

## 从源码构建

发布成品仅需单个 HTML 文件。源码以第十棒的底稿为基线，通过函数级替换与增量补丁叠加构建（`build10b.py` 需读取 `leg10/dusktrain-10.html` 底稿，请确保 `leg10` 与 `leg10b` 位于同一级目录）：

```
index.html                  最新成品（第十棒「沿途」第七版 · 鲲）
leg10/dusktrain-10.html     第十棒的底稿
leg10b/
  build10b.py               构建：fns/ 里的函数换进底稿，再跑 patches10b.py → dusktrain-10b.html
  fns/*.js                  每个文件一组函数：同名的替换底稿里的，新的插在 frame 之前
  patches10b.py             小改动（锚点必须恰好出现给定次数），和每一版的说明
  jsfn.js                   给构建找函数位置（Node）
  skyart/render/            四季晚霞的离线渲染（物理大气 + 体积云 + 调色）→ fns/skyart.js
  t/                        Playwright 测试
mv/                         （可选）卡点短片的拍摄工具
```

```sh
cd leg10b
python3 build10b.py          # → dusktrain-10b.html（需要 Python 3、Node 18+）
sh t/refresh.sh              # 生成带测试钩子的 t/test.html
cd t && node smoke.js        # 还有 sweep.js、nightcheck.js、soak.js、skycheck.js……（需要 playwright）
```

四季晚霞离线渲染：执行 `cd leg10b/skyart/render && python3 final.py autumn && python3 export.py`（依赖 `numpy`、`scipy`、`numba`、`Pillow`）。若仅调整调色参数而不重新计算体积云，可直接运行 `regrade.py`。

## 一棒一棒

这部作品以接力形式迭代完成，每一棒都在上一棒的画卷上继续延展：

- **第一到七棒**：奠定黄昏、海面与八座海上小站。
- **第八棒「烟火」**：绘入海边小镇的日暮与烟花之夜。
- **第九棒「风暴与星河」**：加入流星雨、暴风雨、星河与烟花等天象偶遇。
- **第十棒「沿途」**：引入揭卡与收集簿交互、旅客、四季流转、流动的晚霞、高亮度的黄昏光影与天际游鲲。

每一版的详细演进说明均记录在脚本开头的注释中。

欢迎各种天马行空的创意 PR——无论是新的海上偶遇、站台风物、车厢旅客，还是奇妙的细节彩蛋。作者平日学业繁忙，看代码和回复可能会慢一些，但只要想法有趣、不离谱，都会合并上车。

## License

本项目基于 [MIT License](LICENSE) 开源，可自由使用、修改与分发。
