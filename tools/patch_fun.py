import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a); assert c==n,(a[:60],c); s=s.replace(a,b)

rep("""  invincible: 1.4,
};""","""  invincible: 1.4,
  springSpeed: 1150,  // ぽよーん雲で跳ぶ強さ
  helpAfterFalls: 2,  // 同じ区間でこの回数落ちたら、たすけ雲が出る
  musicVolume: 0.5,   // 音楽の大きさ（0〜1）
  tempo: 116,         // 音楽の速さ
};""")
rep("""// # 地面  = ブロック  - 雲（下から通れる）  k 雲の地面  * お星さま
// e 敵（仮）  C チェックポイント  S スタート  G うさぎさん（ゴール）""",
"""// # 地面  = ブロック  B 星のブロック（下からたたく）  - 雲（下から通れる）  k 雲の地面
// J ぽよーん雲  * お星さま  O おおきなお星さま  e 敵（仮）  C チェックポイント  S スタート  G うさぎさん（ゴール）""")
rep("let grid, W, H, stars, enemies, checkpoints, startPos, goal, totalStars;",
    "let grid, W, H, stars, bigStars, enemies, checkpoints, startPos, goal, totalStars;\nconst bump = {};   // たたいた・踏んだタイルのゆれ")
rep("  grid = []; stars = []; enemies = []; checkpoints = [];",
    "  grid = []; stars = []; bigStars = []; enemies = []; checkpoints = [];")
rep("      if ('#=-k'.includes(ch)) t = ch;",
    "      if ('#=-kBJ'.includes(ch)) t = ch;\n      else if (ch === 'O') bigStars.push({ x: x * T + T / 2, y: y * T + T / 2, got: false, t: 0 });")
rep("  totalStars = stars.length;\n}",
    "  totalStars = stars.length + rows.join('').split('B').length - 1;\n}")
rep("  return t === '#' || t === '=' || t === 'k';",
    "  return t === '#' || t === '=' || t === 'k' || t === 'B' || t === 'b' || t === 'J';")

