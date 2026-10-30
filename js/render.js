// ===== Procedural cartoon renderer =====
// World is 1000x700 logical units. Boss origin = feet centre; head centre at (0,-380).

const TAU = Math.PI * 2;
const OUT = '#3a2414';           // cartoon outline colour

export function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function fillStroke(c, fill, stroke = OUT, lw = 5) {
  c.fillStyle = fill; c.fill();
  if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function ellipse(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function shade(hex, amt) {
  let n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
// seeded random for stable decor
function srand(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

// ---------------------------------------------------------------- BOSS
export const HEAD = { x: 0, y: -380, r: 120 };
export const BODY = { x: -110, y: -275, w: 220, h: 200 };

export function drawBoss(c, look, hat, p) {
  // p: { x, y, scale, tilt, squash, face, t, bruises, darts, splats, wet, char, red, spinX, ko }
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.tilt || 0);
  const sq = p.squash || 0;
  c.scale((p.scale || 1) * (1 + sq) * (p.spinX ?? 1), (p.scale || 1) * (1 - sq));

  const breathe = Math.sin((p.t || 0) * 2.2) * 3;

  // shadow
  if (!p.noShadow) { c.save(); c.globalAlpha = 0.25; ellipse(c, 0, 0, 120, 18); c.fillStyle = '#000'; c.fill(); c.restore(); }

  drawLegs(c, look);
  c.save(); c.translate(0, breathe * 0.4);
  drawBody(c, look, p);
  c.translate(0, breathe * 0.6);
  drawHead(c, look, p, hat);
  c.restore();

  // tint overlays (charred / frozen-wet)
  c.restore();
}

function drawLegs(c, look) {
  const pant = shade(look.suit, -30);
  rr(c, -70, -110, 60, 100, 14); fillStroke(c, pant);
  rr(c, 10, -110, 60, 100, 14); fillStroke(c, pant);
  ellipse(c, -45, -12, 46, 18); fillStroke(c, '#1c1c1c');
  ellipse(c, 45, -12, 46, 18); fillStroke(c, '#1c1c1c');
  c.fillStyle = 'rgba(255,255,255,.35)'; ellipse(c, -55, -18, 14, 5); c.fill(); ellipse(c, 35, -18, 14, 5); c.fill();
}

function drawBody(c, look, p) {
  const suit = look.suit;
  // arms (behind torso)
  c.save();
  const wave = p.armWave || 0;
  [[-1, -0.35 - wave], [1, 0.35 + wave]].forEach(([s, a]) => {
    c.save(); c.translate(s * 98, -250); c.rotate(a);
    rr(c, -24, -10, 48, 130, 22); fillStroke(c, shade(suit, -10));
    circle(c, 0, 128, 26); fillStroke(c, look.robot ? '#8a96a3' : look.skin);
    c.restore();
  });
  c.restore();

  // torso
  c.beginPath();
  c.moveTo(-108, -268); c.quadraticCurveTo(0, -292, 108, -268);
  c.lineTo(92, -100); c.quadraticCurveTo(0, -84, -92, -100); c.closePath();
  fillStroke(c, suit);

  if (look.turtleneck) {
    rr(c, -46, -296, 92, 40, 16); fillStroke(c, shade(suit, 15));
  } else if (look.robot) {
    rr(c, -60, -240, 120, 90, 12); fillStroke(c, '#2a323b', OUT, 4);
    for (let i = 0; i < 3; i++) { circle(c, -30 + i * 30, -195, 10); fillStroke(c, ['#ff4d4d', '#ffd84d', '#4dff88'][i], OUT, 3); }
  } else {
    // shirt V
    c.beginPath(); c.moveTo(-46, -276); c.lineTo(0, -170); c.lineTo(46, -276); c.closePath();
    fillStroke(c, look.shirt || '#fff', OUT, 4);
    if (look.cardigan) {
      c.beginPath(); c.moveTo(-108, -268); c.lineTo(-30, -276); c.lineTo(-20, -100); c.lineTo(-92, -100); c.closePath(); fillStroke(c, shade(suit, 20), OUT, 4);
      c.beginPath(); c.moveTo(108, -268); c.lineTo(30, -276); c.lineTo(20, -100); c.lineTo(92, -100); c.closePath(); fillStroke(c, shade(suit, 20), OUT, 4);
      for (let i = 0; i < 3; i++) { circle(c, 18, -230 + i * 40, 5); c.fillStyle = '#fff'; c.fill(); }
    } else {
      // lapels
      c.beginPath(); c.moveTo(-46, -276); c.lineTo(-24, -200); c.lineTo(-58, -230); c.closePath(); fillStroke(c, shade(suit, -25), OUT, 3);
      c.beginPath(); c.moveTo(46, -276); c.lineTo(24, -200); c.lineTo(58, -230); c.closePath(); fillStroke(c, shade(suit, -25), OUT, 3);
    }
    if (look.tie) {
      c.beginPath(); c.moveTo(-14, -272); c.lineTo(14, -272); c.lineTo(9, -254); c.lineTo(-9, -254); c.closePath(); fillStroke(c, look.tie, OUT, 3);
      c.beginPath(); c.moveTo(-9, -254); c.lineTo(9, -254); c.lineTo(18, -160); c.lineTo(0, -138); c.lineTo(-18, -160); c.closePath(); fillStroke(c, look.tie, OUT, 3);
    }
    if (look.pearls) for (let i = -4; i <= 4; i++) { circle(c, i * 9, -262 + Math.abs(i) * -2 + 16, 5); fillStroke(c, '#fffaf0', '#999', 1.5); }
  }
  // splats on body
  (p.splats || []).filter(s => s.part === 'body').forEach(s => drawSplat(c, s));
}

function drawHead(c, look, p, hat) {
  const { x: hx, y: hy, r } = HEAD;
  const face = p.face || 'angry';
  const t = p.t || 0;

  if (look.robot) return drawRobotHead(c, look, p, hat);

  // neck
  rr(c, -34, -292, 68, 40, 10); fillStroke(c, shade(look.skin, -18));

  // back hair (bun / curls behind)
  if (look.hairStyle === 'bun') { circle(c, hx, hy - 135, 48); fillStroke(c, look.hair); }
  if (look.hairStyle === 'curls') for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; circle(c, hx + Math.cos(a) * 128, hy + Math.sin(a) * 118 + 10, 38); fillStroke(c, look.hair); }

  // ears
  circle(c, hx - r + 2, hy + 8, 24); fillStroke(c, look.skin);
  circle(c, hx + r - 2, hy + 8, 24); fillStroke(c, look.skin);

  // head
  circle(c, hx, hy, r);
  let skin = look.skin;
  if (p.red) skin = mix(skin, '#ff5a4a', Math.min(1, p.red));
  fillStroke(c, skin, OUT, 6);

  // hair
  drawHair(c, look);

  // cheeks
  c.save(); c.globalAlpha = 0.35 + (p.red || 0) * 0.4;
  ellipse(c, hx - 72, hy + 30, 22, 14); c.fillStyle = '#ff7b7b'; c.fill();
  ellipse(c, hx + 72, hy + 30, 22, 14); c.fill();
  c.restore();

  drawFace(c, look, face, t, p);

  if (look.beard) {
    c.beginPath(); c.moveTo(hx - 95, hy + 20); c.quadraticCurveTo(hx - 80, hy + 125, hx, hy + 128); c.quadraticCurveTo(hx + 80, hy + 125, hx + 95, hy + 20);
    c.quadraticCurveTo(hx + 60, hy + 80, hx, hy + 78); c.quadraticCurveTo(hx - 60, hy + 80, hx - 95, hy + 20); fillStroke(c, look.hair, OUT, 4);
  }
  if (look.glasses) {
    c.lineWidth = 6; c.strokeStyle = '#222';
    circle(c, hx - 45, hy - 2, 32); c.stroke(); circle(c, hx + 45, hy - 2, 32); c.stroke();
    c.beginPath(); c.moveTo(hx - 13, hy - 4); c.lineTo(hx + 13, hy - 4); c.stroke();
    c.save(); c.globalAlpha = 0.25; c.fillStyle = '#fff'; ellipse(c, hx - 55, hy - 14, 10, 6, -0.6); c.fill(); ellipse(c, hx + 35, hy - 14, 10, 6, -0.6); c.fill(); c.restore();
  }
  if (look.monocle) { c.lineWidth = 5; c.strokeStyle = '#d4af37'; circle(c, hx + 45, hy - 2, 30); c.stroke(); c.beginPath(); c.moveTo(hx + 75, hy + 5); c.quadraticCurveTo(hx + 95, hy + 80, hx + 70, hy + 120); c.lineWidth = 2; c.stroke(); }
  if (look.headset) {
    c.lineWidth = 8; c.strokeStyle = '#222'; c.beginPath(); c.arc(hx, hy - 10, r + 4, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    rr(c, hx - r - 16, hy - 20, 26, 50, 10); fillStroke(c, '#333', '#111', 3);
    c.lineWidth = 5; c.beginPath(); c.moveTo(hx - r, hy + 20); c.quadraticCurveTo(hx - 90, hy + 85, hx - 40, hy + 70); c.stroke();
    circle(c, hx - 38, hy + 70, 8); c.fillStyle = '#111'; c.fill();
  }

  // damage decals
  (p.bruises || []).forEach((b, i) => drawBruise(c, b, i));
  (p.splats || []).filter(s => s.part === 'head').forEach(s => drawSplat(c, s));
  (p.darts || []).forEach(d => drawStuckDart(c, d));

  if (p.char > 0) {
    c.save(); c.globalAlpha = Math.min(0.75, p.char); circle(c, hx, hy, r); c.fillStyle = '#2a2a2a'; c.fill(); c.restore();
  }
  if (p.wet > 0) drawDrips(c, p.wet, t);

  const hatId = hat && hat !== 'none' ? hat : (look.tophat ? 'tophat' : null);
  if (hatId) drawHat(c, hatId, hx, hy - r + 8, t);
}

function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) * (1 - k)) + ((pb >> 16) * k));
  const g = Math.round((((pa >> 8) & 255) * (1 - k)) + (((pb >> 8) & 255) * k));
  const bl = Math.round(((pa & 255) * (1 - k)) + ((pb & 255) * k));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

