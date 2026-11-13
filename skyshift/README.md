# SKYSHIFT 0.4 – Track Flow Rebuild

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

First Flight has been rebuilt as a **track-led space arcade trial**. Endless is still deferred. A finite 1300-metre course remains with six mandatory platform jumps, Sky Islands, optional safe/risk split, checkpoints, shield and finish. The visual focus has shifted from canyon props to the raceway, spacecraft and active steering.

## New in 0.4

### 1. No canyon – open space
- `space-v04.mjs`: three restrained star fields and two almost imperceptible nebula haze sprites; no geological terrain, artificial floor, towers or clutter.
- The camera stays track-relative, keeping the craft free to move laterally on screen.

### 2. Real authored track flow
- `trial-v04.mjs`: nine hand-designed sweepers and linked-turn segments with stronger heading angles (.28 to 1.07 radians), starting shortly after launch.
- Normal deck widths increase by roughly 20–25%, reaching approximately 20–21.2 m. Island pads get a modest readability increase without making lateral jumps optional.
- All road mesh vertices, jumping gaps, lane splits, guardrails and physics use the same authored positions and widths; no misaligned visuals.
- The deck's vertical sidewalls have a subtle structural light trim. No decorative black squares or fake platform bridges.
- Gate widths are derived from track width.

### 3. Curves demand steering
- Previously the craft *automatically followed the centreline* of each curve, requiring little player input.
- `turnLoadAt(s)` adds modest, signed lateral load driven by heading derivative and speed. The load is **fully countersteerable**; the ship continues moving forward automatically.
- Turn-load is explicitly disabled near mandatory jumps, the island sequence and the split risk lane, preserving fair precision challenges.
- A wider deck supports deliberate carving without simply removing challenge.
- `stepFlight` records steering time, reversal count, total curve load and peak curve load.

### 4. Camera and craft motion
- Increased turn anticipation and more room for the ship to swing across the camera frame.
- The ship's visual lean reacts to turn shape as well as lateral velocity; the camera has a very small roll in sweeps. These are **visual cues only**; actual banked road geometry will be a separate future step.

### 5. Performance and controls
- Retains modern GPU target, original refined HDR bloom and 0.3.3.1 luminance – Galaxy A51 is not the quality ceiling.
- Existing fullscreen, mobile steering and jump controls remain unchanged.
- Old versions and `world-v034.mjs` stay in repository for comparison but are not loaded by the active game.
- Existing personal-best storage remains, although the redesigned course's geometry means old times are not directly comparable.

## Active files
- `trial-v04.mjs` – new course geometry and turn-force physics
- `game-v04.mjs` – WebGL road, camera, ship motion, controls and telemetry
- `identity-v04.mjs` – minimal collision-safe surface markings
- `space-v04.mjs` – quiet starfield / atmospheric depth
- `index.html` and `style-v04.css` – active HTML/CSS
- `ship-v034.mjs`, `premium-v032.mjs`, `neon-v032.mjs`, `luminance-v0331.mjs`, `fullscreen-v02.mjs` – retained visual and control modules

## Test
- `node --test skyshift/flow-v04.test.mjs` verifies bend geometry and demand, countersteering, safe gap crossings and continuous full-course completion.
- CI also runs all historical tests of earlier versions.
- Automated tests cannot validate subjective flight feel or screenshots, so mobile playtesting is required. Check 35–116m, 181–258m, 687–839m and 1130–1248m for stronger steering.

## Next, not yet implemented
- 0.4.1: physically banked road geometry and deeper corner attitude.
- 0.5: a Chroma Rush-inspired traveling zone color wave in 3D.
- 0.6: optional wall riding and unusual gravity sections, only once flat racing feels good.

Other projects in the repository are unchanged.