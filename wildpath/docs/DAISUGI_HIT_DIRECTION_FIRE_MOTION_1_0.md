# Wildpath – Daisugi Hit Direction + Player Fire Motion 1.0

**Game:** https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1&rev=fire-motion-1-0

## Requested changes

The user approved the previous enemy hit strength but observed that enemies were knocked **sideways** rather than **backwards**. They also wanted Glintweaver's whole body to **charge by leaning backward, lunge forward when a Water Dart is launched, and recover smoothly**.

All changes are **opt-in Daisugi-only**, on the original Wildpath 2.x codebase. There is no alteration to the original world radius, camera zoom, player movement formula/speed, existing auto-fire cadence, projectile damage, arena, Nature Rebirth/Fusion or score.

## Enemy: reliably back away from hero

- `daisugi-hit-feedback.js` now computes knockback from **hero to enemy**, not projectile's last (often sideways) hit position.
- Preserve previous hit strengths (including bounce, wave and chain multipliers), recoil feel and **2.65 impulse cap**.
- When hits stack, project older momentum onto the current hero→enemy direction so sideways residual velocity cannot accumulate.
- On the rare exact hero/enemy overlap, fall back to source vector; otherwise use a stable axis.
- Enemy leans **backward on local X**, not sideways on Z. The same applies to the existing 0.16-second death-recoil animation.
- Default / non-Daisugi combat keeps its original behavior.

## Player: clear automatic charge and launch pose

- `daisugi-fire-motion.js` exports pure pose timings and easing.
- **Final 0.11 seconds before an automatic shot:** subtle backward pitch, arm pullback and restrained body lift (only while an in-range target exists).
- **On actual shot:** forward pitch with both arms, small up-down bob and squash. Returns to idle over **0.28 seconds**.
- Uses `game.attackClock` **as already scheduled** for windup, `game.fireAge` reset only on successfully fired shots. Does not add a delay, input or extra attacks.
- Applies on all main automatic firing modes: one Water Dart, multishot, chain/bounce, and Water Wave.
- Adds pose *after* the normal WASD/mobile joystick walk and arm bob, so movement speed, direction, pathing and follow camera remain unchanged.
- Original player/actor construction is reused without modifying actor assets.

## Implementation

- `src/daisugi-hit-feedback.js`: rearward-only velocity.
- `src/daisugi-fire-motion.js`: pure pose timing and easing functions.
- `src/main.js`: gate both poses by `DAISUGI_MODE`, integrate only into existing `basicAttack`, `updatePlayer` and `updateEnemies`.
- `tests/daisugi-hit-feedback.test.js` and `tests/daisugi-fire-motion.test.js`: 12 tests including off-angle impacts, sideways momentum rejection, cap, first-shot windup, release/recovery, absence of target, and unchanged gameplay invariants.

**Verification:** source syntax and 12 pure/mocked tests passed in isolated execution. Full real Android/WebGL visual validation has not been completed yet.
