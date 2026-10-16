# Energy Arena — Spell Tooltip Copy Guide 1.0
Last updated: 16 October 2026

## Approved writing model
Energy Arena uses short, mechanics-first English spell copy inspired by the clarity of WoW tooltips. A tooltip must tell a new player **what happens**, **to whom**, **for how long**, and **under which condition** without requiring the player to read an Evolution or patch note first.

Each of the 30 playable spells provides:
1. **Name** — an in-game identifier, unchanged by the writing overhaul.
2. **Category** — e.g. Direct healing, Area control, Ranged finisher.
3. **Base description** — usually 1–3 short sentences of complete gameplay behaviour, with useful base health/damage/time values. Never describe unselected Evolutions as inherent parts of the base ability.
4. **Cast / Flux / cooldown** — consistent compact units, including actual role cost reductions. An Evolution that changes the effective cost must be called out.
5. **Three separate Evolution descriptions for core spells** — every selection has its real trigger, consequence, cap/exception and time window. Signature spells 5 and 6 have no Evolution choices.

### Structure
**Pulse Mend** · 1.5 sec cast · 16 Flux for Genesis
Heals a friendly target for 60 base health.

**Evolution: Vital Reversal**
Pulse Mend can now target enemies. Deals 23 base damage to the enemy and heals each injured ally for 22 base health. Also restores up to 22% of existing Resonance Guard capacity. Because it changes Pulse Mend into a hybrid spell, its Flux cost is 18.

### Copy rules
- Put the verb first: heals, deals, charges, summons, interrupts, roots, blocks, restores, consumes, spreads.
- Prefer numbers and exactly defined thresholds to "shortly", "massive", "dramatic", "around", "some", "visibly", "a little", "devastating".
- Explicitly separate a **base spell** from mutually exclusive **Evolution choices**.
- Distinguish direct damage, damage over time, healing, absorb, movement, school lock and control immunity.
- Call out boss/elite exceptions only when relevant to player decisions.
- Present **combat base values**, not promise final health numbers: power scaling, crit, talents, buffs, Overcharges, health and other modifiers can change actual results.
- Describe a spell combo only when the actual combat rules support it (e.g. Entropy Mark → Rift Slash, Crystal Snare → Fracture Spear).
- Never claim extra damage from an animation or from a purely visual proc.
- Leave accepted VFX and actual gameplay mechanics unchanged during copy revisions.

### UI contract and source of truth
The source data is `pvp-25d/src/energy/abilityCatalog.js`. `EnergyCharacterHub.js` displays the base effect, details and Evolution effects in separated sections; `EnergyCombatUX.js` includes the active Evolution on action-bar hover; `energyVfxLab.js` uses the same catalog descriptions. The companion five-tab review file `energy_arena_spells_evolutions_v2.xml` can be opened in Excel. A native .xlsx version of the same content was also exported in the corresponding ChatGPT conversation.

Use `pvp-25d/src/energy/arena/EnergyMatch.js` and its status, damage/healing, evolution trigger and cooldown logic to verify every change. Avoid editing those functions during a tooltip-only pass. Refresh relevant import version keys so browsers load new text instead of old cached modules.

### Scope
**30/30 playable class spells, 60/60 playable Evolutions, five Origins** (Genesis, Impact, Eclipse, Solar, Void) revised in this copy overhaul. The legacy non-class catalog entries were intentionally not rewritten or reclassified. This is a writing pass, not a balance pass.