function drawHair(c, look) {
  const { x: hx, y: hy, r } = HEAD;
  const col = look.hair;
  c.save();
  switch (look.hairStyle) {
    case 'mop': case 'bun': {
      c.beginPath();
      c.arc(hx, hy - 6, r + 10, Math.PI * 0.98, Math.PI * 2.02);
      c.lineTo(hx + r + 6, hy + 20);
      c.quadraticCurveTo(hx + r - 12, hy - 20, hx + 80, hy - 50);
      for (let i = 0; i < 5; i++) { const x0 = hx + 80 - i * 40; c.quadraticCurveTo(x0 - 20, hy - 30 - (i % 2) * 12, x0 - 40, hy - 52); }
      c.quadraticCurveTo(hx - r + 12, hy - 20, hx - r - 6, hy + 20);
      c.closePath(); fillStroke(c, col, OUT, 5);
      c.globalAlpha = 0.25; c.strokeStyle = '#fff'; c.lineWidth = 6;
      c.beginPath(); c.arc(hx - 20, hy - 70, 60, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
      break;
    }
    case 'slick': {
      c.beginPath();
      c.arc(hx, hy - 6, r + 8, Math.PI * 0.95, Math.PI * 2.05);
      c.quadraticCurveTo(hx + 60, hy - 90, hx - 40, hy - 60);
      c.quadraticCurveTo(hx - 100, hy - 40, hx - r - 6, hy + 10);
      c.closePath(); fillStroke(c, col, OUT, 5);
      c.globalAlpha = 0.35; c.strokeStyle = '#fff'; c.lineWidth = 5;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(hx + 10, hy - 20, 80 + i * 14, Math.PI * 1.25, Math.PI * 1.6); c.stroke(); }
      break;
    }
    case 'combover': {
      c.lineWidth = 7; c.strokeStyle = col; c.lineCap = 'round';
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(hx - 90, hy - 50 - i * 14); c.quadraticCurveTo(hx, hy - 125 - i * 4, hx + 95, hy - 55 - i * 10); c.stroke(); }
      [-1, 1].forEach(s => { c.beginPath(); c.arc(hx + s * (r - 10), hy - 5, 32, 0, TAU); fillStroke(c, col, OUT, 4); });
      break;
    }
    case 'curls': {
      for (let i = 0; i < 7; i++) { const a = Math.PI * 1.08 + (i / 6) * Math.PI * 0.84; circle(c, hx + Math.cos(a) * 100, hy + Math.sin(a) * 92 - 4, 34); fillStroke(c, col, OUT, 4); }
      break;
    }
    case 'bald': {
      [-1, 1].forEach(s => { ellipse(c, hx + s * (r - 6), hy - 10, 20, 34); fillStroke(c, col, OUT, 4); });
      c.globalAlpha = 0.35; c.fillStyle = '#fff'; ellipse(c, hx - 40, hy - 85, 26, 12, -0.4); c.fill();
      break;
    }
  }
  c.restore();
}

function drawFace(c, look, face, t, p) {
  const { x: hx, y: hy } = HEAD;
  const ex = 45, ey = hy - 2;
  c.lineCap = 'round'; c.lineJoin = 'round';

  // nose
  ellipse(c, hx, hy + 30, 16, 13); fillStroke(c, shade(look.skin, -20), OUT, 3);

  const eye = (x, open = 1) => {
    ellipse(c, x, ey, 22, 26 * open); fillStroke(c, '#fff', OUT, 4);
    if (open > 0.3) { circle(c, x + (x < 0 ? 6 : -6), ey + 4, 12); c.fillStyle = '#1a1a1a'; c.fill(); circle(c, x + (x < 0 ? 2 : -10), ey - 2, 4); c.fillStyle = '#fff'; c.fill(); }
  };
  const brow = (x, ang, y = ey - 38) => {
    c.save(); c.translate(x, y); c.rotate(ang);
    rr(c, -30, -8, 60, 16, 8); c.fillStyle = look.hair && look.hairStyle !== 'bald' ? shade(look.hair, -20) : '#5a4a3a'; c.fill();
    c.restore();
  };
  const xEye = (x) => { c.lineWidth = 8; c.strokeStyle = OUT; c.beginPath(); c.moveTo(x - 16, ey - 16); c.lineTo(x + 16, ey + 16); c.moveTo(x + 16, ey - 16); c.lineTo(x - 16, ey + 16); c.stroke(); };
  const squint = (x) => { c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); const s = x < 0 ? 1 : -1; c.moveTo(x - 18 * s, ey - 14); c.lineTo(x + 14 * s, ey); c.lineTo(x - 18 * s, ey + 14); c.stroke(); };
  const spiral = (x) => { c.lineWidth = 4; c.strokeStyle = OUT; c.beginPath(); for (let a = 0; a < 14; a += 0.3) { const rr2 = a * 1.6; c.lineTo(x + Math.cos(a + t * 8) * rr2, ey + Math.sin(a + t * 8) * rr2); } c.stroke(); };

  const mouthY = hy + 72;
  switch (face) {
    case 'angry':
      eye(-ex); eye(ex); brow(-ex, 0.35); brow(ex, -0.35);
      c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.arc(hx, mouthY + 24, 28, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
      break;
    case 'hurt':
      squint(-ex); squint(ex); brow(-ex, -0.25, ey - 34); brow(ex, 0.25, ey - 34);
      ellipse(c, hx, mouthY + 4, 26, 20); fillStroke(c, '#7a1f1f', OUT, 5);
      rr(c, hx - 18, mouthY - 14, 36, 10, 3); c.fillStyle = '#fff'; c.fill();
      break;
    case 'shock':
      ellipse(c, -ex, ey, 26, 32); fillStroke(c, '#fff', OUT, 4); circle(c, -ex, ey, 6); c.fillStyle = '#111'; c.fill();
      ellipse(c, ex, ey, 26, 32); fillStroke(c, '#fff', OUT, 4); circle(c, ex, ey, 6); c.fill();
      brow(-ex, -0.2, ey - 46); brow(ex, 0.2, ey - 46);
      ellipse(c, hx, mouthY + 6, 18, 24); fillStroke(c, '#7a1f1f', OUT, 5);
      break;
    case 'dizzy':
      spiral(-ex); spiral(ex);
      c.lineWidth = 6; c.strokeStyle = OUT; c.beginPath(); c.moveTo(hx - 30, mouthY); c.quadraticCurveTo(hx - 15, mouthY - 12, hx, mouthY); c.quadraticCurveTo(hx + 15, mouthY + 12, hx + 30, mouthY); c.stroke();
      ellipse(c, hx + 12, mouthY + 14, 10, 14); fillStroke(c, '#ff7a8a', OUT, 3);
      break;
    case 'ko':
      xEye(-ex); xEye(ex);
      ellipse(c, hx, mouthY + 6, 30, 14); fillStroke(c, '#7a1f1f', OUT, 5);
      ellipse(c, hx + 8, mouthY + 18, 12, 16); fillStroke(c, '#ff7a8a', OUT, 3);
      break;
    case 'smug':
      eye(-ex, 0.55); eye(ex, 0.55); brow(-ex, 0.15); brow(ex, -0.4, ey - 44);
      c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.moveTo(hx - 30, mouthY); c.quadraticCurveTo(hx + 10, mouthY + 14, hx + 34, mouthY - 10); c.stroke();
      break;
  }
  if (look.lipstick && face !== 'hurt' && face !== 'shock' && face !== 'ko') {
    c.lineWidth = 9; c.strokeStyle = '#c2185b'; c.globalAlpha = 0.5; c.beginPath(); c.arc(hx, mouthY + 24, 28, Math.PI * 1.25, Math.PI * 1.75); c.stroke(); c.globalAlpha = 1;
  }
  if (look.stache) {
    const sc = look.stacheColor || shade(look.hair || '#5a3418', -10);
    c.beginPath();
    c.moveTo(hx, mouthY - 22);
    c.bezierCurveTo(hx - 20, mouthY - 40, hx - 60, mouthY - 30, hx - 70, mouthY - 4);
    c.bezierCurveTo(hx - 50, mouthY - 14, hx - 25, mouthY - 6, hx, mouthY - 12);
    c.bezierCurveTo(hx + 25, mouthY - 6, hx + 50, mouthY - 14, hx + 70, mouthY - 4);
    c.bezierCurveTo(hx + 60, mouthY - 30, hx + 20, mouthY - 40, hx, mouthY - 22);
    fillStroke(c, sc, OUT, 4);
  }
  if (face === 'hurt' && (Math.floor(t * 4) % 2)) {
    c.fillStyle = '#6ec6ff'; c.beginPath(); c.moveTo(-ex - 18, ey + 12); c.quadraticCurveTo(-ex - 30, ey + 40, -ex - 18, ey + 44); c.quadraticCurveTo(-ex - 6, ey + 40, -ex - 18, ey + 12); c.fill();
  }
}

function drawRobotHead(c, look, p, hat) {
  const { x: hx, y: hy, r } = HEAD;
  const t = p.t || 0;
  rr(c, -30, -292, 60, 40, 6); fillStroke(c, '#5d6874');
  c.lineWidth = 6; c.strokeStyle = OUT; c.beginPath(); c.moveTo(hx, hy - r); c.lineTo(hx, hy - r - 50); c.stroke();
  circle(c, hx, hy - r - 58, 14); fillStroke(c, Math.sin(t * 6) > 0 ? '#ff4d4d' : '#ffd84d', OUT, 4);
  rr(c, hx - r - 10, hy - r + 10, (r + 10) * 2, r * 2 - 10, 40);
  fillStroke(c, p.red ? mix(look.skin, '#ff6a5a', Math.min(1, p.red)) : look.skin, OUT, 6);
  [-1, 1].forEach(s => { rr(c, hx + s * (r + 6) - 14, hy - 30, 28, 70, 10); fillStroke(c, '#7d8994'); });
  rr(c, hx - 90, hy - 70, 180, 140, 22); fillStroke(c, '#10181f', OUT, 5);
  const face = p.face || 'angry';
  c.fillStyle = face === 'ko' ? '#666' : face === 'hurt' ? '#ffd84d' : '#ff3b3b';
  c.shadowColor = c.fillStyle; c.shadowBlur = 18;
  if (face === 'ko') { c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; c.fillText('X  X', hx, hy + 5); }
  else if (face === 'dizzy') { c.font = 'bold 56px sans-serif'; c.textAlign = 'center'; c.fillText('@ @', hx, hy + 5); }
  else {
    c.save(); c.translate(hx - 40, hy - 18); c.rotate(face === 'angry' ? 0.3 : -0.2); c.fillRect(-26, -8, 52, 16); c.restore();
    c.save(); c.translate(hx + 40, hy - 18); c.rotate(face === 'angry' ? -0.3 : 0.2); c.fillRect(-26, -8, 52, 16); c.restore();
  }
  c.fillRect(hx - 50, hy + 32, 100, 10);
  c.shadowBlur = 0;
  (p.bruises || []).forEach((b, i) => drawDent(c, b));
  (p.splats || []).filter(s => s.part === 'head').forEach(s => drawSplat(c, s));
  (p.darts || []).forEach(d => drawStuckDart(c, d));
  if (p.char > 0) { c.save(); c.globalAlpha = Math.min(0.7, p.char); rr(c, hx - r - 10, hy - r + 10, (r + 10) * 2, r * 2 - 10, 40); c.fillStyle = '#222'; c.fill(); c.restore(); }
  if (p.wet > 0) drawDrips(c, p.wet, t);
  if (hat && hat !== 'none') drawHat(c, hat, hx, hy - r + 12, t);
}

