# SKYSHIFT Shared Tunnel – optics and lighting

Architecture Cleanup 2.0, Stage D. This folder now holds 12 active tunnel
illumination, geometry-accents, neon/road-wave optics and reflection modules,
shared by the live racing circuits. These are real game runtime modules.

Only ESM relative import paths have been adjusted. Original implementations
and shaders are byte-identical after the allowed import-path inversion,
recorded in `stageD-migration-manifest.json`.

The foundational tunnel layout/geometry modules remain at the root for now.
Move them only after auditing their wider import graph, historical versions,
browser snapshots, and shared Skyline/Vault/Aurora behavior.
