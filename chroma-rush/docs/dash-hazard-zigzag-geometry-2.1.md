# Dash Hazard Redesign 2.1 — Zigzag Energy Geometry

**2026-11-09 • CHROMA RUSH • Player-driven design correction**

## Why 2.1

The user wanted to retain the visually pleasing **zigzag electricity linking the two hop boxes** and improve it with glow. The 2.0 removal made the gap between boxes look safe for landing and unintentionally removed the intended advanced skill demands. Dash feels fast and fun even when not needed, so the standard Air Dash and Ground Dash controls must stay usable everywhere. For advanced long obstacles the objective is a *true physically challenging span* at low speed, becoming optional as speed increases—not an arbitrary checkbox.

## True geometric air design

Three swept colliders are rendered with exact world-space geometry:

1. Low neon box left: width 50, height 62.
2. Low glowing zigzag energy bed: width `bridgeGapFor(speed)`, height 36 from ground.
3. Low neon box right: width 50, height 62.

The energy bed carries soft tinted fill, a white central zigzag, a strongly colored shadow glow and one running shimmer. At high quality a faint extra strand increases visual richness. Reduced Motion removes animation and keeps the visibly hazardous stripe. The *complete* rectangular 36px-tall energy bed is visually occupied, making landing in the middle visibly dangerous; there is no hidden full-height seal, obligatory input detection or separate invisible collider.

For v=world speed:

```text
width = min(1200, max(280, round((1.36*v - 36)/10)*10))
gap = width - 100
```

Actual air square width is 36. A physical clearance above both 62px endboxes lasts roughly 0.65s with ordinary Jump, ~1.26s with optimal Echo Jump, and the original .30s Air Dash adds up to ~240 world units of genuine advance depending on speed. The ~1.36s early-span target is deliberately longer than even the optimal no-Dash Echo clearance. At faster speed the max width remains fixed, so the required travel time shrinks **naturally**.

### Geometric checkpoints

| World speed | Air width | Full body crossing duration (width+36)/v | Intended movement |
|---:|---:|---:|---|
| 570 (zone 3 vicinity) | 740 | 1.36 s | Echo + Air Dash |
| 745 (zone 5) | 980 | 1.36 s | Echo + Air Dash |
| 800 | 1,050 | 1.36 s | Echo + Air Dash |
| 900 | 1,190 | 1.36 s | Echo + Air Dash |
| 1,100 | 1,200 | 1.12 s | Echo without Dash becomes possible |
| 1,450 | 1,200 | 0.85 s | Echo without Dash |
| 1,812 (zone 28 finish) | 1,200 | 0.68 s | A well-timed Jump + Air Dash can pass |

These movement possibilities were searched using a deterministic fixed-step player flight integrator over the exact jump, double-jump and dash thrust formulas plus all 3 real colliders. A single Jump without Dash can eventually pass at **higher speeds still**, but not in the user's zone-28 speed range. A full human playtest should confirm that the timing is learnable on iPhone.

**Important design limitation:** With unchanged standard Dash strength and existing Echo physics, early Jump+Dash carries LESS distance than Echo alone. It would be impossible for a single long, continuously colliding low structure to demand Dash while allowing early single Jump+Dash without also allowing Echo without Dash. Instead this first advanced long layout correctly demands Echo+Dash, while Jump+Dash becomes an alternative in faster runs. A separate early Jump+Dash-specific course would require stronger Dash propulsion or a different clearly visible structural arrangement; we do not fabricate an invisible action lock.

## Ground design

Original standard Duck: 0.55s; duck player width 66; a second distinct Duck press triggers Ground Dash and extends duck time to at least 0.62s from the second press; real forward dash impulse boosts passage speed.

```text
width = min(530, max(160, round((0.68*v - 66)/10)*10))
```

At zone 4 speed ~660: width ~380; full body crossing ~0.68s (ordinary duck cannot last enough). Ground Dash makes it possible. Around world speed 1,100: full body crossing ~0.54s and ordinary Duck becomes feasible. Because the top gate is fully solid, a double-jump cannot simply arc over it. Its angular bright zigzag resides **inside the colliding underside**, never in the 28px safe passage.

## Visibility, fairness and terrain

- Extend the existing early-warning lead to 1.65s for Twin Vault and 1.38s for Long Gate, including reaction/buffer time for multiple taps. When world geometry begins offscreen, retain the upright warning label.
- Keep first encounters floor-only; never introduce a new advanced hazard on the ceiling. Later repeats may appear after confidence/stress filtering.
- A procedural terrain corridor remains flat while the existing FIRST floor Dash lessons need to appear: now one 2700–3900 unit flat segment can support the longer structure plus takeoff/landing margins. This policy only applies in the introductory lesson; normal procedural terrain returns afterward.
- Ground and air collisions continue using swept X overlap per real body, preventing 30FPS tunnelling. The 60% camera renders the same world geometry with its single course transform; HUD and touch buttons do not change.
- Only appearance/geometry/intro-runway and fairness warnings change. No adjustment to Speed Curve 3.2, camera curve, user Dash movement, rewards, shield, HP, Chroma Tide, or the background.

## Read the next round

The user uploaded `chroma-rush-zone-28-arcade-audit.json`, schema v3. It covers **324.6s (5:25), zone 28, speed 1812.15, score 101077**. 133/147 obstacles cleared, 15/15 gaps, 17 perfect zones, 75 shield HP recovered. The three advanced hazards in that round all cleared, with one pure-geometry Air clear and one each Air and Ground Dash-assisted. Player activated **6 Air Dashes and 7 Ground Dashes** total. This proves Dash remains actively enjoyable outside a mandatory hazard. The first Twin Vault at 55.47s was passed **without Dash** in 2.0—a decisive sign the intended challenge was missing. 600 stored detailed events were capped, with 415 overflow, so late inputs/outcomes are available only via summary aggregates.

## Tests and rollout

`tests/dash-hazards-2.1.test.cjs`: shape and intro policy, analytics, early Ground-Dash need, cap-induced late optionality.  
`tests/dash-energy-geometry-2.1.test.cjs`: independent deterministic 120Hz flight + Air Dash solver on the same 3 bodies at early/late speeds; ground travel feasibility; 60% zoom high-speed warnings; real guided flat generation; renderer has no hidden gate and links wire visual to collision.  
`tests/game-smoke.test.cjs`: actual runtime contact, optional assist and schema.  
CI includes full browser/mobile smoke and node regression.

If playtesting reveals the long bridge is rare beyond introductions (because natural terrain lacks a continuous flat area) or the three-press sequence feels unforgiving on phones, adjust the Director's *future terrain opportunities or high-speed target span*, not invisible seals or immunity.