function drawBruise(c, b, i) {
  c.save(); c.translate(b.x, b.y); c.rotate(b.rot || 0);
  if (i % 3 === 2) {               // band-aid
    rr(c, -26, -9, 52, 18, 8); fillStroke(c, '#f2c79a', '#b98a5f', 2);
    rr(c, -9, -7, 18, 14, 3); c.fillStyle = '#e6b088'; c.fill();
    c.fillStyle = '#b98a5f'; [-4, 4].forEach(dx => [-3, 3].forEach(dy => { circle(c, dx, dy, 1.4); c.fill(); }));
    c.save(); c.rotate(Math.PI / 2); rr(c, -26, -9, 52, 18, 8); fillStroke(c, '#f2c79a', '#b98a5f', 2); c.restore();
  } else {
    c.globalAlpha = 0.7; ellipse(c, 0, 0, 20, 15); c.fillStyle = '#8e44ad'; c.fill();
    c.globalAlpha = 0.6; ellipse(c, 3, 2, 11, 8); c.fillStyle = '#5b2c6f'; c.fill();
  }
  c.restore();
}
function drawDent(c, b) {
  c.save(); c.translate(b.x, b.y); c.lineWidth = 4; c.strokeStyle = '#333';
  c.beginPath(); c.moveTo(-14, -10); c.lineTo(0, 0); c.lineTo(-6, 14); c.moveTo(0, 0); c.lineTo(16, -4); c.stroke(); c.restore();
}
function drawSplat(c, s) {
  c.save(); c.translate(s.x, s.y); c.globalAlpha = 0.9; c.fillStyle = s.color;
  const rnd = srand(s.seed);
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = s.r * (0.6 + rnd() * 0.6); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath(); c.fill();
  for (let i = 0; i < 4; i++) { circle(c, (rnd() - 0.5) * s.r * 3, (rnd() - 0.5) * s.r * 3, s.r * 0.2 * (0.5 + rnd())); c.fill(); }
  c.fillRect(-3, 0, 6, s.r * 1.4);
  c.restore();
}
function drawStuckDart(c, d) {
  c.save(); c.translate(d.x, d.y); c.rotate(d.rot); c.scale(0.8, 0.8);
  c.fillStyle = '#ccc'; c.fillRect(-4, -2, 12, 4);
  rr(c, -50, -6, 46, 12, 5); fillStroke(c, '#d4b23a', OUT, 2);
  c.beginPath(); c.moveTo(-50, 0); c.lineTo(-80, -18); c.lineTo(-74, 0); c.lineTo(-80, 18); c.closePath(); fillStroke(c, '#2a6fdb', OUT, 2);
  c.restore();
}
function drawDrips(c, wet, t) {
  c.save(); c.globalAlpha = Math.min(0.85, wet); c.fillStyle = '#6ec6ff';
  for (let i = 0; i < 6; i++) {
    const x = -90 + i * 36, y = -440 + ((t * 120 + i * 47) % 220);
    c.beginPath(); c.moveTo(x, y - 12); c.quadraticCurveTo(x - 8, y + 4, x, y + 8); c.quadraticCurveTo(x + 8, y + 4, x, y - 12); c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- HATS
export function drawHat(c, id, x, y, t = 0) {
  c.save(); c.translate(x, y);
  switch (id) {
    case 'party':
      c.rotate(-0.15);
      c.beginPath(); c.moveTo(-50, 0); c.lineTo(0, -130); c.lineTo(50, 0); c.closePath(); fillStroke(c, '#ff5ca8');
      c.save(); c.clip(); c.strokeStyle = '#ffe14d'; c.lineWidth = 12; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-60, -20 - i * 28); c.lineTo(60, -50 - i * 28); c.stroke(); } c.restore();
      circle(c, 0, -134, 16); fillStroke(c, '#4dd2ff');
      break;
    case 'cone':
      c.beginPath(); c.moveTo(-48, -6); c.lineTo(-12, -150); c.lineTo(12, -150); c.lineTo(48, -6); c.closePath(); fillStroke(c, '#ff7a1a');
      c.fillStyle = '#fff'; c.fillRect(-36, -60, 72, 18); c.fillRect(-24, -105, 48, 14);
      rr(c, -70, -10, 140, 22, 6); fillStroke(c, '#ff7a1a');
      break;
    case 'propeller':
      c.beginPath(); c.arc(0, 4, 82, Math.PI, TAU); c.closePath(); fillStroke(c, '#2f80ed');
      c.save(); c.beginPath(); c.arc(0, 4, 82, Math.PI, TAU); c.clip(); c.fillStyle = '#ff4d4d'; c.fillRect(-28, -90, 56, 100); c.fillStyle = '#ffd84d'; c.fillRect(-82, -20, 30, 30); c.restore();
      rr(c, -100, -6, 70, 16, 8); fillStroke(c, '#2f80ed');
      c.fillStyle = OUT; c.fillRect(-4, -110, 8, 34);
      c.save(); c.translate(0, -110); c.scale(Math.cos(t * 20), 1); ellipse(c, -40, 0, 40, 9); fillStroke(c, '#ffd84d', OUT, 3); ellipse(c, 40, 0, 40, 9); fillStroke(c, '#ff4d4d', OUT, 3); c.restore();
      break;
    case 'chef':
      rr(c, -60, -50, 120, 54, 6); fillStroke(c, '#fff');
      [-45, 0, 45].forEach((dx, i) => { circle(c, dx, -80 - (i === 1 ? 20 : 0), 42); fillStroke(c, '#fff'); });
      c.fillStyle = '#fff'; c.fillRect(-56, -60, 112, 30);
      break;
    case 'pirate':
      c.beginPath(); c.moveTo(-110, -10); c.quadraticCurveTo(-60, -130, 0, -100); c.quadraticCurveTo(60, -130, 110, -10); c.quadraticCurveTo(0, -40, -110, -10); fillStroke(c, '#1d1d1d');
      c.fillStyle = '#fff'; circle(c, 0, -60, 16); c.fill(); c.fillRect(-20, -42, 40, 6);
      c.strokeStyle = '#d4af37'; c.lineWidth = 4; c.beginPath(); c.moveTo(-100, -16); c.quadraticCurveTo(0, -44, 100, -16); c.stroke();
      break;
    case 'crown':
      c.beginPath(); c.moveTo(-70, 0); c.lineTo(-80, -90); c.lineTo(-40, -50); c.lineTo(0, -110); c.lineTo(40, -50); c.lineTo(80, -90); c.lineTo(70, 0); c.closePath(); fillStroke(c, '#ffd23f');
      [-42, 0, 42].forEach((dx, i) => { circle(c, dx, -22, 10); fillStroke(c, ['#e74c3c', '#3498db', '#2ecc71'][i], OUT, 3); });
      break;
    case 'viking':
      [-1, 1].forEach(s => { c.beginPath(); c.moveTo(s * 70, -30); c.quadraticCurveTo(s * 150, -50, s * 130, -150); c.quadraticCurveTo(s * 110, -70, s * 50, -60); c.closePath(); fillStroke(c, '#f5ecd7'); });
      c.beginPath(); c.arc(0, 6, 92, Math.PI, TAU); c.closePath(); fillStroke(c, '#9aa3ad');
      rr(c, -98, -12, 196, 24, 10); fillStroke(c, '#7d6b4f');
      [-60, -20, 20, 60].forEach(dx => { circle(c, dx, 0, 5); c.fillStyle = '#d4af37'; c.fill(); });
      break;
    case 'duck':
      ellipse(c, 0, -50, 70, 50); fillStroke(c, '#ffd93b');
      circle(c, 40, -110, 38); fillStroke(c, '#ffd93b');
      c.beginPath(); c.moveTo(70, -110); c.quadraticCurveTo(110, -105, 104, -92); c.quadraticCurveTo(80, -90, 70, -98); fillStroke(c, '#ff8c1a', OUT, 3);
      circle(c, 48, -120, 7); c.fillStyle = OUT; c.fill();
      break;
    case 'tophat':
      rr(c, -95, -14, 190, 24, 10); fillStroke(c, '#1a1a1a');
      rr(c, -62, -150, 124, 140, 8); fillStroke(c, '#1a1a1a');
      c.fillStyle = '#a32020'; c.fillRect(-60, -46, 120, 24);
      break;
  }
  c.restore();
}

