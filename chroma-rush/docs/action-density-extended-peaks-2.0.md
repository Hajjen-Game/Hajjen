# Action Density & Extended Peaks 2.0 — CHROMA RUSH

Date: 2026-11-10. Phase 2 corrective pass after real zone-35 playtest.

## Evidence (local arcade log)
- 413.62s, zone 35, score 164,457; 183 spawned, 174 cleared, 9 regular obstacle hits, 38 gap clears and 2 gap misses.
- 26.55 obstacle spawns/min over the full run, or one spawned obstacle every 2.26 seconds on average. **Do not mistake this for real arrival times or spacing**.
- 24 perfect zones out of 34 completed. Strong Flow, 24/34 perfect zones, 28 precision clears and 45 best streak support the player's feeling that hazard pressure is too low.
- BUILD 180.55s (43.7%), PEAK 114.52s (27.7%), FADE 56.10s (13.6%), RELAX 62.45s (15.1%). Short PEAK windows often ran ~4-5 seconds.
- 30-second ordinary + long Duck spawns, by consecutive minutes: 30, 26, 26, 21, 29, 24, 27 (last bucket only 53.6 seconds). No convincing late ramp.
- Action variety: 92 Jump, 83 Duck, 8 long Duck, no retired Echo/Twin Vault. Average Surge window earned only ~2.1 clears despite 17 activations. New signature visuals/audio could not compensate for missing gameplay density.
- Director insight: end-state late density .211, intensity .082 at zone35 with low HP; 248 deferred *pattern candidates* across run (not synonymous with 248 rejected spawn events), 45 variety-rejected patterns. Old endurance ramp only began **after zone24**.
- The exported event list is capped at 600 and ends at 183.48 seconds; full-run totals, 30s distribution and 2-second samples are used for all full-run claims.

## Implementation
1. **Action ramp zone 6 → 19** with player skill confidence and health/stress modulation. Existing late Endurance Mastery 4.0 still compounds beyond zone24; new ramp is not a speed increase.
2. **Sustained PEAKs** rise from ~4–5s toward ~7–8s for a confident midgame player; a healthy late master receives an additional bounded extension. BUILD/FADE/RELAX durations shorten modestly only for a strong player. At critical HP/stress, PEAK shortens and RELAX lengthens instead.
3. **Safe ordinary cadence**: shorter director cooldowns when basic Jump/Duck are playable, while retaining movement.minimumGap, actual collision geometry, world-space spawn safety, gravity-shift protection, flat-runway vetoes, fairness cues and the 3-identical-action guard.
4. **Better action phrase selection**: healthy, confident midgame BUILD can select varied three-action phrases after the existing effort gate; no retired hazard is reintroduced.
5. **Terrain/Director alignment**: modestly fewer generated slopes inside future PEAK/BUILD windows leaves more real spawnable flats; gaps, hills, long-Duck tutorial, landing areas and double-jump mechanics remain.
6. **Audit**: existing local JSON directorExperience now includes actionDensity.ramp and actionDensity.pressure, alongside the existing per-phase seconds, spawned-type 30s windows and player friction.

## Guardrails / next validation
- Preserve 3–4 minute *target*, not an artificially limited run. Preserve Core Pace 1.1 exact speed curve, zoom, all jump/duck/dash/Gravity Shift duration, HP and visual/sound settings.
- Never reduce physical minimum jump commitment (twice absolute jump velocity divided by gravity), ordinary Duck hold/recovery, Dash length or the high-speed reaction/fairness budget.
- Do not chase old budget-phone performance at the expense of premium effects; music is optional, and intensity must be felt when muted.
- Compare next zone-20+ export against this baseline: PEAK time fraction, real 30s spawn counts (especially minutes 3–6), underBudget reaction count, near-miss/obstacle hit rates, phase recovery after damage and actual run length.
- **Do not assume** tests alone prove emotion or fun. Player confirmation on a modern phone is required, and outcomes may need another density pass.
