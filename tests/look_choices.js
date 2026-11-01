// 進化した姿の見た目の案を1枚の画像にする（node tests/look_choices.js → デスクトップ\副業\わたあめちゃんゲーム）
const path = require('path'), os = require('os');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.HISHO_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(os.homedir(), 'OneDrive', 'デスクトップ', '副業', 'わたあめちゃんゲーム', '進化した姿の案.png');
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await b.newPage();
  await page.setViewport({ width: 1180, height: 820 });
  await page.goto('file:///' + path.join(__dirname, '..', 'index.html').split(path.sep).join('/'));
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    window.requestAnimationFrame = () => {};   // 絵を止めて、ここで描く
    setTimeout(() => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#BFE6FF'); g.addColorStop(1, '#EAF7FF');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      text('しんかした だんごくん　どれが いい？', VW / 2, 60, 40, '#4A8CC2');
      const looks = [[null, 'いまの すがた', ''], ['pink', '①|わたあめピンク', ''], ['rainbow', '②|にじの わ', ''], ['gold', '③|きんいろ', 'これに けってい'], ['crown', '④|ほしの かんむり', '']];
      const w = VW / looks.length;
      looks.forEach(([lk, name, note], i) => {
        const x = w * i + w / 2, y = 290;
        ctx.fillStyle = 'rgba(255,255,255,.6)'; roundRect(x - w / 2 + 10, 120, w - 20, 360, 30); ctx.fill();
        time = 0.4 + i * 0.5;
        drawDango(x, y, 50, 1, 0, false, lk);
        const [a, bb] = name.includes('|') ? name.split('|') : ['', name];
        if (a) text(a, x, 395, 30, '#4A8CC2');
        text(bb, x, 432, 21, '#3a3a4a');
        if (note) text(note, x, 462, 19, '#FF6F9A');
      });
      ctx.fillStyle = 'rgba(255,255,255,.6)'; roundRect(40, 500, VW - 80, 60, 30); ctx.fill();
      drawWataame(110, 535, 0.8);
      text('わたあめを とると しんか！ なげる ボタンで お星さまを なげられる', VW / 2 + 30, 531, 20, '#3a3a4a');
    }, 50);
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: OUT });
  console.log(OUT);
  await b.close();
})();
