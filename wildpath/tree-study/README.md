# Wildpath – Tree Study 5.0 (Pass 15)

**Preview:** https://hajjen-game.github.io/Hajjen/wildpath/tree-study/

Tree Study 5.0 continues the user-approved hand-crafted fantasy tree goal: separately readable, rounded leaf bouquets made entirely from actual overlapping leaves, with deep inner green and bright warm leaf tips. This remains a free **isolated art test**. No production Wildpath combat, terrain or progression files are changed.

## Differences from 4.0
- Reduce the visual merger of ten foliage clouds to **nine named, staggered bouquets** with subtle visible breaks between them. Six curved primary limbs/trunk are kept from the successful Tree Study 2.0 foundation.
- Separate every bouquet into genuinely shaded inner leaf fans and lighter exterior fans. Two batched leaf meshes keep draw calls low while creating more readable layered depth. No 3.0 solid green canopy shells and no imported meshes.
- Distribute patches consistently using the golden angle rather than randomly oriented sprays. Leaf tips point in coherent directions within each patch.
- Maintain almost exactly 4.0's leaf budget (~2.8k leaves), avoiding the "just add leaves" problem.
- Preserve clean broad neutral translucent canopy shadow and contact shade. **Turning shadows off now also disables the shadow overlays**.
- Mobile-first **focus view** hides the large information card by default. The Info button restores it; a small floating 4.0 comparison link stays visible.

## Comparison
- **5.0 default** – `/wildpath/tree-study/`
- **4.0** – `/wildpath/tree-study/?tree=v4`
- **3.0** – `/wildpath/tree-study/?tree=v3`
- **2.0** – `/wildpath/tree-study/?tree=v2`
- **1.0** – `/wildpath/tree-study/?tree=v1`

## Acceptance criteria
Judge primarily from *side*, *front* and *elevated Wildpath camera* on Android. Each bouquet should retain its visual identity rather than merge into a generic spiky cloud; dark gaps should create depth without making foliage muddy. Inspect leaf-patch direction and compare FPS against 4.0. Code and static verification do **not** prove aesthetic parity with the approved reference. User screenshots remain the acceptance gate.

No paywalled assets, third-party 3D generation plugins or original game changes.
