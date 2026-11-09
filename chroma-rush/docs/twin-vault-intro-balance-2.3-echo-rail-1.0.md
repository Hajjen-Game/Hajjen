# Twin Vault Intro Rebalance 2.3 + Echo Rail 1.0

**CHROMA RUSH — 2026-11-09**

## Player feedback and design

After several live runs, the player cleared only approximately **2 of 8** early long Twin Vault attempts, especially around zones **5–7**. The long version itself looks good and can remain at high speed; the introduction needs a much more forgiving physical crossing.

The existing tall Echo Spire has also been playtested extensively and proved frustrating. Remove the tall pillar **visually and physically** and replace it with a broad, much lower obstacle that borrows the existing hanging Duck Gate's `structure + luminous energy` visual language, inverted as **solid upper deck + glowing underbody field**. Preserve the double-jump action and the original early zone-2 tutorial (there are also later Echo gaps and Twin Vaults).

## Twin Vault (dash-jump): progressive speed-scaled geometry

Original early width targeted `(1.36 * speed - 36)` game units (capped at 1200), intentionally challenging Echo+Dash even in early zones. User runs found this too difficult.

New early physical target is **1.02s including the airborne player's 36-unit body**, with a smooth expansion from speed 950 to 1200. The *same original 1200-unit maximum* is retained at higher speed.

```js
shortWidth = max(330, round((speed * 1.02 - 36)/10)*10)
ramp = smoothstep((speed-950)/(1200-950))
airWidth = min(1200, round((shortWidth+(1200-shortWidth)*ramp)/10)*10)
```

The two real 50-unit neon boxes and the collidable, fully visible 36-unit-high middle zigzag field are untouched. No hidden seal or invulnerability. The shorter early span offers a broad Echo Jump-only solution; adding optional Air Dash makes it faster and feels rewarding. It does not force an early Air Dash, because the real-player success rate matters more than a scripted combo requirement. Later, the maximum width returns; speed makes the same world span physically easier again.

| World speed | Previous width | New width | Change | New full-body travel |
|---:|---:|---:|---:|---:|
| 570 | 740 | 550 | −26% | 1.03s |
| 745 (zone 5) | 980 | 720 | −27% | 1.01s |
| 800 (zone 5–6) | 1080 | 780 | −28% | 1.02s |
| 900 (zone 7) | 1190 | 880 | −26% | 1.02s |
| 1000 | 1200 | 1000 | −17% | 1.04s |
| 1100 | 1200 | 1160 | −3% | 1.09s |
| 1200+ | 1200 | 1200 | 0% | declines as speed rises |

The values above use the actual `GAME.speedAt` and deterministic rounded widths and are travel-time *estimates*. Correct takeoff, second-jump timing, terrain and real Dash displacement still determine the outcome. A step-physics regression simulates the exact 3 physical colliders at low and high speeds.

### Guidance

Early Twin Vault hint is **DOUBLE JUMP · DASH HELPS**. At higher speed both Dash and ordinary jumps remain freely usable. Do not demand or falsely signal an invisible Dash-only win condition. Adaptive Camera Horizon 1.1 and Speed Curve 3.2 remain untouched. The world-end recovery after a Vault, implemented in Spacing 2.2, stays in place unchanged.

## Echo Rail 1.0: replacing the old tall Spire

| Parameter | Old Echo Spire | New Echo Rail |
|---|---:|---:|
| First intro zone | 2 | 2 |
| Intro width | 46–49 | **265–280** |
| Repeat width | 46–52 | **300–385** |
| Intro height | 190–194 | **70–76** |
| Repeat height | 190–200 | **78–86** |
| Core silhouette | Tall, narrow tower with vertical luminous chambers | Low, wide beveled deck with **integrated luminous underside** |

The rail retains the exact 2D low-obstacle collision rectangle. The upper portion is a distinct sturdy, illuminated deck; the lower ~46% is a lightly translucent glowing energy field with a crisp divider, angular white zigzag and contact line. The entire glow is *inside* the physical collider; there is no invisible hidden obstacle or misleading empty slot. Same painting works inverted in ceiling mode via the existing course reflection.

The first real rail still teaches the Echo Jump on a safe level floor in **zone 2**, but success is now based on controlling the horizontal stretch rather than clearing a 190-unit wall. A fixed-step flight simulation verifies the new intro requires a second jump (but has a generous valid timing window), while a later faster run can clear the same low rail with a well-timed single Jump.

**Compatibility:** `type:'echo'`, `ECHO_SPIRE` config key and `echo_spire_clear` audit event are preserved internally for stable Director telemetry/older exports; this is a replacement of gameplay/appearance, not a hidden extra active tall obstacle.

## Logging, regression, and next human test

- The spawn log now includes `width`, `height`, and `expectedTraverseSeconds`, allowing us to compare real zone 5–7 hazard dimensions and survival.
- `tests/echo-rail-1.0.test.cjs`: real flight integration, no easy solo bypass at zone 2, broad Echo timing, mirrored geometry, first-floor lesson, renderer silhouette.
- `tests/dash-energy-geometry-2.1.test.cjs`: shortened early spans, old/new comparison, alternative Echo / Echo+Air Dash clears, original 1200px high-speed length.
- `tests/jump-obstacle-visual-identity-1.0.test.cjs`: updates current visual silhouette and energy bounds in both mobile render quality profiles.
- `tests/game-smoke.test.cjs`: real engine first lesson clearing with an actual second press, plus browser/30 FPS/performance checks.

**Playtest priorities:** 1) Twin Vault success in zones 5–7, 2) whether the new Echo Rail feels like an understandable wide obstacle rather than a wall, 3) whether spacing from Recovery 2.2 still feels natural, 4) whether the glowing underbody remains readable at 60% zoom. Do not change speed/HP at the same time; tune only after collecting comparative playtest rounds.
