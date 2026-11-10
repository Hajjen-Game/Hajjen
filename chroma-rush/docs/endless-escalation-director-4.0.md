# Endless Escalation Director 4.0 — design and implementation

November 10, 2026. This replaces the implicit 3–4 minute difficulty target with **indefinite survival and open-ended progression**. Average run length is an *outcome*, not a scheduling input.

## Actual run audit motivating this change
- The Rush Chains 3.0 export reached **zone 35 in 409.63 s** (6:50), with **262 spawned** and **246 cleared** ordinary obstacles, **13 hits** and **25 perfect zones**.
- Ordinary spawn frequency improved to 38.4 per minute, but 25/34 perfect zones still means high survival and long runs without sufficiently novel decision pressure. **44.8% PEAK** did not guarantee an increasing attack floor.
- Director Rush counters confirm 5 starts, 3 completed and 2 interrupted; max chain 11. The **hardcoded maxBasicStreak=3** forbade the six-Jump volley sought by the player.
- Final director confidence .622 / stress 1 and HP 10 reduced conditional action pressure to .414 and endurance intensity to .029 despite reaching zone 35. This is the inappropriate **difficulty rollback** being corrected.
- Thirty-second spawn windows varied from 12 to 29 obstacles; counts alone cannot infer whether consecutive reactive actions were possible. The detailed event log is capped and does not capture every late input.

## What 4.0 changes
1. **Procedural Rush Composer** samples 1–6 identical Jump/Duck actions with variable run lengths and ordering; the three old canned 10–11-beat alternating patterns are replaced by brief weighted selection templates. Output is 9–27 actions (bounded by remaining playable PEAK seconds), and the six-action maximum is checked across motif boundaries.
2. **Persistent escalation floor** rises monotonically with zone and completed PEAK attacks. A hit interrupts only the current in-flight queue and starts a short recovery; HP/confidence cannot erase the reached level for *ordinary* Jump/Duck patterns.
3. **Sustained attacks + microbreathers** from zone 8 onward: PEAK begins around 12.2s and scales up with both zone and attack count; FADE is .35s and RELAX normally .60–1.12s, with a limited extra buffer immediately after damage. BUILD becomes a quick transition (~1–2.5s), no fresh 6–8s build-up every cycle. Every new PEAK has a higher challenge floor than the preceding one.
4. **Open-ended speed**: preserve exactly the original first 240s of Core Pace 1.1; after 240s, *additional acceleration* rises smoothly toward +2.3 world units/s² over a 90s timescale. This has no velocity or acceleration discontinuity at 240s and keeps increasing indefinitely.
5. **Safe terrain**: forecast shorter recovery and longer attacks. Reserve flat space scaled by the rising velocity and attack length rather than capped at 36k world units. One in three PEAK cycles remains available for normal/Echo gaps and hills. Keep ALL independent minimumGap, physics, collider, cue, slope, landing, visible-horizon and gravity-transition vetoes.
6. **Local logs**: directorExperience.escalation includes attack count, permanent challenge floor, last peak floor, recovery starts and next attack floor; existing directorExperience.rush continues reporting real completed/aborted attacks.

## Testing and boundaries
- Seeded stochastic tests demand both six-Jump and six-Duck streaks and reject any seven-streak across motif boundaries.
- Long (12+ minute) Director simulations must show monotonic challenge-floor growth, repeated Rush completions and safe action spacing. Real terrain, including high-speed 60+ zones, is independently checked.
- Verify safe short post-hit recovery *without* permanently reducing attack difficulty for a wounded high-zone player.
- Existing Dash, Gravity Shift, camera zoom, zone colors, timing fairness and manual input controls are not rewritten.
- If the physical minimum interval becomes the limit, further difficulty arises from **longer sequences, continued acceleration and unpredictability**, not from impossible overlaps. No algorithm can guarantee subjective difficulty forever; player testing remains necessary.
- This pass is not a production usability certification; actual feel and code-vs-real spawn density still require new exports from current devices.