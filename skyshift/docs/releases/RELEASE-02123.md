# SKYSHIFT 0.21.2.3 – White-Core Spill Containment

## What was actually wrong
The user-observed white hotspot over the ship and middle of the road was not just the tunnel fog. The 0.21.2.2 correction isolated the tunnel material from zone fog and restrained only rail inlays / the outer few meters of road. **The PBR road and metal ship still received strong neutral direct and indirect specular reflections from the exterior light rig**; their HDR brightness blooms across the viewport.

## Implementation
- Preserve the exact sealed 0.21.2.2 tunnel and all original 9-zone neon colors, spatial waves, the spectral white travelling crest, global exposure, and unchanged bloom pipeline.
- Modify only the road material's existing PBR `reflectedLight.directSpecular` (14% of former intensity), `indirectSpecular` (38%), and neutral direct diffuse (78%) **inside 0–340m**; fade to original by 368m. These are lighting terms, not the deck's albedo/emissive or geometry.
- Restrict the same external specular terms in the actively selected ship's PBR materials (18%, 42%, 76%); update one shared shader uniform with the real interpolated track position and restore normal shading outside / in the hangar. Does not alter emissive engine meshes.
- Limit rail glare to 34% and subtract only the common neutral-white HDR component from the rail inlays before bloom, retaining the full chromatic difference between channels. Restore the original material beyond 368m.
- Visual-only. Adds **no lights, draw batches or render passes**, doesn't touch physics, GRIP, steering, camera, speed, colliders, or color wave triggers.
- Exact side-by-side baseline: `?whiteCore=classic` returns 0.21.2.2 with the original white reflections.
- Chrome WebGL comparisons at 90, 178, 273, 333m in original and constrained light, plus Solar Gold, Jade Surge and simulated 4GB memory.

## Acceptance
Actual screenshots must show less blown-out neutral white on ship and central deck, clearer zone color, and fully legible neon steering/rail guides. Green code tests alone are not enough.
