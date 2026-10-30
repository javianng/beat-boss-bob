// Persistent save in localStorage.
const KEY = 'beat-boss-bob-save-v1';

export function freshState() {
  return {
    v: 1,
    coins: 100, gems: 5,
    weapons: { pencil: 0 },         // id -> upgrade level
    weapon: 'pencil',
    bosses: { bob: 1 },             // id -> boss level
    boss: 'bob',
    rooms: ['office'],
    room: 'office',
    hats: ['none'],
    hat: 'none',
    upgrades: {},                   // id -> level
    stats: { hits: 0, kos: 0, bestCombo: 0, rages: 0, hazards: 0, tricks: 0, events: 0, earned: 0, crits: 0, slams: 0, shields: 0, challenges: 0 },
    parts: { gear: 0, spring: 0, tape: 0, battery: 0 },
    custom: null, customVer: 0,
    challenge: { last: null },
    koCount: 0,
    achievements: {},               // id -> 'claimed'
    quest: { idx: 0, type: 0, start: 0, best: 0 },
    daily: { last: null, streak: 0 },
    seen: {},                       // id -> true (for "!" badges)
    settings: { sound: true, haptics: true },
    lastSeen: Date.now(),
    bossHp: null,
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    const f = freshState();
    // shallow-merge so new fields added in updates get defaults
    for (const k in f) if (s[k] === undefined) s[k] = f[k];
    for (const k in f.stats) if (s.stats[k] === undefined) s.stats[k] = 0;
    return s;
  } catch (e) {
    return freshState();
  }
}

export function save(state) {
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {}
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}
