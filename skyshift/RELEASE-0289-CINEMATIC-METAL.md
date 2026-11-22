# SKYSHIFT 0.28.9 — Cinematic Metal & Neon Reflection Rebalance

## Design target
The user reference is dark, premium high-contrast titanium with continuous cyan/orange luminaires and long reflection streaks across brushed metal and racing road, not a uniformly gray aluminum tunnel. 0.28.8 was correct but visually too subtle.

## Actual original source path
1. Graphite substrate contrast: works in existing 0.25.0/0.26.2 material chain, refining original m25Final using lamp, cavity, bevel and wall/roof masks. Darker unlit panels and clear local highlights.
2. Physical metal GGX: on the same Skyline MeshPhysicalMaterial panels/ribs, deepen base color and strengthen EXISTING 0.26.1 finite cyan/amber RE_Direct taps. Preserve 0.26.5 source masks and 0.28.6 anti-glitter roof roughness. Mobile is gentler.
3. Racing-road reflections: original 0.28.2 full-course indexed MeshStandardMaterial + 0.26.3 local emitter geometry. A stable track-aligned low frequency polish variation and physically source-masked cyan/amber specular provide longer streaks. No Reflector, water mesh, camera-driven paint or white source.
4. Genuine 0.28.4 PMREM capture occurs BEFORE any 0.28.9 uniform activates. Same-frame A/B therefore keeps a true 0.28.8 PMREM environment.
5. No new meshes, lights, textures, probes, local light samples, draw calls, render passes or physics/GRIP/boost/collider changes. Skyline and Aurora untouched.

## Safe comparison
Live: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9

Full 0.28.8 material look within current version: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9&cinematicMetal=classic

Individual component disable parameters:
- cinematicContrast=classic
- cinematicStrips=classic
- cinematicRoad=classic

Previous release: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.8

All original onBeforeCompile hooks and cache keys restore on dispose.

## Real WebGL screenshots
Browser driver: skyshift/browser-cinematic-metal-v0289.mjs. The QA flags cinematicMetalSmoke=1 and trackRepairSmoke=1 reveal same-camera proof. Render positions: High 110/1840/3230m and simulated 4GB 1840m; old Vault 0.28.8 and Skyline 0.26.5 checked for release isolation.

Images captured from real game canvas at identical time: before-0288, contrast-only, strips-only, road-only, after-0289. No generated art.

Acceptance includes:
- Visibly larger pixel change than 0.28.8, plus independently visible contrast and road effects.
- Original shader compilation succeeds on High and 4GB.
- No unexpected white ceiling spill or broad road overexposure.
- No physics/collider/GRIP changes.
- Static screenshots cannot prove absence of motion shimmer; manual playtesting remains required.

After successful CI and merge, Pages publishes verified images:
- https://hajjen-game.github.io/Hajjen/skyshift/previews/v0289-vault-0.28.9-High-1840-before-0288.png
- https://hajjen-game.github.io/Hajjen/skyshift/previews/v0289-vault-0.28.9-High-1840-after-0289.png

Do not treat those public images as ready until GitHub has successfully published them.
