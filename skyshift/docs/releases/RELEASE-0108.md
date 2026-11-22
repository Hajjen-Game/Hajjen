# SKYSHIFT 0.10.8 — Reactive Wing Flaps

## Intent / visual direction
Add **one articulated metal control plate per wing** to both Manta Blade and Stingray EVO. Each sits over a dark flush-mount recess. The outer (pilot-steering-side) plate tilts **UP** as the craft turns; the other plate also raises modestly to make the motion legible without looking like a cartoon. GRIP extends deployment and activates a restrained, very thin cyan-white accent on the trailing edge. The visual aim is real moving aircraft-style elevons, not two generic speed-responsive boxes.

## What is new
- `reactive-wing-flaps-v0108.mjs`: two individually hinged, compact, inset, faceted titanium panels, two dark stationary recessed seats, two very thin luminous trailing edges. Mirrored placement in the valid Manta and Stingray wing surfaces. All hardware is authored as lightweight Three.js geometry and shares materials where possible.
- **6 total draw calls** in the new system; it replaces the older speed-responsive velocity vanes rather than stacking over them. Two hinged group transforms (each with two child meshes) and one fixed recessed base mesh per wing; no new lights, textures, particles, reflections or shader passes.
- Actual input causes asymmetric response: for RIGHT steering, the right/starboard panel lifts more; LEFT makes the left/port panel lift more. **Both** lift during turns, so the response is also apparent from the behind-the-ship camera.
- Numeric deployment in a full GRIP steer is about **30–34 degrees** on the leading control side, 11–15 degrees on the other; ordinary turns are more restrained.
- Exact underdamped 2nd-order spring integration independent of framerate, with a brief return/bounce when steering stops. Glow starts very low and increases proportionally to actual hinge deployment.
- The authentic three-lap racing physics, GRIP behavior, boost/jumps, White Living Wake (0.10.7.1), Stingray articulated tail and original showroom track preview remain unchanged. The Hangar displays a slow demonstration of the new panels and their illumination.
- Restart, ship switching and disposal reset/delete the previous plate assemblies. Production audit exposes current/peak angles, differential response, glow strength and GRIP movement count.

## Tests and verification
- `reactive-wing-flaps-v0108.test.mjs` validates real wing positions, correct steering sign, both panels moving but asynchronously, higher GRIP deployment, max angle, 30/120Hz spring parity, release/recovery, actual model geometry and glow material, no physics modifications, and live app module wiring.
- `browser-smoke-v0108.mjs` uses the **actual live Three.js renderer** in Chrome to validate asymmetrical left/right movement, ordinary turn vs GRIP, return to neutral, visible edge glow and both models in Hangar, plus existing Shadow Tunnel, aerodynamic wakes, fleet and Android touch tests.
- Runtime tests are triggered on every GitHub commit by `.github/workflows/skyshift-tests.yml`.

## On-device playtest priorities
1. In a straight segment, see two flush-mounted metallic plates with only a very faint seam glow.
2. Hold the normal left/right steering control. Watch the back edge of the corresponding wing plate raise; the opposing wing reacts less.
3. Add GRIP while steering. The working-side plate should hinge up noticeably farther and its thin luminous trailing edge should become clearer.
4. Release both controls. The plates should settle back naturally within a short fraction of a second, without continuously fluttering when you drive straight.
5. Test both ships in Hangar and in-race, on mobile landscape (including a lower-power phone if available). Confirm that the existing white wingtip wake remains untouched and that small flaps do not obscure the race course.

Artistic quality must be judged in on-device playtesting; passing WebGL and unit tests proves the animation is wired and bounded, not that its weight, silhouette, or timing is perfect.

Play: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.10.8
