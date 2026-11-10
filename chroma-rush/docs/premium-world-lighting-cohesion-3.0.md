# CHROMA RUSH — Premium World Lighting & Cohesion 3.0

## Design intent
The previous Ambient Lighting 2.1 improved isolated colors but still left the sky, terrain, runner and hazard shells with separate lighting rules. The player asked for one final substantial premium-cohesion pass, **not more speed streaks, light rails, effects, buildings or new obstacle-like accents**. WipEout HD Zone Mode inspired the synchronized color identity, not an attempt to duplicate its art.

## Implementation
- **Single deterministic WorldLighting rig** evaluated once per visual frame. This single light envelope combines ongoing Flow, a bounded small Chroma Surge lift and existing graphics quality. It is presentation only; never fed into speed, obstacle timing, terrain physics, collision, audio or gameplay RNG.
- **Sky:** use the original *two* radial pools and existing neon horizon, adjusting their palette lighting and diffusion coherently rather than drawing any new layers. Existing original background scenery, gap continuity, vertical fade, and parallax positions remain.
- **Real ground:** apply the same light budget to the existing clipped terrain material gradient and original surface stroke. True gaps stay transparent; no duplicate surface, extra line, road bridge, fake platform or new foreground vignette.
- **Jump and Duck obstacles:** use a shared top-to-bottom translucent shell gradient inside the **existing** Jump cap, low-barrier body and both short/long Duck cores. The same fill model, tint and border budget applies to standard/wide Duck Gate. Existing exact outer contours, hatch pattern, physical hitboxes and visible reaction edges are untouched; the top is slightly white-lit without glare that washes out the important silhouette. The Chroma Tide's `colorAt` still supplies the spatially correct tint for each hazard.
- **Runner glass:** the same rig alters only existing material stops and rim brightness. No extra shapes, wake, rings, movement afterimages or floating strokes.
- **Graphics tiers:** HIGH gets fuller glow; Performance keeps the important shell and outer edge bright enough to read. The user can select HIGH on a modern phone; old hardware is not used to water down the design.
- **Graceful cached-page behavior:** the new rig script is loaded before the game, but the game has a presentation-only fallback to the existing lighting if outdated Pages HTML briefly loads without the new module.
- **Chroma Tide stays entirely untouched:** `src/render/spectral-wave.js` is deliberately not edited. Its existing palette transitions, afterglow, speed, warning and gravity behavior continue unchanged.
- Existing **Endless Escalation Director 4.0** and its unlimited escalating pace/physics remain unchanged.

## Quality gates
- All original renderers draw the same number of paths, strokes and background fills whether the shared rig is passed or not. The existing obstacle shape geometry is not modified.
- The physically clipped ground uses one terrain mask, avoiding any false gap bridges.
- Compare two palette families, flow low/high, normal and ceiling mode, mute all sound: the world lighting should feel coherent even with no Chroma Surge active.
- Automated Node and visual/browser/mobile checks are necessary but not proof of subjective premium quality. Final user playtesting is still needed.
