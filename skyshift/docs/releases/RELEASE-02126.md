# SKYSHIFT 0.21.2.6 — Road Solar Spill Containment

## Issue
User screenshots after the 0.21.2.4 rail fix and 0.21.2.5 hull fix still showed a broad pale/white illumination patch on the left road shoulder / deck in the sealed 0–368m neon tunnel. The earlier 0.21.2.3 road code retained 78% direct diffuse from the exterior world key, plus the indirect hemisphere response. Neutral PBR light thus remained on the road even when rail and ship material glare were separately isolated.

## Road-only fix
- Keep the original physical **one-batch integrated premium roadway** and all nine zone palettes.
- Seal external PBR road lighting at 0–340m, with smooth spatial fade to unchanged road at 368m.
- Inside the seal, multiply *remaining* direct world diffuse by 0.08; indirect diffuse by 0.20; direct specular by 0.08; indirect specular by 0.14.
- Intervene in `reflectedLight` **before** final outgoing/emission composition, HDR tone mapping and bloom. No global color multiplier, exposure reductions or neon shutoff.
- All lane lines, boost arrows, moving white-core wave, filaments, zone-tinted emissions, rail body materials, engine lights, ship, walls, geometry, GRIP, physics and camera remain unchanged.
- No additional draw batches, dynamic lights or render passes. Applies on both full and simulated 4GB fidelity paths.

## Exact A/B
- Default: `/skyshift/?v=0.21.2.6`
- Previously sunlit road only: `/skyshift/?v=0.21.2.6&roadSolar=classic`
- A diagnostic proof hook, when explicitly enabled, renders the previous and contained road **at exactly the same camera/flight position**, and a third image without the road for a pixel-only deck mask.
- Browser proof includes cyan at 165m, Solar Gold at 165m, Jade at 273m and simulated 4GB Solar Gold at 165m. Each diagnostic image is retained as a GitHub Actions artifact.

## Gates
1. Valid GLSL and successful game bootstrap in Chrome/real WebGL.
2. Measurable reduction on actual road pixels, not simply a changed ship/rail/tunnel photo.
3. No additional near-white road pixels.
4. Nine-color spectral source, lane emission and physical/GRIP invariants.
5. Existing 0.21.2.3–0.21.2.5 rail/ship regression suites remain active.
