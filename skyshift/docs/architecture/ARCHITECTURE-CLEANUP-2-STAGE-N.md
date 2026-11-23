# SKYSHIFT Architecture Cleanup 2.0 — Stage N: Stingray HERO art and presentation

**Base:** `03f2566aa4d3efaa7773db4cf4989353a6a79c29` (Stage M merged; post-merge historical QA, Pages guard and deployment green).

Move 16 root ship appearance modules under `skyshift/ships/`:
4 glTF art contracts, 5 optional/production HERO loaders, 5 Stingray scale/wing visual presentation versions and 2 Hangar showroom versions.

Only the 9 asset-dependent modules require the path-only normalization `./assets/ships/` → `../assets/ships/`. Their WebGL loaders resolve via `import.meta.url`, so this retains the EXACT same glTF/GLB URL. Other 7 source modules retain their original byte hashes. Their new paths and original Git blob SHA values are tracked in `ships/stageN-migration-manifest.json` and independently tested.

No changes to model assets, mesh contents, flight physics, camera, GRIP, tunnel renderer, shader/material lighting, track geometry or scoring. Root games, existing historical unit-test import paths, and CI syntax references must be rebased. Historical SHA audit assertions must remain byte-identical after reversing only the known Stage N path substitutions. Historical release documentation retains original path names for chronology.

**Merge only** after Stage N migration proof, historical SHA audit suite, all required PR checks and actual Chromium/WebGL gates pass; never merge missing, queued or red checks. Verify full post-merge historical QA, Pages publication guard/deploy; revert Stage N merge as a unit if genuine regression is found.
