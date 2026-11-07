# CHROMA RUSH — Jump Obstacle Visual Identity 1.0

A landscape-first 2D neon auto-runner: Jump, Duck, and survive the acceleration.

**Play:** https://hajjen-game.github.io/Hajjen/chroma-rush/

## Jump Obstacle Visual Identity 1.0 (2026-11-07)

- **Low Neon Barrier:** the normal JUMP obstacle now reads as a physical grounded barrier with a full-footprint beveled shell, continuous top rail, recessed panel, vertical chassis supports and a broad luminous base. It uses the existing palette-linked colors and the same lightweight canvas drawing language as Duck Gates, without copying their tall silhouette.
- **No in-world direction labels:** the old floating `↑ JUMP` / `↓ DUCK` text and arrows are removed from regular obstacles. The Echo Spire also drops the floating `2× JUMP` instruction and replaces its arrow-shaped inner chevrons with two integrated energy chambers. The tall DUCK energy field and crawl clearance are unchanged.
- **All collision footprints are unchanged:** normal JUMP widths 43–58 and heights 53–66, the DUCK gate's 28 logical-unit slot, and the Echo Spire's double-jump height remain exactly the same. The normal barrier's solid artwork stays entirely within its original hitbox; no invisible solid decorative wings or altered timing are introduced.
- Gameplay buttons, Gravity Shift world reflection, scoring, procedural Director, high-speed fairness budgets and offscreen reaction-time HUD remain untouched. **The high-speed offscreen cue is a separate accessibility/fairness system, not text floating on an obstacle.**
- [Regression tests](tests/jump-obstacle-visual-identity-1.0.test.cjs) render all three live obstacle branches under normal and Low graphics settings and assert text removal, integrated shape, geometric footprint integrity and ceiling symmetry. Manual visual review on mobile is still recommended.

## High-Speed Readability & Fairness Audit 1.0 (2026-11-07)

- **Measured reaction windows, not just pixels.** Fast jump, duck and Echo Spire hazards are spawned farther ahead only when necessary to preserve their action-specific timing budgets (0.57s / 0.56s / 1.00s); gap and Echo Gap visual cue budgets are 0.66s / 1.10s. Running speed, hitboxes, gameplay RNG, buttons, and physics do not change.
- **Restrained offscreen preview.** If a *real* incoming hazard or generated gap would otherwise become visible too late, a small upright warning at the right edge identifies the required action and seconds remaining. Normal-speed play does not get unnecessary cues; ceiling mirroring and Low Graphics are supported.
- **Actual arrival-time safety.** The Director checks both spawn-time spacing and when each hazard physically reaches the player. A delayed Echo→Duck or Echo→Jump transition cannot silently become tighter merely because the two actions have different offscreen lookahead.
- **Local per-run observability.** Exported rounds include per-spawn visible and total reaction time, required timing budget, early cue usage, low-budget warnings, longest frame, frame stalls and fixed-step dropped simulation time. No identifiers or tracking.
- **24 deterministic 180-second audits**, spanning 3 mobile/desktop widths, 4 seeds and 2 scripted health/recovery behaviors: **2,206 obstacles**, 974 necessary advance cues, **zero under-budget spawns, late gap cues or unsafe arrival intervals**. These are scheduling/geometry checks, not proof of human playability or real-phone FPS.
- [**Full audit report & recommended mobile acceptance tests**](docs/high-speed-readability-fairness-audit-1.0.md) · [Audit script](scripts/high-speed-fairness-audit.cjs) · [Regression tests](tests/high-speed-fairness-audit-1.0.test.cjs).

## Movement-Aware Director 1.0 (2026-11-07)

