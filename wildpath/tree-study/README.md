# Wildpath – Pass 11: Tree Study 1.0

**Standalone mobile-friendly art-quality benchmark** at \`/wildpath/tree-study/\`.
Play Wildpath proper at \`/wildpath/\` – nothing in the playable game is modified.

## Why this exists
The Pass 10 scene loaded fine, and its camera was a positive discovery, but the Quaternius model quality, pixelated foliage, muddy paths, water and harsh shadows did not approach the user's Garden Galaxy reference. The user does **not** want to pay for assets unless the pipeline first proves sufficient visual quality.

This experiment takes the opposite approach: **one bespoke 3D tree** rather than a whole world. The custom mesh has curved branch architecture, visible tapered trunk and roots, **separate curved leaf surfaces instead of spherical canopy blobs**, a very small number of blossoms, a quiet shaded glade, painterly ground pigment and art-directed warm/cool lighting. Its 3D geometry is generated locally via Babylon.js with no third-party tree models, texture purchases or remote assets. Babylon.js itself comes from its CDN.

## Controls
- Drag on the tree to orbit the camera; pinch/scroll to zoom.
- **Camera** switch: object close-up / higher Wildpath-like view.
- **Light** switch: warm afternoon / softer cooler illumination.
- **Shadows** switch: shadow evaluation on/off.

## Acceptance gate – visually judged by the user on their Android phone
- Strong **silhouette and leaf-level detail** from Wildpath's actual camera angle.
- Convincing curved bark and visible tree forks.
- Rich, calm colors with believable soft light and grounding.
- No lollipop sphere crowns and no noisy scenery.
- Responsive on mobile; record FPS in the UI.
- If the object still looks prototype-grade, stop expanding the art pipeline and reassess tools.

## Limitations
This is an **unvalidated first study**, not a claim to meet Garden Galaxy's art quality. It uses manually specified procedural mesh construction instead of an artist-painted Blender asset; if the result falls short, the next approach must change materially. Automatic browser runtime and mobile performance tests have not yet been run by this workflow.
