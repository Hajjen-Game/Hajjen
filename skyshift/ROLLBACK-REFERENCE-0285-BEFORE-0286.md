# SKYSHIFT – Protected restore point: 0.28.5 before 0.28.6

**Purpose:** A permanent, unmodified snapshot of the last release before `SKYSHIFT 0.28.6 – Reflection Stability & Luminous Strip Definition`. Keep this reference in GitHub so later changes can be compared or reverted without rebuilding the shared tunnel.

## Immutable base and backup branch
- Release: **SKYSHIFT 0.28.5 – Shared Tunnel Spatial Wavefront Parity** (PR #155).
- **Exact full repository merge commit:** `e0b592691388f26d86e9e9e1dd5ed1ea86718545`.
- **Snapshot branch:** `backup/skyshift-v0285-before-reflection-stability-0286`, created directly at that merge commit. **Never add commits to this snapshot branch.**
- 0.28.6 PR #156 / merge commit: `1170df05221bc6c48b3075a0dc075c1e8e67439c`.
- Permanent release context: `skyshift/RELEASE-0285-SHARED-WAVEFRONT-PARITY.md` and `skyshift/RELEASE-0286-REFLECTION-STABILITY-STRIPS.md`.

## What 0.28.5 already has (must retain)
- Original Skyline 0.26.5 *True Shared Tunnel Renderer* reused throughout NEON VAULT, with authentic metal panel/rib shaders and light sources.
- 0.28.2 physical road reflections and ship light response.
- 0.28.3 cleaned boost pads/marks.
- 0.28.4 genuine PMREM probe; not the AI-generated visual concept.
- 0.28.5 single spatially synchronized zone color wave between road and all 10 source tunnel modules.
- Unchanged flight physics, steering, GRIP, original track and camera.

## Exactly what the 0.28.6 experiment adds
- New shader decoration in `skyshift/reflection-stability-strips-v0286.mjs`, installed by `skyshift/true-shared-tunnel-renderer-v0281.mjs` only if `reflectionStabilityEnabled0286` is true.
- Physical tunnel panel/rib satin roughness floors, derivative roughness bias; High-only micro-normal amplitude softened (panel 0.21 → 0.084, rib 0.12 → 0.052).
- Slightly damped roof substrate high-frequency atlas modulation.
- Real 0.26.0 native cyan cove output ~+19%; existing orange emitters ~+4.5%; High arch halo opacity ~0.15 → 0.18; softer alpha on original amber foot bands.
- No new lights/geometry; independent PMREM/road/ship/wave/flying controls unchanged.
- Extra 0.28.6 smoke tests, release label and boot cache revision.

## Rollback options (NO rollback has been made)
1. **Immediate visual A/B on the released 0.28.6 code:** `https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.6&reflectionStability=classic` disables the 0.28.6 material/strip decorator. The same release without this flag enables it. This is the fastest safe way to compare; it does not change published code.
2. **Exact historical repository snapshot:** check out branch `backup/skyshift-v0285-before-reflection-stability-0286` or commit `e0b592691388f26d86e9e9e1dd5ed1ea86718545`. This contains the *entire* original 0.28.5 source, not just similar-looking settings.
3. **Restore 0.28.5 behavior while retaining unrelated future improvements:** create a fresh rollback branch from the then-current `main`, and selectively remove the 0.28.6 shader installation and associated release default; review later code dependencies and run full tests. For the immediate next commit state, `git revert -m 1 1170df05221bc6c48b3075a0dc075c1e8e67439c` is a starting point, **not** a command to run blindly after later work. The merge parent must be the mainline. Do not reset/force-push `main`.
4. **Restoring 0.28.5 as a new release:** if needed, redeploy the exact snapshot using a normal reviewed PR/merge, or create a properly versioned restoration commit, and verify its GitHub Pages build and real WebGL visual tests.

## Validation before any future rollback merge
- Compare fixed-camera real Chromium WebGL at 110, 1840 and 3230 m, including simulated 4 GB, with native 0.28.5 visuals. Check roof glitter in **moving gameplay** on a PC/new phone: static before/after still images alone cannot prove temporal shimmer is gone.
- Verify 0.28.4 PMREM, 0.28.5 wave timing, 0.28.2 road/ship, 0.28.3 boost, no exterior white light spill, and unchanged GRIP/physics.
- Keep original Skyline/Aurora behavior. Do not rebuild the tunnel from scratch.

**Note:** This document is a restore guide and historical reference, not a request to undo 0.28.6 now.