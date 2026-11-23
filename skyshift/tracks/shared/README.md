# SKYSHIFT – shared track systems

Architecture Cleanup 2.0 Stage F moves the live track selection, circuit
layout and 3D track geometry modules into `tracks/shared/`.

These systems belong to multiple circuits and must not be copied for each new
track. See `stageF-migration-manifest.json` for exact original Git blob SHAs.

Imports in historical versions, browser QA, unit tests and CI workflows were
updated to the new paths. Gameplay, geometry and rendering calculations were
not changed. The original source is byte-identical after allowed import
rebases are reversed by the architecture guard.
