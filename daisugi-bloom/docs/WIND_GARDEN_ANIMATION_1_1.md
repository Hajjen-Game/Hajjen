# Wind Garden Animation 1.1 — Continuous Directional Wind
31 October 2026 · corrective playtest pass

## Player feedback
The first Directional Row Sweep only appeared when the row *actually shifted*. The desired experience is different: **the affected row should visibly and continuously carry moving wind during normal play**, with a **shorter, stronger, faster burst** when the scheduled shift happens.

## New player-visible behavior
- On entering **Game Settings → Wind Garden · Preview**, the *next scheduled row* immediately gets a continuous, mist-like horizontal airflow.
- One persistent translucent band covers **all seven cells**. A quiet pearly haze stays in the background while **two soft, asynchronous wisps** flow across in the **same scheduled direction**. The clouds disappear invisibly at the edge before restarting from the correct entry edge; there is **no reverse drift or alternating animation**.
- The layer remains alive between moves and **does not get recreated on every render**. An unrelated swap, invalid move or refill does not stop or reverse it.
- When wind actually shifts, the existing band briefly accelerates (ambient wisp cycle about 1.0 seconds during the burst) and brightens, overlaid by a stronger **285 ms** directional gust (previously 330 ms). The actual seven object positions still move simultaneously, with existing safe edge wrap.
- After the gust, the continuous band remains. If the next scheduled shift changes **row or direction** (Crossing Winds / Garden Tide), the same layer changes to the next forecasted row/direction once the move finishes.
- On leaving, restarting or switching to a normal level, remove the persistent wind layer. The temporary burst layer is always removed in `finally`.
- Reduced animations (in-game or OS setting) hide perpetual moving wisps while keeping a quiet static row indication; wind mechanics and turn counts do not change.

## Implementation
- `harmony/app.js`: one persistent `windAtmosphere` holder, `syncWindAtmosphere`, `positionWindBand`, `clearWindAtmosphere`; updated `directionalWindSweep` for a brighter 285 ms burst. Synchronize on preview start, on forecast change **after turn playback**, on resize, and clean up when leaving.
- `harmony/wind-garden.css`: Mist-inspired persistent haze, two GPU-transform wisps with monotonic left/right keyframes, brief boosted cycle on an actual shift; reduced-motion safeguards. One layer total, not seven per-tile puffs.
- `index.html`: cache-bust JS and CSS on Android.
- No changes to `harmony/wind-garden.js`, `rules.js`, levels, Director decisions, player data, reward logic or moving pieces.

## Validation
- App JavaScript parses and both Wind Garden + Moon Mirrors rule regression groups should continue to pass.
- `harmony-wind-sweep-browser.mjs` now checks:
  1. moving ambient wind exists **before the first swap**;
  2. both wisps move in the same announced direction;
  3. exactly one continuous band survives actual movement, and the 285 ms gust disappears;
  4. Crossing Winds keeps the same band through a non-wind move, then repositions to the next row;
  5. Garden Tide changes direction after the shift;
  6. user reduction setting removes constant movement, without changing wind gameplay or a saved normal run.
- Browser CI is wired but is **not confirmed green** until GitHub Actions completes. The next human Android test should judge visibility over the treasures and whether the burst is strong enough.

## Possible follow-up
If the ongoing air is still hard to see, fine-tune opacity and contrast only; if there is too much distraction, slow or thin the two continuous wisps while keeping the impact burst fast. Do not alter puzzle logic simply to solve visual feedback.
