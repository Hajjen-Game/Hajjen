# Chroma Clash — Arena Polish 1.1: fullscreen, ultrawide world & HUD

Date: 2026-11-11

## Reason for change

User screenshots of Visual Cohesion 1.0 show real improvement in material and Chroma Pulse, but very dark hard letterboxing at left and right of a landscape phone, plus oversized announcements overlapping the stage. The entire \`clash-canvas\` DOM element already filled the CSS viewport; the game rendered only the fixed 960×540 world using contain scaling. On mobile displays wider than 16:9, the unused Canvas edges were cleared to transparent black.

## Implemented

### Panoramic background without deforming gameplay

- Retain 960×540 logical simulation, square arena, sprite transforms, impulse physics and responsive joystick.
- Compute the visible **horizontal world span** from the phone's actual CSS viewport and the original 16:9 contain scale. Example 1400×700 viewport: logical panorama width 1080 vs world center 960.
- Expand only the cached static world backing texture to \`panoramaWidth×540\`. Its canvas is translated in world-space, so background gradients, depth bars, horizon, stars and glow continue naturally across both sides.
- All decorative sky fills now paint from \`panoramaLeft\` to \`panoramaLeft + panoramaWidth\`; the platform still uses the original \`CX,CY,half\`. The background no longer has black strips or a hard change of material at the world boundary.
- During center-out palette shift, both **cached** old and new panoramas use the same full-width circular mask. The new zone colors reach the sides too.
- The cached scene key includes panorama width, so resizing into/out of fullscreen builds a fresh matching cache just once. In normal frames it still blits one image (two during a palette shift).
- Preserve the max 750,000 *screen backing pixels* and adaptive quality downgrade from 1.4. Only scene-cache width increases on genuinely wide displays, not physics complexity.

### Fullscreen

- A compact fullscreen icon is grouped beside Pause in the game HUD; a small toggle is present in the menu.
- A real tap/click calls \`#clash-shell.requestFullscreen({navigationUI:'hide'})\` directly; next tap exits through \`document.exitFullscreen()\`.
- \`fullscreenchange\` updates the icon, accessible labels, aria-pressed and resizes Canvas & panorama. The original match remains in progress and the arena does not warp.
- Unsupported or blocked browsers get a short accurate status message, not a fake fullscreen claim. Android Chrome normally supports this; mobile Safari behavior depends on platform/browser support.

### HUD

- Existing centered Zone title remains and the left mode name and right alive/timer maintain a clean three-point hierarchy.
- Fullscreen and Pause share one neatly aligned pair, with safe-area padding for landscape phone cutouts.
- Brief events like Speed Up and Edge Break are moved into the right-side gutter. They no longer cover player cubes or the platform's dashed break warning.
- Menu's fullscreen link is small to avoid introducing another big command panel.

## QA requirements

- Keep all existing Node regression tests green (Rush, Trials, Reality, Clash).
- Chromium smoke at 960×540, 812×375, 1400×700 high-DPR: after match start, sample left and right 1% pixels of Canvas and require alpha≈255 and nonblack RGB, ensuring no letterbox even beyond the 16:9 world.
- Verify joystick pointer motion, center-out pulse, 10-second zone color/speed, 14-second edge break and paused run-log download.
- Tap fullscreen icon: if browser supports the API, inspect \`document.fullscreenElement\` and aria-pressed, then exit; otherwise verify the fallback message.
- Real mobile visual test: compare ultra-wide and fullscreen screenshot; confirm no backdrop seams, the corner pulse continues across side background, no scoreboard hiding below a notch, stable UI and response.
- Compare the next device run log against Clash 1.4 reference: 33.125s, 1,969 frames, only 4 over 50ms, worst synchronous render 9.4ms and no quality drops. Browser automated checks are **not** a substitute for this real-device measure.

No changes to Rush or any other mini game.
