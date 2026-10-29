# Omamori System Audit 5.0
Japanese Harmony · October 29, 2026

## Two clearly defined categories
**Consumable power cards:** Sakura's Blessing, Path of the Koi, Moon's Serenity. They can be used on the board without being equipped. Each activation consumes the whole card, including its tier, even if the level is subsequently lost. A failed attempt to target a card or a cancelled confirmation costs nothing. A new purchase always starts at Tier I.

**Permanent keepsakes:** Stillness of Mist, Daruma's Promise, Lantern Glow. These are decorative collectibles and not playable board powers. Once bought, they remain owned forever, cannot be consumed or purchased twice, and can be equipped to progress through unique-level missions. Mist-clearing and Harmony Pulse now trigger light cosmetic effects for Mist and Lantern. Daruma already provides visual effects. Reduced-motion preferences suppress all those effects.

Equipping one Omamori earns missions on distinct levels. Three qualifying levels unlock Tier II, six unlock Tier III. A consumable power card can be used at any tier even if it is not equipped.

## Prices and purpose

| Omamori | Type | Cost in Harmony Coins | Tier I / II / III |
| --- | --- | ---: | --- |
| Sakura's Blessing | Power | 80 | Upgrade 1 / 2 / 3 different tiles by 1 stage |
| Path of the Koi | Power | 160 (previously 440) | Shuffle 2×2 / 3×3 / 3×3 + optional reroll |
| Moon's Serenity | Power | 200 (previously 560) | +2 / +3 / +5 moves after running out |
| Stillness of Mist | Permanent | 140 | Mist-clearing visual flourish |
| Daruma's Promise | Permanent | 220 | Daruma and Stone-hit visual flourish |
| Lantern Glow | Permanent | 320 | Harmony Pulse visual flourish |

These are initial balance prices, not final monetization prices. Permanent keepsakes retain their old prices; consumable Koi and Moon are made less punishing to experiment with.

## Guarantees and limits
- Existing cards, completed missions, tiers, coin balances, records and saved game boards remain intact.
- Existing purchases are not automatically refunded or re-billed because past purchase counts were not tracked.
- Earning standard stars, coins and normal records remains restricted to unassisted victories. Assisted victories still unlock the next level.
- The core 7×7 rules, move budgets, Directors, pulse rules, retry rules and tier mission requirements remain unchanged.
- There are no real-money purchases.
- Separate older power-charge counters remain unused as before.

## UI and QA
- Shop categories: POWER CARDS - CONSUMABLE and KEEPSAKES - PERMANENT.
- Explicit type, tier progression, permanent ownership, tier-specific effects and confirmation warnings.
- A new deterministic audit test is included in GitHub Actions together with existing power tests and mobile browser smoke.
- Real mobile usability and price balance still require hands-on testing.
