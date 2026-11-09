# CHROMA RUSH — Obstacle & Director Balance Audit 3.0

**2026-11-09 | Swedish player feedback | landscape/mobile-first | Speed Curve 3.2 is LOCKED**

## Goal

The user asked for a full physical and distribution review after repeated changes to speed and the obstacle vocabulary: Jump, Duck, Echo Rail, Twin Vault (Air Dash optional), Long Duck Gate (Ground Dash), normal gaps, Echo gaps and slopes. The aim is for every obstacle to remain **readable, fair and mechanically distinct** at every speed, with enough variety across 3–7 minute runs to avoid extended repetitive Jump/Duck stretches. Do not alter speed, input controls, HP/Flow, gravity inversion, obstacle artwork or the first-time lesson rules.

## Source review, not assumptions

Inspected the actual source of `GAME.speedAt`, `obstacleBox(es)`, obstacle spawning, terrain, Dash dimensions, Movement Awareness, Pattern weights, four Director phases, camera horizon, and existing tests. Four previous uploaded round-audit JSON logs were also compared. They come from **different builds and speed curves**; do not combine their speed or difficulty outcomes as a controlled A/B test.

First ~187–192s of stored spawn events in these logs (they each retain only the first 600 detailed events; later events are truncated):

| Historical run | Spawns in retained events | Ordinary Jump/Duck share | Longest uninterrupted basic same-type run |
|:--|--:|--:|--:|
| Zone 22 | 93 | 92.5% | 4 |
| Zone 23 | 89 | 89.9% | 5 |
| Zone 28 | 88 | 92.0% | 3 |
| Zone 35 (older speed curve) | 84 | 86.9% | 4 |

The *current* Director excludes only one last-selected pattern via `chooseWeighted`, even though it stores `patternHistory` (up to 25). Stored *selected* patterns can also be rejected during placement, so they are not a reliable record of what the player actually encountered. Current advanced Dash has a 24s minimum repeat schedule gated by HP, stress, terrain and phases, while Echo is heavily weighted down and has a 7.2s cooldown. Therefore a player can experience many repeated elementary actions without a recent advanced movement beat. There is no evidence of an impossible physics demand across all levels; the main verified structural gap is inconsistent obstacle scaling and recency-unaware pattern selection.

## Speed and obstacle budget

`speed=370+1350*(1-exp(-elapsed/170))+0.9*elapsed`; zones are 12 seconds; camera gradually zooms down to 60%. Physical obstacle width is **world units**, not screen pixels. The player does not move on-screen, but the world translates at this speed. Approximate speed and recommended dimension ranges:

| Zone at entry | World speed | Jump width (old → new) | Duck width (old → new) | Echo Rail width after lesson (old → new) | Twin Vault | Long Duck Gate |
|:--|--:|:--|:--|:--|--:|--:|
| 1 | 370 | 43–58 → 43–58 | 54–71 → 54–71 | not yet available | not available | not available |
| 5 | 745 | 43–58 → 45–60 | 54–71 → 59–77 | 300–385 → 307–392 | 720 | 440 |
| 10 | 1102 | 43–58 → 54–70 | 54–71 → 88–110 | 300–385 → 346–431 | 1160 | 530 |
| 15 | 1369 | 43–58 → 65–81 | 54–71 → 118–145 | 300–385 → 386–471 | 1200 | 530 |
| 25 | 1731 | 43–58 → 78–96 | 54–71 → 158–192 | 300–385 → 441–526 | 1200 | 530 |
| 40 | 2055 | 43–58 → 86–104 | 54–71 → 181–218 | 300–385 → 471–556 | 1200 | 530 |
| 50 | 2207 | 43–58 → 87–105 | 54–71 → 184–221 | 300–385 → 475–560 | 1200 | 530 |

These are nominal entry-time figures. The actual obstacle size is sampled at **spawn-time current speed**, not at the zone's first second. Ordinary heights remain **Jump 53–66**, **Duck 115–158**; Echo Rail remains **78–86** on repeats. The FIRST Echo Rail in zone 2 is **strictly unchanged** at width **265–280**, height **70–76**. Twin Vault retains the playtested shortened 1.02s early span + original 1200 world-unit late cap, with its genuine zigzag collision bed. Long Duck Gate retains its .68-second early design / 530-unit max, requiring Ground Dash early but becoming optional later. Both advanced types retain Spacing & Recovery 2.2 world-end safety.

Implemented ordinary width growth:

```js
g = smoothstep((speed - 550) / (2200 - 550))
jump = randomBetween(43 + 44*g, 58 + 47*g)
duck = randomBetween(54 + 130*g, 71 + 150*g)
echo = randomBetween(300 + 175*g, 385 + 175*g)
```

