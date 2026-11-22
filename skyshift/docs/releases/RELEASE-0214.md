# SKYSHIFT 0.21.4 — Integrated Neon Flow

## Visual problem observed in user gameplay
0.21.3 added correct physical tunnel depth but approximately 500 bright blue rectangular panels and secondary braces created a repetitive, visually dizzying grid. The 0.21.2.6 road-sun fix remained good. The user's reference images emphasize **long, integrated, curved neon flows**, darker graphite infrastructure and a clearer racing-line direction.

## Implementation
- Keep the same original banked 0–368m sealed tunnel, 10 portal lights, vehicle, GRIP, rail system, PBR road, dark solar road containment, native nine-zone wave and existing physics.
- Add **four uninterrupted world-space neon conduits**: one along each upper sidewall and two overhead near the crown, with actual recessed grooves. They follow the *exact* original sampled tunnel profile and track centerline rather than arbitrary straight ribbons or camera-screen stickers.
- A narrow bright line and a very restrained broad halo are packed together into **one mesh batch**, both keyed to the same shared 0.21.2.1 tunnel spectrum shader uniforms as the road, rail and existing portal emitters. No new animation clock, no neutral external light source.
- Desktop adds one matte graphite physical recess batch and one additive light batch. Simulated 4GB mode uses **only one** geometrically simplified integrated light batch.
- The additive flow also reuses an opt-in 0.21.3 **calmer shell style**: darkens the high-contrast blue panels to subtle graphite, lengthens the architectural bays from 14m to 22m, and reduces secondary brace repetition from 21m to 42m. The original 0.21.3 architecture is still available unmodified.
- No changes to the rendering exposure or bloom intensity; existing colored emissions carry the effect. No modifications to road/ship/rail shader fixes.

## A/B links
- Full new version: `/skyshift/?v=0.21.4`
- Previous 0.21.3 style only: `/skyshift/?v=0.21.4&tunnelFlow=classic`
- Physical tunnel without 0.21.3/0.21.4 additions: `/skyshift/?v=0.21.4&tunnelStructure=classic`
- All old explicit `?v=0.21.3` and `?v=0.21.2.x` URLs retain the expected earlier art for regression screenshots.
- CI-only `?flowFrameProof=1` captures the exact same camera/ship/zone state with the 0.21.4 flow mesh visible and invisible. Browser verification runs cyan, Solar Gold and Jade on desktop plus Solar Gold on 4GB.

## Acceptance criteria
- Four long curves produce a clear travel direction through the tunnel, not new per-panel lights.
- A less gridlike, darker metal rhythm leaves the existing 0.21.1 neon arches readable.
- No exterior-white road spill reappears.
- Native zone palette and moving white crest remain synchronized with road/rails.
- Exactly +2 desktop and +1 mobile draw batches versus 0.21.3, no additional lights/postprocess/render passes or gameplay mutations.
- Earlier 0.21.3 visual A/B and old unit tests remain valid.
- Real Chrome/WebGL smoke tests must boot and render both mobile and desktop without shader errors.

## Deferred
Road material microstructure and controlled local neon reflections remain the separate 0.21.5 Premium Road Surface pass. This stage intentionally avoids more floor stripes, global blur, flickering effects or bloom-heavy compensations.
