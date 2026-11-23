# SKYSHIFT — shared ships and fleet

Stage G established the shared `skyshift/ships/` directory for eight original
ship/fleet and wing modules with SHA-verified source preservation.

Stage N adds sixteen Stingray HERO visual modules: four glTF art contracts,
five runtime HERO loaders, five visual-scale/wing presentation modules and two
Hangar showroom modules. Their original Git blob hashes and relocations are
recorded in `stageN-migration-manifest.json`. Only references to root-level
consumers and paths resolved relative to `import.meta.url` are rebased.
The real glTF/GLB files remain under `skyshift/assets/ships/`.
No physics, steering, collision or visuals are intentionally changed.