# 状態・音・記録
rep("""let state = 'title', camX = 0, got = 0, respawn, fade = 0, banner = 0, clearT = 0, time = 0;
const particles = [];""",
"""let state = 'title', camX = 0, got = 0, bigGot = 0, falls = 0, respawn, fade = 0, banner = 0, clearT = 0, time = 0;
let trailT = 0, fireT = 0, helpCloud = null;
const particles = [], popups = [];
const popup = (x, y, text, color = '#4A8CC2', size = 30) => popups.push({ x, y, text, color, size, life: 1.2 });

// ---------- 記録（この iPad の中だけに残る） ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const BEST_KEY = 'dango.best.1-1';
let best = store.get(BEST_KEY, null);
let muted = store.get('dango.muted', false);

// ---------- 音（効果音と音楽。ファイルは使わず、その場で鳴らす） ----------
let AC = null;
function audioUnlock() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
  if (AC.state === 'suspended') AC.resume();
}
function noteAt(freq, t, dur, type = 'sine', vol = 0.12, slide = 0) {
  if (muted || !AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + 0.05);
}
const tone = (f, dur, type, vol, slide, delay = 0) => AC && noteAt(f, AC.currentTime + delay, dur, type, vol, slide);
const semi = n => 523.25 * Math.pow(2, n / 12);   // ド(C5)からの半音
const SFX = {
  jump:   () => tone(420, 0.16, 'sine', 0.12, 1.9),
  star:   () => { tone(1318, 0.08, 'triangle', 0.09); tone(1760, 0.16, 'triangle', 0.09, 0, 0.06); },
  block:  () => tone(330, 0.08, 'square', 0.05, 0.7),
  stomp:  () => tone(520, 0.14, 'sine', 0.12, 0.4),
  spring: () => tone(200, 0.45, 'sine', 0.16, 4.5),
  hurt:   () => tone(300, 0.22, 'triangle', 0.08, 0.6),
  help:   () => [0, 4, 7].forEach((n, i) => tone(semi(n), 0.2, 'sine', 0.1, 0, i * 0.07)),
  big:    () => [0, 4, 7, 12, 16].forEach((n, i) => tone(semi(n + 7), 0.22, 'triangle', 0.09, 0, i * 0.07)),
  goal:   () => [[0, 0], [4, 1], [7, 2], [12, 3], [7, 4.5], [12, 5]].forEach(([n, i]) => tone(semi(n), i === 5 ? 0.8 : 0.22, 'triangle', 0.12, 0, i * 0.13)),
};
// 音楽：のんびり明るい8小節（オリジナル）。'-' はのばす・休み
const MUSIC = {
  lead: 'E G A G E D C D  E E G c B A G -  F A c A G E C E  D F E D C - - -  ' +
        'A G E G A c B A  G E D E G - - -  F G A F E G c E  D E F D C - - -',
  bass: 'C C G G C C G G  F F C C G G C C  A A E E C C G G  F F C C G G C C',
};
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, c: 12 };
const leadSteps = MUSIC.lead.trim().split(/\s+/), bassSteps = MUSIC.bass.trim().split(/\s+/);
let musicOn = false, musicT = 0, musicStep = 0;
function musicStart() { if (!AC) return; musicOn = true; musicStep = 0; musicT = AC.currentTime + 0.15; }
function musicStop() { musicOn = false; }
setInterval(() => {
  if (!musicOn || !AC || muted) return;
  const e = 30 / CONFIG.tempo, v = CONFIG.musicVolume;   // 8分音符の長さ
  if (musicT < AC.currentTime - 0.1) musicT = AC.currentTime + 0.05;
  while (musicT < AC.currentTime + 0.35) {
    const n = leadSteps[musicStep % leadSteps.length];
    if (n !== '-') {
      let len = 1; while (leadSteps[(musicStep + len) % leadSteps.length] === '-' && len < 4) len++;
      noteAt(semi(NOTE[n]), musicT, e * len * 0.95, 'triangle', 0.07 * v);
    }
    if (musicStep % 2 === 0) {
      const b = bassSteps[(musicStep / 2) % bassSteps.length];
      noteAt(semi(NOTE[b] - 24), musicT, e * 1.8, 'sine', 0.13 * v);
    }
    if (musicStep % 4 === 2) noteAt(2400, musicT, 0.04, 'square', 0.012 * v);   // 小さなリズム
    musicT += e; musicStep++;
  }
}, 50);
function toggleMute() {
  muted = !muted; store.set('dango.muted', muted);
  if (!muted && AC) musicT = AC.currentTime + 0.05;
}""")
rep("""  got = 0; camX = 0; banner = 2.6; clearT = 0;
  state = 'play';""","""  got = 0; bigGot = 0; falls = 0; camX = 0; banner = 2.6; clearT = 0; helpCloud = null;
  particles.length = 0; popups.length = 0;
  state = 'play';
  musicStart();""")
rep("  Object.assign(P, { x: respawn.x, y: respawn.y, vx: 0, vy: 0, inv: 0, squash: 0 });",
    "  Object.assign(P, { x: respawn.x, y: respawn.y, vx: 0, vy: 0, inv: 0, squash: 0, spring: false });")

# 入力：音のボタンと音の解禁
rep("addEventListener('keydown', e => { keys[e.code] = true;","addEventListener('keydown', e => { audioUnlock(); if (e.code === 'KeyM') toggleMute(); keys[e.code] = true;")
rep("""    jump:  { x: VW - 125, y: VH - 110, r: 80 },
  };""","""    jump:  { x: VW - 125, y: VH - 110, r: 80 },
    sound: { x: VW - 56,  y: 50,       r: 32 },
  };""")
