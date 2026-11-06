# CHROMA RUSH — Reactive Audio System 1.0

A minimal landscape-first 2D arcade runner. **Jump** and **Duck** are the only gameplay actions. Survive the unstoppable acceleration as the neon world changes color.

**Play:** https://hajjen-game.github.io/Hajjen/chroma-rush/

## Reactive Audio System 1.0 (new)

- **Original procedural synth score** in `src/audio/reactive-audio.js`: electronic kick, hi-hat pulses, synth bass, ambient harmonic pads and a high-register arpeggio. No third-party tracks, sound files, assets, downloads or libraries.
- **Reactive intensity:** BUILD keeps a driving but restrained pulse; PEAK adds dense percussion and arpeggios; FADE softens; RELAX drops to a sparse heartbeat. All fades are smoothed. The **Director**, not audio, decides which phase the game is in.
- **Acceleration:** soundtrack grows from 110 BPM toward a capped 156 BPM as the scrolling speed increases. Music never affects the actual gameplay speed.
- **Flow:** High Flow gradually strengthens the soundtrack; Chroma State adds brighter, more intricate notes. Flow falls naturally after damage and the mix follows.
- **Zone identity:** new zones shift the harmony and sound a short transition; Perfect Zone has its own three-note celebration instead of layering both transitions at once.
- **Clear audio ownership:** music and gameplay sound effects use separate gain buses, with a shared master volume. Original jump, duck, land, score, hit, warning and Flow cues are retained as synthesized events with updated tones.
- **Mobile-friendly:** audio context is created and unlocked only after a deliberate Start/Resume/unmute gesture. Scheduling is tied to the existing animation loop, looks ahead only 90 ms, caps at three steps per frame and never starts an independent timer or background worker.
- **Control & safety:** one sound button mutes both music and effects, and the choice persists in local storage. Pausing, changing tabs, or ending a run fades music; unsupported Web Audio simply remains silent without breaking gameplay.
- **Unchanged gameplay:** Director 2.0, Chroma Flow, Perfect Zones, physics, HP and speed all retain their existing rules.

**Mobile listening test needed:** This first synth mix is intentionally conservative and must be evaluated for musicality, headroom and device speaker balance on actual phones. It is an original procedural prototype score, not a mastered soundtrack.

## Chroma Flow & Perfect Zones 1.0

- **Flow** rises when real, unhit obstacles are cleared (+6), and rises more for narrow jump clearances / well-timed duck presses (+10). It falls 35 on damage, and decays slowly (1.5/s) after a 3.5-second stretch without successful clears. Flow never fills passively during a Director break.
- **Chroma State** starts at 90 Flow. Thresholds: 30, 65, 90. Multipliers on *obstacle-clear* score: 1× / 1.25× / 1.5× / 2×. Survival-time score is deliberately unaffected so simply waiting does not generate boosted points.
- **Reactive visuals** ramp floor glow, track glow, player trail length, subtle motes and a player halo at CHROMA STATE. The colors still follow the existing zone palettes. Transitions are restrained to protect obstacle readability.
- **Perfect Zones** are counted only if at least **three actual obstacles were cleared** in the last 12-second zone, with zero collisions (including contacts absorbed by temporary invulnerability). They grant up to **10 shield** without exceeding the 100-HP cap, plus a 350-base-point bonus and a small Flow boost. An empty zone is never perfect. The toast identifies the *completed* zone.
- **Feedback** includes a Flow bar, current multiplier, clear streak, a Perfect Zone transition announcement and count on the results screen; brief synthetic audio cues play on Flow-tier increases and Perfect Zones. Full layered music remains planned for Step 4.
- **Best score for Flow scoring** uses a new `chromaRushBestFlow1` local-storage key. The old record remains stored intact under `chromaRushBest`, because the scoring rules changed.
- **Modular implementation:** `src/gameplay/flow.js` owns score/Flow/streak/zone rules; `src/core/config.js` owns all tunable constants; `src/ui/hud.js` only presents state. No extra player inputs, collectible economy or dependencies.

## What changed in 2.0?

