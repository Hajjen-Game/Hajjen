# Project Energy (working title) — Game Design Tracker

**Purpose:** A persistent, lightweight source of truth for gameplay decisions, pending proposals, missing polish, and future passes. Update this file when a good idea arises; never confuse a suggestion with a confirmed user decision. Do not replace code/testing with this document.

**Last reviewed:** 2026-10-11
**Statuses:** IMPLEMENTED (exists in game), AGREED (chosen design, not necessarily implemented), PROPOSAL (needs a design decision), BACKLOG (planned work), VALIDATION (needs playtesting).

## The core game identity

- **IMPLEMENTED:** Player is a custom energy orb with distinct Origin, selectable build, spells, Mastery, Evolutions and Singularity.
- **IMPLEMENTED:** Player HUB, Training Grounds, Planet Defense, 2v2 and 3v3, AI companions, XP to level 30.
- **IMPLEMENTED:** Planet Defense has five waves, level-dependent encounter rosters/tier names and boss mechanical phases, with temporary between-wave spell trials. Its enemies now display shared Rift creature prototypes in gameplay (visual integration under review).
- **IMPLEMENTED:** Planet Defense XP curve aims for ~44 straight five-minute wins to reach level 30 (approximately 3h40m), without auto-leveling each victory.
- **AGREED:** Spell VFX polishing across *all* abilities is deferred until a later dedicated pass; gameplay/identity is the current focus.
- **IMPLEMENTED (visual prototype only):** Standalone [Enemy & Boss Design Lab](enemy-design-lab.html) with three distinct procedural Babylon 3D test subjects (Rift Shard, Rift Channeler, Rift Bulwark), idle/build-up/attack/impact sequences, same-stage comparison, gameplay scale, alternative lighting and speculative boss-size treatments. **No Planet Defense enemy renderers or combat are changed.**
- **IMPLEMENTED (visual prototype 1.1):** Transparent Energy Pass with player-orb-inspired crystal Fresnel shells, visible layered internal plasma/heartbeat, individually moving Shard satellites, gathering Channeler glyphs, refreshed Bulwark glass armour, softer showroom lighting and an interactive GLASS ON/OFF comparison switch. User's 1.1 feedback: overall significantly better; remove Bulwark's circular shield, clear Channeler's orbiting plate icons, and contain its too-large inner light — addressed in 1.2; awaiting 1.2 visual feedback.
- **IMPLEMENTED (visual prototype 1.2, awaiting browser feedback):** [Enemy Design Lab](enemy-design-lab.html) removes Bulwark's round front shield and guard hoop, simplifies its upper silhouette, replaces Channeler's six icon-marked orbiting tiles with clean crystal fins, reduces and confines Channeler's energy reactor/plasma/rings, and lowers a distracting floor point light. Shard is intentionally unchanged. This affects the **isolated design lab only**, not real encounters.
- **IMPLEMENTED (visual prototype 1.3, awaiting in-browser review):** Material Balance Pass in [Enemy Design Lab](enemy-design-lab.html) tones down Rift Shard's overbright central reactor/inner plasma, increases Channeler's shell and facets plus front-face Fresnel fill while keeping its contained core, and gives Bulwark heavier crystal body visibility with extra opacity and Fresnel front fill. The existing GLASS ON/OFF A/B comparison remains working. This is a visual prototype only, with **no Planet Defense changes**. Review all three at GAMEPLAY SCALE and COMPARE before committing them as production enemy art.
- **IMPLEMENTED (visual prototype 1.4, awaiting browser review):** [Enemy & Boss Design Lab](enemy-design-lab.html) gives **all three** Rift prototypes identical Shard reference glass values (shell .39 / face .48 / glass .22; front-face Fresnel fill 0). Channeler/Bulwark now have brighter, color-matched hearts/plasma/reactors and four additional animated inner energy streams per creature. The Channeler reactor remains constrained inside its tall spindle and Bulwark still has no circular shield. Tested module startup, animation and GLASS ON/OFF; still needs actual visual inspection at gameplay scale. Planet Defense unchanged.
- **BACKLOG:** Keep combat readable with low-poly/dark-muted arena art, characteristic energy spheres, vivid spell buildup, travel and impacts.

## PROPOSAL — No-level Progression Roadmap 1.0 (2026-10-11)

**Status: DESIGN ONLY — no progression/gameplay code changed.** Full working specification: [PROGRESSION_ROADMAP_1_0.md](PROGRESSION_ROADMAP_1_0.md).

- **Explicit requirement:** All five disciplines (Void, Solar, Cryo, Kinetic, Vital) are available for selection at the **first earned shared-spell reward**; lock **individual advanced spells**, never a whole category. Selection remains free across Origin roles.
- Replace level 1–30 and numeric spell Rank 0–3 with a 20-hex first-clear Planet Defense journey. Two bound Origin spells at start, eight interchangeable shared slots, and 16 shared spells that are progressively discovered. Later discoveries go into the library without growing the 10-slot combat bar.
- Draft escalation: Counterplay pool after 3 unique hexes, Complex spell pool after 7; Evolutions around 10; Synergies and Rift Expedition around 20; optional deeper synergy tree after five unique Rift Expedition clears.
- **PvP gate around 15 wins remains explicitly UNDECIDED** (also consider 12/18). No accidental gameplay lock or definitive promise until user confirms.
- Map should mark completed hexes with green ticks and preview locked future systems. Replaying old hexes must not generate endless campaign milestones.
- Retain existing saves; current `wins` aggregates modes, so migration must not pretend all old wins are Planet Defense clears. Existing level gates, Rank-derived modifiers and PvE tier math require careful replacement.

