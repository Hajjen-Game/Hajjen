# Moon Mirrors 1.0 — Playable Pulse Integration
31 October 2026 · first playable prototype on the actual game board

## Where to play
Open the Japanese Harmony main menu, expand **Game Settings**, then choose
**Moon Mirrors · Preview**. Three unranked, opt-in scenarios use the real
7×7 mobile board, normal swaps, real Fusion Destination Control, stage-5
Harmony Pulse, gravity, Director 4.0 refills and native animation playback.

1. **First Reflection** — one mirror, one remote target.
2. **Moonlit Mist** — two mirrors cleanse two separate Mist cells.
3. **Reflected Harmony** — reflect a stage-five Pulse into a stage-four
   treasure to create a second masterpiece and a second Pulse wave.

To see the signature behavior immediately, swap the stage-four treasure
at **row 3, column 4** down into the center (**row 4, column 4**). This is a
real, valid player move, not a scripted animation or fabricated win.
These three *teaching showcases* intentionally allow a first-move clear;
they are **not** calibrated difficulty levels or evidence of retention.

## Gameplay rule
- **Updated 31 October — Moon Mirrors 1.1:** a mirror is a dedicated,
  unmatchable, immovable board fixture with its own visual artwork. It
  REPLACES the treasure at that cell, rather than covering a family icon.
  A mirror is never a stage-1–5 family object, cannot be fused, upgraded,
  shuffled or moved by gravity, and acts as a stable gravity boundary.
- The ordinary stage-five Pulse still targets its four orthogonal cells.
- When one of those cells holds a mirror, the energy also reaches ONE
  additional adjacent cell in the mirror's displayed arrow direction.
- A mirror does **not** reflect a reflected hit recursively. Extra Pulse
  waves arise only when a real object advances into a stage-five
  masterpiece; each such wave may interact with mirrors normally.
- Repeat destinations are de-duplicated within each wave.
- A reflected hit upgrades ordinary objects, clears Mist on occupied
  **and empty** cells, hits Daruma once and Sealed Stones once per
  player decision, using the same contracts as an ordinary Pulse.
- Terrain is excluded. No hidden move, special RNG distribution,
  guaranteed win or Director rescue is introduced.
- At the engine level, `moonMirrors` and optional prototype identity
  survive save/restore. There is no migration of old live games.

## Visual and export
- The full mirror cell contains a brass-framed silver glass object with
  a centered directional arrow and **no family sprite underneath**.
  Its orientation and fixed nature are in the accessible label.
- Reflected beams have silver-blue highlights and are prioritized
  within existing mobile VFX limits, without capping game logic.
- Opt-in JSON export records mirror positions, reflected destinations,
  original Pulse source and direction. Preview results are marked
  `unranked`, with zero archive stars in export.
- The Omamori bar is unavailable in previews; no real card is consumed.
- Preview completion bypasses permanent stars, coins, stamps,
  unlocks, reward history and saved run replacement.

## Verification and known limitations
- Twelve actual-engine regression groups cover standalone fixed mirrors,
  valid openings, real stage-five Pulse
  routing, empty Mist, Daruma, Stones, second-wave chains, deterministic
  real-game save/resume, normal-game isolation and voluntary export.
- Earlier pure planner regressions remain in the CI suite.
- A separate 390px browser smoke test checks visible arrows, preview
  completion and preservation of an already-saved normal run.
- **Browser CI is wired but should not be considered green until its
  workflow completes**. A final hands-on test on Android is still needed
  for visual hierarchy and animation polish.
- Mirrors currently extend a Pulse by one hop; whether redirecting
  instead of extending leads to better puzzles is an open playtest choice.
- These are deliberately introductory demonstrations, not final chapter
  71–80 content. Levels 1–100 remain in their existing order.

## Next candidate
**Moon Mirrors 1.1 — Spatial Puzzle & Mobile Polish**:
create three genuinely strategic authored mirror layouts with several
plausible moves and varying board geometry; test readability and
difficulty with people before committing any permanent level sequence.
After that, prototype **Wind Garden 1.0** rather than extending Mirror
effects solely for spectacle.

## 1.1 player feedback change (31 October 2026)
A playtester noticed that a mirror drawn over a family treasure felt
like the wrong game object. Moon Mirrors now completely occupy their cells;
ordinary treasure art is removed. The first-move preview is redesigned around
a vertical swap (row 3 column 4 to row 4 column 4) so the new fixed mirror
cells do not hide one of the fused treasures. Moonlit Mist
now uses mirrors at zero-based indices 25 and 31, reflecting toward 26 and
38. The second-wave chain keeps indices 25 and 33. The intro hit target in
the deterministic chain showcase is six real upgrades. No normal levels or
permanent player progress were migrated.
