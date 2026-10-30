// ===== Beat Boss Bob — game data =====
// All art is drawn procedurally in render.js, keyed by these ids.

export const WEAPONS = [
  { id: 'pencil',   name: 'Pencil',          price: 0,     cur: 'coin', dmg: 1,   coin: 1,  spin: 18, size: 1.0, sfx: 'thwack' },
  { id: 'paper',    name: 'Paper Ball',      price: 150,   cur: 'coin', dmg: 2,   coin: 2,  spin: 8,  size: 1.0, sfx: 'paper' },
  { id: 'stapler',  name: 'Stapler',         price: 450,   cur: 'coin', dmg: 3,   coin: 3,  spin: 12, size: 1.1, sfx: 'clunk' },
  { id: 'coffee',   name: 'Hot Coffee',      price: 1000,  cur: 'coin', dmg: 5,   coin: 4,  spin: 6,  size: 1.1, sfx: 'splash', splat: '#6b3e1f' },
  { id: 'dart',     name: 'Dart',            price: 2000,  cur: 'coin', dmg: 7,   coin: 6,  spin: 0,  size: 1.0, sfx: 'thunk', sticks: true },
  { id: 'balloon',  name: 'Water Balloon',   price: 3500,  cur: 'coin', dmg: 10,  coin: 8,  spin: 4,  size: 1.2, sfx: 'splash', splat: '#4fb3ff' },
  { id: 'chicken',  name: 'Rubber Chicken',  price: 6000,  cur: 'coin', dmg: 14,  coin: 11, spin: 14, size: 1.3, sfx: 'squeak' },
  { id: 'keyboard', name: 'Keyboard',        price: 10000, cur: 'coin', dmg: 20,  coin: 15, spin: 10, size: 1.4, sfx: 'clack' },
  { id: 'pie',      name: 'Cream Pie',       price: 16000, cur: 'coin', dmg: 28,  coin: 20, spin: 3,  size: 1.3, sfx: 'splat', splat: '#fff6e0' },
  { id: 'cactus',   name: 'Desk Cactus',     price: 25000, cur: 'coin', dmg: 40,  coin: 28, spin: 9,  size: 1.2, sfx: 'clunk' },
  { id: 'bowling',  name: 'Bowling Ball',    price: 40000, cur: 'coin', dmg: 60,  coin: 40, spin: 7,  size: 1.4, sfx: 'boom', heavy: true },
  { id: 'golden',   name: 'Golden Stapler',  price: 60,    cur: 'gem',  dmg: 100, coin: 70, spin: 12, size: 1.2, sfx: 'ding' },
  { id: 'disco',    name: 'Disco Ball',      price: 150,   cur: 'gem',  dmg: 180, coin: 120, spin: 5, size: 1.4, sfx: 'disco', heavy: true },
  // Workshop weapons: crafted from parts the bosses drop
  { id: 'boomerang', name: 'Boomerang Tie',  cur: 'craft', recipe: { gear: 2, tape: 3 },                       dmg: 35,  coin: 25,  spin: 16, size: 1.2, sfx: 'whoosh', fx: 'multi' },
  { id: 'thunder',   name: 'Thunder Mug',    cur: 'craft', recipe: { battery: 4, spring: 2, gear: 2 },         dmg: 70,  coin: 45,  spin: 6,  size: 1.2, sfx: 'zap',    fx: 'zap' },
  { id: 'rocket',    name: 'Rocket Stapler', cur: 'craft', recipe: { gear: 5, spring: 4, battery: 4, tape: 3 }, dmg: 140, coin: 90,  spin: 0,  size: 1.3, sfx: 'boom',   fx: 'boom', heavy: true },
];

export const PARTS = [
  { id: 'gear',    name: 'Gear',      ico: '⚙️' },
  { id: 'spring',  name: 'Spring',    ico: '🌀' },
  { id: 'tape',    name: 'Duct Tape', ico: '🩹' },
  { id: 'battery', name: 'Battery',   ico: '🔋' },
];