## Front-end navigation overhaul (2026-10-11)

**Status: IMPLEMENTED / needs real browser UX review.**
- Main Menu has exactly four primary actions: **New Game**, **Resume Game**, **About**, **Game Dev**. The title displayed is **Project Energy** as an explicitly provisional *working title*; internal files, storage keys and URLs are intentionally unchanged.
- New Game opens creation of a fresh Origin. Resume Game opens a distinct Origin roster; clicking any Origin loads its own HUB. Saves/builds/level are preserved.
- HUB **Play** opens a dedicated **PvE / PvP** choice screen. PvE offers **Planet Defense** (existing live mode) and **Rift Expedition** (shown as LOCKED, unlock level **20 or 30 — undecided**, no active gameplay endpoint). PvP offers **1v1** (existing Training Grounds), **2v2** (Duo), and **3v3** (Trio).
- Game Dev contains the **Visual VFX Lab**, **Enemy & Boss Design Lab**, and **Energy Build Lab**. Links to labs and to legacy Arena have been removed from the normal game header and other lab menus; labs return to the Game Dev screen.
- About remains the illustrated field guide. A cancel button was added to character creation.
- **Technical checks:** JS syntax, DOM IDs, New/Resume/HUB/Play category selection, PvE/PvP mode callbacks, back navigation, About and locked Rift Expedition UI passed scripted navigation tests. Real mobile/desktop browser tests still needed.

**Open design questions — do not silently decide:**
1. **Final game title:** No name chosen. `Project Energy` is a temporary UI label only.
2. **Planet Defense name:** `Space Surf` proposed by user as a wave-themed name. Keep Planet Defense for now; evaluate alongside lore and activity identity.
3. **Rift Expedition unlock level:** 20 or 30? Not decided. Both appear in the disabled card explicitly as TBD; do not make this playable until the mode and gate are designed.
4. **PvP labels:** Main choice displays 1v1/2v2/3v3; underlying game modes still named Training Grounds/Duo/Full Arena internally. Decide later whether separate PvP matchmaking/identity requires changes.

## Planet Defense Rift creature live integration

**Status: IMPLEMENTED (first gameplay visual test, awaiting feedback) — 2026-10-11.**

- **Shared source:** [EnergyRiftCreatureModels.js](src/energy/arena/EnergyRiftCreatureModels.js) now owns the very same 1.4 Shard, Channeler and Bulwark geometry, glass materials, layered internal lighting and idle/cast/impact gestures used by [Enemy & Boss Design Lab](enemy-design-lab.html). The lab imports this shared source instead of duplicating it.
- **Gameplay bridge:** [EnergyRiftActorRenderer.js](src/energy/arena/EnergyRiftActorRenderer.js) renders actual PvE encounter enemies with the same Rift models. Ordinary player/team/PvP actors **remain unchanged energy orbs**.
- **Current display mapping (visual only):** Phase Raider/Skirmisher → Rift Shard; Rift Spark/Channeler/Harbinger and healer support enemies → Rift Channeler; Rift Bulwark → Rift Bulwark. The boss uses a larger crowned Bulwark or Channeler model depending on level.
- **Preserved:** existing encounter health, enemy AI, abilities, collision, target selection, XP and wave progression. Dead wave models and materials are explicitly cleaned up.
- **Technical validation:** strict JavaScript syntax, mock scene initialization, 12 level/archetype cases, click-target metadata on every spawned model, action animation events, 50 continuous updates, removal and 100% material disposal all passed. **Real Babylon/browser graphics and frame-rate remain to be tested.**
- **Next visual review:** inspect wave one at level 1, caster-heavy waves at level 8+, Bulwark appearances at level 12+, and the level-scaled finale. Test GLASS ON in the lab against real encounter scale and confirm readability during spells. Treat this as a **prototype under gameplay evaluation**, not final art selection.

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

## GitHub access — required check before reporting a blocker

- Active Energy Arena repo: **`Hajjen-Game/Hajjen`**, folder **`pvp-25d/`** (not the older `JonatanNorrby/jacworks` repo).
- GitHub tools are exposed via the `functions.exec` orchestration tool, not necessarily as a visible standalone GitHub namespace. Before reporting that GitHub is unavailable, inspect `ALL_TOOLS` for names beginning `mcp__GitHub__` (especially `fetch_file` and `update_file`) and attempt to fetch a known repo file.
- Prior failures to notice GitHub were **tool-discovery failures in the assistant response**, not evidence that the user's existing connection was missing. Do not ask the user to reconnect based on visibility alone.
- Verify the current file SHA, apply changes to the right repository, test strict-mode JavaScript/module initialization for Babylon prototypes, confirm the returned commit, and update the entry HTML cache version.
- Tool availability can vary by session; if a verified attempt genuinely fails, report the exact blocker instead of incorrectly claiming the connection does not exist.

## Process rule: don't lose decisions

- After each substantial design discussion: add the idea or decision here, with **status**, **reason**, **dependencies**, and **what is explicitly NOT yet decided**.
- Once implemented: link the relevant files or GitHub commit and mark IMPLEMENTED, but do not imply visual/UX quality is validated.
- If a new idea contradicts a past decision: resolve it before rewriting major code.
- Distinguish **mechanics complete** from **player-tested**. A commit or syntax test does not mean the encounter looks or feels right.
- Keep this tracker small enough to review before new development passes; archive details later if it grows unwieldy.
