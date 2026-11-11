# CHROMA CLASH 1.0 — four cubes, one collapsing arena

Status: first playable **single-player vs. 3 AI** prototype. Available from the CHROMA RUSH menu through the **CHROMA CLASH · NEW ARENA MODE** link, or at \`chroma-rush/clash.html\`. Existing runner/Trials/Reality remain untouched.

## Input response correction 1.1 — mobile feel (2026-11-11)

Initial mobile playtest showed the virtual joystick felt sluggish **even on a recent iPhone**. Source inspection revealed that the thumb's original analog input was linear, with 970 world units/s² acceleration and weak idle braking. A quarter-radius thumb motion therefore gave very little force, and returning or reversing the stick carried excessive inertia. The screenshot showed a correctly positioned stick and arena; this pass targets **gameplay response**, not visuals.

- **Acceleration:** 970 → 3100 world units/s², with a speed cap of 193 → 220 world units/s. A full stick typically reaches ~149 world units/s in 50 ms and the cap in ~80 ms in collision-free simulation.
- **Reversal:** Same physical acceleration applies to left/right, up/down, and all three AI cubes. No cheating, teleport or movement frame skipping.
- **Neutral braking:** Idle drag rises from 5.4 → 18 per second, preserving a short skid while making release more responsive.
- **Analog stick response:** 8% deadzone, then a non-linear `0.62` curve. Gentle finger displacement produces enough movement to feel active; physical thumb artwork still follows the finger exactly.
- **Rendering:** No new GPU effects, textures, or trails. Fixed-step 120 Hz simulation, the same arena and impacts, and the current 2× DPR cap remain.
- **Cache safety:** The Clash JavaScript URL now includes `?v=chroma-clash-1.1-responsive-input` to bypass stale mobile assets.
- **Regression:** Added quantitative 8ms/50ms/100ms, reversal, thumb deflection, release, diagonal-cap and identical AI steering tests; existing Chromium joystick/collapse smoke remains.

Device playtesting remains the authority for perceived comfort. This change deliberately does **not** add a Dash button or alter the runner.

## Intent / decisions

- Top-down 2D **square** platform with softly rounded corners. Not a circular arena.
- **Joystick only** on touch. WASD / arrow keys on desktop. No Jump or Dash button in 1.0.
- Four visually distinct neon cubes (YOU / NOVA / VOLT / HEX), simple momentum, equal mass, collision impulse and contact separation. A player can knock opponents off the platform, but cannot jump back in.
- **Six scheduled outer-ring collapses**, with an unambiguous **3.2-second warning**, marked cut-line and eight falling side/corner pieces. The central square remains. The complete platform does not continuously scale down without explanation.
- Seven color-zone palettes synchronized to successive collapses; color themes change in the environment, not players' identity colors. Last surviving cube wins.
- AI steers toward other living cubes, predicts its own unsafe momentum near the edge and tries to recover. No hidden AI speed or collision immunity. Behavior is deterministic per match seed, apart from the seed chosen for each new run.
- On-screen alive count, zone and elapsed time; pause/resume, restart, elimination/victory, local wins and personal maximum eliminations. Audio is deliberately not required.
- Separate arcade page and assets to reduce risk to the existing CHROMA RUSH runner. This is a first-stage arcade architecture, not yet a full Arcade Cup collection.

## Arena / timing

The platform is drawn at a fixed 960×540 reference size and letterboxed for landscape/mobile. All physics run at a fixed 120Hz; visual frame-rate never changes collision/AI timing. Canvas backing is limited to device pixel ratio 2.

| At elapsed time | Half-size (world units) | Zone |
|---|---:|---|
| Start | 198 | Flow |
| 14s | 166 | Surge |
| 28s | 136 | Pulse |
| 41s | 108 | Overdrive |
| 53s | 84 | Frenzy |
| 64s | 62 | Critical |
| 73s | 44 | Final |

From 81s onward the final platform contracts to enforce an eventual result; the game does **not** arbitrarily declare a winner at a time limit. End-of-round displays after a short fall animation. The edge uses rounded-square signed-distance support, not a large invisible AABB.

## How to test

1. Open the CHROMA RUSH main menu and tap **CHROMA CLASH · NEW ARENA MODE**.
2. Rotate phone to landscape, tap **ENTER ARENA**; drag the left-hand joystick. Desktop: WASD / arrows.
3. Push into an opponent and observe both cubes react. Try steering with and against your momentum.
4. At ~11s the first ring begins to warn; at 14s eight outer sections detach. Remaining zones repeat this without relocating cubes.
5. Test falling, victory, restart and pause/return. Confirm the original runner still starts unchanged.
6. Use \`node --test chroma-rush/tests/chroma-clash-1.0.test.cjs\` and the repository CI regression suite.

## Next playtest questions

- Is pushing an opponent meaningfully controllable **without** a Dash button?
- Are the first collapses well paced, or do bots cluster until the arena has already become too small?
- Does the outer edge clearly communicate danger in high-speed play? Should it warn longer?
- Are AI players assertive enough without obviously targeting the human all the time?
- Is the analog thumb distance comfortable on 16:9 and unusually narrow landscape phones?

No claims of device playtesting or production game balance are made by the static/unit checks alone.
