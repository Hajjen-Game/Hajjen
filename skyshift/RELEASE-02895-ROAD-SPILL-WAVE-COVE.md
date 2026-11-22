# SKYSHIFT 0.28.9.5 – Road Light Spill Continuity & Wave-Coupled Cove Lighting

## Corrected reference
The user's **first marked desktop screenshot is Skyline**, showing cyan lip emitters projecting discrete pools of light into the road. This is the reference to preserve and refine, **not an artifact to remove**. Vault 0.28.9.4 has a broad, nearly uniform blue/grey road shoulder under the same fixtures and large cyan wall/roof metal highlights remain even in pink/amber zone stages.

## Change A – Local light spill from the ORIGINAL edge sources
- The single `road-spill-wave-coves-v02895.mjs` source library references exactly the Skyline 0.26.3.2 original 4.5m start, 6.5m lit span and 24m cadence, scaled from the original 368m panel art into Vault 340m modules.
- Before calculating a new pool, the existing 0.28.9.1 **straight-only mask** (including the 12m turn clearance) is applied; no cyan strip or new road contribution in curves. The no-strip interval remains dark.
- Replace some of the old broad cyan reflection with an analytic, smoothly tapered longitudinal source lobe. Transverse light extends gently from the real rail lip across the outer deck and fades into dark graphite before reaching the center. Its tint comes from the same original 9-color world-wave palette as other physical light sources.
- This is an after-wrapper over the original `MeshStandardMaterial` road and the existing native 0.28.9.4 physical GGX source chain; **no new attributes, meshes, lamp objects, render passes, global roughness, bloom or exposure**.

## Change B – Big cyan upper-wall and roof metal responds to the SAME wave
- The original 0.26.0 dual-tone Basic substrate contains literal hard-coded ice-cyan `d26Ice` and the real 0.26.0/1 physical GGX coat contains literal cool blue `pbrFixture0260` / `l261Cool`. These are why parts of the metal remain cyan while the visible arch/fixture geometry has turned pink/gold.
- Wrap those same original material batches in the shared `0.28.1` source installer without replacing either the geometry or the lighting transport. Re-color only the already locally masked *cool fixture* responses using the original `ZONE_PALETTES[].light` and `zoneWave` 66m moving front, with the correct 3400m global arc derived from each module's 368m source coordinate. Amber arch feet/amber PBR remain warm.
- Same original dark brushed metal, physical highlight shapes, occlusion, and banding. Each wrapper is independently reversible with strength 0.

## Rollout and comparisons
- **Vault default 0.28.9.5** activates both additions. Skyline's 0.26.5 artwork is retained as the reference, but its fixture authoring is the **single source of truth** for this implementation; do not create a second Vault-only lighting geometry system. Broader Skyline visual rollout will use these same shared shader adapters only after comparative acceptance, avoiding an unreviewed regression.
- New: `https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.5`
- Previous 0.28.9.4 on the same runtime: `?track=vault&v=0.28.9.5&roadSpill=classic&coveWave=classic`
- Road light only: `?track=vault&v=0.28.9.5&coveWave=classic`
- Wall wave only: `?track=vault&v=0.28.9.5&roadSpill=classic`

## Verification gate
- Original source mathematics vs visible lip geometry, exact authored cadence and smooth derivatives, straight-only clearance 0 at 292/540/955/1450/1995m.
- Finite GPU shader compatible with both original and existing 0.28.9.4 road optics, not a new overlay; wall Basic and true GGX color samples both use the same global source-to-track wave, rollback without changing architecture.
- Real Chromium snapshots comparing road and wall contributions separately, with cyan and pink zones, straights/turns, High/4GB and old component toggles; original game ship, GRIP and zone wave remain unchanged.
- Separate upcoming 0.28.9.6 curve road artifact and road-zone seam cleanup should remain scoped; **do not fix screenshot 3/4 with another generic floor overlay**.