rep("""  e.preventDefault();
  if (tapAnywhere()) return;
  const k = whichButton(toLogical(e));""","""  e.preventDefault();
  audioUnlock();
  const lp = toLogical(e), sb = buttons().sound;
  if (Math.hypot(lp.x - sb.x, lp.y - sb.y) < sb.r * 1.4) { toggleMute(); return; }
  if (tapAnywhere()) return;
  const k = whichButton(lp);""")

# moveY：どのタイルに当たったかを覚える
rep("""    const ty = Math.floor(o.y / T);
    for (let tx = l; tx <= r; tx++) if (solidAt(tx, ty)) { o.y = (ty + 1) * T; return 'up'; }""",
"""    const ty = Math.floor(o.y / T);
    let hitTX = -1, d = 1e9;
    for (let tx = l; tx <= r; tx++) {
      const dd = Math.abs((tx + 0.5) * T - (o.x + o.w / 2));
      if (solidAt(tx, ty) && dd < d) { d = dd; hitTX = tx; }
    }
    if (hitTX >= 0) { o.y = (ty + 1) * T; o.hitTX = hitTX; o.hitTY = ty; return 'up'; }""")

# 更新
rep("""  for (let i = particles.length - 1; i >= 0; i--) {""","""  for (const k in bump) { bump[k] -= dt; if (bump[k] <= 0) delete bump[k]; }
  for (const b of bigStars) b.t += dt;
  for (let i = popups.length - 1; i >= 0; i--) { popups[i].life -= dt; popups[i].y -= 40 * dt; if (popups[i].life <= 0) popups.splice(i, 1); }
  if (helpCloud) { helpCloud.t -= dt; if (helpCloud.t <= 0) helpCloud = null; }
  for (let i = particles.length - 1; i >= 0; i--) {""")
rep("""  if (state === 'clear') { clearT += dt; return; }""","""  if (state === 'clear') {
    clearT += dt; fireT -= dt;
    if (fireT <= 0 && goal) {   // お祝いの星の花火
      fireT = 0.35;
      const fx = goal.x + (Math.random() - 0.5) * VW * 0.8, fy = 7 * T + Math.random() * 3 * T;
      const cs = ['#FFD84D', '#FF9FB8', '#9FD8FF', '#B9E8A0', '#FFFFFF'], c = cs[Math.floor(Math.random() * cs.length)];
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; particles.push({ x: fx, y: fy, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 0.9, c }); }
      if (clearT < 6) tone(semi(12 + Math.floor(Math.random() * 8)), 0.12, 'triangle', 0.04);
    }
    return;
  }""")
rep("""    P.vy = -CONFIG.jumpSpeed; P.buffer = 0; P.coyote = 0; P.onGround = false; P.squash = -0.25;
  }
  if (!holdJump() && P.vy < 0) P.vy *= Math.pow(CONFIG.jumpCut, dt * 20);""",
"""    P.vy = -CONFIG.jumpSpeed; P.buffer = 0; P.coyote = 0; P.onGround = false; P.squash = -0.25;
    SFX.jump();
  }
  if (P.vy >= 0) P.spring = false;
  if (!holdJump() && P.vy < 0 && !P.spring) P.vy *= Math.pow(CONFIG.jumpCut, dt * 20);""")
