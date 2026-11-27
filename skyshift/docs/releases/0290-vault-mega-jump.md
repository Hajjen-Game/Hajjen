# 0.29.0 — Vault Mega Jump & Expansion Chamber (experimental)

Base: 0.28.9.11 / 94824710f961f181001be3d4b936108491404dfa. Production default remains unchanged. Enable on the canonical Vault page by appending `&vaultJump=1` (or use `?track=vault&v=0.28.9.11&vaultJump=1`). Remove the flag to revert immediately. Do not promote the experiment until live high/low graphics driving and CI are verified.

- Existing 1085–1360m flow straight, one jump each lap; unchanged plan/curves and 23.2m road width.
- Raised 3m ramp, real 54.4m deck/rail opening at 1136–1190.4m, recessed non-collision pit. Existing launch/landing and manual GRIP + steer barrel roll with clean-landing reward.
- Existing tunnel source, C2 chamber taper, up to 28% wider upper walls and 70% added upper roof height above the 2m anchor. Shared optical source positions use the same profile transform. No extra dynamic lights; lower shoulder and edge sources retain original coordinates.
- Non-affine profile must bypass the post-transform affine source cache; underlying native route frame cache remains usable. No change to historical or non-opt-in routes.
- Unit regression exercises gap, deck indices, section profile and actual flight at stages 0, 4, 8. Required visual verification: real gameplay capture on approach, airborne, touchdown and exit; verify underside closure, panel seams, optics, mobile performance and race completion on all laps. No screenshots or browser tests have been run by the author yet.
