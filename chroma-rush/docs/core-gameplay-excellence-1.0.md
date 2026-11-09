# CHROMA RUSH — Phase 1: Core Gameplay Excellence 1.0

Status: measurement-first audit pass; not proof the game is balanced or externally validated.

## Decisions from the current-code audit

1. Keep Air Dash and Ground Dash for controlled testing. They can be correction tools for timing mistakes, even though the former Dash-Jump Energy Bridge has been retired. Ground Dash extends a Duck; Air Dash adds world-space speed during a jump.
2. Do not change physics and difficulty while establishing the baseline. Jump velocity -870, gravity 2140, Duck duration 0.55s, Dash duration 0.30s, current Director, palette and Gravity Shift all remain unchanged.
3. Measure first-minute onboarding and recognize the difference between detecting a nearby challenge and proving a causal Dash rescue.
4. The existing fairness budgets are engineering assumptions, not evidence of human reaction-time experience or public retention.
5. Endless Arcade adapts to player performance. Do not present its results as a fair shared competitive leaderboard.

## New local-only audit fields

- summary.firstMinute: four 15-second bins (0–15, 15–30, 30–45, 45–60), input counts, spawned obstacles, obstacle/gap clears, hits, Dash uses, blocked Dash attempts, and first input / clear / damage / Dash times. Includes observed duration and completed-first-minute status; this is NOT D1/D7 retention.
- summary.dashTiming: separate Air/Ground counts of near-challenge use, use without a nearby relevant hazard, follow-through clear/hit and unresolved use. The extra dash_timing and dash_followthrough events relate to real hazard world coordinates, but do NOT prove Dash was necessary for survival.
- This adds no server, unique ID, device fingerprint, touch coordinates or storage. Data is exported manually from the existing Run Details screen after a run. Audit format version remains 3 for compatibility.

## Planned validation before altering gameplay

### A. 15–20 first-time players
- Observe the first 60 seconds without coaching. Note which controls they discover and whether failures seem understandable.
- Ask whether Air/Ground Dash felt like a useful timing correction, separate from obstacle requirements.
- Review exported round logs for time to first successful clear, first error and blocked Dash.

### B. Three controlled play styles
- Compare play without Dash, Dash for emergency correction, and deliberate Dash use on matched scenarios. Measure survival time, avoided hits and perceived control.
- Do not remove Dash because no obstacle explicitly requires it.

### C. Readability, performance and fairness
- Test each color at high speed, low brightness, 30fps and on an older phone; include ceiling orientation.
- Audit visual reaction lead and dropped simulation time. Predicted lead time is not proof of perceptual fairness.

## Decision gates

- Dash changes require repeatable evidence from actual players.
- First-minute onboarding changes follow identified misunderstandings, not hunches.
- Keep Director difficulty constant until a credible baseline exists.
- If the public trial grows, consider separately consented aggregate retention measurement; local rounds cannot measure next-day return.

Phase 1 is STARTED by this pass and remains open pending playtests.