export const CUSTOM_OPTS = {
  skin: ['#f6c7a5', '#ffd9b8', '#f1c19a', '#c98b62', '#8d5524', '#5c3a21'],
  hairStyle: ['mop', 'slick', 'combover', 'curls', 'bun', 'bald'],
  hair: ['#5a3418', '#1f1410', '#3d3d3d', '#c9a24a', '#d35400', '#b9b9c4'],
  suit: ['#2f56b8', '#5c6b73', '#c0392b', '#1d1d22', '#7e5a9b', '#2e7d32', '#e67e22'],
  tie: ['#7a4a2a', '#d93838', '#ffcc00', '#1e88e5', null],
};

export const BOSSES = [
  { id: 'bob',   name: 'Bob',            title: 'Middle Manager',    price: 0,     cur: 'coin', hp: 60,    mult: 1,
    look: { skin: '#f6c7a5', hair: '#5a3418', hairStyle: 'mop', suit: '#2f56b8', tie: '#7a4a2a', stache: true, glasses: false, shirt: '#ffffff' },
    quotes: ['Per my last email!', 'Let\'s circle back!', 'You\'re on thin ice!', 'Who approved THIS?!', 'My office. Now!', 'That\'s a write-up!'] },
  { id: 'mike',  name: 'Micro-Manager Mike', title: 'Team Lead',     price: 2500,  cur: 'coin', hp: 150,   mult: 1.6,
    look: { skin: '#ffd9b8', hair: '#3d3d3d', hairStyle: 'combover', suit: '#5c6b73', tie: '#d93838', stache: false, glasses: true, shirt: '#e8f1ff' },
    quotes: ['Is that in the tracker?', 'Quick sync?', 'Font is 11, not 12!', 'I CC\'d your mom.', 'Update the update!'] },
  { id: 'dana',  name: 'Deadline Dana',  title: 'Project Director',  price: 8000,  cur: 'coin', hp: 350,   mult: 2.4,
    look: { skin: '#c98b62', hair: '#1f1410', hairStyle: 'bun', suit: '#c0392b', tie: null, stache: false, glasses: false, headset: true, shirt: '#ffffff', lipstick: true },
    quotes: ['It was due yesterday!', 'EOD means NOW!', 'Weekend? Never heard of it.', 'Move fast, break you!'] },
  { id: 'steve', name: 'Synergy Steve',  title: 'Chief Visionary',   price: 25000, cur: 'coin', hp: 900,   mult: 3.5,
    look: { skin: '#f1c19a', hair: '#c9a24a', hairStyle: 'slick', suit: '#1d1d22', tie: null, turtleneck: true, stache: false, glasses: false, beard: true, shirt: '#1d1d22' },
    quotes: ['Let\'s disrupt your face!', 'Think outside the box!', 'Synergize harder!', 'We\'re a family. Pay cut!'] },
  { id: 'agnes', name: 'Auditor Agnes',  title: 'Compliance Queen',  price: 60000, cur: 'coin', hp: 2000,  mult: 5,
    look: { skin: '#f3d1b5', hair: '#b9b9c4', hairStyle: 'curls', suit: '#7e5a9b', tie: null, cardigan: true, stache: false, glasses: true, pearls: true, shirt: '#f5e6ff' },
    quotes: ['Receipts. ALL of them.', 'That\'s a 3-page form.', 'Non-compliant!', 'I see everything.'] },
  { id: 'robo',  name: 'RoboBoss 3000',  title: 'Automated Overlord', price: 120,  cur: 'gem',  hp: 4000,  mult: 8,
    look: { robot: true, skin: '#b8c4cf', suit: '#3c4652', tie: '#ffcc00', shirt: '#9aa7b3' },
    quotes: ['EFFICIENCY: 4%.', 'YOU ARE REPLACEABLE.', 'REBOOTING ANGER.', 'BEEP. FIRED. BOOP.'] },
  { id: 'custom', name: 'Custom Boss', title: 'Made by you', price: 5000, cur: 'coin', hp: 250, mult: 2.8, custom: true,
    look: { skin: '#f1c19a', hair: '#1f1410', hairStyle: 'slick', suit: '#1d1d22', tie: '#d93838', stache: false, glasses: true, beard: false, shirt: '#ffffff' },
    quotes: ['Is that a typo?!', 'Synergy, people!', 'My door is always closed.', 'Overtime is a privilege!', 'We need to talk.'] },
  { id: 'chair', name: 'The Chairman',   title: 'Owner of Everything', price: 350, cur: 'gem',  hp: 10000, mult: 14,
    look: { skin: '#ffe0c4', hair: '#ffffff', hairStyle: 'bald', suit: '#4a1f1f', tie: '#d4af37', stache: true, stacheColor: '#ffffff', monocle: true, tophat: true, shirt: '#ffffff' },
    quotes: ['I own this building.', 'Do you know who I am?', 'Bring me my yacht!', 'Peasant!'] },
];

