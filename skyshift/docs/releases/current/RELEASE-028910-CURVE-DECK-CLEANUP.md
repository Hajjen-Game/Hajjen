# SKYSHIFT 0.28.9.10 — Curve Deck Cleanup

Owner screenshots after 0.28.9.9 show colored shoulder slabs on selected curves and short narrow marks beside the outer guides. Two remaining source paths match these artifacts: the old 0.17.0 cinematic diffuse paint windows (115–330, 1530–1770, 3030–3290m) and the aero-barrier decorative shoulder quads (24m pitch, 6.2m length). Disable both on the current Vault route; retain original historical versions and the explicit curveDeck=classic diagnostic. The rail batch still has all directional chevrons, cap lights and structural seams. Keep the 0.28.9.8 edge-only reflections and wall stabilization, 0.28.9.9 five main +40% pads, single visual wave, white guides, physical track and ship. No new geometry, render pass or light; fewer decorative triangles.

Current production WebGL checks verify zero shoulder marks, retained rail chevrons, no legacy cinematic wash, correct boosts and no retired road response layers. Capture multiple actual bend stations in High/4GB. The source diagnosis is verified in code; actual visual acceptance requires inspection of the rendered scene and owner playtest. Rollback: c79362fb00c4262081c619b053d66b878c5f5ebd.

Publication pending exact-head CI and Pages.
