// ===== Beat Boss Bob — game engine =====
import { WEAPONS, BOSSES, ROOMS, UPGRADES, QUEST_TYPES, ACHIEVEMENTS, EVENTS, GENERIC_HIT, KO_LINES, PARTS } from './data.js';
import { drawRoom, drawHazard, drawBoss, drawWeapon, drawShield, drawCrack, HEAD, BODY, rr, lightning, sparks } from './render.js';
import { sfx, buzz, unlockAudio } from './audio.js';
import { save } from './save.js';

export const byId = (arr, id) => arr.find(x => x.id === id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rot = (x, y, th) => ({ x: x * Math.cos(th) - y * Math.sin(th), y: x * Math.sin(th) + y * Math.cos(th) });
const normAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
// Boss physics body: centre of mass and collision circles, in boss-local coords (feet = 0,0)
const COM = { x: 0, y: -230 };
const SAMPLES = [{ x: 0, y: -380, r: 115, head: true }, { x: 0, y: -190, r: 100 }, { x: 0, y: -35, r: 50 }];
export const fmt = n => {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('en-US');
  const u = ['K', 'M', 'B', 'T', 'Qa'];
  let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
};

// hazard animation timings: duration (s), hit moment (fraction), boss reaction
const HZT = {
  lamp: [1.6, 0.35, 'zap', 'zap'], printer: [1.6, 0.45, 'soot', 'crash'], cooler: [1.4, 0.75, 'wet', 'splash'],
  sensor: [2.4, 0.55, 'tackle', 'alarm'], tvwall: [1.4, 0.5, 'bonk', 'crash'], drone: [1.6, 0.6, 'bonk', 'whoosh'],
  microwave: [1.6, 0.42, 'hurt', 'pop'], coffeemac: [1.4, 0.32, 'burn', 'steam'], fridge: [1.6, 0.72, 'bonk', 'splat'],
  fan: [1.8, 0.55, 'bonk', 'whoosh'], projector: [1.6, 0.4, 'dizzy', 'whoosh'], chairz: [1.6, 0.4, 'spin', 'whoosh'],
  rack: [1.4, 0.3, 'zap', 'zap'], sprinkler: [2.0, 0.3, 'wet', 'alarm'], cable: [1.4, 0.4, 'trip', 'slip'],
  tesla: [1.6, 0.3, 'zap', 'zap'], magnet: [1.6, 0.45, 'yank', 'clunk'], banana: [1.4, 0.3, 'trip', 'slip'],
};

export class Game {
  constructor(canvas, state) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.s = state;
    this.hooks = {};                 // ui callbacks
    this.t = 0; this.last = performance.now();
    this.proj = []; this.parts = []; this.floaters = []; this.decor = [];
    this.bubble = null; this.banner = null; this.shake = 0; this.flash = 0;
    this.combo = 0; this.lastHit = -10; this.comboShow = 0;
    this.rage = 0; this.rageT = 0; this.rageTick = 0;
    this.internT = 0; this.internAnim = 0;
    this.hz = {};                    // hazard id -> {cd, anim}
    this.cracks = []; this.pose = null; this.challenge = null; this.shieldFlash = 0;
    this.event = null; this.eventTimer = rand(18, 30);
    this.pointer = null;
    this.topPad = 100; this.botPad = 70;
    this.setupBoss(true);
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(n => this.loop(n));
  }

  // ---------------------------------------------------- derived stats
  get weapon() { return byId(WEAPONS, this.s.weapon); }
  get bossDef() { return byId(BOSSES, this.s.boss); }
  get room() { return byId(ROOMS, this.s.room); }
  get bossLv() { return this.s.bosses[this.s.boss] || 1; }
  up(id) { return this.s.upgrades[id] || 0; }
  weaponMult(id = this.s.weapon) { return 1 + 0.25 * (this.s.weapons[id] || 0); }
  bossMaxHp() { return Math.round(this.bossDef.hp * Math.pow(1.35, this.bossLv - 1)); }
  bossCoinMult() { return this.bossDef.mult * Math.pow(1.12, this.bossLv - 1); }
  critChance() { return 0.05 + 0.02 * this.up('crit'); }
  comboWindow() { return 0.75 + 0.08 * this.up('combo'); }
  rageDur() { return 6 + this.up('rage'); }
  hazardCd(hz) { return hz.cd * (1 - 0.06 * this.up('hazard')); }
  internRate() { return this.up('intern') * 0.45; }
  idleRate() { return this.up('idle') * 6 * this.bossDef.mult; }   // coins / minute
  gemChance() { return 0.004 + 0.0015 * this.up('luck'); }
  upgradeCost(u) { return Math.round(u.base * Math.pow(u.growth, this.up(u.id))); }
  weaponUpCost(w) { const lv = this.s.weapons[w.id] || 0; const base = w.cur === 'gem' ? 4000 : Math.max(60, w.price * 0.6); return Math.round(base * Math.pow(1.55, lv)); }

  // ---------------------------------------------------- boss lifecycle
  setupBoss(restoreHp) {
    this.maxHp = this.bossMaxHp();
    this.hp = restoreHp && this.s.bossHp != null && this.s.bossHp > 0 ? Math.min(this.s.bossHp, this.maxHp) : this.maxHp;
    this.b = { x: 500, y: 650, face: 'angry', react: null, ko: null, bruises: [], darts: [], splats: [], wet: 0, char: 0, red: 0, hitT: -1, hitDir: 0, enter: 1, phys: null, shield: 0, shieldMax: 0 };
    this.pose = null;
    this.hz = {};
    this.room.hazards.forEach(h => this.hz[h.id] = { cd: 0, anim: null });
    this.maybeShield(true);
  }

  // Force field on every 3rd level (from Lv 3): blocks damage, broken by number of hits, not damage
  maybeShield(quiet) {
    const lv = this.bossLv, b = this.b;
    if (lv >= 3 && lv % 3 === 0 && !this.challenge) {
      b.shieldMax = 10 + lv * 2; b.shield = b.shieldMax;
      if (!quiet) this.banner = { text: 'FORCE FIELD!', sub: 'Lots of fast hits break it — pencils are great', t: 0, dur: 2.4, small: true };
    } else { b.shield = 0; b.shieldMax = 0; }
  }
  chipShield(n, x, y) {
    const b = this.b; if (b.shield <= 0) return false;
    b.shield = Math.max(0, b.shield - n); this.shieldFlash = 1;
    if (b.shield <= 0) {
      this.banner = { text: 'SHIELD BROKEN!', sub: '', t: 0, dur: 1.4, small: true };
      sfx('crash'); buzz([30, 30, 50]); this.shake = 16;
      const c = this.worldOf(0, -260);
      for (let i = 0; i < 26; i++) { const a = rand(0, 6.28), sp = rand(300, 800); this.parts.push({ type: 'shard', x: c.x + Math.cos(a) * 250, y: c.y + Math.sin(a) * 250, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, g: 1200, t: 0, dur: rand(0.6, 1.1), rot: rand(0, 6), vr: rand(-14, 14), size: rand(10, 22) }); }
      this.s.stats.shields++; this.checkQuest();
    } else if (Math.random() < 0.3) this.floatText(x, y, 'BLOCKED', '#9fefff', 26);
    return true;
  }
  switchBoss(id) { this.s.boss = id; this.s.bossHp = null; this.setupBoss(false); this.say(pick(this.bossDef.quotes), 2); }
  switchRoom(id) { this.s.room = id; this.cracks = []; this.hz = {}; this.room.hazards.forEach(h => this.hz[h.id] = { cd: 0, anim: null }); }

  // ---------------------------------------------------- layout
  resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.cw = r.width; this.ch = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    const top = this.hooks.topPad ? this.hooks.topPad() : 100;
    const bot = this.hooks.botPad ? this.hooks.botPad() : 70;
    const avH = Math.max(100, this.ch - top - bot);
    this.topPx = top; this.botPx = bot;
    this.scale = Math.min(this.cw / 760, avH / 660);
    this.ox = this.cw / 2 - 500 * this.scale;
    this.oy = top + avH / 2 - 370 * this.scale;
  }
  toWorld(px, py) { return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale }; }

  // ---------------------------------------------------- input
  bindInput() {
    const cv = this.cv;
    const pt = e => { const r = cv.getBoundingClientRect(); return this.toWorld(e.clientX - r.left, e.clientY - r.top); };
    cv.addEventListener('pointerdown', e => {
      unlockAudio();
      e.preventDefault();
      const p = pt(e);
      if (this.pointer) { this.tap(p.x, p.y); return; }   // extra fingers = rapid taps
      const part = this.hitTest(p.x, p.y);
      this.pointer = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, t: this.t, hist: [{ x: p.x, y: p.y, t: this.t }], part, local: part ? this.toLocal(p.x, p.y) : null, drag: false };
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    });
    cv.addEventListener('pointermove', e => {
      const P = this.pointer;
      if (!P || e.pointerId !== P.id) return;
      const p = pt(e);
      P.x = p.x; P.y = p.y;
      P.hist.push({ x: p.x, y: p.y, t: this.t });
      if (P.hist.length > 6) P.hist.shift();
      // grabbing the boss: press on him and move
      if (P.part && !P.drag && Math.hypot(P.x - P.sx, P.y - P.sy) > 14) this.startDrag(P);
    });
    const end = e => {
      const P = this.pointer; if (!P || e.pointerId !== P.id) return;
      this.pointer = null;
      if (P.drag) { P.drag = false; this.releaseDrag(); return; }
      const dx = P.x - P.sx, dy = P.y - P.sy, dist = Math.hypot(dx, dy);
      if (dist > 45) {
        // fling: velocity from recent history
        const h = P.hist, a = h[0], b = h[h.length - 1];
        const dt = Math.max(0.016, b.t - a.t);
        let vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
        const sp = Math.hypot(vx, vy); const max = 2600;
        if (sp > max) { vx *= max / sp; vy *= max / sp; }
        if (sp < 400) { vx *= 400 / sp; vy *= 400 / sp; }
        this.fling(P.x, P.y, vx, vy);
      } else this.tap(P.x, P.y);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', e => { const P = this.pointer; this.pointer = null; if (P && P.drag) this.releaseDrag(); });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); unlockAudio(); const h = this.worldOf(0, -380); this.tap(h.x, h.y); } });
  }

  // ---------------------------------------------------- boss physics (grab, swing, throw, slam)
  toLocal(x, y) {
    const P = this.pose || this.bossPose();
    const dx = x - P.x, dy = y - P.y, c = Math.cos(P.tilt), s = Math.sin(P.tilt);
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }
  worldOf(lx, ly) {
    const P = this.pose || this.bossPose();
    const o = rot(lx, ly, P.tilt);
    return { x: P.x + o.x, y: P.y + o.y };
  }
  bounds() {
    const tl = this.toWorld(0, (this.topPx || 100) * 0.55), br = this.toWorld(this.cw, this.ch);
    return { left: Math.max(-900, tl.x + 10), right: Math.min(1900, br.x - 10), ceil: Math.max(-700, tl.y), floor: 652 };
  }
  startDrag(P) {
    const b = this.b;
    const pose = this.bossPose();
    const th = b.phys && b.phys.mode !== 'getup' ? b.phys.th : pose.tilt;
    const c = rot(COM.x, COM.y, th);
    b.phys = { mode: 'drag', th, w: b.phys ? b.phys.w || 0 : 0, grab: P.local, cx: pose.x + c.x, cy: pose.y + c.y, vx: 0, vy: 0, px: P.x, py: P.y, pvx: 0, pvy: 0, rest: 0, air: 0, slamCd: {} };
    b.react = null;
    P.drag = true;
    if (!b.ko) this.say(pick(['Put me down!', 'HR will hear about this!', 'Unhand me!', 'Whoa whoa whoa!', 'This is NOT team building!']), 1.3);
    sfx('whoosh'); buzz(10);
  }
  releaseDrag() {
    const ph = this.b.phys; if (!ph || ph.mode !== 'drag') return;
    let vx = ph.pvx, vy = ph.pvy; const sp = Math.hypot(vx, vy), max = 3800;
    if (sp > max) { vx *= max / sp; vy *= max / sp; }
    const r = rot(COM.x - ph.grab.x, COM.y - ph.grab.y, ph.th);
    ph.vx = vx - ph.w * r.y; ph.vy = vy + ph.w * r.x;
    ph.mode = 'fly'; ph.rest = 0; ph.air = 0;
    if (sp > 900) { if (!this.b.ko) this.say(pick(['AAAAAH!', 'Weeeee—NO!', 'I\'m flyyyiiing!', 'Not the window!', 'MY TOUPEE!']), 1.2); sfx('whoosh'); }
  }
  physPoints(ph) {
    return SAMPLES.map(sp => { const o = rot(sp.x - COM.x, sp.y - COM.y, ph.th); return { sp, o, x: ph.cx + o.x, y: ph.cy + o.y }; });
  }
  physStep(dt) {
    const b = this.b, ph = b.phys; if (!ph) return;
    for (const k in ph.slamCd) ph.slamCd[k] -= dt;
    const G = 2200, B = this.bounds();
    if (ph.mode === 'drag') {
      const P = this.pointer;
      if (!P || !P.drag) { this.releaseDrag(); return; }
      // smoothed pointer velocity + acceleration drive a pendulum hanging from the grab point
      const nvx = (P.x - ph.px) / dt, nvy = (P.y - ph.py) / dt;
      const a = Math.min(1, dt * 20);
      const npvx = ph.pvx + (nvx - ph.pvx) * a, npvy = ph.pvy + (nvy - ph.pvy) * a;
      let ax = (npvx - ph.pvx) / dt, ay = (npvy - ph.pvy) / dt;
      const am = Math.hypot(ax, ay); if (am > 26000) { ax *= 26000 / am; ay *= 26000 / am; }
      ph.pvx = npvx; ph.pvy = npvy; ph.px = P.x; ph.py = P.y;
      let r = rot(COM.x - ph.grab.x, COM.y - ph.grab.y, ph.th);
      const L2 = Math.max(3000, r.x * r.x + r.y * r.y);
      ph.w += ((r.x * (G - ay) + r.y * ax) / L2) * dt;
      ph.w = clamp(ph.w * Math.pow(0.3, dt), -18, 18);
      ph.th += ph.w * dt;
      r = rot(COM.x - ph.grab.x, COM.y - ph.grab.y, ph.th);
      ph.cx = P.x + r.x; ph.cy = P.y + r.y;
      // smacking him into walls / floor while holding him still hurts
      const speed = Math.hypot(ph.pvx, ph.pvy);
      if (speed > 800) for (const q of this.physPoints(ph)) {
        if (q.y + q.sp.r > B.floor && ph.pvy > 500 && !(ph.slamCd.floor > 0)) { ph.slamCd.floor = 0.25; this.slam(ph.pvy, q.x, B.floor, 'floor', q.sp); }
        if (q.x - q.sp.r < B.left && ph.pvx < -500 && !(ph.slamCd.left > 0)) { ph.slamCd.left = 0.25; this.slam(-ph.pvx, B.left, q.y, 'left', q.sp); }
        if (q.x + q.sp.r > B.right && ph.pvx > 500 && !(ph.slamCd.right > 0)) { ph.slamCd.right = 0.25; this.slam(ph.pvx, B.right, q.y, 'right', q.sp); }
        if (q.y - q.sp.r < B.ceil && ph.pvy < -500 && !(ph.slamCd.ceil > 0)) { ph.slamCd.ceil = 0.25; this.slam(-ph.pvy, q.x, B.ceil, 'ceil', q.sp); }
      }
      return;
    }
    if (ph.mode === 'getup') {
      ph.gt += dt; const k = Math.min(1, ph.gt / 0.6), e = k * k * (3 - 2 * k);
      ph.th = ph.th0 * (1 - e); ph.fx = ph.x0 + (ph.x1 - ph.x0) * e; ph.fy = ph.y0 + (650 - ph.y0) * e - Math.sin(k * Math.PI) * 60;
      if (k >= 1) { b.x = ph.x1; b.phys = null; b.face = 'angry'; this.pose = null; if (!b.ko) this.say(pick(['You\'re FIRED!', 'That\'s it, no bonus!', 'My spine!', 'I\'m calling legal!']), 1.6); }
      return;
    }
    // free flight / resting on the floor
    ph.air += dt;
    ph.vy += G * dt;
    ph.cx += ph.vx * dt; ph.cy += ph.vy * dt; ph.th += ph.w * dt;
    ph.w *= Math.pow(0.75, dt);
    let grounded = false;
    for (const q of this.physPoints(ph)) {
      const { sp, o } = q; let px = ph.cx + o.x, py = ph.cy + o.y;
      const vpx = ph.vx - ph.w * o.y, vpy = ph.vy + ph.w * o.x;
      if (py + sp.r > B.floor) { ph.cy -= py + sp.r - B.floor; grounded = true; if (vpy > 0) this.bounce(ph, o, 0, -1, vpy, px, B.floor, 'floor', sp); }
      if (py - sp.r < B.ceil) { ph.cy += B.ceil - (py - sp.r); if (vpy < 0) this.bounce(ph, o, 0, 1, -vpy, px, B.ceil, 'ceil', sp); }
      if (px - sp.r < B.left) { ph.cx += B.left - (px - sp.r); if (vpx < 0) this.bounce(ph, o, 1, 0, -vpx, B.left, py, 'left', sp); }
      if (px + sp.r > B.right) { ph.cx -= px + sp.r - B.right; if (vpx > 0) this.bounce(ph, o, -1, 0, vpx, B.right, py, 'right', sp); }
    }
    // flying into a room hazard sets it off
    const spd = Math.hypot(ph.vx, ph.vy);
    if (spd > 450 && ph.mode === 'fly') {
      const pts = this.physPoints(ph);
      for (const hz of this.room.hazards) {
        const st = this.hz[hz.id]; if (!st || st.anim || st.cd > 0) continue;
        if (pts.some(q => q.x + q.sp.r * 0.6 > hz.x && q.x - q.sp.r * 0.6 < hz.x + hz.w && q.y + q.sp.r * 0.6 > hz.y && q.y - q.sp.r * 0.6 < hz.y + hz.h)) this.hazardSmash(hz, spd);
      }
    }
    if (grounded && spd < 90 && Math.abs(ph.w) < 1.5) ph.rest += dt; else ph.rest = 0;
    if (ph.mode === 'fly' && (ph.rest > 0.35 || ph.air > 8)) {
      if (b.ko) { ph.mode = 'rest'; ph.vx = 0; ph.w = 0; }
      else this.startGetup();
    }
  }
  bounce(ph, o, nx, ny, vn, x, y, surf, sp) {
    const I = 22000, e = surf === 'floor' ? 0.38 : 0.5;
    const rxn = o.x * ny - o.y * nx;
    const j = (1 + e) * vn / (1 + rxn * rxn / I);
    ph.vx += j * nx; ph.vy += j * ny; ph.w += j * rxn / I;
    if (nx === 0) ph.vx *= 0.84; else ph.vy *= 0.9;
    ph.w = clamp(ph.w * 0.92, -20, 20);
    if (vn > 420 && !(ph.slamCd[surf] > 0)) { ph.slamCd[surf] = 0.18; this.slam(vn, x, y, surf, sp); }
  }
  startGetup() {
    const b = this.b, ph = b.phys; if (!ph) return;
    const o = rot(-COM.x, -COM.y, ph.th);
    const fx = ph.cx + o.x, fy = ph.cy + o.y;
    b.phys = { mode: 'getup', gt: 0, th: normAngle(ph.th), th0: normAngle(ph.th), x0: fx, y0: Math.min(650, fy), x1: clamp(fx, 240, 760), fx, fy, w: 0, slamCd: {} };
  }
  slam(speed, x, y, surf, sp) {
    const b = this.b, w = this.weapon;
    const power = clamp(speed / 1800, 0.25, 1.7);
    this.s.stats.slams++;
    if (this.t - this.lastHit < this.comboWindow() + 0.5) this.combo++; else this.combo = 1;
    this.lastHit = this.t; this.comboShow = 1.2;
    if (this.combo > this.s.stats.bestCombo) this.s.stats.bestCombo = this.combo;
    if (this.combo > (this.s.quest.best || 0)) this.s.quest.best = this.combo;
    if (this.rageT <= 0) this.rage = clamp(this.rage + 0.03 * power, 0, 1);
    const label = power > 1.1 ? pick(['MEGA SLAM!', 'KA-BOOM!', 'CRUNCH!', 'SPLAT!']) : power > 0.6 ? pick(['SLAM!', 'WHAM!', 'BONK!', 'THWACK!']) : pick(['Thud!', 'Bonk!', 'Oof!']);
    this.floatText(x, y + (surf === 'floor' ? -50 : surf === 'ceil' ? 50 : 0), label, '#ff8a3d', 30 + power * 18);
    // dust puff at the impact point
    for (let i = 0; i < 6 + power * 8; i++) {
      const a = surf === 'floor' ? rand(Math.PI, Math.PI * 2) : surf === 'ceil' ? rand(0, Math.PI) : surf === 'left' ? rand(-1.4, 1.4) : rand(Math.PI - 1.4, Math.PI + 1.4);
      const v = rand(120, 380) * power;
      this.parts.push({ type: 'dust', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: -60, t: 0, dur: rand(0.4, 0.8), size: rand(14, 30) * (0.6 + power * 0.4) });
    }
    if ((surf !== 'floor' && speed > 850) || speed > 1500) {
      this.cracks.push({ x, y, rot: rand(0, 6), size: 50 + power * 50, seed: Math.floor(Math.random() * 9999), floor: surf === 'floor' });
      if (this.cracks.length > 14) this.cracks.shift();
    }
    if (sp && sp.head && Math.random() < 0.6) { b.bruises.push({ x: rand(-70, 70), y: HEAD.y + rand(-70, 60), rot: rand(-1, 1) }); if (b.bruises.length > 9) b.bruises.shift(); }
    sfx(power > 1 ? 'boom' : 'clunk'); if (power > 1.2) sfx('crash');
    buzz(power > 1 ? [30, 20, 40] : 18);
    this.shake = Math.max(this.shake, 5 + power * 14);
    b.hitT = this.t;
    if (b.ko) { this.addCoins(Math.max(1, Math.round(w.coin * this.bossCoinMult()))); return; }
    const comboMult = 1 + Math.min(this.combo, 100) * 0.02;
    const coins = Math.max(2, Math.round(w.coin * this.weaponMult() * this.bossCoinMult() * (2 + power * 3) * comboMult * (this.rageT > 0 ? 2 : 1)));
    if (b.shield > 0) { this.chipShield(2 + power * 2, x, y); this.addCoins(Math.round(coins * 0.4)); this.floatText(x, y - 30, '+' + fmt(coins * 0.4), '#ffe14d', 26, true); this.checkQuest(); return; }
    const dmg = (w.dmg * this.weaponMult() * 2 + this.maxHp * 0.025) * power;
    this.damage(dmg, coins, x, y);
    this.checkQuest();
  }
  hazardSmash(hz, spd) {
    const b = this.b, st = this.hz[hz.id];
    st.cd = this.hazardCd(hz) * 0.7;
    const [, , react, snd] = HZT[hz.id];
    sfx(snd); sfx('crash'); buzz([30, 30, 60]);
    this.s.stats.hazards++;
    if (react === 'zap') { b.char = Math.min(1, b.char + 0.7); b.react = { type: 'zap', t: 0, dur: 0.5 }; }
    if (react === 'soot') b.char = Math.min(1, b.char + 0.9);
    if (react === 'wet') b.wet = 1;
    if (react === 'burn') b.red = 1;
    const ph = b.phys, cx = ph.cx, cy = ph.cy;
    this.floatText(hz.x + hz.w / 2, hz.y + hz.h / 2, `${hz.name.toUpperCase()} SMASH!`, '#ffde3b', 36);
    for (let i = 0; i < 16; i++) { const a = rand(0, 6.28), v = rand(200, 600); this.parts.push({ type: react === 'zap' ? 'spark' : 'bit', color: react === 'wet' ? '#6ec6ff' : '#fff59d', x: hz.x + hz.w / 2, y: hz.y + hz.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, t: 0, dur: rand(0.4, 0.8), rot: rand(0, 6), vr: rand(-10, 10), size: rand(6, 12) }); }
    this.shake = 22; this.flash = react === 'zap' ? 0.45 : 0.15;
    ph.vy = -Math.abs(ph.vy) * 0.4 - 350; ph.vx *= -0.35; ph.w += rand(-7, 7);
    const coins = Math.round(this.weapon.coin * this.weaponMult() * this.bossCoinMult() * 18 + 30);
    this.coinPop(cx, cy, 8);
    if (b.ko) { this.addCoins(coins); this.checkQuest(); return; }
    if (b.shield > 0) { this.chipShield(6, cx, cy); this.addCoins(coins); this.checkQuest(); return; }
    this.damage(this.maxHp * hz.dmg * 0.8, coins, cx, cy - 100);
    this.checkQuest();
  }

  // ---------------------------------------------------- daily timed challenge
  challengeDone() { return this.s.challenge.last === todayStr(); }
  startChallenge() {
    if (this.b.ko || this.challenge) return false;
    this.challenge = { t: 0, limit: 45, boss: this.s.boss };
    this.hp = this.maxHp; this.b.shield = 0; this.b.shieldMax = 0;
    this.banner = { text: 'BEAT THE CLOCK!', sub: `KO ${this.bossDef.name} in 45 seconds`, t: 0, dur: 2, small: true };
    sfx('alarm');
    return true;
  }

  tap(x, y) {
    // golden envelope?
    if (this.event && this.event.id === 'gift' && this.event.pos) {
      const g = this.event.pos;
      if (Math.hypot(x - g.x, y - g.y) < 70) return this.collectGift();
    }
    // hazards
    for (const hz of this.room.hazards) {
      const pad = 24;
      if (x > hz.x - pad && x < hz.x + hz.w + pad && y > hz.y - pad && y < hz.y + hz.h + pad) {
        const st = this.hz[hz.id];
        if (st && st.cd <= 0 && !st.anim && !this.b.ko) { this.triggerHazard(hz); return; }
        if (st && st.cd > 0) this.floatText(hz.x + hz.w / 2, hz.y, `${Math.ceil(st.cd)}s`, '#fff', 26);
      }
    }
    if (this.b.ko) return;
    const part = this.hitTest(x, y);
    let tx, ty;
    if (part) { tx = x; ty = y; }
    else {
      let lx, ly;
      if (Math.random() < 0.6) { const a = rand(0, Math.PI * 2), d = rand(0, 90); lx = Math.cos(a) * d; ly = HEAD.y + Math.sin(a) * d; }
      else { lx = rand(-90, 90); ly = rand(-260, -110); }
      const q = this.worldOf(lx, ly); tx = q.x; ty = q.y;
    }
    this.throwAt(tx, ty, this.s.weapon);
  }

  hitTest(x, y) {
    const l = this.toLocal(x, y);
    if (Math.hypot(l.x - HEAD.x, l.y - HEAD.y) < HEAD.r + 18) return 'head';
    if (l.x > BODY.x - 10 && l.x < BODY.x + BODY.w + 10 && l.y > BODY.y && l.y < 5) return 'body';
    return null;
  }

  throwAt(tx, ty, wid, opts = {}) {
    const fromLeft = opts.fromX != null ? opts.fromX < 500 : Math.random() < 0.5;
    const sx = opts.fromX ?? (fromLeft ? rand(80, 280) : rand(720, 920));
    const sy = opts.fromY ?? 820;
    this.proj.push({ kind: 'tap', wid, sx, sy, tx, ty, lt: this.toLocal(tx, ty), cx: (sx + tx) / 2, cy: Math.min(sy, ty) - rand(120, 220), t: 0, dur: opts.dur || 0.24, rot: rand(0, 6), intern: !!opts.intern, rage: !!opts.rage });
    if (!opts.intern) sfx('whoosh');
  }

  fling(x, y, vx, vy) {
    if (this.b.ko) return;
    this.proj.push({ kind: 'fling', wid: this.s.weapon, x, y, vx, vy, rot: 0, t: 0 });
    sfx('whoosh');
  }

  // ---------------------------------------------------- hits & economy
  hit(x, y, wid, o = {}) {
    if (this.b.ko) return;
    const w = byId(WEAPONS, wid);
    const part = this.hitTest(x, y) || 'body';
    const isCrit = Math.random() < this.critChance() + (part === 'head' ? 0.05 : 0) + (o.fling ? 0.1 : 0);
    let dmg = w.dmg * this.weaponMult(wid) * (isCrit ? 3 : 1) * (o.fling ? 1.5 : 1) * (o.intern ? 0.5 : 1);
    // combo
    if (!o.intern) {
      if (this.t - this.lastHit < this.comboWindow()) this.combo++; else this.combo = 1;
      this.lastHit = this.t; this.comboShow = 1.2;
      if (this.combo > this.s.stats.bestCombo) this.s.stats.bestCombo = this.combo;
      if (this.combo > (this.s.quest.best || 0)) this.s.quest.best = this.combo;
      if (this.rageT <= 0) this.rage = clamp(this.rage + 0.012 + Math.min(this.combo, 50) * 0.0006, 0, 1);
    }
    const comboMult = 1 + Math.min(this.combo, 100) * 0.02;
    const coins = Math.max(1, Math.round(w.coin * this.weaponMult(wid) * this.bossCoinMult() * comboMult * (this.rageT > 0 ? 2 : 1) * (isCrit ? 2 : 1) * (o.intern ? 0.5 : 1)));
    if (this.b.shield > 0) {
      const c2 = Math.max(1, Math.round(coins * 0.4));
      this.addCoins(c2); this.floatText(x, y - 20, '+' + fmt(c2), '#ffe14d', 26, true);
      this.chipShield((o.fling ? 2 : o.intern ? 0.5 : 1) * (w.fx === 'multi' ? 2 : 1), x, y);
      this.s.stats.hits++;
      this.parts.push({ type: 'star', x, y, t: 0, dur: 0.15, size: 45 });
      sfx('clunk'); buzz(6);
      return;
    }
    if (w.fx === 'multi') { dmg *= 2; this.floatText(x + 40, y - 70, '×2', '#fff', 30); }
    if (w.fx === 'zap') { this.b.char = Math.min(1, this.b.char + 0.2); for (let i = 0; i < 5; i++) { const a = rand(0, 6.28); this.parts.push({ type: 'spark', x, y, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, g: 0, t: 0, dur: 0.3 }); } }
    if (w.fx === 'boom') { this.shake = Math.max(this.shake, 16); for (let i = 0; i < 10; i++) { const a = rand(0, 6.28), v = rand(200, 500); this.parts.push({ type: 'dust', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: -100, t: 0, dur: rand(0.4, 0.7), size: rand(20, 36), color: '#ffb74d' }); } }
    this.damage(dmg, coins, x, y);
    if (Math.random() < 0.003) this.dropPart(x, y);
    this.s.stats.hits++;
    if (isCrit) this.s.stats.crits++;
    if (o.fling && part === 'head') { this.s.stats.tricks++; this.floatText(x, y - 70, 'TRICK SHOT!', '#4dd2ff', 40); }
    if (Math.random() < this.gemChance()) this.dropGem(x, y);

    // reactions & decals (head-local coords)
    const b = this.b;
    b.hitT = this.t; b.hitDir = x < b.x ? 1 : -1;
    if (!b.react || b.react.soft) b.react = { type: 'hit', t: 0, dur: w.heavy ? 0.5 : 0.3, soft: true, heavy: w.heavy };
    const { x: lx, y: ly } = this.toLocal(x, y);
    if (part === 'head' && Math.random() < 0.35) { b.bruises.push({ x: lx, y: ly, rot: rand(-1, 1) }); if (b.bruises.length > 9) b.bruises.shift(); }
    if (w.splat && Math.random() < 0.6) { b.splats.push({ x: lx, y: ly, r: rand(14, 26), color: w.splat, seed: Math.floor(Math.random() * 1000), part }); if (b.splats.length > 10) b.splats.shift(); }
    if (w.sticks && part === 'head') { b.darts.push({ x: lx, y: ly, rot: Math.atan2(ly - HEAD.y, lx) + Math.PI }); if (b.darts.length > 8) b.darts.shift(); }
    if (wid === 'balloon') b.wet = Math.min(1, b.wet + 0.5);
    if (wid === 'coffee') b.red = Math.min(1, b.red + 0.25);

    // fx
    this.burst(x, y, w, isCrit);
    sfx(w.sfx); if (isCrit) sfx('crit');
    buzz(isCrit ? 25 : 8);
    this.shake = Math.max(this.shake, w.heavy ? 14 : isCrit ? 10 : 4);
    if (isCrit) this.floatText(x, y - 40, 'CRIT!', '#ffde3b', 44);
    if (Math.random() < 0.08 && !this.bubble) this.say(Math.random() < 0.5 ? pick(GENERIC_HIT) : pick(this.bossDef.quotes), 1.4);
  }

  damage(dmg, coins, x, y) {
    this.hp -= dmg;
    this.addCoins(coins);
    this.floatText(x + rand(-20, 20), y - 20, '+' + fmt(coins), '#ffe14d', 30, true);
    if (Math.random() < 0.5) this.coinPop(x, y, 1);
    if (this.hp <= 0) this.knockout();
  }

  addCoins(n) { this.s.coins += n; this.s.stats.earned += n; this.checkQuest(); }

  knockout() {
    this.hp = 0;
    const b = this.b;
    b.ko = { t: 0 }; b.react = null; b.face = 'ko';
    this.s.stats.kos++;
    const bonus = Math.round(this.maxHp * 0.9 * this.bossCoinMult() + 50);
    let gems = 0;
    if (Math.random() < 0.35 + 0.03 * this.up('luck')) gems = 1 + (Math.random() < 0.3 ? 1 : 0);
    if (this.bossLv % 5 === 4) gems += 3;               // milestone every 5 levels
    this.addCoins(bonus); this.s.gems += gems;
    const nParts = 1 + (Math.random() < 0.5 ? 1 : 0) + (this.bossLv >= 10 ? 1 : 0);
    for (let i = 0; i < nParts; i++) setTimeout(() => this.dropPart(b.x + rand(-120, 120), 300), 300 + i * 250);
    this.s.koCount = (this.s.koCount || 0) + 1;
    if (this.challenge) {
      const left = this.challenge.limit - this.challenge.t;
      this.challenge = null;
      this.s.challenge.last = todayStr(); this.s.stats.challenges++;
      const cg = 10, cc = bonus * 3;
      this.s.gems += cg; this.addCoins(cc);
      setTimeout(() => this.hooks.toast?.('Challenge complete!', `${left.toFixed(1)}s to spare · +${fmt(cc)} coins +${cg} 💎`), 900);
    } else if (this.s.koCount % 3 === 0) setTimeout(() => this.hooks.briefcase?.(), 1700);
    this.banner = { text: 'K.O.!', sub: `+${fmt(bonus)} coins${gems ? `  +${gems} 💎` : ''}`, t: 0, dur: 2.6 };
    this.coinPop(b.x, b.y - 380, 22);
    this.say(pick(KO_LINES), 2.4);
    sfx('ko'); buzz([40, 60, 80]);
    this.shake = 22; this.flash = 0.6;
    this.combo = 0;
    this.checkQuest();
    this.hooks.changed?.();
  }

  recoverBoss() {
    this.s.bosses[this.s.boss] = this.bossLv + 1;
    this.maxHp = this.bossMaxHp(); this.hp = this.maxHp;
    const b = this.b;
    b.ko = null; b.bruises = []; b.darts = []; b.splats = []; b.wet = 0; b.char = 0; b.red = 0; b.enter = 1; b.face = 'angry';
    if (b.phys && b.phys.mode !== 'getup') { if (b.phys.mode === 'drag') b.phys.mode = 'fly'; this.startGetup(); }
    this.maybeShield();
    this.floatText(500, 120, `${this.bossDef.name} is now Lv ${this.bossLv}!`, '#fff', 34);
    this.say('I\'m back... and ANGRIER!', 2);
    sfx('levelup');
    this.hooks.changed?.();
    save(this.s);
  }

  dropPart(x, y) {
    const part = pick(PARTS);
    this.s.parts[part.id] = (this.s.parts[part.id] || 0) + 1;
    this.floatText(x, y, `+1 ${part.ico} ${part.name}`, '#c8ff8a', 30);
    sfx('coin');
    this.hooks.changed?.();
  }

  dropGem(x, y) {
    this.s.gems += 1;
    this.floatText(x, y - 60, '+1 💎', '#7fe3ff', 34);
    sfx('ding');
    this.hooks.changed?.();
  }

  // ---------------------------------------------------- hazards
  triggerHazard(hz) {
    const [dur, hitAt, react, snd] = HZT[hz.id];
    this.hz[hz.id].anim = { t: 0, dur, hitAt, react, hit: false };
    sfx(snd === 'alarm' ? 'alarm' : 'tap'); buzz(15);
    this.floatText(hz.x + hz.w / 2, hz.y - 10, hz.name + '!', '#fff', 30);
    this.s.stats.hazards++;
    this.checkQuest();
  }

  hazardHit(hz, a) {
    const [, , , snd] = HZT[hz.id];
    sfx(snd); buzz([30, 30, 60]);
    const b = this.b;
    b.react = { type: a.react, t: 0, dur: a.react === 'tackle' || a.react === 'trip' ? 1.3 : 1.1 };
    if (a.react === 'zap') b.char = Math.min(1, b.char + 0.6);
    if (a.react === 'soot') b.char = Math.min(1, b.char + 0.9);
    if (a.react === 'wet') b.wet = 1;
    if (a.react === 'burn') b.red = 1;
    if (hz.id === 'microwave') for (let i = 0; i < 3; i++) b.bruises.push({ x: rand(-70, 70), y: HEAD.y + rand(-60, 60), rot: rand(-1, 1) });
    if (b.bruises.length > 9) b.bruises.splice(0, b.bruises.length - 9);
    let dmg = this.maxHp * hz.dmg;
    const coins = Math.round(this.weapon.coin * this.weaponMult() * this.bossCoinMult() * 14 + 20);
    if (b.shield > 0) { this.chipShield(6, b.x, b.y - 400); dmg = 0; }
    this.shake = 20; this.flash = a.react === 'zap' ? 0.5 : 0.15;
    this.floatText(b.x, b.y - 560, pick(['BZZZT!', 'KA-POW!', 'WHAM!', 'OUCH!', 'CRASH!']), '#ff5c5c', 50);
    this.say(pick(['Who put THAT there?!', 'Call facilities!', 'This is a lawsuit!', 'My suit!!', 'Not again!']), 1.8);
    this.coinPop(b.x, b.y - 380, 8);
    this.damage(dmg, coins, b.x, b.y - 400);
  }

  // ---------------------------------------------------- random events
  startEvent() {
    const ev = Math.random() < 0.22 ? byId(EVENTS, 'gift') : pick(EVENTS.filter(e => e.id !== 'gift'));
    this.event = { id: ev.id, def: ev, t: 0, dur: ev.id === 'gift' ? 7 : ev.id === 'planes' ? 3 : 2.6, hitDone: 0 };
    this.banner = { text: ev.name, sub: ev.id === 'gift' ? 'Tap it quick!' : '', t: 0, dur: 1.8, small: true };
    sfx(ev.id === 'pigeon' ? 'bird' : ev.id === 'cat' ? 'meow' : 'whoosh');
  }
  eventHit(dmgFrac, label, splat) {
    if (this.b.ko || this.b.phys) return;
    const b = this.b;
    b.react = { type: 'hit', t: 0, dur: 0.5, heavy: true };
    if (splat) { b.splats.push({ x: rand(-40, 40), y: HEAD.y + rand(-80, -20), r: 22, color: splat, seed: Math.floor(Math.random() * 999), part: 'head' }); if (b.splats.length > 10) b.splats.shift(); }
    this.floatText(b.x, b.y - 540, label, '#fff', 42);
    sfx('splat'); this.shake = 10;
    const coins = Math.round(this.weapon.coin * this.weaponMult() * this.bossCoinMult() * 6 + 10);
    if (b.shield > 0) { this.chipShield(2, b.x, b.y - 400); dmgFrac = 0; }
    this.damage(this.maxHp * dmgFrac, coins, b.x, b.y - 420);
  }
  collectGift() {
    const g = 1 + Math.floor(Math.random() * 3) + Math.floor(this.up('luck') / 4);
    const coins = Math.round(100 * this.bossCoinMult() * (1 + Math.random()));
    this.s.gems += g; this.addCoins(coins);
    this.floatText(this.event.pos.x, this.event.pos.y - 40, `+${g} 💎  +${fmt(coins)}`, '#7fe3ff', 38);
    this.coinPop(this.event.pos.x, this.event.pos.y, 10);
    sfx('levelup'); buzz(30);
    this.s.stats.events++;
    this.event = null; this.eventTimer = rand(30, 55);
    this.hooks.changed?.();
  }

  // ---------------------------------------------------- rage
  activateRage() {
    if (this.rage < 1 || this.rageT > 0 || this.b.ko) return false;
    this.rageT = this.rageDur(); this.rage = 1;
    this.s.stats.rages++;
    this.banner = { text: 'RAGE MODE!', sub: '2× coins — go wild!', t: 0, dur: 1.6 };
    sfx('rage'); buzz([50, 30, 50]);
    this.shake = 16;
    this.checkQuest();
    return true;
  }

  // ---------------------------------------------------- quests & achievements
  questInfo() {
    const q = this.s.quest, type = QUEST_TYPES[q.type % QUEST_TYPES.length];
    let target = Math.round(type.base * (1 + q.idx * 0.55));
    if (type.stat === 'kos' || type.stat === 'rages') target = type.base + Math.floor(q.idx / 3);
    if (type.stat === 'earned') target = Math.round(500 * Math.pow(1.7, q.idx));
    if (type.best) target = Math.min(150, type.base + q.idx * 5);
    const prog = type.best ? (q.best || 0) : this.s.stats[type.stat] - q.start;
    return { title: type.title(target), prog: Math.min(prog, target), target, gems: 2, coins: Math.round(target * (type.stat === 'earned' ? 0.3 : 20) + 100 * (q.idx + 1)) };
  }
  checkQuest() {
    const qi = this.questInfo();
    if (qi.prog >= qi.target) {
      this.s.gems += qi.gems; this.s.coins += qi.coins;
      this.hooks.toast?.(`Quest complete: ${qi.title}`, `+${fmt(qi.coins)} coins  +${qi.gems} 💎`);
      sfx('levelup');
      const q = this.s.quest;
      q.idx++;
      let nt; do { nt = Math.floor(Math.random() * QUEST_TYPES.length); } while (nt === q.type);
      q.type = nt; q.best = 0;
      q.start = this.s.stats[QUEST_TYPES[nt].stat] || 0;
      this.hooks.changed?.();
    }
  }
  statValue(stat) {
    if (stat === 'weaponsOwned') return Object.keys(this.s.weapons).length;
    if (stat === 'roomsOwned') return this.s.rooms.length;
    return this.s.stats[stat] || 0;
  }
  claimableAchievements() { return ACHIEVEMENTS.filter(a => !this.s.achievements[a.id] && this.statValue(a.stat) >= a.goal); }

  // ---------------------------------------------------- fx helpers
  floatText(x, y, text, color, size = 30, coin = false) { this.floaters.push({ x, y, text, color, size, t: 0, dur: coin ? 0.9 : 1.3, vx: rand(-20, 20) }); if (this.floaters.length > 40) this.floaters.shift(); }
  coinPop(x, y, n) { for (let i = 0; i < n; i++) this.parts.push({ type: 'coin', x, y, vx: rand(-260, 260), vy: rand(-650, -250), g: 1400, t: 0, dur: rand(0.9, 1.3), rot: rand(0, 6), vr: rand(-10, 10), size: rand(13, 18) }); }
  burst(x, y, w, crit) {
    this.parts.push({ type: 'star', x, y, t: 0, dur: 0.18, size: crit ? 90 : 55 });
    const n = crit ? 12 : 6;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(150, 420);
      let type = 'spark', color = '#fff';
      if (w.splat) { type = 'drop'; color = w.splat; }
      else if (w.id === 'paper' || w.id === 'pencil') { type = 'bit'; color = w.id === 'paper' ? '#fff' : '#ffcc33'; }
      else if (w.id === 'keyboard') { type = 'key'; color = '#e8ecf0'; }
      else if (w.id === 'chicken') { type = 'bit'; color = '#ffe44d'; }
      else if (w.id === 'disco') { type = 'drop'; color = `hsl(${rand(0, 360)},90%,65%)`; }
      else if (w.id === 'cactus') { type = 'bit'; color = '#3cb371'; }
      this.parts.push({ type, color, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 150, g: 900, t: 0, dur: rand(0.4, 0.7), rot: rand(0, 6), vr: rand(-12, 12), size: rand(5, 11), ch: String.fromCharCode(65 + Math.floor(Math.random() * 26)) });
    }
  }
  say(text, dur = 1.6) { this.bubble = { text, t: 0, dur }; }

  // ---------------------------------------------------- update
  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.update(dt); this.draw();
    requestAnimationFrame(n => this.loop(n));
  }

  update(dt) {
    this.t += dt;
    const b = this.b;
    // hazards
    for (const hz of this.room.hazards) {
      const st = this.hz[hz.id]; if (!st) continue;
      if (st.anim) {
        st.anim.t += dt;
        const p = st.anim.t / st.anim.dur;
        if (!st.anim.hit && p >= st.anim.hitAt) { st.anim.hit = true; this.hazardHit(hz, st.anim); }
        if (p >= 1) { st.anim = null; st.cd = this.hazardCd(hz); }
      } else if (st.cd > 0) st.cd -= dt;
    }
    // projectiles
    for (const p of this.proj) {
      p.t += dt;
      const w = byId(WEAPONS, p.wid);
      p.rot += (w.spin || 0) * dt;
      if (p.kind === 'tap') {
        if (p.lt) { const q = this.worldOf(p.lt.x, p.lt.y); p.tx = q.x; p.ty = q.y; }
        const k = Math.min(1, p.t / p.dur), u = 1 - k;
        p.x = u * u * p.sx + 2 * u * k * p.cx + k * k * p.tx;
        p.y = u * u * p.sy + 2 * u * k * p.cy + k * k * p.ty;
        if (k >= 1) { p.dead = true; this.hit(p.tx, p.ty, p.wid, { intern: p.intern }); }
      } else {
        p.vy += 1500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (!p.trail) p.trail = [];
        p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 8) p.trail.shift();
        if (this.hitTest(p.x, p.y) && !this.b.ko) { p.dead = true; this.hit(p.x, p.y, p.wid, { fling: true }); }
        if (p.y > 1200 || p.x < -1500 || p.x > 2500 || p.t > 4) p.dead = true;
      }
    }
    this.proj = this.proj.filter(p => !p.dead);
    // particles
    for (const p of this.parts) { p.t += dt; if (p.vx !== undefined) { p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.vr || 0) * dt; } }
    this.parts = this.parts.filter(p => p.t < p.dur);
    for (const f of this.floaters) { f.t += dt; f.y -= 70 * dt; f.x += f.vx * dt; }
    this.floaters = this.floaters.filter(f => f.t < f.dur);
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    this.shake *= Math.pow(0.0005, dt); this.flash = Math.max(0, this.flash - dt * 1.5);
    if (this.comboShow > 0) this.comboShow -= dt;
    if (this.t - this.lastHit > this.comboWindow() && this.combo > 0 && this.rageT <= 0) this.combo = 0;

    // boss state
    b.wet = Math.max(0, b.wet - dt * 0.12); b.char = Math.max(0, b.char - dt * 0.08); b.red = Math.max(0, b.red - dt * 0.15);
    b.enter = Math.max(0, b.enter - dt * 2.5);
    if (b.react) { b.react.t += dt; if (b.react.t > b.react.dur) b.react = null; }
    this.physStep(dt);
    if (b.ko) { if (!b.phys || b.phys.mode === 'rest') b.ko.t += dt; if (b.ko.t > 2.8) this.recoverBoss(); }
    // walk back to the middle of the room after being thrown
    b.walking = false;
    if (!b.phys && !b.ko && Math.abs(b.x - 500) > 2) { b.x += Math.sign(500 - b.x) * Math.min(160 * dt, Math.abs(500 - b.x)); b.walking = true; }
    this.shieldFlash = Math.max(0, this.shieldFlash - dt * 4);
    if (this.challenge) {
      const ch = this.challenge; ch.t += dt;
      if (ch.boss !== this.s.boss) this.challenge = null;
      else if (ch.t >= ch.limit && !b.ko) { this.challenge = null; this.hooks.toast?.('Time\'s up!', 'Try the challenge again from Goals'); sfx('error'); }
    }

    // rage
    if (this.rageT > 0) {
      this.rageT -= dt; this.rage = Math.max(0, this.rageT / this.rageDur());
      this.rageTick -= dt;
      if (this.rageTick <= 0 && !b.ko) { this.rageTick = 0.085; const q = this.worldOf(rand(-100, 100), rand(-480, -120)); this.throwAt(q.x, q.y, this.s.weapon, { rage: true, dur: 0.18 }); }
      if (this.rageT <= 0) { this.rage = 0; this.combo = 0; }
    }
    // intern
    const ir = this.internRate();
    if (ir > 0 && !b.ko) {
      this.internT -= dt;
      if (this.internT <= 0) { this.internT = 1 / ir; this.internAnim = 0.25; const q = this.worldOf(rand(-70, 70), HEAD.y + rand(-60, 60)); this.throwAt(q.x, q.y, 'paper', { intern: true, fromX: 30, fromY: 560, dur: 0.45 }); }
      this.internAnim = Math.max(0, this.internAnim - dt);
    }
    // events
    if (!this.event) { this.eventTimer -= dt; if (this.eventTimer <= 0 && !b.ko && !b.phys) this.startEvent(); }
    else this.updateEvent(dt);

    // autosave every ~5s
    this.saveT = (this.saveT || 0) + dt;
    if (this.saveT > 5) { this.saveT = 0; this.s.bossHp = this.hp; save(this.s); }
  }

  updateEvent(dt) {
    const e = this.event; e.t += dt; const k = e.t / e.dur; const b = this.b;
    switch (e.id) {
      case 'pigeon': e.pos = { x: -150 + k * 1300, y: 120 + Math.sin(k * 20) * 15 }; if (!e.hitDone && e.pos.x > b.x - 30) { e.hitDone = 1; e.poop = { x: e.pos.x, y: e.pos.y, vy: 0 }; } if (e.poop) { e.poop.vy += 1600 * dt; e.poop.y += e.poop.vy * dt; if (e.poop.y > b.y + HEAD.y - 100 && !e.poop.done) { e.poop.done = 1; this.eventHit(e.def.dmg, 'SPLAT!', '#f4f4f0'); } } break;
      case 'intern': e.pos = { x: 1150 - Math.min(1, k * 1.8) * 520, y: 560 }; if (!e.hitDone && k > 0.5) { e.hitDone = 1; this.eventHit(e.def.dmg, 'PIE\'D!', '#fff6e0'); } if (k > 0.55) e.pos.x = 630 + (k - 0.55) * 1400; break;
      case 'planes': { const n = Math.floor(k * 6); if (n > e.hitDone && n <= 5) { e.hitDone = n; this.eventHit(e.def.dmg / 5, 'Fwip!', null); } break; }
      case 'cat': { const jump = k < 0.3 ? k / 0.3 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; e.pos = { x: k < 0.5 ? 200 + jump * 300 : 500 + (1 - jump) * 350, y: 640 - jump * 520 }; if (k > 0.35 && k < 0.7 && Math.floor(e.t * 8) > e.hitDone) { e.hitDone = Math.floor(e.t * 8); b.bruises.push({ x: rand(-60, 60), y: HEAD.y + rand(-50, 50), rot: rand(-1, 1) }); if (b.bruises.length > 9) b.bruises.shift(); this.eventHit(e.def.dmg / 3, 'HISS!', null); } break; }
      case 'pizza': e.pos = { x: -100 + Math.min(1, k * 2) * 600, y: 380 - Math.sin(Math.min(1, k * 2) * Math.PI) * 60 }; if (!e.hitDone && k >= 0.5) { e.hitDone = 1; this.eventHit(e.def.dmg, 'Extra cheese!', '#ffb74d'); } break;
      case 'gift': e.pos = { x: 200 + Math.sin(e.t * 1.3) * 120 + e.t * 70, y: -60 + e.t * 90 }; break;
    }
    if (e.t >= e.dur) { if (e.id !== 'gift') this.s.stats.events++; this.event = null; this.eventTimer = rand(28, 50); }
  }

  // ---------------------------------------------------- draw
  bossPose() {
    const b = this.b, t = this.t;
    const pose = { x: b.x, y: b.y, scale: 1, tilt: Math.sin(t * 1.3) * 0.015, squash: 0, face: 'angry', t, bruises: b.bruises, darts: b.darts, splats: b.splats, wet: b.wet, char: b.char, red: b.red, spinX: 1, armWave: Math.sin(t * 2.5) * 0.08 };
    if (b.phys) {
      const ph = b.phys;
      if (ph.mode === 'getup') { pose.x = ph.fx; pose.y = ph.fy; }
      else { const o = rot(-COM.x, -COM.y, ph.th); pose.x = ph.cx + o.x; pose.y = ph.cy + o.y; }
      pose.tilt = ph.th; pose.noShadow = true;
      pose.face = b.ko ? 'ko' : (this.t - b.hitT < 0.35) ? 'hurt' : ph.mode === 'getup' || ph.mode === 'rest' ? 'dizzy' : 'shock';
      pose.armWave = ph.mode === 'getup' || ph.mode === 'rest' ? 0.15 : Math.sin(t * 22) * 0.75;
      if (b.react && b.react.type === 'zap' && Math.floor(t * 20) % 2) pose.char = 1;
      return pose;
    }
    if (b.walking) { pose.tilt += Math.sin(t * 14) * 0.06; pose.y -= Math.abs(Math.sin(t * 14)) * 10; pose.face = 'angry'; }
    if (this.rageT > 0) pose.face = 'shock';
    if (b.enter > 0) { pose.y += -Math.sin(b.enter * Math.PI) * 60; pose.squash = -b.enter * 0.1; }
    const r = b.react;
    if (r) {
      const k = r.t / r.dur, dec = 1 - k;
      switch (r.type) {
        case 'hit': pose.face = 'hurt'; pose.squash = 0.07 * dec * (r.heavy ? 2 : 1); pose.tilt += b.hitDir * 0.12 * dec * (r.heavy ? 2 : 1); pose.x += b.hitDir * -10 * dec; pose.armWave = 0.5 * dec; break;
        case 'zap': pose.face = 'shock'; pose.x += Math.sin(t * 90) * 8 * dec; pose.armWave = Math.sin(t * 60) * 0.8; if (Math.floor(t * 20) % 2) pose.char = 1; break;
        case 'soot': pose.face = k < 0.5 ? 'shock' : 'hurt'; pose.squash = 0.06 * dec; break;
        case 'wet': pose.face = 'shock'; pose.squash = -0.04 * dec; break;
        case 'burn': pose.face = 'hurt'; pose.y -= Math.sin(Math.min(1, k * 2) * Math.PI) * 80; pose.armWave = 1.2 * dec; break;
        case 'tackle': pose.face = 'hurt'; pose.tilt = k < 0.3 ? (k / 0.3) * 1.35 : 1.35 * (1 - (k - 0.3) / 0.7); pose.x += k < 0.3 ? k / 0.3 * 80 : 80 * (1 - (k - 0.3) / 0.7); break;
        case 'bonk': pose.face = k < 0.2 ? 'shock' : 'dizzy'; pose.squash = 0.28 * Math.max(0, 1 - k * 3); pose.tilt += Math.sin(t * 6) * 0.08 * dec; break;
        case 'dizzy': pose.face = 'dizzy'; pose.tilt = Math.sin(t * 5) * 0.2 * dec; pose.x += Math.sin(t * 3) * 40 * dec; break;
        case 'spin': pose.face = 'dizzy'; pose.spinX = Math.cos(k * Math.PI * 8); break;
        case 'trip': pose.face = 'hurt'; pose.tilt = k < 0.25 ? -(k / 0.25) * 1.5 : -1.5 * (1 - Math.max(0, (k - 0.5) / 0.5)); break;
        case 'yank': pose.face = 'shock'; pose.x += k < 0.4 ? (k / 0.4) * 220 : 220 * (1 - (k - 0.4) / 0.6); pose.tilt = (k < 0.4 ? -0.5 : -0.5 * (1 - (k - 0.4) / 0.6)); break;
        case 'hurt': pose.face = 'hurt'; pose.squash = 0.08 * Math.sin(t * 30) * dec; break;
      }
    }
    if (b.ko) {
      const k = Math.min(1, b.ko.t / 0.45);
      pose.face = 'ko'; pose.tilt = -1.45 * (k < 1 ? k * k : 1) + (k >= 1 ? Math.sin(b.ko.t * 12) * 0.03 * Math.max(0, 1 - b.ko.t) : 0);
      pose.x -= 40 * k; pose.y += 0;
      if (b.ko.t > 2.2) { const u = (b.ko.t - 2.2) / 0.6; pose.tilt = -1.45 * (1 - u); }
    }
    return pose;
  }

  draw() {
    const c = this.c, d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, this.cw, this.ch);
    c.save();
    const sh = this.shake;
    c.translate(this.ox + (Math.random() - 0.5) * sh * this.scale, this.oy + (Math.random() - 0.5) * sh * this.scale);
    c.scale(this.scale, this.scale);

    const room = this.room;
    drawRoom(c, room, this.t);
    for (const k of this.cracks) drawCrack(c, k);
    // hazards behind boss
    const front = [];
    for (const hz of room.hazards) {
      const st = this.hz[hz.id] || {};
      const p = st.anim ? st.anim.t / st.anim.dur : -1;
      if (p >= 0) front.push([hz, p]);
      else drawHazard(c, hz, this.t, p, !st.anim && st.cd <= 0 && !this.b.ko);
      if (!st.anim && st.cd > 0) this.drawCooldown(c, hz, st.cd / this.hazardCd(hz));
    }
    // intern
    if (this.up('intern') > 0) this.drawIntern(c);

    const pose = this.bossPose();
    this.pose = pose;
    if (this.b.phys) {
      // shadow stays on the floor while he's airborne
      const ph = this.b.phys, sx = ph.mode === 'getup' ? ph.fx : ph.cx, hgt = ph.mode === 'getup' ? 0 : Math.max(0, 650 - ph.cy - 230);
      const k = clamp(1 - hgt / 900, 0.25, 1);
      c.save(); c.globalAlpha = 0.25 * k; c.beginPath(); c.ellipse(sx, 652, 130 * k, 18 * k, 0, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill(); c.restore();
    }
    drawBoss(c, this.bossDef.look, this.s.hat, pose);
    if (this.b.shield > 0) { const sc = rot(0, -260, pose.tilt); drawShield(c, pose.x + sc.x, pose.y + sc.y, this.b.shield / this.b.shieldMax, this.t, this.shieldFlash); }
    if ((this.b.ko && !(this.b.phys && this.b.phys.mode === 'drag')) || pose.face === 'dizzy') this.drawStars(c, pose);
    if (this.b.react && this.b.react.type === 'zap' && Math.floor(this.t * 20) % 2) this.drawSkeleton(c, pose);
    if (this.b.react && this.b.react.type === 'tackle') this.drawGuard(c, this.b.react.t / this.b.react.dur, pose);

    // animated hazards in front of boss
    for (const [hz, p] of front) drawHazard(c, hz, this.t, p, false);
    if (this.event) this.drawEvent(c);

    // projectiles
    for (const p of this.proj) {
      const w = byId(WEAPONS, p.wid);
      if (p.trail) { c.save(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); p.trail.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.stroke(); c.restore(); }
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); const s = (p.intern ? 0.7 : 1.05) * w.size; c.scale(s, s); drawWeapon(c, p.wid, this.t); c.restore();
    }
    // fling aim line
    if (this.pointer) {
      const P = this.pointer, dist = Math.hypot(P.x - P.sx, P.y - P.sy);
      if (dist > 30) { c.save(); c.setLineDash([12, 12]); c.lineDashOffset = -this.t * 60; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 6; c.beginPath(); c.moveTo(P.sx, P.sy); c.lineTo(P.x, P.y); c.stroke(); c.restore(); c.save(); c.translate(P.x, P.y); c.globalAlpha = 0.85; drawWeapon(c, this.s.weapon, this.t); c.restore(); }
    }
    this.drawParticles(c);
    this.drawFloaters(c);
    if (this.bubble) this.drawBubble(c, pose);
    c.restore();

    // screen-space overlays
    if (this.rageT > 0) {
      const g = c.createRadialGradient(this.cw / 2, this.ch / 2, Math.min(this.cw, this.ch) * 0.3, this.cw / 2, this.ch / 2, Math.max(this.cw, this.ch) * 0.75);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,30,0,${0.35 + Math.sin(this.t * 10) * 0.1})`);
      c.fillStyle = g; c.fillRect(0, 0, this.cw, this.ch);
    }
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash})`; c.fillRect(0, 0, this.cw, this.ch); }
    this.drawCombo(c);
    if (this.challenge) this.drawTimer(c);
    if (this.banner) this.drawBanner(c);
  }

  drawTimer(c) {
    const ch = this.challenge, left = Math.max(0, ch.limit - ch.t);
    const x = this.cw / 2, y = (this.topPx || 100) + 26;
    c.save(); c.translate(x, y);
    const pulse = left < 10 ? 1 + Math.max(0, Math.sin(this.t * 10)) * 0.08 : 1; c.scale(pulse, pulse);
    c.font = '34px Lilita, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    const txt = `⏱ ${left.toFixed(1)}s`;
    c.lineWidth = 8; c.strokeStyle = '#3a2414'; c.strokeText(txt, 0, 0);
    c.fillStyle = left < 10 ? '#ff5252' : '#fff'; c.fillText(txt, 0, 0);
    c.restore();
  }

  drawCooldown(c, hz, frac) {
    const bx = hz.x + hz.w - 4, by = hz.y + 4;
    c.save(); c.globalAlpha = 0.85;
    c.beginPath(); c.arc(bx, by, 17, 0, Math.PI * 2); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill();
    c.beginPath(); c.moveTo(bx, by); c.arc(bx, by, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac)); c.closePath(); c.fillStyle = '#ffe14d'; c.fill();
    c.restore();
  }

  drawStars(c, pose) {
    const hd = rot(0, -380, pose.tilt), cx = pose.x + hd.x, cy = pose.y + hd.y - 150;
    for (let i = 0; i < 5; i++) {
      const a = this.t * 4 + i * (Math.PI * 2 / 5);
      const x = cx + Math.cos(a) * 110, y = cy + Math.sin(a) * 28;
      c.save(); c.translate(x, y); c.rotate(this.t * 5);
      c.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 9 : 20, an = j * Math.PI / 5; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } c.closePath();
      c.fillStyle = '#ffe14d'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#3a2414'; c.stroke(); c.restore();
    }
  }
  drawSkeleton(c, pose) {
    c.save(); c.translate(pose.x, pose.y); c.rotate(pose.tilt);
    c.globalAlpha = 0.9; c.fillStyle = 'rgba(80,200,255,.35)'; c.fillRect(-140, -520, 280, 520);
    c.strokeStyle = '#fff'; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.arc(0, -380, 80, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-30, -390, 18, 0, 7); c.arc(30, -390, 18, 0, 7); c.fill();
    c.beginPath(); c.moveTo(0, -300); c.lineTo(0, -110); for (let i = 0; i < 4; i++) { c.moveTo(-60, -270 + i * 30); c.lineTo(60, -270 + i * 30); } c.moveTo(0, -110); c.lineTo(-40, -10); c.moveTo(0, -110); c.lineTo(40, -10); c.moveTo(-60, -270); c.lineTo(-110, -160); c.moveTo(60, -270); c.lineTo(110, -160); c.stroke();
    c.restore();
  }
  drawGuard(c, k, pose) {
    // security guard sprints in from the left and tackles
    if (k > 0.95) return;
    const x = k < 0.25 ? -200 + (k / 0.25) * 560 : k < 0.6 ? 360 + (k - 0.25) * 200 : 430 - (k - 0.6) * 1600;
    c.save(); c.translate(x, 650); if (k > 0.6) c.scale(-1, 1);
    const run = Math.sin(this.t * 30) * 0.5;
    c.lineWidth = 5; c.strokeStyle = '#3a2414';
    c.save(); c.rotate(run); rr(c, -14, -100, 28, 100, 12); c.fillStyle = '#1a237e'; c.fill(); c.stroke(); c.restore();
    c.save(); c.rotate(-run); rr(c, -14, -100, 28, 100, 12); c.fillStyle = '#1a237e'; c.fill(); c.stroke(); c.restore();
    rr(c, -55, -240, 110, 150, 24); c.fillStyle = '#283593'; c.fill(); c.stroke();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-25, -200, 12, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '20px Lilita, sans-serif'; c.textAlign = 'center'; c.fillText('SECURITY', 0, -150);
    c.beginPath(); c.arc(0, -300, 60, 0, 7); c.fillStyle = '#d7a37a'; c.fill(); c.stroke();
    rr(c, -64, -366, 128, 40, 10); c.fillStyle = '#1a237e'; c.fill(); c.stroke(); rr(c, -10, -336, 90, 14, 6); c.fill(); c.stroke();
    c.fillStyle = '#3a2414'; c.fillRect(-30, -310, 22, 8); c.fillRect(14, -310, 22, 8);
    c.beginPath(); c.arc(0, -270, 20, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.save(); c.translate(50, -210); c.rotate(-1.2 + run); rr(c, -14, 0, 28, 100, 12); c.fillStyle = '#283593'; c.fill(); c.stroke(); c.restore();
    c.restore();
    if (k > 0.22 && k < 0.45) { c.save(); c.globalAlpha = 1 - (k - 0.22) / 0.23; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(420 + Math.cos(i) * 100 * k * 3, 600 + Math.sin(i) * 40, 30 + k * 60, 0, 7); c.fillStyle = '#d7ccc8'; c.fill(); } c.restore(); }
  }
  drawIntern(c) {
    const a = this.internAnim;
    c.save(); c.translate(-40, 650); c.scale(0.55, 0.55);
    c.lineWidth = 6; c.strokeStyle = '#3a2414';
    rr(c, -40, -110, 30, 110, 12); c.fillStyle = '#5d4037'; c.fill(); c.stroke(); rr(c, 10, -110, 30, 110, 12); c.fill(); c.stroke();
    rr(c, -60, -270, 120, 170, 24); c.fillStyle = '#4caf50'; c.fill(); c.stroke();
    c.save(); c.translate(55, -240); c.rotate(-2.4 + a * 8); rr(c, -14, 0, 28, 100, 12); c.fillStyle = '#4caf50'; c.fill(); c.stroke(); c.restore();
    c.beginPath(); c.arc(0, -340, 75, 0, 7); c.fillStyle = '#ffd5b0'; c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -360, 78, Math.PI, 0); c.fillStyle = '#ff9800'; c.fill(); c.stroke();
    c.fillStyle = '#3a2414'; c.beginPath(); c.arc(-25, -335, 9, 0, 7); c.arc(25, -335, 9, 0, 7); c.fill();
    c.beginPath(); c.arc(0, -305, 22, 0.1, Math.PI - 0.1); c.stroke();
    rr(c, -40, -200, 50, 34, 4); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.stroke(); c.fillStyle = '#e53935'; c.font = '16px Lilita, sans-serif'; c.textAlign = 'center'; c.fillText('INTERN', -15, -178);
    c.restore();
  }
  drawEvent(c) {
    const e = this.event; if (!e.pos && e.id !== 'planes') return;
    c.save();
    const o = '#3a2414'; c.lineWidth = 4; c.strokeStyle = o;
    switch (e.id) {
      case 'pigeon': {
        c.translate(e.pos.x, e.pos.y);
        const flap = Math.sin(this.t * 25) * 0.6;
        c.beginPath(); c.ellipse(0, 0, 40, 24, 0, 0, 7); c.fillStyle = '#90a4ae'; c.fill(); c.stroke();
        c.beginPath(); c.arc(36, -16, 18, 0, 7); c.fill(); c.stroke();
        c.fillStyle = '#ff9800'; c.beginPath(); c.moveTo(52, -16); c.lineTo(66, -12); c.lineTo(52, -8); c.fill();
        c.fillStyle = o; c.beginPath(); c.arc(40, -20, 3, 0, 7); c.fill();
        c.save(); c.rotate(flap); c.beginPath(); c.ellipse(-5, -20, 30, 12, -0.6, 0, 7); c.fillStyle = '#78909c'; c.fill(); c.stroke(); c.restore();
        break;
      }
      case 'intern': {
        c.translate(e.pos.x, e.pos.y); c.scale(e.t / e.dur > 0.55 ? 0.6 : -0.6, 0.6);
        const run = Math.sin(this.t * 25) * 0.6;
        c.save(); c.rotate(run); rr(c, -14, -10, 28, 110, 12); c.fillStyle = '#5d4037'; c.fill(); c.stroke(); c.restore();
        c.save(); c.rotate(-run); rr(c, -14, -10, 28, 110, 12); c.fill(); c.stroke(); c.restore();
        rr(c, -50, -170, 100, 165, 24); c.fillStyle = '#ab47bc'; c.fill(); c.stroke();
        c.beginPath(); c.arc(0, -230, 64, 0, 7); c.fillStyle = '#c68642'; c.fill(); c.stroke();
        c.fillStyle = o; c.beginPath(); c.arc(-20, -235, 8, 0, 7); c.arc(20, -235, 8, 0, 7); c.fill();
        c.beginPath(); c.arc(0, -205, 22, 0, Math.PI); c.fillStyle = '#7a1f1f'; c.fill(); c.stroke();
        if (e.t / e.dur < 0.5) { c.save(); c.translate(-80, -140); c.scale(1.4, 1.4); drawWeapon(c, 'pie', 0); c.restore(); }
        break;
      }
      case 'planes': {
        for (let i = 0; i < 5; i++) {
          const k = (e.t / e.dur) * 6 - i; if (k < 0 || k > 1) continue;
          const x = 1100 - k * 600, y = 150 + i * 30 + k * 200;
          c.save(); c.translate(x, y); c.rotate(0.3);
          c.beginPath(); c.moveTo(-40, 0); c.lineTo(40, -14); c.lineTo(10, 0); c.lineTo(40, 14); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke();
          c.restore();
        }
        break;
      }
      case 'cat': {
        c.translate(e.pos.x, e.pos.y); c.scale(0.9, 0.9);
        c.beginPath(); c.ellipse(0, 0, 50, 30, 0, 0, 7); c.fillStyle = '#ff9800'; c.fill(); c.stroke();
        c.beginPath(); c.arc(42, -24, 26, 0, 7); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(26, -42); c.lineTo(30, -66); c.lineTo(44, -48); c.moveTo(48, -48); c.lineTo(62, -64); c.lineTo(64, -38); c.fill(); c.stroke();
        c.fillStyle = o; c.beginPath(); c.arc(36, -26, 4, 0, 7); c.arc(54, -26, 4, 0, 7); c.fill();
        c.strokeStyle = '#e65100'; c.lineWidth = 8; c.beginPath(); c.moveTo(-48, -5); c.quadraticCurveTo(-90, -40 + Math.sin(this.t * 10) * 15, -70, -70); c.stroke();
        break;
      }
      case 'pizza': {
        c.translate(e.pos.x, e.pos.y); c.rotate(this.t * 10); c.scale(1, 0.4);
        rr(c, -50, -50, 100, 100, 6); c.fillStyle = '#d7b98e'; c.fill(); c.stroke();
        c.fillStyle = '#e53935'; c.font = '30px Lilita, sans-serif'; c.textAlign = 'center'; c.fillText('PIZZA', 0, 10);
        break;
      }
      case 'gift': {
        c.translate(e.pos.x, e.pos.y); c.rotate(Math.sin(this.t * 3) * 0.2);
        c.save(); c.shadowColor = '#ffe14d'; c.shadowBlur = 40 + Math.sin(this.t * 8) * 15;
        rr(c, -50, -34, 100, 68, 8); c.fillStyle = '#ffd23f'; c.fill(); c.stroke(); c.restore();
        c.beginPath(); c.moveTo(-50, -34); c.lineTo(0, 6); c.lineTo(50, -34); c.stroke();
        c.beginPath(); c.arc(0, 6, 12, 0, 7); c.fillStyle = '#e53935'; c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.font = '22px Lilita, sans-serif'; c.textAlign = 'center'; c.fillText('BONUS', 0, -48);
        break;
      }
    }
    c.restore();
    if (e.poop && !e.poop.done) { c.beginPath(); c.arc(e.poop.x, e.poop.y, 10, 0, 7); c.fillStyle = '#f4f4f0'; c.fill(); }
  }
  drawParticles(c) {
    for (const p of this.parts) {
      const k = p.t / p.dur;
      c.save(); c.translate(p.x, p.y);
      switch (p.type) {
        case 'coin': c.rotate(0); c.scale(Math.cos(p.t * 12), 1); c.beginPath(); c.arc(0, 0, p.size, 0, 7); c.fillStyle = '#ffd23f'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#b8860b'; c.stroke(); c.fillStyle = '#b8860b'; c.font = `${p.size * 1.3}px Lilita, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 0, 1); break;
        case 'star': { const s = p.size * (0.6 + k); c.globalAlpha = 1 - k; c.beginPath(); for (let j = 0; j < 16; j++) { const r = j % 2 ? s * 0.45 : s, an = j * Math.PI / 8; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } c.closePath(); c.fillStyle = '#fff59d'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#ff9800'; c.stroke(); break; }
        case 'drop': c.globalAlpha = 1 - k; c.beginPath(); c.arc(0, 0, p.size, 0, 7); c.fillStyle = p.color; c.fill(); break;
        case 'bit': c.globalAlpha = 1 - k; c.rotate(p.rot); c.fillStyle = p.color; c.fillRect(-p.size, -p.size / 2, p.size * 2, p.size); break;
        case 'key': c.globalAlpha = 1 - k; c.rotate(p.rot); rr(c, -12, -12, 24, 24, 4); c.fillStyle = p.color; c.fill(); c.lineWidth = 2; c.strokeStyle = '#555'; c.stroke(); c.fillStyle = '#333'; c.font = '16px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.ch, 0, 1); break;
        case 'dust': c.globalAlpha = (1 - k) * 0.7; c.beginPath(); c.arc(0, 0, p.size * (0.6 + k * 0.8), 0, 7); c.fillStyle = p.color || '#e8dccb'; c.fill(); break;
        case 'shard': c.globalAlpha = 1 - k; c.rotate(p.rot); c.beginPath(); c.moveTo(0, -p.size); c.lineTo(p.size * 0.6, p.size * 0.4); c.lineTo(-p.size * 0.5, p.size * 0.5); c.closePath(); c.fillStyle = 'rgba(180,240,255,.85)'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); break;
        case 'spark': c.globalAlpha = 1 - k; c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(-p.vx * 0.04, -p.vy * 0.04); c.stroke(); break;
      }
      c.restore();
    }
  }
  drawFloaters(c) {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const f of this.floaters) {
      const k = f.t / f.dur;
      const pop = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
      c.save(); c.translate(f.x, f.y); c.scale(pop, pop); c.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      c.font = `${f.size}px Lilita, sans-serif`;
      c.lineWidth = f.size * 0.22; c.strokeStyle = '#3a2414'; c.lineJoin = 'round'; c.strokeText(f.text, 0, 0);
      c.fillStyle = f.color; c.fillText(f.text, 0, 0);
      c.restore();
    }
  }
  drawBubble(c, pose) {
    const bb = this.bubble; const k = bb.t;
    const x = pose.x + 150, y = pose.y - 560;
    const s = k < 0.12 ? k / 0.12 : 1;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.font = '28px Lilita, sans-serif';
    const w = Math.min(380, c.measureText(bb.text).width + 44), h = 64;
    c.beginPath(); rr(c, -20, -h / 2, w, h, 26);
    c.fillStyle = '#fff'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#3a2414'; c.stroke();
    c.beginPath(); c.moveTo(0, h / 2 - 4); c.lineTo(-40, h / 2 + 34); c.lineTo(30, h / 2 - 4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(-2, h / 2 - 12, 34, 12);
    c.fillStyle = '#3a2414'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(bb.text, 2, 2, w - 44);
    c.restore();
  }
  drawCombo(c) {
    if (this.combo < 3 || this.comboShow <= 0) return;
    const sz = Math.min(64, 30 + this.combo * 0.4) * Math.max(0.7, this.scale * 1.6);
    const x = this.cw / 2, y = (this.topPx || 100) + sz * 0.9 + (this.challenge ? 50 : 0);
    const pop = 1 + Math.max(0, (this.lastHit + 0.12 - this.t)) * 3;
    c.save(); c.translate(x, y); c.scale(pop, pop); c.rotate(-0.05);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${sz}px Lilita, sans-serif`; c.lineJoin = 'round';
    const txt = `${this.combo} COMBO!`;
    c.lineWidth = sz * 0.25; c.strokeStyle = '#3a2414'; c.strokeText(txt, 0, 0);
    const g = c.createLinearGradient(0, -sz / 2, 0, sz / 2); g.addColorStop(0, '#fff59d'); g.addColorStop(1, this.combo > 50 ? '#ff3d00' : '#ffb300');
    c.fillStyle = g; c.fillText(txt, 0, 0);
    c.font = `${sz * 0.38}px Lilita, sans-serif`; c.lineWidth = sz * 0.1; const m = `x${(1 + Math.min(this.combo, 100) * 0.02).toFixed(2)} coins`;
    c.strokeText(m, 0, sz * 0.62); c.fillStyle = '#fff'; c.fillText(m, 0, sz * 0.62);
    c.restore();
  }
  drawBanner(c) {
    const b = this.banner, k = b.t / b.dur;
    const s = k < 0.12 ? 0.3 + k / 0.12 * 0.9 : k > 0.85 ? 1.2 * (1 - (k - 0.85) / 0.15) : 1.2 - (k - 0.12) * 0.2;
    const base = Math.min(this.cw, this.ch) * (b.small ? 0.09 : 0.18);
    c.save(); c.translate(this.cw / 2, this.ch * 0.42); c.scale(s, s); c.rotate(-0.06);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.font = `${base}px Lilita, sans-serif`;
    c.lineWidth = base * 0.22; c.strokeStyle = '#3a2414'; c.strokeText(b.text, 0, 0);
    const g = c.createLinearGradient(0, -base / 2, 0, base / 2); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#ffe14d'); g.addColorStop(1, '#ff7a00');
    c.fillStyle = g; c.fillText(b.text, 0, 0);
    if (b.sub) { c.font = `${base * 0.32}px Lilita, sans-serif`; c.lineWidth = base * 0.08; c.strokeText(b.sub, 0, base * 0.7); c.fillStyle = '#fff'; c.fillText(b.sub, 0, base * 0.7); }
    c.restore();
  }
}
