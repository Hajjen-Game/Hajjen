# Phase 2 — Visual Signature 2.0 / Silent-first Chroma Surge

## Why this pass
The player reported that Chroma Surge 1.0 was barely noticeable, except for music, which they usually disable because it feels tiring. Endless Escalation Director 4.0 is only just implemented and awaiting proper on-device validation; avoid altering its difficulty, velocity, health, reaction budgets or terrain generation in this phase.

## Gameplay-invariant presentation changes
- **7-second Surge** instead of 4.8 seconds after the real palette wave passes the runner (first at zone 3, then each palette change). Keeps exactly the prior score formula, maximum 4× mastery chain and single crossing per palette; more actual clears can occur without spawning artificial hazards.
- New course-camera **player-anchored horizontal chromatic wake**. Seven strands on HIGH, five on BALANCED, three on PERFORMANCE. Drawn behind every collision hazard, before the cube. Glow strengthens with cleared obstacle chain and shows a short white linear echo on each real clear. Ceilings, Jump and Duck automatically inherit the same course transform and body dimensions. No added rings, fake hazard frames, full-screen flashes, camera shake or world-speed edits.
- The old tiny text-only CHROMA SURGE label becomes a **compact zone-adjacent state**: SURGE ×1…×4, actual earned bonus +points, and a 7-second shrinking progress meter colored from the current palette. All live above the hazard lane in the centered HUD; they disappear at the end and on restart.
- Optional haptic arrival/skill accents obey the already-present vibration setting and feature detection; no additional noise or forced audio. Users can keep the original procedural soundtrack muted and still understand the core reward.
- Reduced-motion setting keeps full bonus/timer/HUD information but disables moving player-wake effects. Rendering density and glow respect the existing HIGH/BALANCED/PERFORMANCE profiles.
- Local JSON build identifier becomes phase-2-visual-signature-2.0 so the next test round can be distinguished from Endless Escalation 4.0.

## Intentionally unchanged
Endless Escalation 4.0 and its irreversible pressure floor, random streak composition, attack durations, high-speed acceleration and safe terrain; Jump/Double Jump/Duck/Dash physics; collision geometry; HP; camera and Gravity Shift; generated obstacles; Flow and existing Chroma Surge point formula; optional original music system and preferences.

## Validation
- Test that the UI and VFX work even with the soundtrack switched off, include responsive landscape sizing, avoid masking hazards, and never add extra obstacle-like markers.
- Use Node game-smoke to prove real palette crossings display the timer and end reliably; test quality tiers, reduced motion, score chain persistence and audits.
- Full Node regression and independent browser/mobile CI must pass before merging. Real human judgment of whether this spectacle feels premium remains pending playtests.
