# Beat Boss Bob 👔💥

A cartoon stress-relief game: throw office supplies at your boss, trigger booby-trapped rooms, and earn coins to unlock bigger weapons and bigger bosses. It's an installable **Progressive Web App** that plays fully **offline** on iPhone, iPad, Android and laptops, in portrait or landscape.

No frameworks, no build step, no external assets. All art is drawn in code, all sounds are synthesized, and fonts are bundled.

## Play it locally

```bash
cd beat-boss-bob
python3 -m http.server 8080
# open http://localhost:8080
```

A service worker needs `http(s)://`, not `file://`, so use a local server as above.

## Put it on GitHub + GitHub Pages (free hosting)

```bash
cd beat-boss-bob
git remote add origin https://github.com/<you>/beat-boss-bob.git
git push -u origin main
```

Then on GitHub go to **Settings → Pages → Source: Deploy from a branch → `main` / root**. Your game will be at `https://<you>.github.io/beat-boss-bob/`. All paths are relative, so it works from a sub-folder.

## Install on your phone (offline play)

- **iPhone / iPad:** open the link in **Safari** → Share → **Add to Home Screen**.
- **Android / Chrome / Edge (laptop):** open the link → ⚙ Settings in-game → **Install app**, or use the browser's install icon.

Open it once while online. After that it runs with no internet at all.

## How to play

| Action | How |
|---|---|
| Throw | Tap anywhere (or press **Space** on a laptop). Tapping the head lands more crits. |
| Fling | Swipe on empty space to fling your weapon. Deals 1.5× damage; headshots count as **trick shots**. |
| Grab & throw | Press on the boss and drag. He swings from wherever you grabbed him; let go to hurl him into walls, the floor, the ceiling or room hazards. |
| Room hazards | Tap glowing objects with a red **!** badge. Each has a cooldown. |
| Rage mode | Fill the meter with fast combos, then hit **RAGE** for auto-fire and 2× coins. |
| KO | Empty the stress bar for a big payout. The boss comes back one level tougher, with more HP and more coins. |

## What's inside

- **13 weapons:** pencil, paper ball, stapler, hot coffee, darts that stick, water balloon, rubber chicken, keyboard, cream pie, desk cactus, bowling ball, plus premium Golden Stapler and Disco Ball. Each upgrades to Lv 11.
- **7 bosses:** Bob, Micro-Manager Mike, Deadline Dana, Synergy Steve, Auditor Agnes, RoboBoss 3000, The Chairman. Each has its own look, quotes, HP and coin multiplier.
- **6 rooms, each with 3 hazards:**
  - **Cubicle Farm:** exposed-wire light (electrocution + skeleton flash), possessed printer (toner blast), toppling water cooler
  - **Gadget Store:** shoplift sensor (security guard tackle), falling TV, dive-bombing demo drone
  - **Break Room:** exploding microwave popcorn, scalding espresso steam, fridge door + frozen fish
  - **Board Room:** detaching ceiling fan, blinding projector, runaway swivel chair
  - **Server Room:** sparking rack, fire sprinklers, loose cables (faceplant)
  - **Secret R&D Lab:** tesla coil, giant magnet, banana peel
- **Random office events:** pigeon, rogue intern with a pie, paper plane squadron, office cat, flying pizza, and a tappable **golden envelope** with gems.
- **Grab & throw physics:** swing the boss around, slam him into surfaces for damage and combo, crack the walls, smash him into hazards to set them off.
- **Force fields:** every 3rd boss level has a shield that blocks damage and breaks by number of hits, so fast weapons are best.
- **Daily boss challenge:** KO your boss within 45 seconds for gems.
- **Workshop:** bosses drop gears, springs, duct tape and batteries; craft the Boomerang Tie, Thunder Mug and Rocket Stapler.
- **Custom boss:** design your own boss (name, skin, hair, suit, tie, extras).
- **Bonus briefcase** every 3rd KO, and a **gem → coin exchange**.
- **Progression:** combos, crits, rage mode, 7 upgrades (including an auto-throwing intern and idle "side hustle" income for up to 8 hours away), boss hats, rotating quests, 18 achievements, and a 7-day daily login streak.
- Damage decals (bruises, band-aids, splats, stuck darts, soot, drips), screen shake, haptics (Android), and synthesized SFX.

Progress saves automatically in the browser (`localStorage`). Coins and gems are earned in-game only; there are no real-money purchases.

## Project layout

```
index.html            app shell
manifest.webmanifest  PWA manifest
sw.js                 offline cache (bump VERSION when you change files)
css/style.css         wooden-panel UI, responsive layouts
js/data.js            weapons, bosses, rooms, hazards, upgrades, achievements: tweak balance here
js/render.js          procedural cartoon art (bosses, hats, weapons, rooms, hazards)
js/game.js            game loop, input, combat, hazards, events, quests
js/ui.js              HUD, shop tabs, modals
js/audio.js           synthesized sound effects + vibration
js/save.js            save/load
```

**Releasing an update:** change `VERSION` in `sw.js` (e.g. `bbb-v1.0.1`). Installed copies pick up the new version the next time they open online.

## Notes

- iOS Safari doesn't support the Vibration API, so haptics only work on Android.
- Original characters and art. Inspired by the "beat the boss" genre, with no assets from any existing game.