rep("""  const wasGround = P.onGround;
  const hit = moveY(P, P.vy * dt);
  P.onGround = hit === 'down';
  if (hit) { if (hit === 'down' && !wasGround && P.vy > 500) P.squash = 0.25; P.vy = 0; }""",
"""  const wasGround = P.onGround, vyBefore = P.vy;
  const hit = moveY(P, P.vy * dt);
  P.onGround = hit === 'down';
  if (hit) { if (hit === 'down' && !wasGround && P.vy > 500) P.squash = 0.25; P.vy = 0; }
  // 星のブロックを下からたたく
  if (hit === 'up') {
    bump[P.hitTX + ',' + P.hitTY] = 0.18;
    if (grid[P.hitTY][P.hitTX] === 'B') {
      grid[P.hitTY][P.hitTX] = 'b'; got++; SFX.star();
      const sx = P.hitTX * T + T / 2, sy = P.hitTY * T;
      particles.push({ x: sx, y: sy - 10, vx: 0, vy: -520, life: 0.55, c: '#FFD84D', big: true });
      popup(sx, sy - 40, '+1', '#E0A800');
    } else SFX.block();
  }
  if (hit === 'down') {
    // 着地のけむり
    if (!wasGround && vyBefore > 450) for (let i = 0; i < 6; i++) particles.push({ x: P.x + P.w / 2 + (i - 2.5) * 6, y: P.y + P.h, vx: (i - 2.5) * 40, vy: -60, life: 0.35, c: '#FFFFFF', dot: true });
    // ぽよーん雲
    const fy = Math.floor((P.y + P.h) / T);
    for (let tx = Math.floor(P.x / T); tx <= Math.floor((P.x + P.w - 1) / T); tx++) {
      if (grid[fy] && grid[fy][tx] === 'J') {
        P.vy = -CONFIG.springSpeed; P.spring = true; P.onGround = false; P.squash = -0.35;
        bump[tx + ',' + fy] = 0.3; SFX.spring(); popup(tx * T + T / 2, fy * T - 30, 'ぽよーん', '#FF8FB0');
        break;
      }
    }
  }
  // 速く走るとキラキラ
  trailT -= dt;
  if (P.onGround && Math.abs(P.vx) > CONFIG.maxSpeed * 0.95 && trailT <= 0) {
    trailT = 0.07;
    particles.push({ x: P.x + P.w / 2 - Math.sign(P.vx) * 18, y: P.y + P.h - 8, vx: -Math.sign(P.vx) * 40, vy: -80, life: 0.4, c: '#BFE6FA' });
  }""")
rep("""  if (P.y > H * T + 80) { placePlayer(); fade = 1; }""",
"""  if (falls >= CONFIG.helpAfterFalls && P.vy > 0 && P.y + P.h > H * T + T * 0.7) {
    // たすけ雲が下から押し上げてくれる
    P.vy = -CONFIG.springSpeed; P.spring = true; P.squash = -0.3;
    helpCloud = { x: P.x + P.w / 2, y: P.y + P.h + 8, t: 0.8 };
    SFX.help(); popup(P.x + P.w / 2, P.y - 20, 'たすけ雲！', '#4A8CC2');
  } else if (P.y > H * T + 80) {
    falls++; placePlayer(); fade = 1;
    if (falls === CONFIG.helpAfterFalls) popup(P.x + P.w / 2, P.y - 30, 'つぎは 雲が たすけてくれるよ', '#4A8CC2', 26);
  }""")
rep("""      s.got = true; got++;""","""      s.got = true; got++; SFX.star();""")
rep("""  // チェックポイント
  for (const c of checkpoints) if (!c.on && cx > c.x) { c.on = true; respawn = { x: c.x + 4, y: c.y + 4 }; }""",
"""  // おおきなお星さま
  for (const b of bigStars) {
    if (!b.got && Math.abs(b.x - cx) < 46 && Math.abs(b.y - cy) < 46) {
      b.got = true; bigGot++; SFX.big();
      popup(b.x, b.y - 50, 'おおきなお星さま！', '#E0A800', 32);
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 0.8, c: i % 2 ? '#FFD84D' : '#FFFFFF' }); }
    }
  }
  // チェックポイント
  for (const c of checkpoints) if (!c.on && cx > c.x) {
    c.on = true; respawn = { x: c.x + 4, y: c.y + 4 }; falls = 0;
    tone(semi(7), 0.12, 'triangle', 0.08); tone(semi(12), 0.2, 'triangle', 0.08, 0, 0.1);
  }""")
