# SKYSHIFT 0.28.3 — Vault Main Boost Glow & Risk Lane Cleanup

The original shared tunnel, reflections and ship lighting (0.28.2) are preserved.
The user reported that boost plates in NEON VAULT were too dim, their arrows
needed visible glow, and the separate SAFE/RISK lines and tiny side boosts
were unwelcome.

## Implemented
- In **NEON VAULT 0.28.3 only**, the legacy five SAFE/RISK gate pairs are replaced
  with five generously sized centered boost pads, using existing authored
  physical path coordinates near 58–90, 692–730, 2198–2244, 2818–2860 and
  3150–3195 metres. Each spans 9.1 m laterally.
- Original 120 Hz boost solver, 1.40× maximum, smooth attack and decay, ship
  physics, GRIP, collisions and banked road geometry remain unchanged.
- Remove all additional risk lane pads, 125m risk approach stripes and risk
  cues on Vault. No risk bonus can trigger invisibly.
- Add emissive warm/gold chevrons with a wide feathered halo and subtle plate
  rim directly in the EXISTING indexed PBR road shader. Unlike the previous
  coloring-only arrows, HDR emissive energy now reaches the existing bloom.
  No new meshes, scene lights, colliders, post-process stages or draw calls.
- Keep original Skyline SAFE/RISK behavior, Aurora no-risk behavior and
  published Vault 0.28.2 graphics and physics identical. The cleanup is
  gated by `?track=vault&v=0.28.3`; selecting 0.28.2 restores the original.
- Update the Vault HUD/version and remove misleading risk cues from menu text.

## Acceptance
1. Unit tests: five real centered physical pads per lap, no risk pads, correct
   multiplier, no risk lane cue, same authoritative five pad shapes in the
   actual native road shader and solver.
2. Real Chromium/WebGL High and 4 GB screenshots of the active boost at launch
   and later gates; a pixel-difference comparison with original Vault 0.28.2.
3. Original Skyline 0.26.5 and historical Vault 0.28.2 remain unchanged.
4. Entire existing flight/GRIP and material regression suite stays green.

If WebGL detects a material shader failure or the new chevrons do not visibly
change the real game screenshot, do not merge. The user's future PC screenshots
for *other* outstanding visual issues will be handled independently.
