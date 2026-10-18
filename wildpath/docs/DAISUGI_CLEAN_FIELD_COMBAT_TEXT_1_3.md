# Wildpath – Daisugi Clean Field & Combat Text 1.3

**Preview:** https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1&rev=clean-field-1-3

## Purpose

Mobile screenshots showed original Daisugi vegetation competing visually with nature created through kills and fusion. Dense automatic water chains also generated overlapping normal hits, large CRIT banners, score duplicates and magic pickups. This pass tests a clean authored meadow and restrained feedback while preserving the playable old-Wildpath game.

## Vegetation

- `createOpenWorld(scene,{staticVegetation=true})` preserves **unchanged default original**.
- In Daisugi only, `main.js` calls `createOpenWorld(scene,{staticVegetation:!DAISUGI_MODE})`.
- In the clean mode, preplaced border trees, glade trees, random woodland trunks, fern clusters, grass flecks, flowers and decorative firefly motes are not spawned.
- The original painted ground, collision radius **43**, neutral stones and three stone/gem map landmarks remain. Rock and landmark props are **not** plants.
- NatureGrowth is still created independently in all open worlds and its `onBloom`, `onFusion`, `apply`, `update` and `clear` code is unchanged. **All player-generated plants and actual fusion products still appear**.
- The old non-Daisugi open-world mode keeps static vegetation exactly as before. This is a comparison/visual trial, not a destructively deleted asset pass.

## Combat text

- `daisugi-combat-text.js` has independent presentation rules for automatic AoE.
- Normal hit and crit damage inside a **3.4 world-unit** cluster merge into one damage total. At most **3** damage clusters and **7** floating messages at once.
- Crits use a small golden `✦` instead of the large `CRIT!` word, with limited lifetime.
- One short `+MAGIC` label can aggregate rapid collected magic; distant nature events use up to two fusion/growth labels.
- Kill score popups (both arena and HUD score bursts) are suppressed in Daisugi to avoid duplicated visual noise. The **actual score, combos, kills and BEST score calculation are untouched**.
- Incoming damage, blocks and healing remain high-priority messages.
- Combat text CSS is scoped to `body.daisugi-rework`; old Wildpath retains original typography and floating scores.

## Locked gameplay

Do not change the map radius/terrain coordinates, camera zoom **24.5** in Daisugi, original walk speed **5.25**, existing AI, water chain/bounce/wave, score or Nature Rebirth/fusion behavior.

## Validation

- New `tests/daisugi-clean-field.test.js` asserts scoped vegetation flags, no damage to NatureGrowth, merging behavior and preservation of damage/healing.
- Source JavaScript syntax checks passed.
- Isolated rendering-method simulation of `createOpenWorld` confirmed: **0** preplaced tree trunks/crowns/ferns/flowers/grass in Daisugi compared with **190** trunks and other vegetation in normal open mode; **1** terrain ground and **3** ancient stone markers retained in both.
- Web browser/GitHub Pages visuals and device performance still require mobile playtest.
