# HAJJEN

This repository now uses `main` as the source of truth for the current game.

## Current game

The active game is HAJJEN V4-B and lives in `v4-b/`.
The root `index.html` opens the current game.

## Repository policy

- `main` is always the latest stable playable version.
- Legacy pre-current versions are removed from the active tree and remain recoverable through Git history.
- New larger systems should be split into focused modules instead of being added to one large file.
- Gameplay refactors should be structural only unless a balance or rules change is explicitly intended.
- Zone 1 and Zone 2 behavior should be regression-tested after structural refactors.

## Next cleanup phase

The current V4-B code still contains prototype-era patch layers. These will be consolidated gradually into clear modules for core state, movement, Danger/spawns, combat, progression, crafting/spells, UI, telemetry and zone configuration. Each consolidation step should preserve existing gameplay before moving to the next one.
