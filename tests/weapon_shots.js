// 武器4種類の見た目を画像にする（node tests/weapon_shots.js → tests/shots/w_*.png）
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.HISHO_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await b.newPage();
  await page.setViewport({ width: 1180, height: 820, hasTouch: true, isMobile: true, isLandscape: true });
  await page.goto('file:///' + path.join(__dirname, '..', 'index.html').split(path.sep).join('/'));
  await new Promise(r => setTimeout(r, 400));
  for (const [w, at] of [['star', 250], ['bubble', 450], ['wataame', 620], ['boomerang', 300]]) {
    await page.evaluate(w => {
      const g = __game; g.startCourse(0);
      // アイテムを画面の中に寄せて見せる
      g.items.forEach((it, k) => { it.x = (11 + k * 2.2) * 48; it.y = 9 * 48; it.kind = g.WEAPONS[k + 1] ? g.WEAPONS[k + 1].id : 'star'; });
      Object.assign(g.P, { x: 4 * 48 + 4, y: 14 * 48 - 40, vx: 0, vy: 0, inv: 0, face: 1, power: true, weapon: w });
      Object.assign(g.enemies[0], { x: 10 * 48, y: 14 * 48 - 40, vx: 0 });
    }, w);
    await new Promise(r => setTimeout(r, 2800));   // 題名の帯が消えるのを待つ
    await page.evaluate(() => { __game.P.x = 4 * 48 + 4; __game.throwStar(); });
    await new Promise(r => setTimeout(r, at));
    await page.screenshot({ path: path.join(__dirname, 'shots', `w_${w}.png`) });
  }
  await b.close();
})();
