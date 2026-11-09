# CHROMA RUSH — Endurance Mastery Audit 4.0

Date: 2026-11-09. User playtest: `chroma-rush-zone-51-arcade-audit.json`, build `obstacle-director-balance-3.0`. Source data is **one real player round**, not a population-wide difficulty estimate.

## Why the 10-minute run felt as easy late as at zone 25

- **604 seconds** reached zone **51**, score **210,946**, speed **2,224.95** (Speed Curve 3.2).
- 221 spawned obstacles: **99 Jump, 101 Duck, 7 Echo, 7 Twin Vault (dash-jump), 7 Long Gate (dash-duck)**. Thus **200/221 = 90.5%** basic.
- Across the precise last 120 seconds (480–600s) there were **45 basic and only 1 advanced** spawn. No Echo or dash-jump. Earlier during 240–360s, **35 basic / 6 advanced**. For 360–480s, **36 basic / 2 advanced**. The fade in advanced vocabulary is measurable, not merely subjective.
- Observed **36 Perfect Zones**, **14 obstacle hits**, **3 gap misses**, **51 gaps cleared**, **6 of 12 Shield Cores collected**, restoring 140 HP. During 480–600s, sampled HP often fell to **10–40**. The Director intentionally blocks Echo/Dash when HP ≤ 50 and under high stress; this is a legitimate safety policy, but after several minutes it made the course feel mostly like isolated basics.
- The existing basic-hazard streak guard **worked**: longest identical basic-action run **3**. Repetition was instead the *overall 90.5% basic vocabulary* and many low-pressure periods.
- Only **221 obstacles / 604s = 0.366 per second** overall. Two-minute blocks (0–120 / 120–240 / 240–360 / 360–480 / 480–600) contain respectively **54 / 40 / 41 / 38 / 46** obstacles. A higher velocity alone does not increase the number of decisions per unit of time.
- **17% of total time was RELAX** (100.48s), plus **88.13s FADE**, both valuable to the arcade's rhythm but potentially generous in a ten-minute session. Do not remove recovery phases outright.
- Fairness instrumentation reported 0 of 221 spawns below its required lead; real player feel and low-fps context still require testing. The device ran ~23.7 FPS average on Performance with 209 long frame stalls. A late difficulty increase must not require faster-than-physical reactions.

## Source-level causes

1. `AdaptiveRushDirector.gapFor` caps its zone reduction at **0.27 seconds**, which is fully reached around **zone 7**: no continuing density ramp after that.
2. `patterns.candidates` caps all BUILD phrases at **tier 1**, while FADE offers only tier 0; a very capable zone-50 player never earns richer BUILD phrases.
3. `MovementAwareness.maxEffort` is roughly **3.25** for BUILD regardless of zone; three-action patterns are often filtered.
4. High-speed generation often produces 400–740-unit flats interspersed with hills and gaps, while a hazard needs a clear takeoff/landing corridor scaled by speed. Physical vetoes increasingly reject otherwise eligible obstacles. Dash deferred counters in this round: 29 due to unsuitable flat terrain, 32 near gaps, and 1 due to recovery placement.
5. Below 50 HP and stress ≥ .42, advanced hurdles are suppressed by the Director and game layer, correctly preventing fatal difficulty spikes. As run lengths grow, this safety policy can turn the late level into a long series of basic taps. The last two minutes had real damage, not merely 'too easy' in an objective survival sense, but lacked *expressive challenge*.

## Design target

Keep **Speed Curve 3.2** fully unchanged. Challenge should be expressed as more **decisions per minute**, more deliberately authored, safe **two/three-action phrases**, more **real flat terrain where those phrases fit**, and shorter but still meaningful late safe-run quiet gaps. Only when the player is able to handle them. Do **not** add extra obstacle types, hard scripts, forced Dash requirements, or a fixed zone cap.

## Implementation

### Endurance intensity

```js
r = smoothstep((zone - 24) / 26)
mastery = clamp((confidence - .40) / .45, 0, 1)
shield = hp <= 25 ? .38 : hp <= 50 ? .52 : hp <= 75 ? .76 : 1
strain = stress >= .65 ? .40 : stress >= .40 ? .62 : stress >= .25 ? .82 : 1
intensity = r * mastery * shield * strain
```

The curve is **zero through zone 24** and increases smoothly to zone 50. Low HP and stress suppress it without allowing a completely plateaued late run. Player inputs, physics, camera, obstacle shapes and all on-hit recovery are unchanged.

### Director

- Healthy late BUILD: reduce the nominal gap between spawn **attempts** by up to **0.29s**. Final execution must still satisfy `minimumGap`, arrival interval, obstacle geometry, slope/gap veto, and damage recovery.
- Healthy late PEAK: extend phase by up to **1.40s** versus its old formula; FADE and RELAX remain unchanged.
- From sufficient late mastery onward, BUILD can use tier-2 motifs (previously tier 1). Widen the max effort envelope by up to **0.90** so physically safe three-input patterns can be selected, and softly favor safe multi-input motifs. This is not a forced schedule; the existing Movement Awareness checks remain authoritative.
- `directorExperience.endurance` exports last-zone intensity, shield and the zone-only ramp for analysis, alongside historical real-spawn variety telemetry.

### Unified terrain

- For mastered, healthy zone-25+ BUILD and PEAK, reduce the likelihood of a slope **only within eligible sections**, leaving slope and gap mechanics enabled.
- When the existing random generator chooses flat in a healthy late challenge section, extend it to roughly **2.95–3.55 seconds of current-world-speed runway** (max 7,800 world units). This permits more than one safe obstacle without violating real takeoff/landing requirements.
- Flat corridors do **not** override procedural gaps, terrain phase gating, shield-core lanes, gravity shift, low HP, event ordering or any world-edge recovery checks.
- First lesson runways, early-zone terrain, input tutorial order and high-speed fairness reaction horizons remain unchanged.

## Validation plan

- Unit tests for ramp, early-zone unchanged, HP protection, late phase and spawn intervals, tier-2 BUILD, move effort, and physical terrain eligibility.
- Seeded 10-minute Director simulations compare 3–5min vs 8–10min healthy decision density and maximum identical streak; these tests model **eligibility**, not every terrain collision or human outcome.
- Real follow-up: have testers play zones 25–50 and export at least 4–6 `obstacle-director-balance-3.0-endurance-mastery-4.0` runs. Inspect `summary.variety.windows`, `summary.reaction.underBudget`, `summary.variety.maxBasicStreak`, HP history, per-zone damage, Dash/Echo opportunities and measured FPS. Especially verify whether 8–10min advanced share recovers from **2.2%** while low-HP recovery remains survivable.
- Retune only if real logs still demonstrate long basic-only stretches or unsafe new challenge density. No claim of an optimal difficulty curve from one user's long session.