// ---------------------------------------------------------------- WEAPONS
// Drawn centred at 0,0 roughly 70 units wide.
export function drawWeapon(c, id, t = 0) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  switch (id) {
    case 'pencil':
      c.save(); c.rotate(-0.6);
      rr(c, -40, -9, 64, 18, 3); fillStroke(c, '#ffcc33', OUT, 4);
      c.fillStyle = '#e6a800'; c.fillRect(-40, -2, 64, 3);
      rr(c, -52, -9, 14, 18, 4); fillStroke(c, '#ff8fa3', OUT, 4);
      c.fillStyle = '#c0c0c0'; c.fillRect(-40, -9, 6, 18);
      c.beginPath(); c.moveTo(24, -9); c.lineTo(44, 0); c.lineTo(24, 9); c.closePath(); fillStroke(c, '#f5d6a8', OUT, 4);
      c.beginPath(); c.moveTo(37, -3); c.lineTo(44, 0); c.lineTo(37, 3); c.closePath(); c.fillStyle = '#333'; c.fill();
      c.restore(); break;
    case 'paper':
      c.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = 26 + (i % 2 ? 6 : -2); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); fillStroke(c, '#fbfbf5', OUT, 4);
      c.strokeStyle = '#c9c9c0'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, -10); c.lineTo(4, 2); c.lineTo(-6, 16); c.moveTo(8, -18); c.lineTo(14, 6); c.stroke();
      c.strokeStyle = '#8fb6e8'; c.beginPath(); c.moveTo(-20, 6); c.lineTo(18, -4); c.stroke();
      break;
    case 'stapler':
      rr(c, -38, 4, 76, 14, 5); fillStroke(c, '#333', OUT, 4);
      c.beginPath(); c.moveTo(-38, 4); c.quadraticCurveTo(-36, -18, 0, -18); c.lineTo(38, -12); c.lineTo(38, 4); c.closePath(); fillStroke(c, '#e53935', OUT, 4);
      c.fillStyle = 'rgba(255,255,255,.4)'; rr(c, -20, -14, 40, 5, 2); c.fill();
      break;
    case 'coffee':
      c.beginPath(); c.moveTo(-22, -24); c.lineTo(22, -24); c.lineTo(17, 30); c.lineTo(-17, 30); c.closePath(); fillStroke(c, '#fff', OUT, 4);
      c.fillStyle = '#c69c6d'; c.fillRect(-20, -4, 40, 16);
      rr(c, -26, -32, 52, 10, 4); fillStroke(c, '#6b3e1f', OUT, 4);
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-6 + i * 12, -38); c.quadraticCurveTo(2 + i * 12 + Math.sin(t * 8) * 4, -48, -6 + i * 12, -58); c.stroke(); }
      break;
    case 'dart':
      c.save(); c.rotate(-0.5);
      c.fillStyle = '#ccc'; c.fillRect(20, -2, 20, 4);
      rr(c, -16, -6, 38, 12, 5); fillStroke(c, '#d4b23a', OUT, 3);
      c.fillStyle = '#222'; c.fillRect(-4, -6, 4, 12); c.fillRect(8, -6, 4, 12);
      c.beginPath(); c.moveTo(-16, 0); c.lineTo(-44, -18); c.lineTo(-36, 0); c.lineTo(-44, 18); c.closePath(); fillStroke(c, '#2a6fdb', OUT, 3);
      c.restore(); break;
    case 'balloon':
      c.beginPath(); c.moveTo(0, -32); c.bezierCurveTo(30, -32, 34, 10, 0, 26); c.bezierCurveTo(-34, 10, -30, -32, 0, -32); fillStroke(c, '#3a9dff', OUT, 4);
      c.beginPath(); c.moveTo(-5, 26); c.lineTo(5, 26); c.lineTo(0, 33); c.closePath(); fillStroke(c, '#3a9dff', OUT, 3);
      c.fillStyle = 'rgba(255,255,255,.6)'; ellipse(c, -10, -14, 6, 10, 0.4); c.fill();
      break;
    case 'chicken':
      c.save(); c.rotate(-0.3);
      ellipse(c, 0, 0, 40, 13); fillStroke(c, '#ffe44d', OUT, 4);
      circle(c, 40, -8, 14); fillStroke(c, '#ffe44d', OUT, 4);
      c.beginPath(); c.moveTo(52, -10); c.lineTo(66, -6); c.lineTo(52, -2); c.closePath(); fillStroke(c, '#ff8c1a', OUT, 3);
      c.beginPath(); c.moveTo(36, -20); c.lineTo(40, -30); c.lineTo(44, -22); c.lineTo(48, -30); c.lineTo(48, -18); c.closePath(); fillStroke(c, '#e53935', OUT, 3);
      circle(c, 44, -10, 3); c.fillStyle = OUT; c.fill();
      c.strokeStyle = '#ff8c1a'; c.lineWidth = 5; c.beginPath(); c.moveTo(-36, 6); c.lineTo(-50, 14); c.moveTo(-36, -6); c.lineTo(-52, -10); c.stroke();
      c.restore(); break;
    case 'keyboard':
      c.save(); c.rotate(-0.2);
      rr(c, -46, -16, 92, 32, 6); fillStroke(c, '#4a4f57', OUT, 4);
      c.fillStyle = '#e8ecf0';
      for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) rr(c, -41 + k * 9.4 + (r % 2) * 3, -12 + r * 8.5, 7, 6, 1.5), c.fill();
      c.restore(); break;
    case 'pie':
      c.beginPath(); c.moveTo(-36, 0); c.lineTo(36, 0); c.lineTo(28, 16); c.lineTo(-28, 16); c.closePath(); fillStroke(c, '#c8c8c8', OUT, 4);
      c.beginPath(); c.moveTo(-36, 2); for (let i = 0; i <= 8; i++) c.quadraticCurveTo(-36 + i * 9 - 4.5, -22 - (i % 2) * 6, -36 + i * 9, -6); c.closePath(); fillStroke(c, '#fff8e8', OUT, 4);
      circle(c, 0, -22, 7); fillStroke(c, '#e53935', OUT, 3);
      break;
    case 'cactus':
      c.beginPath(); c.moveTo(-20, 6); c.lineTo(20, 6); c.lineTo(15, 34); c.lineTo(-15, 34); c.closePath(); fillStroke(c, '#d2691e', OUT, 4);
      rr(c, -12, -34, 24, 42, 12); fillStroke(c, '#3cb371', OUT, 4);
      rr(c, -30, -20, 14, 22, 7); fillStroke(c, '#3cb371', OUT, 3); rr(c, 16, -26, 14, 22, 7); fillStroke(c, '#3cb371', OUT, 3);
      c.strokeStyle = '#fff'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const y = -28 + i * 6; c.beginPath(); c.moveTo(-12, y); c.lineTo(-17, y - 2); c.moveTo(12, y + 3); c.lineTo(17, y + 1); c.stroke(); }
      circle(c, 0, -36, 6); fillStroke(c, '#ff6fb1', OUT, 2);
      break;
    case 'bowling':
      circle(c, 0, 0, 30); fillStroke(c, '#5b2a86', OUT, 4);
      c.fillStyle = '#1e0f2e'; [[-8, -12], [6, -14], [-1, -2]].forEach(([x, y]) => { circle(c, x, y, 4.5); c.fill(); });
      c.fillStyle = 'rgba(255,255,255,.35)'; ellipse(c, -12, -16, 8, 5, -0.6); c.fill();
      break;
    case 'golden':
      rr(c, -38, 4, 76, 14, 5); fillStroke(c, '#b8860b', OUT, 4);
      c.beginPath(); c.moveTo(-38, 4); c.quadraticCurveTo(-36, -18, 0, -18); c.lineTo(38, -12); c.lineTo(38, 4); c.closePath(); fillStroke(c, '#ffd23f', OUT, 4);
      c.fillStyle = '#fff'; const s = 4 + Math.sin(t * 6) * 3;
      c.beginPath(); c.moveTo(18, -26 - s); c.lineTo(21, -26); c.lineTo(18, -26 + s); c.lineTo(15, -26); c.closePath(); c.fill();
      break;
    case 'boomerang':
      c.save(); c.rotate(t * 0);
      c.beginPath(); c.moveTo(-40, -20); c.quadraticCurveTo(-10, -10, 0, 20); c.quadraticCurveTo(10, -10, 40, -20); c.lineTo(34, -30); c.quadraticCurveTo(6, -18, 0, 2); c.quadraticCurveTo(-6, -18, -34, -30); c.closePath(); fillStroke(c, '#d93838', OUT, 4);
      c.strokeStyle = '#ffcc00'; c.lineWidth = 4; [-24, -12, 12, 24].forEach(x => { c.beginPath(); c.moveTo(x - 4, -24 + Math.abs(x) * 0.1); c.lineTo(x + 4, -16 + Math.abs(x) * 0.1); c.stroke(); });
      c.beginPath(); c.moveTo(-8, -6); c.lineTo(8, -6); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); fillStroke(c, '#a32020', OUT, 3);
      c.restore(); break;
    case 'thunder':
      rr(c, -24, -24, 44, 50, 8); fillStroke(c, '#3949ab', OUT, 4);
      c.beginPath(); c.arc(22, 0, 13, -Math.PI / 2, Math.PI / 2); c.lineWidth = 8; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#3949ab'; c.stroke();
      c.beginPath(); c.moveTo(2, -18); c.lineTo(-10, 4); c.lineTo(-1, 4); c.lineTo(-6, 20); c.lineTo(10, -4); c.lineTo(1, -4); c.closePath(); fillStroke(c, '#ffe14d', OUT, 2);
      c.save(); c.strokeStyle = '#7fdcff'; c.lineWidth = 3; c.shadowColor = '#7fdcff'; c.shadowBlur = 10;
      for (let i = 0; i < 3; i++) { const a = t * 9 + i * 2.1; c.beginPath(); c.moveTo(Math.cos(a) * 30, Math.sin(a) * 30 - 6); c.lineTo(Math.cos(a) * 40 + 4, Math.sin(a) * 40); c.stroke(); }
      c.restore(); break;
    case 'rocket':
      c.save(); c.rotate(-0.4);
      const fl = 10 + Math.sin(t * 40) * 5;
      c.beginPath(); c.moveTo(-36, -6); c.lineTo(-48 - fl, 0); c.lineTo(-36, 6); c.closePath(); c.fillStyle = '#ff9800'; c.fill();
      c.beginPath(); c.moveTo(-36, -3); c.lineTo(-42 - fl * 0.6, 0); c.lineTo(-36, 3); c.closePath(); c.fillStyle = '#fff59d'; c.fill();
      c.beginPath(); c.moveTo(-34, -10); c.lineTo(-44, -22); c.lineTo(-24, -10); c.closePath(); fillStroke(c, '#555', OUT, 3);
      c.beginPath(); c.moveTo(-34, 10); c.lineTo(-44, 22); c.lineTo(-24, 10); c.closePath(); fillStroke(c, '#555', OUT, 3);
      rr(c, -36, 0, 72, 12, 4); fillStroke(c, '#333', OUT, 4);
      c.beginPath(); c.moveTo(-36, 0); c.quadraticCurveTo(-34, -18, 0, -18); c.lineTo(36, -12); c.lineTo(46, -4); c.lineTo(36, 0); c.closePath(); fillStroke(c, '#90a4ae', OUT, 4);
      circle(c, 8, -10, 5); fillStroke(c, '#4fc3f7', OUT, 2);
      c.restore(); break;
    case 'disco':
      c.save(); circle(c, 0, 0, 32); c.clip();
      for (let y = -32; y < 32; y += 8) for (let x = -32; x < 32; x += 8) {
        const k = (Math.sin((x + y) * 0.3 + t * 6) + 1) / 2;
        c.fillStyle = `hsl(${(x * 4 + y * 3 + t * 200) % 360},70%,${55 + k * 30}%)`; c.fillRect(x, y, 7, 7);
      }
      c.restore(); circle(c, 0, 0, 32); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = '#888'; c.fillRect(-2, -42, 4, 10);
      break;
  }
}