- Adds a **pure, testable movement intelligence layer** (`src/director/movement-awareness.js`) alongside Adaptive Rush Director 2.0 and Unified Terrain Director 3.0. It models regular jumps, duck, Echo Jump, ordinary gaps and long Echo Gaps using **real control-commitment windows**, skill demand and recovery costs, without changing the input, physics, score or auto-run speed.
- Director composes short, **physically playable action phrases** (jump → duck, duck → jump, solo Echo, and later Echo combinations). Motif costs and dynamic effort budgets screen out overly hard strings after damage, recent heavy moves or low confidence; phase transitions still create genuine no-hazard breathing room.
- **Echo Spire difficulty is intentionally moderated.** The initial Spire remains a solitary, clearly labeled lesson after zone 4 during a healthy PEAK. More complex Echo phrases are only eligible after **at least one actual Echo Spire clear**. Echo spawns are separated by at least 7.2 seconds and refused when the visible approach becomes too short at extreme speed, avoiding impossible late prompts and stalled spawn queues.
- **Gap and obstacle Directors cooperate:** full aerial-recovery distance prevents an Echo Spire from immediately following a chasm or an Echo Gap from piling onto a recent Spire. Successful / missed gaps, real collision damage, genuine obstacle clears and gravity shifts feed measured movement pressure and future recovery windows. A terrain veto postpones unsafe obstacles rather than faking successful clears.
- Terrain generation and player physics remain canonical, so ceiling running mirrors the same collision/reaction windows. No Dash, extra buttons, physics alterations, scripted fixed levels or monetization.
- Run diagnostics include movement pressure at each recorded event and a Director insight snapshot with demand/cooldown state. New [movement-aware tests](tests/movement-aware-director-1.0.test.cjs) cover real jump durations, phrase effort, cooldowns, low-HP fallback, gap coordination, gravity recovery and high-speed lead-time safety.
- This is **first-pass calibration**. The goals are fewer unfair strings and more deliberate rhythm, not making all obstacles easy. Review player runs for how often hard Echo phrases actually occur before tuning their weights further.

## Echo Spire 1.0 — True Double-Jump Hazards (2026-11-07)

- Adds **Echo Spire**, a grounded, tall neon obstacle with a distinctive split-chevron body and a clear **2× JUMP** label, readable on Low graphics. It is not a stretched duck gate and cannot be crouched under.
- Height: **204–216 logical pixels**. The regular first-jump apex is about **177 pixels**, making a single jump physically insufficient; a reasonably timed Echo Jump clears comfortably. The hitbox ends at the visible top and matches the drawn body exactly.
- Introduced starting **zone 4**, after the zone 2 Echo Jump onboarding. The Adaptive Director places a **single isolated introductory Spire** at the first healthy, confident PEAK opportunity and defers it if the ground is unsafe. After introduction it may appear in BUILD/PEAK phrases, with later zone 6+/8+ optional multi-action motifs.
- Director spacing accounts for Echo flight and landing recovery. No Spires during low HP, high friction, early tutorial, FADE/RELAX or the unsafe portion of Gravity Shift. The existing terrain safety veto ensures no gaps or unsuitable slopes near the takeoff/landing.
- Normal jumps, duck gates, two-button controls, normal and Echo Gaps, physics, speed progression, score rules and original atmosphere remain intact. All obstacle coordinates are inverted with the course during ceiling running.
- A genuine Echo Spire clear receives a compact angular/particle flourish and an audit event. New regression tests simulate normal-vs-double-jump collision across speeds and verify Director sequencing, low-HP exclusions and the real arcade loop on both surfaces.

## Echo-proof Duck Gates 1.0 (2026-11-07)

- Echo Jump revealed a bypass in the original suspended **DUCK** obstacles: the player could jump over their short upper edge instead of ducking.
- DUCK hazards are now **continuous overhead energy gates** extending beyond the sky. Their collision occupies the same full-height region as their visible low-opacity field, so there are **no invisible blockers**. The previous saturated lower hanging module remains readable, with delicate vertical rails/crossbars continuing into the upper sky.
- The **28-unit duck clearance** below each gate remains unchanged. Standard standing movement and jumping collide, while properly timed duck still passes. Floor **JUMP** obstacles, procedural spacing, Echo Jump physics, HP/Flow scoring, and controls are untouched.
- All geometry stays in the canonical game world, so Gravity Shift mirrors the entire gate to the opposite side during ceiling running.
- [Regression tests](tests/duck-gates-echo-proof-1.0.test.cjs) cover collision at the Echo Jump apex, true duck passage, existing jump obstacles, floor/ceiling reflection, and visible gate/collider synchronization.

