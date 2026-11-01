# 15コース化（コースを選ぶ画面・レベルごとの景色・つぎへボタン）を index.html に入れる一度きりの書き換え
import re, sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()


def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (a[:70], c)
    s = s.replace(a, b)


# コースは courses.js から読む
s, k = re.subn(r"// ===== コース（レベル1-1） =====.*?\n\};\n</script>", "</script>\n<script src=\"courses.js\"></script>", s, count=1, flags=re.S)
assert k == 1

rep("""  tempo: 116,         // 音楽の速さ
};""", """  tempo: 116,         // 音楽の速さ（そうげん）
};
// レベルごとの景色と音楽（tempo＝速さ、key＝高さ）
const THEMES = {
  grass:  { sky: ['#8FD3F7', '#E8F7FF'], hill: '#BDE8C6', ground: '#E9C9A0', speck: '#DDB98C', top: '#8FD48F', top2: '#A8E2A3', tempo: 116, key: 0 },
  forest: { sky: ['#7CC7B8', '#E3F5EC'], hill: '#8CCB98', ground: '#C9A27E', speck: '#B88F6A', top: '#5DAE6B', top2: '#7CC488', tempo: 104, key: -3, trees: true },
  beach:  { sky: ['#7FD0F5', '#FFF6E0'], hill: '#7FD6E8', ground: '#F5DDA8', speck: '#E8C98A', top: '#FBE9C0', top2: '#FFF4DA', tempo: 124, key: 2, sea: true },
  snow:   { sky: ['#B8D8F0', '#F4FAFF'], hill: '#E6F0FA', ground: '#C9D9EA', speck: '#B4C8DC', top: '#FFFFFF', top2: '#EEF6FF', tempo: 108, key: -5, snow: true },
  night:  { sky: ['#2B2F6B', '#7B6FB0'], hill: '#4B4A8A', ground: '#8E7FB8', speck: '#7C6DA6', top: '#B9A6E8', top2: '#CDBEF2', tempo: 96, key: -1, night: true },
};""")

rep("let grid, W, H, stars, bigStars, enemies, checkpoints, startPos, goal, totalStars;",
    "let grid, W, H, stars, bigStars, enemies, checkpoints, startPos, goal, totalStars;\nlet courseIdx = 0, course = COURSES[0], theme = THEMES.grass;")
rep("""function loadCourse() {
  const rows = COURSE.map;""", """function loadCourse(i = courseIdx) {
  courseIdx = i; course = COURSES[i]; theme = THEMES[course.theme] || THEMES.grass;
  const rows = course.map;""")
rep("enemies.push({ x: x * T + 4, y: y * T + 8, w: T - 8, h: T - 8, vx: -60, alive: true, squish: 0 });",
    "enemies.push({ x: x * T + 4, y: y * T + 8, w: T - 8, h: T - 8, vx: -(48 + course.level * 12), alive: true, squish: 0 });")
rep("""const BEST_KEY = 'dango.best.1-1';
let best = store.get(BEST_KEY, null);""", """let bests = store.get('dango.bests', {});         // コースごとの いちばん良い記録
let unlocked = store.get('dango.unlocked', 1);    // 遊べるコースの数""")

# 音楽はレベルごとに速さと高さを変える
rep("const e = 30 / CONFIG.tempo, v = CONFIG.musicVolume;", "const e = 30 / (theme.tempo || CONFIG.tempo), v = CONFIG.musicVolume, key = theme.key || 0;")
rep("noteAt(semi(NOTE[n]), musicT, e * len * 0.95, 'triangle', 0.07 * v);", "noteAt(semi(NOTE[n] + key), musicT, e * len * 0.95, 'triangle', 0.07 * v);")
rep("noteAt(semi(NOTE[b] - 24), musicT, e * 1.8, 'sine', 0.13 * v);", "noteAt(semi(NOTE[b] - 24 + key), musicT, e * 1.8, 'sine', 0.13 * v);")

rep("""function startGame() {
  loadCourse();""", """function startCourse(i) {
  loadCourse(i);""")
rep("loadCourse();\nconst solidAt", "loadCourse(0);\nconst solidAt")

