# CHROMA RUSH — Mobile Performance Optimization 1.0

A minimal landscape-first 2D arcade runner. **Jump** and **Duck** are the only gameplay actions. Survive the unstoppable acceleration as the neon world changes color.

**Play:** https://hajjen-game.github.io/Hajjen/chroma-rush/

## Mobile Performance Optimization 1.0 (2026-11-06)

- Three render-only quality tiers (**HIGH / BALANCED / PERFORMANCE**) plus an automatic tier with frame pacing hysteresis. Change from the ⚙ settings button; your preference stays local.
- Device-sensitive canvas DPR/pixel budget, fewer expensive decorative glow strokes and terrain grid operations at lower tiers. Game rules, generated terrain, obstacles and scores remain unchanged.
- Dedicated visual randomness ensures changing graphics quality never alters Director decisions or terrain randomness.
- Fixed-step 60 Hz gameplay clock helps preserve simulation consistency at 30, 60 or 120 Hz while bounding catch-up after browser stalls.
- Add `?perf=1` to the URL for local FPS/frame-time/JS render timing overlay. Existing exported run JSON now includes a small `renderPerformance` snapshot. Nothing is uploaded.
- Node regression tests, browser screenshots and an independent Chromium quality benchmark are included. Synthetic timings are not a guarantee of improvement on physical Android devices.
- Details: [docs/mobile-performance-optimization-1.0.md](docs/mobile-performance-optimization-1.0.md).


## Unified Terrain Director 3.0 (2026-11-06)

- **Single procedural track:** new `src/director/unified-terrain-director.js` links terrain planning and the existing Adaptive Rush Director 2.0. No separate levels, extra controls or speed changes.
- **Phase-aware terrain:** BUILD favors gentle slopes, PEAK permits occasional gaps, while FADE/RELAX avoid planning new gaps. The planner considers **when terrain will reach the player**, not just which phase was active when generated.
- **Player-aware recovery:** Low shield or high stress suppresses future gap pressure; missed gaps delay new gap proposals and protect upcoming obstacle spacing. Already generated geometry is never changed under the player.
- **Safe combinations:** geometry remains the authority for gap widths and landing areas. Motif steps too close to an abyss are deferred, never silently discarded or counted as spawned.
- **Evidence:** the exported round log now labels terrain by planned phase. New seeded three-minute simulations check terrain variety, spacing and recovery. The four-size Chromium visual audit passes.
- **Performance:** no new shaders, particles or gameplay buttons. Rendering slowdowns on older phones remain a separate profiling and optimization task.
- [Technical design and verification](docs/unified-terrain-director-3.0.md).

## Game Experience & Visual Audit 1.0 (2026-11-06)

- **Chromium visual audit** at four landscape sizes: start/results screens, flat/hilly/gap terrain, pixel comparisons against the actual full-height background and browser-error checks. GitHub Actions now saves screenshots as a temporary artifact.
- **Gap-hit consistency:** falling during temporary shield invulnerability still counts as a missed gap and Flow mistake, but does not deduct another 25 HP.
- **Short-display layout:** the start menu is kept fully visible on 640×330 and similarly short landscape displays; the Jump/Duck touch targets are unchanged.
- **Local run diagnostics:** the results screen now offers **EXPORT RUN LOG**, downloading JSON with hits, gap results, Director phases, Flow saturation, Perfect Zones, score and key events. No third-party tracking or personal information is collected.
- **Detailed audit:** [docs/game-experience-visual-audit-1.0.md](docs/game-experience-visual-audit-1.0.md). No new levels or gameplay buttons.

## Full Background Continuity 1.0 (2026-11-06)

- The world scene is isolated into `src/render/world-background.js`. The background now covers the entire logical canvas regardless of terrain height, including under valleys and behind gaps.
- Previously, a second glow layer was drawn only below a fixed floor coordinate, introducing a hard horizontal edge exposed by descending terrain and open gaps. Both atmospheric glows now render across the full screen with continuous radial falloff.
- Faraway architecture, streaks and stars also extend into the lower viewport and fade naturally, rather than ending at the old floor level.
- Terrain polygons render above the independent background; gaps remain unfilled and show the world scene behind them.
- Four new regression tests verify full-height coverage, screen proportions, and terrain independence. No changes to jump physics, HP, Flow, audio, Director or arcade records.

## Terrain Visual Fix 1.2 — clip-path regression fix (2026-11-06)

