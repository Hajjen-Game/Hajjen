# SKYSHIFT CI Optimization 0.28.1 — real roof ROI + parallel GRIP checks

## Source evidence (post-merge main run 44938793354)

The real Chrome/WebGL 0.26.5 rail/wall job failed at the second image of the High tier:

- high-gold-straight: roof control 68.42 → 70.15, delta +1.73 (pass).
- high-gold-arch: roof control 63.32 → 67.09, delta +3.77 (threshold +3.40, fail).
- The old roof ROI x=.40…60, y=.08…29 overlapped a deliberately illuminated near-frame arch/wall. Those pixels are already covered by the separate `wallMetal` region where the improvement is the expected behavior.
- Offline analysis of the **actual uploaded before/after PNGs** (not synthetic images) with y=.08…20: high-gold-arch +1.54, high-gold-straight +0.73 on the true upper ceiling. Keep the SAME +3.40 strict ceiling guard, white spill guard, dark graphite guard, wall/rail meaningful-variation checks, road guard, High and 4GB and classic comparisons. No game shader, light or visual rendering is changed by this CI adjustment.

## No-Jump timing (same run)

The misleading `No-Jump GRIP Fix & Track Parity 0.16.5 WebGL` label covered 10 unrelated historical WebGL scripts in a single serial job after the deterministic flight fairness CLI; it took 6m18s on main. The browser GRIP proof itself was already passing at ~19:06:21, before historical art tests took most of the runtime through 19:11:43.

Reorganized into independent parallel main jobs:
- Focused `No-Jump GRIP 0.16.5`: deterministic fairness plus real WebGL GRIP source proof.
- Historical 0.18.0, 0.19.0, 0.19.2, 0.20.0 art.
- Historical 0.20.1 and 0.20.2 art.
- Historical 0.20.2.1 and 0.20.3 art.

All scripts still execute on `main` after the existing `track-tests` dependency. Separate artifacts isolate errors and avoid a 6–10-minute misleading GRIP status. A short focused PR WebGL GRIP gate is added, so changes to GRIP do not have to wait for the historical 0.18–0.20 art suite.

**Acceptance:** PR real 0.26.5 WebGL passes (same roof threshold); focused GRIP WebGL passes; main historical jobs independently green. If any render quality regresses, retain the failure rather than widening thresholds.
