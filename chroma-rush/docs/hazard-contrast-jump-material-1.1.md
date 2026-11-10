# CHROMA RUSH: Hazard Contrast 1.0 + Jump Material 1.1

User requested more distinguishable Jump vs Duck colors in many zones,
particularly the well-liked REDLINE combination: Duck red, Jump yellow.

## Audit findings
The original 24 world themes had primary/secondary hues which often looked
nearly identical (CYAN, MAGENTA, WHITEOUT, COBALT, HOTPINK, ICEBLUE).
Both obstacles had the SAME shell gradient (.30), the SAME 3 px outer border
and the SAME inset geometry / fill (.18); Duck's long overhead energy veil
gave it a more impressive perceived fill than a plain grounded Jump.

## Implementation
- Give each of the existing 24 two-zone world themes two independently
  art-directed action colors: hazardDuck and hazardJump, maintaining ALL
  pre-existing world primary/secondary/shadow colors and background art.
- REDLINE (zones 13–14): Duck red #ff466c, Jump yellow #ffe25b.
- Across 24 theme pairs, min OKLab difference >0.24; across *all 24 adjacent
  perceptual palette transitions*, the weakest intermediate difference >0.20.
- Add the two new channels to SpectralWave's existing precomputed OKLab LUT
  (on zone transitions). Both barrier types respond to the same spatial
  Chroma Tide front without additional draw passes or per-frame color math.
- Keep geometry, world-lighting shell, border, bright rim and horizontal
  engraving of Jump unchanged; strengthen only the EXISTING Jump inset
  color fill by +0.10 (capped at 0.34) for a more substantial appearance
  relative to Duck's large illuminated energy area.
- Long Duck uses the same Duck hazard color; former legacy Echo Jump shares
  Jump's role. Physics, speed, Director and all hitboxes remain unchanged.
- HTML build marker and all 3 changed JavaScript asset URLs are cache-busted.

## Regression
Covers every color and 65 perceptual LUT steps of each theme transition,
both-hazard spatial sampling, physical/core material parity and cache wiring.
