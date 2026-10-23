# Japanese Harmony — Visual Harmony VFX 2.0
Date: 2026-10-23

## Intent
Polish existing VFX rather than invent new independent particle systems. The approved Harmony Firework 1.1 becomes the reference for the remaining visual effects: **champagne gold, pearl-white, muted Sakura pink**, small luminous highlights and fast pop/fade-out. Distinct gameplay events retain identifiable motion and timing.

| System | Before | VFX 2.0 |
|---|---|---|
| Resonance | mint/teal energy with gold fragments | smooth pearl/champagne filament, occasional warm shimmer |
| Echo | mint ring and blue-green collapsing beams | pearly warm ring and beam, elegant three-symbol accent at center |
| Pulse | mint-green source, trails, targets | gold-to-pearl directed beams; ONE small accent at first target |
| Score | gold HUD score with small trails | warmer gold/pearl highlights, contact glow aligned with Firework |
| Stage evolution | readable stage-up label | warmer gold edges and soft pearl-white type |
| Normal fusion/harvest | family-tinted transient intake halos | shared gold / ivory foundation; family sprite and motion intact |
| Masterpiece | full Firework + collect | same full Firework, harmonized collectible badge and bonus glints |
| Board Praise | green Echo, blue Pulse, gold Masterpiece | warm typographic family, different event-specific intensity |
| Collection bonus | score label and badge zoom | matching gold-rim and short shared Sakura/pearl/champagne twinkle |

## Restraints
- No changes to level goals, Director, bag/seed, move validity, points or save state
- No extra glints on routine fusion: Firework 1.1 already owns that feedback
- One additional visual accent origin per Echo, per Pulse wave, per collection award group
- At most 3 small symbols at each accent; reduced to 2 on low-performance devices
- Pulse retains source → target motion, Echo retains converging threads, score retains curved point flights, Resonance stays quiet
- No pointer interception; temporary DOM elements are removed after Web Animations API completes
- Respect motion reduction and hidden browser tabs; no canvas/continuous particle spawning

## QA
- Run existing game engine, Resonance, score, Firework and mobile browser smoke tests
- Unit assertions verify three-tone tokens and treatments across subsystems and exactly one extra Pulse wave accent
- Browser smoke checks actual Echo/Pulse event accent shapes and continued Masterpiece Firework
- Check animation density in both the four-family tutorial and five-family Journey
- Mobile art remains recognizable and unobstructed at a narrow 390px viewport

## Player feedback questions
Are the calmer Resonance connections clearly different from the celebratory Echo and Pulse? Is the score arrival still easy to track? Does Collection feel like a reward without becoming another explosion?
