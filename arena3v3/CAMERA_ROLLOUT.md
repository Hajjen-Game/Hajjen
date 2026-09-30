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


## Step 2: fullscreen world + in-arena team frames (2026-09-30)

**Tested step-1 fallback:**
- Exact commit: `0ba884bdb3be62d4625fe564e474c66548c3e261`
- Dedicated branch: `arena3v3-camera-step1-tested-20260930`
- This branch was created *before* step-2 work and must not be used for development.
- The earlier completely pre-camera backup branch remains unchanged as well.

Step 2 moves both existing party/enemy frame stacks over the world canvas without
recreating their HP, resources, CC, DR or cooldown components. Action bar and menus
stay in the bottom HUD. Progression, damage meter and run-report button are in
the optional STATS panel at the top of the arena.

The canvas adapts its logical viewport aspect ratio to the browser window.
The world's actual positions and proportions remain unchanged, and a wide
window sees more floor outside the playable boundary rather than stretching
the world or aggressively cropping its top/bottom. The camera measures the
displayed frame-panel edges in screen pixels and converts those bounds into
logical canvas safe margins. It snaps to a safe position at match start, then
follows smoothly only near unsafe screen-space regions.

Source touch points:
- `index.html` for in-arena HUD markup and STATS controls.
- `src/styles/game.css` for nonintrusive team overlays.
- `src/main.js` for aspect-aware viewport sizing, panel measurements and toggle.
- `src/core/Camera2D.js` for safe initial placement and resizable viewport.
- `src/core/Game.js` and `src/rendering/CanvasRenderer.js` for updated
  camera imports and a dynamically sized render surface.

**Browser smoke test before declaring step 2 fully accepted:**
1. Normal fullscreen, half-width browser and a very wide browser, including
   resizing in an active match.
2. Click-target enemies by class circle and nameplate after panning; use
   two-button mouse steering while the camera follows.
3. Check that player class icon doesn't disappear under the left/right frames
   near arena side walls and after Charge/fear.
4. Watch CC/DR/cooldown rows grow on enemy frames; check clearance readjusts
   when the panel width/height changes.
5. Open and close STATS (progression, both damage meters, COPY RUN REPORT);
   keep action bar/castbar and every pre-existing HUD modal functional.
6. Play both arena maps; verify no deformation, missing VFX or empty canvas
   outside playable arena boundaries.

If visual layout or mouse behavior regresses, the **tested step-1 fallback**
branch restores the previous HUD while keeping the working camera. The
pre-camera backup remains available for a full rollback.
