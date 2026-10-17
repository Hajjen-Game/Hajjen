# Wildpath Tree Study 10.0 — Trunk Character & Branch Weight (Pass 20)

**Public preview:** https://hajjen-game.github.io/Hajjen/wildpath/tree-study/?rev=20

**Compare against unchanged 9.0:** https://hajjen-game.github.io/Hajjen/wildpath/tree-study/?tree=v9&rev=20

The user wanted to work on the trunk while keeping the improved-but-not-finished 9.0 canopy as a separate, unchanged baseline. This pass strictly changes the *wood*, not the leaves.

## Design
- New `tree-model-v10.js`, preserves 9.0's nine authored non-rendered crown guides and the entire curved-leaf geometry algorithm/color distribution.
- New sculpted wood geometry, not a generic smooth tube: cross-sectional ring mesh with shallow longitudinal ridges and asymmetry, vertex-tinted lit/shaded contours, softly animated-looking static curve without movement.
- **Broader root collar:** a grounded base flare feeding into a tapering, gently curved shaft. Four short partially embedded buttress roots replace four long claw-like projections.
- **Six load-bearing branches:** different thicknesses and curvatures; wider blending near the fork, narrower natural outer tips. Four subtly bent twigs complement them.
- Darker neutral umber bark instead of red-orange, with restrained procedural painted lines and knots. All original leaf layers, geometry and dark crown inter-lobe shading remain.
- Reuses the compact mobile camera/light controls, silhouette toggle, ground-stage geometry and shadows.
- All variants v1–v9 remain selectable; v10 is the default only for the tree-study experiment. Production Wildpath remains untouched.

## Technical acceptance
Tree construction must yield 6 primary boughs, 4 small buttress roots, 4 secondary twigs, and 1 trunk. Real Babylon Mesh/VertexData geometry with finite vertices, legal face indices, smooth normals. Leaf and crown sections must stay text-identical to 9.0 aside from the displayed version of leaf batch names.

Publish in **one atomic commit** to prevent concurrent GitHub Pages runs cancelling one another; verify Actions unit/browser checks and Pages deployment. Real Galaxy A51 frame-rate, bark shading and overall appearance still require mobile screenshots before accepting art direction. No paid assets.
