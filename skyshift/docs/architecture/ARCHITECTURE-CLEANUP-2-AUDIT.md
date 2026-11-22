# SKYSHIFT Architecture Cleanup 2.0 — Stage A: read-only inventory

Snapshot: `main` merge commit `ae996586bc4d0fd7b83a475dc7e85e8c55d11329` (CI Optimization 2.0).
This is a **census, not a request to delete or move anything**.

## Grounded repository counts

The complete Git tree returned **1,133 tracked files inside `skyshift/`** in
11 directories. File extensions: **843 `.mjs`**, **84 `.js`**, **106 `.md`**,
**44 `.png`**, **28 `.css`**, **12 `.gltf`**, **8 `.json`**, **6 `.py`**
and **2 `.html`**. There are **741 files directly in the `skyshift/` root**
plus five immediate subdirectories. Root files include **106 `game-v*.mjs`**
versions and **84 `boot-v*.js`** versions.

All **210 unit tests** were deliberately moved to `skyshift/tests/unit/` in
stages 4–8. Historical QA may still reference files that the current
browser does not load; retaining past test coverage is valuable.

Current live HTML entry is `skyshift/index.html`. It loads
`boot-v0210.js`, which imports `game-v0210.mjs`. These are the starting
points, **not a complete graph of loaded/runtime assets**.

## Repeatable, non-destructive dependency audit

Run:

```bash
node skyshift/tests/architecture/dependency-inventory-v2.mjs > /tmp/skyshift-inventory.json
node --test skyshift/tests/architecture/dependency-inventory-v2.test.mjs
```

The JSON lists discovered literal HTML, CSS and JS import references, files
seen directly from historical tests/browser QA, unresolved literal paths,
and paths not traced from `index.html`.

**Critical limitation:** a file *not discovered by literal import tracing
is not proven unused*. Dynamic imports, computed asset paths, branch-specific
features, GitHub workflows, reference images, unpublished prototypes and
rollback needs can all require files outside this limited graph.

No automatic delete list is generated. No game code is changed by this audit.

## Safeguards for future stages

1. Independently verify all runtime, import-map, dynamically built and CI
   references against the current three playable circuits, ship library and
   shared tunnel.
2. Separate historical QA and preview artifacts from production code only
   after the owners and paths are enumerated.
3. Archive in reversible batches, not a bulk deletion; keep commit-level
   provenance and a rollback manifest.
4. For any later changes to runtime paths, require all 33 WebGL PR gates
   plus the full historical suite as needed. The fast test-only tier applies
   to this **read-only** audit only.
5. Do not touch live game, ship, road, wave, renderer, materials, lighting,
   shaders, physics, or tunnel files during Stage A.
