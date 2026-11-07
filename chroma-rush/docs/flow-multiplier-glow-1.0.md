# Flow Multiplier Glow 1.0 — CHROMA RUSH

The player should *feel the scoring reward* grow before Chroma State: the
Flow multiplier is a progressively more prominent neon element of the top-left
HUD, not a disconnected bonus number.

## Visual stages

| Active Flow tier | Visible multiplier | Number size | Glow pulse |
| --- | --- | --- | --- |
| 0 (0–29%) | 1× | small, calm | none |
| 1 (30–64%) | 1.25× | slightly larger | soft cyan, 2.8 s |
| 2 (65–89%) | 1.5× | larger still | brighter violet, 2.2 s |
| 3 (90% to enter, below 87% to exit) | 2× | largest | strong pink-violet, 1.75 s |

Sizes scale with viewport width using CSS `clamp()`. Each pulse only changes
a short label's `text-shadow` and makes a tiny scale change (4.5%) from its
right-aligned anchor; it never expands the score panel, jumps over the course
or changes the physics. A constant minimum Flow-heading height reduces HUD
reflow as multipliers change. Numbers remain high-contrast in daylight.

The presentation reads the **actual model tier**. The 2× number and its glow
therefore remain active through Flow Balance 1.2's 87–90% hysteresis window
after Chroma activates.

## Accessibility and performance

- `prefers-reduced-motion` turns off breathing/pulsation while keeping the
  tier's color and a constant glow.
- Standard CSS effects run only on the tiny multiplier label, never as a
  full-screen filter or a particle pass.
- No score multiplier, progression, Flow balance, Director, audio, control,
  gap, obstacle or rendering-quality algorithms change.
- Versioned CSS/HUD JavaScript and the `chroma-build` release marker are
  updated to avoid stale browser assets.

## Checks

- Node tests verify all four displayed values, tier-specific CSS and live
  hysteresis (2× at 88% after reaching 90%).
- Chromium checks every landscape viewport at 1440×600, 900×410, 740×360
  and 640×330: compare actual computed sizes and pulse durations, ensure the
  enlarged multiplier doesn't overlap the Flow label or overflow its space,
  capture visual tier screenshots, and verify reduced-motion.
- Review on-device at Chroma State (especially Zone 8+) for glance readability.
