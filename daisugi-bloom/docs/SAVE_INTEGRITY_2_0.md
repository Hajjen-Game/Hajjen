# Save Integrity 2.0 — Journey 2.0 round safety
Date: 5 November 2026

## Problem confirmed with genuine engine snapshots
The old `HarmonySaveHealth.validRun()` assumed that `lotusVersion:1` and Hanabi cargo could only be saved at **zero-based level 60** (the legacy level-61 prototype).

Published Puzzle Architect Journey 2.0 reuses the same real Hanabi cargo/crate engine in **15 of the current 40 production levels** (5, 6, 7, 8, 9, 13, 16, 20, 22, 25, 27, 30, 34, 37 and 40). Before this fix, real saves from all 15 failed validation and would be removed from the active run on reload.

## Fix
The Save Health validator now distinguishes:
- **Legacy level-61 Lotus/Hanabi saves:** accepted with their original level restriction and existing fixture checks.
- **Versioned Journey 2.0 saves:** accepted when `levelArchitectureVersion` equals the active Level Architecture version, `levelRecipe` is valid for the exact level, the recipe actually includes Hanabi, `hanabiVersion===2`, and the saved cargo starts/crate exits exactly match the normalized recipe.

All the previous board, cargo identity, crate position, delivered count, fixed-tile, round-trace and seed validation remains in place. Arbitrary Hanabi state is still not accepted merely because a level number is 1–40. No level recipes, seed probabilities, move budgets, engine behavior or rewards were modified.

## Invalid round recovery
A valid JSON profile containing an invalid active round is now copied **verbatim** to the distinct localStorage key `japanese-harmony-puzzle-v2-invalid-run-backup` before the bad round is excluded. The live normalized save retains achievements, coins and Omamori inventory.

If a different backup already occupies the recovery slot, or storage refuses the backup write, normal session writes are disabled instead of overwriting the only available copy. Players see an explicit warning. This is local-browser recovery only, not a cloud backup.

An explicit full progress reset clears both corrupt-JSON and invalid-run recovery backups. Ordinary play, reload, star updates and new saves do not clear them.

Important: this cannot reconstruct any run that an older app version already silently discarded and then overwrote before Save Integrity 2.0 was deployed.

## Verification
- Direct engine check: 40/40 published Journey 2.0 starts now pass `validRun`, versus 25/40 before the fix.
- After one real legal move on each level: 40/40 pass; every accepted saved board was restored without changes.
- An actual full Hanabi delivery on level 5 remains valid and restorable.
- The previous level-61 pilot still validates, and intentionally malformed/altered Journey cargo/recipe snapshots are rejected.
- New `harmony-save-integrity-v2.test.cjs` exercises actual engine saves, normalization, restoration, localStorage simulation, legacy coexistence, tamper rejection and backup safety.
- New `harmony-save-integrity-v2-browser.mjs` checks mobile page reload and continuation of authentic Hanabi rounds from levels 5, 25 and 40; verifies inventory and coins; then simulates an invalid round and confirms the raw backup.
- Both suites are wired to the repository's GitHub Actions workflow.

### Evidence boundary
The new standalone integration tests were executed in a JavaScript test harness with the real repository modules and passed. Full GitHub Actions and browser automation outcomes remain **unverified** until their jobs report completion.
