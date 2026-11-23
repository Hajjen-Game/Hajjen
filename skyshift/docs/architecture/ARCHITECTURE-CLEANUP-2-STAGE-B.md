# SKYSHIFT Architecture Cleanup 2.0 — Stage B: browser QA relocation

Following Stage A's read-only dependency inventory, Stage B performs a
**42-file reversible move** of browser-based QA programs, not game code.

- Old: `skyshift/browser-*.mjs` (42 reviewed, path-independent runners)
- New: `skyshift/tests/browser/`
- SHA proof: `skyshift/tests/browser/stageB-migration-manifest.json`
- Test: `skyshift/tests/architecture/browser-harness-relocation-stageB.test.mjs`
- Live `index.html`, `boot-v0210.js`, `game-v0210.mjs`, all tracks,
  shared tunnel, visuals, ships, physics and lighting: **unchanged**.

Important: older browser runners with relative module imports or source
assertions were NOT moved. GitHub's automatic QA must verify the updated
workflow paths before merge. A later dependency graph must confirm which
production modules can safely move into `core/`, `rendering/`,
`tracks/`, `tunnel/`, `ships/`, and `flight/`.

Full browser QA is intentional for this PR: CI workflow files changed, and
CI Optimization 2.0 correctly treats that as high-risk.
