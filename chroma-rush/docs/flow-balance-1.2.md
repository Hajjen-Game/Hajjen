# Flow Balance 1.2 — High-Tier Reward Stability

## Motivation
Player audits (Zone 07–09 runs) show that Flow can reach 100%, but high-tier pressure
continuously drains it even during clean play. This is intended Flow Balance 1.1 behavior,
not an input bug. The 1.2 pass makes excellent streaks more satisfying without raising
Flow gains, making obstacles easier or modifying the Director's terrain decisions.

## Tuning
| Rule | 1.1 | 1.2 |
| --- | --- | --- |
| High-Flow pressure at 100% (initial, full intensity) | 4.5 percentage points/s | 2.5 percentage points/s |
| High pressure during FADE | 100% of base | 75% of base |
| High pressure during RELAX | 100% of base | 40% of base |
| Idle drain in RELAX after 3.5s | 1.5 pp/s | 0.75 pp/s |
| Chroma entry/exit | 90/90% | 90/87% |

- Pressure still only starts above 65% and remains smoothly proportional to
  how far the meter is above 65%.
- Under the Chroma hysteresis rule, a clean run can remain in Chroma State
  and retain its 2x score multiplier between 87% and 90%. It exits immediately
  once Flow falls strictly below 87%, and re-enters only at 90%.
- A hit still costs 35 Flow immediately and clears the streak. Precision
  and normal clears still grant +8/+5 respectively. Perfect Zone rules are untouched.
- Director RELAX/FADE phases reduce passive **loss**, not speed, challenge,
  pressure from hazard placement, or other gameplay fundamentals.
- Generic idle decay begins only after 3.5 seconds without a clear, with
  its grace transition applied for only the portion of a frame past the deadline.
- Audio and exported local round audits use the actual active Chroma tier,
  including the grace region, so they agree with the HUD and score multiplier.

## QA
- Run `node --test chroma-rush/tests/*.test.cjs` (GitHub Actions).
- Run the repository's existing independent visual/mobile browser audits.
- Playtest 60–120 second ranked runs, especially across Directorial RELAX,
  around 87–90 Flow and after damage. Compare Chroma seconds and score yield
  to pre-1.2 logs. Maintain the normal skill requirement for 90% entry.
