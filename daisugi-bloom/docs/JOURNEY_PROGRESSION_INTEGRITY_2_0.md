# Journey Progression Integrity 2.0 — approved Puzzle Architect achievements
Date: 2026-11-05

## Decision and migration policy
**A level number alone is not proof that the newly designed Journey 2.0 puzzle was completed.** Previously saved `bestStars`, `fourFamilyStars`, `bestScores`, chain records and assisted records can refer to the obsolete boards. They remain intact as historical archives and are no longer counted as stamps in the production Goshuincho.

A new, separately versioned `save.journeyProgression` ledger records `{recipeId, signature, stars, score, chain, assistedStars}` for each of the approved levels 1–40. Signatures are derived from the **normalized, complete current level recipe**, not just the level number or an ID. A renamed or redesigned objective, move budget, obstacle layout or other versioned recipe field invalidates its old achievement for the new design. No legacy achievement is guessed or converted into a new one.

The first migration starts the new signed-stamp collection empty, because historic unversioned records do not establish which board was won. It **does not delete old achievements, Omamori, Harmony Coins, daily fortune, preferences, or active save files**.

### Access vs. proof of completion
Historic access (`save.unlocked`) remains preserved. The new ledger copies the player's previously unlocked range, capped to the 40 currently published levels. Players can revisit the levels they had access to, but they must win a specific new puzzle to earn its new stamp. They are **not** required to replay all earlier levels merely to reach their old position. This is an intentional non-destructive migration, not a hard campaign reset.

Goshuincho, its chapter seals, total stars, selected-level badges, the hidden legacy level list and active current Journey scores now read the new signed ledger. All raw historical arrays remain intact for archival compatibility, economy migrations and diagnostics. A one-time book-opening message explains why older achievements no longer display as Journey 2.0 stamps.

Only an actual successful, non-preview `Rules.Game` using the **exact current Puzzle Architect recipe** can call `HarmonyJourneyProgression.complete` to earn a stamp. An interrupted or obsolete saved run cannot be resumed as if it were the redesigned puzzle; current authored unfinished runs remain resumable.

## Rewards and economic integrity
The existing wallet balance and old `economy.paidStars` receipt history are preserved, not reset or re-credited during migration. **No new coins are granted for merely importing old stars.**

When a player actually clears a current Journey 2.0 recipe, a separate `economy.journeyPaidStars` receipt keyed by its signed recipe version pays its 1–3-star reward once. Replays with the same rating grant no duplicate first-clear reward; upgrading the real rating grants only the difference. Assisted wins count as one stamp and cannot replace a clean score record. Once the outcome is settled, the signed achievement and the coin receipt are persisted together, rather than in separate writes.

The receipt ledger intentionally distinguishes new work from historical payouts. If a previous version already paid the player for the *same new puzzle* but did not store its recipe provenance, the migration cannot prove that fact. Its current-journey receipt is therefore only created on an explicitly completed, signed puzzle after upgrade; it is never silently backfilled.

## Compatibility and safety
- `HarmonyGoshuincho` remains a pure read-only projection and preserves standalone legacy behavior when no versioned profile ledger exists, for old compatibility tests and archival tooling.
- Progression migration does not modify refills, approved 7×7 layouts, goals, damage rules or star thresholds. Fresh games now use Harmony Director 6.3; saved 6.2 runs remain compatible.
- `Save Integrity 2.0` continues to validate and recover authentic Hanabi in-flight game snapshots.
- Malformed prior progression ledger data, if present, is copied into `journeyProgressionArchive` before creating a new ledger.
- Existing saved stars and score maps must **not** be populated with new Journey clears; they are now genuinely historical.
- Recipe fingerprints use deterministic non-cryptographic FNV-1a hashes for **content versioning**, not tamper-proof security. This is an offline local-save game, not a server-authoritative anti-cheat system.

## Verification
- Node: `harmony-journey-progression-v2.test.cjs` covers preservation, exact version matching, stamp idempotence, ratings, clean records, legacy resume isolation, authentic Hanabi victory and the separate coin receipt ledger.
- Browser: `harmony-journey-progression-v2-browser.mjs` exercises migration, real two-move Hanabi victory, the 390px Goshuincho book, persistence across reload and unaffected coins/cards.
- Both suites are included in `.github/workflows/daisugi-bloom-tests.yml`, alongside the existing Save Integrity 2.0 suites.
- Independent JavaScript checks of the ledger/projection/economy behavior and a genuine Rules.Game Hanabi clear have passed. A fully green GitHub CI run and physical mobile tests are **not yet confirmed**.

## Follow-up
When future Puzzle Architect chapters are published, expand `COUNT` and ensure each new recipe is explicitly released. Do not loosen matching to level-number-only achievement checks. If a puzzle's content is intentionally edited, choose whether to issue a new signature (fresh achievement required) or a documented compatibility alias (old achievement accepted deliberately) as part of that release.