# 画面のボタン（コース選び・ゴール後・もどる）
rep("""function pressJump() { P.buffer = CONFIG.jumpBuffer; }
function tapAnywhere() {
  if (state === 'title') { startGame(); return true; }
  if (state === 'clear' && clearT > 1.2) { startGame(); return true; }
  return false;
}""", """function pressJump() { P.buffer = CONFIG.jumpBuffer; }
function selectCards() {
  const cw = 196, ch = 76, gap = 12, lw = 140;
  const x0 = (VW - (lw + 3 * cw + 2 * gap)) / 2, y0 = 112;
  return COURSES.map((c, i) => ({ i, x: x0 + lw + (i % 3) * (cw + gap), y: y0 + Math.floor(i / 3) * (ch + 12), w: cw, h: ch, lx: x0 + lw / 2 - 6 }));
}
function clearButtons() {
  const list = [];
  if (courseIdx + 1 < COURSES.length) list.push({ id: 'next', label: 'つぎへ ▶', color: '#FF8FB0' });
  list.push({ id: 'select', label: 'コースを えらぶ', color: '#8EC9EE' }, { id: 'retry', label: 'もういちど', color: '#B9D98A' });
  const w = 230, h = 66, gap = 20, x0 = (VW - (list.length * w + (list.length - 1) * gap)) / 2;
  return list.map((b, i) => ({ ...b, x: x0 + i * (w + gap), y: VH * 0.86, w, h }));
}
const backButton = () => ({ x: VW - 196, y: 26, w: 104, h: 50 });
const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
function goSelect() { state = 'select'; musicStop(); selectT = 0; }
function tapAnywhere(p) {
  if (state === 'title') { goSelect(); return true; }
  if (state === 'select') {
    if (!p) { startCourse(Math.min(unlocked, COURSES.length) - 1); return true; }   // キーボードなら いちばん新しいコース
    for (const c of selectCards()) if (inRect(p, c) && c.i < unlocked) { startCourse(c.i); return true; }
    return true;
  }
  if (state === 'clear') {
    if (clearT < 1.2) return true;
    if (!p) { startCourse(Math.min(courseIdx + 1, COURSES.length - 1)); return true; }
    for (const b of clearButtons()) if (inRect(p, b)) {
      if (b.id === 'next') startCourse(courseIdx + 1);
      else if (b.id === 'retry') startCourse(courseIdx);
      else goSelect();
    }
    return true;
  }
  if (state === 'play' && p && inRect(p, backButton())) { goSelect(); return true; }
  return false;
}""")
rep("let trailT = 0, fireT = 0, helpCloud = null;", "let trailT = 0, fireT = 0, helpCloud = null, selectT = 0;")
rep("""  if (tapAnywhere()) return;
  const k = whichButton(lp);""", """  if (tapAnywhere(lp)) return;
  const k = whichButton(lp);""")
rep("if (e.code === 'Space' || e.code === 'ArrowUp') pressJump(); tapAnywhere(); });",
    "if (e.code === 'Space' || e.code === 'ArrowUp') pressJump(); if (state !== 'play' && !e.repeat) tapAnywhere(); });")

# ゴールの記録：コースごとに残し、次のコースを開ける
rep("""    best = { stars: Math.max(got, best ? best.stars : 0), big: Math.max(bigGot, best ? best.big : 0), total: totalStars };
    store.set(BEST_KEY, best);""", """    const b = bests[course.id] || { stars: 0, big: 0 };
    bests[course.id] = { stars: Math.max(got, b.stars), big: Math.max(bigGot, b.big), total: totalStars };
    store.set('dango.bests', bests);
    unlocked = Math.max(unlocked, Math.min(COURSES.length, courseIdx + 2));
    store.set('dango.unlocked', unlocked);""")
rep("""  if (state === 'clear') {
    clearT += dt; fireT -= dt;""", """  if (state === 'select') selectT += dt;
  if (state === 'clear') {
    clearT += dt; fireT -= dt;""")

# 景色
rep("""  g.addColorStop(0, mix('#8FD3F7', '#F8C9E0', k));
  g.addColorStop(1, mix('#E8F7FF', '#FFF1E6', k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);""", """  g.addColorStop(0, mix(theme.sky[0], '#F8C9E0', k));
  g.addColorStop(1, mix(theme.sky[1], '#FFF1E6', k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (theme.night) {   // 夜空のきらきら
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 - camX * 0.05) % VW + VW) % VW, sy = (i * 89) % (VH * 0.6);
      ctx.globalAlpha = (0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + i))) * (1 - k);
      ctx.fillStyle = '#FFF6C8'; star(sx, sy, 3 + (i % 3), 1.4);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,248,210,${1 - k})`; ctx.beginPath(); ctx.arc(VW - 160, 120, 44, 0, 7); ctx.fill();
  }""")
