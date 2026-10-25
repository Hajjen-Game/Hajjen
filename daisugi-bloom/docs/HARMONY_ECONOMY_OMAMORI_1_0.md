# Harmony Economy & Omamori 1.0

Japanese Harmony · Pass 2 · 2026-10-25 · v6.37.0

## Gameplay design and scope
This is a **small, offline, cosmetic-only secondary collection loop** next to Goshuincho. The 7x7 matching board, Directors, family roster, move budgets, difficulty, star ratings and scoring remain unchanged. There are NO real-money purchases, random bundles, wait timers, extra lives, powerups, premium currencies, or gameplay-affecting bonuses.

## Harmony Coins
- First completed clear of a stage: 12 base Harmony Coins + 8 for each star earned, i.e. **20 / 28 / 36** for 1 / 2 / 3 stars.
- Replaying a completed level with the same or lower star rating earns zero. Upgrading 1->2 earns +8, 1->3 earns +16, and 2->3 earns +8.
- The payout is calculated once from level index + earned star rating, not from score, end-of-run elapsed time or number of replays.
- Older progress receives a **one-time credit** for actual archived stars (or score-backed evidence of completed stages, credited as one star). Merely unlocked levels are not counted. This lets returning testers access the shop without replaying 29 stages and preserves all existing stars and scores.
- The account lives in the same browser's `japanese-harmony-puzzle-v2` localStorage object under `economy`: `{version, coins, paidStars, owned, equipped}`. No reset of older profile fields. Purchases save immediately.
- This is an offline client economy, not an online trading or secure payment ledger.

## Omamori shop
Six fictional souvenir charms inspired by traditional Japanese omamori. Original game UI motifs, not real shrine objects or claims about spiritual properties.

| Charm | Harmony Coins | Concept |
| --- | ---: | --- |
| Sakuras välsignelse | 80 | Blomning |
| Dimmans stillhet | 140 | Stillhet |
| Darumas löfte | 220 | Uthållighet |
| Lyktans sken | 320 | Värme |
| Koins väg | 440 | Flöde |
| Månens ro | 560 | Ro |

The shop has a wallet, purchase states, an owned-only **Min samling** tab and **Bär / Ta av** actions for a favorite. The chosen Omamori is a collector's display preference only, with no gameplay modifier. Buying the same charm twice is blocked and insufficient funds disable the purchase button.

## Player flow
- One compact shop row immediately after Goshuincho in the level-selection menu, showing the live wallet balance.
- Victory dialog shows **+N Harmony Coins** for the newly achieved grade or explains why a repeat did not grant additional coins.
- Shop and collection open in the existing responsive modal and are readable on 320px and 390px phones.
- Score records, Goshuincho stamps and the original level list keep their existing roles.

## Technical files
- `harmony/economy.js`: pure deterministic earning / historical migration / shop / equip module.
- `harmony/app.js`: one-time save migration, victory reward, wallet and modal views.
- `harmony/mobile-game.css`: compact shop UI and lightweight CSS charm placeholders.
- `index.html`: wallet button, module loading and v6.37.0 cache.
- `tests/harmony-economy.test.cjs` and `tests/harmony-economy-browser.mjs`: unit checks, anti-farm and persistence, mobile UI and historic-profile integration.
- Existing tests and CI workflow extended, no modifications to `harmony/rules.js`.

## Follow-up, not part of this pass
If the rewards/prices feel too generous or grindy during playtesting, adjust prices only after reviewing real gameplay feedback. Any later handmade charm PNG art should replace CSS placeholders without changing prices, ownership, or save structure. Omikuji remains a separate, later-design choice.
