# Wildpath — Pass 12: Tree Study 2.0

**Live comparison:** `/wildpath/tree-study/` (v2.0) and `/wildpath/tree-study/?tree=v1` (archived v1 geometry). The page includes an A/B link. The game at `/wildpath/` is untouched.

## What changed
- Retains the distinctive arched trunk, roots, sculpted leaf mesh and flowering accents praised in Tree Study 1.0.
- Replaces the 15 visible spoke-like canopy tubes with **6 continuous, gracefully tapering main boughs**, plus four short concealed twigs.
- Reorganizes foliage into 13 overlapping clusters totaling **1,373 individually shaped leaves** (1.0 had 1,049). Leaves are modestly wider and more horizontally layered to reduce the see-through effect and the spiky silhouette in low camera angles.
- Improves leaf-color depth (deeper forest-greens and warm light edges), introduces intra-canopy shadow receiving, gently increases bark brushstroke detail, and retunes key/fill/ambient lighting to avoid washed-out cream-green tones.
- Preserves the original code at `tree-model-v1.js`; the viewer loads it with `?tree=v1`. Comparison takes place under the same new lighting, so the A/B mainly isolates changes to geometry and foliage.

## Evaluation criteria
Compare screenshots in close and elevated view and record FPS on Android. If the new tree looks fuller and clearer from both positions without feeling like a green blob, continue to build an asset library. If not, revise the 3D-art production method before making a larger world.

No paid or third-party foliage, and no changes to combat or the existing Wildpath world. Code and imports are checked; a real Android render must still be reviewed by the user.