// ---------------------------------------------------------------- ROOMS
export function drawRoom(c, room, t, hzState) {
  // Huge wall/floor fill so it covers any aspect ratio.
  c.fillStyle = room.wall; c.fillRect(-3000, -3000, 7000, 3520);
  // wall panel stripes
  c.fillStyle = room.wall2;
  for (let x = -3000; x < 4000; x += 160) c.fillRect(x, -3000, 6, 3520);
  // floor
  c.fillStyle = room.floor; c.fillRect(-3000, 520, 7000, 3000);
  c.fillStyle = room.floor2;
  for (let x = -3000; x < 4000; x += 80) { c.beginPath(); c.moveTo(x, 520); c.lineTo(x + 140, 3000); c.lineTo(x + 150, 3000); c.lineTo(x + 6, 520); c.fill(); }
  for (let y = 560; y < 3000; y += 60) c.fillRect(-3000, y, 7000, 3);
  // skirting board
  c.fillStyle = shade(room.wall2, -40); c.fillRect(-3000, 505, 7000, 18);
  c.fillStyle = shade(room.wall2, -60); c.fillRect(-3000, 520, 7000, 4);

  DECOR[room.id]?.(c, room, t);
}

const DECOR = {
  office(c, room, t) {
    // window with blinds
    rr(c, 560, 120, 200, 170, 8); fillStroke(c, '#9fd4ff', '#6b5a4a', 8);
    c.fillStyle = '#fff'; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(580, 280); c.lineTo(640, 130); c.lineTo(670, 130); c.lineTo(610, 280); c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#f2f2f2'; for (let i = 0; i < 7; i++) c.fillRect(564, 126 + i * 13, 192, 6);
    // poster
    rr(c, 300, 150, 150, 110, 6); fillStroke(c, '#2b5797', OUT, 5);
    c.fillStyle = '#ffd23f'; c.font = '28px Lilita, sans-serif'; c.textAlign = 'center'; c.fillText('SYNERGY', 375, 205);
    c.fillStyle = '#fff'; c.font = '14px Nunito, sans-serif'; c.fillText('Teamwork makes', 375, 228); c.fillText('the dream work', 375, 245);
    // clock
    circle(c, 860, 140, 40); fillStroke(c, '#fff', OUT, 6);
    c.lineWidth = 5; c.beginPath(); c.moveTo(860, 140); c.lineTo(860 + Math.cos(t * 0.5) * 26, 140 + Math.sin(t * 0.5) * 26); c.moveTo(860, 140); c.lineTo(860, 115); c.stroke();
    // cubicle walls
    rr(c, -80, 300, 210, 230, 6); fillStroke(c, '#8ca2b8', '#5d7186', 5);
    c.fillStyle = '#ffeb7a'; [[-40, 340], [10, 360], [60, 335]].forEach(([x, y], i) => { c.save(); c.translate(x, y); c.rotate((i - 1) * 0.12); c.fillRect(-18, -18, 36, 36); c.restore(); });
    rr(c, 880, 300, 220, 230, 6); fillStroke(c, '#8ca2b8', '#5d7186', 5);
    // desk at right back
    rr(c, 880, 430, 160, 20, 4); fillStroke(c, '#a87b52');
    rr(c, 910, 360, 80, 60, 6); fillStroke(c, '#222'); c.fillStyle = '#4fc3f7'; c.fillRect(918, 368, 64, 44);
    // printer stand
    rr(c, 150, 560, 150, 20, 4); fillStroke(c, '#7c6b5a');
  },
  store(c, room, t) {
    // red accent stripe wall
    c.fillStyle = '#e53935'; c.fillRect(870, -3000, 2000, 3520);
    c.fillStyle = '#fff'; c.font = '44px Lilita, sans-serif'; c.save(); c.translate(950, 300); c.rotate(-0.08); c.fillText('SALE!', 0, 0); c.restore();
    // shelves with boxes
    const rnd = srand(7);
    for (let s = 0; s < 3; s++) {
      const y = 320 + s * 70;
      c.fillStyle = '#fafafa'; c.fillRect(380, y + 48, 240, 10);
      for (let x = 386; x < 610;) { const w = 10 + rnd() * 14; c.fillStyle = `hsl(${rnd() * 360},60%,${40 + rnd() * 25}%)`; c.fillRect(x, y + 48 - 40 - rnd() * 6, w, 40 + rnd() * 6); x += w + 1; }
    }
    // poster
    rr(c, 400, 150, 160, 120, 6); fillStroke(c, '#ff5ca8', OUT, 5);
    circle(c, 480, 210, 34); fillStroke(c, '#fff', OUT, 4); circle(c, 470, 205, 7); c.fillStyle = OUT; c.fill(); circle(c, 494, 205, 7); c.fill();
    c.beginPath(); c.arc(482, 218, 16, 0.1, Math.PI - 0.1); c.lineWidth = 4; c.stroke();
    // display cases with figurines
    rr(c, 900, 430, 120, 100, 8); fillStroke(c, 'rgba(160,220,255,.4)', '#3d6b8a', 5);
    circle(c, 960, 470, 20); fillStroke(c, '#ffd23f', OUT, 3);
  },
  break(c, room, t) {
    // upper cabinets
    rr(c, 120, 120, 340, 110, 6); fillStroke(c, '#c96f3b');
    for (let i = 0; i < 4; i++) { rr(c, 128 + i * 83, 128, 77, 94, 4); fillStroke(c, '#d98a55', OUT, 3); circle(c, 128 + i * 83 + 66, 175, 4); c.fillStyle = '#ddd'; c.fill(); }
    // counter
    rr(c, 110, 450, 360, 20, 4); fillStroke(c, '#e9e1d2');
    rr(c, 120, 470, 340, 60, 4); fillStroke(c, '#c96f3b');
    // note on wall
    c.save(); c.translate(560, 200); c.rotate(0.06); c.fillStyle = '#fff'; c.fillRect(-70, -50, 140, 100);
    c.fillStyle = '#c0392b'; c.font = '17px Lilita, sans-serif'; c.textAlign = 'center'; c.fillText('LABEL YOUR', 0, -15); c.fillText('FOOD!!!', 0, 8); c.fillStyle = '#333'; c.font = '12px Nunito, sans-serif'; c.fillText('- Management', 0, 32); c.restore();
    // vending glimpse
    rr(c, 900, 260, 140, 270, 10); fillStroke(c, '#1e88e5'); c.fillStyle = '#bde3ff'; c.fillRect(915, 280, 80, 160);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.fillStyle = ['#e53935', '#ffd23f', '#43a047'][k]; c.fillRect(920 + k * 25, 290 + r * 38, 18, 26); }
  },
  board(c, room, t) {
    // window skyline
    rr(c, 300, 110, 360, 220, 6); fillStroke(c, '#ffb36b', '#1d2633', 10);
    const g = c.createLinearGradient(0, 110, 0, 330); g.addColorStop(0, '#ff8a65'); g.addColorStop(1, '#ffd180'); c.fillStyle = g; c.fillRect(305, 115, 350, 210);
    const rnd = srand(3);
    for (let x = 305; x < 650; x += 28) { const h = 50 + rnd() * 120; c.fillStyle = '#4a3a5a'; c.fillRect(x, 325 - h, 24, h); c.fillStyle = '#ffe9a8'; for (let y = 330 - h; y < 320; y += 16) if (rnd() > 0.5) c.fillRect(x + 6, y, 5, 7); }
    c.fillStyle = '#1d2633'; c.fillRect(477, 110, 8, 220);
    // whiteboard chart
    rr(c, 860, 150, 200, 150, 6); fillStroke(c, '#fff', '#8a8f99', 6);
    c.strokeStyle = '#e53935'; c.lineWidth = 5; c.beginPath(); c.moveTo(875, 180); c.lineTo(920, 210); c.lineTo(960, 200); c.lineTo(1040, 290); c.stroke();
    c.fillStyle = '#e53935'; c.font = '16px Lilita, sans-serif'; c.fillText('PROFITS', 900, 280);
    // table edge
    rr(c, -200, 470, 280, 40, 10); fillStroke(c, '#5d3a1f');
  },
  server(c, room, t) {
    // back racks
    for (let i = 0; i < 4; i++) {
      const x = 300 + i * 120;
      rr(c, x, 180, 100, 340, 6); fillStroke(c, '#0d141b', '#000', 4);
      for (let y = 195; y < 505; y += 22) { c.fillStyle = '#26323e'; c.fillRect(x + 8, y, 84, 16); c.fillStyle = Math.sin(t * 7 + y + i * 3) > 0.2 ? '#34ff8a' : '#0b4d2a'; c.fillRect(x + 76, y + 5, 6, 6); c.fillStyle = Math.sin(t * 5 + y * 2 + i) > 0.7 ? '#ffb020' : '#4d3a0b'; c.fillRect(x + 64, y + 5, 6, 6); }
    }
    // cable tray
    c.fillStyle = '#4a5866'; c.fillRect(-3000, 90, 7000, 20);
    c.strokeStyle = '#ffcc00'; c.lineWidth = 6; c.beginPath(); for (let x = 0; x < 1000; x += 40) c.lineTo(x, 112 + Math.sin(x * 0.05) * 14); c.stroke();
    c.fillStyle = '#ffcc00'; c.font = '20px Lilita, sans-serif'; c.fillText('⚠ HIGH VOLTAGE', 800, 200);
  },
  lab(c, room, t) {
    // glowing tubes
    for (let i = 0; i < 3; i++) {
      const x = 360 + i * 110;
      rr(c, x, 180, 70, 300, 30); fillStroke(c, 'rgba(120,255,200,.25)', '#9ad', 5);
      c.fillStyle = `hsla(${150 + i * 40},90%,60%,.6)`; rr(c, x + 8, 260 + Math.sin(t + i) * 10, 54, 210, 24); c.fill();
      for (let b = 0; b < 4; b++) { circle(c, x + 20 + ((b * 17) % 30), 460 - ((t * 60 + b * 50 + i * 30) % 190), 5); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); }
      rr(c, x - 6, 470, 82, 30, 6); fillStroke(c, '#555'); rr(c, x - 6, 170, 82, 22, 6); fillStroke(c, '#555');
    }
    // beakers bench
    rr(c, 860, 440, 200, 18, 4); fillStroke(c, '#888');
    [['#ff4dd2', 890], ['#4dff88', 940], ['#ffd84d', 990]].forEach(([col, x]) => { c.beginPath(); c.moveTo(x - 10, 380); c.lineTo(x + 10, 380); c.lineTo(x + 22, 440); c.lineTo(x - 22, 440); c.closePath(); fillStroke(c, 'rgba(255,255,255,.4)', OUT, 3); c.fillStyle = col; c.fillRect(x - 18, 415, 36, 24); });
  },
};

