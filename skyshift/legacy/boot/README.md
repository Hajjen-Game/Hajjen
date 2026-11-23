# SKYSHIFT historical bootstrap snapshots

These are historically versioned bootstrap scripts, **not** the live Pages entrypoint. They stay source-identical except that `import("./game-v...`) is rebased to `import("../../game-v...`) so the actual original root game module URL is preserved after moving the script two directories down. Original Git blob SHA values are protected by `R1-migration-manifest.json` and architecture test. Live `boot-v0210.js` remains at the project root. GitHub Pages does not automatically redirect retired direct bootstrap URLs.
