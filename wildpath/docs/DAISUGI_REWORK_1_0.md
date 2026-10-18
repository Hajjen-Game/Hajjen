# Wildpath – Daisugi Rework 1.0 (first gameplay pass)

**Test build:** https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1

## Decision

Use the original **Wildpath 2.x** game and codebase; discontinue the separate `/wildpath3/` prototype as the implementation source. Preserve proven existing mechanics and nature rather than recreating them. This change is implemented as an **explicit opt-in feature flag** on 2.x so that users can compare and roll back simply by removing `?daisugi=1` from the URL.

### Non-negotiable restrictions from user

- Do **not** change arena/map geometry, decoration, enemy spawning terrain, collision radius, or camera for this pass.
- Do **not** change movement speed or acceleration, joystick response, input mapping, or motion pace.
- Do not change the legacy classic world or Stoneblade.
- Do not remove or replace the existing Nature Rebirth / Nature Fusion renderer and lineage. No new garden or placeholder graphics.

**Preserved source constants:** `WILD_RADIUS=43`; `WILD_CAMERA_WIDTH=29.5`; `CLASS_DATA.caster.speed=5.25`. The original movement code and actor creation remain unchanged.

## Changes only in `?daisugi=1`

- Caster/Glintweaver only: three special spells become purely **automatic**; no tap or keyboard casting. Their HUD tiles remain as read-only cooldown indicators labeled **AUTO**.
- From the start, basic Water Dart fires **three automatic homing projectiles per volley** (not one), with more frequent volleys. Spatially distributes shots across nearby threats.
- Water Dart applies chill to the directly hit target **and** applies area splash damage and slow to several nearby enemies even without a power-up. A full storm build can fire up to **nine** auto darts.
- Rainfall searches for meaningful enemy clusters automatically. The original timed water area slows and hurts multiple targets; `Deep Downpour` can make it larger, more damaging and longer-slowing.
- Tidal Bloom automatically finds groups and bursts them. The new `Tidal Echo` boost adds a second pair of splash bursts for extra AoE.
- Tide Guard now activates automatically when hurt badly or threatened by a close crowd; `Living Ward` strengthens its shield and applies a stronger nearby slow.
- Between-stage blessings are still the existing proven `choosePowerBoosts` system; six additional offensive/defensive spell evolutions are available exclusively in the experimental Daisugi mode: `Crosscurrent`, `Frostwave`, `Deep Downpour`, `Tidal Echo`, `Flow State`, `Living Ward`.
- Existing 8 Power Surge stages and all original Nature Rebirth/Fusion mechanics retained.
- Existing score, combo, health, VFX, and pickups retained.

### Scope

This pass proves whether fully automatic, high-volume and AoE-heavy spells feel satisfying **on the old working game**. It does **not yet** add the final 1–5 star tree grading, procedural Great Fusion, mutation choice, Daisugi 2D lobby, deep Nature Fusion 2.0 history, or a revised number of levels. Those are subsequent changes only after mobile playtesting approves the basic feel.

## Implementation

- `src/daisugi-rework.js`: pure, isolated rules for automatic targeting, volley, AoE/splash/slow, smart special activation and Daisugi-only blessing cards.
- `src/main.js`: feature-gated integration into **the existing** Babylon/Pixi combat. No map/movement code changes. Original mode remains the default and is unchanged in behavior.
- `styles.css`: the three spell buttons become read-only passive/cooldown indicators only in Daisugi mode.
- `index.html`: cache-safe loading of the new versions.
- `tests/daisugi-rework.test.js`: movement/map invariants, auto casting, AoE, multi-targeting and boost unit tests.

### Mobile acceptance test

1. Compare default `/wildpath/` and `/wildpath/?daisugi=1` — arena, camera, player movement and nature graphics must match exactly.
2. Stand near foes without tapping any special button; three automatic water darts, Rainfall, Tidal Bloom, and Tide Guard should trigger from appropriate conditions.
3. Create compact groups of enemies; multiple enemies should be chilled simultaneously and Nature Rebirth/Fusion should behave as before.
4. Pick the new `Crosscurrent`, `Frostwave`, `Deep Downpour`, or `Tidal Echo` upgrades over subsequent Power Surges and check their distinct effects.
5. Verify scoreboard, combometer, sound/pause, pickup energy, 8-stage progression and original mode regression.
