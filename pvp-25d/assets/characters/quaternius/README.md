# Quaternius character experiment — PvP 2.5D

This A/B character renderer uses the free **Modular Character Outfits - Fantasy
[Standard]** pack by Quaternius.

Source mirror used by the automated build:
https://github.com/agentkaerf/FreeModels

Original author:
https://quaternius.com

License: CC0 1.0 Universal / Public Domain Dedication.

The build uses Male_Peasant as the caster base and Male_Ranger as the
light/heavy base. Blender removes the Ranger hood, creates a small hatless
low-poly head, flattens the large texture atlases into compact game materials,
and exports three local GLBs:

- quaternius-caster.glb
- quaternius-rogue.glb
- quaternius-warrior.glb

This is intentionally isolated behind quaternius.html / ?characters=quaternius
so the existing Tiby experiment remains available for comparison.
