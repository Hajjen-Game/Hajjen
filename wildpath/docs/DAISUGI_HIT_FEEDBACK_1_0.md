# Wildpath — Daisugi Hit Feedback 1.0

User reported that every water projectile hit looked like a distracting white explosion and preferred the enemy capsule to be visibly shoved on contact.

## Scope

**Daisugi `?daisugi=1` only.** The normal 2.x game retains its established impact VFX and enemy flash. No arena, camera, walk speed, nature, fusion, damage, enemy HP, scoring or projectile frequencies changed.

## Changes

- Filter the generic `Glint Dart` impact (`burst`, `reaction`, `damage`, `aftermath`) in the Daisugi spell-stage routing **before** sending it to Pixi/Babylon. Keeps the recognizable in-flight projectile, launch effect and impact sound, but skips the white crystal-bolt explosion.
- Stop bright white/yellow material flashes and generic per-enemy reaction/damage particles for Daisugi; keep the original enemy palette on impact. Existing big-area water visuals (chain links, water waves, unlockable frost splash) remain.
- Give water shots a *physical nudge* along their incoming direction using `applyDaisugiHitPush`. This is wired into normal Water Dart, bounce, secondary chain hits, wave hits, and light nearby frost-splash hits.
- The enemy briefly squashes, tilts, lifts, and recoils; impulse is clamped to prevent runaway shifts from multiple hits, and existing arena collision is respected.
- On killing blows, leave the already-dead and untargetable enemy visible for **0.16 seconds** to finish its tiny shove before disposal. Scores, pickups and Nature Rebirth happen at the normal time.

## Regression coverage

`tests/daisugi-hit-feedback.test.js` checks incoming direction, bounded impulse, overlapping projectile fallback, suppression of Daisugi-only white VFX, preservation of ordinary 2.x VFX, all four water attack paths and short death recoil. Syntax checks also passed.

## Test links

- **Daisugi**: https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1&rev=hit-recoil-1-0
- **Default / old 2.x**: https://hajjen-game.github.io/Hajjen/wildpath/

Visual approval on Android is still needed: confirm Water Dart impacts no longer create white bursts and enemies visibly lean/slide without becoming jittery when chain attacks multiply.