- Fixes an accidental diagonal wedge underneath terrain: the shared Canvas path used a second `moveTo` after the bottom edge, splitting the intended floor polygon and closing it diagonally.
- Each solid terrain island now starts at its bottom-left, joins the actual surface, follows all connected slopes and flats, and closes at the bottom-right. Gaps remain open and show the parallax background.
- Verified with headless Chromium using a representative flat/slope/gap layout, comparing screenshots before and after.
- Added explicit polygon-path tests (including a scrolled camera) so a triangular closure cannot silently pass regression tests again.
- Pure render correction; no changes to jumps, HP, collision, Director, audio or progression.

## Terrain Visual Fix 1.1 (2026-11-06)

- One continuous track surface and perspective grid, with a shared gradient, fix the vertical seams underneath hills and flats.
- The old black rectangle beneath every gap is gone: actual palette-colored world background now shows through. Neon edge markers still communicate where to jump.
- Separate presentation module: `src/render/terrain-renderer.js`.
- Purely graphical: terrain physics, gap jump rules, Director, Flow, shield damage and progression remain unchanged.
- Four new renderer tests cover seamless boundaries, transparency, grid origin and data immutability.

## Jump Feel & Forgiveness 1.0 (new)

- **Coyote time:** A new press up to 80 ms after leaving a gap edge can launch the original jump. At high speed this is additionally capped to 48 world units beyond the edge; no double jump is introduced.
- **Jump buffer:** A jump pressed up to 110 ms before landing will trigger exactly once on landing. Queued input expires naturally. Ducking and spectral gap-recovery cannot queue jumps. Both mobile and keyboard input use these shared rules.
- **Visual motion:** A dedicated animation module adds a fast takeoff squash, upward stretch, small apex settling, directional landing particles, subtle impact glow, a brief 230 ms landing squash/rebound and a restrained camera reaction after a hard landing. All animations use the existing neon colors.
- **Gameplay integrity:** Launch velocity, gravity, obstacle/gap geometry, auto-run speed, damage and two-button controls are unchanged. Rendering deformation never modifies collision shapes.
- **Gap integrity:** A landing on the far platform counts as a successful gap clear before a buffered hop immediately launches again, preventing missing Flow/score when chained hops occur.
- **Modular architecture:** `src/gameplay/jump-controller.js` owns timing rules and `src/render/player-motion.js` owns sprite deformation; both have pure Node tests plus browser-game VM integration tests.
- **Not added:** No variable-height jumps, double jump, new level selection or major gravity/apex changes. Those remain possible separate experiments.

## Dynamic Terrain & Gap Jumps 1.0 (new)

- The **same endless randomly generated course** now includes rolling slopes from zone 2 and occasional jumpable chasms from zone 3. No separate levels, tracks, buttons or progression reset.
- `src/terrain/terrain-system.js` owns a world-space series of flats, smoothed hills and true groundless gaps. It is dependency-free and has a deterministic RNG injection for tests.
- The existing Director remains responsible for authored jump/duck patterns and pacing, but **will defer an obstacle** when terrain says its takeoff/landing vicinity is unsafe. In-flight patterns are kept and retried, not silently counted as spawned.
- Landing / running heights and box positions now sample the same ground geometry. Vertical physics prevent landing from *underneath* a platform.
- Gap width is bounded relative to running speed and the existing jump duration. A fall costs 25 shield, interrupts Flow and prevents Perfect Zone, with a single brief recovery until the far ledge, avoiding infinite fall loops.
- Clearing a gap without falling registers an ordinary clear for Flow, streak, Director confidence and points; a missed gap never counts as a successful obstacle.
- Terrain is painted directly as a live neon surface with real dark gaps, illuminated edges and a subtle jump cue. The grid adapts to changing surface elevation.
- Existing audio, Chroma Flow, Perfect Zones, practice, milestones, records and two-button controls remain present.
- **Balancing target:** high-energy 2–3 minute arcade rounds, not an unlimited reaction-time redesign. Mobile playtesting is still required.

## Arcade Progression 1.0 (new)

