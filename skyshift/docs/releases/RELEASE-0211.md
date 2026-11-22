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

## 0.21.1.1 – Vault Height Refinement
The curved vaulted crown is lowered from 34.15m to 29.62m nominal (about 4.5m, 13%). The lower wall and side-floor shoulder geometry are identical, and roof arch ribs / inlaid lights follow the new vault. An exact height-only comparison is available with `?vaultHeight=classic`, while `?tunnelMega=classic` still shows the older block corridor. No physics, GRIP, controls or camera changes.

## 0.21.2 — Neon-Driven Interior Lighting
Tunnel geometry is unchanged. The closed shell and curved rib material no longer take scene-wide Hemisphere and Directional lighting; they are dark matte metal with a per-vertex locally authored response to the *existing* pink guides and cyan/pink portal rings. The response fades with distance from those emitters. Optionally, a narrow additive light reflection appears on the racing deck's outer margins on higher-quality devices, without changing the deck material or gameplay. The low-memory path has no extra draw batches. Disable with `?interiorLight=classic` (the exact old 0.21.1.1 tunnel). Exterior global lighting on ship and rest of the world is unchanged; no dynamic light or shader pass introduced.
