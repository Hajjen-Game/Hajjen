# Wind Garden Animation 1.2 — Continuous Streamlines
31 October 2026 · visual correction after real Android screenshots

## What the playtest showed
Six screenshots of the First Breeze preview show the permanent wind reading as **one soft, round, bright white Mist patch** drifting across the middle-right of the fourth row. Its white center obscures koi, lantern and bonsai artwork locally. While the wind is continuously moving, it does not communicate a whole-row, one-direction **airflow** well. The player also observed that the extra strength of the gust at the instant of the row shift was probably unnecessary.

## Revised art direction
- Keep the wind **continuously visible before any move**, always on the row and direction of the next scheduled wind shift.
- Replace large radial cloud banks with **three staggered, elongated horizontal air streaks**, each a collection of extremely thin, soft Mist-like gradients spread across the entire row.
- All streaks move in the **same direction**. Directional resets occur completely outside the clipped row; no backwards travel.
- A much softer stationary atmosphere spans the entire row so the effect remains recognizable between streaming streaks.
- **Remove the separate bright one-shot wind cloud** at the scheduled shift. The actual one-cell movement of seven treasures becomes the main payoff. At most a tiny brightness change while they move.
- Keep transparent gaps and far less white pigment over the icons; no new sprite, canvas or overlay covering individual objects.
- Do not alter row direction, timing, shuffle, physics, rewards or Director behavior.

## Implementation
`harmony/app.js` keeps one stable `windAtmosphere` holder for a complete preview round and now creates three concurrent staggered wind wisps. Its `directionalWindSweep` calls the genuine identity-preserving `flipMove`, but no longer creates a second transient opaque cloud layer.

`harmony/wind-garden.css` defines `wind-stream-right` and `wind-stream-left`, moving three translucent thin filament gradients in the forecast direction. Each loops at a slightly different period (3.2, 4.0 and 4.8 seconds). The stronger white radial-gradient gust and its opacity burst have been removed. The one-time wind move may increase ambient contrast only slightly.

`index.html` loads cache-busted app and CSS resources so Android does not silently keep the previous white blob.

## Verification
- `harmony-wind-sweep-browser.mjs` now checks the ambient wind exists BEFORE the first move, has three staggered, same-direction animations, spans the full row, does not create a one-shot cloud on a real shift, and retains the same DOM element when the next row/direction changes. Reduced-motion and existing player progress remain protected.
- Wind Garden and Moon Mirrors game-engine regressions remain unchanged; the gameplay logic is not modified.
- The actual Android rendering still needs player review. Judge if the wind is visible enough, whether its direction is obvious, and whether the ornaments remain readable without a white haze.
