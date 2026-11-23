# SKYSHIFT – shared ships and fleet

Architecture Cleanup 2.0 Stage G establishes `skyshift/ships/` with eight
active ship/fleet, Stingray/Manta, wing animation and ship lighting modules.

The original shader/math/vehicle behavior is **not changed**. Only ESM paths
to root-external modules are rebased. Original source Git SHA IDs are recorded
in `stageG-migration-manifest.json` and validated in the independent
architecture safety guard. Root-level historical and current game versions
were updated rather than removed, keeping their test coverage.

The GLTF hero asset loader and art pipeline are deliberately **not** in this
batch: they rely on `import.meta.url` and relative paths to `assets/ships/`,
requiring a separate path-sensitive migration. Do not move them blindly.
