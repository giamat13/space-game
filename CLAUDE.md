# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"מגיני החלל" / "Space Game" — a single-page, vanilla-JavaScript browser arcade game. The player controls a ship at the bottom of the screen, shoots descending enemies/asteroids/burgers, levels up, unlocks skins, earns coins, and competes on cloud leaderboards. The UI is **Hebrew-first and RTL** (`<html lang="he" dir="rtl">`), with full i18n for 6 languages.

## Running, building, testing

There is **no build step, no package.json, no test suite, and no linter**. It is plain ES-module JS + HTML + CSS served as static files.

- **Run locally:** serve the folder over HTTP (ES modules + Firebase require an origin, so `file://` will not work). E.g. `python -m http.server 8000` then open `http://localhost:8000`. The `/run` skill also covers launching it.
- **Deploy:** pushing to **any branch except `main`** triggers `.github/workflows/depoly-test.yml`, which publishes the repo into the `test/` subfolder of GitHub Pages (production is hosted separately). Note the filename typo (`depoly`) is intentional/existing.

## Architecture

Everything loads from [index.html](index.html), which directly includes only two module scripts plus one external proxy:

```
js/auth.js   →  js/main.js  (imports the other modules)  →  firebase-ls-proxy.js (external, from giamatamat2013.github.io/Warp)
```

`index.html` stays at the repository root as the static-site entry point. Active JavaScript modules live in `js/`, question banks in `data/`, images in `assets/`, and the stylesheet in `css/`. The test-deploy workflow stages only these site files in the ignored `deploy/` directory, preventing generated Pages output from being copied back into the repository.

`js/main.js` is the orchestrator (~168 KB): UI wiring, menus, overlays, settings, leaderboard rendering, gamepad, replay, and the game loop. The other modules are pure ES modules imported by it.

### Module responsibilities

- **[js/data.js](js/data.js)** — The single source of truth. Exports the shared mutable `state` object (the entire live game state: `bullets`, `enemies`, `asteroids`, `playerHP`, `score`, ability cooldowns, etc.), `resetState()`, the `SKINS` definitions, `UPGRADES`, coins/HP-upgrade economy, skin unlock tracking, key bindings, game rules, device mode, and speedrun goals. Most other modules import `state` from here and mutate it directly.
- **[js/systems.js](js/systems.js)** — Per-action game mechanics: player movement, shooting, damage/heal, ammo, enemy AI shooting, particles/explosions, ingredient spawning, enemy spawning (`handleSpawning`), and the special abilities (`useVortexLaser`, `usePhoenixFeathers`, `useJokerChaos`, `useDragonFire`).
- **[js/updates.js](js/updates.js)** — Per-frame entity updates and collision passes: `updateBullets`, `updateEnemyBullets`, `updateBurgers`, `updateIngredients`, `updateAsteroids`, `updateEnemies`, `updateLightnings`.
- **[js/auth.js](js/auth.js)** — Firebase Auth (Google popup + email/password + account linking). Holds the `firebaseConfig` and initializes the Firebase app. Exports `currentUser` / `isAuthenticated`. **No Firebase Storage is used** — profile photos come straight from Google `photoURL` to stay on the free tier.
- **[js/cloud-sync.js](js/cloud-sync.js)** — All cloud reads/writes (Realtime Database over REST): leaderboards, world records, cloud save/sync of skins, coins, upgrades, achievements, settings, speedrun results, unique usernames, coin transfers by username/email, analytics summaries, account deletion, and the offline outbox. Reuses the auth from `js/auth.js` via `getAuth()`.
- **[js/education.js](js/education.js)** — "Education mode": gates gameplay events (e.g. death/level-up) behind quiz questions from [data/questions.json](data/questions.json). Supports a remote teacher→student lock/unlock session model with a 45-min auto-unlock (`LOCK_DURATION_MS`). See the `edu-session-model` memory for design intent.
- **[js/i18n.js](js/i18n.js)** — Translation tables and `t()`, `applyLang()`, `toggleLang()`. 6 languages (he/en/ar/ru/fr/es), with RTL/LTR direction switching. Fires a `langchange` event that `js/main.js` listens to for re-rendering.
- **[js/bosses.js](js/bosses.js)** — Boss engine: schedule (`bossLevel`: Phoenix boss at level 3, Vortex boss at 5 and Joker boss at 10, which are the only way to win those ships; Twin Fangs at 15 (wins the Ivory ship); Baby Dragon boss at 25, which wins the Baby Dragon ship; then every 25 from level 50 — no roster boss at 10 or 25; milestone bosses at 100/250/500/750/1000), the attack/telegraph toolkit `K`, hit detection, phases, HUD, death and rewards. Boss time is its own clock that only advances on game ticks, so pausing pauses telegraphs.
- **[js/boss-roster.js](js/boss-roster.js)** — The 25 bosses + 5 milestone bosses + the 4 ship bosses (`EARLY`: phoenix, vortex, joker, baby_dragon) as data (Twin Fangs, a roster boss, also wins the Ivory ship via `unlocksSkin`) (attack decks, hooks for each signature mechanic) and `MUTATIONS` (tricks that returning, ranked-up bosses borrow). **[js/boss-art.js](js/boss-art.js)** holds their vector art, **[js/i18n-bosses.js](js/i18n-bosses.js)** their texts (`bn_`/`bt_`/`bh_<id>`), **[css/bosses.css](css/bosses.css)** their styles.
- **[js/art.js](js/art.js)** — Ship, enemy, asteroid and burger art (the Dragon keeps `assets/dragon.png`). **[js/scene.js](js/scene.js)** — canvas backdrop (nebula + parallax stars, colours shift every 25 levels) and the canvas particle layer behind `createExplosion` / `spawnParticle`.
- **[js/enemy-types.js](js/enemy-types.js)** — 14 enemy kinds that join the waves from level 30 to 850 (wasp, splitter, warden, sniper, diver, medic, layer, phase, carrier, orbiter, leech, juggernaut, swarm, wraith), each with its own movement/shooting/defence hooks, plus ELITE variants from level 500. The classic red/orange/green/blue enemies are unchanged. `spawn('<kind>')` in the console spawns one.
- **[js/icons.js](js/icons.js)** — SVG icon set. Emoji characters in UI text are swapped for SVGs at render time by a MutationObserver (so source strings and i18n may keep using emoji as keys). To add an icon, draw it in `G` and list its emoji in `MAP`; `console.log` emoji and `title=""` attributes are not replaced.
- **[css/theme.css](css/theme.css)** — The "Neon Forge" theme, loaded last; it re-skins everything in `css/styles.css`.
- **[js/sfx.js](js/sfx.js)** — Sound effects (Web Audio API), a hybrid: recorded CC0 samples by Kenney in `assets/sfx/*.ogg` (listed in `BANK`: variants, loudness `db`, pitch, layers `also`, synth layer `fx`; credits in `assets/sfx/CREDITS.txt`) plus self-made synth sounds in `S`, which play the events with no recording and stand in for any file that is not loaded or cannot be decoded. `play('<name>')` (also `window.__sfx`) plays one sound from the bank `S`; `GAP` sets the minimum time between two plays of the same sound, and at most 24 voices play at once. Audio unlocks on the first user gesture and is suspended while the tab is hidden. One capture listener gives every button, toggle and text field a menu sound. `createExplosion(x, y, color, sound = 'explode')` in `js/systems.js` takes the sound to play (`null` = silent). Settings (on/off, volume) live in localStorage `sfxSettings_v1` and in the Device tab of the settings (`#sfx-settings`).
- **[js/analytics.js](js/analytics.js)** — Fine-grained gameplay telemetry (shots, hits, damage, kills, abilities, deaths) kept in memory (capped at 2000 events); only one summary per game is written, to `analytics/{uid}/{sid}`.
- **[js/achievements.js](js/achievements.js)** — Achievement definitions, unlock checks, and toast UI; syncs unlocked set via `js/cloud-sync.js`.
- **[js/game-history.js](js/game-history.js)** — Local (localStorage) per-game history, personal bests, and aggregate stats.
- **[js/updates.js / js/systems.js / js/data.js]** form the gameplay core; the rest are platform/meta features.

