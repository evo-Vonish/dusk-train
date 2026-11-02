**[English](#english) · [中文](#中文)**

<a id="english"></a>

# Dusk Train · 黄昏列车

> No last stop · 没有终点

A seaside tram follows the shoreline, riding forever through an unending dusk.

The entire piece is self-contained in a single HTML file that runs completely offline with zero external dependencies: Canvas 2D renders the passing world, WebGL drives the flowing seasonal twilight in real time, and the Web Audio API procedurally synthesizes ocean waves, sea breeze, and the cadence of the rails.

## Open

- Open `index.html` directly in any modern browser. No internet connection, build step, or runtime environment is required.
- The tram waits in silence by default. Click the lower-right corner to unmute ambient audio; tap or click the tram body to ring the bell and depart.
- Responsive layout supporting phones, tablets, and desktop viewports in both landscape and portrait orientations.

## Along the Way

- **Eight sea stations**: 暮海 (Dusk Sea), 远汀 (Distant Shoal), 月见 (Moonview), 潮生 (Tideborn), 灯岬 (Lantern Cape), 汐音 (Tidesong), 听风 (Windlisten), and 拾光 (Lightgather). Each platform keeps a quiet emblem of its own: silver grass, a tide gauge, a lighthouse, a buoy bell, a windsock, bottles of light…
- **Every station at its finest hour**: 暮海, 远汀, 听风, and 拾光 linger in the amber of dusk; 月见, 潮生, 灯岬, and 汐音 rest in the deep of night.
- **The harbour town**: 归帆 (Homeward Sails) and 烟火 (Fireworks). The tram rolls into town through the warm afternoon light, watches the sun sink into the bay, and stays for a night of fireworks. She steps off at 烟火, turns away, and walks into the glow of a thousand windows while the tram carries on alone. From there, the stations cycle without end.
- **Four seasons**: Your journey begins at the current solar term of your local calendar. Three stations mark the turning of a season, each station spanning two solar terms, while the twilight sky shifts and flows with the time of year.
- **Chance encounters**: Along the coast, you may cross paths with meteor showers, a full moon with flying fish, the Milky Way, thunderstorms, or distant fireworks. At dusk, a Kun—a mythic leviathan—glides across the sky as droplets of seawater rise one by one to meet it; after nightfall, luminous jellyfish drift beneath the dark waves.
- **Collection album**: Touch elements in the scene to peel them right off the canvas and keep them in your album—nearly two hundred cards across high-value, common, and special tiers. Drift bottles carry letters and small keepsakes from the sea, while each passenger aboard holds a ticket to a different destination.

## Controls

| Input | Action |
|---|---|
| Tap / Click the tram | Depart and ring the bell |
| Tap / Click scene elements | Peel the item from the canvas into the collection album |
| `J` / `Enter` | Cycle focus through collectible items / peel the focused item |
| `C` | Toggle the collection album |
| `` ` `` or `Shift+D` | Toggle the developer debug Dock (time, weather, encounters, station jump, time scale) |
| `Esc` | Dismiss the active card modal or collection album |

## Scene URLs for Review

Scene states and rendering parameters can be deterministically locked via URL hash fragments and query strings:

- `#dev`: Open the developer debug Dock on load; `#st=N`: jump directly to station `N`.
- `#town` `#noon` `#sunset` `#fireworks` `#after`: Jump to specific time-of-day phases and narrative checkpoints in the harbour town.
- `#kun` `#fullmoon` `#galaxy` `#meteor` `#storm` `#fog` `#lanterns`: Force-trigger specific encounter events (`#whale` aliases to `#kun`).
- `#spring` `#summer` `#autumn` `#winter`: Lock rendering to a single season.
- `?s0=2.5`: Set initial seasonal progress (`0` = Start of Spring, `1` = Start of Summer, `2` = Start of Autumn, `3` = Start of Winter; fractional values specify intra-season interpolation).
- `?nogl`: Disable the WebGL context to inspect the Canvas 2D fallback rendering pipeline.

## Saving

Collection state, cumulative mileage, and scores persist locally in the browser: structured metadata is serialized to `localStorage` under the key `dusktrain.collection.v1`, while high-resolution raster snapshots captured upon peeling are stored in the `dusktrain/img` IndexedDB object store. Clearing site data in the browser resets all state to a fresh run.

## Building from Source

The production artifact is a single standalone HTML file. The build pipeline takes the Relay 10 baseline document (`leg10/dusktrain-10.html`), performs AST-assisted function-level replacement, and applies deterministic text patches (`build10b.py` requires `leg10` and `leg10b` to reside as sibling directories):

```
index.html                  Production build (Relay 10 “Along the Way” v7 · Sky Whale)
leg10/dusktrain-10.html     Baseline source artifact for Relay 10
leg10b/
  build10b.py               Build script: injects/replaces functions from fns/, applies patches10b.py → dusktrain-10b.html
  fns/*.js                  Modular function groups: overrides matching symbols in base or injects new ones prior to frame()
  patches10b.py             Deterministic patch definitions (enforces exact anchor occurrence counts) and changelog notes
  jsfn.js                   Node utility for parsing function boundaries in the baseline script
  skyart/render/            Offline seasonal sky pipeline (physically-based atmosphere + volumetric clouds + grading) → fns/skyart.js
  t/                        Playwright automated test suites
mv/                         Optional capture tooling for beat-synced video production
```

```sh
cd leg10b
python3 build10b.py          # Outputs dusktrain-10b.html (requires Python 3, Node.js 18+)
sh t/refresh.sh              # Generates instrumented build at t/test.html with test hooks
cd t && node smoke.js        # Run Playwright suites: smoke.js, sweep.js, nightcheck.js, soak.js, skycheck.js
```

Offline seasonal sky rendering: run `cd leg10b/skyart/render && python3 final.py autumn && python3 export.py` (requires `numpy`, `scipy`, `numba`, and `Pillow`). To iterate on color grading without recomputing volumetric cloud raymarching, run `regrade.py` directly.

## Relay by Relay

This piece grew as a creative relay, with each stage painting further onto the canvas left by the last:

- **Relays 1–7**: Laid down the twilight, the sea, and the eight coastal stations.
- **Relay 8 · “Fireworks”**: Built the harbour town, its sinking sun, and the night of fireworks.
- **Relay 9 · “Storms and the Galaxy”**: Brought meteor showers, thunderstorms, the Milky Way, and fireworks to the open sea.
- **Relay 10 · “Along the Way”**: Added peel-to-collect cards and the collection album, passengers, turning seasons, flowing sunset skies, luminous twilight, and the sky whale.

Detailed architectural and artistic notes for each iteration are documented in the header comments of the source scripts.

Imaginative PRs are warmly welcomed—whether it is a new encounter at sea, a quiet piece of station scenery, a fellow passenger, or a hidden Easter egg. The author is busy with schoolwork, so code reviews and replies may take a little time, but any thoughtful, fitting idea will gladly be merged aboard.

## License

Released under the [MIT License](LICENSE). Free to use, modify, and distribute.

---

<a id="中文"></a>

# 黄昏列车 · Dusk Train

> 没有终点 · no last stop

一列沿着海岸线行驶的电车，永远穿行在漫长的黄昏里。

全作封装于单个 HTML 文件中，完全离线运行，零外部依赖：由 Canvas 2D 描绘沿途风物，WebGL 实时渲染流淌的四季晚霞，并通过 Web Audio API 现场合成海浪、风声与铁轨的律动。

## 打开

- 用现代浏览器直接打开 `index.html` 即可运行，无需联网，也无需配置任何运行环境或构建依赖。
- 列车默认静音候车。点击右下角可开启环境音频；轻触车身，电车便会鸣铃启程。
- 响应式布局适配手机、平板与桌面端视口，支持横屏与竖屏浏览。

## 一路上

- **八个海上小站**：暮海 · 远汀 · 月见 · 潮生 · 灯岬 · 汐音 · 听风 · 拾光。每座小站都守着一样属于自己的风物：芒草、潮位尺、灯塔、浮标钟、风向袋、光瓶……
- **每一站在它最好看的时候**：暮海、远汀、听风、拾光停留在暖色的黄昏；月见、潮生、灯岬、汐音隐入静谧的夜色。
- **小镇**：归帆、烟火。列车先驶入小镇的午后，看落日一点点沉入港湾，随后迎来漫天花火的夜晚。她在「烟火」站下车，转身走进万家灯火里，列车则独自继续向前。此后再按站名循环往复，没有终点。
- **四季**：从你所在之地当天的节气启程，三站更迭一季，每一站走过两个节气。四季各有各缓缓流淌的晚霞。
- **偶遇**：旅途中会不期而遇流星雨、满月与飞鱼、星河、暴风雨与烟花。黄昏的海面上，巨鲲从天际游过，海水化作水滴一粒粒升空去接它；入夜之后，幽深的海面下亮起成群的水母。
- **收集簿**：画面里的景物轻触即可从画布上揭下，收进收集簿（分为高价值 / 普通 / 特殊三类，共近两百张）。海上的漂流瓶里藏着大海的来信与瓶中物；车厢里的旅客，也各有想要抵达的远方。

## 操作

| 操作 | 作用 |
|---|---|
| 轻触列车 | 启程、鸣铃 |
| 轻触画里的景物 | 从画面中揭下，收进收集簿 |
| `J` / `Enter` | 依次切换选中可收集物 / 揭下当前选中项 |
| `C` | 打开或关闭收集簿 |
| `` ` `` 或 `Shift+D` | 调出开发者调试 Dock（控制时间、天气、偶遇、跳站、倍速） |
| `Esc` | 关闭当前卡片弹窗或收集簿 |

## 审片用的地址

支持通过 URL Hash 与 Query 参数精确锁定场景状态或渲染管线配置：

- `#dev`：初始化时展开调试 Dock；`#st=N`：直接跳转至第 `N` 站。
- `#town` `#noon` `#sunset` `#fireworks` `#after`：切入海边小镇的不同时段与剧情节点。
- `#kun` `#fullmoon` `#galaxy` `#meteor` `#storm` `#fog` `#lanterns`：强制触发对应偶遇场景（`#whale` 同样映射至 `#kun`）。
- `#spring` `#summer` `#autumn` `#winter`：锁定单一季节渲染。
- `?s0=2.5`：指定初始季节进度（`0` 立春、`1` 立夏、`2` 立秋、`3` 立冬，小数部分表示该季内的线性插值进度）。
- `?nogl`：禁用 WebGL 上下文，强制切换至纯 Canvas 2D 回退渲染管线。

## 存档

收集簿进度、行驶里程与积分均持久化存储于浏览器本地：结构化元数据写入 `localStorage` 的 `dusktrain.collection.v1` 键下，揭下瞬间截取的高清位图则存入 IndexedDB 的 `dusktrain/img` 对象仓库。清除浏览器站点数据即可重置全部状态，从头启程。

## 从源码构建

发布产物仅为单个独立 HTML 文件。构建管线以第十棒底稿（`leg10/dusktrain-10.html`）为基线，通过函数级替换与锚点补丁叠加生成最终文件（`build10b.py` 依赖 `leg10/dusktrain-10.html`，需确保 `leg10` 与 `leg10b` 在同级目录下并列存放）：

```
index.html                  最新发布成品（第十棒「沿途」第七版 · 鲲）
leg10/dusktrain-10.html     第十棒基线底稿
leg10b/
  build10b.py               构建脚本：将 fns/ 内的函数注入或替换进底稿，再执行 patches10b.py → dusktrain-10b.html
  fns/*.js                  模块化函数组：同名函数覆盖底稿实现，新增函数插入至 frame() 之前
  patches10b.py             增量补丁定义（严格校验锚点出现次数）及各版本演进说明
  jsfn.js                   基于 Node 的函数边界定位工具，供构建脚本调用
  skyart/render/            四季晚霞离线渲染管线（物理大气散射 + 体积云 + 调色）→ 输出 fns/skyart.js
  t/                        Playwright 自动化测试套件
mv/                         （可选）卡点短片自动化录制与帧导出工具
```

```sh
cd leg10b
python3 build10b.py          # 构建输出 dusktrain-10b.html（依赖 Python 3、Node.js 18+）
sh t/refresh.sh              # 生成注入测试钩子的 t/test.html
cd t && node smoke.js        # 运行测试套件（另含 sweep.js、nightcheck.js、soak.js、skycheck.js 等，依赖 Playwright）
```

四季晚霞离线渲染：执行 `cd leg10b/skyart/render && python3 final.py autumn && python3 export.py`（依赖 `numpy`、`scipy`、`numba`、`Pillow`）。若仅调整调色参数而不重新计算体积云光照，可直接运行 `regrade.py`。

## 一棒一棒

这部作品以接力形式生长而成，每一棒都在上一棒留下的画卷上继续延展：

- **第一到七棒**：铺开黄昏、海面与八座海上小站。
- **第八棒「烟火」**：绘入海边小镇的日暮与烟花之夜。
- **第九棒「风暴与星河」**：添入流星雨、暴风雨、星河与烟花等海上天象偶遇。
- **第十棒「沿途」**：引入揭卡与收集簿交互、车上旅客、四季流转、流动的晚霞、明亮的黄昏光影与天际游鲲。

每一版的具体改动与设计记录均写在源码脚本开头的注释中。

欢迎各种富有想象力的创意 PR——无论是新的海上偶遇、站台风物、车厢旅客，还是藏在角落里的细节彩蛋。作者平日学业繁忙，看代码和回复可能会慢一些，但只要想法有趣、契合氛围且不离谱，都会合并上车。

## License

本项目基于 [MIT License](LICENSE) 协议开源，可自由使用、修改与分发。
