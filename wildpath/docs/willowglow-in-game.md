# Willowglow 11.0 — Preview inside playable Wildpath

**Test link:** https://hajjen-game.github.io/Hajjen/wildpath/?willowglow=1&rev=tree-preview1

Tap **BEGIN JOURNEY**. A single Willowglow is positioned just ahead and to the right of the hero at world x=5.25/z=5.8 (scale 0.66). View it while walking and fighting with the **real unchanged orthographic Wildpath camera**, HUD and other forest scenery.

The regular `/wildpath/` is unaffected: Willowglow is strictly opt-in through `?willowglow=1`, and does not activate in the classic road mode. No permanent nature-fusion/growth modification or camera switch. Only one static tree is added, with three materials/leaf batches and a cheap painted ground contact shadow; no extra real-time ShadowGenerator or collisions. The model is directly imported from the existing Tree Study 11.0 file rather than copied. No paid assets.

**Comparison:** https://hajjen-game.github.io/Hajjen/wildpath/tree-study/?rev=21

Unit tests verify opt-in, scale/placement, disabled collisions and unchanged camera; browser smoke verifies the 3D tree loads in a real mobile portrait session, starts gameplay, and saves an in-game screenshot artifact. Real mobile performance should be reviewed before converting hundreds of production trees.
