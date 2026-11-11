# Chroma Clash 1.3 — Corner Tide, Impact Physics & Run Audit
Date: 2026-11-11

## Why this pass

The player's first real Clash sessions identified three shortcomings: the seven colors did not feel like a *signature event* as in the original CHROMA RUSH runner; physics contacts were visually and mechanically too gentle compared with Fuzion Frenzy's Sumo; and Clash had no independent run log to diagnose deaths and balance.

This is a gameplay and rendering pass confined to Clash. No changes to the original runner, Rush's approved Chroma Tide, other trial modes or joystick response.

## 1. Four corners, one converging color wave

Every 10 seconds, keep the 1.2 speed and zone clock exactly as-is. Increase the changeover from a simple 0.72-second global color blend to a **1.55-second, four-corner inward sweep**, with two spatial masks:
- The **full screen/backdrop** repaints from all four viewport corners inward.
- The **rounded-square arena floor** independently repaints from its four corners inward.
- Preserve authentic old colors behind each wavefront and new colors behind the front; do not cover the playfield with a uniform tint. Soft luminous, curved edges track the four masks and briefly brighten when they converge near the arena center.
- All world layers change: backdrop sky/horizon, platform material and border. Lighting is strengthened in both world and arena, not just the outline.
- The four permanent player cube colors are never recolored. No wave graphics interact with collisions or look like new obstacle tiles. Corner Tide is a reusable code-only Canvas renderer in \`src/render/chroma-corner-tide.js\`.
- No new image files, external shaders or downloaded media. The more complex double-render occurs **only during the 1.55 seconds around a transition**. Real phone performance remains to be validated.

## 2. Stronger Sumo-style shoves without ruining direct controls

A source-level issue in 1.1/1.2: the normal joystick speed cap truncated raw collision velocity the very next frame, visually erasing the shove. 1.3 splits *steering velocity* from an independent, decaying **impact velocity**:
- Responsive joystick: unchanged, 3100 units/s².
- Zone-dependent voluntary movement cap: unchanged, starts 145 and increases 12 per 10-second zone.
- Accepted contact impulse: **52 + 0.86×closingSpeed**, clamped 58–320; added to base velocity (32%) and to external knockback (127%). Both human and AI cubes use the same equations and physics limits.
- External velocity decays exponentially, factor \`e^(-3.6×seconds)\`; meaningful short shove without permanent stun. A 160ms cooldown applies *per pair*, not globally, to avoid duplicate hits every simulation tick. Mere static overlap never creates attack energy.
- Bots predict their own edges using **total motion including knockback** and can try to steer away.
- More expressive hit feedback: impact ring + eight radial shards, colored bloom, squash/stretch. No arrows or dash gates.
- KO attribution: only a verified recent directed contact (≤1.25 sec) counts as a knockout. The nearest arbitrary cube is not awarded credit for an accidental edge fall.

## 3. Exportable run log (local JSON)

Both pause and match-result screens now offer **EXPORT RUN LOG**. Clicking downloads \`chroma-clash-zone-XX-run-audit.json\` containing:
- Schema/build and match seed for reproducibility; status \`completed\` or \`in_progress\`.
- Actual elapsed seconds, highest color zone, current platform stage/half-size, surviving player count, result and winner.
- Collision totals, strong collisions, strongest impact, per-cube contacts dealt/taken and real credited eliminations.
- Timestamped events: match start, zone changes, edge warnings, actual collapsing ring, accepted physics contacts, eliminations, match end.
- Every two seconds: bounded position, velocity and knockback samples of the four cubes (up to 300 samples).
- Death event includes **position, total velocity, zone, platform stage, edge distance, speed limit, credited attacker and fall cause**.
- Data is memory-only until the user clicks export; **no background upload, movement key stream, raw touch positions or device identifiers**. Events capped at 600 and samples at 300, with explicit drop counters; summary counts remain correct.

This is a separate audit system from the runner’s original diagnostic exporter, so the game modes do not contaminate each other's logs.

## QA and playtest

- Node checks: static no-touch collision, directional strong impulse persisting beyond the ordinary cap, symmetric player/AI equations, cooldown, collision credit/no false credit, wave progression geometry and spatial old/new color.
- Playwright checks in both landscape mobile and desktop: working joystick, pause, actual JSON download, browser-canvas mask of all four corners, zone changes, independent platform collapse, no uncaught JS exceptions.
- On phone check **first 10s and 20s color sweeps**, distinguish all four inward waves, contact weight at arena edge, recovery after knockback, and whether the 1.55-second effect hides a warning or a player.

Not yet validated with a real phone after the 1.3 changes. The player's direct impression of combat and color remains the decisive next step.
