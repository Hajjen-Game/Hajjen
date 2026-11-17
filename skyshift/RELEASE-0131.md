# SKYSHIFT 0.13.1 — Unified Personal Ghost & Menu Polish

## User feedback
0.13.0 Time Trial & Ghost System works, but the main menu became cluttered with additional TIME TRIAL / GHOST / Fidelity actions. The player wants ghost tracking as the default in the existing START RUN, a GHOST ON/OFF action inside PAUSE, a return-to-main-menu action there, and a proper settings gear for Fidelity.

## Changes

### START RUN now includes the PB ghost
- **No second Time Trial entry**. START RUN always uses the same player-owned three-lap 120 Hz flight system and automatically captures the 10 Hz personal-ghost trace.
- After the first completed **valid, fall-free** three-lap run, a best record and replay are saved locally. Any subsequent START RUN displays the recorded translucent ship when enabled, plus the existing centisecond timer and distance-normalized ahead/behind delta.
- Existing 0.13.0 personal best is **reused**: same storage key, same record format, same track revision, no migration, no local data deletion.
- First run without a ghost shows a clock and an em dash for the delta.
- Existing historical normal-mode lap-best and fleet unlocks remain.
- Fidelity and ghost preference are stored independently; disabling the visual ghost never deletes your stored PB or stops recording a new one.

### PAUSE has the relevant in-run actions
- Resume and Restart Run preserved.
- New **GHOST ON/OFF** switch applies immediately on resume and persists in localStorage.
- New **MAIN MENU** exits a current run without saving an incomplete trace, preserves earlier best runs, hides the ghost, restores the main menu and settings gear, and clears input/physics timers. Does not reload the page.
- Pausing freezes playback and timing.

### Minimal main menu
- Main menu now has **START RUN** and **HANGAR** as the primary two actions.
- A small accessible settings **gear in the top right** opens a dedicated SETTINGS screen. The status line for PERSONAL BEST is shown only when the player already has a PB, rather than advertising another mode.
- SETTINGS contains optimized **Fidelity ON/OFF** and **Fullscreen**, plus a back button. All existing smart Fidelity/adaptive HDR quality paths remain unchanged. The Fidelity reload query version is corrected to 0.13.1, preventing older cache navigation.
- Topbar gameplay fullscreen control is hidden when in Hangar or results so it does not add another menu button.

### Performance/physics
- No new world objects, textures, physics, obstacles, particles or shader passes. Uses the exact 0.13.0 low-budget, two-draw, collisionless 3D ghost with the 0.12.1 optimized Fidelity.
- All existing steering, GRIP, flight, Shadow Tunnel, zone wave, physical bank and race finish behaviors retained.
- The HUD stays minimal with the existing small time/delta row.

## Tests and instrumentation
- `ui-flow-v0131.test.mjs`: five deterministic menu / mode / pause / settings / version checks.
- `browser-smoke-v0131.mjs`: runs the real browser game with seeded PB, clicks Settings and back, START RUN, pauses, toggles ghost OFF/ON, resumes and exits to Main Menu verifying PB is still saved.
- The original 0.13.0 ghost data tests and 0.12.x Fidelity/GRIP/track/rail regression tests remain in CI.
- Logging uses `skyshift-v0131-performance-*.json` with unchanged `timeTrial` and `ghostVisual` summaries plus a tiny `navigation` state probe. Never exports raw personally-recorded positions by default.

## Manual verification priorities
1. Open SKYSHIFT. There should be no TIME TRIAL or GHOST button in the main menu; only START RUN, Hangar and a small gear.
2. Open gear: turn Fidelity ON/OFF, verify FULLSCREEN, use BACK TO MENU.
3. START RUN must load the previous 0.13.0 Ghost PB if one exists. Otherwise a successful clean run saves the first ghost.
4. PAUSE: toggle GHOST off, resume (no ghost), pause again, toggle ON, resume (ghost restored without restarting).
5. PAUSE -> MAIN MENU should abandon the active race, keep stored best, and not leave in-game HUD on-screen.
6. On Samsung A51, compare FPS with Ghost ON/OFF and share audit if there is visible stutter.

[Live 0.13.1](https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.1)
