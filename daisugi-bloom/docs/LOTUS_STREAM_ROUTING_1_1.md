# Lotus Stream 1.1 — Routing & Difficulty Design
30 October 2026 · technical prototype pass

## What is implemented
A separate, opt-in **diagnostic-only** routing system for testing vertical
transport, multiple cargo lanes, shared collection gates and closed garden
terrain before authoring levels 62–70.

**Production state is intentionally unchanged:** First Lotus Stream (level
61) still starts with exactly two seeds at [36,40], targets gates [43,47]
and uses 38 moves. Levels 62–70 still use their previous generated goals.
Progress, stars, Harmony Coins, Goshuincho and previously saved gameplay
are not reset or migrated to these experiments.

## Four experimental route recipes
| Prototype | Seed starts (0-based) | River gates | Purpose |
|---|---|---|---|
| long-drop | 29, 33 | 43, 47 | Two-step drop; lowest learning escalation |
| three-lanes | 22, 24, 26 | 43, 45, 47 | Three independent cargo channels |
| garden-route | 22, 26 | 43, 47 | Three-step routes with permanent stones 23 and 25 |
| shared-gate | 8, 22, 12 | 43, 47 | Two seeds must reach the same gate serially |

All recipes validate cargo-to-gate column alignment, permanent blocks,
unique IDs and the physically possible vertical path to a river gate.
Two or more seeds may use a gate sequentially, not simultaneously.

The prototype-only hook is
`new HarmonyRules.Game(60, null, {seed: 135, directorMode: "v4", lotusPrototype: "long-drop"})`.
It does not get called by the production UI or normal level progression.

## Difficulty support
- **LotusRouting.remaining / distance / advance** are read-only transport
  diagnostics measured in remaining vertical rows.
- **Director 4.0** can now conservatively reward refill candidate boards that
  offer genuine legal swaps beneath cargo. This route-specific scoring is
  enabled only for opted-in prototypes.
- **Hints** additionally value real cargo descent and real deliveries;
  a large score combo far from the seeds no longer automatically dominates
  a useful delivery move.
- **Pacing and drought awareness** reset when a real seed falls closer to its
  gate, not only when the seed is collected. The win counter remains based
  strictly on actual collections.
- No bonus moves, manufactured matches, changed draw odds or invisible
  automatic progress is introduced.

## Early diagnostic results
A very small *automated strategy* trial used four fixed seeds and at most
12 hint-guided moves per prototype. It is **not** a human win-rate study.

| Prototype | Complete within 12 moves | At least 1 seed collected |
|---|---:|---:|
| long-drop | 1/4 | 3/4 |
| three-lanes | 1/4 | 2/4 |
| garden-route | 0/4 | 1/4 |
| shared-gate | 0/4 | 0/4 |

Even with physically possible paths, some recipes are not yet reliably
satisfying. The shared-gate prototype is deliberately *not ready* to become
a real level. This is why the rollout is held back.

## Test coverage and safety
- `tests/harmony-lotus-routing.test.cjs` covers all four recipe contracts,
  96 seeded fair openings, deterministic Director hints, save round-trips,
  corrupt-save rejection, two seeds sharing a gate, immovable terrain, and
  anti-Omamori cargo protection.
- `tools/lotus-routing-diagnostics.cjs` logs repeatable move-based metrics
  for future comparison. Usage:
  `node daisugi-bloom/tools/lotus-routing-diagnostics.cjs 4 12`
- Existing Lotus 1.0 tests are retained and verified.
- Safe save format includes the exact prototype key, gate and terrain mask,
  and the player never encounters an experiment in normal level selection.
- GitHub Actions checks are the final integration gate; if those remain
  pending, a local unit pass must not be reported as a green complete CI run.

## Recommendation
Do **not** author or activate the rest of Lotus Stream until there is player
feedback on the first 61 levels. The next technical design work, if needed,
should be a targeted **Lotus Stream 1.2 — Fair Route Authoring** pass:
shorter and more visibly signposted delivery pathways, measured accessible
matches beneath cargo, and a more rewarding shared-gate experiment.

Once the player has tested Bamboo Paths and the level 61 pilot, use the
feedback to choose two or three prototype patterns for actual levels
62–70, then design and playtest the full chapter.
