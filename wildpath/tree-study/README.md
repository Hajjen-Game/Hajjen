# Wildpath — Tree Study 6.0 (Pass 16)

**Preview:** https://hajjen-game.github.io/Hajjen/wildpath/tree-study/

## Why a new approach
After reviewing 5.0 on a Galaxy A51, the art direction was not yet at the approved reference. The main problems were radial "flower rosettes", repeated identical foliage, pale minty color and too many separated canopy chunks. This pass **does not simply add more leaves** and does not use the earlier 3.0 smooth canopy blobs.

## What was implemented
- Model `tree-model-v6.js` derives from 5.0; 5.0 and earlier versions are preserved.
- **Nine asymmetric, interlocking crowns**, each with individually designed spread, vertical hang, and sweeping direction.
- **Leaves attach along the lengths of bending twig-like growth axes in alternating, unequal pairs**, rather than a radial 360° center. Pendant leaves droop softly at branch tips.
- Distinct shaded forest-green leaves on the interior and richer olive/sunlit greens on exposed layers, assembled into two vertex-colored meshes for efficient rendering.
- Fewer (14) blossom motifs so leaf form remains the focus. Original curved trunk, six primary branches, textured bark and roots retained.
- Real-time trunk/branch shadows and a soft neutral canopy/contact shadow; shadows toggle also disables the soft overlay.
- Mobile review remains distraction-free with optional info card, orbiting camera and warm/soft lighting controls.

## A/B comparisons
- New 6.0: `/wildpath/tree-study/`
- 5.0: `/wildpath/tree-study/?tree=v5`
- 4.0: `/wildpath/tree-study/?tree=v4`
- 3.0: `/wildpath/tree-study/?tree=v3`
- 2.0: `/wildpath/tree-study/?tree=v2`
- 1.0: `/wildpath/tree-study/?tree=v1`

## Acceptance criteria
Review on Android from Wildpath camera, straight-on side and overhead: reduced star/rosette appearance, visibly varied foliage silhouette, organic drooping and no flat plastic blobs. Monitor real FPS, compare with 5.0 and determine whether the user-approved reference now feels closer.

**Limitations:** Static code validation alone does not prove visual improvement or mobile FPS; do not claim this level is reached without screenshots/user evaluation. No production Wildpath files modified and no paid assets used.