- **Authored micro-patterns:** 12 short, recognizable combinations (solo, pairs, triplets, switchbacks) instead of independently selecting every hazard.
- **Adaptive pacing:** Directorn observes successful clears, near misses, recent damage and HP to adjust pattern tier, timing, intensity, and breathing space.
- **Microbreaks:** Build → Peak → Fade → Relax. Speed never decreases, but spawns stop briefly during recovery.
- **Safety spacing:** Every adjacent pair of spawned hazards (including across patterns) respects a time-based minimum gap for jump/duck recovery.
- **Avoid repetition:** Weighted selection prevents immediate repetition of the same pattern when there is an alternative.
- **Maintainable structure:** Shared physics/configuration, geometry, HUD and reusable Director pattern definitions are now separate from the main game loop.
- **Unchanged fundamentals:** Same neon palette, HP, scoring, jump physics, 0.55-second tap-to-duck, touch controls and progressively increasing speed.

## Folder structure

```text
chroma-rush/
  index.html                  Static entry point; controlled script order
  style.css                   Shared responsive game styling
  src/
    core/
      config.js               Speed, zones, jump/duck timings, color palettes
      geometry.js             Shared player and hazard hitboxes
    director/
      patterns.js             Authored micro-pattern catalog and selection
      adaptive-director.js    Director 2.0: pacing, stress, confidence, safe gaps
    gameplay/
      flow.js                 Pure Flow/Perfect Zone state and scoring rules
      game.js                 Input, game state, collision and world rendering
    audio/
      reactive-audio.js       Standalone Web Audio soundtrack + SFX orchestration
    ui/
      hud.js                  Reusable HUD and zone transition presentation
  tests/
    director.test.cjs          Original Director pacing regression checks
    director-2.test.cjs        Pattern selection, adaptive state and high-speed safety
    game-smoke.test.cjs        Full game loop and mobile/keyboard duck regression
    flow.test.cjs              Flow thresholds, flawless zones, damage, healing and reset
    reactive-audio.test.cjs    Audio lifecycle, phase mix, tempo, mute and scheduling
```

Modules are plain browser JavaScript with CommonJS compatibility for Node tests, so the game needs **no build process, dependencies, CDN, account or analytics**. All script URLs carry a version query to limit stale browser caches on GitHub Pages.

## Architecture rules

1. Change core tuning in `src/core/config.js` (do not repeat constants throughout the code).
2. Keep game object geometry in `src/core/geometry.js`, not in rendering.
3. Add new patterns to `src/director/patterns.js`; only the Director chooses when to use them.
4. `adaptive-director.js` makes planning decisions and exposes `insight` for future diagnostics. It does not read DOM, draw or modify player inputs.
5. Shared HUD drawing goes into `src/ui/hud.js`. Do not mix UI styling with gameplay decisions.
6. All audio synthesis and playback lives in `src/audio/reactive-audio.js`. The gameplay engine only reports events and state. Input and world rendering still live in `game.js`: **next modularization targets** are `src/input/controls.js` and `src/render/world.js`.
7. All new rules require targeted Node regression tests. Keep deterministic RNG injection in the Director.

## Run and test

Open `index.html` in a browser or serve the folder with any static HTTP server.

```sh
node --test chroma-rush/tests/*.cjs
```

**Controls:** left thumb = Jump, right thumb = Tap Duck. Desktop: Space/↑/W = Jump, S/↓ = Duck, Esc/P = Pause. Duck has a fixed 0.55-second duration and 0.12-second recovery; holding does not repeat the action.

## Intentional scope decisions

- The target is a thrilling **2–3 minute run**, not infinite perfect reaction time. A full Speed Fairness & Readability redesign is deferred until playtests suggest it is needed.
- The Director may ease the number and complexity of obstacles but **never lowers scrolling speed**.
- AI Director 2.0 is a transparent, deterministic-rule system; it is not a neural network or an unbeatable automated level designer. Gameplay still requires real-device testing and balancing.
- No new controls, collectibles, metaprogression or economy are introduced by this update. Step 4 adds only adaptive sound and music.

## Versions

- **1.0 (2026-11-06):** First single-page prototype.
- **1.1:** Tap-to-duck with a fixed duration and recovery.
- **2.0:** Adaptive motif generation, player-friction awareness, shared modules and Director regression tests.
- **Flow 1.0:** Reactive Flow tiers, skill-based score bonuses, Perfect Zones and shield recovery.

- **Audio 1.0 (2026-11-06):** Independent Web Audio engine, phase-responsive original layered music, Flow/zone sync, sound effects, pause/mute persistence, audio regression tests.
