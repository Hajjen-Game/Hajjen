# Reality Engine 2.2 — Route Identity & Boss Clarity
Date: 2026-11-11

## Reason for the pass — playtest evidence
The submitted Reality 2.1 diagnostic (90 seconds, mode `reality`, 25 ordinary obstacles, 2 gaps) recorded `route=upper`, `upperLandings=1`, 17 Sentinel shots fired, 16 clears, 1 hit, no full boss defeat (`bossHealth=1`). User reported that the high route was mechanically accessible but felt neither special nor challenging, that the high/low shots looked ambiguous, that shots vanished when crossing the cube and that the boss silhouette felt off-brand. These are genuine readability/feel/design issues, not a lack of working fundamental logic.

## 2.2 changes
### Upper route: Overdrive prototype
- Author a distinct, deterministic 7-gate high-route sequence at 1.16-second cadence (`JJDJJDD`, 39.1–46.06s), rather than the old 6-gate 1.40s sequence. Lower route remains the 4-gate path at 2.05s cadence. The new high route has around twice as many challenges per second as the lower route, after allowing for the shorter played duration.
- Run the exact pre-existing player physics and one-button Jump / one-button Duck collision semantics on the upper deck.
- Give the high route its own ambient deck glow and a compact "UPPER OVERDRIVE · 2×" state cue.
- Earn 2× the baseline score from clearing its seven route-specific hazards, and an additional 1,800-point bonus for clearing all seven without a contact. No free bonus for merely choosing the high route, or for six of seven. The low route remains the safe path without Overdrive multiplier.
- Preserve the true player landing requirement and the valid integrated terrain/gap plan. New route authored obstacles are checked for minimum jump/duck commitment time, world-space spacing and real gap/terrain clearance. All non-upper hazards, gaps and boss timings remain unchanged.

### Sentinel: physics before decoration
- Low projectile is a wide **ground cutter** in the established Jump color. This is a collision shape drawn across the near-floor lane, readable as Jump.
- High projectile is a longer **suspended sweep** in the established Duck color. It occupies a separate aerial band, leaving a real safe duck passage beneath.
- Both physics hitboxes are the actual pixels rendered by the projectiles. The high shot overlaps a standing cube sufficiently to convey visible contact, but passes clearly above a ducked cube.
- During a successful avoidance, a projectile is **scored only once** as soon as its *tail* has fully passed the player's x-position, but **continues physically traveling left**. It is removed only when its whole shape is beyond the camera's left bound. This fixes the visual snapping/despawning witnessed in 2.1.
- When a shot collides, swept-X plus exact Y box intersection determines the cube contact. It is clamped to the player's true rectangle; a short 280ms break-apart rendering and brief frame echo are placed at this exact point. The canonical onHit() then handles HP/shield, color pulse, audio, damage and phase counting. Never mark the shot hit before calling onHit(), or it will ignore damage.
- A compact "LOW · JUMP" / "HIGH · DUCK" boss-area cue accompanies the launch. No separate fake energy bridges and no jump/duck labels or arrows on ordinary gates.
- The Sentinel body is no longer an elaborate character silhouette. It is now a simple, familiar **Chroma control core**: angular neon contours, a central square pulse, and three measurable armor bars. It dynamically uses the current palette colors and respects reduced motion.

### Telemetry and isolation
- Reality 2.2 uses `chromaRushRealityV22` PB key, separate from 2.1, 2.0, 1.0, Mastery and Arcade.
- Existing RoundAudit allowed event list now includes route choice, upper multiplier and completion bonus, boss phases, boss shot launches, and each projectile hit/clear with the impact point and whether the shot persists.
- Build marker in exported Reality JSON updated to `reality-engine-2.2`. Time, mode and performance samples are otherwise unchanged.
- All 2.2 code is loaded **after** 2.1, exclusively for opt-in Reality; Arcade Director, endless escalation, normal Jump/Duck obstacle paint, camera, Gravity Shift, Chroma Tide and Mastery Trial are untouched.

## Tests
- Node: deterministic 7-vs-4 course, physical minimum timing clearance, actual elevated terrain fit, rewarded clean route only, no farming, swept projectile collision, duck and jump avoidance, persistent projectile travel to offscreen, 280ms impact VFX anchored to exact playerBox, minimal boss render, isolated save and app wiring.
- Chromium: existing Reality visual-browser audit exercises the real game jump/land on the high platform and separate high/low canvases plus a boss encounter at two mobile landscape sizes. Regression suite additionally covers unchanged Arcade systems.
- Not claimed: verified subjective play feel. Requires **device playtesting** of reaction time, spacing, color contrast, readability, and whether the reward genuinely makes players choose Overdrive. Overdrive does not alter camera speed or demand Dash.

## Player device acceptance
1. Take both routes in different Reality trials; upper should have seven faster gates, an `UPPER OVERDRIVE` callout, 2× on route clears and a +1800 clean reward at merge.
2. Observe both Sentinel shot silhouettes. Low near ground = Jump; suspended wide bar = Duck. Do not mix up either at full speed.
3. Dodge one shot with plenty of margin and confirm its **tail passes to the left of the cube and exits screen**, not vanish at the player's center.
4. Take one direct shot and confirm a clear, centered visual break at the point of cube contact.
5. Confirm the new geometric control-core Sentinel looks native to the Chroma world. Export Reality log afterwards, with `reality_*` events now present.
