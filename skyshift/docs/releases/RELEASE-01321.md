# SKYSHIFT 0.13.2.1 — First Playable Stingray HERO Mesh Preview

## Why this patch exists
The first 0.13.2 release included only a Blender authoring/export pipeline. It did **not** ship its actual GLB asset, so the user correctly saw no difference from the existing code-built ship in gameplay or Hangar.

This patch ships **a real self-contained 3D glTF asset** that can be displayed in Three.js. It is an early sculpted / Blender-ready visual preview, **not yet an export built by Blender** and **not approved final hero art**. It is intended to unblock the side-by-side visual evaluation now. The existing Blender 4.x generator and GitHub Actions GLB build remain the future source-of-truth pipeline; when the real exported binary arrives, the runtime prefers it over this preview.

## Concrete visual difference (relative to old Stingray)
- Wingspan from approximately ±3.2 m to **±3.75 m**; a stronger swept manta/rocka outline with longer tips and distinctly wider trailing edges
- More pronounced centre spine, deeper low-profile smoked canopy, ice-blue cockpit trim
- Two recessed metallic engine housings still exactly on the real existing **±1.99 m engine sockets**; original VFX, white-core zone waves and boosts preserved
- Two violet leading-edge strips, subtle ice-blue wing inlays, engineered dark graphite vents and raised fins — actual authored geometry, not an extra postprocessing filter
- Nine separate tapered tail plates matching the existing 9-spring tail animation: 0.63 m usable local length within the original 0.68 m joint spacing; original animated guide strips still visible
- Eight PBR/emissive materials, **34 mesh batches and 1,360 triangles**, no maps/textures, lights, shadow casters, collisions or physics changes; **165,925 bytes** of self-contained glTF text (~106 KB binary data)

## How to see it
Use the **HERO Preview** link, NOT the ordinary baseline:
https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.2.1&shipArt=hero

Select STINGRAY EVO in Hangar (unlock not required for preview). A successful load changes the Hangar description to **NY HERO-MODELL · 9-DELAD RÖRLIG SVANS**.

The same asset applies to races where Stingray EVO is equipped, without changing any ship physics or default GRIP responsiveness. Default no-flag URL retains the stable procedural craft on purpose; the user should approve silhouette and mobile FPS first.

When `shipArt=hero` is active, the loader first attempts `assets/ships/stingray-evo-hero-v1.glb` (the unconfirmed GitHub Actions Blender binary). If unavailable, it fetches `assets/ships/stingray-evo-hero-v1.gltf`, a real self-contained glTF 2.0 file present and verified in GitHub. If both fail, it transparently restores the original craft. New local telemetry `shipArt.assetFormat` reports `gltf` or `glb`, avoiding confusion about what was actually rendered.

## Verification
- Four new tests directly inspect the checked-in preview file (binary buffer length, scene socket names, explicit ±3.75 m wing geometry, cockpit y >0.72 m, two aligned engines, nine joint-local tail plates, 8 materials and ≤34 mesh batches).
- Five original menu/Ghost tests now pass against the active 0.13.2.1 entrypoint.
- Browser smoke now checks **actual external mesh loading in Hangar**, not skips when a real glTF preview exists. Full automated Chrome/WebGL test and A51 FPS/appearance remain unverified until CI/game playtest.

## What next
Compare Hangar at mobile screen size against the supplied premium concept. The asset is the first actually-visible step, not a claim of final quality. Next Blender art pass should improve curved wing fairings, deeper panel cutouts, smooth canopy glazing, nacelle realism, and richer mechanical tail articulation **without losing the original nine-joint controller**.

See screenshot before/after, then adjust and only promote Hero to default after user approves it.