rep("""        e.alive = false; P.vy = -CONFIG.stompBounce; P.squash = 0.3;""","""        e.alive = false; P.vy = -CONFIG.stompBounce; P.squash = 0.3; SFX.stomp();
        popup(e.x + e.w / 2, e.y - 10, 'ぽよん', '#8C7BB0', 26);""")
rep("""        P.vx = (cx < e.x + e.w / 2 ? -1 : 1) * CONFIG.hurtKnock; P.vy = -420;""","""        P.vx = (cx < e.x + e.w / 2 ? -1 : 1) * CONFIG.hurtKnock; P.vy = -420; SFX.hurt();""")
rep("""  if (goal && cx > goal.x - 10) { state = 'clear'; clearT = 0; P.vx = 0; }""",
"""  if (goal && cx > goal.x - 10) {
    state = 'clear'; clearT = 0; fireT = 0.6; P.vx = 0;
    musicStop(); SFX.goal();
    best = { stars: Math.max(got, best ? best.stars : 0), big: Math.max(bigGot, best ? best.big : 0), total: totalStars };
    store.set(BEST_KEY, best);
  }""")

# 絵：タイル
rep("""    } else if (t === '-' || t === 'k') {""","""    } else if (t === 'B' || t === 'b') {
      const by = bump[x + ',' + y] ? -8 : 0;
      ctx.fillStyle = t === 'B' ? '#FFD45E' : '#EFE3C8'; roundRect(px + 2, py + 2 + by, T - 4, T - 4, 10); ctx.fill();
      ctx.strokeStyle = t === 'B' ? '#E8A93A' : '#D8C9A6'; ctx.lineWidth = 3; ctx.stroke();
      if (t === 'B') {
        const s2 = 1 + Math.sin(time * 5 + x) * 0.12;
        ctx.fillStyle = '#FFFFFF'; star(px + T / 2, py + T / 2 + by, 13 * s2, 6 * s2, Math.sin(time * 2) * 0.2);
      }
    } else if (t === 'J') {
      const sq = bump[x + ',' + y] ? 0.55 : 1 + Math.sin(time * 4 + x) * 0.04;
      ctx.save(); ctx.translate(px + T / 2, py + T); ctx.scale(1 + (1 - sq) * 0.6, sq);
      ctx.fillStyle = '#FFC4D8';
      ctx.beginPath(); ctx.arc(0, -24, 20, 0, 7); ctx.arc(-16, -16, 15, 0, 7); ctx.arc(16, -16, 15, 0, 7); ctx.rect(-26, -14, 52, 14); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-6, -32, 8, 4, 0, 0, 7); ctx.fill();
      ctx.restore();
    } else if (t === '-' || t === 'k') {""")
rep("""function drawStars() {
  const oy = OY();""","""function drawStars() {
  const oy = OY();
  for (const b of bigStars) {
    if (b.got) continue;
    const x = b.x - camX, y = b.y + oy + Math.sin(b.t * 2.2) * 6;
    if (x < -60 || x > VW + 60) continue;
    const pulse = 1 + Math.sin(b.t * 4) * 0.08;
    ctx.fillStyle = 'rgba(255,240,170,.45)'; ctx.beginPath(); ctx.arc(x, y, 40 * pulse, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,200,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 34 * pulse, 0, 7); ctx.stroke();
    ctx.fillStyle = '#FFD84D'; star(x, y, 30, 14, Math.sin(b.t) * 0.2);
    ctx.strokeStyle = '#F2A626'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; star(x - 8, y - 8, 6, 3);
  }""")