- **Personal records**: persistent best score, highest reached zone and longest damage-free obstacle streak. A compact record panel lives on the start menu, with best streak also appearing on results.
- **Six personal milestones**: Zone 03 (IGNITION), Zone 05 (NEON PILOT), 10-hit-free clear streak (TEN STRONG), first Perfect Zone (FLAWLESS), Zone 08 (CHROMA RUNNER), and Zone 12 (REDLINE). Tap the Milestones counter to open the full gallery.
- **Practice mode**: after reaching Zone 02 in a normal arcade run, choose any zone reached in **standard** play. Practice begins at that zone's speed and palette, with fresh Flow, full HP and the same Director/audio mechanics.
- **Ranked integrity**: practice is clearly marked UNRANKED in the HUD and results. It never writes best score, best zone, streak, Perfect Zone totals or milestones; it never unlocks further practice zones. Standard runs always start at Zone 01. Neither practice nor milestones grant gameplay powers.
- **Record migration**: existing `chromaRushBestFlow1` score remains the starting best score. Historical zone and streak records were not tracked by old builds, so they start fresh rather than being guessed. New progress is saved under `chromaRushArcadeV1`.
- **Safe persistence**: missing/corrupt/blocked local storage falls back to a playable game. Record updates happen on new ranked zone/streak achievements and on run completion. Personal records stay on the same browser/device without an account.
- **Modular architecture**: `src/progression/arcade-progress.js` owns all durable record, unlock and milestone rules; `src/ui/arcade-ui.js` renders progress without implementing the rules. No additions to gameplay controls or dependencies.
- **Design target**: the same fast, satisfying 2–3 minute arcade run. Speed Fairness & Readability remains a separately deferred task.

## Reactive Audio 1.1 — Mobile audibility

- The BUILD phase plays an original midrange melody and prominent percussion, not mostly sub-bass.
- A louder but bounded music bus makes the soundtrack more audible on phone speakers.
- Suspended/interrupted mobile Web Audio can be unlocked from a user gesture, with a visual hint when audio is blocked.

## Reactive Audio System 1.0

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
    progression/
      arcade-progress.js      Ranked records, practice unlocks and personal milestones
    ui/
      hud.js                  Reusable HUD and zone transition presentation
      arcade-ui.js            Record panels, practice selector and milestone gallery
  tests/
    director.test.cjs          Original Director pacing regression checks
    director-2.test.cjs        Pattern selection, adaptive state and high-speed safety
    game-smoke.test.cjs        Full game loop and mobile/keyboard duck regression
    flow.test.cjs              Flow thresholds, flawless zones, damage, healing and reset
    reactive-audio.test.cjs    Audio lifecycle, phase mix, tempo, mute and scheduling
    arcade-progress.test.cjs  Persistence migration, milestones, unlock safety and UI
```

Modules are plain browser JavaScript with CommonJS compatibility for Node tests, so the game needs **no build process, dependencies, CDN, account or analytics**. All script URLs carry a version query to limit stale browser caches on GitHub Pages.

## Architecture rules

1. Change core tuning in `src/core/config.js` (do not repeat constants throughout the code).
2. Keep game object geometry in `src/core/geometry.js`, not in rendering.
3. Add new patterns to `src/director/patterns.js`; only the Director chooses when to use them.
4. `adaptive-director.js` makes planning decisions and exposes `insight` for future diagnostics. It does not read DOM, draw or modify player inputs.
5. Shared HUD drawing goes into `src/ui/hud.js`. Do not mix UI styling with gameplay decisions.
6. All audio synthesis and playback lives in `src/audio/reactive-audio.js`. The gameplay engine only reports events and state. Input and world rendering still live in `game.js`: **next modularization targets** are `src/input/controls.js` and `src/render/world.js`.
7. Arcade records and practice unlocks live exclusively in `src/progression/arcade-progress.js`. The renderer never writes progression. Practice sessions must not call any `reached*`, `perfectZone`, or `finishRankedRun` method.
8. All new rules require targeted Node regression tests. Keep deterministic RNG injection in the Director.

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
- No new gameplay controls, collectibles or economy. The optional practice selector exists only on the menu and practice does not influence ranked results.

## Versions

- **1.0 (2026-11-06):** First single-page prototype.
- **1.1:** Tap-to-duck with a fixed duration and recovery.
- **2.0:** Adaptive motif generation, player-friction awareness, shared modules and Director regression tests.
- **Flow 1.0:** Reactive Flow tiers, skill-based score bonuses, Perfect Zones and shield recovery.

- **Audio 1.0 (2026-11-06):** Independent Web Audio engine, phase-responsive original layered music, Flow/zone sync, sound effects, pause/mute persistence, audio regression tests.

- **Arcade 1.0 (2026-11-06):** Personal best zone/streak/score, six milestones, milestone gallery and separately marked unranked practice from unlocked zones.

## Jump Feel tuning

Change timings in `src/core/config.js` under `JUMP_FEEL`. The Coyote Time distance cap matters at late-game speed: do not increase it without checking gap fairness. Jump buffering and squash/stretch are meant to improve responsiveness and visuals, not lower the underlying challenge. Run `node --test chroma-rush/tests/*.cjs` before changing physics or terrain interaction.