rep("""  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 12; i++) {""", """  ctx.fillStyle = theme.night ? `rgba(255,255,255,${0.25 + 0.6 * k})` : 'rgba(255,255,255,.85)';
  for (let i = 0; i < 12; i++) {""")
rep("""  ctx.fillStyle = mix('#BDE8C6', '#F3D6EA', k);
  for (let i = 0; i < 10; i++) {
    const x = ((i * 640 - camX * 0.45) % (VW + 900) + VW + 900) % (VW + 900) - 450;
    ctx.beginPath(); ctx.ellipse(x, VH - 200, 380, 130, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 380, VH - 201, 760, 201);
  }
}""", """  ctx.fillStyle = mix(theme.hill, '#F3D6EA', k);
  if (theme.sea) {   // うみべ：遠くの海と波
    ctx.fillRect(0, VH - 300, VW, 300);
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
    for (let i = 0; i < 14; i++) {
      const x = ((i * 160 - camX * 0.3 + Math.sin(time + i) * 10) % (VW + 200) + VW + 200) % (VW + 200) - 100;
      ctx.fillRect(x, VH - 280 + (i % 4) * 22, 50, 4);
    }
  } else for (let i = 0; i < 10; i++) {
    const x = ((i * 640 - camX * 0.45) % (VW + 900) + VW + 900) % (VW + 900) - 450;
    ctx.beginPath(); ctx.ellipse(x, VH - 200, 380, 130, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 380, VH - 201, 760, 201);
    if (theme.trees && k < 1) {   // もり：丸い木
      for (let j = -2; j <= 2; j++) {
        const tx = x + j * 120, ty = VH - 200 - Math.sqrt(Math.max(0, 1 - (j * 120 / 380) ** 2)) * 130;
        ctx.fillStyle = mix('#6BAF7B', '#F3D6EA', k); ctx.fillRect(tx - 5, ty - 30, 10, 34);
        ctx.beginPath(); ctx.arc(tx, ty - 50, 34, 0, 7); ctx.arc(tx - 22, ty - 32, 22, 0, 7); ctx.arc(tx + 22, ty - 32, 22, 0, 7); ctx.fill();
        ctx.fillStyle = mix(theme.hill, '#F3D6EA', k);
      }
    }
  }
  if (theme.snow) {   // ゆきやま：ふる雪
    ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 97 + Math.sin(time + i) * 30 - camX * 0.3) % VW + VW) % VW, sy = ((i * 53 + time * (30 + i % 5 * 8)) % VH);
      ctx.beginPath(); ctx.arc(sx, sy, 2.5 + (i % 3), 0, 7); ctx.fill();
    }
  }
}""")
rep("""      ctx.fillStyle = '#E9C9A0'; ctx.fillRect(px, py, T + 0.5, T + 0.5);
      ctx.fillStyle = '#DDB98C'; if ((x + y) % 3 === 0) { ctx.beginPath(); ctx.arc(px + 16, py + 30, 4, 0, 7); ctx.fill(); }
      if (above !== '#') { ctx.fillStyle = '#8FD48F'; roundRect(px - 1, py - 4, T + 2, 18, 8); ctx.fill(); ctx.fillStyle = '#A8E2A3'; ctx.fillRect(px - 1, py - 2, T + 2, 5); }""",
"""      ctx.fillStyle = theme.ground; ctx.fillRect(px, py, T + 0.5, T + 0.5);
      ctx.fillStyle = theme.speck; if ((x + y) % 3 === 0) { ctx.beginPath(); ctx.arc(px + 16, py + 30, 4, 0, 7); ctx.fill(); }
      if (above !== '#') { ctx.fillStyle = theme.top; roundRect(px - 1, py - 4, T + 2, 18, 8); ctx.fill(); ctx.fillStyle = theme.top2; ctx.fillRect(px - 1, py - 2, T + 2, 5); }""")

# タイトル・コース選び
rep("""    camX = (time * 40) % 2000; if (!grid) loadCourse();""", """    camX = (time * 40) % 2000;""")
rep("""    if (best) text(`さいこう記録　★ ${best.stars} / ${best.total}　おおきなお星さま ${best.big} / 3`, VW / 2, VH * 0.69, 26, '#6B7A8F');""",
"""    const bigAll = Object.values(bests).reduce((a, b) => a + b.big, 0);
    if (bigAll) text(`あつめた おおきなお星さま　${bigAll} / ${COURSES.length * 3}`, VW / 2, VH * 0.69, 26, '#6B7A8F');""")
rep("""  drawSky();
  const oy = OY();
  drawTiles();""", """  if (state === 'select') { drawSelect(); return; }
  drawSky();
  const oy = OY();
  drawTiles();""")
