# CHROMA RUSH — Reality Engine 2.0: Gameplay First
Date: 2026-11-11

## Why 1.0 was rejected
Playtesting found World Fold indistinguishable from the existing Gravity Shift
and Sentinel only a tiny blinking background icon. Reality 2.0 must change
physical player decisions and challenge outcomes, not just the presentation.

## Available mode
Main menu > TRIALS > REALITY 002 · GAMEPLAY FIRST. This is a distinct, opt-in,
90-second fixed course. Arcade and Mastery Trial 001 do not use any of the
new branch, terrain or boss code. Reality 001 records are preserved separately;
Reality 002 uses chromaRushRealityV2 and a distinct revision signature.

## 1. Physical World Fold — actual route divergence
- The choice appears at 30.0–33.0 gameplay seconds, with a HUD preview of
  both paths before either becomes visible in the forward world camera.
- A normal grounded Jump in this window chooses UPPER (no extra button).
  Without one, LOWER is chosen when the window closes. The choice is final
  for this fork.
- At 34.0–37.6 s the upper path uses a real TerrainSystem slope from baseY
  to baseY-170. It maintains an elevated plateau to 47.4 s and returns on
  another true physical slope by 51.0 s. The lower path stays flat.
- Collision, grounding, feet height and obstacle groundY come directly from
  terrain.groundAt for the chosen route. Both routes have independently
  authored real obstacles at 39–46 s; the upper track is denser/higher-score,
  lower track easier. Unchosen obstacles never stage into the collision loop.
- A thin dashed outline shows the unselected alternate route. On the upper
  path a dark negative-space canyon under the actual deck makes its height
  visibly distinct; this artwork is non-colliding and cannot produce a death.
- Path geometry is joined at both ends and shares both real terrain gaps.
  The old Gravity Shift module is not invoked in Reality 002. Arcade Gravity
  Shift and its ceiling return are unchanged.

## 2. Sentinel — actionable three-phase boss encounter
- Sentinel enters at 60.9s as a large, faceted, angular creature with
  three real armor plates.
- It owns **17 actual collidable obstacles**, precomputed into its three
  phase attack sequences: SCAN (five), REWRITE (five), OVERLOAD (seven).
  They use the existing physical Jump/Duck avoidance and never force Dash.
- Boss obstacles have distinct slash-core geometry INSIDE their actual
  collision boxes, with no detached energy obstacles, unreadable text or
  hidden hitboxes. The three boss phrases have different cadence and
  movement vocabulary.
- Clears and hits from these specific real encounters are counted separately.
  A phase strips one armor plate if enough attacks are cleared cleanly and
  none are hit. The criteria are 4/5, 4/5 and 6/7 for phases 1–3.
- Armor plates disappear on earned phase completions; each phase break
  launches a short sharp fracturing VFX and feedback. All three broken
  plates defeat Sentinel; an intact boss remains if the player fails a
  phase. The result panel and exported private JSON report actual boss state.
- Sentinel is a set-piece encounter, not a network service or an adaptive
  enemy. The entity itself is not a physical collider. Its 17 **spawned
  attack barriers** are physical and use the unmodified shared collision
  and fairness routines.

## 3. Controlled Chroma Symphony
World resonance still reacts to successful actual clears and boss attacks.
Its illumination is environment-only: no fake hazards or additional lines
on the player cube. Boss phase breaks have strong event feedback even when
the soundtrack is muted.

## Safety
- Same two buttons and existing physics, collision, dash rescue, zone speed,
  Chroma Tide, Flow, shields/HP; no mandatory Dash.
- Course generation is fixed from the existing speedAt curve integrated
  at 25ms precision; independent of FPS, graphics settings, skill, HP and RNG.
- Dedicated validator checks both exclusive routes separately against
  movement commitment times, obstacle physical widths and real gap corridors.
- Standard TerrainSystem.canSpawnObstacle confirms every scripted hurdle,
  on both paths, is sufficiently far from slopes and gaps.
- No new random or adaptive Arcade spawns. Reality Trial maintains its own
  local-only PB and diagnostics, and preserves all earlier save keys.

## Testing and limits
- Node regression suite tests both route heights/landings, route selection,
  genuine collision placement, safe spacing, boss phase damage and old
  mode isolation.
- Real headless Chromium test opens the opt-in mode, draws both actual
  terrain variants and a boss attack, comparing screenshots across two
  landscape mobile viewports. Capture artifacts are available from CI.
- Still needs actual human device testing for readability, entertainment,
  difficulty, impact and the fluidity of the upper-route slope.
- We have *not* built a full curved-surface local-gravity physics engine or
  controllable alternate-dimension teleportation. The playable innovation
  here is a genuine diverging physical course, not the old visual mirror.
  Boss attacks use existing Jump/Duck controls with new phase structure,
  not arbitrary invulnerable projectile hitboxes.

## Recommended human playtest
- Choose HIGH once and LOW once; can you tell the height and obstacle
  pattern difference without needing an explanation?
- Does the route prompt feel too early, too late or intrusive?
- Do all three boss phases feel like direct combat, with understandable
  damage to armor and an actual earned finale?
- Save/export one Reality Trial audit after a full run or early failure.
