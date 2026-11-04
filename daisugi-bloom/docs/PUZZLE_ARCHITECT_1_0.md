# Puzzle Architect 1.0 + Difficulty Lab 1.0
Japanese Harmony · 4 November 2026 · **Development-only / opt-in**

## Why this exists
Earlier Journey 2.0 prototypes had a valid initial board and legal swaps, but many
could be won in 2–3 moves. The later multi-objective patch prevented trivial
completions but did **not** prove that the result was an interesting puzzle.

The problem is not primarily missing blockers. We need an intended *insight*,
an exact initial geometry, a visible interaction chain and evidence from complete
rounds, rather than just several target counters.

This project follows the accompanying research report
`japanese_harmony_puzzle_research_2026-11-03.md`, particularly the
`concept → layout → simulation → human test` sequence.

## What's implemented in 1.0

### Puzzle Architect
- A strict versioned *blueprint* with stable id, one-sentence insight,
  primary/secondary skill and 2–6 intended **decisions**.
- An **exact, individually editable 7×7 opening**: one allowed treasure family
  on each non-fixture cell. Stage 1 remains the existing default.
- Actual Daruma, Sealed Stones, Hanabi cargo/crate, Bamboo and Mirror fixtures
  remain managed by the production **Rules.Game**. The editor cannot repaint
  their cells or insert families that don't belong to the level.
- Strict checks for **49 cells**, valid families, fixture overlaps, no free
  opening matches and **at least three legal first swaps**.
- Real inspection of Hanabi's vertical delivery route, each Mirror's
  outgoing direction and scheduled Wind rows.
- Read-only UI at **`/daisugi-bloom/puzzle-lab/`**. There is deliberately
  **no shortcut in the main player menu**, no permanent in-app edits, and no
  calls to localStorage from the tool.
- JSON export of the precise blueprint. The author is responsible for
  putting a tested recipe under source control; the tool does not secretly
  write a live level or change any saved player data.
- A selected real Journey 2.0 level can provide a **seed-captured draft
  opening**. Capturing a seed **does not make it hand-designed**; the UI flags
  this provenance, and the author should intentionally move family tiles
  before promoting it to a reference blueprint.

### Difficulty Lab
- Real `HarmonyRules.Game.swap()` simulations; no fabricated matches,
  booster events or scripted victory.
- Four diagnostic strategies:
  - **random** — legal-move control
  - **greedy** — maximize immediate points and fusion rewards
  - **objective** — maximize current visible objective progress
  - **spatial** — objective progress plus Hanabi route / Mirror geography /
    Wind positioning and a **limited two-ply beam**
- **Paired seeds** across strategies. For a fully authored opening, the
  opening is fixed while RNG/refills differ by trial seed; this measures
  susceptibility to refill variance instead of introducing new layouts.
- Measures successes, P10/P50/P90 winning move counts, very early wins,
  first goal progress, goal droughts, automatic shuffles, zero-legal-move
  incidents, reached subtasks and per-mechanic event counts.
- Warns about 0–10% bot success, repeated shuffles, short finishes and long
  stalls. A strategist-vs-random comparison is diagnostic, not a guaranteed
  intelligence test.
- **No claimed human win percentages**. If no bot wins, the level is
  **unproven**, not formally unsolvable; if all bots win, it may still be
  boring or trivial.
- The browser Lab runs in its own Worker, independently of the player's
  puzzle screen. On a phone, start with one or two seeds before doing a
  much larger Node-based benchmark.

## Usage

1. Open `https://hajjen-game.github.io/Hajjen/daisugi-bloom/puzzle-lab/`.
2. Choose any current draft level (e.g. 5, 11, 16, 18 or 20).
3. Select a seed, **Hämta startbräde från frö**, then paint deliberate family
   arrangements. A fixed tile or a Moon Mirror cannot be edited.
4. Record the discovery you want the player to make, and the expected
   **setup → interaction → payoff** sequence.
5. Click **Kontrollera layout**. Resolve auto-matches and mobility errors.
6. Run one or two seeds under Director 6.2, then compare a second run with
   Director disabled. Inspect near-trivial completions, shuffles, droughts and
   strategic advantage.
7. **Exportera blueprint JSON**, and preserve the companion Difficulty Lab
   report before considering manual promotion into a published chapter.
8. Ask a novice **and** a match-3 veteran to play the same board. Compare
   their interpretation, move counts and whether the key move felt earned.

The UI does **not** change gameplay levels 1–100. Its blueprint snapshot
is usable only as an explicit diagnostic test input to Puzzle Architect.

### Command-line simulation

From the repository root:

```bash
node daisugi-bloom/tools/puzzle-difficulty-lab.cjs \
  --level 20 --trials 3 --director v62 \
  --max-candidates 8 --out daisugi-bloom/reports/puzzle-lab-level20.json
```

To evaluate an exact exported blueprint:

```bash
node daisugi-bloom/tools/puzzle-difficulty-lab.cjs \
  --blueprint /path/to/blueprint.json --trials 10 \
  --strategies random,objective,spatial \
  --out daisugi-bloom/reports/my-level.json
```

`--level` without a blueprint captures a **single generated** opening and
holds its 7×7 layout constant across trial seeds; it must not be mistaken
for a manually authored level.

## First reference puzzles to author

| Candidate | Planned insight | What to look for |
|---|---|---|
| **5 — Hanabi** | A genuine vertical route rather than the easy pilot shortcut | Deliberate step to clear the crate column |
| **11 — Mirror** | The destination of a Fusion is decisive | A reflected hit materially improves position |
| **16 — Wind** | Set up a match before a predictable row shift | Clear, understandable wind forecast |
| **18 — Wind + Mirror** | Use wind to create an adjacent Mirror Fusion | Best move is not merely the highest current score |
| **20 — Hanabi + Mirror** | Two energy sources converge on a useful target | An earned multi-step finale, not six rote reflections |

These are candidate designs to refine with the tool, **not** five newly
certified hand-authored and solved puzzles.

## Limits / what's next
- 1.0 uses stage-one ordinary objects only, preserves fixed fixtures and
  exports whole-grid authored family layouts. It doesn't yet expose a source
  code patcher or advanced drag-and-drop for moving the fixture itself.
  To relocate fixtures, edit the ordinary Level Architecture recipe and
  recapture the blueprint.
- Validation checks a valid **opening**, not full solvability. Full
  reachability search with exhaustive proofs is outside this version.
- Spatial agent has bounded, heuristic lookahead. Its success is highly
  dependent on candidate sampling, moves, refill RNG and Director behavior.
- A browser run is deliberately small. For meaningful range estimates
  use **50–200 paired seeds per candidate** with appropriate compute budget.
- No game rule, artwork, live difficulty, player progress or saved profile is
  changed by Puzzle Architect 1.0.

## Acceptance gates before changing live levels
1. Gameplay is understandable without a tutorial wall.
2. Every planned mechanism has a demonstrable spatial purpose.
3. The exact opening passes engine checks and repeatable lab simulations.
4. A blind human player finds a real **aha** moment, not only higher counts.
5. Stable completion without booster requirements or frequent shuffles.
6. Only then promote into Journey and adjust move/star calibration.
