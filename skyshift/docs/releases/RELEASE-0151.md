# SKYSHIFT 0.15.1 — Risk Line Diversity & Track Flow

## Goal
A gameplay-only pass following the player's observation that version 0.15.0 offered only **two** risk choices per lap. The new circuit offers **five distinctive SAFE/RISK decisions per 3,400m lap**, 15 opportunities in a normal three-lap race, with meaningful LEFT/RIGHT lane planning and alternating technical and release beats.

## Authored gameplay choices

| Position / gate | Risk direction | Risk bonus | Safe center | Design beat |
| --- | --- | --- | --- | --- |
| 692–724m / Horizon Recovery | LEFT | +22% (0.52s) | +12% (0.60s) | Intro after Skyline Leap; short burst before narrow GRIP apex |
| 2200–2240m / Sweeper Release | RIGHT | +40% (0.98s) | +14% (0.72s) | Original 0.15.0 release line kept |
| 2380–2416m / Coastline Cut | LEFT | +34% (0.70s) | +14% (0.72s) | Expert narrow outer lane after crossing from previous right-side gate |
| 2818–2854m / Final Corner Exit | LEFT | +30% (0.76s) | +14% (0.72s) | Corner exit recovery / intermediate precision |
| 3150–3190m / Roll Line Finale | RIGHT | +40% (0.98s) | +14% (0.72s) | Existing, strictly optional choice inside corkscrew |

All distance/width/side values are the exact coordinates used by the 120Hz pilot boost solver **and** the real road PBR shader. Risk shoulders remain at least 1m inside the physical rail collision limit; no new obstacle geometry or rail changes are introduced. The introductory risk boost ends before the narrow 14m apex throat at the normal pre-funnel driving speeds. The last original gate remains inside the rotating corkscrew and is **not** considered an ordinary flat straight: its safe center choice is always available.

## Track rhythm
The existing physically closed course is deliberately retained rather than trying to re-sculpt 3D mesh and camera in a balance pass. New flow chapter metadata distinguishes opening acceleration, jump recovery, technical sequence, wall + sweeper, the two-gate coastline risk/reposition pair, final technical corner and release, corkscrew showcase, and seam reset.

There is a **distinct lead-in** and text cue for each gate, including correct LEFT/RIGHT and actual risk reward (+22/+30/+34/+40, not hardcoded +40). The shader guide for the first new gate starts beyond the physical leap gap; no misleading risk line drawn in midair. No additional mesh, draw call, blinking barrier or extra button.

## Technical contracts / regression
- Normal steering, GRIP half-bonus strength, wall/corkscrew physics, track curvature, camera, three-lap structure, Manta/Stingray parity all unchanged.
- SAFE and RISK are **mutually exclusive** per gate and per lap, while distinct gates can reward independently. Rewards affect real physical speed, not cosmetic effects. New gates never become obligatory.
- Existing 8 Skyline Challenges, earned medals, unlocks and stored progress remain unchanged and available.
- Time Trial uses a **new revision/key** so pre-0.15.1 ghosts are kept but not compared against different boost opportunities.
- Unit tests verify all gates, both directions, widths vs rails, leap/apex fairness, physical 120Hz award, exclusive grouping, dynamic HUD text, shader/physics coordinates, legacy records and course beat coverage.
- Chrome WebGL smoke verifies shader compilation, all 5 gates / 11 inlays in actual physics, original catalog, plus screenshots.

## Balancing caveat
Numerical boost durations and risk timing are initial design values. They still require a real mobile playtest at different speeds, particularly the post-jump left lane and the option while the corkscrew rotates. Passing deterministic course tests is not proof of human playability.

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.15.1
