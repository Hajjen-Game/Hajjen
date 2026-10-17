# Wildpath Tree Study 11.0 — Lower Trunk & Softer Fork (Pass 21)

Preview: https://hajjen-game.github.io/Hajjen/wildpath/tree-study/?rev=21

The user explicitly requested a shorter visible trunk and a lower crown nearer the supplied lush stylized fantasy tree reference. Version 10 was visually too angular and generated root claws and a giant dark fork junction on Samsung Galaxy A51. This pass corrects the actual wood geometry, not only colors or test labels.

## Changes
- New `tree-model-v11.js`, constructed with **the identical 9.0 foliage algorithm and nine crown descriptors**.
- Shifts all crown centers rigidly **0.62 units downward** so foliage starts lower and the trunk-to-crown ratio approaches the target reference. Blossom positions follow the same crowns. All relative lobe/leaf positions and shading are unchanged.
- Replaces v10's hand-ring wood meshes with Babylon's smooth curved **tube sweeps**, no huge artificial fork bulge or flat-sided knot.
- Trunk top is lowered and the first support branches start around **Y=2.66–3.14** rather than the v10 fork at Y=3.28–4.01, with shorter visible wood leading into foliage.
- More gentle painted umber bark, no nearly-black patches.
- Root foot uses a gentle bell flare and three very short buttress paths that end at or just below the soil edge. No long, projecting claws.
- Keeps six softly tapered main branches and four secondary stems inside foliage.
- All previous versions 1–10 remain available in the independent Tree Study viewer. No main game files touched.

## Comparison
- 11.0 (default): `?rev=21`
- 10.0 (previous trunk): `?tree=v10&rev=21`
- 9.0 (pre-trunk wood): `?tree=v9&rev=21`

## Checks and acceptance
Validate geometry for finite vertices, correct leaf mesh indexes and positive swept-wood radii. Run GitHub unit/browser regression and wait for **successful GitHub Pages deploy**, not just a successful repository commit. On the user's phone, judge in near view and side view: shorter exposed trunk, lower first branching, smooth fork and a subtle root base, while retaining the 9.0 foliage quality. The canopy remains a prototype requiring separate refinements.

No paid art, external 3D imports or proprietary assets.
