# Wildpath — Tree Readability 1.0

**Live test:** https://hajjen-game.github.io/Hajjen/wildpath/?willowglow=1&rev=tree-readability1

Tap **BEGIN JOURNEY** and compare S, M, L using the floating tree-size controls. One Willowglow 11.0 stands right of the starting player in the real playable open world (x=5.25, z=5.8). No change to camera, combat or the normal production scenery.

## Sizes, relative to the previous in-game preview
- **S:** 1.056 world scale, 1.6× the old tree (.66)
- **M:** 1.320 world scale, 2.0× old (default)
- **L:** 1.584 world scale, 2.4× old

Only **one** 3D mesh hierarchy (3,973 leaves) is constructed and rendered; pressing S/M/L rescales its root and the painted contact shadow. It does not build three expensive trees on older Samsung Galaxy A51 hardware. A few UI buttons show the active choice and its relative size even without debug mode.

**Readability:** In-game-only color/material contrast between V11's existing three foliage layers: darker forest interior, richer middle tier and lighter exposed leaves; no change to any original V11 geometry or Tree Study files.

The regular Wildpath URL is unchanged. `?world=classic` ignores preview. The tree stays decorative and non-collidable. Main camera remains orthographic top-down. No change to damage, enemies, abilities, nature fusion or other gameplay systems.

## QA
Node unit tests check exact S/M/L dimensions, opt-in flag and no production camera changes. GitHub Actions smoke starts a real portrait Chromium game session and clicks all three size buttons, verifies that the mesh count does not increase, checks the current size and creates three screenshot artifacts. Test game performance on the user's actual phone before replacing the rest of the foliage.