// ---------------------------------------------------------------- HAZARDS (at rest + animated)
// p = animation progress 0..1 or -1 when idle.  ready = can be triggered.
export function drawHazard(c, hz, t, p, ready) {
  c.save();
  if (ready) {
    const k = (Math.sin(t * 5) + 1) / 2;
    c.save(); c.globalAlpha = 0.25 + k * 0.35; c.shadowColor = '#ffe14d'; c.shadowBlur = 30;
    rr(c, hz.x - 6, hz.y - 6, hz.w + 12, hz.h + 12, 18); c.lineWidth = 6; c.strokeStyle = '#ffe14d'; c.setLineDash([14, 10]); c.lineDashOffset = -t * 30; c.stroke();
    c.restore();
  }
  (HZ[hz.id] || (() => {}))(c, hz, t, p);
  if (ready) {
    // "!" badge like the reference UI
    const bx = hz.x + hz.w - 4, by = hz.y + 4, bob = Math.sin(t * 6) * 4;
    circle(c, bx, by + bob, 20); fillStroke(c, '#e53935', '#fff', 4);
    c.fillStyle = '#fff'; c.font = '28px Lilita, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', bx, by + bob + 2);
  }
  c.restore();
}

const HZ = {
  lamp(c, hz, t, p) {
    const cx = hz.x + hz.w / 2;
    c.strokeStyle = '#333'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx, -3000); c.lineTo(cx, hz.y + 10); c.stroke();
    c.beginPath(); c.moveTo(cx - 60, hz.y + 70); c.lineTo(cx - 25, hz.y + 10); c.lineTo(cx + 25, hz.y + 10); c.lineTo(cx + 60, hz.y + 70); c.closePath(); fillStroke(c, '#6d7b86');
    const flick = p < 0 ? (Math.sin(t * 23) > 0.92 ? 0.2 : 1) : (Math.random() > 0.5 ? 1 : 0.1);
    ellipse(c, cx, hz.y + 72, 34, 10); c.fillStyle = flick > 0.5 ? '#fff6b0' : '#777'; c.fill();
    if (flick > 0.5) { c.save(); c.globalAlpha = 0.12; c.beginPath(); c.moveTo(cx - 60, hz.y + 72); c.lineTo(cx - 200, 520); c.lineTo(cx + 200, 520); c.lineTo(cx + 60, hz.y + 72); c.fillStyle = '#fff6b0'; c.fill(); c.restore(); }
    // dangling exposed wire
    const drop = p < 0 ? 0 : Math.min(1, p / 0.3);
    const wy = hz.y + 70 + drop * 170;
    c.strokeStyle = '#d35400'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx + 30, hz.y + 60); c.quadraticCurveTo(cx + 50 + Math.sin(t * 3) * 6, (hz.y + 60 + wy) / 2, cx + 20, wy); c.stroke();
    c.fillStyle = '#ffcc66'; c.fillRect(cx + 16, wy, 8, 10);
    if (Math.sin(t * 17) > 0.6 || p >= 0) sparks(c, cx + 20, wy + 10, t, 4);
  },
  printer(c, hz, t, p) {
    const shake = p >= 0 && p < 0.45 ? Math.sin(t * 80) * 6 * p * 2 : 0;
    c.save(); c.translate(shake, 0);
    rr(c, hz.x, hz.y + 30, hz.w, hz.h - 40, 12); fillStroke(c, '#e8e8e8');
    rr(c, hz.x + 15, hz.y + 10, hz.w - 30, 30, 6); fillStroke(c, '#cfcfcf');
    c.fillStyle = '#fff'; c.fillRect(hz.x + 30, hz.y - 6, hz.w - 60, 20);
    rr(c, hz.x + 20, hz.y + 70, hz.w - 40, 12, 4); c.fillStyle = '#333'; c.fill();
    c.fillStyle = p >= 0 ? (Math.sin(t * 30) > 0 ? '#ff3b3b' : '#550000') : '#34c759'; circle(c, hz.x + hz.w - 25, hz.y + 50, 7); c.fill();
    c.fillStyle = '#333'; c.font = '13px Nunito, sans-serif'; c.textAlign = 'left'; c.fillText(p >= 0 ? 'PC LOAD LETTER' : 'READY', hz.x + 18, hz.y + 55);
    c.restore();
    if (p > 0.4 && p < 0.95) {
      const k = (p - 0.4) / 0.55;
      c.save(); c.globalAlpha = 1 - k;
      for (let i = 0; i < 14; i++) { const a = -0.9 + (i / 14) * 0.6; const d = k * 380; circle(c, hz.x + hz.w + Math.cos(a) * d, hz.y + 70 + Math.sin(a) * d * 0.6 + (i % 3) * 20, 20 + k * 40); c.fillStyle = '#222'; c.fill(); }
      c.restore();
      for (let i = 0; i < 6; i++) { c.save(); c.translate(hz.x + hz.w + k * (300 + i * 30), hz.y + 70 - k * 120 + i * 18 + k * k * 200); c.rotate(k * 10 + i); c.fillStyle = '#fff'; c.fillRect(-14, -18, 28, 36); c.strokeStyle = '#999'; c.lineWidth = 1; c.strokeRect(-14, -18, 28, 36); c.restore(); }
    }
  },
  cooler(c, hz, t, p) {
    const tip = p < 0 ? 0 : Math.min(1, p / 0.45);
    c.save(); c.translate(hz.x + hz.w / 2, hz.y + hz.h); c.rotate(-tip * 0.9);
    rr(c, -40, -130, 80, 130, 8); fillStroke(c, '#f0f0f0');
    c.fillStyle = '#4fb3ff'; c.fillRect(-12, -96, 10, 10); c.fillStyle = '#ff5a5a'; c.fillRect(4, -96, 10, 10);
    if (p < 0.45 || p < 0) { c.beginPath(); c.moveTo(-34, -130); c.quadraticCurveTo(-40, -220, 0, -222); c.quadraticCurveTo(40, -220, 34, -130); c.closePath(); fillStroke(c, 'rgba(100,180,255,.7)'); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-20, -200, 8, 50); }
    c.restore();
    if (p >= 0.45 && p < 1) {
      const k = (p - 0.45) / 0.55;
      const bx = hz.x + (500 - hz.x) * Math.min(1, k * 1.5), by = hz.y + 60 - Math.sin(Math.min(1, k * 1.5) * Math.PI) * 120 + (k > 0.66 ? (k - 0.66) * 600 : 0);
      c.save(); c.translate(bx, by); c.rotate(k * 8); c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(-40, -90, 0, -92); c.quadraticCurveTo(40, -90, 34, 0); c.closePath(); fillStroke(c, 'rgba(100,180,255,.7)'); c.restore();
      c.save(); c.globalAlpha = 0.6; ellipse(c, hz.x - 30, 600, 120 * k, 20 * k); c.fillStyle = '#6ec6ff'; c.fill(); c.restore();
    }
  },
  sensor(c, hz, t, p) {
    const on = p >= 0 && p < 0.9 && Math.sin(t * 25) > 0;
    [0, 70].forEach(dx => {
      rr(c, hz.x + dx, hz.y, 44, hz.h, 14); fillStroke(c, '#d9dde3', '#8a919b', 5);
      c.fillStyle = '#b8bec7'; c.fillRect(hz.x + dx + 12, hz.y + 20, 20, hz.h - 40);
      circle(c, hz.x + dx + 22, hz.y + 18, 9); c.fillStyle = on ? '#ff2222' : '#661111'; c.fill();
    });
    if (on) { c.save(); c.globalAlpha = 0.25; c.fillStyle = '#ff0000'; c.fillRect(-3000, -3000, 7000, 7000); c.restore(); }
  },
  tvwall(c, hz, t, p) {
    let x = hz.x, y = hz.y, rot = 0;
    if (p >= 0) {
      const k = Math.min(1, Math.max(0, (p - 0.15) / 0.35));
      x = hz.x + (370 - hz.x) * k; y = hz.y + (110 - hz.y) * k + k * k * 20; rot = -k * 0.4;
      if (p > 0.5) { x = 370 + (p - 0.5) * 40; y = 130 + (p - 0.5) * 900; rot = -0.4 + (p - 0.5) * 3; }
    }
    c.save(); c.translate(x + hz.w / 2, y + hz.h / 2); c.rotate(rot);
    rr(c, -hz.w / 2, -hz.h / 2, hz.w, hz.h, 8); fillStroke(c, '#111', OUT, 6);
    const g = c.createLinearGradient(-hz.w / 2, 0, hz.w / 2, 0); ['#ff4d4d', '#ffd84d', '#4dff88', '#4dd2ff', '#b44dff'].forEach((col, i) => g.addColorStop(i / 4, col));
    c.fillStyle = p > 0.5 ? '#333' : g; c.globalAlpha = p > 0.5 ? 1 : 0.85; c.fillRect(-hz.w / 2 + 10, -hz.h / 2 + 10, hz.w - 20, hz.h - 20); c.globalAlpha = 1;
    if (p <= 0.5) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 6; c.beginPath(); c.moveTo(-hz.w / 2 + 30, hz.h / 2 - 20); c.lineTo(-hz.w / 2 + 80 + Math.sin(t) * 40, -hz.h / 2 + 20); c.stroke(); }
    else { c.strokeStyle = '#ddd'; c.lineWidth = 3; c.beginPath(); c.moveTo(-40, -30); c.lineTo(0, 0); c.lineTo(-20, 40); c.moveTo(0, 0); c.lineTo(50, 10); c.stroke(); }
    c.restore();
    if (p < 0 || p > 0.15) { c.fillStyle = '#555'; c.fillRect(hz.x + hz.w / 2 - 20, hz.y + hz.h / 2 - 10, 40, 20); }
  },
  drone(c, hz, t, p) {
    let x = hz.x + hz.w / 2 + Math.sin(t * 1.5) * 20, y = hz.y + hz.h / 2 + Math.sin(t * 3) * 8, r = Math.sin(t * 1.5) * 0.1;
    if (p >= 0) {
      if (p < 0.4) { const a = p / 0.4 * TAU; x += Math.cos(a) * 80 - 80 * 0; y -= Math.sin(a) * 50; }
      else if (p < 0.6) { const k = (p - 0.4) / 0.2; x = x + (500 - x) * k; y = y + (300 - y) * k; r = 0.8 * k; }
      else { const k = (p - 0.6) / 0.4; x = 500 + k * 200; y = 300 + k * k * 300; r = 0.8 + k * 12; }
    }
    c.save(); c.translate(x, y); c.rotate(r);
    rr(c, -30, -12, 60, 24, 10); fillStroke(c, '#eee');
    [-1, 1].forEach(s => { c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(s * 25, -6); c.lineTo(s * 55, -18); c.stroke(); c.save(); c.translate(s * 55, -22); c.scale(Math.cos(t * 40), 1); ellipse(c, 0, 0, 26, 5); fillStroke(c, '#888', OUT, 2); c.restore(); });
    circle(c, 0, 6, 8); c.fillStyle = '#222'; c.fill(); circle(c, 0, 6, 3); c.fillStyle = '#ff3b3b'; c.fill();
    c.restore();
  },
  microwave(c, hz, t, p) {
    const sh = p >= 0 && p < 0.35 ? Math.sin(t * 90) * 5 : 0;
    c.save(); c.translate(sh, 0);
    rr(c, hz.x, hz.y, hz.w, hz.h, 10); fillStroke(c, '#d9d9d9');
    rr(c, hz.x + 10, hz.y + 10, hz.w - 50, hz.h - 20, 6); c.fillStyle = p >= 0 ? (Math.sin(t * 20) > 0 ? '#ffcc33' : '#ff7a1a') : '#333'; c.fill();
    c.fillStyle = '#222'; c.fillRect(hz.x + hz.w - 32, hz.y + 14, 22, 14);
    c.fillStyle = '#34ff8a'; c.font = '10px monospace'; c.fillText(p >= 0 ? '0:00' : '12:00', hz.x + hz.w - 31, hz.y + 25);
    for (let i = 0; i < 3; i++) { circle(c, hz.x + hz.w - 21, hz.y + 45 + i * 16, 5); c.fillStyle = '#999'; c.fill(); }
    c.restore();
    if (p > 0.3 && p < 1) {
      const k = (p - 0.3) / 0.7;
      for (let i = 0; i < 26; i++) {
        const ang = -0.9 + (i * 37 % 100) / 100 * 1.3, sp = 300 + (i * 53 % 100) * 3;
        const x = hz.x + hz.w / 2 + Math.cos(ang) * sp * k, y = hz.y + 50 + Math.sin(ang) * sp * k + 400 * k * k;
        circle(c, x, y, 8); fillStroke(c, '#fff8d6', '#c9a84a', 2);
      }
    }
  },
  coffeemac(c, hz, t, p) {
    rr(c, hz.x, hz.y, hz.w, hz.h, 10); fillStroke(c, '#2b2b2b');
    rr(c, hz.x + 10, hz.y + 10, hz.w - 20, 30, 4); c.fillStyle = '#c0c0c0'; c.fill();
    c.fillStyle = '#fff'; c.fillRect(hz.x + 35, hz.y + 70, 30, 30);
    circle(c, hz.x + hz.w - 18, hz.y + 52, 6); c.fillStyle = p >= 0 ? '#ff3b3b' : '#34c759'; c.fill();
    if (p > 0.15 && p < 0.9) {
      const k = (p - 0.15) / 0.75;
      for (let i = 0; i < 18; i++) { const d = ((i / 18) + t * 2) % 1; const x = hz.x + hz.w + d * 260 * Math.min(1, k * 3); const y = hz.y + 40 - d * 130 + Math.sin(i + t * 10) * 10; c.save(); c.globalAlpha = (1 - d) * 0.8; circle(c, x, y, 14 + d * 30); c.fillStyle = '#fff'; c.fill(); c.restore(); }
    } else { c.save(); c.globalAlpha = 0.4; for (let i = 0; i < 2; i++) { circle(c, hz.x + 50 + i * 10, hz.y + 60 - ((t * 30 + i * 20) % 50), 6); c.fillStyle = '#fff'; c.fill(); } c.restore(); }
  },
  fridge(c, hz, t, p) {
    rr(c, hz.x, hz.y, hz.w, hz.h, 14); fillStroke(c, '#f4f6f8');
    c.fillStyle = '#e0e4e8'; c.fillRect(hz.x + 6, hz.y + 110, hz.w - 12, 6);
    let open = p < 0 ? 0 : p < 0.3 ? p / 0.3 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    c.fillStyle = '#9ee0ff'; c.fillRect(hz.x + 8, hz.y + 8, hz.w - 16, 100 * open);
    // door swing (perspective by narrowing)
    const dw = hz.w * (1 - open * 0.85);
    rr(c, hz.x + (hz.w - dw) * 0 , hz.y, Math.max(16, dw), 110, 10); fillStroke(c, '#eef1f4');
    c.fillStyle = '#999'; c.fillRect(hz.x + Math.max(16, dw) - 18, hz.y + 30, 6, 50); c.fillRect(hz.x + hz.w - 18, hz.y + 140, 6, 80);
    c.fillStyle = '#ffeb7a'; c.fillRect(hz.x + 20, hz.y + 150, 34, 34); c.fillStyle = '#ff8a80'; c.fillRect(hz.x + 62, hz.y + 170, 30, 30);
    if (p > 0.3 && p < 1) {
      const k = (p - 0.3) / 0.7;
      const x = hz.x + (500 - hz.x) * Math.min(1, k * 1.6), y = hz.y + 60 - Math.sin(Math.min(1, k * 1.6) * Math.PI) * 140 + (k > 0.62 ? (k - 0.62) * 700 : 0);
      c.save(); c.translate(x, y); c.rotate(-k * 12);
      ellipse(c, 0, 0, 44, 18); fillStroke(c, '#7fb8d8');
      c.beginPath(); c.moveTo(40, 0); c.lineTo(66, -18); c.lineTo(66, 18); c.closePath(); fillStroke(c, '#7fb8d8');
      circle(c, -26, -4, 5); c.fillStyle = OUT; c.fill();
      c.restore();
    }
  },
  fan(c, hz, t, p) {
    const cx = hz.x + hz.w / 2;
    let x = cx, y = hz.y + 30, spin = t * 14;
    if (p >= 0) {
      spin = t * (14 + p * 50);
      if (p < 0.3) x += Math.sin(t * 60) * 8 * p * 3;
      else { const k = Math.min(1, (p - 0.3) / 0.25); x = cx + (500 - cx) * k; y = hz.y + 30 + (250 - hz.y - 30) * k; if (p > 0.55) { const k2 = (p - 0.55) / 0.45; x = 500 - k2 * 400; y = 250 + k2 * k2 * 400; } }
    }
    if (p < 0.3) { c.strokeStyle = '#333'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, -3000); c.lineTo(cx, hz.y + 20); c.stroke(); }
    else { c.strokeStyle = '#333'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, -3000); c.lineTo(cx, hz.y + 5); c.stroke(); sparks(c, cx, hz.y + 8, t, 3); }
    c.save(); c.translate(x, y); c.scale(1, 0.35);
    for (let i = 0; i < 4; i++) { c.save(); c.rotate(spin + i * Math.PI / 2); rr(c, 10, -16, 90, 32, 14); fillStroke(c, '#a0703f', OUT, 4); c.restore(); }
    circle(c, 0, 0, 22); fillStroke(c, '#ccc');
    c.restore();
  },
  projector(c, hz, t, p) {
    c.strokeStyle = '#333'; c.lineWidth = 6; c.beginPath(); c.moveTo(hz.x + hz.w / 2, -3000); c.lineTo(hz.x + hz.w / 2, hz.y); c.stroke();
    rr(c, hz.x, hz.y, hz.w, hz.h, 10); fillStroke(c, '#e0e0e0');
    circle(c, hz.x + hz.w - 6, hz.y + hz.h / 2, 18); fillStroke(c, '#333');
    if (p > 0.1 && p < 0.9) {
      c.save(); c.globalAlpha = 0.55 + Math.sin(t * 30) * 0.1;
      const g = c.createLinearGradient(hz.x + hz.w, 0, 500, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,220,0.8)');
      c.beginPath(); c.moveTo(hz.x + hz.w, hz.y + hz.h / 2 - 10); c.lineTo(560, 300); c.lineTo(560, 420); c.lineTo(hz.x + hz.w, hz.y + hz.h / 2 + 10); c.fillStyle = g; c.fill();
      c.restore();
      c.save(); c.globalAlpha = 0.35 * Math.sin(Math.min(1, (p - 0.1) / 0.3) * Math.PI); c.fillStyle = '#fff'; c.fillRect(-3000, -3000, 7000, 7000); c.restore();
    }
  },
  chairz(c, hz, t, p) {
    let x = hz.x + hz.w / 2, rot = 0;
    if (p >= 0) {
      if (p < 0.4) x = x + (580 - x) * (p / 0.4);
      else { const k = (p - 0.4) / 0.6; x = 580 + k * 700; }
      rot = p * 20;
    }
    c.save(); c.translate(x, hz.y);
    c.save(); c.scale(Math.cos(rot), 1);
    rr(c, -45, 0, 90, 90, 18); fillStroke(c, '#222');
    rr(c, -50, 85, 100, 22, 10); fillStroke(c, '#333');
    c.restore();
    c.fillStyle = '#555'; c.fillRect(-6, 105, 12, 25);
    for (let i = 0; i < 3; i++) { circle(c, -40 + i * 40, 140, 10); fillStroke(c, '#111', OUT, 3); }
    c.restore();
    if (p >= 0 && p < 0.4) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + 60, hz.y + 30 + i * 30); c.lineTo(x + 140, hz.y + 30 + i * 30); c.stroke(); } }
  },
  rack(c, hz, t, p) {
    rr(c, hz.x, hz.y, hz.w, hz.h, 8); fillStroke(c, '#0d141b', '#000', 5);
    for (let y = hz.y + 14; y < hz.y + hz.h - 14; y += 24) { c.fillStyle = '#26323e'; c.fillRect(hz.x + 10, y, hz.w - 20, 18); c.fillStyle = Math.sin(t * 9 + y) > 0 ? '#34ff8a' : '#0b4d2a'; c.fillRect(hz.x + hz.w - 26, y + 6, 6, 6); }
    c.save(); c.strokeStyle = '#ff9800'; c.lineWidth = 4; c.beginPath(); c.moveTo(hz.x + hz.w, hz.y + 60); c.quadraticCurveTo(hz.x + hz.w + 30, hz.y + 30, hz.x + hz.w + 10, hz.y + 10); c.stroke(); c.restore();
    sparks(c, hz.x + hz.w + 10, hz.y + 10, t, p >= 0 ? 8 : (Math.sin(t * 13) > 0.5 ? 3 : 0));
    if (p > 0.15 && p < 0.85) lightning(c, hz.x + hz.w, hz.y + 120, 470, 380, t);
  },
  sprinkler(c, hz, t, p) {
    const cx = hz.x + hz.w / 2;
    c.fillStyle = '#c0c0c0'; c.fillRect(cx - 6, -3000, 12, 3000 + hz.y + 10);
    c.beginPath(); c.moveTo(cx - 34, hz.y + 30); c.lineTo(cx + 34, hz.y + 30); c.lineTo(cx + 14, hz.y + 10); c.lineTo(cx - 14, hz.y + 10); c.closePath(); fillStroke(c, '#d32f2f', OUT, 3);
    if (p > 0.05 && p < 0.95) {
      c.save(); c.globalAlpha = 0.25; c.fillStyle = '#ff0000'; if (Math.sin(t * 20) > 0) c.fillRect(-3000, -3000, 7000, 7000); c.restore();
      c.fillStyle = '#6ec6ff';
      for (let i = 0; i < 80; i++) { const x = (i * 97 % 1200) - 100, y = ((t * 900 + i * 61) % 800) - 60; c.fillRect(x, y, 3, 18); }
    }
  },
  cable(c, hz, t, p) {
    const whip = p >= 0 && p < 0.5 ? Math.sin(p * 30) * 30 : 0;
    ['#ffcc00', '#2196f3', '#e53935'].forEach((col, i) => {
      c.strokeStyle = col; c.lineWidth = 9; c.beginPath();
      for (let x = hz.x - 60; x <= hz.x + hz.w + 60; x += 20) c.lineTo(x, hz.y + 18 + i * 8 + Math.sin(x * 0.04 + i * 2) * 12 + (Math.abs(x - 500) < 80 ? -whip : 0));
      c.stroke();
    });
  },
  tesla(c, hz, t, p) {
    const cx = hz.x + hz.w / 2;
    rr(c, cx - 50, hz.y + hz.h - 50, 100, 50, 8); fillStroke(c, '#444');
    c.fillStyle = '#b87333'; c.fillRect(cx - 20, hz.y + 80, 40, hz.h - 130);
    c.strokeStyle = '#8a5222'; c.lineWidth = 2; for (let y = hz.y + 84; y < hz.y + hz.h - 50; y += 6) { c.beginPath(); c.moveTo(cx - 20, y); c.lineTo(cx + 20, y + 3); c.stroke(); }
    ellipse(c, cx, hz.y + 60, 56, 30); fillStroke(c, '#d0d6dc');
    if (p >= 0 || Math.sin(t * 9) > 0.7) lightning(c, cx, hz.y + 40, cx + (Math.random() - 0.5) * 200, hz.y - 40, t);
    if (p > 0.2 && p < 0.85) { lightning(c, cx + 50, hz.y + 60, 470, 360, t); lightning(c, cx + 50, hz.y + 60, 520, 250, t + 1); }
  },
  magnet(c, hz, t, p) {
    const cx = hz.x + hz.w / 2, cy = hz.y + hz.h / 2;
    c.save(); c.translate(cx, cy); c.rotate(Math.PI / 2 + (p >= 0 ? Math.sin(t * 40) * 0.05 : 0));
    c.lineWidth = 34; c.strokeStyle = '#e53935'; c.beginPath(); c.arc(0, 0, 40, Math.PI, 0); c.stroke();
    c.fillStyle = '#ddd'; c.fillRect(-57, 0, 34, 26); c.fillRect(23, 0, 34, 26);
    c.lineWidth = 4; c.strokeStyle = OUT; c.beginPath(); c.arc(0, 0, 57, Math.PI, 0); c.arc(0, 0, 23, 0, Math.PI, true); c.stroke();
    c.restore();
    if (p > 0.05 && p < 0.7) { c.save(); c.strokeStyle = 'rgba(120,200,255,.7)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { const r = ((t * 200 + i * 60) % 240); c.beginPath(); c.arc(cx - 40, cy + 20, r, Math.PI * 0.6, Math.PI * 1.2); c.stroke(); } c.restore(); }
  },
  banana(c, hz, t, p) {
    let x = hz.x + hz.w / 2, y = hz.y + hz.h / 2, r = 0.2;
    if (p >= 0) { const k = Math.min(1, p / 0.3); x = x + (510 - x) * k; y = y + (640 - y) * k; if (p > 0.35) { const k2 = (p - 0.35) / 0.65; x = 510 - k2 * 300; y = 640 - Math.sin(k2 * Math.PI) * 200; r = k2 * 14; } }
    c.save(); c.translate(x, y); c.rotate(r);
    c.beginPath(); c.moveTo(-40, 0); c.quadraticCurveTo(0, 26, 40, 0); c.quadraticCurveTo(0, 12, -40, 0); fillStroke(c, '#ffe135', OUT, 4);
    c.beginPath(); c.moveTo(-10, 6); c.quadraticCurveTo(-30, -20, -44, -14); c.quadraticCurveTo(-28, -6, -20, 10); fillStroke(c, '#ffe135', OUT, 3);
    c.beginPath(); c.moveTo(10, 6); c.quadraticCurveTo(30, -18, 46, -12); c.quadraticCurveTo(30, -4, 20, 10); fillStroke(c, '#ffe135', OUT, 3);
    c.fillStyle = '#6b4f1d'; c.fillRect(-4, 8, 8, 6);
    c.restore();
  },
};

