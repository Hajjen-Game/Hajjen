# SKYSHIFT 0.13.2 — Blender Ship Pipeline & Stingray Hero Mesh Plan

## Why this work exists
Stingray EVO's gameplay animations are already valuable: nine physically visible, underdamped tail joints, continuous movement on straights, steering and GRIP follow-through, wing flaps, two reactive engines, hangar motion, ray-like design. The *shape* remains code-generated (flat scalloped wings, tubular canopy and engine primitives), so more polishing of shader settings cannot achieve the design-reference silhouette.

**Source art direction**: the supplied “SKYSHIFT / Racing Ship Concept — Stingray EVO” illustration. It shows an immediately readable wide manta outline, clean forward teardrop cockpit, integrated pair of purple-ion engines, intentional hard-surface wing cutouts, thin lavender edges and ice-blue blade markings, with a long tapered nine-link mechanical tail.

## Architecture decided and implemented
```text
Artist source                        Build/validation                    Runtime
skyshift/blender/                  Blender 4.x bpy                  Three.js
  build_stingray_hero.py ────────> glTF 2.0 GLB ───────────────────> GLTFLoader
                                 validate_hero_glb.py               ?shipArt=hero
                                       │                                  │
                                       └── fixed named socket map ────────┤
                                                                           ▼
    0.10.4 existing 9-joint tail springs, v0.10.8 flaps, engine VFX ◄── visual mesh swap
    Original 120Hz physics, steering, collision, cockpit pose, GRIP all unchanged
```

Files:
- `blender/build_stingray_hero.py`: a repeatable Blender **bpy** hard-surface model generator, no internet/third-party assets; directly exports a GLB and optionally a fully editable `.blend` source.
- `blender/validate_hero_glb.py`: standard-library-only, hard reject if required named parts, mobile budgets or the zero-physics contract are violated.
- `ship-art-pipeline-v0132.mjs`: exact node naming, geometry/material audit and pure visual transplant into the existing living Stingray tail joints.
- `ship-hero-loader-v0132.mjs`: optional GLTFLoader asynchronous acquisition with exact asset-size and content checks, race/preview cancellation and guaranteed procedural fallback.
- `game-v0132.mjs`: connects the hero asset when Stingray is equipped or shown in Hangar, but only with the explicitly opt-in `?shipArt=hero` flag. Game default is the original unchanged ship to prevent surprising quality/performance regressions.

### Model art dimensions
Author coordinates in metres (Three.js): +Y up, nose = −Z, rear tail = +Z, wings on ±X; Blender generator's `vec(x,y,z)` converts to Blender +Z up and exporter converts to glTF +Y up. Deliberate wing silhouette approx **6.6 m wide**, central nose at Z≈−2.78 m and two venturi engine housings near **X=±1.99 m** (the **existing unchanged gameplay engine sockets**). Tail joint plate geometry is **local** to the original nine pivots and segment length **0.68 m**; the game rig continues to animate the scene, not a competing Blender armature.

### Model composition
- **Hull**: tapered pearlescent metal center spine with purposeful facet breaks.
- **Wings**: wide swept mirrored scalloped manta blades, sculpted rather than 2D planes, metal PBR.
- **Canopy**: one low smoked-glass integrated teardrop with thin ice-blue highlight.
- **Engines**: two rear-integrated brushed-metal nacelles, restrained violet ion lens and no extra dynamic light sources.
- **Lines**: two fine lavender edge glows and short cyan markings, no screenspace VFX or textures required.
- **Tail**: nine tapered plate meshes, one attachment per animated parent joint, no skinning/vertex skin cost. Existing violet dorsal neon strips and dynamic tail spring persist.
- **Wings flaps**: v0.10.8 active hinge logic retained; future authored wing panels may replace their cosmetic geometry independently.

### Performance gate (hard limits)
| Budget | Maximum |
|---|---:|
| Hero GLB bytes | **700 KB** |
| Hero triangle count | **8,000** |
| Hero mesh draw batches | **34** |
| Materials | **9** |
| Bitmap textures | **0** in V1 |
| New lights, shadow casters, physics colliders | **0** |
| Blender-driven animation systems / skeletons | **0** |
| Tail joints controlled by current runtime | **9** |

This is an authoring budget, not an assertion that current procedural Stingray already costs zero. When preview GLB loads, old body and 0.10.3 polish meshes are hidden, nine old armor plates are hidden (but old neon and physics stay), and new body and tail plates are shown. No guaranteed FPS gains until device measurements.

### Build
Requires Blender 4.0+ and Python 3 for the validator.

```bash
blender --background --factory-startup \
  --python skyshift/blender/build_stingray_hero.py -- \
  --out skyshift/assets/ships/stingray-evo-hero-v1.glb \
  --save-blend /tmp/stingray-evo-hero-v1.blend

python3 skyshift/blender/validate_hero_glb.py \
  skyshift/assets/ships/stingray-evo-hero-v1.glb
```

A dedicated GitHub Actions build workflow runs these same steps and, if GitHub Actions is permitted to push commits, publishes the `.glb` in `skyshift/assets/ships/`. Both `.glb` and `.blend` are attached to the build artifact, letting an artist refine the source in Blender instead of being tied to a procedural runtime forever.

### Preview / fallback
- **Unchanged baseline**: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.2
- **Blender hero opt-in**: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.2&shipArt=hero
- Open Hangar and select Stingray EVO (preview is available even before the ship is unlocked). When file is available and validated, body art is swapped without restarting or resetting the 9-link motion rig. No extra toggles are added to main menu.
- If the GLB is missing, oversized, unsupported or the ship selection changes during loading, the **old stable procedural Stingray is retained**. Check `__skyshiftFleetProbe().shipArt` for `active` vs `fallback` if developer mode is enabled.

## Visual approval gates
Before promoting `shipArt=hero` to the default:
1. Hangar side-by-side with supplied illustration: *wing sweep*, canopy integration, two recessed engines, black vent channels, fine neon boundaries and gradual long tail taper. All should read clearly at the actual mobile gameplay camera distance, not only a Blender close-up.
2. 9-joint tail response: neutral straight flight still lively, steering follows correct input, GRIP ripples, tail returns smoothly, no disconnects or flipped segments.
3. Camera-visible cockpit/hull & wing flap compatibility across straight, GRIP, boost, jump, 70° magnetic wall, tunnel and corkscrew.
4. A51 4GB ON+OFF Fidelity runs with 120Hz physics, three laps, fixed-preset A/B FPS, P95 frame and draw-call metrics. Avoid increasing latency with more lights or unnecessary material batches.
5. Art director approval from screenshots and actual hands-on. Only then change `defaultMode` or the loader policy.

## Honest completion state
This release supplies **a complete authoring/export script and runtime integration under an opt-in flag**. It is not yet proof that the model matches the concept exactly. The CI Blender build, rendered appearance and device performance need verification; missing GLB intentionally falls back instead of blocking gameplay.

## Next iteration after approval
A dedicated **Stingray Hero Mesh 1.1** sculpt/polish pass in Blender should refine faceted wing bevels, cockpit glass highlights, engine inlet layering and tail plate linkage/microdetails based on side-by-side screenshots. It should preserve the GLB socket names, bounding budget and 9-link original rig.
