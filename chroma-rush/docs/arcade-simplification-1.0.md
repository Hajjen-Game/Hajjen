# Arcade Simplification 1.0 — Less is more

## Player-facing change

- **Retired:** long raised Echo Rail and long jump Twin Vault / zigzag Energy Bridge. Neither is selectable by the Director nor accepted by live spawn. Legacy modules are left in place only for historical audit fixtures.
- **Kept:** short Jump, hanging Duck Gate, physically wider Long Duck Gate, ordinary chasm and double-jump Echo Gap. Double jump remains available from the opening zones; Echo Gaps become the practical advanced jumping test.
- **One visual grammar:** Jump reuses the Duck Gate's neon side rails, translucent field, rounded structural cap and bright terminal beam, vertically inverted from the ground. Jump reads in the palette's secondary hue; Duck in its primary hue. Hitboxes are unchanged.
- **Gap-first pacing:** more eligible gaps in PEAK and BUILD, with less competing slope frequency. A normal gap must be successfully completed before the first Echo Gap; first Echo Gap is restricted to the floor and safe health/phase/movement conditions. Gap separation, full takeoff/landing protection and post-miss cooldown remain.
- **Less frequent Gravity Shift:** first at zone 7, repeating every 7 zones (instead of zones 3, 5, 7…). Safety warning, protected transition and floor-first mechanic introductions are retained.
- **Palette cadence:** existing 24 curated palettes now persist for two zones each. The Chroma Tide transition and charge sound run only on actual color changes; zone counters, scoring, speed and progress still advance each zone.
- **Retained endurance challenge:** high-zone Jump/Duck motifs, gap timing and recovery-safe density stay active; Dash controls and long Duck Gate survive. Dash is an optional mobility tool over gaps, not a mandatory hidden checkpoint.

## QA priorities

1. Landscape mobile test: Jump looks like an upside-down Duck Gate in all palettes, including low graphics and ceiling running. No confusing new geometry.
2. First 10 zones: basic jumps/ducks, one normal chasm before a full double-jump chasm, long Duck Gate first appears on the floor, first Gravity Shift only at zone 7.
3. Late run (zones 25–50): gap variety increases but is never bunched into physically impossible corridors; the Director maintains high-zone intensity and microbreaks.
4. Reduced Motion, pause, practice from unlocked zones and 10% HP recovery all need smoke coverage.

The older Echo Rail/Twin Vault compatibility code is intentionally not deleted in this pass, to avoid breaking old round-audit imports. It has no live spawn path.
