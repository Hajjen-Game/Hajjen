# Phase 2 — Signature Experience / Chroma Surge 1.0

## Product intention

Turn CHROMA RUSH's two-zone palette changes into memorable skill moments, not only cosmetic transitions. Modern, high-refresh mobile phones are the primary quality target; older low-power devices are not a product-design constraint. Keep existing graphics presets and reduced-motion accessibility as rendering choices, not gameplay changes.

## Implementation

- Real Surge begins at the moment the **existing Chroma Tide crosses the player**, once every real palette chapter change (approximately every 24s, first at zone 3). It does NOT begin on every 12s zone increment.
- The Surge lasts **4.8 gameplay seconds**. During this window only legitimate obstacle/gap clears increase a 1–4 chain and award extra points (95/130/165/200 at normal quality; +35 precision, +25 master). A hit breaks only the Surge chain. No extra damage, collision, speed or hazards.
- A clear during invulnerability never earns Surge bonus; protected transition contacts are excluded. No forced Dash or new button.
- Original procedural music adds a brief beat-locked upper-register layer, lifts quiet phase music to keep Chroma Surge audible, and uses distinct original crossing/chain accents. No external or copyrighted music samples.
- HIGH visual tier draws 13 layered luminous horizontal filaments, track underlighting and a linear on-clear wake. Balanced draws 8 and Performance draws 4. These are behind the obstacles; no standalone pre-wave square, flash, ring or opaque obstacle-like shapes.
- Live Surge chain is shown only temporarily within the existing center HUD. Menu and Run Complete layouts remain unchanged. Reduced-motion keeps the gameplay bonus but suppresses moving VFX.
- Existing downloaded round JSON now includes summary.surge starts, completions, interrupted windows, clears, breaks, best chain, bonus points and active seconds. No network/telemetry collection or player identifiers.

## What deliberately remains unchanged

Core Pace & Gravity Rebalance 1.1, including approximately 3–4 minute high-intensity target and the 16-second safe ceiling excursion. Adaptive Camera Horizon 1.1, Flow scoring, Jump/Duck/Dash physical behavior, Director and terrain spawning also remain unchanged.

## Next Phase 2 validation gates

- In real play: visually distinguish Chroma Tide from the skill-active Chroma Surge without obstructing hazards.
- Check that there is at least one meaningfully reachable action in most Surge windows; the first pass does not force new hazards and some windows may be empty.
- Measure bonus-window clear/hit outcomes and whether players report a better sense of anticipation at color changes.
- Compare original soundtrack with music muted and manually check the mix on a current iPhone/Android; browser tests cannot assess emotional musical quality.
- After validating this first pass, consider earlier (around 40–60s) Gravity Shift *only if* it doesn't compromise onboarding or the newly tuned short-run experience.

**Phase 2 is started, not complete.** Chroma Surge 1.0 is the first signature implementation and still needs actual hands-on playtesting.
