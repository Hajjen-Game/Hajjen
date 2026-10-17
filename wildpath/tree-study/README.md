# Wildpath – Tree Study 8.0: Leaf Layering & Richer Shading (Pass 18)

**Live viewer:** https://hajjen-game.github.io/Hajjen/wildpath/tree-study/?rev=18

After the user reviewed Willowglow 7.0 as our first promising step toward the approved lush fantasy-tree target image, 8.0 focuses on finishing the *same silhouette*, rather than redefining it. The approved image is a quality target for clearly layered actual leaves, shadows and colors; 8.0 is still a prototype.

## What changed
- Retains the **nine non-rendered artist-designed crowns**, bent trunk, six primary boughs, roots and camera arrangement from 7.0.
- Uses **three separate actual leaf meshes**: dark recessed foliage at about 58% of envelope radius; richly green middle leaves at 80%; and exposed leaves near 96%. Foliage is still actual sculpted tapered 3D blade geometry with distinct raised midribs.
- Uses painterly vertex colors for green-to-dark shade pockets, restrained warm highlights on upper/exposed leaves, scattered darker leaves at crown boundaries, and controlled leaf-tip curl. Less uniform mint, less fluffy tessellation.
- Selected side lobes droop slightly, with more asymmetric edges **without changing the core silhouette**. One subtle secondary leaf every nine exposed samples fills visual gaps without creating the old rosette/fern artifacts.
- Darker warmer bark, fewer blossom decorations (10), and a three-draw-call foliage solution designed to remain reasonable on older phones.
- **Mobile review layout** has individual small buttons without the giant background bar. Default title displays **PASS 18**. Silhouette, warm/soft light, shadows, info and orbit camera are preserved.
- All older tree-model files, including 7.0, are preserved. Neither the main Wildpath game nor paid/AI-generated assets are involved.

## A/B links
- 8.0: `?rev=18` (default)
- 7.0: `?tree=v7&rev=18`
- 4.0: `?tree=v4&rev=18`
- Other versions 1–6 remain accessible by `?tree=vN&rev=18`

## Checks completed
- Read/write GitHub access verified.
- JS parsing and version/reference checks.
- Standalone geometry smoke test: **nine crowns, 4,005 curved leaves and 80,100 foliage triangles**, every vertex finite, valid triangle indices. Three batches plus small flower geometry.
- **Not yet verified**: the real Babylon rendering and FPS on the user's Samsung Galaxy A51, including scene publication/cache. Compare with 7.0 screenshots from side, overhead and an elevated game camera, with silhouette switch enabled and disabled.

Accept 8.0 only after visually checking whether the leaves have clearer layers, believable dark recesses, and richer green color **without losing 7.0's successful rounded contour**.
