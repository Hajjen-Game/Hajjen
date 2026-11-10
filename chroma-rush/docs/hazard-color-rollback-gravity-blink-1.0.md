# CHROMA RUSH — Hazard Color Rollback 1.0 + Gravity Blink Fix 1.0
2026-11-10.

User rejected the all-zones Jump/Duck recoloring after playtesting. Revert
every palette and renderer color channel to its exact behavior before Hazard
Contrast 1.0: Jump = original **secondary**, Duck = original **primary**.
No new curated action colors and no extra hazard ramps in SpectralWave.

Keep **Jump Material 1.1** in full: stronger existing inset tint of
(material.inset or .18) + .10, capped at .34. Same 3px border, light shell,
rounded geometry, horizontal engravings, Duck parity, sizes and timing.

### Root cause of ceiling flash
Gravity Shift legitimately grants 0.86 seconds collision immunity when
rotation begins and 0.28 seconds on completion. Old player renderer blinked
whenever player.invulnerable > 0, so this INVULNERABILITY looked like a hit.

Separate the two concepts: damageBlinkRemaining controls only the visual
player alpha flash; REAL obstacle contacts set .96 and missed gaps set 1.15.
The underlying invulnerability logic during Gravity Shift and real hits is
unchanged. damageBlinkRemaining decays with simulation dt, resets with each
new run/menu, and is NEVER set on gravity begin/complete. Screen damage
effects and haptics remain tied to actual hits.

Add a rollback regression audit for all 24 original palette names and RGB
values, the three Chroma Tide channels and the kept Jump inset, plus
Gravity Shift vs genuine damage blink separation. Bump script asset cache
IDs and meta build marker.
