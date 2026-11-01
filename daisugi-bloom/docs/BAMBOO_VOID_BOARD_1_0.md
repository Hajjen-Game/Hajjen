# Bamboo Void Board 1.0 – Tileless Openings (experimental)
1 November 2026. Player screenshot: Level 58, 7×7 grid.

## Design
No decorative Bamboo stones / beige closed squares. Where the chapter has a permanent closed garden cell, its board tile is visually **absent**: no border, shape, shadow, sprite, hover or hit target. The underlying board texture is visible behind. The grid coordinates remain intact in the DOM so all 49 indices used by gravity, Wind, Director, hint and FX retain their existing meanings. Closed cells have no keyboard focus and are hidden from assistive technology.

For levels 58–60, the screenshot's missing central eight cells are expanded to an entire 3×3 square by adding index 24, the formerly playable center cell, to the existing eight-cell `centralShrine` layout. All nine positions: [16,17,18,23,24,25,30,31,32]. 40 playable tiles remain. Other Bamboo levels use the same coordinates as before but draw no blocked stones.

## Save/migration
Keep the `terrain` sentinel pieces and `boardMechanics` data intact. Newly started levels 58–60 use `{layout:"centralShrine",blocked:[24]}`; older saves store their own normalized blocked geometry and **retain their original eight-cell center ring**, including the playable center. No reset, save migration or global board rule change. Existing winding Wind level 54 remains unchanged mechanically.

## Evaluation
The user asked to **see** the tileless layout before changing chapter branding, objectives or the overall board shape further. Test a new Level 58 round or its unranked Bamboo Preview; the playfield holes do not award bonuses or remove any game mechanics.
