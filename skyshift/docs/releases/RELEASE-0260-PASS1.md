# SKYSHIFT 0.26.0 — Dual-Tone Lighting & True Metal Materials · Pass 1

## Goal
Correct the single-hue tunnel in actual 0.25.1 screenshots: target dark gunmetal, retained zone-specific arcs, *simultaneous* independent cyan and amber lights. This is Pass 1 lighting only, not the Pass 2 PBR material conversion.

## Changes
- The original 0.25.1 sun-isolated metal shader receives a restrained, source-local two-tone correction after the complete 0.25.1 brushed finish; broad zone-tinted material bounce is reduced and graphite darkened. Existing real geometry, microstriation, recess shading and native emitter palette preserved.
- Metal now responds independently to **permanent icy cyan** around the real banked high-wall coves and original wall/roof emitters, and **warm amber** near the original 20 portal sconces. The dominant 9-zone color wave is still the native `INTEGRATED_LIGHT` emitter; no new color clock or white-core replication.
- A single static vertex-colored mesh batches 20 fixed cyan upper-wall cove strips (both sides of 10 original portals), plus 20 tiny short cyan portal accents on high tier. Mobile uses 20 simple strips. Existing 20 orange sconces stay untouched.
- +1 draw call, zero dynamic lights, textures or new postprocess passes. Road, 0.24.2 road reflections, ships, rails, camera, GRIP, physics, original 0.25.1 metal geometry and exterior solar seal unchanged.

## Compare
- Candidate `/skyshift/?v=0.26.0`
- Same-build original `/skyshift/?v=0.26.0&dualTone=classic`
- Same-camera actual WebGL proof `?dualToneSmoke=1&dualToneFrameProof=1&trackRepairSmoke=1&waveSmoke=1`.
- Chrome captures cyan/violet/gold/jade near, mid, and late tunnel, plus simulated 4GB; pixel QA checks simultaneous cyan+orange in violet/gold, stronger cyan than previous, dark metal, native neon, original road and no new white spill.
- Workflow artifact: `skyshift-v0260-pass1-dual-tone-visual-proof`.

## Scope
The native `MeshBasicMaterial` remains until the separately planned 0.26.0 Pass 2 *True Metal Materials* prototype. These are deliberately authored local lights, not physical GI, SSR or normal/roughness texture maps. No paid plugin, no new gameplay changes. If actual screenshots do not noticeably improve color composition, tune/hold before merging.