rep("""function text(s, x, y, size, color = '#3a3a4a', align = 'center') {""","""function drawSoundButton() {
  const o = buttons().sound;
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill();
  ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a3a4a'; ctx.fillText(muted ? '🔇' : '🔊', o.x, o.y + 2);
}
function bigSlots(x, y, r) {
  for (let i = 0; i < bigStars.length; i++) {
    const sx = x + (i - (bigStars.length - 1) / 2) * r * 2.4;
    ctx.fillStyle = i < bigGot ? '#FFD84D' : 'rgba(255,255,255,.75)';
    star(sx, y, r, r * 0.47);
    ctx.strokeStyle = i < bigGot ? '#F2A626' : '#C9CCD8'; ctx.lineWidth = 2.5; ctx.stroke();
  }
}
function text(s, x, y, size, color = '#3a3a4a', align = 'center') {""")
rep("""    if (Math.sin(time * 4) > -0.3) text('タップして はじめる', VW / 2, VH * 0.8, 40);
    return;""","""    if (best) text(`さいこう記録　★ ${best.stars} / ${best.total}　おおきなお星さま ${best.big} / 3`, VW / 2, VH * 0.69, 26, '#6B7A8F');
    if (Math.sin(time * 4) > -0.3) text('タップして はじめる', VW / 2, VH * 0.82, 40);
    drawSoundButton();
    return;""")
rep("""  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.c; star(p.x - camX, p.y + oy, 7, 3); }""",
"""  if (helpCloud) { ctx.globalAlpha = Math.min(1, helpCloud.t * 2); ctx.fillStyle = '#FFFFFF'; puff(helpCloud.x - camX - 44, helpCloud.y + oy, 0.55); ctx.globalAlpha = 1; }
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.c;
    if (p.dot) { ctx.beginPath(); ctx.arc(p.x - camX, p.y + oy, 6, 0, 7); ctx.fill(); }
    else if (p.big) { star(p.x - camX, p.y + oy, 18, 8); ctx.strokeStyle = '#F2B632'; ctx.lineWidth = 2.5; ctx.stroke(); }
    else star(p.x - camX, p.y + oy, 7, 3);
  }""")
rep("""  text(`${got} / ${totalStars}`, 150, 49, 34, '#3a3a4a');""","""  text(`${got} / ${totalStars}`, 150, 49, 34, '#3a3a4a');
  bigSlots(76, 104, 15);
  for (const p of popups) { ctx.globalAlpha = Math.min(1, p.life * 2); text(p.text, p.x - camX, p.y + oy, p.size, p.color); }
  ctx.globalAlpha = 1;
  drawSoundButton();""")
rep("""    text('ゴール！', VW / 2, VH * 0.17, 100, '#FF8FB0');
    text(`お星さま ${got} / ${totalStars}`, VW / 2, VH * 0.33, 48);
    if (got === totalStars) text('ぜんぶ あつめたね！', VW / 2, VH * 0.43, 38, '#E0A800');
    if (clearT > 1.2) text('タップで もういちど', VW / 2, VH * 0.9, 36);""",
"""    text('ゴール！', VW / 2, VH * 0.13, 92, '#FF8FB0');
    text(`お星さま ${got} / ${totalStars}`, VW / 2, VH * 0.27, 44);
    bigSlots(VW / 2, VH * 0.37, 22);
    const msg = got === totalStars && bigGot === bigStars.length ? 'ぜんぶ あつめたね！ すごい！'
      : bigGot < bigStars.length ? 'おおきなお星さまが まだ かくれているよ' : 'お星さま ぜんぶ あつめられるかな？';
    text(msg, VW / 2, VH * 0.8, 30, '#E0A800');
    if (clearT > 1.2) text('タップで もういちど', VW / 2, VH * 0.92, 34);
    drawSoundButton();""")
rep("""  get grid() { return grid; }, get enemies() { return enemies; }, get goal() { return goal; }, start: startGame, T };""",
"""  get grid() { return grid; }, get enemies() { return enemies; }, get goal() { return goal; }, start: startGame, T,
  get bigGot() { return bigGot; }, get bigStars() { return bigStars; }, get muted() { return muted; },
  get falls() { return falls; }, set falls(v) { falls = v; }, get musicOn() { return musicOn; } };""")
open(p, 'w', encoding='utf-8').write(s)
print('patched')
