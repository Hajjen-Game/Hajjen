# SKYSHIFT 0.14.0 — Skyline Challenges & Medals

## Scope
Eight authored challenges use **the same** 120 Hz `stepFlight` yaw, GRIP, road, rail and aerial physics as the current 0.13.4.8 three-lap Time Trial. No extra craft upgrades, special steering controls or auto-pilot. 0.13.5 fairness audit established 16 conservative centerline stress-margin deficits in 70 zone/boost scenarios, so challenges start at a low zone stage and never require a high-stage boosted apex for silver/gold.

## Game flow
- START RUN still launches the original **3 × 3,400m Time Trial with PB ghost**.
- SKYLINE CHALLENGES opens a compact, scrollable 8-card catalog.
- First two challenges available. Every distinct bronze completion unlocks one more; the eighth unlocks after six completed.
- Drive an actual mid-track sector, not a scripted demo. Complete the distance for Bronze; meet a challenge-specific skill condition and no falls / max two rail contacts for Silver; reach the gold time **with zero rail contacts** for Gold.
- Progress, medals and best challenge times saved to a separate, ruleset-bound localStorage key (offline and fail-safe). No effect on regular PB/ghost or fleet unlocks.
- Specialized skills: clean opening line, perfect 360°/landing, intentional GRIP, a precision-flow carve, clean magnetic wall, clean shadow sprint, clean corkscrew, and one-lap multi-skill mastery.
- Retry restarts the same challenge. Result returns to the catalog. Back to menu clears challenge mode.
- Catalog uses curated text/DOM only, no new WebGL draw calls. CSS is mobile landscape aware.

## Validation
- Pure deterministic medal/progression/save tests.
- End-to-end Chromium WebGL: catalog locks, actual course spawn with original physics, result/bronze unlock, return to catalog, then START RUN returns to original Time Trial mode.
- `?challengeSmoke=1` is a QA-only opt-in trigger for a synthetic finish, **not present for players without that query**.

## Limitations
- Bronze/Silver/Gold thresholds are initial balance values; they must be tuned from real mobile play sessions. Ghost races against individual challenge PBs, leaderboards and physics-version migrations are not part of 0.14.0.
- The intentionally unchanged Time Trial ghost still uses its older recorded-physics fingerprint. Fairness across past ruleset versions should be addressed separately.

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.14.0
