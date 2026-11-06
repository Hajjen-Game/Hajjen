# CHROMA RUSH — Flow Balance 1.1

Calibration based on **two arcade run exports** from the user's mobile device, using event replays. Not a statistically validated population balance study.

| Run | Duration | Old Chroma >=90 | Simulated Chroma >=90 after 1.1 |
| --- | ---: | ---: | ---: |
| Zone 8 | 90.97 s | 40.13 s (44%) | 15.50 s (17%) |
| Zone 10 | 108.02 s | 66.13 s (61%) | 36.63 s (34%) |

## Tuning

- Clear gain 6 → 5; precision gain 10 → 8; Perfect Zone Flow gain 8 → 5.
- High-Flow pressure begins at 65 and rises smoothly to 4.5 Flow/s at 100. Exponential integration avoids frame-rate-dependent behavior. There is no extra pressure below 65 Flow.
- Flow thresholds 30/65/90; multipliers 1/1.25/1.5/2; hit penalty 35; idle decay 1.5/s after 3.5s; Perfect Zone healing +10 HP remain unchanged.
- The changes affect only Flow progression, scoring bonuses and existing visual/audio reactions to Flow. Speed, mechanics, Director, collision, terrain and saved records remain unchanged.

## Replay methodology

The replay keeps all recorded obstacle clears, precision flags, gap clears, hits and Perfect Zone events at their original times and applies the new Flow rules. The user-uploaded round files are **not** placed in the repository. A replay is a counterfactual calculation, not a new playtest: future player inputs and scores may differ. The first Chroma threshold is reached at approximately 61s rather than 33s in the zone-8 run, and 32s rather than 24s in the zone-10 run. Tune cautiously after further mobile rounds.

Local development tests: `node --test chroma-rush/tests/*.test.cjs`.
