// ブラウザで実際に動かす試験：iPad 横画面で、自動操作でゴールまで行けるか
// 使い方: node tests/play.test.js   （画像は tests/shots/ に出る）
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.HISHO_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const fails = [];
const ok = (cond, msg) => { console.log((cond ? '  OK  ' : '  NG  ') + msg); if (!cond) fails.push(msg); };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    // iPad Air の横画面
    await page.setViewport({ width: 1180, height: 820, deviceScaleFactor: 1, hasTouch: true, isMobile: true, isLandscape: true });
    // GAME_URL を付けると公開ページで試す
    await page.goto(process.env.GAME_URL || 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/'));
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS, '1_title.png') });
    ok(await page.evaluate(() => __game.state) === 'title', 'タイトル画面が出る');

    // タップで開始
    await page.touchscreen.tap(590, 410);
    await new Promise(r => setTimeout(r, 300));
    ok(await page.evaluate(() => __game.state) === 'play', 'タップで始まる');
    await page.screenshot({ path: path.join(SHOTS, '2_start.png') });

    // ジャンプボタンをタッチ → 跳ぶ
    const y0 = await page.evaluate(() => __game.P.y);
    await page.touchscreen.tap(1180 - 100, 820 - 90);
    await new Promise(r => setTimeout(r, 150));
    const y1 = await page.evaluate(() => __game.P.y);
    ok(y1 < y0 - 10, `ジャンプボタン（タッチ）で跳ぶ (${Math.round(y0)} → ${Math.round(y1)})`);
    await new Promise(r => setTimeout(r, 800));

    // 自動操作：右に進み、壁・穴・敵の手前で跳ぶ
    await page.keyboard.down('ArrowRight');
    let falls = 0, lastX = 0, shot3 = false, jumping = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      const s = await page.evaluate(() => {
        const g = __game, T = g.T, P = g.P;
        const fx = Math.floor((P.x + P.w + 30) / T), feet = Math.floor((P.y + P.h + 2) / T);
        const solid = (x, y) => g.grid[y] && '#=k'.includes(g.grid[y][x]);
        const wall = solid(fx, feet - 1) || solid(fx + 1, feet - 1);
        const hole = P.onGround && ![0, 1, 2].some(d => solid(fx + d, feet) || (g.grid[feet] && g.grid[feet][fx + d] === '-'));
        const foe = g.enemies.some(e => e.alive && e.x > P.x && e.x - P.x < 150 && Math.abs(e.y - P.y) < 60);
        return { state: g.state, x: P.x, onGround: P.onGround, want: wall || hole || foe, got: g.got, total: g.total };
      });
      if (s.state === 'clear') break;
      if (s.x < lastX - 200) falls++;
      lastX = s.x;
      if (s.want && s.onGround && !jumping) { await page.keyboard.down('Space'); jumping = true; }
      else if (jumping && !s.onGround) { await new Promise(r => setTimeout(r, 260)); await page.keyboard.up('Space'); jumping = false; }
      else if (jumping) { await page.keyboard.up('Space'); jumping = false; }
      if (!shot3 && s.x > 55 * 48) { await page.screenshot({ path: path.join(SHOTS, '3_clouds.png') }); shot3 = true; }
      await new Promise(r => setTimeout(r, 30));
    }
    await page.keyboard.up('ArrowRight');
    await new Promise(r => setTimeout(r, 1600));
    const end = await page.evaluate(() => ({ state: __game.state, got: __game.got, total: __game.total }));
    await page.screenshot({ path: path.join(SHOTS, '4_goal.png') });
    ok(end.state === 'clear', `自動操作でゴールできる（落ちた回数 ${falls}、お星さま ${end.got}/${end.total}）`);

    // ゴール後タップでもう一度
    await page.touchscreen.tap(590, 410);
    await new Promise(r => setTimeout(r, 300));
    ok(await page.evaluate(() => __game.state === 'play' && __game.got === 0), 'ゴール後のタップで最初から');

    // 縦向きでは「よこにしてね」
    await page.setViewport({ width: 820, height: 1180, hasTouch: true, isMobile: true });
    await new Promise(r => setTimeout(r, 300));
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display === 'flex'), '縦向きでは「よこにしてね」が出る');
    await page.screenshot({ path: path.join(SHOTS, '5_portrait.png') });

    ok(errors.length === 0, 'エラーが出ない' + (errors.length ? ': ' + errors.join(' / ') : ''));
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\n失敗 ${fails.length} 件` : '\nすべて合格');
  process.exit(fails.length ? 1 : 0);
})();
