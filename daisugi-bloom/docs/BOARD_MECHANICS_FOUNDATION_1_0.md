# Board Mechanics Foundation 1.0 — Japanese Harmony
30 October 2026

## Purpose
Prepare the 7×7 puzzle engine for chapters 6–10 without changing the released
level 1–50 difficulty, move budgets, director policies, economy or star ratings.
This is an engine foundation and layout-preview layer, **not** a release of
new chapter mechanics.

## Independent level contracts
- **Objective**: `config.goal` remains the single win condition.
- **Board**: optional `config.boardMechanics` describes physical cells and
  independent overlays: `{version:1,layout,blocked,mist,daruma,sealedStone}`.
- **Masks**: 49 positions (zero-based, row-major) validated for range,
  uniqueness, conflict, and a reasonable maximum of closed cells.
- **Level templates**: `templeGate`, `twinGardens`, `centralShrine`.
- **Testing**: constructor may use `options.boardMechanics` to exercise a
  blueprint without assigning it to any real level.
- **Saved games**: the normalized descriptor travels with the game snapshot;
  old saves with no board mechanics remain a valid full 7×7 level.
- **Display**: closed terrain is represented by a visually distinct garden
  stone with an accessible label; it is not an ordinary collectible object.

## Gameplay invariants
- Closed terrain is immovable, unfusable and immune to growth, Harmony Pulse,
  Awakening and Omamori boosts.
- Column gravity treats terrain as a permanent segment boundary, like an
  unbroken Sealed Stone. Refills do not fill terrain cells.
- Legal swaps, hints and fair shuffle cannot move or transform terrain;
  a seeded playable opening still requires at least three legal swaps.
- Masked Mist can exist on a level whose primary goal is **not** Mist.
  Clearing supplemental Mist is not automatically a primary-goal victory.
- Daruma and Sealed Stone positions can coexist with an unrelated primary goal
  and still receive their normal per-move hit limits.
- Existing score, family, stage progression and 49-cell rendering APIs remain.

## Deferred to chapter implementations
**Bamboo Paths (51–60)**: author actual blocked-cell layouts using the three
tested geometry presets; calibrate paths, openings and turn budgets.

**Lotus Stream (61–70)**: add dedicated collect/drop item type and delivery
targets, configure how they interact with gravity and blocked cells.
Neither delivery objectives nor special drop behavior are implemented here.

**Moon Mirrors (71–80)**: directional Pulse routing with anti-loop/one-hop
guards; do not activate until simulations and visual previews confirm clarity.

**Wind Garden (81–90)**: scheduled, fully signposted row movement; verify
identity, displacement, Mist overlays, and no unavoidable losses.

**Shrine of Harmony (91–100)**: authored mixes using all previous mechanics
and a three-lantern Pulse finale. Test multi-goal presentation and fairness
before tuning the chapter.

## Required follow-up gates
1. Never silently change a resumed run's physical layout; the saved descriptor
   is authoritative.
2. For each candidate layout, compare seeded 4/5-family starts, legal move
   counts, wins, time-to-goal and dead-end recoveries.
3. Run human testing for comprehension and hand-picked difficulty — bots do
   not substitute for player experience.
4. Introduce new targets and renderers under a separately versioned mechanism
   when Lotus, Mirrors, Wind, and Shrine are implemented.
