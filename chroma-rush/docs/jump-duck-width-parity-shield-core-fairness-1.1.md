# CHROMA RUSH — Jump/Duck Width Parity 1.0 + Shield Core Fairness 1.1 (2026-11-10)

## Jump gate geometry
- Standard Jump now uses the **same underlying width envelope and speed growth** as standard Duck: 54–71 world units initially and 184–221 at growth saturation.
- The two obstacle types still have different silhouettes, collision heights, action rules, colors and renderers. The existing Jump cap/veil styling has not been modified.
- Jump vertical dimensions remain 59–73 world units. It is still a **single-jump** hazard, and even the widest generated gate fits inside the time the original single-jump arc clears the tallest cap.
- No Dash/Ground Dash obstacle widths or speeds are altered.

## HP / Shield Core recovery
- Lower the pickup by **16 world units**: height above floor 268 → 252. Its lowest point is still >8 units above the normal first-jump player's highest reachable top; Echo Jump remains strictly required.
- Keep the existing 12-unit pickup radius and small magnet. Add a conservative continuous horizontal collision check across adjacent physics ticks, **only after Echo Jump has actually been consumed**, so a fast-moving gem cannot tunnel through the player's rectangle between samples.
- The pickup is now marked missed only once its visual shape has passed beyond the **actual zoom-aware left camera boundary**. Replaces the former player-distance-based miss threshold which removed visibly onscreen gems.
- No new pickup HUD prompts, rings, obstacles, currency, or gameplay RNG; the same spawn and rarity settings remain.

## Regression expectations
- Jump and Duck width ranges match for all speeds and use the same sampling contract.
- The largest standard Jump fits a valid one-jump clearance interval across early and late velocities.
- A one-jump attempt never collects Shield Core even if vertically adjacent.
- A high-speed sweep across a valid Echo-Jump rectangle can collect; a sweep in a different vertical lane cannot.
- At 60% camera zoom, the missed pickup remains until its last edge actually exits the viewport.
