# SKYSHIFT 0.15.0 — Track Rhythm & Risk/Reward

## Player choice, not a visual gimmick
The original 0.14.0 three-lap racing and eight medal challenges remain available and use **the same steering and GRIP formulas**. Two 40m-wide longitudinal choice windows now follow technical corners on wide straights: **SWEEPER RELEASE** (s=2200–2240m, after back-sweeper) and **FINAL SLINGSHOT** (s=3150–3190m, after final corner).

At each gate, player chooses exactly one per lap:
- **SAFE CENTER**, center x ∈ [-2.35,2.35]m: +14% physical speed for 0.72s.
- **RISK RIGHT**, lane x ∈ [4.45,6.45]m: +40% physical speed for 0.98s. At full 23.2m road width the physical rail limit is ±7.77m, leaving ≥1.32m of additional lateral margin beyond the risk pad's far edge.
- The launch booster at s=58–86m remains the familiar +40% introductory boost.
- Grouping by gate/lap forbids collecting both SAFE and RISK, and contact must be physical and grounded. Each choice is a real 120Hz speed multiplier, not a bonus score display. Speed gains can be offset by steering effort and real rail scrub, making the line decision meaningful.

## Feedback
The existing continuous single-surface PBR road shader shows amber SAFE inlays and distinctive white/cyan RISK inlays plus a subtle advance line from 125m before each gate. The optional upper-center HUD cue tells players RISK RIGHT +40% / SAFE CENTER +14%; normal GRIP apex warnings take priority. No new meshes, texture assets, floating hazards, cinematic camera changes or boost buttons.

## 0.13.5 fairness guardrails
The risky inlays are deliberately **after** demanding technical turns, away from the narrow 14m GRIP apex, mandatory jump gap and corkscrew. The stress audit showed 16 centerline yaw deficits in extreme zone/boost cases, so we **do not** add a forced risk line through that curve. Regular GRIP strength remains 0.13.4.8's halved bonus.

## Records / progression
Because SAFE/RISK pads change legal lap times, Time Trial records and ghosts use a **new 0.15.0 storage key and course revision**. Old records remain in browser storage and are not deleted. The eight 0.14.0 challenge medals and unlocks use the existing separate saved progress; none are reset.

## Testing
Pure node tests check actual geometry, 120Hz safe/risk speed, exclusivity across laps, GLSL/physics source-of-truth parity, PB versioning, and untouched ship steering. Chrome WebGL test checks actual physics choices, no double dipping, shader initialization, normal race start and all eight Challenge cards.

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.15.0
