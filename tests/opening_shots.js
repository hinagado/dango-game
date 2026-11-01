// オープニングの場面を画像にして見た目を確かめる（node tests/opening_shots.js → tests/shots/op_*.png）
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.HISHO_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await b.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setViewport({ width: 1180, height: 820, hasTouch: true, isMobile: true, isLandscape: true });
  await page.goto('file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/'));
  let prev = 0;
  for (const at of [1.5, 4.9, 5.7, 7.2, 10.2, 12.5, 13.6]) {
    while (await page.evaluate(() => __game.openT) < at) await new Promise(r => setTimeout(r, 30));
    await page.screenshot({ path: path.join(__dirname, 'shots', `op_${String(at).replace('.', '_')}.png`) });
  }
  await new Promise(r => setTimeout(r, 800));
  console.log('state', await page.evaluate(() => __game.state), 'errors', errs);
  await b.close();
})();
