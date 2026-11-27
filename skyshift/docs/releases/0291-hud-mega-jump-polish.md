# 0.29.1 — HUD Cleanup & Mega Jump Polish

One coordinated pass: A (HUD), B (shield contact), C (ramp). Built on the verified 0.29.0 public jump. Explicit `?track=vault&v=0.29.1&vaultJump=1`; 0.29.0 and stable 0.28.9.11 remain comparison/rollback links.

- Actual simulation speed in km/h (m/s × 3.6, rounded). HASTIGHET replaces VELOCITY. Retain shield, zone, lap, distance, clock, and controls. Hide ongoing event/guide text, racing toasts and zone popups; preserve telemetry, visual cues, boost reactions and shield/rail feedback. Remove the jump announcement billboard in this release.
- Shared physical guardrail contact consumes four shield percentage points immediately, at most once per 0.5 seconds of contact (8 points per second sustained). A zero shield fails the run. No damage when contact is absent. Existing fall penalty and no-damage historical routes remain unchanged.
- Smooth ramp rise 3 → 7.5 m, same 51 m approach and 54.4 m gap, same launch velocity and gravity. Landing plateau rises by the same amount to preserve the validated ballistic envelope. Shared tunnel profile follows the raised route.
- Require actual route tests at three speed stages, both old and new release, contact versus clean driving; real bundled and public Chromium jump proof with km/h and hidden prompts. Visual ramp shape and damage balance still need human gameplay review.
