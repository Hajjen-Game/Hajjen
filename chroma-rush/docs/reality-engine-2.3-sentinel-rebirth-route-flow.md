# CHROMA RUSH — Reality Engine 2.3: Sentinel Rebirth & Route Flow

Date: 2026-11-11. Opt-in Reality 002 only. Arcade and Mastery Trial remain unchanged.

## User-reported 2.2 failures
- The lower route felt deserted after taking the safe fork. The old pre-fork sequence ended at about 28.6 seconds and the first lower obstacle did not arrive until 39.2 seconds: ~10.6 seconds between conventional hurdles.
- The visible Sentinel was large and asymmetrical (open neon contours), and projectiles simply appeared much lower down instead of firing from its body.
- Overdrive route status rendered on top of the central Zone/Trial/HUD.

## 2.3 gameplay modifications
### Lower route — fewer empty beats
- Add a physically real common **FOLD APPROACH** jump challenge at 31.38 seconds, leaving the physical branch and platform-jump runway clear at 34–37.6 seconds.
- Replace the four lower-route hazards with **six** staggered lower gates at 38.75, 40.22, 41.69, 43.16, 44.63, and 46.10 seconds. Pattern J-D-J-D-D-J. Each is a normal physical obstacle and has a validated jump/duck commitment window. First begins ~1 second after the physical lower-route commitment at ~37.7s.
- The upper Overdrive route retains seven faster gates, 2× route-clear score, and its conditional +1,800 clean-run bonus. Lower remains more forgiving, not empty.
- Course generation remains deterministic; gaps, speed, player physics, route landing, and boss phase timings are unchanged. Validation checks real terrain/gap clearance on both branches.

### Sentinel — live symmetric reactor
- Replace the previous character-like, incomplete angular outlines with a **fully symmetric regular octagonal energy core**, two inner concentric square boundaries, one central pulsing reactor and exactly three armor segments INSIDE the reactor.
- The core charges while an attack is being prepared; its shape brightens and expands. When the attack actually departs after its 400ms charge, it compresses and flashes in recoil.
- Every physical projectile is born at `spawnX=camera.worldX(0.80*W, player.x)` and `bossY=camera.worldY(0.31*H, floorY)`. This exactly matches the boss's visible 2D center, even under adaptive camera zoom.
- Shot remains attached to the reactor while charging, then moves **down and left along a short, smooth physical trajectory** into its safe, distinct Jump/Duck attack lane. Descending is completed before reaching the cube; swept X and exact Y hitboxes remain authoritative. A short moving-history trail visibly connects the flight, rather than a static false hazard line.
- Avoided shots continue offscreen; impacts still fracture at the cube's true collision point. 2.2's physical fairness and attack silhouettes remain intact.
- Armor-break VFX now uses the same inverse-projected core coordinates as the projectile start, instead of a mismatched unzoomed screen position.

### HUD clean-up
- Remove **all** extra Overdrive overlay text drawn in the center over Zone, time and Chroma Surge. The existing single Reality HUD mode-indicator is now updated to compact `REALITY · UPPER OVERDRIVE ×2` or `REALITY · LOWER FLOW`, and switches to the Sentinel phase indicator on boss entry.
- During attacks, only a short `LOW · JUMP` / `HIGH · DUCK` cue appears **next to/below the boss** for less than a second, not on the main play lane or the central HUD.
- End-screen and entry button refer to Reality 2.3.

### Diagnostics
- New local-only Reality personal-best namespace `chromaRushRealityV23`. All previous Reality, Mastery, and Arcade saves are left intact.
- Diagnostic build marker is `reality-engine-2.3`; exported engine state includes `muzzleFires` and `bossFlightTrails`, plus prior route and projectile counters.

## Explicit non-goals
- No new buttons, mandatory Dash sequence or boss-body hitbox.
- No new player/gravity mechanics outside Reality.
- No claim of a full 3D or curved-surface World Fold.
- No claim that the new visual taste or balance has been endorsed by a device playtester: the requested subjective improvement still needs a real run.

## Verification
- Node regression: deterministic fork timing, both paths' real terrain and safety margins, charging projectile starting exactly at the visual core, physical descent, separate low/high dodge semantics, passed projectile leaving screen and independent records.
- Chromium smoke: real jump and upper-landing through the game loop, genuine low/high scenes, real boss projectile launch source projected to correct pixel coordinates on both landscape mobile resolutions, physical departure.
- GitHub Actions runs the full existing Arcade and other game subsystem regression suites.
