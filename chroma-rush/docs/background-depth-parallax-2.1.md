# Background Depth & Parallax 2.1 – Layered Landscape Pass

## Feedback driving the revision
The 2.0 building silhouettes provided perceived depth but looked too much like
extra upright obstacle shapes, especially the green LIME towers near the player.
In a 2-button high-speed runner, the foreground must remain unmistakable.

**Design rule:** Landscape shapes should read as one broad horizon, never as
separate columns, pillars, platforms or jump/duck objects.

## Art design
- Four parallax references stay: distant stars (0.014×), far mountains (0.044×),
  middle mountain ridges (0.165×), low near hills (0.39×), with extremely subtle
  sparse horizontal streaks (0.67×).
- Each landform is **one continuous, screen-wide line-sampled height function**,
  filled softly to the lower edge. No free-standing objects.
- Three separate contour layers are separated by low-opacity atmospheric haze.
  Layers use a subdued gradient into the dark scene, not bright platform edges.
- Most shapes are rounded and wide. VIOLET/REDLINE/WHITEOUT can be more angular
  or peaked, but still continuous mountain silhouettes with limited slopes.
- All terrain is generated procedurally in Canvas 2D; no textures, images,
  web requests, shaders or asset downloads. Nothing extends into the playable
  course as a collision or false obstacle.

## Zone landscapes
| Zone | Landform |
| --- | --- |
| CYAN | Soft low hills |
| VIOLET | Rounded peaked mountain ridges |
| MAGENTA | Layered, wavelike dunes |
| LIME | Wide gentle valleys |
| AMBER | Soft plateau/canyon terrain |
| ELECTRIC | Shifting wave folds |
| REDLINE | Stronger ridges with restrained peaks |
| WHITEOUT | Frostlike layered alpine peaks |

Eight motifs still pass through Spectral Wave 1.0, which uses its normal spatial
left/right palette clipping. No change to the zone clock.

## Safety, quality and test coverage
- Original **world distance** controls all parallax motion regardless of current
  speed; reduced-motion fixes the parallax coordinates at zero.
- Landscape is drawn before the terrain, gap edges, obstacles, player,
  Spectral Wave accents and Speed Trails.
- Every background pixel is painted even below the visible track. A real gap
  reveals exactly the same background as an all-gap test scene.
- The new mountains are deliberately lower contrast than real hazards.
- Existing High/Balanced/Performance profiles reduce geometry sampling
  (14/23/34 logical pixels per contour segment) and small details while
  retaining all three ridge layers.
- No `Math.random()`, new independent clocks or changes to game logic.
- Unit tests verify uninterrupted geometry, landmark diversity, static
  reduced-motion, palette clipping, performance sampling and world movement.
- Chromium captures and compares scenes at 1440×600, 900×410, 740×360 and
  640×330, including scenery-only motifs, actual gap/hill scenes and wave
  transitions. Device playtest should finally assess motion smoothness and
  how well the new contours distinguish from true obstacles.