// Hazards are tappable room features. x,y,w,h are in logical scene coords (1000x700 world).
export const ROOMS = [
  { id: 'office', name: 'Cubicle Farm', price: 0, cur: 'coin',
    wall: '#e9e4d8', wall2: '#d8d1c0', floor: '#7c6b9e', floor2: '#6c5b8e',
    hazards: [
      { id: 'lamp',    name: 'Dodgy Light',    x: 470, y: 40,  w: 120, h: 80,  cd: 14, dmg: 0.14, desc: 'Exposed wire drops and electrocutes!' },
      { id: 'printer', name: 'Possessed Printer', x: 150, y: 450, w: 150, h: 120, cd: 16, dmg: 0.12, desc: 'Jams, overheats and blasts toner.' },
      { id: 'cooler',  name: 'Water Cooler',   x: 760, y: 360, w: 90,  h: 220, cd: 18, dmg: 0.13, desc: 'Topples and bottle-bonks the boss.' },
    ] },
  { id: 'store', name: 'Gadget Store', price: 3000, cur: 'coin',
    wall: '#f1f1f4', wall2: '#dfe3ea', floor: '#6b4f8f', floor2: '#5a3f7d',
    hazards: [
      { id: 'sensor', name: 'Shoplift Sensor', x: 140, y: 300, w: 120, h: 290, cd: 18, dmg: 0.16, desc: 'Alarm! Security guard tackles the boss.' },
      { id: 'tvwall', name: 'TV Display',      x: 640, y: 110, w: 220, h: 150, cd: 15, dmg: 0.13, desc: 'Giant TV crashes onto the boss.' },
      { id: 'drone',  name: 'Demo Drone',      x: 300, y: 120, w: 120, h: 70,  cd: 12, dmg: 0.10, desc: 'Drone dive-bombs the boss\'s head.' },
    ] },
  { id: 'break', name: 'Break Room', price: 12000, cur: 'coin',
    wall: '#fbe7c6', wall2: '#f2d6a8', floor: '#b5835a', floor2: '#a3734c',
    hazards: [
      { id: 'microwave', name: 'Fishy Microwave', x: 150, y: 330, w: 140, h: 100, cd: 15, dmg: 0.13, desc: 'Popcorn explosion to the face.' },
      { id: 'coffeemac', name: 'Espresso Machine', x: 330, y: 340, w: 100, h: 110, cd: 13, dmg: 0.11, desc: 'Scalding steam jet!' },
      { id: 'fridge',    name: 'Office Fridge',   x: 760, y: 260, w: 130, h: 320, cd: 18, dmg: 0.15, desc: 'Door slams, frozen fish falls out.' },
    ] },
  { id: 'board', name: 'Board Room', price: 35000, cur: 'coin',
    wall: '#3e4a5c', wall2: '#334052', floor: '#8a6a4a', floor2: '#7a5a3c',
    hazards: [
      { id: 'fan',       name: 'Ceiling Fan',   x: 420, y: 30,  w: 160, h: 70,  cd: 16, dmg: 0.15, desc: 'Fan detaches and goes spinning.' },
      { id: 'projector', name: 'Projector',     x: 150, y: 140, w: 110, h: 60,  cd: 12, dmg: 0.10, desc: 'Blinding beam — boss stumbles!' },
      { id: 'chairz',    name: 'Swivel Chair',  x: 760, y: 430, w: 110, h: 150, cd: 14, dmg: 0.12, desc: 'Zooms in and spins the boss.' },
    ] },
  { id: 'server', name: 'Server Room', price: 80000, cur: 'coin',
    wall: '#1e2a36', wall2: '#17222c', floor: '#3a4752', floor2: '#323e48',
    hazards: [
      { id: 'rack',      name: 'Sparky Rack',  x: 120, y: 200, w: 140, h: 380, cd: 15, dmg: 0.15, desc: 'Arc of electricity zaps the boss.' },
      { id: 'sprinkler', name: 'Fire Sprinkler', x: 640, y: 30, w: 80, h: 50,  cd: 14, dmg: 0.11, desc: 'Alarm + freezing water deluge.' },
      { id: 'cable',     name: 'Loose Cables', x: 380, y: 610, w: 240, h: 50,  cd: 12, dmg: 0.12, desc: 'Boss trips and faceplants.' },
    ] },
  { id: 'lab', name: 'Secret R&D Lab', price: 200, cur: 'gem',
    wall: '#2b2550', wall2: '#221d44', floor: '#4a4a5a', floor2: '#3e3e4e',
    hazards: [
      { id: 'tesla',  name: 'Tesla Coil',   x: 130, y: 260, w: 120, h: 320, cd: 14, dmg: 0.18, desc: 'Lightning storm!' },
      { id: 'magnet', name: 'Giant Magnet', x: 780, y: 120, w: 120, h: 120, cd: 16, dmg: 0.16, desc: 'Yanks the boss by his tie.' },
      { id: 'banana', name: 'Banana Peel',  x: 600, y: 600, w: 90,  h: 40,  cd: 10, dmg: 0.10, desc: 'Classic slip. Classic.' },
    ] },
];

