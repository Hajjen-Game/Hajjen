# Background Depth & Parallax 2.0 — CHROMA RUSH

## Goal

Move from a single abstract neon haze and repetitive rectangles to an
identifiable, layered futuristic landscape without adding assets, heavy
textures, extra controls or visual interference with jumping and ducking.

All art is procedural and drawn with the existing Canvas 2D renderer.
The result is a **side-on 2D world**, not a pseudo-3D road or game-camera tilt.

## Parallax design

The background renders edge-to-edge at every pixel of the viewport, including
behind **gaps**, slopes and the player. It contains the following motion
planes, all driven from the existing accumulated world **distance**:

| Plane | World-distance scale | Look and role |
| --- | ---: | --- |
| Starfield / fine lights | 0.014× | Very distant, slowly moving depth reference |
| Distant architecture | 0.044× | Large, restrained tower skyline, subdued silhouette |
| Mid-distance architecture | 0.165× | More substantial, identifiable world structure |
| Near architecture | 0.390× | Stronger perspective difference, brighter structural detail |
| Thin horizontal energy streaks | 0.670× | Sparse near-motion accents, *behind* terrain and obstacles |

Each motif uses three separate architectural planes, not just a recolored
copy of a single skyline. The visuals do not slow gameplay or change speed.

## Eight zone identities

Each existing color palette also provides its own architectural silhouette:

| Existing zone | Background identity |
| --- | --- |
| CYAN | Clean stepped futuristic skyline |
| VIOLET | Needle spires and tall monoliths |
| MAGENTA | Angled energy fins |
| LIME | Layered gardens / terraced structures |
| AMBER | Industrial foundry towers and stacks |
| ELECTRIC | Open conduit arches and gateways |
| REDLINE | Vertical pylons with deep slits |
| WHITEOUT | Faceted crystal-like towers |

Motifs differ by the silhouette's geometry, not only the highlight color.
They remain abstract enough to feel part of the same cohesive neon game.
The palette and the motif pass through **Spectral Wave 1.0** together: old
architecture occupies the area to the left of the moving front and incoming
architecture appears to its right.

## Readability and performance

- All architecture is drawn **before** terrain, wave accents, obstacles,
  speed trails, and the bright white player. Obstacles and gaps always win.
- Silhouettes are colored with faint transparent plane fills and restrained
  small accent lines rather than obstacle-intensity outlines.
- High, Balanced and Performance graphics modes progressively reduce
  architecture count and fine light details. No new images, DOM overlays,
  WebGL, shaders, buffers, sprite atlases or allocations per-scene.
- No \`Math.random()\` calls, seeded gameplay state mutations, or game logic
  dependencies are added. Background projection is deterministic under
  acceleration and across frame rates, using accumulated travelled distance.
- Reduced-motion preference keeps scenery static while retaining motif,
  atmosphere, silhouette depth and palette changes.

## Checks

- Node renderer tests verify four viewport-covering base passes, ascending
  parallax speeds, distinct zone silhouettes, quality budgets, deterministic
  world-space motion, reduced motion and gap independence.
- Existing integration tests continue guarding real-world terrain,
  collision, Flow, Director, Spectral Wave and mobile rendering.
- The Chromium visual audit captures isolated CYAN/VIOLET/AMBER/ELECTRIC
  backgrounds, stationary and scrolled versions, a low-quality variant,
  and real game screenshots on four landscape viewport sizes.
- Existing pixel checks still require an open gap to reveal the same
  full-height background as the equivalent all-gap scene.

## Physical-device review

The captured browser screenshots are useful for checking hierarchy and
contrast, but the final assessment should happen in a fast run on a real
phone: judge whether background silhouettes feel like depth rather than
extra hazards, whether late-zone colors remain readable, and whether
the High graphics preset is smooth on a device with a modest GPU.
