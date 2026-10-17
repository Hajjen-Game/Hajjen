# Pass 10: Visual Foundation — decision record

User evaluation after Pass 9: core gameplay/world-generation concept is promising, but the asset quality, color palette, lighting and shadows are still far from the target reference **Garden Galaxy**. Garden Galaxy is a visual-quality benchmark, not a blueprint for game mechanics or layout.

Decision: **Do not perform incremental sphere/blob upgrades to existing Wildpath nature.** Instead, prove a radically different asset-driven art pipeline using authored, textured glTF meshes, deliberate scene composition, artistically consistent lighting/materials and mobile frame-rate constraints.

Deliverable phase 10.1: separate `/wildpath/visual-foundation/` proof-of-concept with Quaternius CC0 textured models, a composed grove, distinct shallow ponds, soft PBR-compatible lighting and shadows, mobile + desktop camera controls and a day/golden-hour A/B toggle. The production game and its Living Water/Nature Fusion systems are intentionally untouched.

The preview uses commit-pinned third-party raw GLB URLs temporarily. Before shipping: vendor verified selected assets into the repo, eliminate third-party runtime model dependency, performance-profile Android GPU, evaluate foliage opacity, and replace any placeholder flowers/rocks/water that fail the reference-level art bar.

Do not claim Garden Galaxy-level visual parity until the user has evaluated the rendered scene, especially on mobile. After acceptance, plan renderer adaptation from the current open-world NatureGrowth so authored meshes can grow, fuse and become persistent scenery without harming gameplay readability.
