# CHROMA RUSH — Reality Engine 2.1: Physical Fold & Sentinel Volleys
Date: 2026-11-11

## Findings from user playtest (90-second log)
The submitted audit included realityEngine.route='lower', upperChoices=0,
phaseClears=[5,5,7], phaseHits=[0,0,0], and bossHealth=0. The only Jump inputs
around the route split were at 28.15s and 34.75s, outside the 2.0 hard-coded
30-33s selection window. Therefore jumping when the upper route was visible
could never select it. The boss had only normal fixed obstacles with chevrons
and no physically traveling projectiles. The round audit also incorrectly
reported mode='arcade' because RoundAudit.reset coerced all non-practice
modes back to arcade.

## Changes in 2.1
1. **Physical platform:** Both routes coexist on screen. The lower road remains
   an actual TerrainSystem flat collider; the upper is a separately rendered
   continuous platform with its own gameplay-facing upperSurfaceAt() height
   function. The entry ledge is 114 units above the lower road; it rises to a
   crest 142 units above and smoothly descends back by the merge.
2. **Landing-triggered route:** The upper route is selected *only* after
   upward Jump physics finish crossing the platform from above during descent.
   Neither merely pressing Jump at a particular time nor walking underneath
   selects it. Lower route is chosen if the player physically passes the
   entrance without an upper landing. Route-specific hazards wait for the
   decision, then only the chosen obstacles spawn.
3. **Sentinel volleys:** All 17 old boss chevron barriers are removed from
   Reality staging. At those authored times the boss now fires physical moving
   bolts from the right, with .4s muzzle charge and ~.6s flight to the player.
   Low bolts are avoided by Jump and high bolts by Duck. Both are resolved
   against the existing true playerBox and swept X collision checks; real hits
   cost HP and cause boss-phase failures. Surviving bolts contributes toward
   phase armor breaks, real score, combo and Flow. The three armor phases,
   boss damage responses and final shatter remain.
4. **Visual vocabulary:** No chevrons or arrow stamp on standard boss gates;
   boss attacks are distinctive neon diamond projectiles with short trails and
   visible charging beams connected to Sentinel's muzzle. A restrained
   chevron inset is added only to existing Arcade long dash-duck obstacles,
   inside their *actual* body, with NO change to collision or duration.
5. **Diagnostics and PB:** Reality mode exports as mode='reality',
   build='reality-engine-2.1', a new independent best-score key
   chromaRushRealityV21 and extra events/projectile hit-clear counts.
   Previous records and Arcade progression remain unaffected.

## Hard constraints
- No new controls. Same real Jump, Duck and Dash, same player physics.
- No changes to Arcade terrain selection, Director scheduling or speed.
- No new hitbox on the boss body; only launched projectiles damage.
- Boss attacks have a visible, time-budgeted travel path from right to left.
- Projectiles are simple Canvas 2D geometry, no external art dependencies.
- "World Fold" is a jump-reachable alternate platform, not curved-wall or
  altered-gravity physics. It remains an explicit experimental mechanic.

## Regression gates
- Node tests: jump height sufficiency, crossing/landing (not button shortcut),
  route resolution, chest/low shot hit and dodge combinations, swept collision
  under dropped frames, real armor damage and independent storage.
- Chromium: two landscape sizes, visible high/low tracks, boss projectile,
  and the actual game jump()/update() pathway landing on the upper platform.
- Human playtest needed for discoverability, responsiveness, projectiles'
  readable telegraphs, audio impact and fun.
