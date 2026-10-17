# Wildpath Tree Study 9.0 — Sharper Leaf Cards & Deeper Occlusion (Pass 19)

Live preview: https://hajjen-game.github.io/Hajjen/wildpath/tree-study/?rev=19

Tree Study 8.0 was closer to the user's lush layered fantasy tree reference, but the canopy was still too cushion-like and evenly illuminated. 9.0 refines the *same approved nine-lobe silhouette* with distinct leaves and shadow.

## Design changes
- Independent `tree-model-v9.js`, preserving v8 crown guide positions, six main branches and curved trunk.
- More readable pointed lanceolate leaf geometry with curled blades and raised midribs, rather than smooth pillow tiles.
- **Baked intersection occlusion** based on crown overlap; darker leaf undersides and recessed foliage. No real-time SSAO cost.
- Saturated forest greens, warmer sun-exposed highlights, sparse edge leaves to break up the canopy boundary.
- Richer bark pigment; calibrated soft broad canopy shadow on the ground.
- Existing compact mobile buttons, light, shadows and silhouette review stay.
- Prior versions are untouched. Compare v8 `?tree=v8&rev=19`, v7 `?tree=v7&rev=19`, or earlier v1–v6.

## Technical approach / acceptance
Procedural 3D leaves batched in three mesh layers, no asset purchase or external 3D models. Target Galaxy A51-class performance. Check leaf readability, inter-crown contrast, silhouette and FPS at close, side, 3/4 and overhead camera views. Static code checks do not substitute for actual mobile visual review.

All files for this pass are published with one atomic Git commit to avoid overlapping Pages deployments.
