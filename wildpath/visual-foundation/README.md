# Pass 10 — Wildpath Visual Foundation (A/B experiment)

This is an **isolated art-direction experiment**, not a replacement for the playable Wildpath game. Open `/wildpath/visual-foundation/`; the existing game remains unchanged at `/wildpath/`.

## Purpose
Test whether authored, textured 3D foliage + warm art-directed lighting + coherent materials can achieve a materially better visual standard than the current procedural blob/sphere nature. Keep the **open Wildpath layout**, elevated camera and browser/mobile constraints, rather than copying Garden Galaxy's grid or mechanics.

## Model provenance and limitations
- **Quaternius Stylized Nature MegaKit — CC0 1.0**: https://quaternius.com/packs/stylizednaturemegakit.html
- A small subset of the textured meshes (`tree1.glb`, `tree2.glb`, `tree3.glb`, `bush.glb`) is served from the public `anshaneja5/skyline-run` repository, which converted/optimized those assets; original provenance: https://github.com/anshaneja5/skyline-run/blob/main/CREDITS.md
- **Important**: Models are temporarily fetched cross-origin from a **commit-pinned** public URL. If network/CDN access fails, the preview reports that it could not load the models instead of silently presenting procedural trees as a replacement. For production, bundle a licensed, optimized subset within this repository.
- Current ground/pond/flowers/rocks are scene-design placeholders; **the trees and bushes are real textured GLB assets**. Full level of Garden Galaxy is not yet claimed.
- Babylon.js renderer + Babylon glTF loaders via CDN (network required). No commercial Garden Galaxy assets were copied.

## Review criteria
1. Foliage silhouette quality & variation: convincing from Wildpath's elevated camera?
2. Material and palette unity, warm/cool variants.
3. Contact shadows and soft key light on mobile.
4. Frame rate and readability at mobile resolution.
5. What custom assets still need to be authored or purchased before a full visual rework?

## Controls
WASD/arrows to move, drag to rotate view, scroll to zoom; on mobile use the touch joystick. Buttons change day/golden hour, elevated/diagonal viewpoint, and soft shadows. No combat or progress is modified in this experiment.
