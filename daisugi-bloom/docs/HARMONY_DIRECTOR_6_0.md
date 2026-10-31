# Harmony Director 6.0 — Mechanic-Aware Board Intelligence
31 October 2026 · first playable integration; honest seeded A/B metrics

## Decision
**The player's skill should matter.** Director 6.0 must maintain *real, diverse* legal opportunities on spatial boards, **not** script solutions, give free upgrades, repaint treasure stages, guarantee a win, alter move budgets or quietly use Omamori cards. A player can still overlook an opportunity, lose, or encounter a rare technical last-resort shuffle.

## Evidence: real exported level-54 Gate of Echoes round
- Real production board recipe: **Temple Gate**, eight fixed bamboo cells, goal **seven Pulse hits**, **46 moves**.
- User's local exported JSON seed **20266172** with Director **v4**, completed after **33 moves**, **13 moves remaining**.
- Actual **three** rescue shuffles after moves **16, 25 and 31**.
- **21/33** settled boards had only one or two legal swaps, and the three resulting shuffle boards had only two.
- The Director recorded a long stretch of **objective drought**, despite valid normal fusions. Mobility and ability to work toward Pulse were conflated.
- The exact v4 seed and first successful opening (move 27 → 26, score 200) remain unchanged by the new mode.

## What 6.0 actually changes
1. **Explicit saved Director mode `v6`**. All old `v4` saves continue replaying as `v4`, with identical random seed and refill behavior.
2. **Real board health** calculated from actual legal swaps, active open-space connected components, and *gravity channels* separated by terrain, blockers and mirrors. Especially penalize boards with one/two options.
3. **Mechanic-aware opportunities** are assessed without executing or granting them:
   - Bamboo: sections reachable by real swaps, section sizes, vertical refill channels, and stage-four setup around terrain.
   - Lotus: actual legal matches *below a seed in the same exit lane*; no guaranteed delivery, score or hand of cards.
   - Moon Mirrors: first-wave fusion locations adjacent to fixed mirrors.
   - Wind Garden: actual legal matches on scheduled wind rows without moving wind for free.
   - Mist, Daruma, Sealed Stones and Harmony Pulse: real potential based on landing cells, accessible neighbours, fixed blockers and available stage-four investments.
4. **Conservative alternative stage-one refills:** Preserve the original baseline and its natural random cascades; on a nonmatching baseline, compare deterministic alternate fills that use the exact original family/stage-one bag. Prefer higher mobility (particularly near deadlock) and *existing* tactical paths; alternatives creating an automatic free cascade are rejected. The original RNG stream remains unchanged when baseline is selected.
5. **Bounded adaptive search:** only **5 alternate candidates** on healthy boards, **9** when 3–4 legal swaps, and **17** when 0–2 legal swaps. This favors mobile performance and only spends additional assessment time when a genuinely restricted board needs it.
6. **Shuffle stays an emergency fallback, not a tool for winning:** it still triggers **only at zero legal swaps**, still preserves every entire object identity/stage and every fixed tile, and still does not advance goals. On fixed-geometry boards v6 samples up to 320 legal permutations, preferring a board with **four or more options**; if unattainable it returns the best legal option found. Historical v4 shuffling remains byte-for-byte unchanged.
7. **Per-refill debug trace** includes spatial health before/after, legal swap counts, usable channels, candidate selection and `health-recovery` / `proactive-mobility` / `spatial-opportunity` reason. Raw private round data is **not** committed.

## Activation
- New plays in **Game Settings → Bamboo Paths / Lotus Stream / Moon Mirrors / Wind Garden · Preview** use Director 6.0.
- **Fresh** auto-Director chapter starts at **level 51 onward** use v6. Existing saved rounds resume with their stored mode; levels 1–50 keep their current auto mode (3.0 or 4.0). Explicitly chosen older modes are respected.
- UI now labels this mode **BOARD HEALTH 6.0**. No changes to the dedicated target goal, first-turn stage distribution, economy or power-card consumptions.

## Evidence from first 6-seed comparison (17 accepted turns each)
**Gate of Echoes only**, same seeds and the same *legal-move selection policy*, not the same move coordinates after diverging refills:
- Director 4.0: **4 shuffles**, **52/102 turns** ending with 1–2 legal swaps.
- Director 6.0: **3 shuffles**, **22/102 turns** ending with 1–2 legal swaps.

**This is a limited early improvement, not a claim that the shuffle problem is solved.** Goal progress under the naive selection policy can still be difficult; six seeds are too few to draw population-level conclusions. A puzzle-skill-oriented player test and broader benchmarks are needed to adjust the difficult authored levels. Some levels will always be intrinsically brittle with fixed barriers. Never force an objective-clearing swap for free.

## Quality gates
- `harmony-director-v6.test.cjs`: old save persistence, unchanged level 54 opening, no stage or identity mutations, honest candidate choice, fixed terrain across real swaps, debug health, Lotus/Wind/Mirrors, and legal shuffle safety.
- `harmony-director-v6-benchmark.cjs`: seed-paired v4/v6 tests over five authentic mechanics; records shuffles, low mobility, objective progress, replay seeds and completions. Run with `--trials=6 --moves=17 --write` for CI artifact; increase trials for balancing.
- Old v4, Mechanic Balance, Bamboo and Lotus regressions remain in CI.
- Updated phone tests construct preview copies with **v6**, matching actual app snapshots.
- **GitHub Actions browser and wider benchmark results require an actual green workflow**, followed by hands-on Android testing.

## Follow-up (not automatically changed)
Director 6.1 should investigate **puzzle-effective mobility**, particularly a 7-hit Pulse mission behind multiple gate stones. Even perfect legal-move counts cannot solve poorly chosen objective/geometry combinations. Treat additional shuffle-rate improvement as a *measured* goal, not an artificial promise. The earlier Hanabi/Firework redesign and wind animation feedback remain separate.
