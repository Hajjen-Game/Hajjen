# Japanese Harmony — Level Architecture 2.0 (Step A)
1 November 2026 · Versioned, **opt-in technical foundation**, not a level reshuffle.

## What changed
A pure level recipe compiler now combines independent mechanics on a single 7×7 board, without tying an obstacle to an absolute chapter:
- Mist (existing early mechanic)
- Daruma (two hits)
- Sealed Stones (four hits, Awakening Pulse)
- Moon Mirrors (fixed directional reflections and Fusion Resonance)
- Wind Garden (predictable post-move row shifts)
- Hanabi Crate (cargo delivered to a fixed bottom-row box)
- Bamboo (optional, reserved for later playtesting)

A recipe declares its own **level index**, stable ID, level name, one mission goal, move budget, 3-star threshold, difficulty tier and mechanic parameters. The compiler produces the *existing* Rules engine's fields (`boardMechanics`, `moonMirrors`, `windGarden`, `lotus`, `hanabiVersion`). No new gameplay engine, fake rewards, auto-completion or additional RNG logic is created.

## Example: a mixed mission
```js
const recipe = {
  version: 2, id: "moon-and-seal-demo", index: 80,
  name: "Moon over the Seal", subtitle: "Aim the reflected light",
  intro: "Use Moon Mirrors to reach the sealed target.",
  moves: 38, starPar: 17, difficulty: "challenge",
  goal: { type: "sealedStone", count: 1 },
  mechanics: {
    sealedStones: [38],
    mirrors: [{ at: 24, direction: "right" }],
    wind: { every: 3, steps: [{ row: 2, direction: "right" }] }
  }
};
const J = require("./harmony/level-architecture.js");
const R = require("./harmony/rules.js");
const compiled = J.compile(80, R.levelConfig(80), recipe);
// Opt-in diagnostic in the real engine, never triggered by ordinary play:
const game = new R.Game(80, null, {
  seed: 421, directorMode: "v63",
  journeyDiagnostic: true, levelRecipe: recipe
});
const save = game.save();
const resumed = new R.Game(80, save, { fastRestore: true });
// The old R.levelConfig(80) remains untouched.
```

The `starPar` is a design target; its actual suitability must be calibrated with players and seeded simulations. The `difficulty` tier is design metadata, not a Director instruction or automatic move adjustment.

## Design and safety rules
1. **Published Journey:** approved Journey 2.0 recipes are now active for levels 1–40 in Goshuincho. The `levelRecipe` option requires explicit `journeyDiagnostic: true` on a *fresh* Game. Ordinary UI and saved games have no route into that mode.
2. **Versioned snapshots:** diagnostic save data contains `levelArchitectureVersion: 2` and an immutable, normalized recipe. Restoring uses that original recipe rather than applying a new level layout. Existing saves contain no new fields.
3. **Coordinated opening:** custom recipes install Hanabi rockets/crates, Daruma, Stones and Moon Mirror fixtures together on every seeded opening retry; valid legal moves and lack of automatic matches are checked. No blockers vanish on reroll.
4. **Overlap constraints:** Bamboo holes, fixed blockers, mirrors, cargo and crates cannot occupy the same cell. Mirror directions must point onto the board. Wind shifts cannot contain fixed fixtures. Hanabi must have a reachable matching crate in its column. Existing Hanabi authored opener slots are reserved until its generalized opening builder arrives.
5. **Visual clarity:** Wind + Mist is disabled by default; `compatibility: { allowWindMist: true }` is the explicit *diagnostic-only* exception. This preserves the current art decision while allowing a future playtest.
6. **No forced win:** legal openings and three genuine options are required, but the player still needs to solve the objective. The Director cannot invent hits, fake deliveries or guarantee success.
7. **Bamboo deferred:** the compiler supports terrain later, but does not change current authored levels 51–60 and does not force Bamboo into early chapters.

## Scope boundaries / not yet done
- This step **does not** change the 1–100 level order, current authored goals, chapter identities, tutorial copy, rewards, stars, art, progression unlocks, player saves or Omamori.
- The `chapter` displayed in future v2 compiled designs still follows book-page groupings by index. It does not control which mechanics may appear.
- The first 100 redesigned levels, catalogue publishing and UI access are **Step B/C**, not silently enabled by this foundation.
- Pairwise combinations involving Hanabi + Moon Mirror are supported as separate physical fixtures, but **Hanabi light does not gain an untested reflective bounce** here. That interaction would need a separate rules prototype and tests.
- Source-level validators and seeded starts cannot substitute for real mobile playtesting or full difficulty calibration.

## Verification
- `tests/harmony-level-architecture.test.cjs` checks recipe compilation, invalid overlaps, the Wind/Mist default, early vs late Bamboo, fifteen authentic seeded games across three mechanic combinations, true swaps, stable save/restore and normal live-level isolation.
- GitHub Actions `Japanese Harmony & legacy checks` runs the new unit suite and `node --check`, plus all prior game and mobile browser tests.

## Next: Step B without a hard migration
1. Build a **hand-authored and version-controlled 1–50 level catalogue** using this schema, introducing Daruma, Mirror, Wind, Hanabi, Stone gradually.
2. Produce seed-paired quality reports for each mission: real legal choices, objective reachability, stall/shuffle frequency, completeability, chain satisfaction, goals and difficulty.
3. Playtest small batches (first 1–10, then 11–20, etc.) and design contextual onboarding; only publish completed batches.
4. Add a published-recipe resolver with an **old-save preference for the original level contract**, rather than replacing an in-progress board on upgrade.
5. Build a separate **51–100** catalogue mixing two mechanics on most advanced missions, with a small number of three-mechanic challenges and only exploratory Bamboo late.