## Movement Evolution 1.0 — Echo Jump (2026-11-07)

- **No Dash, no third or fourth button.** The existing Jump and Duck inputs remain unchanged. Starting at zone 2, tapping Jump a second time while airborne (after a brief ~95ms protection against accidental double taps) performs one **Echo Jump** per flight. It uses a weaker second-jump target (−650), plus a bounded early-tap boost so the second press always adds real lift without exceeding the ordinary takeoff speed. The ability resets only after valid landing / fresh grounded takeoff.
- Normal jump, coyote time, 110ms landing buffer, recovery safety, gravity transitions and collision hitboxes are retained. Echo Jump does not alter horizontal speed, score or the Director's obstacle timing.
- The secondary beat has a distinct fast squash-then-stretch, layered angular light cuts, a small glow trail, procedural two-part sound and short vibration. Effects are drawn in the canonical player world, so ceiling mode mirrors them correctly. Reduced-motion and Low Graphics remain respected.
- A brief in-run cue teaches **TAP JUMP AGAIN IN THE AIR** at zone 2. A two-pronged accent follows the cube when the airborne second jump is available. Practice runs starting in later zones have it immediately.
- **Echo Gaps** are rare, opt-in longer chasms beginning zone 5, labelled **2× JUMP**. The Unified Terrain Director permits these only in healthy, confident PEAK segments with enough time to land. Regular gaps keep their previous sizes and generation rates.
- Run audit records Echo Jump uses and whether each gap was an Echo challenge. The new [movement tests](tests/movement-evolution-1.0.test.cjs) cover controller state, physical flight reachability, Director policy, marker generation and mobile input.
- Initial tuning proposal: playtest the second impulse and long-gap frequency; the current values are not yet declared final.

## Ceiling Player Animation Sync 1.0 (2026-11-07)

- Fixed a Canvas 2D save/restore mismatch in `ChromaStateVisuals.drawBehindPlayer`: when Chroma Flow was active, the player wake restored a state that it did not own. In ceiling mode, this prematurely removed the world mirror during `drawPlayer`, leaving the post-player neon brackets, contact glow, particle dust and arcade accents at floor orientation.
- The Chroma wake now **saves its own state before changing styles** and restores exactly that state; the gameplay camera transform stays active throughout the player and FX passes, then resets before the upright gravity indicator.
- Post-player brackets use the **rendered, animated silhouette** (`rw/rh`) rather than the rigid collision hitbox (`b.w/b.h`), so launch stretch, duck squash and landing deformation stay visually synchronized on both surfaces.
- No changes to hitboxes, physics, Director, speed, terrain generation, original background, Flow progression or input. Low graphics and reduced-motion settings remain supported.
- Added Canvas state-balance regression tests and an actual arcade-frame test for Chroma-active ceiling rendering, with a return-to-floor check.

## Gravity Shift / Ceiling Run 1.0 (2026-11-07)

- From **zone 3**, and then on every second new zone (5, 7, 9…), the runner alternates between the floor and the ceiling. In ceiling mode the entire course — terrain, actual gaps, low and overhead obstacles, trails and player — is mirrored vertically. The camera, two controls, original atmospheric background and DOM HUD stay upright.
- **JUMP** sends the runner away from the active surface: visibly downward while upside down; **DUCK** compresses the character toward the ceiling. The underlying collision and jump model remains canonical, so existing coyote time, jump buffering, gaps, scoring and procedural patterns still work.
- A **0.9-second GRAVITY SHIFT warning** precedes the flip. If the physical runway is not clear (obstacles, gaps or an airborne player), the warning waits rather than flipping into danger. Incoming hazards are paused during preparation and the brief transition.
- The **0.58-second mirrored squeeze-and-expand** includes a thin electric seam and two newly synthesized sound cues. Brief post-flip invulnerability prevents unfair hits, with no fake clears. Low graphics retains the warning and persistent **CEILING RUN** indicator.
- *Reduced motion* makes the mode switch instant after a safe warning; pause/restart/menu reset transitions cleanly. The game does **not** slow down during the shift.
- [New safety and geometry tests](tests/gravity-shift-1.0.test.cjs) validate the sequence and the transform. This is an initial gameplay pass; its visual impact and frequency should be playtested on mobile before extending it.

