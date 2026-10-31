# Moon Mirrors 1.2 — Fusion Resonance
31 October 2026 · opt-in playable prototype, **not** a level-progression release

## Player feedback and goal
Standalone Moon Mirrors in 1.1 felt better than placing mirror symbols over ordinary family icons, but they seemed inert until a stage-five Harmony Pulse arrived. Make *ordinary fusions* interact with mirrors while keeping full Harmony Pulse distinctly more powerful.

## New rule: Mirror Echo
1. The **surviving destination cell** of a successful fusion must touch a Moon Mirror **orthogonally**. A different tile in that fusion's match group does **not** trigger it.
2. The stationary mirror releases a one-cell **Mirror Echo** in its displayed direction. It cannot reflect back into the triggering fusion cell, leave the board, pass over a blocked terrain target, or bounce through a second mirror.
3. A remote ordinary treasure advances **one stage** (50 points, compared to the 75-point ordinary Pulse upgrade). It may reach **stage 5**.
4. A stage-five treasure created by Mirror Echo enters the existing **authentic Harmony Pulse chain**, including pulses reflected by mirrors. Mirror Echo itself does **not** award a Pulse hit or generate a separate Pulse chain.
5. A remote Mist cell is cleansed even when empty. Daruma and Sealed Stones take **one hit** using their existing per-move hit protections. A fixed fixture does not upgrade.
6. Every mirror triggers at most **once per player move**, counting all automatic fusion and refill cascades. Remote destinations also receive at most one Mirror Echo per player move. Existing indirect upgrades and blocker limits remain enforced.
7. As before, any stage-five object made by the initial fusion still emits its normal stronger Harmony Pulse. No free wins, new Director intervention or forced hints.

The first energy leg visibly travels **fusion destination → mirror**, followed by **mirror → destination**. Mirror Echo has a shorter warm-gold trail; full Harmony Pulse keeps its stronger silver-blue look.

## Six unranked examples
From the main menu, expand **Game Settings → Moon Mirrors · Preview**. The picker displays six entries in two columns:
- **Mirror Echo** (new) — an ordinary fusion upgrades a remote stage-three treasure to stage four, no stage-five Pulse.
- **Echo Across Stone** (new) — an ordinary fusion hits a genuine Sealed Stone and clears a remote Mist tile.
- **Moonlit Chain** (new) — an ordinary fusion upgrades a remote stage-four treasure to stage five, producing an authentic Harmony Pulse that reflects from a second mirror and clears Mist.
- **First Reflection**, **Moonlit Mist**, **Reflected Harmony** — retained stage-five Pulse examples, recalibrated for the new Echo rule.

In every showcase, the starting fusion is a **real swap from row 3, column 4 to row 4, column 4**. These are teaching demonstrations that intentionally make the mechanic easy to discover, **not calibrated challenge levels**. Their first-move completion does not demonstrate the final level design.

## Persistence and guardrails
- `moonMirrorVersion` stays at 2: the fixed-object save schema has not changed; no new migration needed.
- The new Mirror Echo event is recorded in optional JSON round export with original fusion location, mirror position and direction, remote target, upgrade/hit, and cleared Mist.
- The opt-in previews do not spend Omamori, grant coins or stars, overwrite a normal saved run, unlock levels, or change Director probability policies.
- Live levels 1–100 do not get mirrors or modified mechanics as a result of this prototype.

## Verification
- Direct engine regressions test the destination-only trigger, one-hit cap, empty Mist, Daruma, Sealed Stones, regular upgrades, remote stage-five creation, subsequent real Pulse, ordinary board isolation, saved round determinism, and optional telemetry.
- 18 deterministic seeds per scenario × 6 scenarios are checked for at least 3 legal openings and a real swap that can demonstrate the behavior.
- A 390px mobile browser test covers the UI picker, mirror artwork, the three new tutorials, and preservation of a pre-existing player save.
- Full GitHub Actions workflow completion and human Android visual-polish sign-off must be checked before calling the prototype release-ready.

## What to evaluate next
**Moon Mirrors 1.3 — Authored Spatial Challenges & Playtest.** Rather than adding more raw power, build actual puzzles where placement matters and the player chooses between routes; compare puzzles with / without Mirror Echo in a small first-time playtest. Only then decide which early chapter should introduce mirrors.
