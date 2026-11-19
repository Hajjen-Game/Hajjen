# SKYSHIFT 0.21.2.4 – Rail-Body Highlight Isolation

## Verified root cause
User desktop screenshots still show broad WHITE shafts along left and right railing in 0.21.2.3. The hot strip is not the neon light material, the road's PBR material or the camera exposure. The separate three-pass aero railing has a metallic PBR **body** mesh (`Angular integrated aero-barrier body`, metalness .72, roughness .32) and an independent saturated colored **inlay**. Real Chrome WebGL diagnostic captures from precisely the same 165m camera show **4,312 nearly-white rail-side pixels before**, 4,310 when the colored inlays are hidden, and **122 when the rail body is made matte**; disabling bloom removes some smear but not the source. This is a verified material root cause, not another fog/atmosphere hypothesis.

## Implementation
- Keep 0.21.2.3's ship/road/rail-neutral correction, the complete dark neon megatunnel geometry, color-wave transition and original postprocessor.
- Each existing rail body vertex now has the true track arc-length `aBarrierArc`, so its PBR finish can respond to the enclosing tunnel interval without changing the width or physical rail collision.
- Only for 0–340m (return smoothly to standard PBR by 368m), make the *body* darker and matte; metalness 0.04 instead of .72, roughness .98 instead of .32, suppress external direct/indirect white specular to 5.5%/10% and reduce diffuse color.
- Colored inlay remains its original zone-reactive MeshBasicMaterial and shader. This is the exact feature the user wants: the colored neon should dominate the tunnel, and physical metal should no longer create white floodlights.
- Zero extra lights, draw passes, physics/collision changes, wave timing, GRIP, steering or camera changes.
- An exact old 0.21.2.3 A/B is available via `?railBody=classic`.
- Real WebGL QA compares same rail-side viewport regions at 165 and 273m; release is gated on at least 60% fewer near-white/bright pixels at the reference 165m position. Test additional Solar Gold, Jade and simulated 4 GB mobile mode.

## Notes
The 0.21.2.3 white-core spill tests remain. Don't scale or disable the colored neon to fix physically reflected white streaks.