## Original Background Restored 1.0 (2026-11-07)

- Restored **the exact Full Background Continuity 1.0 renderer** from the commit preceding Background Depth & Parallax 2.0. The user preferred its calmer original neon haze, faint structures, horizon and star streaks over the later buildings and mountain layers.
- Background Depth & Parallax 2.0 and 2.1 are **historical, not currently active**. Their docs remain for future design reference.
- **Arcade Animation Language 2.0, Speed Trails 2.0, Chroma State 2.0, Spectral Wave, Flow, terrain, Director, and all controls stay in place.**
- The original background still covers every pixel behind gaps and slopes. Spectral Wave continues its old/new color transition, while the scenery itself uses its original time-based motion.
- New regression and screenshot checks guard against accidentally reintroducing buildings or mountain profiles.

## Arcade Animation Language 2.0 (2026-11-07)

- A shared **side-on neon visual grammar** for seven actual game moments: jump launch, landing, duck entry, duck release, registered near-miss precision clearance, first speed milestones, and Perfect Zone rewards.
- Short straight-line accents coordinate with existing Speed Trails, Spectral Wave and Chroma State instead of adding circular rings or a screen-wide flash.
- Precision passes get a distinctive detached neon cross-cut; at speed multipliers 1.5×, 2×, 3×, 4×, 6× and 8×, a single short rail burst marks the milestone.
- Reduced pre-existing random launch/land/duck particles, bounded all new cues in the existing 24-entry effect pool, added a cooldown/priority mechanism, and scaled layers to the current mobile graphics preset.
- No changes to collision, Jump/Duck controls, difficulty, score, Flow, Director or audio. Reduced-motion disables the new moving cues.
- [Detailed animation plan and test coverage](docs/arcade-animation-language-2.0.md).

## Background Depth & Parallax 2.1 – Layered Landscape Pass (archived, not active)

- **Replaces the high, separate city/building objects** from 2.0 with **three continuous, gently rolling mountain/ridge silhouettes**; no freestanding towers, hard-edged windows or faux obstacles.
- Keeps the distant starfield and independent far/middle/near parallax based on accumulated world travel. Low-contrast haze between ridges creates depth without busy details.
- Eight palette zones now have distinct *landscape geometry*: CYAN soft hills, VIOLET soft peaked ridges, MAGENTA dunes, LIME open valleys, AMBER rounded mesas, ELECTRIC folds, REDLINE dramatic mountain ridges and WHITEOUT frosted peaks.
- **Spectral Wave** still reveals both the new zone colors and its landforms using the same clipped color front; full-height background remains visible through real gaps and slopes.
- Geometry, crest strokes, stars and glow adapt to High/Balanced/Performance settings and reduced motion. No changes to Director, obstacle shapes, collision, jump/duck, Flow or speed.
- [Technical design and tests](docs/background-depth-parallax-2.1.md).

## Background Depth & Parallax 2.0 (archived, not active)

- Rebuilt the pure Canvas 2D world with **four spatial parallax planes** (distant stars, far towers, intermediate architecture, and nearer structures) plus subtle fast-moving horizon streaks.
- Eight neon palette zones now own **distinct silhouettes** — for example VIOLET spires, LIME terraces, AMBER foundries and ELECTRIC arched conduits.
- The existing **Spectral Wave** reveals the incoming architecture as well as the palette, with old/new motifs on the correct side of the passing color front.
- All scrolling derives from travelled world distance; atmosphere continues behind gap terrain with no hard floor seam, and hazards remain above every background detail.
- All geometry is generated in code. High/Balanced/Performance profiles reduce distant and near structure costs; reduced-motion keeps the scenery static.
- No changes to scoring, AI Director, obstacle patterns, collision, player speed, controls or Flow.
- [Technical design and testing](docs/background-depth-parallax-2.0.md).

## Speed Trails 2.0 (2026-11-07)

