# Wind Garden Animation 1.0 — Directional Row Sweep
31 October 2026 · visual-only pass on Wind Garden 1.0 prototype

## Playtesting
Open **Game Settings → Wind Garden · Preview** and try **First Breeze** (wind to the right) and **Garden Tide** (wind initially left, then right). Each successful scheduled shift creates an unmistakable whole-row mist-like sweep in the announced direction. Mist and all board rules are unchanged.

## Art direction
The user requested an effect from the existing **Harmony Mist Motion 1.2** visual family, but spread over all seven tiles as a single coherent horizontal band and moving exclusively in the actual wind direction.

- **Anticipation:** a fine pearl-and-mint haze washes over the *entire* selected row for 105 ms.
- **Movement:** one elongated translucent cloud front crosses the row in 330 ms, from left to right or vice versa, following the scheduled direction. Its two internal cloud pockets travel **together** with the same parent, not in opposite directions.
- **Tiles:** the real, identity-preserving row slide starts at the same time and takes 235–240 ms; the edge piece gently disappears and re-enters on the opposite side. No gameplay input is simulated.
- **Dissipation:** opacity falls away during the last phase of the cloud sweep; the transient layer is destroyed immediately afterward, even on interruption.
- **Readability:** low-opacity mist-inspired radial gradients, no sharp rectangular fill, no per-tile puffs, no blurring or filters over the treasures. The full-row band is clipped to the actual line of seven tiles; it does not overflow the page.
- **Accessibility/performance:** decoration is aria-hidden, pointer-transparent, and skipped for user-selected Reduce animations, OS reduced motion, background tabs, and browsers lacking Web Animations. The logical row shift always happens.

Implementation: `directionalWindSweep` in `harmony/app.js`, styles in `harmony/wind-garden.css`. Uses the existing board geometry, one transient `makeFxLayer`, one row span, one haze span, one cloud span, and the existing `flipMove` compositor. No new canvas/image asset, frame-by-frame scripting, timer loop, Director manipulation or extra game mechanic.

## Validation
- Wind Garden engine tests and Moon Mirrors engine regression groups rerun after the presentation change.
- New `harmony-wind-sweep-browser.mjs` checks a 390px mobile viewport, single full-row overlay covering all seven tiles, only one left/right animation vector, cleanup after the turn, no pointer capture, reduced-motion bypass, and unchanged saved progress.
- The browser test is wired into GitHub Actions, but **the full browser CI result has not been confirmed**. A visual Android playtest remains important to tune haze strength and perceived direction.

## Next
Ask whether the direction is obvious without looking at the label, whether the sweep stays visible on the phone while still showing treasures, and whether First Breeze feels too repetitive compared with Garden Tide. If the direction is clear but too subtle, adjust the cloud opacity/shape and timing in CSS without changing the rule schedule.
