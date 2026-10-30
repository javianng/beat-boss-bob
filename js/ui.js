// ===== DOM UI: HUD, shop panel, modals =====
import { WEAPONS, BOSSES, ROOMS, HATS, UPGRADES, ACHIEVEMENTS, DAILY, PARTS, CUSTOM_OPTS } from './data.js';
import { icon, drawBossPreview } from './render.js';
import { byId, fmt, todayStr } from './game.js';
import { sfx, audio, unlockAudio } from './audio.js';
import { save, wipe } from './save.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const curIco = cur => cur === 'gem' ? '<i class="gem-ico"></i>' : '<i class="coin-ico">$</i>';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const dayDiff = (a, b) => Math.round((new Date(b.replace(/-/g, '/')) - new Date(a.replace(/-/g, '/'))) / 86400000);

export class UI {
  constructor(game) {
    this.g = game; this.s = game.s;
    this.tab = 'weapons';
    this.installEvt = null;
    game.hooks.toast = (a, b) => this.toast(a, b);
    game.hooks.briefcase = () => this.briefcase();
    this.applyCustom();
    game.hooks.changed = () => { this.renderPanel(); this.renderShelf(); };
    game.hooks.topPad = () => {
      const th = $('#topbar').offsetHeight;
      document.documentElement.style.setProperty('--topbar-h', th + 'px');
      return th + $('#bossbar').offsetHeight + 12;
    };
    game.hooks.botPad = () => ($('#hud-bottom').offsetHeight + 8);

    document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { unlockAudio(); sfx('tap'); this.tab = b.dataset.tab; this.renderPanel(); $('#content').scrollTop = 0; }));
    $('#weaponBtn').addEventListener('click', () => { unlockAudio(); this.tab = 'weapons'; this.expand(); this.renderPanel(); });
    $('#rageBtn').addEventListener('click', () => { unlockAudio(); if (!this.g.activateRage()) sfx('error'); });
    $('#settingsBtn').addEventListener('click', () => { unlockAudio(); this.settings(); });
    $('#questBtn').addEventListener('click', () => { unlockAudio(); this.tab = 'goals'; this.expand(); this.renderPanel(); });
    $('#panelToggle').addEventListener('click', () => { unlockAudio(); sfx('tap'); this.setPanel($('#app').classList.contains('collapsed')); });
    window.addEventListener('keydown', e => { if ((e.key === 's' || e.key === 'S') && e.target === document.body) this.setPanel($('#app').classList.contains('collapsed')); });
    if (this.s.settings.storeHidden) this.setPanel(false, true);
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !this.modalLocked) this.closeModal(); });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.installEvt = e; });
    new ResizeObserver(() => this.g.resize()).observe($('#scene'));
    // keep layout padding correct once fonts load
    document.fonts?.ready.then(() => this.relayout());

    this.renderPanel(); this.renderShelf();
    this.hudLoop();
  }

  expand() { if ($('#app').classList.contains('collapsed')) this.setPanel(true); }
  // Show or hide the store panel (works in portrait and landscape); remembered between visits
  setPanel(open, quiet) {
    $('#app').classList.toggle('collapsed', !open);
    const t = $('#panelToggle');
    t.querySelector('.pt-ico').textContent = open ? '✕' : '🛒';
    t.querySelector('.pt-label').textContent = open ? 'Hide store' : 'Store';
    t.setAttribute('aria-label', open ? 'Hide store' : 'Show store');
    t.setAttribute('aria-expanded', String(open));
    this.s.settings.storeHidden = !open;
    if (!quiet) save(this.s);
    this.updateBadges?.();
    this.relayout();
  }
  relayout() { setTimeout(() => this.g.resize(), 280); this.g.resize(); }

  // ---------------------------------------------------- HUD (runs ~15fps)
  hudLoop() {
    const g = this.g, s = this.s;
    const q = g.questInfo();
    $('#coins').textContent = fmt(s.coins);
    $('#gems').textContent = fmt(s.gems);
    $('#questTitle').textContent = q.title;
    $('#questProg').textContent = `${fmt(q.prog)} / ${fmt(q.target)}`;
    $('#questFill').style.width = (q.prog / q.target * 100) + '%';
    const b = g.bossDef;
    const bkey = this.bossKey(b);
    if (this._boss !== bkey) { this._boss = bkey; $('#bossFace').src = icon('boss', bkey, 120, 120, b); }
    const sw = $('#shieldWrap');
    sw.hidden = !(g.b.shield > 0);
    if (g.b.shield > 0) $('#shieldFill').style.width = (g.b.shield / g.b.shieldMax * 100) + '%';
    $('#bossName').textContent = b.name;
    $('#bossLv').textContent = 'Lv ' + g.bossLv;
    $('#hpFill').style.width = Math.max(0, g.hp / g.maxHp * 100) + '%';
    $('#hpText').textContent = g.b.ko ? 'K.O.!' : `${fmt(Math.max(0, g.hp))} / ${fmt(g.maxHp)}`;
    if (this._w !== s.weapon) { this._w = s.weapon; $('#weaponIco').src = icon('weapon', s.weapon, 92, 72); }
    const rb = $('#rageBtn');
    $('#rageFill').style.height = (g.rage * 100) + '%';
    rb.classList.toggle('ready', g.rage >= 1 && g.rageT <= 0);
    rb.classList.toggle('active', g.rageT > 0);
    // tab badges every half second
    this._bt = (this._bt || 0) + 1;
    if (this._bt % 8 === 0) this.updateBadges();
    if (this._bt === 30) $('#hint').style.opacity = 0;
    setTimeout(() => this.hudLoop(), 66);
  }

  bossKey(b) { return b.custom ? 'custom-' + (this.s.customVer || 0) : b.id; }
  applyCustom() {
    const def = byId(BOSSES, 'custom'), c = this.s.custom;
    if (c) { def.name = c.name || 'Custom Boss'; Object.assign(def.look, c.look); }
  }
  canCraft(w) { return Object.entries(w.recipe).every(([k, n]) => (this.s.parts[k] || 0) >= n); }
  recipeHtml(w) { return Object.entries(w.recipe).map(([k, n]) => { const p = byId(PARTS, k), have = this.s.parts[k] || 0; return `<span style="opacity:${have >= n ? 1 : .55}">${p.ico}${n}</span>`; }).join(' '); }

  canAfford(price, cur) { return cur === 'gem' ? this.s.gems >= price : this.s.coins >= price; }
  spend(price, cur) {
    if (!this.canAfford(price, cur)) { sfx('error'); this.toast(cur === 'gem' ? 'Not enough gems' : 'Not enough coins', cur === 'gem' ? 'Win them from KOs, quests & golden envelopes' : 'Keep beating the boss!'); return false; }
    if (cur === 'gem') this.s.gems -= price; else this.s.coins -= price;
    sfx('buy'); save(this.s); return true;
  }

  updateBadges() {
    const s = this.s;
    const counts = {
      weapons: WEAPONS.filter(w => !(w.id in s.weapons) && (w.cur === 'craft' ? this.canCraft(w) : this.canAfford(w.price, w.cur))).length,
      bosses: BOSSES.filter(b => !(b.id in s.bosses) && this.canAfford(b.price, b.cur)).length,
      rooms: ROOMS.filter(r => !s.rooms.includes(r.id) && this.canAfford(r.price, r.cur)).length,
      upgrades: UPGRADES.filter(u => this.g.up(u.id) < u.max && s.coins >= this.g.upgradeCost(u)).length > 0 ? 1 : 0,
      style: HATS.filter(h => !s.hats.includes(h.id) && s.gems >= h.price).length,
      goals: this.g.claimableAchievements().length + (this.dailyAvailable() ? 1 : 0) + (this.g.challengeDone() ? 0 : 1),
    };
    const any = Object.values(counts).some(n => n > 0);
    const tg = $('#panelToggle'); let tb = tg.querySelector('.badge');
    const showTB = any && $('#app').classList.contains('collapsed');
    if (showTB && !tb) tg.appendChild(el('span', 'badge', '!')); if (!showTB && tb) tb.remove();
    document.querySelectorAll('#tabs button').forEach(b => {
      const n = counts[b.dataset.tab] || 0;
      let badge = b.querySelector('.badge');
      if (n && !badge) { badge = el('span', 'badge', '!'); b.appendChild(badge); }
      if (!n && badge) badge.remove();
    });
    // refresh affordability in the open tab cheaply
    const sig = `${this.tab}:${Math.floor(Math.log2(s.coins + 1) * 4)}:${s.gems}:${this.g.claimableAchievements().length}`;
    if (sig !== this._sig) { this._sig = sig; this.renderPanel(true); }
  }

  // ---------------------------------------------------- shelf (quick-equip owned weapons)
  renderShelf() {
    const sh = $('#shelf'); sh.innerHTML = '';
    WEAPONS.filter(w => w.id in this.s.weapons).forEach(w => {
      const b = el('button', 'shelf-item' + (this.s.weapon === w.id ? ' on' : ''));
      b.innerHTML = `<img src="${icon('weapon', w.id, 100, 76)}" alt="${w.name}">` + (this.s.weapons[w.id] ? `<span class="badge">${this.s.weapons[w.id]}</span>` : '');
      b.title = w.name;
      b.onclick = () => { this.s.weapon = w.id; sfx('tap'); this.renderShelf(); this.renderPanel(); };
      sh.appendChild(b);
    });
  }

  // ---------------------------------------------------- panel
  renderPanel(soft) {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === this.tab));
    const box = $('#content');
    const keep = box.scrollTop;
    box.innerHTML = ''; box.classList.toggle('list', ['upgrades', 'goals'].includes(this.tab));
    this['tab_' + this.tab](box);
    if (soft) box.scrollTop = keep;
  }

  card({ title, img, cls = '', price, cur, priceLabel, priceCls = '', onArt, onPrice, badge, stats, lvl }) {
    const c = el('div', 'card ' + cls);
    c.innerHTML = `<h3>${title}</h3>`;
    const art = el('button', 'art'); art.innerHTML = `<img src="${img}" alt="">` + (lvl ? `<span class="lvl-pill">${lvl}</span>` : '');
    art.onclick = () => { unlockAudio(); onArt && onArt(); };
    c.appendChild(art);
    if (priceLabel != null || price != null) {
      const p = el('button', 'price ' + priceCls, priceLabel != null ? priceLabel : `${curIco(cur)}${fmt(price)}`);
      p.onclick = () => { unlockAudio(); (onPrice || onArt)?.(); };
      c.appendChild(p);
    }
    if (stats) c.appendChild(el('div', 'stats', stats));
    if (badge) c.appendChild(el('span', 'badge', '!'));
    return c;
  }

  tab_weapons(box) {
    this.weaponsList(box);
    this.workshop(box);
  }
  weaponsList(box) {
    const s = this.s, g = this.g;
    WEAPONS.filter(w => w.cur !== 'craft' || w.id in s.weapons).forEach(w => {
      if (w.cur === 'craft' && !(w.id in s.weapons)) return;
      const owned = w.id in s.weapons, lv = s.weapons[w.id] || 0, eq = s.weapon === w.id;
      const m = 1 + 0.25 * lv;
      const stats = `DMG ${fmt(w.dmg * m)} · ${fmt(w.coin * m)}$/hit`;
      if (!owned) {
        box.appendChild(this.card({ title: w.name, img: icon('weapon', w.id), cls: 'locked', price: w.price, cur: w.cur, priceCls: this.canAfford(w.price, w.cur) ? '' : 'cant', badge: this.canAfford(w.price, w.cur), stats,
          onArt: () => { if (this.spend(w.price, w.cur)) { s.weapons[w.id] = 0; s.weapon = w.id; this.toast(`${w.name} unlocked!`); this.renderShelf(); this.renderPanel(true); } } }));
      } else {
        const max = lv >= 10, cost = g.weaponUpCost(w);
        box.appendChild(this.card({ title: w.name, img: icon('weapon', w.id), cls: eq ? 'equipped' : '', lvl: `Lv ${lv + 1}`, stats: eq ? `✔ Equipped · ${stats}` : stats,
          priceLabel: max ? 'MAX' : `▲ ${curIco('coin')}${fmt(cost)}`, priceCls: max ? 'gray' : (s.coins >= cost ? 'green' : 'cant'),
          onArt: () => { s.weapon = w.id; sfx('tap'); this.renderShelf(); this.renderPanel(true); },
          onPrice: () => { if (max) return; if (this.spend(cost, 'coin')) { s.weapons[w.id] = lv + 1; sfx('levelup'); this.toast(`${w.name} upgraded to Lv ${lv + 2}`); this.renderShelf(); this.renderPanel(true); } } }));
      }
    });
  }

  workshop(box) {
    const s = this.s;
    const crafts = WEAPONS.filter(w => w.cur === 'craft' && !(w.id in s.weapons));
    box.appendChild(el('div', 'section-title', 'Workshop — craft with boss parts'));
    const inv = el('div', 'parts-row');
    inv.innerHTML = PARTS.map(p => `<span class="part"><b>${p.ico}</b>${s.parts[p.id] || 0}<small>${p.name}</small></span>`).join('') + '<small class="parts-note">Bosses drop parts when knocked out.</small>';
    box.appendChild(inv);
    crafts.forEach(w => {
      const ok = this.canCraft(w);
      box.appendChild(this.card({ title: w.name, img: icon('weapon', w.id), cls: 'locked', priceLabel: `🔧 ${this.recipeHtml(w)}`, priceCls: ok ? 'green' : 'cant', badge: ok,
        stats: `DMG ${w.dmg} · ${w.coin}$/hit · ${{ multi: 'hits twice', zap: 'electric', boom: 'explosive' }[w.fx]}`,
        onArt: () => {
          if (!this.canCraft(w)) { sfx('error'); this.toast('Missing parts', 'Knock out bosses to collect more'); return; }
          Object.entries(w.recipe).forEach(([k, n]) => s.parts[k] -= n);
          s.weapons[w.id] = 0; s.weapon = w.id; sfx('levelup'); save(s);
          this.toast(`${w.name} crafted!`); this.renderShelf(); this.renderPanel(true);
        } }));
    });
    if (!crafts.length) box.appendChild(el('div', 'parts-note', 'You\'ve crafted every workshop weapon. Nice.'));
  }

  tab_bosses(box) {
    const s = this.s;
    BOSSES.forEach(b => {
      const owned = b.id in s.bosses, eq = s.boss === b.id;
      const stats = `${b.title} · ×${b.mult} coins`;
      if (!owned) {
        box.appendChild(this.card({ title: b.name, img: icon('boss', this.bossKey(b), 160, 120, b), cls: 'locked', price: b.price, cur: b.cur, priceCls: this.canAfford(b.price, b.cur) ? '' : 'cant', badge: this.canAfford(b.price, b.cur), stats,
          onArt: () => { if (this.spend(b.price, b.cur)) { s.bosses[b.id] = 1; this.g.switchBoss(b.id); if (b.custom) this.customEditor(); else this.toast(`${b.name} has entered the room!`); this.renderPanel(true); } } }));
      } else {
        box.appendChild(this.card({ title: b.name, img: icon('boss', this.bossKey(b), 160, 120, b), cls: eq ? 'equipped' : '', lvl: `Lv ${s.bosses[b.id]}`, stats,
          priceLabel: b.custom ? '✏️ Edit' : eq ? 'Fighting' : 'Fight!', priceCls: b.custom ? 'alt' : eq ? 'gray' : 'green',
          onArt: () => { if (!eq) { this.g.switchBoss(b.id); sfx('tap'); this.renderPanel(true); } },
          onPrice: b.custom ? () => this.customEditor() : null }));
      }
    });
  }

  tab_rooms(box) {
    const s = this.s;
    ROOMS.forEach(r => {
      const owned = s.rooms.includes(r.id), eq = s.room === r.id;
      const stats = r.hazards.map(h => h.name).join(' · ');
      if (!owned) {
        box.appendChild(this.card({ title: r.name, img: icon('room', r.id, 200, 140, r), cls: 'room locked', price: r.price, cur: r.cur, priceCls: this.canAfford(r.price, r.cur) ? '' : 'cant', badge: this.canAfford(r.price, r.cur), stats,
          onArt: () => { if (this.spend(r.price, r.cur)) { s.rooms.push(r.id); this.g.switchRoom(r.id); this.toast(`Welcome to the ${r.name}!`, 'Tap glowing objects to trigger hazards'); this.renderPanel(true); } } }));
      } else {
        box.appendChild(this.card({ title: r.name, img: icon('room', r.id, 200, 140, r), cls: 'room' + (eq ? ' equipped' : ''), stats,
          priceLabel: eq ? 'You\'re here' : 'Go!', priceCls: eq ? 'gray' : 'green',
          onArt: () => { if (!eq) { this.g.switchRoom(r.id); sfx('tap'); this.renderPanel(true); } } }));
      }
    });
  }

  tab_style(box) {
    const s = this.s;
    box.appendChild(el('div', 'section-title', `Dress up ${this.g.bossDef.name}`));
    HATS.forEach(h => {
      const owned = s.hats.includes(h.id), eq = s.hat === h.id;
      if (!owned) box.appendChild(this.card({ title: h.name, img: icon('hat', h.id), cls: 'locked', price: h.price, cur: 'gem', priceCls: s.gems >= h.price ? '' : 'cant', badge: s.gems >= h.price,
        onArt: () => { if (this.spend(h.price, 'gem')) { s.hats.push(h.id); s.hat = h.id; this.toast(`${h.name} equipped!`); this.renderPanel(true); } } }));
      else box.appendChild(this.card({ title: h.name, img: icon('hat', h.id), cls: eq ? 'equipped' : '', priceLabel: eq ? 'Wearing' : 'Wear', priceCls: eq ? 'gray' : 'green',
        onArt: () => { s.hat = h.id; sfx('tap'); this.renderPanel(true); } }));
    });
  }

  tab_upgrades(box) {
    const g = this.g, s = this.s;
    const icons = { crit: '🎯', combo: '⚡', rage: '😡', intern: '🧑‍💼', idle: '💤', hazard: '⚠️', luck: '💎' };
    const now = { crit: () => `${Math.round(g.critChance() * 100)}% crit`, combo: () => `${g.comboWindow().toFixed(2)}s window`, rage: () => `${g.rageDur()}s rage`,
      intern: () => g.up('intern') ? `${g.internRate().toFixed(2)} throws/s` : 'Not hired yet', idle: () => `${fmt(g.idleRate())} coins/min (up to 8h)`,
      hazard: () => `-${g.up('hazard') * 6}% cooldown`, luck: () => `${(g.gemChance() * 100).toFixed(2)}% per hit` };
    UPGRADES.forEach(u => {
      const lv = g.up(u.id), max = lv >= u.max, cost = g.upgradeCost(u);
      const r = el('div', 'row');
      r.innerHTML = `<div class="ico">${icons[u.id]}</div><div class="txt"><b>${u.name} <span style="color:#7a5a3a;font-size:13px">Lv ${lv}/${u.max}</span></b><small>${u.desc} · now: ${now[u.id]()}</small><div class="bar"><span style="width:${lv / u.max * 100}%"></span></div></div>`;
      const p = el('button', 'price ' + (max ? 'gray' : s.coins >= cost ? 'green' : 'cant'), max ? 'MAX' : `${curIco('coin')}${fmt(cost)}`);
      p.onclick = () => { if (max) return; if (this.spend(cost, 'coin')) { s.upgrades[u.id] = lv + 1; sfx('levelup'); this.renderPanel(true); } };
      r.appendChild(p); box.appendChild(r);
    });
    const rate = Math.round(800 * g.bossCoinMult());
    const ex = el('div', 'row');
    ex.innerHTML = `<div class="ico">💱</div><div class="txt"><b>Gem Exchange</b><small>Swap 5 gems for ${fmt(rate)} coins · rate grows with your boss</small></div>`;
    const eb = el('button', 'price ' + (s.gems >= 5 ? 'green' : 'cant'), `${curIco('gem')}5`);
    eb.onclick = () => { if (this.spend(5, 'gem')) { s.coins += rate; this.toast(`+${fmt(rate)} coins`); this.renderPanel(true); } };
    ex.appendChild(eb); box.appendChild(ex);
  }

  tab_goals(box) {
    const g = this.g, s = this.s;
    // daily
    const d = el('div', 'row');
    const avail = this.dailyAvailable();
    d.innerHTML = `<div class="ico">🎁</div><div class="txt"><b>Daily Bonus</b><small>${avail ? 'Your daily reward is ready!' : `Streak: ${s.daily.streak} day${s.daily.streak === 1 ? '' : 's'} · come back tomorrow`}</small></div>`;
    const db = el('button', 'price ' + (avail ? 'green' : 'gray'), avail ? 'Open' : 'Claimed');
    db.onclick = () => avail && this.daily(); d.appendChild(db); box.appendChild(d);
    // daily timed boss challenge
    const done = g.challengeDone(), running = !!g.challenge;
    const ch = el('div', 'row');
    ch.innerHTML = `<div class="ico">⏱</div><div class="txt"><b>Boss Challenge</b><small>${done ? 'Beaten today — new challenge tomorrow' : running ? 'In progress — go go go!' : `KO ${g.bossDef.name} (Lv ${g.bossLv}) within 45 seconds · reward 10 💎 + coins`}</small></div>`;
    const cb = el('button', 'price ' + (done || running ? 'gray' : 'green'), done ? 'Done' : running ? 'Live' : 'Start');
    cb.onclick = () => { if (done || running) return; if (g.startChallenge()) { this.renderPanel(true); if (matchMedia('(orientation: portrait), (max-width: 700px)').matches) this.setPanel(false); } };
    ch.appendChild(cb); box.appendChild(ch);
    // quest
    const q = g.questInfo();
    const qr = el('div', 'row');
    qr.innerHTML = `<div class="ico">🎯</div><div class="txt"><b>${q.title}</b><small>Reward: ${fmt(q.coins)} coins + ${q.gems} 💎 · Quest #${s.quest.idx + 1}</small><div class="bar"><span style="width:${q.prog / q.target * 100}%"></span></div></div><div class="price gray">${fmt(q.prog)}/${fmt(q.target)}</div>`;
    box.appendChild(qr);
    // achievements
    box.appendChild(el('div', 'section-title', 'Achievements'));
    const list = [...ACHIEVEMENTS].sort((a, b) => (s.achievements[a.id] ? 1 : 0) - (s.achievements[b.id] ? 1 : 0));
    list.forEach(a => {
      const v = g.statValue(a.stat), done = !!s.achievements[a.id], ready = !done && v >= a.goal;
      const r = el('div', 'row' + (done ? ' done' : ''));
      r.innerHTML = `<div class="ico">${done ? '✅' : ready ? '🏆' : '🔒'}</div><div class="txt"><b>${a.name}</b><small>${this.achDesc(a)} · ${fmt(Math.min(v, a.goal))}/${fmt(a.goal)}</small><div class="bar"><span style="width:${Math.min(1, v / a.goal) * 100}%"></span></div></div>`;
      const p = el('button', 'price ' + (ready ? 'green' : 'gray'), done ? 'Done' : `${curIco('gem')}${a.gems}`);
      p.onclick = () => { if (!ready) return; s.achievements[a.id] = 'claimed'; s.gems += a.gems; sfx('levelup'); this.toast(`Achievement: ${a.name}`, `+${a.gems} 💎`); save(s); this.renderPanel(true); this.updateBadges(); };
      r.appendChild(p); box.appendChild(r);
    });
    // stats
    const st = s.stats;
    box.appendChild(el('div', 'section-title', 'Career stats'));
    const sr = el('div', 'row');
    sr.innerHTML = `<div class="txt"><small>Hits: ${fmt(st.hits)} · KOs: ${fmt(st.kos)} · Best combo: ${st.bestCombo} · Crits: ${fmt(st.crits)} · Hazards: ${fmt(st.hazards)} · Trick shots: ${fmt(st.tricks)} · Rages: ${st.rages} · Events: ${st.events} · Coins earned: ${fmt(st.earned)}</small></div>`;
    box.appendChild(sr);
  }
  achDesc(a) {
    return { slams: 'Slam the boss into walls, floor or ceiling', shields: 'Force fields broken', challenges: 'Boss challenges won', hits: 'Total hits', kos: 'Knock-outs', bestCombo: 'Best combo', rages: 'Rage modes', hazards: 'Hazards triggered', tricks: 'Fling trick shots (headshots)', events: 'Random office events', earned: 'Coins earned', weaponsOwned: 'Own every weapon', roomsOwned: 'Own every room' }[a.stat];
  }

  // ---------------------------------------------------- daily & idle
  dailyAvailable() { return this.s.daily.last !== today(); }
  daily() {
    const s = this.s, d = s.daily;
    const gap = d.last ? dayDiff(d.last, today()) : 99;
    const streak = gap === 1 ? d.streak + 1 : 1;
    const idx = (streak - 1) % 7;
    let html = '<h2>Daily Bonus</h2><p>Come back every day — the rewards grow!</p><div class="days">';
    DAILY.forEach((r, i) => { html += `<div class="day ${i < idx ? 'got' : i === idx ? 'today' : ''}">Day ${i + 1}<b>${r.gems ? r.gems + ' 💎' : fmt(r.coins) + ' $'}</b></div>`; });
    html += '</div><button class="big-btn" id="claimDaily">Claim!</button>';
    this.modal(html, true);
    $('#claimDaily').onclick = () => {
      const r = DAILY[idx];
      if (r.gems) s.gems += r.gems; if (r.coins) { s.coins += r.coins; s.stats.earned += r.coins; }
      d.last = today(); d.streak = streak; save(s); sfx('levelup');
      this.closeModal(); this.toast('Daily bonus claimed!', r.gems ? `+${r.gems} 💎` : `+${fmt(r.coins)} coins`); this.renderPanel(true);
    };
  }
  welcomeBack() {
    const s = this.s, mins = Math.min(480, (Date.now() - (s.lastSeen || Date.now())) / 60000);
    const rate = this.g.idleRate();
    if (rate <= 0 || mins < 2) return false;
    const coins = Math.round(rate * mins);
    this.modal(`<h2>Welcome back!</h2><p>While you were away for ${mins >= 60 ? (mins / 60).toFixed(1) + ' hours' : Math.round(mins) + ' minutes'}, your side hustle earned:</p><h2>${curIco('coin')} ${fmt(coins)}</h2><button class="big-btn" id="collectIdle">Collect</button>`, true);
    $('#collectIdle').onclick = () => { s.coins += coins; s.stats.earned += coins; save(s); sfx('coin'); this.closeModal(); if (this.dailyAvailable()) setTimeout(() => this.daily(), 300); };
    return true;
  }

  // ---------------------------------------------------- KO bonus briefcase
  briefcase() {
    if (!$('#modal').classList.contains('hidden')) return;
    const g = this.g, s = this.s;
    const coinR = Math.round(400 * g.bossCoinMult() * (1 + Math.random()));
    const pool = [
      { label: `${fmt(coinR)}`, ico: '<i class="coin-ico">$</i>', give: () => { s.coins += coinR; s.stats.earned += coinR; } },
      { label: `${3 + Math.floor(Math.random() * 4)}`, ico: '<i class="gem-ico"></i>', gems: true },
      { label: '', ico: '', part: true },
    ];
    pool[1].give = () => { s.gems += +pool[1].label; };
    const pp = PARTS[Math.floor(Math.random() * PARTS.length)], pn = 2 + Math.floor(Math.random() * 2);
    pool[2].label = `${pn} ${pp.name}`; pool[2].ico = pp.ico; pool[2].give = () => { s.parts[pp.id] = (s.parts[pp.id] || 0) + pn; };
    pool.sort(() => Math.random() - 0.5);
    this.modal(`<h2>Bonus Briefcase!</h2><p>Every third knockout earns a briefcase. Pick one.</p>
      <div class="cases">${pool.map((_, i) => `<button class="case" data-i="${i}"><span class="case-art">💼</span><span class="case-prize"></span></button>`).join('')}</div>
      <button class="big-btn hidden-btn" id="caseDone">Back to work</button>`, true);
    const btns = [...document.querySelectorAll('.case')];
    btns.forEach(btn => btn.onclick = () => {
      if (this._picked) return; this._picked = true;
      const i = +btn.dataset.i; pool[i].give(); save(s); sfx('levelup');
      btns.forEach((b2, j) => { b2.classList.add('open'); if (j !== i) b2.classList.add('dim'); b2.querySelector('.case-prize').innerHTML = `${pool[j].ico}<b>${pool[j].label}</b>`; });
      $('#caseDone').classList.remove('hidden-btn');
    });
    this._picked = false;
    $('#caseDone').onclick = () => { this.closeModal(); this.renderPanel(true); };
  }

  // ---------------------------------------------------- custom boss editor
  customEditor() {
    const s = this.s, def = byId(BOSSES, 'custom');
    const look = JSON.parse(JSON.stringify(def.look));
    let name = s.custom?.name || 'My Boss';
    const sw = (key, vals) => `<div class="opt-row"><span>${{ skin: 'Skin', hair: 'Hair colour', suit: 'Suit', tie: 'Tie' }[key]}</span><div class="swatches">${vals.map(v => `<button class="sw ${look[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}" style="background:${v || 'transparent'}" aria-label="${key} ${v || 'none'}">${v ? '' : '✕'}</button>`).join('')}</div></div>`;
    this.modal(`<h2>Create your boss</h2>
      <canvas id="cbPrev" width="300" height="300" class="cb-prev"></canvas>
      <label class="opt-row"><span>Name</span><input id="cbName" maxlength="18" value="${name.replace(/"/g, '&quot;')}" autocomplete="off"></label>
      ${sw('skin', CUSTOM_OPTS.skin)}
      <div class="opt-row"><span>Hair</span><div class="swatches">${CUSTOM_OPTS.hairStyle.map(v => `<button class="chip ${look.hairStyle === v ? 'on' : ''}" data-k="hairStyle" data-v="${v}">${v}</button>`).join('')}</div></div>
      ${sw('hair', CUSTOM_OPTS.hair)}${sw('suit', CUSTOM_OPTS.suit)}${sw('tie', CUSTOM_OPTS.tie)}
      <div class="opt-row"><span>Extras</span><div class="swatches">${['stache', 'glasses', 'beard'].map(k => `<button class="chip ${look[k] ? 'on' : ''}" data-t="${k}">${{ stache: 'Moustache', glasses: 'Glasses', beard: 'Beard' }[k]}</button>`).join('')}</div></div>
      <button class="big-btn" id="cbSave">Save boss</button>`, true);
    const cv = $('#cbPrev');
    const draw = () => drawBossPreview(cv, look, s.boss === 'custom' ? s.hat : 'none');
    draw();
    document.querySelectorAll('#modalCard [data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k; const v = b.dataset.v === 'null' ? null : b.dataset.v;
      look[k] = v; document.querySelectorAll(`#modalCard [data-k="${k}"]`).forEach(x => x.classList.toggle('on', x === b)); sfx('tap'); draw();
    });
    document.querySelectorAll('#modalCard [data-t]').forEach(b => b.onclick = () => { const k = b.dataset.t; look[k] = !look[k]; b.classList.toggle('on', look[k]); sfx('tap'); draw(); });
    $('#cbSave').onclick = () => {
      name = ($('#cbName').value || '').trim().slice(0, 18) || 'My Boss';
      s.custom = { name, look }; s.customVer = (s.customVer || 0) + 1;
      this.applyCustom(); save(s); sfx('buy');
      this.closeModal(); this.toast(`${name} is ready to be beaten!`); this.renderPanel(true);
    };
  }

  // ---------------------------------------------------- settings
  settings() {
    const s = this.s;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    let install = '';
    if (!standalone) {
      if (this.installEvt) install = '<button class="big-btn alt" id="installBtn">Install app</button>';
      else if (isIOS) install = '<p>Play offline on iPhone/iPad:</p><ol class="install-steps"><li>Open this page in <b>Safari</b></li><li>Tap the <b>Share</b> button</li><li>Choose <b>Add to Home Screen</b></li></ol>';
      else install = '<p>To play offline, use your browser menu → <b>Install app</b> / <b>Add to Home screen</b>.</p>';
    } else install = '<p>✅ Installed — works offline.</p>';
    this.modal(`<h2>Settings</h2>
      <div class="toggle-row">Sound <button class="switch ${s.settings.sound ? 'on' : ''}" id="swSound" aria-label="Sound"></button></div>
      <div class="toggle-row">Vibration <button class="switch ${s.settings.haptics ? 'on' : ''}" id="swHap" aria-label="Vibration"></button></div>
      ${install}
      <p style="font-size:12px">Tip: tap = throw, swipe = fling (1.5× damage, headshots are trick shots). Spacebar works on laptops.</p>
      <button class="big-btn" id="closeSet">Back to work</button>
      <button class="big-btn danger" id="resetBtn">Reset save</button>`);
    $('#swSound').onclick = e => { s.settings.sound = audio.enabled = !s.settings.sound; e.target.classList.toggle('on', s.settings.sound); if (s.settings.sound) { unlockAudio(); sfx('coin'); } save(s); };
    $('#swHap').onclick = e => { s.settings.haptics = audio.haptics = !s.settings.haptics; e.target.classList.toggle('on', s.settings.haptics); save(s); };
    $('#closeSet').onclick = () => this.closeModal();
    $('#resetBtn').onclick = e => { const b = e.currentTarget; if (b.dataset.armed) { wipe(); this.g.s = null; location.reload(); } else { b.dataset.armed = '1'; b.textContent = 'Tap again to erase everything'; } };
    const ib = $('#installBtn'); if (ib) ib.onclick = async () => { this.installEvt.prompt(); await this.installEvt.userChoice; this.installEvt = null; this.closeModal(); };
  }

  // ---------------------------------------------------- modal / toast
  modal(html, locked = false) { this.modalLocked = locked; $('#modalCard').innerHTML = html; $('#modal').classList.remove('hidden'); }
  closeModal() { $('#modal').classList.add('hidden'); this.modalLocked = false; }
  toast(title, sub) {
    const t = el('div', 'toast', `${title}${sub ? `<small>${sub}</small>` : ''}`);
    $('#toasts').appendChild(t);
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, 2600);
  }
}
