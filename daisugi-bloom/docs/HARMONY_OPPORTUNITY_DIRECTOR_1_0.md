# Japanese Harmony · Pass 3 — Harmony Opportunity Director 1.0

**Release:** Japanese Harmony 5.4.0 · 2026-10-22  
**Deployment:** Developer-only A/B experiment. **Standard 5.3 remains the only active engine for normal play**, including all existing saved games. No new special items, buttons during puzzles, free moves or objective changes.

## Design goal

Study whether picking among a few *legal, honest* refill outcomes can increase useful decisions after cascades, without making the game automatically win for the player. Inspired by bounded dynamic pacing, but explicitly **not** a guaranteed-win AI Director.

## Algorithm (rules.js)

Every time the board has fallen and needs new stage-one objects:

1. Produce a **Standard candidate**, drawing families from the existing 5.3 refill pool (4 × each of the level's five families) and the existing ~78% incidental-cascade dampener. This consumes **exactly the usual live PRNG draws**.
2. Derive three independent deterministic PRNG forks from the same saved game seed, current roll count and piece ID. Generate up to three **other complete refills** of exactly the same vacancies. Every candidate starts with the identical bag and every placed family deducts one *real bag entry*.
3. Evaluate potential using only the **current finished 7×7 board**: count legal swaps, swaps that can develop stage-three-or-higher objects, swaps with stage-four objects, and matches that can progress the named objective family when applicable.
4. If Standard creates spontaneous fusion(s), keep it unconditionally; do not fabricate/remove those cascades. If Standard creates **no** immediate fusion, consider only alternatives that also create none. Select one only if its opportunity score exceeds the Standard candidate by **0.8**.
5. Commit the chosen candidate's board, real remaining bag and next ID. No stage is directly upgraded, no new piece beyond the normal refill is inserted, no scores/moves are manipulated. A future swap still requires the player.

**Crucial A/B property:** Candidate 0 uses the exact Standard refill and RNG stream; when Director declines all alternatives, subsequent board/rng/bag state remains equivalent. Independent alternative generation does not advance the normal RNG. A/B compares matched initial seeds, not different manually tuned seed lists.

Director is deterministic and bounded at four candidates per refill. It remains a computationally heavier experiment, so it **does not run during ordinary mobile gameplay**.

## Game Dev control

Open **Game Dev → Harmony Intelligence** or access the same lab from the pause menu. Select:
- Level 1–10 (or all).
- 2, 5, 10 or 25 identical start seeds for each chosen strategy.
- Grundseed (default 20261022).
- **Spelmotor:** Standard only, Director only, or **Jämför Standard + Director (A/B)** (default).

The A/B result shows both modes under each of the four bot styles and displays:
- Wins, completed goals, moves used, possible swaps and cascade-turns.
- **Utveckl.**: opportunities to match and develop a stage-three-or-higher piece.
- **Målfam.**: opportunities to make a useful match from an explicitly required family (not applicable to generic targets).
- The longest objective-counter drought.

Reports are downloadable JSON with `gameVersion: "5.4.0"`, `version: "engine-lab-2"`, selected modes and every per-run seed, board-driven metric and Director selection count.

The three planning AIs simulate future refills that human players cannot see. Their win rates are *oracle-style comparison metrics*, not real-human win rates.

## Recorded paired experiments

Fixtures: `tests/fixtures/opportunity-director-l6-8seeds.json`, `opportunity-director-l9-8seeds.json`, `opportunity-director-l10-8seeds.json`.  
Total **96 seeded matches**: three levels × eight seeds × two bots (random and objective-focused) × two engines.

| Level | Random Standard → Director | Goal AI Standard → Director | Goal AI mean developed-object opportunities |
|---|---:|---:|---:|
| 6 – Lantern Festival | 0/8 → 0/8 | 4/8 → 8/8 | 1.34 → 1.48 |
| 9 – Double Harmony | 0/8 → 2/8 | 5/8 → 7/8 | 0.80 → 1.23 |
| 10 – Master of Harmony | 3/8 → 3/8 | 8/8 → 8/8 | 0.94 → 1.14 |

For level 6 the goal AI's mean *objective-family* opportunities rose from **0.63 to 1.18** per turn. Director changed roughly **2–5 refills per complete game** across these tests, not every refill.

**Interpretation:** This is a promising directional effect, but n=8 is too small for firm difficulty claims, and AI sees some future random states. It is not evidence that human play improves. The drop in mean cascade-turns for goal bots on some levels must also be monitored; a more deliberate game must not become less joyful or surprising.

## Tests and release gates

- `tests/harmony-opportunity-director.test.cjs`: deterministic opening board, mode-off by default, bag conservation, unmodified surviving objects, no unsupported stage boosts, no free auto-matches if Standard baseline had none, unchanged live RNG roll count, snapshot mode retention, shared A/B start seeds, comparable isolated/paired Standard runs, correct versioned metrics.
- Existing refill/fair-shuffle, nine-family, VFX, audio, performance, and replay tests all remain active.
- Mobile browser smoke: Game Dev opens on phone layout, executes both modes, displays eight rows for four AI styles, reports game version and does not mutate the player's local save.
- GitHub Actions runs the tests after each change.

**Next decision (not implemented):** Conduct manual player evaluation and broader 50–100-seed A/B tests across every level, including worst-case cascades and mobile performance. Only enable Director for ordinary games if it improves *human* understanding, agency and perceived fairness without excessive intervention.
