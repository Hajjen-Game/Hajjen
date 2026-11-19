# SKYSHIFT 0.21.6 — Cinematic Energy & Motion

## Source of change
The user-provided mobile and desktop screenshots show a substantially improved 0.21.5 tunnel: coherent cyan neon, graphite walls and readable road, but it appears static compared with the faster, more cinematic target references. The user previously disliked busy repeated strokes and uncomfortable camera/scene motion. This pass intentionally emphasizes **controlled motion within existing authored shapes**, not more props or screen-wide motion blur.

## Implementation
- Reuse existing `Tunnel / FLOW_CORES` mesh from 0.21.4. Create **no additional geometry, draw calls, lights, timers, render passes or fullscreen blur**.
- Animate a restrained, broad, low-frequency travel of saturation/brightness along the four existing wall/crown neon bands. Each fragment uses the original world-space `vTunnelTrack` coordinate and the already-running `velocityState.flowPhaseMeters`.
- Tie intensity to existing `worldFlow` and actual boost multiplier. Paused/menu state has zero motion. Mobile receives ~72% of the additional modulation to avoid excessive HDR/Bloom and GPU cost.
- Add only a *very weak*, native `zoneAccent`-colored emission around the **outside road shoulders**; it reads the same existing phase and speed. Leave the center asphalt, white/cyan guide lines, boost pads and central lane untouched.
- Retain the original 9-color spatial wave, moving white-core crest, 0.21.2.6 sun containment and 0.21.5 matte road. Never reenable white neutral solar lighting or increase renderer exposure/bloom globally.
- Keep identical camera FOV/roll/follow, handling, grip, ship motion, physics and geometry. This is an art-only shader-uniform pass.
- All light effects draw in the same existing flow-core and road passes; 0 extra draw batches or textures.

## Testing and comparison
- New version: `/skyshift/?v=0.21.6`
- Previous visual baseline: `/skyshift/?v=0.21.6&cinematicMotion=classic`
- Release-specific URLs `?v=0.21.5` and older retain their original version art and renderer changes.
- For real WebGL before/after, `?cinematicMotionSmoke=1&cinematicMotionFrameProof=1` takes two screenshots at an exactly identical flight position, velocity sample and camera. The shader controls toggle without any physics ticks.
- Browser CI samples cyan, Solar Gold, Jade and simulated 4GB Solar Gold, plus original baseline fallback.
- Node unit tests verify shader injection, play/pause lifecycle, mobile attenuation, unchanged road/ship/camera/GRIP, and no extra passes.
- Full rollout should be judged in motion on iPhone 16, not only a still screenshot. The older Galaxy A51 is a performance stress device, not the primary quality target.

## Explicitly excluded
- No generic motion blur or radial-zoom effect.
- No streaks spawned behind the ship, extra road lines, flying particles or new obstacles.
- No independent time-based flashing. The light movement derives from the existing simulated velocity/spectral system.
- No regression to white daylight streaks.
