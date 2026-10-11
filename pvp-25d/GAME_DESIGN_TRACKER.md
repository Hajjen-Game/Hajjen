# Energy Arena — Game Design Tracker

**Purpose:** A persistent, lightweight source of truth for gameplay decisions, pending proposals, missing polish, and future passes. Update this file when a good idea arises; never confuse a suggestion with a confirmed user decision. Do not replace code/testing with this document.

**Last reviewed:** 2026-10-11
**Statuses:** IMPLEMENTED (exists in game), AGREED (chosen design, not necessarily implemented), PROPOSAL (needs a design decision), BACKLOG (planned work), VALIDATION (needs playtesting).

## The core game identity

- **IMPLEMENTED:** Player is a custom energy orb with distinct Origin, selectable build, spells, Mastery, Evolutions and Singularity.
- **IMPLEMENTED:** Player HUB, Training Grounds, Planet Defense, 2v2 and 3v3, AI companions, XP to level 30.
- **IMPLEMENTED:** Planet Defense has five waves, level-dependent encounter rosters/tier names and boss mechanical phases, with temporary between-wave spell trials.
- **IMPLEMENTED:** Planet Defense XP curve aims for ~44 straight five-minute wins to reach level 30 (approximately 3h40m), without auto-leveling each victory.
- **AGREED:** Spell VFX polishing across *all* abilities is deferred until a later dedicated pass; gameplay/identity is the current focus.
- **IMPLEMENTED (visual prototype only):** Standalone [Enemy & Boss Design Lab](enemy-design-lab.html) with three distinct procedural Babylon 3D test subjects (Rift Shard, Rift Channeler, Rift Bulwark), idle/build-up/attack/impact sequences, same-stage comparison, gameplay scale, alternative lighting and speculative boss-size treatments. **No Planet Defense enemy renderers or combat are changed.**
- **IMPLEMENTED (visual prototype 1.1, pending user review):** Transparent Energy Pass with player-orb-inspired crystal Fresnel shells, visible layered internal plasma/heartbeat, individually moving Shard satellites, gathering Channeler glyphs, refined Bulwark shield/armour, softer showroom lighting and an interactive GLASS ON/OFF comparison switch. The user's supplied 1.0 screenshots showed solid stone-like panels and overexposed floor patches; judge the new look in the browser before choosing an art direction.
- **BACKLOG:** Keep combat readable with low-poly/dark-muted arena art, characteristic energy spheres, vivid spell buildup, travel and impacts.

## Important design mismatch: Planet Defense attackers

**Status: PROPOSAL — user raised 2026-10-11; direction not yet signed off.**
**Observed implementation:** `src/energy/arena/EnergyPlanetDefense.js` calls the same `actorFor(..., "enemy", role, ..., "ai", ...)` factory as arena players. Enemies reuse the melee/caster/healer role kits and the standard orb visualization. `EnergyPvEEncounters.js` gives them distinct names/behaviours, but they still look and largely behave like rival player orbs.

**Question:** In a wave-defense PvE fantasy, should enemies visibly be another form of alien life/hostile energy rather than more player-like planets/orbs?

**Recommended direction (not yet decided):**
1. Distinguish **PvP** (opposing player-like energy orbs) from **PvE** (nonplayable hostile entities from the rift).
2. Preserve the player's orb as the main heroic visual motif. Give PvE hostiles recognizable **silhouettes, scale, locomotion and attack tells**, not just alternative colors.
3. Reuse the current encounter tiers, combat math, AI navigation and boss scheduling; introduce entity/visual archetypes separately rather than rewrite the entire mode.
4. Candidate silhouettes that suit lightweight Babylon/low-poly rendering:
   - **Swarm shards:** small pointed energy fragments, low HP, attack in packs.
   - **Seekers:** fast, asymmetric dart-shaped entities, chase/flank.
   - **Bulwarks:** wide crystalline masses with frontal defenses / obvious weak side.
   - **Channelers:** hovering multi-part glyph structures, stationary/slow, clear long casts.
   - **Leeches/Weavers:** tendril-like connected structures that drain or support others.
   - **Bosses:** large non-spherical rift constructs whose silhouettes and phase transformations change substantially with level.
5. Keep hitbox size honest and telegraphs readable; distinct collision/render silhouettes need not copy the full artistic bounding box.
6. A lore explanation is needed: what Rift entities are, why they invade, what the player's orb/planet is defending.

**Not yet chosen:**
- User currently leans toward the player being a *living energy being existing in space*, but lore is not locked. Is the fantasy specifically defending a *planet*, a *core*, or a broader realm?
- Should PvE enemies be purely alien constructs, corrupted energy creatures, or a mix?
- How much visual change do we want in the first pass, before a full enemy-animation overhaul?
- Which of the three design-lab visual directions deserves refinement first? No creatures are selected for production until the user has assessed the running 3D prototypes.

## Next suggested development order (proposal)

| Priority | Pass | Scope | State |
| --- | --- | --- | --- |
| 1 | PvE Enemy Identity 1.0 | Three live Babylon prototypes in the isolated [Enemy Design Lab](enemy-design-lab.html); review their readability, idle motion and attacks, then decide production enemy direction. | VALIDATION |
| 2 | Boss Silhouette & Phase Identity | Give each current boss a distinctive model shape and readable phase transition. | BACKLOG |
| 3 | Encounter/AI validation | Check target selection, interrupted casts, spawn frequency, boss difficulty, level 1 vs level 30 and allied AI reactions in browser. | VALIDATION |
| 4 | Spell VFX across all abilities | Dedicated visual consistency pass (buildup / travel / impact / scale / color, Visual VFX Lab). | BACKLOG |
| 5 | Progression tuning | Time actual runs; verify 3–4 hours level 1–30, not based solely on theoretical five-minute runs. | VALIDATION |

## Process rule: don't lose decisions

- After each substantial design discussion: add the idea or decision here, with **status**, **reason**, **dependencies**, and **what is explicitly NOT yet decided**.
- Once implemented: link the relevant files or GitHub commit and mark IMPLEMENTED, but do not imply visual/UX quality is validated.
- If a new idea contradicts a past decision: resolve it before rewriting major code.
- Distinguish **mechanics complete** from **player-tested**. A commit or syntax test does not mean the encounter looks or feels right.
- Keep this tracker small enough to review before new development passes; archive details later if it grows unwieldy.
