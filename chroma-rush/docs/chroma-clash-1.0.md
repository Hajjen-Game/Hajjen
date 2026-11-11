# CHROMA CLASH 1.0 — four cubes, one collapsing arena

Status: first playable **single-player vs. 3 AI** prototype. Available from the CHROMA RUSH menu through the **CHROMA CLASH · NEW ARENA MODE** link, or at \`chroma-rush/clash.html\`. Existing runner/Trials/Reality remain untouched.

## Zone Tempo 1.2 — color and speed every 10 seconds (2026-11-11)

The first playtest after responsive steering found the cubes **too fast**, while the player survived roughly 45 seconds. The fix is NOT to slow joystick reaction, because precise turning is important. We slow **maximum travel speed**, and tie its growth to a predictable ten-second color schedule.

- **Starting movement cap:** 145 world units/s, instead of 220 for the full match.
- **Every 10 seconds** (at 10, 20, 30, 40, ...): color zone advances, speed cap rises by **12** world units/s. Players and all 3 AI cubes obey the same cap.
- **Decoupled arena:** the edge still falls at 14, 28, 41, 53, 64 and 73 seconds, each with its own warning. Arena breaks never cause additional speed or color changes.
- **Visual identity:** the arena border, material and background blend to the next palette over **0.72 seconds**. Player cube colors stay fixed so opponents remain recognizable. No false obstacle-colored square pulses.
- **UI:** HUD shows current ten-second zone and its speed multiplier relative to the start; color announcements indicate new zones. Edge warnings retain priority for survival.
- **Long runs:** the seven color palettes cycle after zone seven. Movement continues increasing at later ten-second marks, with a high-end 277 world-unit/s cap as a safety limit.
- **No other gameplay changes:** same fast thumb response, acceleration 3100, braking, impulses, opponent logic, collisions and collapsing square. The Runner remains untouched.

| Time | Color zone | Top speed | Relative speed |
|---|---|---:|---:|
| 0–9s | Flow | 145 | 1.00× |
| 10–19s | Surge | 157 | 1.08× |
| 20–29s | Pulse | 169 | 1.17× |
| 30–39s | Overdrive | 181 | 1.25× |
| 40–49s | Frenzy | 193 | 1.33× |
| 50–59s | Critical | 205 | 1.41× |
| 60–69s | Final | 217 | 1.50× |
| 70–79s | Flow (next cycle) | 229 | 1.58× |

New 1.2 deterministic tests verify exact ten-second transitions, absence of accidental collapses on color changes, AI/player speed parity, smooth color interpolation and no extra color jumps when outer rings detach. Mobile/desktop browser smoke includes both a ten-second zone and a separate 14-second collapse. Mobile script cache key updated to `chroma-clash-1.2-ten-second-zones`. Real phone playtests still determine whether the pace feels good.

## Input response correction 1.1 — mobile feel (historical, 2026-11-11)

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
- Seven color-zone palettes now rotate independently every ten seconds while speed rises; arena edges keep their own collapse clock. Color themes change in the environment, not players' identity colors. Last surviving cube wins.
- AI steers toward other living cubes, predicts its own unsafe momentum near the edge and tries to recover. No hidden AI speed or collision immunity. Behavior is deterministic per match seed, apart from the seed chosen for each new run.
- On-screen alive count, zone and elapsed time; pause/resume, restart, elimination/victory, local wins and personal maximum eliminations. Audio is deliberately not required.
- Separate arcade page and assets to reduce risk to the existing CHROMA RUSH runner. This is a first-stage arcade architecture, not yet a full Arcade Cup collection.

## Arena / timing

The platform is drawn at a fixed 960×540 reference size and letterboxed for landscape/mobile. All physics run at a fixed 120Hz; visual frame-rate never changes collision/AI timing. Canvas backing is limited to device pixel ratio 2.

| At elapsed time | Remaining half-size (world units) | Event |
|---|---:|---|
| Start | 198 | Full platform |
| 14s | 166 | Outer ring 1 detaches |
| 28s | 136 | Outer ring 2 detaches |
| 41s | 108 | Outer ring 3 detaches |
| 53s | 84 | Outer ring 4 detaches |
| 64s | 62 | Outer ring 5 detaches |
| 73s | 44 | Outer ring 6 detaches |

**These times do not control the color zones.** The palette/speed schedule above always uses exactly ten-second intervals.

From 81s onward the final platform contracts to enforce an eventual result; the game does **not** arbitrarily declare a winner at a time limit. End-of-round displays after a short fall animation. The edge uses rounded-square signed-distance support, not a large invisible AABB.

## How to test

1. Open the CHROMA RUSH main menu and tap **CHROMA CLASH · NEW ARENA MODE**.
2. Rotate phone to landscape, tap **ENTER ARENA**; drag the left-hand joystick. Desktop: WASD / arrows.
3. Push into an opponent and observe both cubes react. Try steering with and against your momentum.
4. At 10s, the color changes and movement speed increases. At ~11s the first ring begins to warn; at 14s eight outer sections detach. Subsequent zone swaps continue on the ten-second clock without moving the cubes.
5. Test falling, victory, restart and pause/return. Confirm the original runner still starts unchanged.
6. Use \`node --test chroma-rush/tests/chroma-clash-1.0.test.cjs\` and the repository CI regression suite.

## Next playtest questions

- Is pushing an opponent meaningfully controllable **without** a Dash button?
- Are the first collapses well paced, or do bots cluster until the arena has already become too small?
- Does the outer edge clearly communicate danger in high-speed play? Should it warn longer?
- Are AI players assertive enough without obviously targeting the human all the time?
- Is the analog thumb distance comfortable on 16:9 and unusually narrow landscape phones?

No claims of device playtesting or production game balance are made by the static/unit checks alone.
