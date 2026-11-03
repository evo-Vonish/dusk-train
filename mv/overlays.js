// 片名、片尾（第四部只有这两张）：用和作品一样的字体与排法，在浏览器里排好，导成透明 PNG（版面 1920×1080，导出 mvconf.json 的尺寸）
const { chromium } = require('playwright');
const fs = require('fs');
const CREAM = '243, 233, 214';
const base = `
  html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
  body { position: relative; color: rgba(${CREAM}, .95); -webkit-font-smoothing: antialiased; }
  .zh { font-family: "Noto Serif CJK SC", "Noto Serif SC", serif; font-weight: 300; }
  .zb { font-family: "Noto Serif CJK SC", "Noto Serif SC", serif; font-weight: 500; }
  .en { font-family: Georgia, "Times New Roman", "TeX Gyre Termes", serif; font-style: italic; font-weight: 400; }
  .ui { font-family: "Noto Sans CJK SC", system-ui, sans-serif; font-weight: 400; }
  .sh { text-shadow: 0 2px 26px rgba(6, 8, 28, .55), 0 1px 3px rgba(6, 8, 28, .35); }
  .sh2 { text-shadow: 0 6px 60px rgba(6, 8, 28, .5), 0 2px 8px rgba(6, 8, 28, .45); }
`;
const pages = {
  // 片名：砸在 B19（贝斯和鼓一起进来的那一下）上；遮幅正好打开
  title: `<div class="sh2" style="position:absolute;left:0;right:0;top:318px;text-align:center">
      <div class="zh" style="font-size:132px;letter-spacing:.42em;margin-left:.42em;line-height:1">黄昏列车</div>
      <div style="width:64px;height:1px;background:rgba(${CREAM},.6);margin:38px auto 26px"></div>
      <div class="en" style="font-size:34px;letter-spacing:.16em">no last stop</div>
      <div class="zh" style="font-size:30px;letter-spacing:.42em;margin-left:.42em;margin-top:16px;opacity:.9">第四部「沿途」</div>
    </div>`,
  end: `<div class="sh" style="position:absolute;left:0;right:0;top:250px;text-align:center">
      <div class="zh" style="font-size:88px;letter-spacing:.42em;margin-left:.42em;line-height:1.3">黄昏列车</div>
      <div class="en" style="font-size:32px;letter-spacing:.16em;margin-top:14px;opacity:.9">no last stop</div>
      <div style="width:64px;height:1px;background:rgba(${CREAM},.55);margin:40px auto 34px"></div>
      <div class="ui" style="font-size:23px;letter-spacing:.24em;opacity:.78">第四部「沿途」· 第十棒「沿途」第八版的画面</div>
      <div class="ui" style="font-size:20px;letter-spacing:.12em;margin-top:16px;opacity:.82">♪ Overdose — なとり</div>
    </div>`,
};
// 第四部：字只有片名和片尾
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: require('./mvconf.json').W / 1920 });   // 版面照 1920×1080 排，导出按实际尺寸
  fs.mkdirSync('ov', { recursive: true });
  for (const [k, html] of Object.entries(pages)) {
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>${base}</style><body>${html}</body>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `ov/${k}.png`, omitBackground: true });
    console.log('ov', k);
  }
  await browser.close();
})();