- Replaced the old fixed-row ghost copies with **actual timed afterimages** from earlier frames. During jump or duck, the echoes retain the corresponding earlier height and silhouette.
- **Longer light rails at higher speed**, plus separate small luminous fragments that travel backward and fade. High-speed momentum is visible even outside Chroma State.
- Unified the trail language with Chroma State 2.0 to avoid two overlapping sets of wake filaments. Chroma adds restrained visual intensity without changing its Flow reward.
- Quality budgets are capped for High/Balanced/Performance, and reduced-motion suppresses animated trails. No score, speed, collision, Director or input changes.
- [Implementation notes and tests](docs/speed-trails-2.0.md).

## Flow Multiplier Glow 1.0 (2026-11-07)

- **1.25×** now starts the reward ladder with a slightly larger cyan number and slow, soft breathing neon glow.
- **1.5×** is more prominent, lavender and visibly pulsing.
- **2×** is a large pink-violet neon reward with the strongest, fastest glow pulse.
- The label uses the actual **Flow tier**, including Chroma State's existing 90% entry / 87% exit latch. No scoring, difficulty or speed changes.
- Only the small HUD text pulses: no whole-screen flashes, rings, gameplay obstruction or layout-jolting scaling. Reduced-motion keeps static tier colors and glow.
- [Implementation notes](docs/flow-multiplier-glow-1.0.md).

## Chroma State 2.0 (2026-11-07)

- At 90% Flow, Chroma State now arrives as a multilayer neon transformation: a one-time activation accent, streaked energy wake, luminous straight-edge corner accents and atmospheric world light.
- A distinct ascending synth cue and understated melody shimmer reinforce the upgraded 2× state. The Flow/score economy, 90%-enter/87%-exit hysteresis, HP and all gameplay geometry are unchanged.
- Animations use the existing High/Balanced/Performance graphics settings and honor reduced-motion preferences. No extra buttons or circular ring effects.
- [Technical notes](docs/chroma-state-2.0.md).

## Zone Transition Spectral Wave 1.0 (2026-11-07)

- Entering a new zone launches a **0.92-second right-to-left neon color front**. The old palette remains on the left while the new one rolls in from the right.
- The parallax backdrop and terrain are recolored in distinct Canvas 2D clipped layers. Obstacles and player color respond to their actual positions within the front rather than switching globally.
- The moving boundary carries a soft prismatic glow, a few horizontal light streaks, and a ground-aligned accent — no large oval rings, flashes, or obstacle-obscuring overlays.
- The zone title crests near the moment the wave crosses the player, accompanied by a short linear pulse and restrained sparkle. Perfect Zone audio remains the priority.
- No gameplay effects: jump/duck controls, speed, zones, Director, obstacle collision, Flow, and score do not change. Effects scale with graphics quality; reduced-motion immediately recolors the scene.
- The published build is version-marked so the main-menu cache freshness check detects updates.
- [Implementation and test notes](docs/zone-transition-spectral-wave-1.0.md).

## Mobile Arcade Polish 1.0 (2026-11-06)

- **Landscape touch controls** retain comfortable 80×80 px hit targets with a smaller visual footprint, clearer pressed states and independent pointer-ID handling for two-thumb play.
- **HUD hierarchy** prioritizes shield, Flow, zone and score without colliding with top-right actions, including short landscape phones.
- **Sound settings** now distinguish Music, Sound Effects, Effects Volume and Vibration. The existing quick sound button still mutes all audio, while separate choices persist locally.
- **Optional fullscreen** is available from the menu where the browser supports it; fallback is safe and explains browser limitations.
- **Polished transitions** add a short nonblocking GO cue and subtle pause/results panel easing; reduced-motion preference is respected.
- **No game rule changes:** speed, jump/duck geometry, damage, Chroma Flow, Director, terrain and the selected graphics quality are unchanged.
- [Technical details and test plan](docs/mobile-arcade-polish-1.0.md).

## Duck Feel & Effect Language 1.0 (2026-11-06)

