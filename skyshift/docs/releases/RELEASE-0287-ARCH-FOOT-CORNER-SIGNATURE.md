# SKYSHIFT 0.28.7 – Arch Foot Light Assembly & Corner Signature

## Visual problem, actual references
The user marked the current Vault arch foot (image 1) where a dark incomplete wedge and separated, patchy orange floor puddle look unfinished. The desired reference (image 2) has a deliberate continuous **L signature**: a longer vertical recessed amber light on the arch base that meets a bright horizontal floor/sill line, inside a dark metal mounting piece with a nearby soft orange floor response.

## Original source findings
NEON VAULT uses the actual Skyline 0.26.5 tunnel in ten 368m authored source modules adapted onto the 3400m banked track (0.28.1). Previous light foot geometry is `createConnectedFootBands02632` and installed in `finishOriginalSourceMaterials0281`: a 0.32m amber upright plus broad 14.4m Gaussian floor haze. This cannot resemble the picture simply by increasing bloom or PMREM. It needs a more legible **source fixture shape**, not more indirect light.

## Implementation: only VAULT 0.28.7
- New `arch-foot-light-assembly-v0287.mjs` reads the original shared tunnel 0.21.1 portal arc and transverse profile plus 0.26.3.1 floor sampler, and the SAME banked position adapter passed by `installTrueSharedTunnelRenderer0281`.
- **Replace the existing** 0.28.1 foot emissive geometry, do not overlay a duplicate amber pool. Each original portal at both sides gets an approximately 1.8m rising, 0.38m-wide narrow vertical amber strip joined without a gap to a 3.3m inward-pointing, ~0.36m broad floor light blade.
- Single lightweight graphite metal mounting mesh per shared module batches all portal foot plinths and upright bases, filling the black void and separating the luminous L from the surrounding panels. One additional mounting draw batch per module, no new lights or colliders. The existing foot emitter's draw batch is reused.
- A reduced and naturally feathered localized amber floor response is authored in the **same emitter geometry** (RGBA). Avoid the former long triangular wedge; maintain dark graphite outside the source. No global road wash or white spill.
- Preserve 0.28.6 stabilized metal and cyan/orange material shaders, 0.28.4 PMREM, 0.28.5 wave, physical road and ship, boost lanes, GRIP, flight physics, colliders, full shared architecture and mobile 4GB profile.
- Older Vault versions and original Skyline stay unchanged. Exact current-version rollback: `?track=vault&v=0.28.7&archFoot=classic`. The 0.28.6 source foot mesh is never deleted and is restored on disposal.

## Release criteria
- Node tests: all ten source portals per 368m on both sides; vertex alpha, physically plausible banked floor/arch positions; true old/new mesh swap, no duplicate foot, structural mounting and deterministic cleanup; protected Skyline and v0.28.6.
- Real Chromium/WebGL: same-frame original 0.28.6 foot vs installed 0.28.7 light and graphite plinth, at 110m, 1840m, 3230m High and 1840m 4GB. Test warm light readability and unchanged racing road/white ceiling; actual in-game screenshot artifacts, not concept art.
- Old material lighting, rail, PMREM, zone wave, GRIP, physics and release tests pass. Physical user visual feedback from PC remains the final reference of L shape and glow.

## Links after release
`https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.7`
`https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.7&archFoot=classic`
QA only: add `&archFootSmoke=1&trackRepairSmoke=1` and call `__skyshiftArchFootAudit()` or `__skyshiftArchFootFrameProof()`.

The immutable 0.28.5 backup and 0.28.6 comparison remain untouched. This is an additive scoped change to the shared component API, not a separate Vault tunnel rewrite.