### The game loop

`update()` in [js/main.js:1670](js/main.js#L1670) is the single `requestAnimationFrame` loop. Each frame it runs level-up, spawning, ammo recharge, ability cooldowns, movement, speedrun checks, analytics, then the `js/updates.js` entity passes. It early-returns when `!state.active` or `state.paused`; pausing/resuming re-arms the loop via `requestAnimationFrame(update)` (also exposed as `window.__resumeGameLoop`).

### Gameplay rules worth knowing

- **Fixed timestep:** `update()` runs the logic at 60 steps/second whatever the display refresh rate.
- **Difficulty:** `difficultyForLevel` (speed/spawn, levels off after level 30) and `dangerForLevel` / `enemyHpScale` (damage and enemy HP keep growing). Level 1000 is meant to be possible only in theory with the current ships.
- **Ship control modifiers:** bosses bend the controls through `state.ctrl` (offset / walls / lag) in `js/systems.js`; all movement goes through `movePlayer`, `stepPlayer`, `pushPlayer`.
- **Leaderboards:** one entry per player per table (`lb/{table}/{uid}`), written by `saveScoreToCloud` in `js/cloud-sync.js`; records are ordered by level, then score (`isBetterRun`). Failed saves stay in the outbox and are retried.
- **Replays:** recorded every 200 ms; after 1800 frames every other frame is dropped and the interval doubles, so long games keep their whole timeline.
- **Testing bosses:** `startLvl(n)` in the console starts the next game at level n as a debug game (never saved).

### Cross-module conventions

- **Shared state by reference:** modules mutate the imported `state` object rather than passing it around. Treat `js/data.js`'s `state` as a global singleton.
- **`window.__*` bridge:** `main.js` exposes many functions on `window` (e.g. `window.__resumeGameLoop`, `window.__onEnemyKilled`, `window.__filter*`, `window.__lb*`) so inline `onclick` handlers in `index.html` and cross-module callbacks can reach them. When adding UI buttons, follow this `window.__name` pattern rather than wiring listeners, to match the existing code.
- **Performance:** the loop caches `getBoundingClientRect()` once per frame (`state.playerRect`, bullet rects) so collision passes don't each force a layout reflow. Preserve this ordering when adding entity updates.
- **i18n:** user-facing strings use `data-i18n="key"` attributes in HTML and `t('key')` in JS. Add new keys to all language tables in `js/i18n.js`.

### Firebase (Realtime Database)

- Config lives in [js/auth.js](js/auth.js) (project `space-game-ii`). Since 2026-11-16 all game data lives in the **Realtime Database** (`https://space-game-ii-default-rtdb.europe-west1.firebasedatabase.app`), reached over **REST** (`fetch` + the user's ID token, no SDK sockets, so the 100-connection limit is never hit). Rules: [database.rules.json](database.rules.json) (registered in `firebase.json`).
- Firestore was emptied of writes because the free quota ran out (analytics wrote one document per shot). It is a **read-only archive**: [firestore.ruls.json](firestore.ruls.json) only allows reads (a one-time profile merge, `users/{uid}.fsChecked`) and owner deletes (account deletion), via [js/legacy-firestore.js](js/legacy-firestore.js).
- RTDB tree: `users/{uid}` (profile, skins, coins, upgrades, `hpLevels`, achievements, settings, `name`), `lb/{table}/{uid}` (best run per player; tables `overall` + one per skin), `runs/{table}/{runId}` (every run, for filtered views), `top/{table}` (world record, rules allow only better runs), `money/{uid}`, `speedrun/{goal}/{uid}`, `speedrunRuns/{goal}/{runId}`, `names/{nameKey}` → uid (unique usernames, first claim wins), `emails/{email with , for .}` → uid, `transfers/{uid}` + `transfersByEmail/{email}` (coin transfers by username or email), `analytics/{uid}/{sid}` (one summary per game, no per-event logs), `edu/{sid}` (education sessions, polled).
- **Writes are queued:** every write goes into the `cloudOutbox_v2` localStorage outbox, merged into one multi-path PATCH, and retried on `online`, every 2 minutes, and when the tab is shown. Nothing is lost when offline or refused; the outbox survives sign-out (items carry the uid).
- **Adding a new ship:** unlock it only through `unlockSkin()` in `js/data.js` (it writes the cookie and queues `users/{uid}/skins/{key}`). Ships won from bosses are unlocked in the same moment as the boss reward writes (coins, score), so they are merged into a patch that is already being sent. `doFlush` in `js/cloud-sync.js` must remove only the paths it actually sent, never the whole outbox item by id. Ivory was lost this way (Nov 2026). After adding a ship, beat its boss while signed in and check that `users/{uid}/skins/<key>` exists in the database.
- Leaderboard reads are cached 60 s. A world record (`saveScoreToCloud` → `world: true`) shows the `showWorldRecord` overlay in `js/main.js`.
- **Priced ships** (`buyCost` in `SKINS`: `baby_dragon` 50,000, `cube_king` 75,000): beating the boss only stores a `won_<ship>` marker through `unlockSkin()` (so it syncs like a ship); the ship is unlocked by `buySkin()` from the ship menu. A boss whose `unlocksSkin` is the ship you fly never spawns (`updateBoss`), and a ship's special power one-hit-kills any boss below `shipLevel()` (`window.__oneHitBoss`, called from `activateSpecialAbility` in `js/main.js`).
- The ship formerly called `dragon` is `baby_dragon` everywhere (cloud migrated; `renameLocalDragon` in `js/cloud-sync.js` fixes old local copies once). `dragon` is reserved for a future ship.
- The external `firebase-ls-proxy.js` (loaded last in `index.html`, hosted outside this repo) replaces `localStorage` with a cache that is copied to ANOTHER Firebase project (one Firestore document per key, max 1 MB) and swallows storage errors. Keep every localStorage value well under 1 MB: replays are stored one per key (`gameReplay_v1_<timestamp>`, ≤ 900 KB, newest within 3.5 MB total) by [js/game-history.js](js/game-history.js).

## GitHub wiki

The project wiki is a separate git repo: `https://github.com/giamat13/space-game.wiki.git` (the Wiki tab of `giamat13/space-game`).

- Every time a change is made to the game (code, features, controls, balance, bosses, settings, deploy, i18n), update the wiki in the same task. Do not ask for approval first.
- Clone the wiki repo into the scratchpad directory (never inside this project), edit the relevant page(s), commit, and push to the wiki's default branch.
- If a change fits no existing page, create a new page and link it from `Home`.
- Keep numbers, key names, and level thresholds in the wiki identical to the code.
- Write all wiki content in all 6 game languages: he, en, ar, ru, fr, es. Each page has one section per language, in that order, with Hebrew first. Keep headings, numbers, and key names the same in every language.
- In the final message for the task, list the wiki pages that were changed.

## Copyright note

Per [CONTRIBUTING.md](CONTRIBUTING.md), the original author retains all rights; forks must acknowledge the original copyright and may not be redistributed under a separate "all rights reserved" claim.
