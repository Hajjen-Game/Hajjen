# Hanabi Launch Telegraph 1.0 – Sequential Column Marking & Glitter Pulse

## Design intent
After a firework drops from the square above into the fixed crate, the six cells in its launch column should **mark in order, bottom to top**, using the existing Harmony Pulse anticipation ring. The player sees every intended column cell BEFORE any particles are fired.

## Chronology
1. Real cargo is delivered into its fixed crate using the existing 1.1 intake animation. The engine already records the `hanabi-delivery` event.
2. Add one `pulse-anticipation-glow hanabi-telegraph-glow` marker at a time: `at-7`, `at-14`, …, `at-42`. Each charges for 76 ms, all remain visible together for 100 ms.
3. Launch **glitter motes**, not a solid laser. The Score Motes-inspired core and long staggered tail travel upward for ~540 ms in gold, pearl, pink, orange and violet; the mobile display budget is 36 particles, lower on lite devices.
4. Small glitter rings impact only the six cells in that column, in the same travel order. The genuine rules/goal progress occurs exactly as before; the updated sprites render once at the end, not in a whole-board blink.

## Boundaries
- Presentation only; no new moves, stage changes, objectives or refills.
- No mutations to player saves, reward economy, or Director.
- Old Hanabi/Lotus rounds keep their previous mechanics and user-facing objective; event animation can be shared.
- Reduced motion skips flashing/telegraph and shows the correct updated board immediately.
- FX and pulse markers are removed in `finally` to avoid dangling overlays, and the effect runs inside the existing event animation queue.

## Hanabi Launch Telegraph 1.1 – player feedback, 1 November 2026

The player confirmed the five-colour glitter looks good, but reported empty top tiles receiving fake visual hits, a slightly laggy sequential mark, and excessive circular hit rings.

- Mark only cells represented in the real Hanabi launch event: treasure upgrades, Daruma and Sealed Stone hits, Mist clears, and occupied visual-only targets. Skip truly empty/unmist-covered cells. End the launch trajectory at the highest relevant cell (do not shoot at blank rows above it).
- Keep each target's existing square mark, but replace rotating mask/orbits with a single warm rectangular glow; animate the mark itself on contact. Remove all separate circular impacts.
- Schedule all marks on the compositor at staggered offsets, rather than waiting in a JS loop for each tile; avoids repeated main-thread animation promise barriers on Android.
- Increase five-colour glitter particle size from 7 px to 9 px; core size from 14 px to 18 px; travel time from 540 ms to 680 ms. Keep the original five colours and trailing motion.
- No gameplay, objective, economy, saved-runs or Director changes. One genuine delivery still produces the same full logical column effect. Only feedback targets are filtered.
