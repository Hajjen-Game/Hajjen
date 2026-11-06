# CHROMA RUSH — Game Experience & Visual Audit 1.0

**Scope:** Existing single endless arcade mode, Adaptive Rush Director 2.0, Flow, rolling terrain/gaps, jump input and presentation. No new obstacles or alternate level selection. This is a technical/visual audit, **not** a statistically validated player-fun study.

## Verified findings and changes

1. **Back-to-back shield damage:** `onHit` respects the player's temporary invulnerability; `failGap` did not. A fall directly after another hit could therefore charge another 25 shield during immunity. `failGap` now consistently consumes the gap once and registers a Flow mistake but does **not** charge extra HP during the active invulnerability window. Dedicated regression test added.
2. **Short landscape menu clipping:** In a 640 × 330 browser viewport, the menu began slightly above the visible region. A narrow, height-specific scale adjustment keeps its entire content on screen without changing the gameplay touch targets. Test added.
3. **Canvas background and terrain seams:** Chromium now renders fixed flat, uphill/downhill and open-gap scenes at **1440 × 600, 900 × 410, 740 × 360 and 640 × 330**. Pixel comparisons verify that an exposed gap shows the *same background pixels* as the equivalent background-only scene. Screen captures and browser console errors are archived with the CI run. This protects the recent terrain/background rendering repairs.
4. **Results readability:** A completed run, including the new optional diagnostic export, fits in all four tested landscape viewports. The browser test also performs a real JSON download and inspects its schema.
5. **Missing gameplay evidence:** Previously there was no way to distinguish whether a player lost to boxes or gaps, how much time they spent in PEAK or RELAX, or whether Chroma Flow remained capped for too long. A new local-only, per-round log records these measures. The export is available on the results screen; no tracking, login, upload or persistent analytics is introduced.

## The round log includes

- Mode, starting zone, duration, final shield, speed, Flow and score.
- Obstacle spawns/clears/hits and ignored contacts during invulnerability.
- Cleared/missed gaps, terrain features, precision clears and Perfect Zones.
- Director phase transitions, accumulated BUILD / PEAK / FADE / RELAX time, highest observed stress/confidence.
- Max Flow, total time at Flow >= 65 and Chroma State >= 90, highest streak.
- Low-volume samples at roughly two-second intervals and a capped event list (600 entries, with an overflow count).

**Privacy:** the log contains no identifiers, contacts, browser fingerprint, precise timestamps, location or account data. The player must explicitly download it from a finished round.

## Visual test matrix (automated)

| Scenario | 1440×600 | 900×410 | 740×360 | 640×330 |
| --- | --- | --- | --- | --- |
| Menu within viewport | check | check | check | check |
| Flat floor | screenshot | screenshot | screenshot | screenshot |
| Continuous downhill + uphill | screenshot | screenshot | screenshot | screenshot |
| Open gap with real full-height background | screenshot + pixel check | screenshot + pixel check | screenshot + pixel check | screenshot + pixel check |
| Result screen + export button within viewport | screenshot | screenshot | screenshot | screenshot |
| Browser errors and horizontal overflow | check | check | check | check |

Browser images are captured with Chromium using test-only scene injection, never shipped as a debug API inside the production game. GitHub Actions uploads them as a temporary `chroma-visual-audit` artifact.

## Gameplay design observations (not yet validated by player telemetry)

- **Director split:** obstacles are chosen from 12 authored motifs, but hills and gaps are generated independently. Terrain can veto an unsafe obstacle spawn, which prevents certain impossible combinations but does not create intentional terrain/obstacle dramaturgy. **Recommend Unified Terrain Director** after this audit.
- **Flow saturation:** a clean early run can reach Chroma State quickly. The log's `chromaSeconds` and `maxFlow` metrics will let us quantify whether Flow remains capped too long before retuning the economy.
- **Short sessions are intentional:** this audit does not impose an arbitrary 5–20 minute survivability target. Fairness in the intended 2–3 minute round is still important.
- **Sound preference:** separate music and effects controls are an independent, later UX task. This audit deliberately leaves the sound mix unchanged.
- **Touch targets:** the game remains playable with two buttons; avoid shrinking their active areas simply to create more visible pixels.

## Suggested human playtest procedure

Collect a small sample of runs at the current build on a physical phone. For each, export the round JSON and note (1) whether each death felt fair, (2) whether the reason was a gap or a box, (3) whether Flow/Perfect Zones felt meaningful, and (4) whether the screen remained readable during PEAK. Compare several rounds rather than tuning based on a single unlucky seed.

**Limits:** Headless browser rendering and Node regression tests cannot measure subjective enjoyment, thumb comfort, audio balance on real phone speakers or actual mobile frame pacing. The screenshots are controlled fixtures, not proof that every randomly generated course is visually or physically perfect.

## Development commands

- `node --test chroma-rush/tests/*.test.cjs` — game rules, Director and diagnostic modules.
- `python -m pip install playwright==1.57.0` and `python -m playwright install chromium` — one-time local browser tooling.
- `python chroma-rush/scripts/visual-audit.py` — screenshot matrix, on-canvas pixel checks, responsive UI, diagnostics download. Set `CHROMA_CHROMIUM_PATH` to use a system Chrome/Chromium executable.
