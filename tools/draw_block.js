// 決まった乱数（同じ場所はいつも同じ模様になる）
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const colorCache = {};
const C = (c, k) => { const key = c + k; return colorCache[key] || (colorCache[key] = k >= 0 ? mix(c, '#FFFFFF', k) : mix(c, '#1E2440', -k)); };   // 明るく(+)・暗く(-)
const goalK = () => Math.max(0, Math.min(1, (camX / (W * T - VW) - 0.75) * 4));   // ゴールが近いと雲の世界の色へ
const tileAt = (x, y) => (x < 0 || x >= W) ? '#' : y < 0 ? '.' : grid[Math.min(y, H - 1)][x];

// 横に続く丘や山のかたち（奥ほどゆっくり動く）
function ridge(par, base, amp, f1, f2, sharp) {
  ctx.beginPath(); ctx.moveTo(-10, VH);
  for (let sx = -10; sx <= VW + 30; sx += 24) {
    const wx = sx + camX * par;
    let h = Math.sin(wx * f1) * 0.6 + Math.sin(wx * f2 + 1.7) * 0.4;
    if (sharp) h = 1 - Math.abs(Math.sin(wx * f1)) * 1.6 + Math.sin(wx * f2) * 0.25;
    ctx.lineTo(sx, base - amp * (0.5 + 0.5 * h));
  }
  ctx.lineTo(VW + 30, VH); ctx.closePath();
}
function cloudPuff(x, y, s, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.night ? '#8A86C0' : '#C9DDF0'; puff(x + 4 * s, y + 8 * s, s);   // 雲の下の影
  ctx.fillStyle = '#FFFFFF'; puff(x, y, s);
  ctx.globalAlpha = 1;
}
function drawSky() {
  const k = goalK();
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, mix(theme.sky[0], '#F8C9E0', k));
  g.addColorStop(1, mix(theme.sky[1], '#FFF1E6', k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // お日さま・お月さまの光
  const sunX = VW * 0.8, sunY = 96;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 300);
  glow.addColorStop(0, theme.night ? 'rgba(255,248,200,.45)' : 'rgba(255,255,235,.75)');
  glow.addColorStop(1, 'rgba(255,255,235,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, VH);
  if (theme.night) {   // 夜空のきらきらと お月さま
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 137 - camX * 0.04) % VW + VW) % VW, sy = (i * 89) % (VH * 0.62);
      ctx.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(time * 1.5 + i))) * (1 - k);
      ctx.fillStyle = '#FFF6C8'; star(sx, sy, 2.5 + (i % 3) * 1.2, 1.1);
    }
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#FFF6D0'; ctx.beginPath(); ctx.arc(sunX, sunY, 42, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(230,220,170,.6)';
    for (const [dx, dy, r] of [[-12, -8, 8], [10, 10, 6], [14, -14, 4]]) { ctx.beginPath(); ctx.arc(sunX + dx, sunY + dy, r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = `rgba(255,252,225,${1 - k})`; ctx.beginPath(); ctx.arc(sunX, sunY, 34, 0, 7); ctx.fill();
  }
  // 遠くの雲
  for (let i = 0; i < 8; i++) {
    const x = ((i * 430 - camX * 0.08) % (VW + 500) + VW + 500) % (VW + 500) - 250;
    cloudPuff(x, 60 + (i * 71) % 120, 0.6 + (i % 2) * 0.2, theme.night ? 0.25 + 0.5 * k : 0.6);
  }
  // いちばん遠くの山
  const far = mix(mix(theme.sky[1], theme.hill, 0.45), '#F6DCEB', k);
  ctx.fillStyle = far;
  ridge(0.12, VH - 250, theme.snow ? 210 : 130, 0.0042, 0.011, theme.snow);
  ctx.fill();
  if (theme.snow && k < 1) {   // 山のてっぺんの雪
    ctx.save(); ridge(0.12, VH - 250, 210, 0.0042, 0.011, true); ctx.clip();
    ctx.fillStyle = '#FFFFFF'; ridge(0.12, VH - 345, 70, 0.0042, 0.03, false); ctx.fill();
    ctx.restore();
  }
  // 近くの雲
  for (let i = 0; i < 7; i++) {
    const x = ((i * 520 - camX * 0.2) % (VW + 600) + VW + 600) % (VW + 600) - 300;
    cloudPuff(x, 110 + (i * 97) % 170, 1 + (i % 3) * 0.25, theme.night ? 0.3 + 0.6 * k : 0.92);
  }
  if (theme.sea) {   // うみべ：遠くの島と海
    ctx.fillStyle = mix('#9BC7A0', '#F3D6EA', k);
    ctx.beginPath(); ctx.ellipse(((900 - camX * 0.15) % (VW + 600) + VW + 600) % (VW + 600) - 300, VH - 300, 160, 40, 0, Math.PI, 0); ctx.fill();
    const sea = ctx.createLinearGradient(0, VH - 300, 0, VH);
    sea.addColorStop(0, mix('#9FE3F2', '#F8D9E8', k)); sea.addColorStop(1, mix('#3FB2D6', '#F3C9DD', k));
    ctx.fillStyle = sea; ctx.fillRect(0, VH - 300, VW, 300);
    ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k)})`; ctx.fillRect(0, VH - 301, VW, 3);
    for (let i = 0; i < 22; i++) {
      const x = ((i * 117 - camX * 0.3 + Math.sin(time * 1.3 + i) * 12) % (VW + 200) + VW + 200) % (VW + 200) - 100;
      const yy = VH - 285 + (i % 6) * 20, w = 26 + (i % 3) * 14;
      ctx.globalAlpha = (0.35 + 0.4 * Math.abs(Math.sin(time * 2 + i))) * (1 - k);
      ctx.fillStyle = '#FFFFFF'; roundRect(x, yy, w, 3, 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // 中くらいの丘
    const mid = mix(theme.hill, '#F3D6EA', k);
    const hg = ctx.createLinearGradient(0, VH - 330, 0, VH);
    hg.addColorStop(0, C(theme.hill, 0.12)); hg.addColorStop(1, theme.hill);
    ctx.fillStyle = k > 0 ? mid : hg;
    ridge(0.3, VH - 190, 120, 0.006, 0.017, false); ctx.fill();
    if (k < 1) {   // 丘の上の木・しげみ
      for (let i = -1; i < VW / 90 + 2; i++) {
        const wx = Math.floor((camX * 0.3) / 90) * 90 + i * 90, sx = wx - camX * 0.3;
        const h = Math.sin(wx * 0.006) * 0.6 + Math.sin(wx * 0.017 + 1.7) * 0.4, top = VH - 190 - 120 * (0.5 + 0.5 * h);
        const r = hash(wx, 7);
        if (theme.trees && r < 0.8) {
          ctx.fillStyle = C(theme.hill, -0.25); ctx.fillRect(sx - 4, top - 40, 8, 44);
          ctx.fillStyle = C(theme.hill, -0.12 - r * 0.1);
          ctx.beginPath(); ctx.arc(sx, top - 60, 30 + r * 10, 0, 7); ctx.arc(sx - 20, top - 40, 20, 0, 7); ctx.arc(sx + 20, top - 40, 20, 0, 7); ctx.fill();
          ctx.fillStyle = C(theme.hill, 0.1); ctx.beginPath(); ctx.arc(sx - 10, top - 70, 10, 0, 7); ctx.fill();
        } else if (theme.snow && r < 0.6) {   // もみの木
          ctx.fillStyle = '#7FA9A0';
          for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(sx, top - 70 + j * 16); ctx.lineTo(sx - 18 - j * 4, top - 40 + j * 16); ctx.lineTo(sx + 18 + j * 4, top - 40 + j * 16); ctx.fill(); }
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(sx, top - 70); ctx.lineTo(sx - 8, top - 58); ctx.lineTo(sx + 8, top - 58); ctx.fill();
        } else if (!theme.snow && r < 0.5) {   // しげみ
          ctx.fillStyle = C(theme.hill, -0.1);
          ctx.beginPath(); ctx.arc(sx, top + 4, 16, Math.PI, 0); ctx.arc(sx + 18, top + 6, 12, Math.PI, 0); ctx.fill();
        }
      }
    }
    // 近くの丘
    ctx.fillStyle = mix(C(theme.hill, -0.1), '#EFCBE0', k);
    ridge(0.5, VH - 150, 70, 0.009, 0.023, false); ctx.fill();
  }
  if (theme.trees && k < 1) {   // もり：木もれ日
    ctx.fillStyle = `rgba(255,255,220,${0.12 * (1 - k)})`;
    for (let i = 0; i < 4; i++) {
      const x = ((i * 300 - camX * 0.1) % (VW + 300) + VW + 300) % (VW + 300) - 150;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 220, VH); ctx.lineTo(x + 120, VH); ctx.fill();
    }
  }
  if (theme.night && k < 1) {   // よぞら：ほたる
    for (let i = 0; i < 14; i++) {
      const fx = ((i * 211 + Math.sin(time * 0.7 + i) * 40 - camX * 0.4) % VW + VW) % VW, fy = VH - 240 + Math.sin(time * 0.9 + i * 2) * 60;
      ctx.globalAlpha = (0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i))) * (1 - k);
      ctx.fillStyle = 'rgba(255,240,150,.35)'; ctx.beginPath(); ctx.arc(fx, fy, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFF4B0'; ctx.beginPath(); ctx.arc(fx, fy, 3, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (theme.snow) {   // ゆきやま：ふる雪
    ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 97 + Math.sin(time + i) * 30 - camX * 0.3) % VW + VW) % VW, sy = ((i * 53 + time * (30 + i % 5 * 8)) % VH);
      ctx.beginPath(); ctx.arc(sx, sy, 2.5 + (i % 3), 0, 7); ctx.fill();
    }
  }
}
function puff(x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 34 * s, 0, 7); ctx.arc(x + 40 * s, y - 14 * s, 42 * s, 0, 7);
  ctx.arc(x + 86 * s, y, 32 * s, 0, 7); ctx.rect(x, y, 86 * s, 30 * s);
  ctx.fill();
}
function mix(a, b, k) {
  const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}
// 地面の飾り（景色ごと。遊びのじゃまにならない小ささ）
function groundDeco(x, px, py) {
  const r = hash(x, 3), r2 = hash(x, 5);
  const bx = px + 8 + r2 * 30;
  if (theme.snow) {
    if (r < 0.3) { ctx.fillStyle = 'rgba(255,255,255,.9)'; star(bx, py - 6, 3, 1.2, time); }
    return;
  }
  if (r < 0.55 && !theme.sea) {   // 草
    ctx.strokeStyle = C(theme.top, -0.18); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const d of [-4, 0, 4]) { ctx.moveTo(bx + d, py - 3); ctx.lineTo(bx + d * 1.6, py - 10 - Math.abs(d)); }
    ctx.stroke();
  }
  if (r > 0.78) {
    if (theme.trees) {   // きのこ
      ctx.fillStyle = '#F4EAD8'; ctx.fillRect(bx - 2, py - 9, 4, 8);
      ctx.fillStyle = '#E86F6F'; ctx.beginPath(); ctx.arc(bx, py - 9, 7, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(bx - 3, py - 12, 1.6, 0, 7); ctx.arc(bx + 3, py - 11, 1.3, 0, 7); ctx.fill();
    } else if (theme.sea) {   // 貝がら
      ctx.fillStyle = r > 0.9 ? '#F7B6C8' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(bx, py - 2, 6, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(200,140,150,.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (const d of [-3, 0, 3]) { ctx.moveTo(bx, py - 2); ctx.lineTo(bx + d, py - 7); } ctx.stroke();
    } else if (theme.night) {   // 光る石
      ctx.fillStyle = 'rgba(255,230,160,.35)'; ctx.beginPath(); ctx.arc(bx, py - 5, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFE9A8'; ctx.beginPath(); ctx.moveTo(bx, py - 11); ctx.lineTo(bx + 4, py - 4); ctx.lineTo(bx, py); ctx.lineTo(bx - 4, py - 4); ctx.fill();
    } else {   // 花
      const pc = ['#FFB3C7', '#FFFFFF', '#FFE27A', '#C9B6FF'][Math.floor(r2 * 4)];
      ctx.strokeStyle = C(theme.top, -0.2); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx, py - 2); ctx.lineTo(bx, py - 10); ctx.stroke();
      ctx.fillStyle = pc;
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 3.4, py - 12 + Math.sin(a) * 3.4, 2.6, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(bx, py - 12, 2, 0, 7); ctx.fill();
    }
  }
}
function drawTiles() {
  const x0 = Math.max(0, Math.floor(camX / T) - 1), x1 = Math.min(W - 1, Math.ceil((camX + VW) / T) + 1);
  const oy = OY();
  // 1回目：地面のからだ　2回目：草のふちと飾り（となりのマスに少しはみ出すので後から描く）
  for (let y = 0; y < H + 2; y++) for (let x = x0; x <= x1; x++) {
    const t = tileAt(x, y); if (t !== '#') continue;
    const px = x * T - camX, py = y * T + oy;
    let d = 0; while (d < 4 && tileAt(x, y - d - 1) === '#') d++;
    ctx.fillStyle = C(theme.ground, -0.055 * d); ctx.fillRect(px, py, T + 0.6, T + 0.6);
    const r = hash(x, y);
    if (r < 0.5) {   // 小石
      const sx = px + 8 + hash(x, y, 1) * 30, sy = py + 10 + hash(x, y, 2) * 28, rr = 3 + r * 6;
      ctx.fillStyle = C(theme.ground, -0.12 - 0.055 * d); ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.75, 0, 0, 7); ctx.fill();
      ctx.fillStyle = C(theme.ground, 0.18); ctx.beginPath(); ctx.ellipse(sx - rr * 0.3, sy - rr * 0.3, rr * 0.35, rr * 0.25, 0, 0, 7); ctx.fill();
    }
    if (tileAt(x - 1, y) !== '#') { ctx.fillStyle = C(theme.ground, 0.16); ctx.fillRect(px, py, 4, T + 0.6); }
    if (tileAt(x + 1, y) !== '#') { ctx.fillStyle = C(theme.ground, -0.18); ctx.fillRect(px + T - 5, py, 5, T + 0.6); }
  }
  for (let y = 0; y < H + 2; y++) for (let x = x0; x <= x1; x++) {
    const t = tileAt(x, y); if (t === '.' || (y >= H && t === '-')) continue;
    const px = x * T - camX, py = y * T + oy;
    const above = tileAt(x, y - 1);
    if (t === '#') {
      if (above === '#') continue;
      const lOpen = tileAt(x - 1, y) !== '#' || tileAt(x - 1, y - 1) === '#', rOpen = tileAt(x + 1, y) !== '#' || tileAt(x + 1, y - 1) === '#';
      const l = px - (lOpen ? 3 : 0), w = T + (lOpen ? 3 : 0) + (rOpen ? 3 : 0);
      // 草（雪・砂）のふち：下が波形
      ctx.fillStyle = C(theme.top, -0.16);
      ctx.beginPath(); for (let i = 0; i < 4; i++) ctx.arc(px + 6 + i * 12, py + 11, 7, 0, Math.PI); ctx.fill();
      ctx.fillStyle = theme.top;
      roundRect(l, py - 6, w, 16, [lOpen ? 8 : 0, rOpen ? 8 : 0, 0, 0]); ctx.fill();
      ctx.beginPath(); for (let i = 0; i < 4; i++) ctx.arc(px + 6 + i * 12, py + 9, 6.5, 0, Math.PI); ctx.fill();
      ctx.fillStyle = theme.top2; roundRect(l + 2, py - 5, w - 4, 4, 2); ctx.fill();
      groundDeco(x, px, py - 6);
    } else if (t === '=' || t === 'b') {
      const by = bump[x + ',' + y] ? -8 : 0, base = t === '=' ? '#FFE3A0' : '#EDE2CC';
      ctx.fillStyle = C(base, -0.22); roundRect(px + 2, py + 4 + by, T - 4, T - 4, 10); ctx.fill();   // 下の影
      ctx.fillStyle = base; roundRect(px + 2, py + 1 + by, T - 4, T - 6, 10); ctx.fill();
      ctx.fillStyle = C(base, 0.45); roundRect(px + 6, py + 4 + by, T - 12, 5, 3); ctx.fill();          // 上の光
      ctx.fillStyle = C(base, -0.18);
      for (const [dx, dy] of [[15, 17], [33, 17], [15, 33], [33, 33]]) { ctx.beginPath(); ctx.arc(px + dx, py + dy + by, 2.8, 0, 7); ctx.fill(); }
    } else if (t === 'B') {
      const by = bump[x + ',' + y] ? -8 : 0;
      ctx.fillStyle = 'rgba(255,220,100,.35)'; ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2 + by, 32 + Math.sin(time * 4 + x) * 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#D9952B'; roundRect(px + 2, py + 4 + by, T - 4, T - 4, 10); ctx.fill();
      const gg = ctx.createLinearGradient(0, py + by, 0, py + T + by);
      gg.addColorStop(0, '#FFE995'); gg.addColorStop(1, '#F6B83A');
      ctx.fillStyle = gg; roundRect(px + 2, py + 1 + by, T - 4, T - 6, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; roundRect(px + 6, py + 4 + by, T - 12, 5, 3); ctx.fill();
      const s2 = 1 + Math.sin(time * 5 + x) * 0.12;
      ctx.fillStyle = '#FFFFFF'; star(px + T / 2, py + T / 2 + by, 13 * s2, 6 * s2, Math.sin(time * 2) * 0.2);
      const a = time * 3 + x;   // まわりを回るきらきら
      ctx.fillStyle = '#FFFFFF'; star(px + T / 2 + Math.cos(a) * 28, py + T / 2 + by + Math.sin(a) * 28, 4, 1.6);
    } else if (t === 'J') {
      const sq = bump[x + ',' + y] ? 0.55 : 1 + Math.sin(time * 4 + x) * 0.04;
      ctx.save(); ctx.translate(px + T / 2, py + T); ctx.scale(1 + (1 - sq) * 0.6, sq);
      ctx.fillStyle = 'rgba(200,90,130,.25)'; ctx.beginPath(); ctx.ellipse(0, -2, 28, 6, 0, 0, 7); ctx.fill();
      const pg = ctx.createLinearGradient(0, -46, 0, 0);
      pg.addColorStop(0, '#FFE0EA'); pg.addColorStop(1, '#FF9EC0');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(0, -24, 20, 0, 7); ctx.arc(-16, -16, 15, 0, 7); ctx.arc(16, -16, 15, 0, 7); ctx.rect(-26, -14, 52, 14); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-7, -34, 8, 4, -0.3, 0, 7); ctx.fill();
      ctx.restore();
    } else if (t === '-') {
      ctx.fillStyle = theme.night ? 'rgba(150,140,200,.8)' : 'rgba(176,205,232,.9)';
      ctx.beginPath(); ctx.arc(px + T / 2, py + 21, 20, 0, 7); ctx.arc(px + 8, py + 27, 14, 0, 7); ctx.arc(px + T - 8, py + 27, 14, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(px + T / 2, py + 16, 20, 0, 7); ctx.arc(px + 8, py + 22, 14, 0, 7); ctx.arc(px + T - 8, py + 22, 14, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(px + T / 2 - 6, py + 6, 8, 3, 0, 0, 7); ctx.fill();
    } else if (t === 'k') {
      const kg = ctx.createLinearGradient(0, py, 0, py + T);
      kg.addColorStop(0, '#FFFFFF'); kg.addColorStop(1, above === 'k' ? '#F6EEF8' : '#FBF6FC');
      ctx.fillStyle = kg; ctx.fillRect(px, py + (above === 'k' ? 0 : 10), T + 0.6, T + 0.6);
      if (above !== 'k') {
        ctx.fillStyle = '#F0E2F0'; ctx.beginPath(); ctx.arc(px + T / 2, py + 17, 22, 0, 7); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(px + T / 2, py + 14, 22, 0, 7); ctx.fill();
        if (hash(x, 9) < 0.3) { ctx.fillStyle = `rgba(255,214,120,${0.5 + 0.5 * Math.sin(time * 3 + x)})`; star(px + 14, py + 2, 4, 1.6); }
      }
    }
  }
}
function star(x, y, r, inner, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? inner : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
function goldStar(x, y, r, inner, rot, line) {
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#FFF3A6'); g.addColorStop(0.55, '#FFD447'); g.addColorStop(1, '#F7AE2B');
  ctx.fillStyle = g; star(x, y, r, inner, rot);
  ctx.strokeStyle = '#E39A1C'; ctx.lineWidth = line; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.18, r * 0.1, -0.6, 0, 7); ctx.fill();
}
function drawStars() {
  const oy = OY();
  for (const b of bigStars) {
    if (b.got) continue;
    const x = b.x - camX, y = b.y + oy + Math.sin(b.t * 2.2) * 6;
    if (x < -60 || x > VW + 60) continue;
    const pulse = 1 + Math.sin(b.t * 4) * 0.08;
    const gl = ctx.createRadialGradient(x, y, 6, x, y, 52 * pulse);
    gl.addColorStop(0, 'rgba(255,245,180,.9)'); gl.addColorStop(1, 'rgba(255,245,180,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 52 * pulse, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,160,195,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 36 * pulse, 0, 7); ctx.stroke();
    goldStar(x, y, 30, 14, Math.sin(b.t) * 0.2, 3);
    for (let i = 0; i < 3; i++) { const a = b.t * 2 + i * 2.1; ctx.fillStyle = '#FFFFFF'; star(x + Math.cos(a) * 42, y + Math.sin(a) * 42, 4, 1.6); }
  }
  for (const s of stars) {
    if (s.got) continue;
    const x = s.x - camX, y = s.y + oy + Math.sin(s.t * 3) * 4;
    if (x < -40 || x > VW + 40) continue;
    ctx.fillStyle = 'rgba(255,232,130,.32)'; ctx.beginPath(); ctx.arc(x, y, 23, 0, 7); ctx.fill();
    goldStar(x, y, 17, 8, Math.sin(s.t * 2) * 0.15, 2.2);
  }
}
// 足もとの影（下の足場までの近さで大きさが変わる）
function groundShadow(cx, footY, w) {
  const tx = Math.floor((cx + camX) / T);
  let ty = Math.floor((footY - OY() + 2) / T);
  for (let n = 0; n < 8 && ty < H; n++, ty++) {
    const t = tileAt(tx, ty);
    if ('#=kBbJ-'.includes(t) && t !== '.') {
      const sy = ty * T + OY() + (t === '-' ? 4 : t === 'J' ? 6 : 0), dist = Math.max(0, sy - footY);
      const k = Math.max(0.25, 1 - dist / 260);
      ctx.fillStyle = `rgba(40,50,90,${0.2 * k})`; ctx.beginPath(); ctx.ellipse(cx, sy, w * k, w * 0.22 * k, 0, 0, 7); ctx.fill();
      return;
    }
  }
}
// だんごくん（決定版：うすい水色・ふちふわふわ・目の間に ω）
function drawDango(x, y, r, face, squash, blink) {
  ctx.save();
  ctx.translate(x, y + r * squash * 0.5);
  ctx.scale(1 + squash * 0.5, 1 - squash * 0.5);
  ctx.fillStyle = '#C6E6F9'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#9CCDEB';
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, r * 0.05, 0, 7); ctx.fill(); }
  const bg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 0.95);
  bg.addColorStop(0, '#F4FBFF'); bg.addColorStop(0.55, '#D8F0FD'); bg.addColorStop(1, '#BFE1F6');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0.25, 1.25); ctx.stroke();   // 下の照り返し
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.5, r * 0.26, r * 0.13, -0.35, 0, 7); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-r * 0.08, -r * 0.6, r * 0.05, 0, 7); ctx.fill();
  const fx = face * r * 0.12, ey = -r * 0.06;
  ctx.strokeStyle = '#2D3550'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.075;
  const eh = blink ? 0.02 : r * 0.14;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx + s * r * 0.38, ey - eh); ctx.lineTo(fx + s * r * 0.38, ey + eh); ctx.stroke(); }
  ctx.lineWidth = r * 0.05;
  const m = r * 0.15, my = ey + r * 0.02;
  ctx.beginPath(); ctx.moveTo(fx - m, my); ctx.quadraticCurveTo(fx - m / 2, my + m * 0.9, fx, my + m * 0.15);
  ctx.quadraticCurveTo(fx + m / 2, my + m * 0.9, fx + m, my); ctx.stroke();
  ctx.fillStyle = 'rgba(255,190,208,.8)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + s * r * 0.55, ey + r * 0.26, r * 0.15, r * 0.09, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
// うさぎさん（決定版：白・目は藍色がかった黒・手は体の横）
function drawRabbit(x, y, s, hop) {
  ctx.save(); ctx.translate(x, y - hop); ctx.scale(s, s);
  const O = '#C9CCD8', Pk = '#FFD3DE';
  ctx.lineWidth = 4; ctx.strokeStyle = O;
  const el = (cx, cy, rx, ry, fill, rot = 0, stroke = true) => {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, 7);
    if (fill === 'fur') {   // ふわっとした白（右下が少しかげる）
      const g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, 1, cx, cy, Math.max(rx, ry) * 1.05);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#FBFBFE'); g.addColorStop(1, '#E6E8F1');
      ctx.fillStyle = g;
    } else ctx.fillStyle = fill;
    ctx.fill(); if (stroke) ctx.stroke();
  };
  el(-18, -146, 11, 34, 'fur'); el(-18, -144, 5, 24, Pk, 0, false);
  el(18, -146, 11, 34, 'fur'); el(18, -144, 5, 24, Pk, 0, false);
  el(-46, -24, 9, 20, 'fur', -0.21); el(46, -24, 9, 20, 'fur', 0.21);
  el(0, -28, 44, 42, 'fur');
  el(-22, 12, 16, 9, 'fur'); el(22, 12, 16, 9, 'fur');
  el(0, -90, 44, 44, 'fur');
  for (const sx of [-17, 17]) { el(sx, -92, 7, 7, '#262B52', 0, false); el(sx - 2, -94.5, 2.4, 2.4, '#fff', 0, false); el(sx + 2, -89, 1.1, 1.1, '#fff', 0, false); }
  el(-31, -78, 10, 6, 'rgba(255,190,208,.8)', 0, false); el(31, -78, 10, 6, 'rgba(255,190,208,.8)', 0, false);
  ctx.strokeStyle = '#5A5F7A'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-6, -80); ctx.quadraticCurveTo(-3, -74, 0, -79); ctx.quadraticCurveTo(3, -74, 6, -80); ctx.stroke();
  ctx.restore();
}
// 敵（仮の絵。あとで わたあめちゃんと決める）
function drawEnemy(e, oy) {
  const x = e.x - camX + e.w / 2, y = e.y + oy + e.h;
  if (x < -60 || x > VW + 60) return;
  if (e.alive) groundShadow(x, y, e.w * 0.5);
  ctx.save(); ctx.translate(x, y);
  if (!e.alive) { if (e.squish > 0.4) { ctx.restore(); return; } ctx.scale(1.3, 0.3); }
  const b = Math.sin(time * 8 + e.x) * 2;
  const eg = ctx.createRadialGradient(-6, -e.h * 0.7, 2, 0, -e.h / 2, e.w * 0.6);
  eg.addColorStop(0, '#D9CCEE'); eg.addColorStop(1, '#A390C8');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(0, -e.h / 2 + b, e.w / 2, e.h / 2 - b, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-7, -e.h * 0.78 + b, 6, 3, -0.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#3B3355';
  const d = e.vx > 0 ? 4 : -4;
  ctx.beginPath(); ctx.arc(d - 8, -e.h / 2 - 2, 3.5, 0, 7); ctx.arc(d + 8, -e.h / 2 - 2, 3.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('かり', 0, -6);
  ctx.restore();
}
function drawFlag(c, oy) {
  const x = c.x - camX + T / 2, y = c.y + oy + T;
  if (x < -80 || x > VW + 80) return;
  ctx.fillStyle = 'rgba(40,50,90,.18)'; ctx.beginPath(); ctx.ellipse(x, y, 12, 3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#A89C92'; ctx.fillRect(x - 2.5, y - 96, 5, 96);
  ctx.fillStyle = '#FFE38A'; ctx.beginPath(); ctx.arc(x, y - 98, 5, 0, 7); ctx.fill();
  const wv = Math.sin(time * 4 + c.x) * 3;
  ctx.fillStyle = c.on ? '#FF9FB8' : '#E3E3E8';
  ctx.beginPath(); ctx.moveTo(x + 2, y - 94); ctx.quadraticCurveTo(x + 24, y - 92 + wv, x + 46, y - 80 + wv); ctx.quadraticCurveTo(x + 24, y - 72 - wv, x + 2, y - 66); ctx.fill();
  if (c.on) { ctx.fillStyle = '#FFFFFF'; star(x + 18, y - 80, 7, 3); }
}