rep("""function bigSlots(x, y, r) {""", """function drawSelect() {
  camX = (selectT * 30) % 1500;
  drawSky();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, 0, VW, VH);
  text('コースを えらんでね', VW / 2, 58, 46, '#4A8CC2');
  const LV = ['そうげん', 'もり', 'うみべ', 'ゆきやま', 'よぞら'], TH = ['grass', 'forest', 'beach', 'snow', 'night'];
  for (const c of selectCards()) {
    const co = COURSES[c.i], open = c.i < unlocked, b = bests[co.id], th = THEMES[co.theme];
    if (c.i % 3 === 0) text(LV[co.level - 1], c.lx, c.y + c.h / 2, 26, '#5A6A80');
    ctx.fillStyle = open ? '#FFFFFF' : 'rgba(255,255,255,.5)';
    roundRect(c.x, c.y, c.w, c.h, 18); ctx.fill();
    ctx.strokeStyle = open ? th.top : '#D5D9E0'; ctx.lineWidth = 4; ctx.stroke();
    if (!open) { text('🔒', c.x + c.w / 2, c.y + c.h / 2, 30, '#999'); continue; }
    const isNew = c.i === unlocked - 1 && !b;
    text(co.id, c.x + 46, c.y + c.h / 2, 30, '#3a3a4a');
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = b && k < b.big ? '#FFD84D' : '#EEF0F4';
      star(c.x + 108 + k * 30, c.y + c.h / 2, 13, 6); ctx.strokeStyle = b && k < b.big ? '#F2A626' : '#C9CCD8'; ctx.lineWidth = 2; ctx.stroke();
    }
    if (isNew && Math.sin(time * 5) > -0.2) text('NEW', c.x + c.w - 30, c.y + 14, 18, '#FF6F9A');
  }
  drawSoundButton();
}
function bigSlots(x, y, r) {""")
rep("""  drawSoundButton();
  if (banner > 0) { ctx.globalAlpha = Math.min(1, banner); text(COURSE.name, VW / 2, 130, 44, '#4A8CC2'); ctx.globalAlpha = 1; }""",
"""  drawSoundButton();
  if (state === 'play') {
    const bb = backButton();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; roundRect(bb.x, bb.y, bb.w, bb.h, 25); ctx.fill();
    text('もどる', bb.x + bb.w / 2, bb.y + bb.h / 2 + 1, 22, '#5A6A80');
  }
  if (banner > 0) { ctx.globalAlpha = Math.min(1, banner); text(course.name, VW / 2, 130, 40, '#4A8CC2'); ctx.globalAlpha = 1; }""")
rep("""    const msg = got === totalStars && bigGot === bigStars.length ? 'ぜんぶ あつめたね！ すごい！'
      : bigGot < bigStars.length ? 'おおきなお星さまが まだ かくれているよ' : 'お星さま ぜんぶ あつめられるかな？';
    text(msg, VW / 2, VH * 0.8, 30, '#E0A800');
    if (clearT > 1.2) text('タップで もういちど', VW / 2, VH * 0.92, 34);""",
"""    const last = courseIdx === COURSES.length - 1;
    const msg = last ? 'ぜんぶの コースを クリア！ おめでとう！'
      : got === totalStars && bigGot === bigStars.length ? 'ぜんぶ あつめたね！ すごい！'
      : bigGot < bigStars.length ? 'おおきなお星さまが まだ かくれているよ' : 'お星さま ぜんぶ あつめられるかな？';
    text(msg, VW / 2, VH * 0.76, 30, last ? '#FF6F9A' : '#E0A800');
    if (clearT > 1.2) for (const b of clearButtons()) {
      ctx.fillStyle = b.color; roundRect(b.x, b.y, b.w, b.h, 33); ctx.fill();
      text(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, 28, '#FFFFFF');
    }""")
# 試験用
rep("""  acc += Math.min(0.1, (now - last) / 1000); last = now;""", """  acc += Math.min(0.1, (now - last) / 1000) * (window.__timeScale || 1); last = now;""")
rep("""  get grid() { return grid; }, get enemies() { return enemies; }, get goal() { return goal; }, start: startGame, T,""",
"""  get grid() { return grid; }, get enemies() { return enemies; }, get goal() { return goal; }, startCourse, T, keys, pressJump,
  get courseIdx() { return courseIdx; }, get unlocked() { return unlocked; }, count: COURSES.length,""")
open(p, 'w', encoding='utf-8').write(s)
print('patched')
