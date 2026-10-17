# Wildpath — Tree Study 7.0: Silhouette First (Pass 17)

**Live preview:** https://hajjen-game.github.io/Hajjen/wildpath/tree-study/?rev=17

This is a standalone art benchmark. **No gameplay files are changed.** The user's approved artistic reference remains the target: an organic fantasy tree with richly overlapping individual leaves arranged in recognizable rounded crowns, not spiky ferns, uniform flowers, or flat solid blobs.

## Why 7.0
User's Tree Study 6.0 mobile images exposed fern-like, spiky peripheral shapes, despite the improvement in leaf direction. The geometry was dictating the silhouette instead of the other way around.

## Changes
- Start from the successful **Tree Study 4.0 curved trunk / six main branches**, retaining bark and roots.
- Define **nine intentional, rounded overlapping crown envelopes**. These are non-rendered guides, **not** visible spheres or green filler masses.
- Distribute curved vertex-shaded 3D leaves across both shallow inner and outer envelope layers, with controlled downward/tangential growth and softened edge outlines.
- Darker internal forest greens, warm exposed tops and some non-radial secondary leaves for occlusion.
- New **Silhuett** toggle applies a neutral monochrome material to the actual 3D tree meshes. The camera remains interactive to evaluate silhouette from overhead, side and oblique angles.
- Focused mobile viewer preserved. Dynamic Pass/Title identity is populated from the active renderer version, and all version imports / stylesheet references have version query suffixes.
- Add `rev=17` to comparison/navigation links and recommended entry URL to avoid revisiting old cached HTML that previously showed PASS 15 over a 6.0 scene.

## Versions
- v7: `?rev=17` (default)
- v4: `?tree=v4&rev=17`
- v5: `?tree=v5&rev=17`
- v6: `?tree=v6&rev=17`
- v1–3 still selectable.

## Mobile acceptance
1. Tap **Silhuett**: does the crown read as naturally rounded, with 8–9 graceful contour lobes rather than spikes?
2. Toggle **Visa färger** and compare density, color and leaves, especially from the side and overhead.
3. Rotate to multiple angles. Check FPS on the Android device, since static tests cannot prove rendering performance.
4. If silhouette fails, adjust envelopes and leaf growth, not the sheer number of leaf polygons.

No paid tools, imported models or third-party 3D services.
