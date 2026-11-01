// ブラウザで実際に動かす試験：iPad 横画面で、15コースすべて自動操作でゴールまで行けるか
// 使い方: node tests/play.test.js   （画像は tests/shots/ に出る）
//         GAME_URL=https://... を付けると公開ページで試す
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.HISHO_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const fails = [];
const ok = (cond, msg) => { console.log((cond ? '  OK  ' : '  NG  ') + msg); if (!cond) fails.push(msg); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = 1180, H = 820, S = H / 576;                   // 画面の大きさと、ゲームの座標からの倍率
const tapGame = (page, x, y) => page.touchscreen.tap(Math.round(x * S), Math.round(y * S));

// ページの中で動く自動操作：右へ進み、壁・穴・敵の手前で跳ぶ
function installBot() {
  if (window.__bot) return;
  const bot = window.__bot = { falls: 0, lastX: 0, holding: false, holdT: 0, stuckX: 0, stuckT: 0, on: false };
  setInterval(() => {
    const g = __game;
    if (!bot.on || g.state !== 'play') return;
    const P = g.P, T = 48, now = performance.now();
    g.keys.ArrowRight = true;
    const solid = (x, y) => g.grid[y] && '#=kBbJ'.includes(g.grid[y][x]);
    const oneway = (x, y) => g.grid[y] && g.grid[y][x] === '-';
    const fx = Math.floor((P.x + P.w + 20) / T), feet = Math.floor((P.y + P.h + 2) / T);
    const wall = solid(fx, feet - 1);
    const hole = P.onGround && !solid(fx, feet) && !oneway(fx, feet);
    const foe = g.enemies.some(e => e.alive && e.x > P.x && e.x - P.x < 110 && Math.abs(e.y - P.y) < 50);
    if (Math.abs(P.x - bot.stuckX) > 10) { bot.stuckX = P.x; bot.stuckT = now; }
    const stuck = now - bot.stuckT > 1500;
    if (P.onGround && !bot.holding && (wall || hole || foe || stuck)) {
      g.pressJump(); g.keys.Space = true; bot.holding = true; bot.holdT = now; bot.stuckT = now;
    }
    if (bot.holding && now - bot.holdT > 220) { g.keys.Space = false; bot.holding = false; }
    if (P.x < bot.lastX - 150) bot.falls++;
    bot.lastX = P.x;
  }, 16);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, hasTouch: true, isMobile: true, isLandscape: true });   // iPad Air の横画面
    // GAME_URL を付けると公開ページで試す
    await page.goto(process.env.GAME_URL || 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/'));
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload();
    await wait(600);
    // オープニング：最後まで見ると自動でタイトルへ（速回し）、タップでもとばせる
    ok(await page.evaluate(() => __game.state) === 'opening', 'はじめにオープニングが流れる');
    await page.evaluate(() => { window.__timeScale = 8; });
    await wait(2500);
    await page.evaluate(() => { window.__timeScale = 1; });
    ok(await page.evaluate(() => __game.state) === 'title', 'オープニングが終わると自動でタイトルになる');
    await page.reload(); await wait(600);
    await page.touchscreen.tap(590, 300); await wait(200);
    ok(await page.evaluate(() => __game.state) === 'title', 'オープニングはタップでとばせる');
    await page.screenshot({ path: path.join(SHOTS, '1_title.png') });
    ok(await page.evaluate(() => __game.state) === 'title', 'タイトル画面が出る');
    ok(await page.evaluate(() => __game.count) === 15, 'コースが15ある');

    // タップでコースを選ぶ画面 → 1-1 だけ開いている
    await page.touchscreen.tap(590, 410); await wait(300);
    ok(await page.evaluate(() => __game.state) === 'select', 'タップでコースを選ぶ画面になる');
    await page.screenshot({ path: path.join(SHOTS, '2_select_first.png') });
    const card = i => page.evaluate(i => { /* selectCards は中にあるので座標を計算し直す */ const VW = 576 * innerWidth / innerHeight;
      const cw = 196, ch = 76, gap = 12, lw = 140, x0 = (VW - (lw + 3 * cw + 2 * gap)) / 2;
      return { x: x0 + lw + (i % 3) * (cw + gap) + cw / 2, y: 112 + Math.floor(i / 3) * (ch + 12) + ch / 2 }; }, i);
    let c2 = await card(1);
    await tapGame(page, c2.x, c2.y); await wait(200);
    ok(await page.evaluate(() => __game.state) === 'select', 'まだ開いていないコース（1-2）は選べない');
    let c1 = await card(0);
    await tapGame(page, c1.x, c1.y); await wait(300);
    ok(await page.evaluate(() => __game.state === 'play' && __game.courseIdx === 0), '1-1 を選ぶと始まる');
    await page.screenshot({ path: path.join(SHOTS, '3_start.png') });

    // ジャンプボタン
    const y0 = await page.evaluate(() => __game.P.y);
    await page.touchscreen.tap(W - 100, H - 90); await wait(150);
    const y1 = await page.evaluate(() => __game.P.y);
    ok(y1 < y0 - 10, `ジャンプボタン（タッチ）で跳ぶ (${Math.round(y0)} → ${Math.round(y1)})`);
    await wait(800);

    // 右ボタンを押したまま「離した」の知らせが来なくても、指が無くなれば止まる（iPad で勝手に右へ動いた不具合）
    const stuck = await page.evaluate(async () => {
      const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), s = r.height / 576;
      const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 77, pointerType: 'touch', clientX: r.left + x * s, clientY: r.top + y * s, bubbles: true }));
      const before = __game.P.x;
      ev('pointerdown', 245, 576 - 100);
      await new Promise(f => setTimeout(f, 300));
      const moved = __game.P.x - before;
      window.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true }));   // pointerup は送らない
      await new Promise(f => setTimeout(f, 600));
      const x1 = __game.P.x;
      await new Promise(f => setTimeout(f, 400));
      return { moved, x1, x2: __game.P.x };
    });
    ok(stuck.moved > 20 && Math.abs(stuck.x2 - stuck.x1) < 1, `「離した」の知らせが来なくても勝手に右へ動き続けない (${Math.round(stuck.x1)} → ${Math.round(stuck.x2)})`);
    // 上半分を触っても動かない（持つ手が触れたとき）
    const top = await page.evaluate(async () => {
      const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), s = r.height / 576;
      const x0 = __game.P.x;
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 78, pointerType: 'touch', clientX: r.left + 250 * s, clientY: r.top + 200 * s, bubbles: true }));
      await new Promise(f => setTimeout(f, 400));
      const x1 = __game.P.x;
      cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 78, pointerType: 'touch', bubbles: true }));
      return { x0, x1 };
    });
    ok(Math.abs(top.x1 - top.x0) < 1, `画面の上半分に手が触れても動かない (${Math.round(top.x0)} → ${Math.round(top.x1)})`);

    // 仕掛け：だんごくんを置いて確かめる（1-1）
    const place = (tx, y) => page.evaluate((tx, y) => Object.assign(__game.P, { x: tx * 48 + 4, y, vx: 0, vy: 0, inv: 0 }), tx, y);
    await place(11, 14 * 48 - 40); await wait(100);
    const g0 = await page.evaluate(() => __game.got);
    await page.keyboard.down('Space'); await wait(350); await page.keyboard.up('Space'); await wait(400);
    const blk = await page.evaluate(() => ({ t: __game.grid[11][11], got: __game.got }));
    ok(blk.t === 'b' && blk.got === g0 + 1, `星のブロックをたたくとお星さまが出る (${g0} → ${blk.got})`);
    await place(24, 13 * 48 - 42);
    let minY = 1e9;
    for (let i = 0; i < 25; i++) { minY = Math.min(minY, await page.evaluate(() => __game.P.y)); await wait(40); }
    ok(minY < 9 * 48, `ぽよーん雲で高く跳ねる (いちばん高い所 ${Math.round(minY / 48 * 10) / 10} マス目)`);
    ok(await page.evaluate(() => __game.bigGot) === 1, 'ぽよーん雲の上のおおきなお星さまが取れる');
    await page.evaluate(() => { __game.falls = 2; });
    await place(20, 12 * 48);
    let up = false; const xs = [];
    for (let i = 0; i < 30; i++) { const q = await page.evaluate(() => ({ vy: __game.P.vy, x: __game.P.x })); if (q.vy < -600) up = true; xs.push(q.x); await wait(30); }
    ok(up && xs.every(x => Math.abs(x - (20 * 48 + 4)) < 5), 'たすけ雲が穴から押し上げてくれる（最初に戻されない）');
    await page.evaluate(() => { __game.falls = 0; });
    await place(20, 12 * 48); await wait(1200);
    ok(await page.evaluate(() => __game.P.x < 20 * 48 - 100 && __game.falls === 1), 'たすけ雲が出る前は、落ちると旗（最初）に戻る');
    const m0 = await page.evaluate(() => __game.muted);
    const sx = (576 * W / H) - 56;
    await tapGame(page, sx, 50); await wait(150);
    const m1 = await page.evaluate(() => __game.muted);
    await tapGame(page, sx, 50); await wait(150);
    ok(m1 === !m0 && await page.evaluate(() => __game.muted) === m0, '右上のボタンで音を消せる・もどせる');
    ok(await page.evaluate(() => __game.musicOn), '遊んでいる間は音楽が流れる');
    // ハート：敵に横から当たると1つ減る、0になると旗からやり直し（ゲームオーバーなし）
    const bump = () => page.evaluate(async () => {
      const g = __game, e = g.enemies.find(e => e.alive);
      Object.assign(g.P, { x: 6 * 48 + 4, y: 13 * 48 - 40, vx: 0, vy: 0, inv: 0 });
      Object.assign(e, { x: g.P.x + 20, y: g.P.y, vx: 0 });
      await new Promise(f => setTimeout(f, 120));
      e.x = 2000 * 48;   // 続けて当たらないよう遠くへ
      return { hearts: g.hearts, x: g.P.x, state: g.state };
    });
    await page.evaluate(() => { __game.hearts = 3; });
    const h1 = await bump();
    ok(h1.hearts === 2 && h1.state === 'play', `敵に横から当たるとハートが1つ減る (3 → ${h1.hearts})`);
    await page.screenshot({ path: path.join(SHOTS, '3b_hearts.png') });
    await page.evaluate(() => { __game.hearts = 1; });
    const h2 = await bump();
    ok(h2.hearts === 3 && Math.abs(h2.x - (6 * 48 + 4)) > 100 && h2.state === 'play', `ハートが無くなると旗からやり直し・ハートは元にもどる（ゲームオーバーなし）`);

    // 進化と武器：わたあめを取ると進化 → なげるボタンでお星さま → 敵を倒す。進化中に当たると元にもどる（ハートは減らない）
    const itemCounts = await page.evaluate(() => { const n = []; for (let i = 0; i < __game.count; i++) { __game.startCourse(i); n.push(__game.items.length); } __game.startCourse(0); return n; });
    ok(itemCounts.every(n => n === 2), `どのコースにも わたあめが2つある (${itemCounts.join(',')})`);
    const pw = await page.evaluate(async () => {
      const g = __game, it = g.items[0];
      Object.assign(g.P, { x: it.x - 20, y: it.y - 20, vx: 0, vy: 0, inv: 0, power: false });
      await new Promise(f => setTimeout(f, 100));
      return { power: g.P.power, got: it.got };
    });
    ok(pw.power && pw.got, 'わたあめを取ると進化する');
    await wait(300);
    await page.screenshot({ path: path.join(SHOTS, '3c_power.png') });
    const th = await page.evaluate(async () => {
      const g = __game, e = g.enemies.find(e => e.alive);
      // 平らな地面（1-1 の6マス目あたり）で、右に3マス先に敵を置く
      Object.assign(g.P, { x: 6 * 48 + 4, y: 14 * 48 - 40, vx: 0, vy: 0, inv: 2, face: 1 });
      Object.assign(e, { x: 9 * 48 + 4, y: 14 * 48 - 40, vx: 0 });
      return { b: g.buttons().throw, i: g.enemies.indexOf(e) };
    });
    await wait(100);
    await tapGame(page, th.b.x, th.b.y);
    await wait(30);
    const shotN = await page.evaluate(() => __game.shots.length);
    await wait(700);
    ok(shotN === 1, '進化すると「なげる」ボタンでお星さまをなげられる');
    ok(await page.evaluate(i => !__game.enemies[i].alive, th.i), 'なげたお星さまが敵に当たると倒せる');
    const dn = await page.evaluate(async () => {
      const g = __game, e = g.enemies.find(e => e.alive);
      g.hearts = 3;
      Object.assign(g.P, { x: 6 * 48 + 4, y: 14 * 48 - 40, vx: 0, vy: 0, inv: 0 });
      Object.assign(e, { x: g.P.x + 20, y: g.P.y, vx: 0 });
      await new Promise(f => setTimeout(f, 120));
      e.x = 2000 * 48;
      return { power: g.P.power, hearts: g.hearts };
    });
    ok(!dn.power && dn.hearts === 3, '進化中に敵に当たると元の姿にもどる（ハートは減らない）');
    await page.evaluate(() => __game.throwStar());
    ok(await page.evaluate(() => __game.shots.length) === 0, '元の姿ではお星さまをなげられない');
    // もどる
    await tapGame(page, (576 * W / H) - 196 + 52, 26 + 25); await wait(200);
    ok(await page.evaluate(() => __game.state === 'select' && !__game.musicOn), '「もどる」でコースを選ぶ画面にもどる');

    // 15コースを自動操作で
    await page.evaluate(installBot);
    await page.evaluate(() => { window.__timeScale = 2; });
    const results = [];
    for (let i = 0; i < 15; i++) {
      await page.evaluate(i => { __game.startCourse(i); Object.assign(__bot, { falls: 0, lastX: 0, on: true }); }, i);
      const t0 = Date.now();
      let shot = false;
      while (Date.now() - t0 < 75000) {
        if (await page.evaluate(() => __game.state) === 'clear') break;
        if (!shot && i % 3 === 1 && Date.now() - t0 > 4000) { await page.screenshot({ path: path.join(SHOTS, `theme_${i + 1}.png`) }); shot = true; }
        await wait(250);
      }
      const r = await page.evaluate(() => ({ state: __game.state, falls: __bot.falls, got: __game.got, total: __game.total, big: __game.bigGot, x: Math.round(__game.P.x / 48) }));
      await page.evaluate(() => { __bot.on = false; __game.keys.ArrowRight = false; __game.keys.Space = false; });
      results.push(r);
      const id = `${Math.floor(i / 3) + 1}-${i % 3 + 1}`;
      ok(r.state === 'clear', `${id} 自動操作でゴールできる（落ちた ${r.falls}回、お星さま ${r.got}/${r.total}、おおきな ${r.big}/3、${Math.round((Date.now() - t0) / 1000)}秒）${r.state === 'clear' ? '' : ' 止まった所 ' + r.x + 'マス目'}`);
      if (i === 0) { await wait(1500); await page.screenshot({ path: path.join(SHOTS, '4_goal.png') }); }
    }
    await page.evaluate(() => { window.__timeScale = 1; });
    ok(await page.evaluate(() => __game.unlocked) === 15, 'クリアするたびに次のコースが開く（15コースぜんぶ開いた）');

    // ゴール後の「つぎへ」
    await page.evaluate(() => __game.startCourse(3));
    await page.evaluate(() => { const g = __game; g.P.x = g.goal.x; });
    await wait(1800);
    await page.screenshot({ path: path.join(SHOTS, '5_clear_buttons.png') });
    const vw = 576 * W / H, bw = 230, gap = 20, bx0 = (vw - (3 * bw + 2 * gap)) / 2;
    await tapGame(page, bx0 + bw / 2, 576 * 0.86 + 33); await wait(300);
    ok(await page.evaluate(() => __game.state === 'play' && __game.courseIdx === 4), 'ゴール後「つぎへ」で次のコースへ');
    await page.evaluate(() => __game.startCourse(4));
    await page.evaluate(() => { const g = __game; g.P.x = g.goal.x; });
    await wait(1800);
    await tapGame(page, bx0 + bw * 1.5 + gap, 576 * 0.86 + 33); await wait(300);
    ok(await page.evaluate(() => __game.state) === 'select', 'ゴール後「コースを えらぶ」で選ぶ画面へ');
    await page.screenshot({ path: path.join(SHOTS, '6_select_all.png') });

    // 縦向き
    await page.setViewport({ width: 820, height: 1180, hasTouch: true, isMobile: true });
    await wait(300);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display === 'flex'), '縦向きでは「よこにしてね」が出る');
    const rot = await page.evaluate(() => document.getElementById('rotate').textContent);
    ok(!rot.includes('iPad') && rot.includes('がめんを よこむきに'), '「よこにしてね」は iPad 以外でも通じる言い方');

    ok(errors.length === 0, 'エラーが出ない' + (errors.length ? ': ' + errors.join(' / ') : ''));
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\n失敗 ${fails.length} 件` : '\nすべて合格');
  process.exit(fails.length ? 1 : 0);
})();
