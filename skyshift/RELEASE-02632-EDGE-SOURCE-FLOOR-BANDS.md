# SKYSHIFT 0.26.3.2 — Edge Source Reposition & Connected Floor Light Bands

## Reference-driven correction

Compare actual WebGL capture (0.26.3.1) with the supplied cinematic goal image:
- The cyan rail light in 0.26.3.1 sat midway up the beveled rail, looked like a razor-thin **nearly continuous** neon line. Reference light is a **wider, short inset at the LOWEST rail/ground junction** and sends selective streaks over dark asphalt.
- Amber 0.26.3.1 foot practicals appeared disconnected from isolated round shoulder floor spots. Reference shows **one longer, wider continuous light band** growing from the base of each vault rib onto the floor.
- Original cyan ceiling coves and warm wall strips already exist. Do not duplicate or turn up world exposure in this pass. No bloom/tonemapping changes; those remain Pass 4.

## Implementation

A new release-gated module, `edge-source-floor-bands-v02632.mjs`, replaces (not overlays) the 0.26.3.1 rail/foot module when `?v=0.26.3.2`. `?v=0.26.3.2&edgeSources=classic` selects exactly the 0.26.3.1 implementation for comparison.

### Cyan rail
- Physically attach to the **original AERO_PROFILE bottom sloping face**, using its -1.03/+0.035 to -.78/+.245 cross section and original banked `positionAt`.
- Mount near **0.05–0.22m**, below the former .31–.36m location; span ~18cm across the original slope instead of an extremely narrow 5cm line. No rail geometry or collider edits.
- **Short sections only:** one 6.5m emitter per 24m bay, with 17.5m dark negative space (versus former 22.7m lit + 1.3m dark).
- Native road GGX uses the same finite, source-bound cyan positions and new segment gating, broad glancing response close to the road edge, dark center lane / protected guide arrows. Mobile uses 1 GGX sample, high uses 2.

### Warm arch-foot connected band
- Original 10 ribs × two sides = 20 practicals.
- Every practical and its shoulder illumination share **one RGBA geometry and one material**. The foot is a ~2.3m longitudinal amber source, root following the original vault rib at x≈17.77m; the attached floor band extends ~12.4m along the original banked shoulder and 8.7m laterally.
- Tapered longitudinal + lateral alpha with strong source ridge, continuous source-to-floor transition rather than two disconnected glows. No change to racing deck/rail/tunnel geometry or physics.
- Total effect remains **two visual draw batches**: cyan lower insets, and warm integrated foot/floor bands. No extra dynamic lights, shadow maps, PMREM, SSR or image-based illumination.

## QA / release gates
1. New deterministic unit assertions for ground-level positioning, 6.5m / 17.5m duty cycle, original road-index preservation and 20 connected bands.
2. Real Chromium WebGL at **8GB high + 4GB** across two Gold locations and Violet; same-camera 0-vs-1 captures validate road reflections, shoulder light and absence of neutral white spill.
3. An explicit classic fallback verifies `?edgeSources=classic` returns 0.26.3.1.
4. All previous 0.26.0–0.26.3.1 regressions, physics/GRIP/ship and the original white solar seal must stay green.
5. Do not merge if the photo reveals detached pools, full-length rail lines, bright white road, or severe mobile frame regression.

## Lighting not included
Pass 4 remains dedicated to overall bloom, contrast, grading, fixture falloff calibration and final visual cohesion once the physical source layout is correct.
