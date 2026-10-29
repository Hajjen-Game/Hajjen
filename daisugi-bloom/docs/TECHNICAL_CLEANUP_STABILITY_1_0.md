# Technical Cleanup & Stability 1.0 — Japanese Harmony

**Scope:** Reliability-only pass for the live `daisugi-bloom/harmony` game. No changes to puzzle rules, directors, difficulty, objectives, stars, shop prices, visuals, or already-valid player records.

## Issues addressed

1. **Corrupt browser saves at startup.** The application previously parsed the entire local save within one broad `try/catch`. One malformed payload or malformed record map could reset the whole profile or fail later during initialization. The new `harmony/save-health.js` adapter reads the payload defensively, preserves valid sections, and normalizes invalid record maps individually.
2. **Unrecoverable overwritten JSON.** If the browser returns malformed JSON, the adapter first stores one copy under `japanese-harmony-puzzle-v2-corrupt-backup`. It only permits later overwrites if that backup succeeds or an identical backup already exists. If it cannot protect a different corrupt original, writes are disabled for the session.
3. **Unavailable localStorage.** Access can throw (for example in restricted/private browser contexts), as can a write when storage is full. The game can continue in memory instead of crashing; an English in-game notice informs the player that their progress cannot be persisted. The implementation does not falsely claim a successful save.
4. **Malformed resumable runs.** Incomplete/invalid 7×7 snapshots, mismatched levels, invalid RNG state and out-of-range values are refused before handing them to the game engine. Valid saved rounds retain their exact board, RNG, moves, and legacy objective contracts.
5. **Corrupted Omamori replay counter.** A string, NaN-like value, negative value or other invalid `replay.claims` no longer bypasses the daily five-claim cap. The counter fails closed for that day; a new day starts normally.
6. **Malformed Omamori card structures.** Arrays masquerading as card maps or individual card entries are normalized so purchases and promotions cannot silently disappear when serialized to JSON.

## Compatibility guarantees

- The existing October 24 first-20-level one-time reset marker is unchanged. Players whose profiles already contain the marker are **not** reset a second time.
- Existing valid stars, level unlocks, coins, Omamori inventories, fortunes, saved runs, and extra legacy properties are kept as supplied.
- No changes to seed generation, legal swaps, fusion destination, blocker behavior, refill directors, star math or rewards.
- The storage adapter has no networking, telemetry or cloud synchronization. Its backup lives in the same browser storage.

## Regression QA

`node daisugi-bloom/tests/harmony-technical-stability.test.cjs`

The test covers good-save preservation, chapter-spanning real engine snapshots, invalid/mismatched saved runs, independent record repairs, corrupt JSON backup, backup conflicts, unavailable storage, one-time reset semantics, malformed Omamori maps and daily replay limits. The GitHub Actions rules job now runs the test and syntax-checks the new adapter.

Existing gameplay suites, mobile-browser smoke tests and seeded benchmarks remain in the same workflow.

## Manual browser verification

1. Open a prior valid profile, verify the Goshuincho stamps, wallet, cards and resumable level. Restart the tab and verify nothing was reset.
2. Play a level, reload during the next decision phase, and verify the saved board and move count.
3. In an isolated test browser profile, paste malformed JSON into `japanese-harmony-puzzle-v2` while the reset marker is `done`; reload. Confirm a visible recovery notice and a `-corrupt-backup` value.
4. In a separate disposable profile, deny storage access; verify the game still opens and shows a persistence warning.
5. Confirm the one-time first-20 reset in a profile without the reset marker, and that a second reload does not reset the new achievements.

**Known boundary:** A corrupted payload that cannot be parsed cannot be automatically reconstructed. It is retained as a backup when possible. Storage disabled by the browser cannot be repaired from within the game.
