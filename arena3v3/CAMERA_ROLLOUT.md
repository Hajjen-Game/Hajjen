# Camera rollout and stable rollback point

## Known-good snapshot (before any camera work)

- Repository: `Hajjen-Game/Hajjen`
- **Immutable reference commit for this rollout:** `241d8677365eb3c57e7df2edc4c2b0eeb7c9a2f8`
- **Dedicated preservation branch:** `arena3v3-stable-before-camera-20260930`
- The branch was created directly from the exact `main` commit above *before* creating Camera2D or modifying Game/CanvasRenderer. Do not develop on this branch.

If the camera work causes regressions, use that branch as the baseline. Prefer restoring only camera-related files/changes or reverting the camera rollout commits rather than force-resetting `main` and discarding unrelated subsequent work.

## Camera step 1 (2026-09-30)

Scope:
- Add a view-only Camera2D with a generous movement dead zone, smoothed follow near viewport edges, reversible world/screen coordinates, and bounded panning.
- Keep zoom at **1.0 by default** and preserve the existing arena layout and gameplay world coordinates. Programmable zoom and safe margins are prepared for the future full-arena HUD.
- Render arena, players, nameplates, VFX and scrolling text under the same world transform. Extend arena-floor drawing past playable bounds where needed.
- Convert mouse clicks to world coordinates before targeting. Store mouse steering in screen coordinates and convert every movement frame, including when the camera moves but the mouse does not.
- Keep AI, LOS, collision, spell ranges, progression and existing HUD CSS unchanged in this step.

Only when step 2 moves side frames over the arena should the safe margins be derived from their *actual rendered screen footprint*, converted to logical 1280x720 canvas coordinates.

## Testing and rollback checklist

1. Test both arena maps and all player roles, especially spawns at the left edge.
2. Walk into every arena corner and along pillars; confirm the camera pans smoothly and no blank canvas shows outside the playable bounds.
3. Target actors by clicking their bodies/nameplates after camera panning.
4. Hold both mouse buttons to move as the camera starts following; movement must not reverse, jitter or drift when the cursor is stationary.
5. Test Warrior Charge, Rogue Shadowstep, fear, stun and root, plus beams and floating combat text during camera movement.
6. Change browser-window aspect ratio; step 1 does **not** yet rearrange side panels or implement the future full-arena layout.
7. If a regression is difficult to fix, compare `main` to the preservation branch and revert only the camera rollout rather than touching the preserved branch.
