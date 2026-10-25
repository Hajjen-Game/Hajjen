# Progression Reward Polish 1.0

Japanese Harmony · v6.46.0 · 2026-10-25

## Purpose
Celebrate existing earned levels and cosmetic collections without inventing currencies, rewards or pressure to play.

## Goshuincho
- Every chapter spread now shows ten miniature ink squares derived from the existing earned-star archive, never from unlocks. The number of earned squares and the accessible progress bar use G.pageSnapshot.
- Once all ten levels have real stamps, a warm highlight appears around the existing chapter completion message. Existing last-page chapter seal layout and stamp PNGs remain unchanged.
- Victory acknowledges newly earned stamps, improved ratings, and a chapter seal on a real tenth completion. A transient pre-level baseline prevents rewarding a replay again.

## Omamori
- Six compact collector slots mirror the existing E.CATALOG, ownership and equipped charm (read-only display).
- Display remaining price difference to the next unowned charm, or collection completion.
- A transient, accessible purchase/equip notice appears only after a successful transaction; no auto-equipping.
- Home menu shows collected charms / six while current Harmony Coins remain visible.

## Invariants
No changes to economy.js, fortune.js, rules.js, costs, coin payouts, save schema, level difficulties, unlocked stages, or chapter art. Reduced-motion styling respected.

## Regression coverage
Static Goshuincho/Economy contracts and browser smoke for 0/10 and 1/10 chapter progress. GitHub workflow exercises original puzzle and collection tests.
