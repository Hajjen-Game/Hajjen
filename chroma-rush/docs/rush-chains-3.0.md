# CHROMA RUSH — Rush Chains 3.0 (2026-11-10)

## Why this is a separate pass
Player reports Action Density 2.0 still feels like an endurance runner: occasional Jump or Duck, but no prolonged *reactive* sequences. The player explicitly requests quick alternations for a long time, not additional run length, speed, HUD or audio.

### Verified on-device round audit
- Build `phase-2-action-density-2.0`, 388.68s / zone 33; 169 obstacle spawns, 164 clears, 5 obstacle hits; 28 perfect zones.
- 169/388.68*60 = **26.09 spawns/min**, versus previous run 183/413.62*60 = **26.55/min** — a slight decline, **not** a meaningful gain.
- PEAK reached 154.90/388.68 = **39.86%**, vs **27.69%** previously; increasing PEAK duration alone did not increase number of actions.
- Thirty-second windows for 90–360s are mainly **8–16 obstacles per half-minute**, averaging about 25/min; no long dense attack is visible in the aggregate.
- 80 Jump, 81 Duck, 8 Long Duck; highest 120-clear streak, 357.6s Flow above 65, 37 precision clears.
- Real clue in source: every ordinary pattern (2–4 inputs) resets its spawnCountdown to max(physical minimum, normal Director gap), and no standard pattern lasts long enough to build a 10-second rapid-fire challenge.
- Events are capped at 600 and end at ~175s; use full summary windows and Director aggregate for whole-run findings, do not extrapolate recent individual event traces.

## Real changes
- Three randomized long, preauthored, physically ordinary Jump/Duck motifs of **10–11 actions**, including one syncopated variant. They are not new obstacles or new controls. They are selected only in PEAK, zone>=8, healthy/shield>50, stress<0.38, confidence>=0.64, no pending gravity shift or movement recovery.
- When a Rush motif is already underway, each subsequent ordinary action schedules after the **unchanged physical minimumGap** (or 0.74–0.775s, whichever is larger), not after an unrelated slower general-purpose Director gap. Current high-speed minimumGap is ~0.73s Duck→Jump and ~0.93s Jump→Duck. No reduction to collision, hitbox, jump airtime, Duck recovery, 3-identical-action variety, visible reaction budget, or Dash safety.
- Phase duration deliberately provides ~12–13s PEAK for capable players; hit exits early, remaining queued Rush actions are cancelled. A terrain gap or slope can veto a pending action; a pending Rush that cannot safely place its next step is abandoned instead of stretching into long gaps.
- Unified Terrain Director predicts the arrival-phase ahead and schedules a long flat **12.6–14 second runway** where sustained active Rush sequences are possible. The terrain generator still creates slopes, ordinary gaps, Echo Gaps and normal flats in other parts of the loop, including weaker play; individual spawn placement checks remain unchanged.
- New telemetry in exported `directorExperience.rush`: `started`, `completed`, `interrupted`, `actions`, `longest`, `activeActions`, `pendingActions`. This lets future audits distinguish a merely selected Rush from a genuinely completed chain. `summary.variety.windows` remains available to compare total 30s real spawn distribution.

## Safety and test plan
- Run seeded 270s Directors on several seeds and require at least one fully completed 9+ action Rush per seed with individual intervals no faster than physical minimumGap and no greater than ~1.14s.
- Verify PEAK is long enough, and damage/low HP/high stress/Gravity Shift disqualify Rush.
- Verify physical long flat permits all 11 hurdles and that all hills, gap and landing checks remain available, not weakened.
- Node full suite, independent browser visual and mobile UI tests must pass before merging.
- Next on-phone round: aim for multiple **recognizable 8–12 consecutive inputs** in late midgame with approximate 0.8–1.0s between actions, not necessarily a higher average speed. Inspect 30s bucket counts, Rush *completed* vs *interrupted*, player mistakes, and how easy it feels after zone 18.
- This is a new game design tuning target, not yet a confirmed enjoyment or difficulty outcome. A genuine live-device test is necessary.
