# Wildpath – Daisugi Rework 1.1: Automatic Attack Evolution

**Play:** https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1

**This modifies the original working Wildpath 2.x codebase; it does not use the separate `/wildpath3/` prototype.**

## Locked user requirements

- **NO changes to arena, map, camera, movement acceleration/speed, joystick or enemy pathing.**
- Start wave one with **one plain, automatically fired Water Dart**. No other spells, AoE, chill or special actions are active initially.
- **No ability buttons anywhere in the Daisugi combat HUD.** Player only steers the character; all attacks are automatic.
- After the first surge, select a meaningful attack transformation; later surges expand the chosen style.
- Different water-attack effects and nature fusion need distinctive, lightweight sound cues.
- Keep original Nature Rebirth, Fusion, tree models, score, pickups, VFX engine, stage director and save-independent gameplay intact.
- Original `/wildpath/` without `?daisugi=1` retains its prior behavior (manual special buttons and 2.x combat).

## Four FIRST-SURGE attack transformations

Three of these four mutually distinct types are offered after the first surge (the fourth appears in other runs):

| Path | Name | Actual gameplay |
|---|---|---|
| `aquavolley` | **Triple Current** | A volley of three independent auto-homing Water Darts rather than one. `greatercurrent` → five homing projectiles |
| `aquachain` | **Chain Current** | One impact jumps immediately to three nearby **distinct** enemies (water chain lightning), diminishing damage per hop. `chainstorm` → six hops and longer reach |
| `aquabounce` | **Skipping Current** | A physical projectile changes direction and flies to another target on hit, up to two extra hits. `skippingstorm` → four additional ricochets |
| `aquawave` | **Tidal Wave** | Replaces the projectile with a broad frontal **cone** that automatically damages multiple enemies. `widewave` → wider/longer wave and slow |

**Subsequent upgrades:** Frost Splash (AoE + slow), Rapid Current (increased automatic fire rate), Deep Water (stronger hits), Rain Garden (unlock periodic automatic Rainfall), Tidal Bloom (unlock periodic automatic group burst), Living Ward (unlock conditional defensive shield). Extra core cards are not offered again after a core is selected.

The original Water Dart sound/visuals, original enemy targeting/collision and spawn systems continue to work; Pixi adds purely cosmetic cyan chain links, bounce arcs and sweeping water front. Babylon remains authoritative for damage and movement.

## Audio

All optional sounds synthesize locally from WebAudio after the Start gesture and use the same existing sound toggle. There are distinct short sound signatures for `Water Chain`, `Water Ricochet`, `Water Wave`, `Nature Fusion`, `Nature Bloom`, and `Daisugi Upgrade`. Each has a cooldown to avoid excessive overlapping audio. No sound files or extra HTTP requests.

## Source

- `src/daisugi-rework.js`: pure attack plans, wave cone selection, target-hopping, upgrade offers and optional special activation.
- `src/main.js`: opt-in integration in the proven 2.x engine, no changes to `updatePlayer` movement math.
- `src/pixi-combat.js`: ephemeral wave front / chain and bounce trails.
- `src/spell-animation.js`: optional synthesized musical/water signatures.
- `styles.css`: no spell-button bar in `body.daisugi-rework`.
- `tests/daisugi-rework.test.js`: regression coverage for the whole new evolution cycle, legacy geometry/speed, renderer and SFX.

## Playtest focus

1. First surge: one ordinary Water Dart and no attack controls; same exact movement and map.
2. At first Power Surge: choose one of three **distinct** Water Dart transformations.
3. Visually check each transformation across several replays (multi, chain, bounce, wave).
4. After later surges, choose AoE, slow, rate and extra spell upgrades.
5. Listen for different attack, bloom and fusion signatures; toggle sound off/on.
6. Verify combat, nature, scores, boosts, touch controls and no game freeze.

This pass does **not** add final tree generation, Daisugi lobby, tree star ratings or advanced Nature Fusion 2.0. Those follow after basic combat is accepted.