export const HATS = [
  { id: 'none',     name: 'No Hat',        price: 0 },
  { id: 'party',    name: 'Party Hat',     price: 5 },
  { id: 'cone',     name: 'Traffic Cone',  price: 10 },
  { id: 'propeller',name: 'Propeller Cap', price: 15 },
  { id: 'chef',     name: 'Chef Hat',      price: 15 },
  { id: 'pirate',   name: 'Pirate Hat',    price: 20 },
  { id: 'crown',    name: 'Paper Crown',   price: 25 },
  { id: 'viking',   name: 'Viking Helmet', price: 30 },
  { id: 'duck',     name: 'Rubber Duck',   price: 40 },
];

export const UPGRADES = [
  { id: 'crit',   name: 'Lucky Aim',       desc: '+2% crit chance',          base: 300,  growth: 1.7, max: 15 },
  { id: 'combo',  name: 'Fast Hands',      desc: 'Longer combo window',      base: 400,  growth: 1.7, max: 10 },
  { id: 'rage',   name: 'Short Fuse',      desc: '+1s rage mode',            base: 600,  growth: 1.8, max: 10 },
  { id: 'intern', name: 'Hire an Intern',  desc: 'Auto-throws for you',      base: 1000, growth: 1.65, max: 20 },
  { id: 'idle',   name: 'Side Hustle',     desc: 'Earn coins while away',    base: 800,  growth: 1.6, max: 20 },
  { id: 'hazard', name: 'Building Code Violations', desc: 'Hazards recharge faster', base: 1500, growth: 1.8, max: 10 },
  { id: 'luck',   name: 'Gem Magnet',      desc: 'More gem drops',           base: 2000, growth: 1.9, max: 10 },
];

