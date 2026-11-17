# SKYSHIFT 0.13.4.7 — Shared Steering & GRIP Pose

## Verified cause
0.13.4.6 has the SAME 120Hz `stepFlight()` physics for both Stingray and Manta Blade, but uses a Stingray-only visual roll limiter `stableStingrayVisualRoll()` (tanh cap ±0.25rad relative to banked road). This suppresses the visible wing banking response under GRIP; Manta receives the complete raw `naturalRoll` instead. The user correctly observed different handling feel, despite identical physics. Stingray also has an additional visual road-normal hover offset of +0.26m not shared by Manta.

## Fix
- Apply the same `ship.rotation.z=naturalRoll` to **both** Stingray and Manta, including the full GRIP, Signature, Velocity, Power Carve, bank and trick motion.
- Remove Stingray's +0.26m visual lift. Both crafts now share the exact same road-normal root placement with the same physical hover height.
- Keep actual racing width parity (V4 width x-scale 5.8/8.08), mechanical tail and engine scale ownership introduced in 0.13.4.6. No steering authority, speed, camera, collision or physical ship changes.
- If V4 geometry clips into a banked surface again, correct the actual 3D model in a separate art pass; never reintroduce a silent steering/pose clamp.

## Tests
Unit checks assert the common physics path, no Stingray-only position/roll branches and preserved physical model width. Chrome/WebGL QA freezes identical full-steering + full-GRIP inputs for Manta and Stingray, then compares ship visual roll, presentation target, and existing screen span.

Test: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.7
