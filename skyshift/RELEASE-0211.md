# SKYSHIFT 0.21.1 — Tunnel Megastructure Rebuild

Replaces (never overlays) the first 288m of Skyline's 0.21.0-B corridor with an **opaque, continuous, banked curved tunnel**.

- Tunnel shell is one connected indexed surface from the **left outside-rail shoulder**, up the left sloping wall, across a 34m-high curved vaulted roof, down the right wall and into the right outside-rail shoulder.
- Ground banks close the previously exposed space gap between railing and outer tunnel wall, with no geometry within the original racing deck.
- Luminance accents and major portal ribs follow the curved tunnel cross-section, rather than a rectangular ceiling or sticker lines on flat walls.
- 2m samples follow the existing `positionAt` physics reference frame precisely; steering, GRIP, collision, 120Hz motion, camera and road material are untouched.
- ~8 large-scale structural portal ribs across 288m instead of hundreds of repeated square modules.
- No new point lights, rendering passes, textures, shadows or gameplay-affecting collisions.
- On low-memory devices the full tunnel and energy bands remain; only optional bloom halo mesh is removed.

A/B compare with `?tunnelMega=classic` for 0.21.0-B or `?cinematicHero=classic` for old station architecture. The old module code is retained and unchanged.

Acceptance: Node indexed-mesh continuous profile/side-floor/clearance and material budget tests, Chrome SwiftShader WebGL matching-position screenshots at s=104, 144, 165, 196, 245, 350 and low-memory baseline.