export const ACHIEVEMENTS = [
  { id: 'hit1',    name: 'First Strike',      stat: 'hits',     goal: 1,       gems: 2 },
  { id: 'hit500',  name: 'Getting Warmed Up', stat: 'hits',     goal: 500,     gems: 5 },
  { id: 'hit5k',   name: 'Stress Relief',     stat: 'hits',     goal: 5000,    gems: 15 },
  { id: 'hit50k',  name: 'Pent-up Rage',      stat: 'hits',     goal: 50000,   gems: 50 },
  { id: 'ko1',     name: 'Out Cold',          stat: 'kos',      goal: 1,       gems: 3 },
  { id: 'ko25',    name: 'Serial Restructurer', stat: 'kos',    goal: 25,      gems: 15 },
  { id: 'ko100',   name: 'Hostile Takeover',  stat: 'kos',      goal: 100,     gems: 40 },
  { id: 'combo25', name: 'Combo Breaker',     stat: 'bestCombo', goal: 25,     gems: 5 },
  { id: 'combo100',name: 'Unstoppable',       stat: 'bestCombo', goal: 100,    gems: 20 },
  { id: 'rage10',  name: 'Anger Management',  stat: 'rages',    goal: 10,      gems: 10 },
  { id: 'haz20',   name: 'Health & Safety',   stat: 'hazards',  goal: 20,      gems: 8 },
  { id: 'haz200',  name: 'OSHA Nightmare',    stat: 'hazards',  goal: 200,     gems: 30 },
  { id: 'trick10', name: 'Trick Shot',        stat: 'tricks',   goal: 10,      gems: 8 },
  { id: 'evt10',   name: 'Weird Day at Work', stat: 'events',   goal: 10,      gems: 8 },
  { id: 'coin10k', name: 'Small Bonus',       stat: 'earned',   goal: 10000,   gems: 5 },
  { id: 'coin1m',  name: 'Golden Parachute',  stat: 'earned',   goal: 1000000, gems: 50 },
  { id: 'arsenal', name: 'Full Arsenal',      stat: 'weaponsOwned', goal: WEAPONS.length, gems: 60 },
  { id: 'slam50',  name: 'Frequent Flyer',    stat: 'slams',    goal: 50,      gems: 10 },
  { id: 'slam500', name: 'Human Pinball',     stat: 'slams',    goal: 500,     gems: 35 },
  { id: 'shield10',name: 'Force Field Breaker', stat: 'shields', goal: 10,     gems: 12 },
  { id: 'chal5',   name: 'Beat the Clock',    stat: 'challenges', goal: 5,     gems: 20 },
  { id: 'rooms',   name: 'Real Estate Mogul', stat: 'roomsOwned',   goal: ROOMS.length,   gems: 40 },
];

export const QUEST_TYPES = [
  { stat: 'hits',    title: n => `Hit the boss ${n} times`, base: 60 },
  { stat: 'earned',  title: n => `Show me the money`,       base: 500 },
  { stat: 'kos',     title: n => `Knock out ${n} boss${n > 1 ? 'es' : ''}`, base: 1 },
  { stat: 'hazards', title: n => `Use room hazards ${n}x`,  base: 3 },
  { stat: 'combos',  title: n => `Reach a ${n}-hit combo`,  base: 15, best: true },
  { stat: 'tricks',  title: n => `Land ${n} fling trick shots`, base: 3 },
  { stat: 'rages',   title: n => `Go into rage mode ${n}x`, base: 1 },
  { stat: 'crits',   title: n => `Land ${n} critical hits`, base: 15 },
  { stat: 'slams',   title: n => `Slam the boss into walls ${n}x`, base: 5 },
];

export const DAILY = [
  { coins: 200 }, { coins: 400 }, { gems: 5 }, { coins: 1000 }, { gems: 10 }, { coins: 2500 }, { gems: 25 },
];

export const EVENTS = [
  { id: 'pigeon', name: 'Office Pigeon!',     dmg: 0.08 },
  { id: 'intern', name: 'Rogue Intern!',      dmg: 0.10 },
  { id: 'planes', name: 'Paper Plane Squadron!', dmg: 0.09 },
  { id: 'cat',    name: 'Office Cat!',        dmg: 0.08 },
  { id: 'pizza',  name: 'Pizza Delivery!',    dmg: 0.07 },
  { id: 'gift',   name: 'Golden Envelope!',   dmg: 0 },
];

export const GENERIC_HIT = ['Ow!', 'Hey!', 'Ouch!', 'HR!!', 'Stop that!', 'Unprofessional!', 'Ugh!', 'My hair!'];
export const KO_LINES = ['I\'ll... approve... your leave...', 'Fine! Take Friday off!', 'Raise... approved...', 'Meeting... cancelled...'];
