// 敵とボスの見た目を画像にする（node tests/boss_shots.js → tests/shots/boss_*.png, enemies.png）
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.HISHO_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await b.newPage();
  await page.setViewport({ width: 1180, height: 820, hasTouch: true, isMobile: true, isLandscape: true });
  await page.goto('file:///' + path.join(__dirname, '..', 'index.html').split(path.sep).join('/'));
  await wait(400);
  for (const ci of [0, 3, 6, 9, 12]) {
    await page.evaluate(ci => {
      const g = __game; g.startCourse(ci);
      const B = g.boss;
      Object.assign(g.P, { x: B.left + 60, y: B.groundY - 44, vx: 0, vy: 0, inv: 0 });
    }, ci);
    await wait(2200);
    await page.evaluate(() => { __game.P.inv = 99; });
    await wait(ci === 12 ? 4200 : 600);
    await page.screenshot({ path: path.join(__dirname, 'shots', `boss_${ci}.png`) });
  }
  // 敵4種類を並べる
  await page.evaluate(() => {
    const g = __game; g.startCourse(9);
    Object.assign(g.P, { x: 2 * 48, y: 0, vx: 0, vy: 0, inv: 99 });
    const kinds = ['walk', 'hop', 'fly', 'spike'];
    g.enemies.slice(0, 4).forEach((e, k) => Object.assign(e, { kind: kinds[k], x: (6 + k * 3) * 48, y: 6 * 48, vx: 0, baseY: 8 * 48 }));
    g.enemies.slice(4).forEach(e => e.alive = false);
  });
  await wait(2800);
  await page.screenshot({ path: path.join(__dirname, 'shots', 'enemies.png') });
  await b.close();
})();
