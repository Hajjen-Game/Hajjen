# SKYSHIFT 0.13.3 — Stingray Hero Mesh 2.0: True 3D Sculpt & Presentation

## Objective / response to real A51 screenshots
The 0.13.2.1 glTF asset was visible, but the Samsung Hangar/gameplay captures show why the provided concept is not yet matched: almost-constant-thickness slab wings, insufficient canopy definition, simple cylindrical nacelles, a skinny mechanical chain tail, and a small/dark Hangar presentation. More bloom, decorative lines or scenery are **not** a suitable replacement for 3D craftsmanship.

0.13.3 therefore delivers a **new external self-contained 3D sculpt**, not a texture-only change, and upgrades the Hangar camera/lights separately from the gameplay camera.

## Shipped / files
- `assets/ships/stingray-evo-hero-v2.gltf` — actual runtime self-contained glTF 2.0 file, versioned separately from v1 and source reproducible.
- `blender/stingray-hero-v2-source-v0133.mjs` — deterministic off-line source of the authored sculpt. Outputs the checked-in asset exactly, including indexed topology, normals, materials and embedded binary vertex buffer. It can be imported into Blender.
- `blender/convert_stingray_hero_v2.py` — actual **Blender bpy** import/smooth/save/export pipeline to an editable `.blend` and binary `.glb`. An accompanying GitHub Action can build/validate/commit the converted output. This is a separate source/preview path; successful Blender execution is not presumed unless CI confirms.
- `ship-art-pipeline-v0133.mjs` — checked named mesh/socket contract and **default HERO for Stingray only**, preserving `?shipArt=classic` to restore the old code-generated craft.
- `ship-hero-loader-v0133.mjs` — direct checked-in V2 glTF fetch, no useless 404 probe for the absent GLB; optional `?shipArt=blender` for a real Blender-generated V2 binary once available; safe procedural fallback on any failure.
- `hangar-hero-v0133.mjs` — genuine ship-local three-quarter camera, only two lights during Hangar (one sculptural key, one lavender rim), no racing camera/physics changes.
- `game-v0133.mjs`, `boot-v0133.js`, `index.html` — active release without altering Ghost, gameplay modes, GRIP, boost, 120Hz physics, or main-menu structure.

## Observable mesh evolution: V1 → V2

| Feature | V1 0.13.2.1 | V2 0.13.3 |
|---|---|---|
| Wing top | Thin, nearly flat polygon extrusion | 17 span stations × 11 chord stations, multi-level cambered 3D shell, thickness that tapers toward the tips |
| Hull | Basic long elliptical hull | Multi-section aerodynamic dorsal chine / sculpted main spine |
| Cockpit | Dim small bubble | Clearly raised dark-smoked-glass dome with 3D volume and slim ice-blue framing |
| Engine pods | Cylinders beside the body | Multi-diameter/height integrated aerodynamic nacelle housings with inset violet propulsion lenses |
| Tail | 9 thin rectangular armor plates | 9 genuine multi-section shield-like plates with an upper ridge and tapered armoured edges; mounted to the **unchanged** original nine animated joints |
| Material readability | Very metallic, dark without IBL | Brighter light-responsive PBR, lower metalness, restrained self-emission, contrast between satin wing, cockpit, graphite recesses and silver-blue joints |
| Hungar (Hangar) | Distant diagonal side view with flat ambient lighting | Closer consistent rear three-quarter, FOV 61.5°, sculpt-only key and rim lights, real race track still behind |
| Meshes / draw batches | 34 | **34** |
| Triangles | 1,360 | **3,356** |
| Unique materials | 8 | **9** |
| GLTF text incl. base64 | 165,925 B | **116,686 B** |
| Embedded binary geometry | approx. 106 KB | **69,384 B** |
| Embedded texture images, new racing lights, colliders, skins | 0 | **0** |

The model has approximately 2.5× V1 triangles, but the **same 34 draw batches**, and a smaller deployed glTF. This is a geometry/presentation quality change, not an assertion of guaranteed A51 FPS improvement. Current 0.11.4 optimized Fidelity on low-memory devices remains intact.

### Original Stingray mechanics kept
- Original `stingray-evo-v0104.mjs` 9-link damped mechanical tail springs still drive the nine joint pivots. A straight line still produces subtle motion.
- Original 2 engine sockets at X = ±1.99m, boost plumes, live wing flaps, white-core zone waves and real rail scraping remain.
- No added physical steering; physics still runs `stepFlight()` at 120Hz, no extra collision/camera authority.
- New Hangar key and rim lights set `visible=false` outside Stingray Hangar, with no extra renders or shadows, and no new scene decoration.

## Controls and comparison
- Default live release: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.3
- Compare prior **V1**: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.2.1&shipArt=hero (Note: GitHub Pages' current index may load the newest version despite a `v` cache query; use checked-in historical entrypoint/assets or code screenshot if A/B must be exact.)
- Restore old code-built Stingray in current V2: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.3&shipArt=classic
- Experimental Blender V2 export, when real GLB is published: `?v=0.13.3&shipArt=blender`. A missing GLB falls back rather than breaking gameplay.
- Select **STINGRAY EVO** in Hangar; there are no extra main-menu toggles.

## Acceptance gates
1. New aircraft must look **substantially different** at the actual mobile 1536×690 and desktop screenshot framing: thicker sculpted wing shoulders, readable cockpit and more integrated engines. The result must be evaluated against the user's image concept and previous A51 screenshots, not by examining code alone.
2. Hangar's framed three-quarter profile must display clear canopy, two nacelles and tapered tail; object to the **right of the ship selection panel**, original track visible.
3. Motion: pilot GRIP/left-right, neutral tail sway, boosted twins, reactive flaps, wall, corkscrew and camera unchanged. No old-model armor plate visually clipping through new tail panels.
4. Performance: on Samsung A51 compare a full race and Hangar capture against 0.13.2.1 with similar warm-up, quality/Fidelity and the same selected ship. Record FPS mean, frame P95/P99, render CPU/GPU if available, plus draw calls/triangles and screenshots. Keep automated resolution and normal shader profile unchanged.
5. CI: 8 fresh real-asset tests, previous Ghost/GRIP/menu/rail tests and real Chrome/WebGL Hangar smoke configured. Do **not** claim headless Chrome or real Blender export passed until a workflow result is actually verified.

## Remaining work / honest status
The externally-loadable **glTF 3D sculpt is built and committed**. The editable **Blender .blend / binary .glb** creation is defined in a real bpy job but the job's successful output and publication are not yet verified. The artwork still needs real in-game screenshot approval; only then refine panel bevels and adjust proportions further. This is a substantive starting point but **not yet an approved final model matching the original illustration**.