export function sparks(c, x, y, t, n) {
  c.save(); c.strokeStyle = '#fff59d'; c.lineWidth = 3; c.shadowColor = '#ffeb3b'; c.shadowBlur = 12;
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, l = 10 + Math.random() * 22; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  c.restore();
}
export function lightning(c, x1, y1, x2, y2, t) {
  c.save(); c.shadowColor = '#7fdcff'; c.shadowBlur = 20;
  for (let pass = 0; pass < 2; pass++) {
    c.strokeStyle = pass ? '#ffffff' : '#7fdcff'; c.lineWidth = pass ? 3 : 8;
    c.beginPath(); c.moveTo(x1, y1);
    const n = 9;
    for (let i = 1; i < n; i++) { const k = i / n; c.lineTo(x1 + (x2 - x1) * k + (Math.random() - 0.5) * 50, y1 + (y2 - y1) * k + (Math.random() - 0.5) * 50); }
    c.lineTo(x2, y2); c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- ICON RENDERING (for store cards)
const iconCache = new Map();
export function icon(kind, id, w = 160, h = 120, extra) {
  const key = kind + ':' + id + ':' + w + 'x' + h + ':' + (extra || '');
  if (iconCache.has(key)) return iconCache.get(key);
  const cv = document.createElement('canvas');
  const dpr = 2; cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  if (kind === 'weapon') { c.translate(w / 2, h / 2); const s = Math.min(w, h) / 80; c.scale(s, s); drawWeapon(c, id, 0.3); }
  else if (kind === 'boss') { const b = extra; c.translate(w / 2, h * 0.98); const s = h / 340; c.scale(s, s); c.translate(0, 300); drawBoss(c, b.look, 'none', { x: 0, y: 0, face: 'angry', t: 0 }); }
  else if (kind === 'hat') { c.translate(w / 2, h * 0.95); const s = h / 200; c.scale(s, s); if (id === 'none') { c.strokeStyle = '#b08968'; c.lineWidth = 8; circle(c, 0, -90, 50); c.stroke(); c.beginPath(); c.moveTo(-35, -55); c.lineTo(35, -125); c.stroke(); } else drawHat(c, id, 0, -20, 0.2); }
  else if (kind === 'room') {
    const r = extra; const s = Math.min(w / 1000, h / 700) * 1.0;
    c.save(); c.translate((w - 1000 * s) / 2, (h - 700 * s) / 2); c.scale(s, s);
    c.beginPath(); c.rect(-200, -100, 1400, 900); c.clip();
    drawRoom(c, r, 1, null); r.hazards.forEach(hz => drawHazard(c, hz, 1, -1, false));
    c.restore();
  }
  const url = cv.toDataURL();
  iconCache.set(key, url);
  return url;
}

// Force-field bubble around the boss. frac = remaining shield 0..1, hitFlash 0..1
export function drawShield(c, x, y, frac, t, hitFlash) {
  const r = 270;
  c.save();
  c.translate(x, y);
  const g = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r);
  g.addColorStop(0, 'rgba(120,230,255,0.04)'); g.addColorStop(0.85, `rgba(120,230,255,${0.18 + hitFlash * 0.3})`); g.addColorStop(1, `rgba(200,250,255,${0.55 + hitFlash * 0.4})`);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill();
  // hex grid
  c.save(); c.clip();
  c.globalAlpha = 0.18 + hitFlash * 0.4; c.strokeStyle = '#b8f4ff'; c.lineWidth = 2;
  const hs = 34;
  for (let row = -9; row <= 9; row++) for (let col = -6; col <= 6; col++) {
    const hx = col * hs * 1.5, hy = row * hs * 0.866 * 2 + (col % 2 ? hs * 0.866 : 0) + Math.sin(t * 2) * 4;
    c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.lineTo(hx + Math.cos(a) * hs * 0.95, hy + Math.sin(a) * hs * 0.95); } c.closePath(); c.stroke();
  }
  c.restore();
  // cracks grow as the shield weakens
  const cracks = Math.floor((1 - frac) * 9);
  const rnd = srand(42);
  c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.globalAlpha = 0.85;
  for (let i = 0; i < cracks; i++) {
    let a = rnd() * TAU, px = Math.cos(a) * r, py = Math.sin(a) * r;
    c.beginPath(); c.moveTo(px, py);
    for (let j = 0; j < 4; j++) { a += (rnd() - 0.5) * 0.8; px -= Math.cos(a) * 40; py -= Math.sin(a) * 40; c.lineTo(px, py); }
    c.stroke();
  }
  c.globalAlpha = 1; c.lineWidth = 5; c.strokeStyle = `rgba(220,252,255,${0.7 + Math.sin(t * 6) * 0.2})`;
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.restore();
}

