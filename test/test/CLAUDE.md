# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"מגיני החלל" / "Space Defender" — a single-page, vanilla-JavaScript browser arcade game. The player controls a ship at the bottom of the screen, shoots descending enemies/asteroids/burgers, levels up, unlocks skins, earns coins, and competes on cloud leaderboards. The UI is **Hebrew-first and RTL** (`<html lang="he" dir="rtl">`), with full i18n for 6 languages.

## Running, building, testing

There is **no build step, no package.json, no test suite, and no linter**. It is plain ES-module JS + HTML + CSS served as static files.

- **Run locally:** serve the folder over HTTP (ES modules + Firebase require an origin, so `file://` will not work). E.g. `python -m http.server 8000` then open `http://localhost:8000`. The `/run` skill also covers launching it.
- **Deploy:** pushing to **any branch except `main`** triggers `.github/workflows/depoly-test.yml`, which publishes the repo into the `test/` subfolder of GitHub Pages (production is hosted separately). Note the filename typo (`depoly`) is intentional/existing.

## Architecture

Everything loads from [index.html](index.html), which directly includes only two module scripts plus one external proxy:

```
auth.js   →  main.js  (imports everything else)  →  firebase-ls-proxy.js (external, from giamatamat2013.github.io/Warp)
```

`main.js` is the orchestrator (~168 KB): UI wiring, menus, overlays, settings, leaderboard rendering, gamepad, replay, and the game loop. The other modules are pure ES modules imported by it.

### Module responsibilities

- **[data.js](data.js)** — The single source of truth. Exports the shared mutable `state` object (the entire live game state: `bullets`, `enemies`, `asteroids`, `playerHP`, `score`, ability cooldowns, etc.), `resetState()`, the `SKINS` definitions, `UPGRADES`, coins/HP-upgrade economy, skin unlock tracking, key bindings, game rules, device mode, and speedrun goals. Most other modules import `state` from here and mutate it directly.
- **[systems.js](systems.js)** — Per-action game mechanics: player movement, shooting, damage/heal, ammo, enemy AI shooting, particles/explosions, ingredient spawning, enemy spawning (`handleSpawning`), and the special abilities (`useVortexLaser`, `usePhoenixFeathers`, `useJokerChaos`, `useDragonFire`).
- **[updates.js](updates.js)** — Per-frame entity updates and collision passes: `updateBullets`, `updateEnemyBullets`, `updateBurgers`, `updateIngredients`, `updateAsteroids`, `updateEnemies`, `updateLightnings`.
- **[auth.js](auth.js)** — Firebase Auth (Google popup + email/password + account linking). Holds the `firebaseConfig` and initializes the Firebase app. Exports `currentUser` / `isAuthenticated`. **No Firebase Storage is used** — profile photos come straight from Google `photoURL` to stay on the free tier.
- **[firestore-sync.js](firestore-sync.js)** — All Firestore reads/writes: leaderboards, cloud save/sync of skins, coins, upgrades, achievements, settings, speedrun results, peer-to-peer coin transfers, and a one-time migration of local `gameHistory` to the cloud. Reuses the app/auth from `auth.js` via `getApp()`/`getAuth()`.
- **[education.js](education.js)** — "Education mode": gates gameplay events (e.g. death/level-up) behind quiz questions from [questions.json](questions.json). Supports a remote teacher→student lock/unlock session model with a 45-min auto-unlock (`LOCK_DURATION_MS`). See the `edu-session-model` memory for design intent.
- **[i18n.js](i18n.js)** — Translation tables and `t()`, `applyLang()`, `toggleLang()`. 6 languages (he/en/ar/ru/fr/es), with RTL/LTR direction switching. Fires a `langchange` event that `main.js` listens to for re-rendering.
- **[analytics.js](analytics.js)** — Fine-grained gameplay telemetry (shots, hits, damage, kills, abilities, deaths) batched into a per-session record written to the `game_sessions` Firestore collection.
- **[achievements.js](achievements.js)** — Achievement definitions, unlock checks, and toast UI; syncs unlocked set via `firestore-sync.js`.
- **[game-history.js](game-history.js)** — Local (localStorage) per-game history, personal bests, and aggregate stats.
- **[updates.js / systems.js / data.js]** form the gameplay core; the rest are platform/meta features.

### The game loop

`update()` in [main.js:1670](main.js#L1670) is the single `requestAnimationFrame` loop. Each frame it runs level-up, spawning, ammo recharge, ability cooldowns, movement, speedrun checks, analytics, then the `updates.js` entity passes. It early-returns when `!state.active` or `state.paused`; pausing/resuming re-arms the loop via `requestAnimationFrame(update)` (also exposed as `window.__resumeGameLoop`).

### Cross-module conventions

- **Shared state by reference:** modules mutate the imported `state` object rather than passing it around. Treat `data.js`'s `state` as a global singleton.
- **`window.__*` bridge:** `main.js` exposes many functions on `window` (e.g. `window.__resumeGameLoop`, `window.__onEnemyKilled`, `window.__filter*`, `window.__lb*`) so inline `onclick` handlers in `index.html` and cross-module callbacks can reach them. When adding UI buttons, follow this `window.__name` pattern rather than wiring listeners, to match the existing code.
- **Performance:** the loop caches `getBoundingClientRect()` once per frame (`state.playerRect`, bullet rects) so collision passes don't each force a layout reflow. Preserve this ordering when adding entity updates.
- **i18n:** user-facing strings use `data-i18n="key"` attributes in HTML and `t('key')` in JS. Add new keys to all language tables in `i18n.js`.

### Firebase / Firestore

- Config lives in [auth.js](auth.js) (project `space-game-ii`). Security rules are in [firestore.ruls.json](firestore.ruls.json) (note: not auto-deployed from here).
- Key collections: `users/{uid}`, `leaderboard`, `scores/{skin}/entries`, `game_sessions`, `moneyLeaderboard`, `speedrun/{goal}/entries`, `coinTransfers`.
- The external `firebase-ls-proxy.js` (loaded last in `index.html`) provides a localStorage-backed cloud-sync proxy layer; it is hosted outside this repo.

## Copyright note

Per [CONTRIBUTING.md](CONTRIBUTING.md), the original author retains all rights; forks must acknowledge the original copyright and may not be redistributed under a separate "all rights reserved" claim.
