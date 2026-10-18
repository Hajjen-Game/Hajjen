# Wildpath — Willowglow Low-Poly Color Study / Production Fit 1.0

**Test:** https://hajjen-game.github.io/Hajjen/wildpath/?willowglow=1&rev=tree-lowpoly1

Start **BEGIN JOURNEY**. One real 3D Willowglow stands just right of the starting hero (x=5.25, z=5.8), using the ACTUAL orthographic top-down game camera.

## Art experiment

- **LOW-POLY (default):** fresh geometry, not just recolored V11 leaves. Nine broadly matching Willowglow crown lobes, ~180 sculpted angular seven-sided leaf clumps, flat-shaded crown facets, and simple faceted trunk/branches. One foliage batch + one wood batch; roughly 5,300 triangles rather than V11's ~80,000 leaf triangles. Warm dark recesses and exposed top planes provide silhouette contrast from overhead.
- **V11:** the prior detailed original / Tree Readability 1.0 material contrast, loaded only on demand for genuine in-game A/B.
- **Crown palette:** default **Mixed** colors several lobe groups using the game's six official Nature Rebirth palettes (rose, lilac, amber, mint, aqua, cream). Select any individual palette to test a coherent tree in that species' colors; these exact colors come from src/nature-variety.js, not independent duplicate approximations.
- **Scale buttons:** S 1.056, M 1.32 (default), L 1.584. Scale/painted shadow update without constructing extra tree geometry.
- **Optional direct original view:** append &tree=original to the test URL. The V11 Tree Study source is unchanged.

## Safety / performance

This is a strictly opt-in decorative review via ?willowglow=1 in the open-world version. ?world=classic and the regular /wildpath/ ignore it. Only ONE active tree hierarchy exists at a time: switching visual styles disposes the former meshes, materials and textures. Scale switches reuse that tree; palette switches rebuild only the small low-poly tree. The painted ground-contact shadow is shared. No new ShadowGenerator, physics, collision, targeting, nature growth, fusion, rewards, camera or movement changes. No permanent substitution of production trees yet.

## Acceptance & tests

Browser smoke on mobile portrait Chromium checks the scene with actual gameplay, S/M/L, all seven color modes, model switch V11 → Low-poly, exact model identity/mesh counts, and screenshot artifacts for A/B plus selected palettes. Node unit tests preserve palette identity and protect the unmodified original V11 / production world. Evaluate on actual mobile hardware for frame rate, foliage silhouette, visual contrast and character occlusion before deciding whether to replace any ordinary production trees.

**A/B goal:** decide whether a simpler stylized family of trunks/crowns better fits Wildpath's existing low-poly, gently glowing multicolor forest than V11's detailed individual leaf blades.