// Wall crack / floor dent decal
export function drawCrack(c, k) {
  c.save(); c.translate(k.x, k.y); c.rotate(k.rot);
  const rnd = srand(k.seed);
  c.strokeStyle = 'rgba(40,25,15,.75)'; c.lineWidth = 4; c.lineCap = 'round';
  const n = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    let a = (i / n) * TAU + rnd() * 0.5, px = 0, py = 0;
    c.beginPath(); c.moveTo(0, 0);
    for (let j = 0; j < 3; j++) { a += (rnd() - 0.5) * 0.9; const l = k.size * (0.3 + rnd() * 0.4); px += Math.cos(a) * l; py += Math.sin(a) * l * (k.floor ? 0.35 : 1); c.lineTo(px, py); }
    c.stroke();
  }
  c.fillStyle = 'rgba(40,25,15,.25)'; c.beginPath(); c.ellipse(0, 0, k.size * 0.35, k.size * (k.floor ? 0.12 : 0.35), 0, 0, TAU); c.fill();
  c.restore();
}

// Generic boss drawn from a look object into a canvas (used by the custom boss editor)
export function drawBossPreview(cv, look, hat) {
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  const s = cv.height / 620;
  c.translate(cv.width / 2, cv.height * 0.98); c.scale(s, s);
  drawBoss(c, look, hat || 'none', { x: 0, y: 0, face: 'angry', t: 0 });
}