The growth is **bounded**: basic obstacles never grow into the long Dash classes. A late Jump remains about 87–105 world units (~52–63 logical screen units at 60% zoom), compared with only 43–58 before. The ordinary Duck crossing (including its 66-unit ducked body) always remains below the standard 0.55s Duck window. This is about better readability and physical relative difficulty, **not a new forced advanced action**.

### Terrain review

Ordinary gaps originally used a 0.30–0.35-second span, but a hard **500 world-unit cap** shortened the travel-time budget beyond speed ~1,400. Raising the cap to **850** preserves their authored 0.30–0.35s at high speed without affecting early widths. Echo gaps remain their **separate, gated** ~0.92–1.015s of speed-scaled distance, and **are not** broadened or forced more frequently. Slopes and the existing terrain transition constraints are unchanged. Dynamic gap policies and flat takeoff/landing vetoes continue to apply.

## Director Variety 3.0

We preserve BUILD / PEAK / FADE / RELAX pacing, stress/HP response, physical `minimumGap`, gravity-transition protection, the first Echo lesson on the floor, and safe-first Dash lessons. The improvements only act on the **candidate patterns already declared safe** by Movement Awareness.

1. **Successful-spawn history** (up to 16 recent actions and 24 completed pattern starts) rather than only selected but later vetoed patterns.
2. **Maximum three identical plain Jump or Duck obstacles in a row** by considering the ENTIRE prospective pattern, not just its first step. A valid alternative basic type is always available. Dash and Echo naturally break the streak, but aren't inserted just to satisfy a counter.
3. **Rolling family balance:** for the latest 12 actual spawns, when Jump outweighs Duck by 4+, discourage new Jump-leading patterns (and vice versa), without hard symmetry or fixed playlists.
4. **Motif-recency penalty:** repeating the same genuinely spawned pattern 2–3 times in a short history costs selection weight. This is gradual, not an absolute blacklist or forced alternating patterns.
5. **Sensible advanced opportunity:** when Echo has not actually appeared in ~18s, and is currently eligible, its motif gets a capped, progressive weight boost. It still cannot bypass minimum 7.2s Echo cooldown, HP/stress, terrain, phase, gravity, risk or first-lesson requirements. In healthy PEAK after zone 6, short multi-action phrases get a modest preference over trivial singles.
6. The Director export gains `directorExperience.variety` with the last twelve actually spawned actions, eight successful pattern IDs, and the number of repetitive candidates rejected. Existing `movement`, `dashHazards` and scoring exports are retained.
7. The local round-audit `summary.variety` now contains **complete counts per obstacle type**, **30-second buckets** and the **maximum consecutive ordinary Jump/Duck streak** across the entire run. The detailed event list remains capped at 600 for older mobile performance, but the balance summary does not truncate. The new fields include no player identifiers, touch locations or external telemetry.

The principle is **varied safe opportunities, not fixed schedules or hidden difficulty cheats**. In particular, never solve the problem by making every 5th obstacle an advanced mandatory Dash. Prolonged low HP or high stress can and should appropriately restrict the variety until recovery.

## Static + synthetic verification

- Unit physics and sizing checks across the equivalent of zones 1–50: Duck duration, Echo lesson dimensions, advanced Dash width separation, safe late Zoom baseline and unchanged speed formula.
- Both ground and ceiling share unchanged geometry and physical colliders. Canvas appearance is not changed in this pass.
- Synthetic healthy 6-minute Director runs with multiple deterministic seeds assert zero sequences of four or more identical *basic* spawns, and that Echo plus both Dash families remain eligible and appear when a safe floor and good HP are provided. These are **Director unit simulations**, not evidence that all real terrain placements or human action sequences behave identically.
- A weak-player test verifies that variety may pick a different ordinary action, but cannot force high-risk obstacles.
- Long normal gaps remain below the available Jump flight envelope and unchanged on early zones. Echo gaps remain separate.

## Playtest/remaining questions

Ask real testers to export 4–6 runs across zones 1–10, 11–20 and 21–35. Compare obstacle mix and repeated streaks, especially the actual probability that terrain accepts Echo/Dash opportunities; synthetic tests can't guarantee it. Inspect whether the new late ordinary Duck width is legible but still distinct from Long Gate, the speed-scaled gap size feels right, and whether the PEAK/RELAX rhythm produces enjoyable microbreathers without feeling too sparse. Track under-budget reaction entries, hit causes and performance on older phones. **Do not** further adjust Speed Curve 3.2 or the 60%-zoom camera until those playtests justify it.

All prior audit scripts are historical. This is a bounded rebalancing pass, not a claim of perfect difficulty across every speed.
