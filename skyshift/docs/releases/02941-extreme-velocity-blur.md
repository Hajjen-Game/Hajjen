# 0.29.4.1 — Extreme Velocity Blur

Baseline main 8c03929cd825 (0.29.4 fullscreen hotfix); all three production workflows green. User's S26 logs 14/15: 60 FPS, fullscreen-sized 1560×720, bloom original 88%, High blur, LOD off/on. User reports little visible blur, cool first run and somewhat warmer second. GPU timer/temperature unavailable. LOD remains optional/off recommendation; no default LOD or bloom change.

Single integrated pass:
- Explicit 0.29.4.1 Vault release. Previous 0.29.4 route remains available; only new route exposes Ultra/Extreme. Existing saved High stays High. Off/Low/Medium/High retain original response and mask.
- Ultra base radius .095, maximum .13; Extreme base .132, maximum .18 of image height before protection. Earlier speed curve (.85–2.45 instead of .85–2.95), base contribution .40 rather than .20, retained boost response .37; quality reduction applies after cap on new modes. Expanded peripheral mask via uniform .65/1 while existing central lane/craft protection stays unchanged. Smooth original temporal easing, no history buffers, one HDR pass and five texture samples at most per affected pixel. More pixels may use the samples; energy not guaranteed equal. Wide five-tap kernel may create visible steps/streaks; test before increasing sample count.
- Bloom 65/88 independent; fullscreen hotfix, physics, FOV, Manta geometry unchanged.
- Unit coverage for exact old mode equivalence, bounds, boost, quality, persistence, release gate, one-pass switch/idle. Existing real browser proof extended at same camera to Ultra/Extreme/Extreme boost/original-vs-65% bloom, screenshots, central pixel guard and equal draw calls/triangles vs High. Synthetic visual boost input, not a second simulated flight; full physical gameplay and device heat still need verification. No generated images.
- Manta 0.29.5 postponed until this comparison.
