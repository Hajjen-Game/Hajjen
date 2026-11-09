# Core Pace & Gravity Rebalance 1.1 — Phase 1 corrective pass

Scope: player-identified monotony from three real arcade runs. This change deliberately keeps obstacle geometry, AI Director, camera zoom, input, damage, Shield Core and Dash physics untouched.

## Evidence from three uploaded run-audit exports (aggregated only)

| Run | Duration | Zone | Speed at death | Ordinary obstacles cleared | Gaps cleared |
| --- | --- | --- | --- | --- | --- |
| A | 136.35s | 12 | 1237.44 | 53 | 9 |
| B | 172.45s | 15 | 1385.74 | 78 | 15 |
| C | 316.80s | 27 | 1795.74 | 133 | 23 |

These runs show successful endurance and the player's explicit report of boredom; the subjective boredom cannot be derived from obstacle counters alone. They are not a population-level estimate of ideal run length.

## Changes

- Preserve the first 45 seconds of Speed Curve 3.2 exactly. Between 45s and 225s add a smooth (C1-continuous) midgame speed gain up to +460 world units/s, with no extra speed increments at zone borders.
- Expected speeds in current physical units: 60s ≈835 (+9), 120s ≈1335 (+173), 180s ≈1802 (+388), 240s ≈2067 (+460). This reaches the old ~5m pace after around 3m, without imposing a death timer.
- Preserve Adaptive Camera Horizon 1.1 entirely, including its gradual zoom-out (0.8 at the midstage, down to 0.6 at very high speed). Its visibility budget and horizontal physics are unchanged.
- Gravity Shift begins in zone 8 and may recur every eight zones as before, but ceiling mode is now a short 16-second hold followed by an automatic warning and return to the floor when the course is clear. Realized excursions will be a little longer because the warning, visual flip and safe-runway wait are not skipped.
- Automatic returns use the same floor/ceiling warning cues, no-hazard and no-gap runway reservations and protected collision window as entry. Never force a return during an unsafe gap, active obstacle or mechanic introduction.

## Hypothesis and follow-up

The more assertive speed curve should raise decision pressure over 3–4 minutes. It does **not** guarantee 3–4 minute run duration: HP restoration, player skill and Director recovery may still permit a much longer run. Human playtests and after-change run logs are required to determine whether shorter, more intense sessions actually result.

Check 5–10 runs from different skill levels: time to first hit, median duration, hit distribution per 30s, camera minimum zoom, reaction underBudget count, Gravity Shift warning/complete timestamps and repeat-round intent. If unfair deaths rise, adjust a local late curve or spacing; do not revert to an indiscriminately slower 10-minute curve.

The three original personal run-audit files are not committed to the repository.