- Duck has a fast downward compression, a brief low speed trail, and an elastic upright release; the 0.55 s tap pulse, 0.12 s recovery, collision boxes, jump physics and input semantics remain untouched.
- Added `src/render/effect-language.js` for bounded, reusable **horizontal ground pulses** and **detached rectangular corner echoes**. The old screen-plane oval rings are removed from jumps, landings, gaps, hits and zone celebrations.
- The Chroma State halo and contact shadow now use straight neon brackets / a ground strip instead of ellipses. Tiny round particles remain intentionally as sparks, not rings.
- Effects are capped to 24 concurrent instances and respect High / Balanced / Performance graphics settings. Cosmetic random draws stay isolated from gameplay generation.
- Node regression and Chromium screenshots cover the new animation states, VFX shape and gameplay integrity; no new levels, obstacles or control buttons.

## Flow Balance 1.1 (2026-11-06)

- Rebalanced from two real arcade-run exports (zone 8 and zone 10): Chroma State no longer spends most of the session saturated at 100%.
- Normal clears grant **5 Flow** instead of 6, precision clears **8** instead of 10, and a Perfect Zone grants **5 Flow** instead of 8. Existing Perfect Zone **+10 shield**, points, Flow tiers, multipliers and all score mechanics are retained.
- Smooth, high-tier-only resistance starts at 65 Flow and scales to **4.5 Flow per second at 100**. There is no extra decay below 65; the old inactivity decay remains unchanged. No sudden wipe or hard timer.
- Challenge generation, score multipliers, physics, Director, accessibility options and graphics quality remain unchanged. The high-tier visual effects naturally respond to the new Flow meter without adding expensive rendering.
- Local-only event replay checks the original two logs against the new rules. Historical scores are not rewritten; new scores follow the revised Flow economy.
- Technical details: [docs/flow-balance-1.1.md](docs/flow-balance-1.1.md).

## Unified Terrain Director 3.0 (2026-11-06)

- **One continuous procedural run, never fixed levels:** `src/director/unified-terrain-director.js` coordinates terrain choices with Adaptive Rush Director 2.0 while retaining the existing two controls, speed, Flow and HP rules.
- **Phase-aware terrain:** BUILD favors broad rolling slopes, PEAK may introduce occasional gaps, FADE limits new hazards, and RELAX is predominantly stable, flat ground. Zone restrictions still apply (slopes from zone 2, gaps from zone 3).
- **Arrival-aware planning:** the coordinator estimates which Director phase will be active when each upcoming terrain feature reaches the player; this prevents scheduling a new gap merely because PEAK is active while the generated section is still far off-screen.
- **Recovery and safety:** an unsafe gap/obstacle combination is deferred until the terrain is clear. Missed gaps temporarily reduce future gap pressure, especially at low shield or high stress; successful gaps keep forward momentum.
- **Separate responsibilities:** `terrain-system.js` remains responsible for geometrically valid slopes/gaps, `adaptive-director.js` still selects authored jump/duck motifs and pacing, and the unified coordinator determines the shared timing policy. No extra game actions or levels.
- **Diagnostics:** exported round logs now label generated slopes and gaps with their intended Director phase. New seeded 3-minute simulations test variety, gap spacing, deferral, recovery, and phase behavior.
- **Performance:** this change deliberately does not increase visual effects or perform per-frame full-course pathfinding. Existing mobile rendering performance remains an independent optimization task; subjective feel is not claimed to be validated on slow devices.

## Game Experience & Visual Audit 1.0 (2026-11-06)

- **Actual Chromium visual suite** at four landscape resolutions: flat/hilly/gap terrain, menu and result screens, full-height background pixel checks, and JavaScript error monitoring. GitHub Actions now uploads rendered screenshots after each change.
- **Fixed** a shield-damage inconsistency: a gap miss during temporary invulnerability no longer charges another 25 HP (but still breaks Flow and records a failed gap).
- **Fixed** clipping of the start menu on very short landscape viewports without reducing gameplay button hit areas.
- **Run diagnostics:** finished runs now offer an optional **EXPORT RUN LOG** JSON download (zones, hits, gaps, Flow/Chroma State, Director phases/stress and key events). Logs are local-only, bounded and contain no personal data.
- **Full report:** [docs/game-experience-visual-audit-1.0.md](docs/game-experience-visual-audit-1.0.md), including tested coverage, limitations and next improvements.
- Same gameplay rules, Director 2.0, terrain, acceleration, music and scoring. The only rule correction is consistent gap invulnerability.

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
