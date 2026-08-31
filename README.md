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

## Cleanup progress

The current V4-B code still contains prototype-era patch layers. These are being consolidated gradually into clear modules for core state, movement, Danger/spawns, combat, progression, crafting/spells, UI, telemetry and zone configuration. Each consolidation step should preserve existing gameplay before moving to the next one.

Completed cleanup steps:
- Legacy root trees were removed after `main` became the source of truth.
- Zone 2 Run Report telemetry and its correction patch were consolidated into one Run Report module.

Next planned cleanup step:
- Consolidate Zone 2 UI/parity/telemetry patch layers while preserving current gameplay and presentation.
