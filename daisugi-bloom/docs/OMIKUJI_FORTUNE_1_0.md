# Omikuji Fortune 1.0 — Pass 3

Japanese Harmony · v6.38.0 · 25 October 2026

## Product goal
Add a lightweight, friendly, optional fortune-slip activity **outside the 7×7 board**. The player's ongoing objective is still to clear levels, collect stars and spend Harmony Coins on cosmetic Omamori. The Japanese fortune tradition is a source of aesthetic inspiration; the slips and messages are original fictional game content.

## Rules
- One **free** Omikuji draw per local calendar day. No cost, paid rerolls, streak rewards, negative outcomes, account login or time-limited sales.
- Every slip reveals its Japanese fortune kanji, Swedish name and a gentle message. Each gives a **small Harmony Coins bonus**.
- The draw is **optional**. Simply opening the menu does not draw a slip or mint coins.
- If the player opens it again the same day, the already-revealed slip remains visible with its previously granted bonus; no new payout.
- Backdating the local clock does not mint another payout relative to the latest drawn calendar date; this is an offline client-only save, not anti-cheat-secure against changing local files or advancing the clock.
- A previously existing profile receives no retroactive Omikuji currency. Saved purchases, coins, progress and stars remain unchanged until the first actual draw.
- The fortune does not change the board, difficulty, 1/2/3-star rating, or match engine.

## Fortune table

| Omikuji | Meaning | Draw weight | Bonus |
| --- | --- | ---: | ---: |
| 大吉 · Dai-kichi | Stor lycka | 10% | 16 Coins |
| 中吉 · Chū-kichi | God lycka | 20% | 12 Coins |
| 吉 · Kichi | Lycka | 30% | 9 Coins |
| 小吉 · Shō-kichi | Liten lycka | 25% | 7 Coins |
| 末吉 · Sue-kichi | Lycka på väg | 15% | 5 Coins |

No negative prize. Rewards are intentionally smaller than the standard 20–36 Coins awarded for completing new stages in Economy 1.0.

## UI
A compact **Omikuji · Dagens lycka** entry appears under Omamori in the main level selector. Tapping opens a scrollable responsive modal showing a folded paper slip. A large **Dra dagens lyckolapp** button claims today's draw; afterward the same paper displays the fortune and reward, and the button disappears. The entry indicates **Gratis idag** or **Dagens lapp dragen**. A **Stäng lyckolappen** action closes the modal. Plain CSS placeholder art can be replaced later without changing the fortune system.

## Save
Under existing `japanese-harmony-puzzle-v2` localStorage:
`fortune: {version:1,lastDate,lastDraw:{date,id,coins},count}`.
No change to previous economy schema `{version:1,coins,paidStars,owned,equipped}`. Coins are credited atomically in memory with the date lock, followed by the existing `persist()` call. Offline save edits are outside the threat model.

## Verification
- Node tests: five fortune weights sum to 100; each reward is bounded; replay protection; backdated date; next-day draw; shared wallet with Omamori; no migration windfall; no star or level mutations.
- Chrome/mobile tests: empty profile, optional draw action, coin award, reopening same day and across reload, Omamori balance, 320px responsiveness.
- GitHub Actions CI includes both new tests and the unchanged core puzzle suites.

## Deferred
Illustrated paper slips, shrine background, richer reveal animation, sound effects and any broader shop economy balancing. No new object families or gameplay skills are needed for Omikuji.
