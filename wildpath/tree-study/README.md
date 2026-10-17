# Wildpath — Tree Study 4.0 (Pass 14)

Preview: https://hajjen-game.github.io/Hajjen/wildpath/tree-study/

## User-approved art direction

The approved reference shows a handcrafted fantasy tree, with about 7–10 rounded leaf bouquets. Each bouquet is lush with abundant **individual overlapping 3D leaves**, distinctly dark core shadows and bright green sunlit tips. It does not resemble a stack of green pancake meshes (3.0) or a thin open cloud of stray leaves (2.0). The last image shared in the Wildpath conversation is a visual reference, not an imported 3D model.

### Implementation

- Rebuilt starting from the **2.0** model (curved bark, natural roots, six main branches); 2.0 and 3.0 source files remain unchanged.
- New `tree-model-v4.js` draws **10 asymmetrical leaf bouquets**. Bouquets comprise **191 radial sprays** of actual bent, midrib-lifted leaf geometry with layered darker inner and brighter outer pigments.
- Each spray is a separate hand-distributed arrangement around 3D branching directions, not a solid underlying sphere, mesh shell, or billboard; 280 extra outer-fringe leaves break up hard edges.
- The prototype produces about 2,800 curved leaves as one batched vertex-colored canopy mesh to control browser draw calls. Geometry density is deliberate but **mobile FPS must be confirmed**.
- Retains real trunk/branch shadows; uses soft neutral-tinted alpha-shadow beneath the canopy instead of sharp per-leaf ground artifacts.
- No external AI-generated assets, Meshy/Tripo dependencies, paid resources or other production-game changes.

### A/B review

- Default `/wildpath/tree-study/`: 4.0
- `?tree=v2`: 2.0 (comparison)
- `?tree=v3`: 3.0 (comparison)
- `?tree=v1`: 1.0 (historic)

### Acceptance criteria

Compare the detailed leaf clumps from the side and elevated Wildpath camera. A pass requires substantially better handmade foliage than 2.0 and 3.0; a visual target of the final user-approved concept; no visible sphere/flat-blob artifacts; and playable Android frame rate. Code checks are not substitutes for live mobile screenshot feedback.
