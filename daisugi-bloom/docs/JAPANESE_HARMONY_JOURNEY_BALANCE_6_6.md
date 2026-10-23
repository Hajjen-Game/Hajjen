# Japanese Harmony — Journey Balance 6.6
**2026-10-23 · Levels 11 and beyond**

## Problem observed in actual play
After levels 1–10 changed from five to four families, the permanent five-family Journey beginning at level 11 became a steep challenge spike. An actual player had saved scores **4,710 / 7,900 / 9,125 / 9,388** for levels 11–14 yet received only one star each. Previous minimum/second/third star targets on level 11 were **6,500 / 11,400 / 16,900**. In other words, bot successes from simulations were not representative of human performance.

## Star rule
The score objective and first star are the *same* threshold. Two and three stars require meaningfully stronger play. The new level-11 targets are **5,000 / 7,500 / 11,250**. Every successive level grows smoothly; the relative gaps between one, two, and three stars grow gradually too.

Let `index` be zero-based and `d=max(0,index-10)`.
- `core=min(d,39)`
- `rawTarget = 5000 + 52*core + 35*floor(core/5) + min(1100,180*log2(1+max(0,index-49)/12))`
- `target = round(rawTarget/50)*50`
- `mastery = min(d/39,1)`
- `twoStar = ceil((target*(1.5 + .15*mastery))/50)*50`
- `threeStar = ceil((target*(2.25 + .2*mastery))/50)*50`

| Level | Pass / ★ | ★★ | ★★★ |
|---|---:|---:|---:|
| 11 | 5,000 | 7,500 | 11,250 |
| 12 | 5,050 | 7,600 | 11,400 |
| 13 | 5,100 | 7,700 | 11,550 |
| 14 | 5,150 | 7,800 | 11,700 |
| 15 | 5,200 | 7,900 | 11,850 |
| 20 | 5,500 | 8,450 | 12,650 |
| 30 | 6,100 | 9,600 | 14,350 |
| 50 | 7,250 | 12,000 | 17,800 |

Levels 1–10 retain their existing tutorial objectives and move-based star rewards.

## Pacing Director 3.0: gradual support, not rigged outcomes
Only Pacing 3.0 changes refill proposal count in the difficult five-family transition:
- Levels 11–15: 5 ordinary candidate refills, increasing to 6 after 3 or more moves without stage evolution, Echo, Pulse or Masterpiece
- Levels 16–20: 4 candidates, increasing to 5 after the same stagnation condition
- Level 21 onward: 4 candidates, unchanged
- Standard and Director 2.0: 4 candidates everywhere, unchanged

Candidate 0 is **always the original standard refill**. Alternative proposal RNGs remain isolated and reproducible. No piece is inserted outside the bag, no existing piece is modified or stage-promoted, and the selection must reject an automatic match when candidate 0 has none. Director still does not choose or execute the player's move.

## Saves and migration
The already-existing load-time star recalculation runs against the **new** thresholds. Previously completed Journey levels are *never relocked*. Previous record values remain byte-for-byte unchanged. Completed legacy runs whose score is below the new first star retain one grandfathered star.

For the observed human records, the resulting stars are **1 / 2 / 2 / 2**. The old record of 4,710 on level 11 retains one earned star rather than being revoked.

## Verification
- Unit tests: thresholds across the difficulty curve, past-game protection, deterministic 3.0 proposal counts, 4-family intro unaffected
- Director tests: saved RNG/bag state, identical seeded runs, stage-one refills, no created free cascades
- Mobile browser: saved user-record scenario and updated visible star goals
- CI: 330 full-length score rounds, 480 Director 2.0 simulations, 480 Pacing 3.0 comparisons, 480 paired four/five-family games

Simulation results are not predictions of human star rates. Future human playtests should judge whether level 11–15 feels satisfying; recalibrate from actual scores, not from the most powerful bot alone.
