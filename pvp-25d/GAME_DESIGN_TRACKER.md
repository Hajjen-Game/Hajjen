# Project Energy (working title) — Game Design Tracker

**Purpose:** A persistent, lightweight source of truth for gameplay decisions, pending proposals, missing polish, and future passes. Update this file when a good idea arises; never confuse a suggestion with a confirmed user decision. Do not replace code/testing with this document.

**Last reviewed:** 2026-10-12
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

## IMPLEMENTED — Evolution System 1.0 (2026-10-12)

**Status: code shipped and Journey save/combat module tests passed; needs manual browser visual and real combat playtesting.** Detailed ability/Evolution identity and balance audit remains deliberately postponed.

- **Live rankless Journey Evolutions:** first slot earned after Stage 10, additional slots after Stages **12, 14, 16, 20**; maximum **5 active Evolutions** at completion. Stages 17–19 do not fabricate extra milestones. This is separate from the retired numeric spell Rank system. Clearing the relevant Stage announces the new slot.
- **Real unlock/selection:** each owned shared spell or Origin-bound starter has three existing choices. The HUB Evolution Tree satellites and Selected Spell cards can activate, freely replace or remove exactly one Evolution per spell, provided one of the earned slots is free. Unowned spells remain locked. Locked choices can still be inspected before Stage 10. Selection errors surface in the HUB. The redundant fourth "EVOLUTION PREVIEW" card beneath the existing three choices was removed.
- **Persistent and safe:** chosen Evolution IDs live in `journey.evolutions` per Origin (not old `build.talents` or `build.evolutions`). Validated, normalized and capped when saves load; old Journey Origins start with empty choices. A selected Evolution remains owned when its spell is unequipped or a build preset is loaded; the effect only operates when the spell is in the ten-slot active combat loadout. No lost discoveries or extra spell grants. Legacy combat code remains isolated.
- **Actual gameplay:** Journey combat loadouts now include the saved Evolution ID with `talentRank:0`; the existing EnergyMatch rule and Evolution proc handlers implement the selected effects during combat. Catalog audit found all **66 already-defined Evolution IDs** referenced in the real combat code. This pass does not redesign any of them.
- **Game Dev:** completed Dev Origin receives all 5 slots immediately; choices persist in its independent save and remain active even when replaying an early Stage using the transient `devTest` flag. Normal new Origins still start Stage 1 with no Evolutions.
- **About / roadmap:** handbook Stage 10 chapter, HUB labels and selected card states, and Stage reward map updated. AI Builds at Stage 15, Synergies and Rift Expedition at Stage 20 remain unfinished and explicitly labeled as such.
- **Verification:** pure-JS checks: locked Stage 9, capacities 10/12/14/16/20 and no new 17–19 bonus, switch without spending a second slot, removal/refund, unlock guard, saved/rehydrated selection, active/unequipped loadouts, Dev early-Stage replay with full Evolutions, existing normal Origin save isolation; syntax / browser module graph audits. Manual real browser combat review pending.

## IMPLEMENTED — Game Dev: complete Test Origin + Stage replay (2026-10-12)

**Status: implemented in live Game Dev UI and mocked-runtime tested; full browser gameplay QA pending.**

- Main Menu → GAME DEV offers a separate **DEV TEST ORIGIN**. Choose Genesis, Impact or Eclipse; CREATE / RESET makes a clearly marked, independent save with **20/20 Stages cleared, all 16 shared spells owned, eight shared abilities initially equipped alongside the two bound spells**, and both companion AI STYLE editors available. It does not consume one of the twelve normal Origin slots.
- OPEN TEST ORIGIN HUB permits normal spell swaps, preset saves and AI style changes without hours of Journey grinding. Changing the test Origin type is an explicit destructive reset of the **dev save only**, behind a confirmation prompt; ordinary Origins and their existing builds remain untouched. The dev Origin persists across reloads.
- GAME DEV → REPLAY ENCOUNTER offers Stages 01–20 at any time, with the chosen Stage's encounter recipe and a **temporary ten-spell combat loadout** regardless of early-Stage normal unlock limits. Styles chosen in the DEV HUB remain active even when replaying Stage 1–4. Combat uses a transient Stage-indexed Journey and never rewrites permanent 20/20 progress.
- **Isolation:** Dev matches award no XP, Journey spell rewards, fragments or cleared Stages. Normal player Origins still follow the unmodified earned spell/Stage path.
- **Current status:** rankless permanent Evolutions (Stage 10+) are now playable on the completed Dev Origin. AI companion Build editor (Stage 15), Synergies and Rift Expedition (Stage 20) are still not implemented. Do not misrepresent those later systems as playable.
- **Verification:** JS syntax checks across affected modules; real module-data simulations of all 3 Origin roles, 16/16 ownership, full 10-slot builds during Stage-1 replay, preservation of normal two-slot Stage-1 saves, save/reload, per-Origin companion style persistence and dev-only early-Stage style override. Real browser interaction and gameplay need human review.

## IMPLEMENTED — Stage rename + AI Styles 1.0 (2026-10-12)

**Status: LIVE gameplay code implemented; real browser feedback pending.**

- **Naming:** Campaign map hexes, the Play selection, HUB progression, spell-discovery banners, result screens and milestone buttons now use **STAGE 01–20** instead of **PLANET 01–20**. **Planet Defense** remains the name of the PvE game mode. Lock messaging is now **UNLOCKS AT STAGE 5 / 10 / 15 / 20** rather than ambiguous LOCKED · PLANET 20. Stage 17–19 do not automatically fabricate rewards; their larger payoff is the candidate Stage 20 milestone.
- **AI Styles 1.0 shipped:** The player's fifth first-clear Stage unlocks two independent STYLE selectors in the existing compact AI portraits underneath the main Evolution Tree. Each ally chooses **Balanced**, **Aggressive**, **Protective**, or **Disruptive** from an integrated 4-option editor, with descriptions and a selected state. Choices are stored per player Origin in the Journey record (`journey.companionStyles[role]`), default Balanced, and persist across reloads/matches. The two allies DO NOT have their own progression/roadmaps.
- **Real combat decisions change:** `EnergyAI` uses actor-specific style preferences for target selection/focus, ability use, rescue urgency, heal/guard thresholds, interrupt/control priority, and caster/healer positioning. Protective peels vulnerable allies earlier and heals sooner; Aggressive follows pressure windows and shortens chase/ranged positioning; Disruptive prioritizes dangerous Channelers/casts and can use equipped CC; Balanced keeps the previous adaptable default. Styles are NEVER hidden percentage bonuses, and they do not modify hostile AI or player stats. AI report identifies chosen STYLE.
- **Safe legacy retirement (user-approved):** Old pre-Journey XP/Rank Origins are now pruned from the saved Origin roster; the one-entry legacy import path is disabled. A saved Journey Origin retains its own Stages, spell ownership and companion style settings. Old browser-local mirror keys are not separately deleted because they are also used for the active Journey save.
- **Remaining backlog:** AI Build editor at Stage 15, Synergies/Rift Expedition at Stage 20, Stage-by-Stage encounter identity beyond the existing tier schedule, balance/performance polish, or late-game cosmetic/bonus reward decisions. Player explicitly does **not** require invented Stage 17–19 rewards yet. Spell balance deliberately deferred.
- **Validation:** strict syntax/import/cache audits, mocked HUB Stage 4 locked / Stage 5 unlocked, selection of different styles for both allies with two persistent saves and BUILD still locked, target-priority behavior (Protective peel, Disruptive Channeler, Aggressive player focus), early healer triage difference, Stage gate/save normalization, and removal of only legacy XP/Rank roster records. Full browser playthrough still required.

## IMPLEMENTED — About Handbook 3.0 (2026-10-12)

- **User purpose:** friends new to Project Energy should understand what the game is, how to start, how PvE combat works and how the *current* Journey game design develops without reading technical development history. Keep the book's two-page spread: **text on the LEFT, matching illustration on the RIGHT**.
- **10 Swedish spreads, fully rewritten:** 1) What is Project Energy, 2) Genesis/Impact/Eclipse and their correct same-discipline starting pairs, 3) real-time combat and controls, 4) five-wave Planet Defense, 5) 20-hex rankless Journey, 6) in-tree glowing permanent spell discovery across all five disciplines and saved builds, 7) four one-of-four ally-aware run-only Overcharges, 8) playable Stage-10 Evolutions and build presets, 9) two AI companions and future style/build milestone controls, 10) planned Rift Expedition, synergies and future PvE depth. PvP intentionally omitted.
- **Illustrations replaced, not just text:** old arena PvP comparisons, the **RANK 1–3 ladder**, LEVEL 30 character leveling diagram and obsolete three-spell starter art are removed from the guide. Each spread has purpose-built, lightweight HTML/CSS visual art with living energy orbs, battle lines, spell rings, hex nodes, actual Overcharge owner cards or planned Rift imagery. No new external asset download, browser dependency or changes to the actual game rendering.
- **Experience:** page controls translated into Swedish, current page indicator 1/10–10/10, left-right arrow and Esc navigation retained. The About dialog has `lang="sv"` for screen readers. Manual gameplay and save states unaffected; guide uses no persistent writes.
- **Verification:** code syntax, all ten pages present and image markup balanced, no leftover PvP/rank/Level 30 tutorials in book, left-text/right-art ordering, matching art key and page counter, disabled first/last navigation, CSS and page version cache checks. Actual browser screenshot review still needed.

## IMPLEMENTED — Journey Spell Discovery in Evolution Tree (2026-10-12)

**User-approved UI revision; browser visual review pending.** The first-clear reward remains an *earned, pending and save-persistent single-spell choice* (not an Overcharge), but **the rejected giant five-column reward panel above the HUB has been removed**.

- After a first Planet Defense victory, show a **compact guidance strip** at the top of HUB explaining where to click and how to claim the permanent reward. Do not show a separate spell-selection window.
- Illuminate **the five currently eligible spells at first clear** directly on their existing **outer Evolution Tree nodes**, with individual discipline-coloured pulsing glows and small NEW labels. On later clears the count and illuminated nodes adapt to the currently available, unowned spells.
- Automatically focus one eligible spell the first time the pending reward is shown; the player is free to explore/compare others, including locked previews. Selecting a glowing node updates **Selected Spell** on the right, including the spell's real description, its eligibility and a large **DISCOVER THIS SPELL** action in that panel. The rest of the Evolution Tree stays unchanged.
- Clicking DISCOVER uses the existing `claimJourneySpell` permanent entitlement; adds that spell to Origin ownership, equips it in the first free shared slot where available, persists profile/build, dismisses the banner and unlocks next Journey hex. **Only one claim per cleared planet**, and future/locked spells cannot be claimed. Legacy XP/Rank Origins and their spell selection are unchanged.
- Tested strict JavaScript syntax, existing HUB DOM IDs, absent old reward grid, glowing first-clear five, selectable-but-not-claimable future spell, in-panel claiming/auto-equipping/persistence, dismissal, and double-claim rejection using mocked DOM/runtime. Actual browser screenshots/visual and performance check still required.

## IMPLEMENTED — Eclipse Cryo + Overcharges 1.0 (2026-10-12)

**Status: CODE SHIPPED, mock-runtime tested; live browser balance/VFX feedback pending.**

- **Eclipse is now a pure Cryo Origin:** bound starters are **Crystal Bolt + Crystal Snare**. Genesis remains Pulse Mend + Resonance Guard (Vital), Impact Phase Rush + Arc Strike (Kinetic). The shared pool still contains the former Eclipse starters **Flux Bolt (Solar)** and **Phase Slip (Void)**. Arc Strike is now correctly flagged as Impact-bound; 22 total spells = **6 bound + 16 shared**.
- **Every discipline remains selectable after the first Planet Defense first-clear:** initial five are Entropy Mark (Void), Sun Lance (Solar), **Fracture Spear (Cryo)**, Vector Rush (Kinetic), Reactive Thread (Vital). Fracture Spear is the only current shared Cryo spell and has a valid baseline hit without setup; adding another distinct shared Cryo spell is a future Spell Identity option. Hex 3 adds Rift Slash, Photon Barrier, Phase Slip, Pulse Sever and Cleanse Flux before Planet 4; hex 7 adds Null Prison, Zenith Crash, Flux Bolt, Gravity Hammer, Resonance Cut, Symbiosis Link before Planet 8.
- **Non-destructive saved discovery migration:** pre-Cryo Journey ownership of formerly shared Crystal Bolt/Snare is replaced with a valid shared discovery (Fracture Spear/Phase Slip), retaining the earned spell count and no extra first-clear victory. Existing saved profile slots remain, and no account reset occurs; old Origins' actual selected loadouts may need browser review because Origin-bound abilities changed.
- **Overcharges 1.0 LIVE for new Journey Origins:** after each of waves 1–4, offer **exactly FOUR** run-only cards: two targeted at the player, one at each AI companion; player chooses **ONE**. Four waves → up to four total Overcharges. The effects last only during this match, can accumulate with bounded cooldowns and targeting limits, and never award permanent spell ranks/evolutions. Some role-aware options: LIVING BLOOM, GUARDIAN HALO, ARC TEMPEST, SIPHON DRIVE, COMET RAIN, RIME CASCADE. Real friendly AI casts/hits/heals can trigger their own Overcharge procs, not just player actions. A fallen AI companion can be selected and revives for the next wave.
- **Legacy distinction:** historical saved Origins retain their older Rank/Mastery intermission choices, while fresh Journey Origins use Overcharges. PvP remains postponed as a progression milestone and has no gate here.
- **Validation:** catalog counts and all three pure-discipline starter pairs, 5-discipline first reward, all 16 shared discoveries, old saved Cryo conversions, four wave intermissions for all three player Origins, exact recipient ownership, selectable fallen ally, no double pick/duplicate rewards and simulated real AI Overcharge procs tested. **Actual browser graphics, performance and tuning are NOT yet validated.**
- **Next suggested pass:** genuine AI STYLE control at 5 first-time planet clears (Balanced, Aggressive, Protective, Disruptive), then rankless Evolutions at 10; continue protecting old Origin saves. Overcharges may need timing and VFX tuning from playtests.

## HISTORICAL — HUB polish and Eclipse Origin starting-discipline correction (2026-10-12)

**Implemented and tested in GitHub:**
- Moved **Build Presets** from the right details column to the **left, directly below Your Spells**, keeping one set of three save slots and the existing New Build / Reset Talents buttons. Journey preset saves do not auto-fill a full legacy kit; loading older presets strips unearned shared spells and old Rank/Evolution settings from new Journey characters.
- **Journey Evolutions remain LOCKED, but are now readable and clickable as previews**. Clicking any Evolution satellite in the central tree, or one of the three right-hand Evolution cards, focuses its description and explicit lock status. No Evolution gets selected, saved or granted before the actual Planet 10 implementation. Legacy Rank-based Evolutions retain their previous behavior.
- Tested: HTML ID integrity, correct left-column location, browser import/cache strings, JavaScript syntax, three working clickable Journey Evolution cards, satellite selection, correct unlock guard, Journey preset save and prevention of importing an unearned spell.

**RESOLVED on 2026-10-12:** User approved **Crystal Bolt + Crystal Snare** as Eclipse's two bound Cryo starters. Flux Bolt and Phase Slip are now shared unlockable spells, as documented in the implementation section above. This older design-question paragraph is retained solely for chronology.

## IMPLEMENTED — Journey v2 foundation and two-spell Origin fix (2026-10-12)

**Status: FIRST LIVE PROGRESSION SLICE; browser gameplay review still pending.** [Roadmap 1.1](PROGRESSION_ROADMAP_1_1.md) remains the complete target design; this is not a claim that all of its milestones are implemented.

- **BUG FIX:** Genesis, Impact and Eclipse start with exactly **two bound spells**, including legacy level-1 builds. The SPELL_SLOT_LEVELS schedule no longer grants an automatic third ability at level 1. In new Journey rules only earned shared spells appear in actual combat and the inner HUB orbit.
- **NEW Origins:** Each new Origin receives an explicit per-Origin Journey v2 save with zero first-time clears and no earned shared spells. There is no user-facing Level, XP growth, numeric spell Rank or level-derived character HP/damage multiplier for these Origins. Old profiles without Journey remain on their previous XP/rank system **without being silently reset or assigned fake Planet Defense clears**.
- **LIVE clear/reward loop:** Play → select only the next available hex → Planet Defense → first-time victory increases the clear count → unclaimed permanent spell reward remains pending → HUB presents a choice across all 5 disciplines → one chosen shared spell is permanently discovered and automatically placed in the first open shared slot (up to eight). The rest of the 16 shared spells enter the library and can be exchanged into active slots after 8 clears. Planet Defense losses, non-Defense developer-mode victories and attempts to advance with a pending reward do not advance the campaign.
- **Discovery timing:** After **Planet 3**, eligible Counterplay spells are available immediately, for Planet 4. After **Planet 7**, advanced spells are offered immediately, for Planet 8. The new Journey encounter schedule was adjusted: Channeler interrupts/corruption begin at Planet 4, and Bulwark/shield-pressure starts at Planet 8. Older level-based encounters remain unchanged. Difficulty scales via encounter composition and mechanics, not hidden player/enemy ranks or HP level-inflation.
- **Historical note (superseded by Overcharges 1.0):** This first Journey pass temporarily used old run-only boosts. The live four-card, recipient-targeted Overcharges described above now replace them for new Journey Origins.
- **NOT YET IMPLEMENTED:** Actual AI style editing after 5, companion build editing after 15, genuine rankless permanent Evolutions at 10, permanent Synergies at 20, Rift Expedition, 17–19 campaign rewards and full encounter identity tuning. Preview milestone hexes and locked buttons are not finished feature unlocks. PvP gating remains undecided and is not part of the Journey.
- **VALIDATION:** static syntax/DOM/module-version audits and mocked runtime progression simulations passed for all three two-spell Origin starts, all first 16 first-clear spell discoveries, no duplicate wins, loss/PvP isolation, legacy-save preservation, 5-discipline initial choices and threats introduced after (not before) the relevant unlocks. Full Babylon/browser playthrough and visual review **still required**.

## HISTORICAL — HUB 2.1 layout before live progression (2026-10-12)

**Supersedes the incorrect HUB 2.0 layout described below.** User-reviewed screenshots made four requirements explicit:

- **Remove the top YOUR SQUAD strip.** The large central Evolution Tree belongs to the player and shows **exactly one hero orb**. Fix: `EnergyOrbShowcase.js` is back to *one actor per canvas*; the previous shared-scene all-actor fakeMatch caused duplicate/overlapping orbs in the player's Evolution Tree.
- Under the **central Evolution Tree**, two **side-by-side, compact AI panels** each use a real animated Babylon orb preview with the same `OrbCharacterRenderer`/`EnergyOrbPolish` rendering. No evolutionary ring/tree around them. Display AI Origin, role and spec derived from its actual current `botAbilities` spell disciplines. **STYLE** and **BUILD** are visibly disabled and labelled Planet 5 / Planet 15. No AI-specific progression roadmap. Individual small renderers are low-resolution / ~30fps and disposed when leaving HUB.
- **Journey Roadmap is no longer in HUB.** HUB **Play** opens a dedicated Play panel with the existing 20-hex snake map. Exactly the *next* hex (currently Planet 1 because no new first-clear campaign state exists yet) is clickable; select it before the **PLAY · PLANET 01** button becomes enabled. Future hexes cannot be started. The new button launches the current Planet Defense mode; existing prototype PvP modes remain under a collapsed **OTHER MODES · DEVELOPMENT ACCESS** disclosure. Rift Expedition remains locked.
- **Scope/safety (historical at the time of HUB 2.1):** The roadmap originally launched as a visual preview without win/reward tracking. **SUPERSEDED by the live Journey progression slice documented above**; the new Origin Journey now tracks verified first-clear wins, while existing legacy Origins remain safe.
- **Validation:** imported module syntax, all HTML element references and IDs, play selection gating (including attempts to skip to hex 10), working Planet Defense start, legacy 2v2 prototype access, Origin swapping, three isolated preview canvases and resource disposal were checked using mocked JavaScript runtimes; real Babylon/browser visual inspection still needed.

## SUPERSEDED VISUAL PROTOTYPE — HUB 2.0 Squad + Journey Preview (2026-10-12)

- **Visual/layout pass shipped to playable HUB:** a three-card team overview showing the Origin plus both AI companions; the player is central and larger. The existing `EnergyOrbShowcase.js` now draws **all three genuine Babylon/OrbCharacterRenderer + OrbPolish characters in one WebGL canvas and context**. AI roles are those the player did not choose (Genesis, Impact or Eclipse); avatar colors/team labels update when switching Origin. Preview-only visual scaling is approximately 18% player prominence and **does not modify combat hitboxes, movement, AI, player damage or game balance**.
- **Interactive read-only map:** `EnergyJourneyRoadmap.js` renders a 20-hex snake-path with previews at milestone 3 Counterplay, 5 AI styles, 7 Complexity, 10 Evolutions, 15 AI builds and 20 Rift Expedition/Synergies, plus spell discoveries and a full 10-slot build at 8. Clicking hexes reveals purpose. It currently shows **0 verified campaign clears on purpose**; old aggregated `wins`/XP include other modes and must **not** be relabeled as completed Planet Defense hexes.
- **Deliberately NOT implemented in this pass:** no new win tracking, spell grants, new level/rank calculations, stage unlocks, AI style controllers, AI build editor, Overcharge changes, or changed gameplay progression. Existing HUB spells/XP/ranks and saves remain functional *temporarily* while the migration is designed.
- **Technical checks:** JS syntax and import/cache linkage, DOM control IDs, fake-scene startup/rendering with all three Origin selections, 20 clickable hexes, screen reader labels, no fabricated completion, reuse of a single showcase scene, and scene lifecycle have passed mocked tests. Browser visuals/performance still need actual review.
- **Next pass candidate:** design the per-Origin campaign storage and deterministic first-clear rewards / old-save migration, then hook up gameplay progression and the actual new UI state.

## ACTIVE DESIGN PROPOSAL — Team Journey Roadmap 1.1 (2026-10-11)

**TARGET DESIGN. The first live Journey gameplay slice is now implemented (documented above), but several major milestones remain proposals/incomplete.** Active full spec: [PROGRESSION_ROADMAP_1_1.md](PROGRESSION_ROADMAP_1_1.md). Version 1.0 is preserved as an outdated historical draft, NOT the currently recommended gates.

- **PREPARE before a challenge:** spell pools expand and a new spell can be selected immediately **after hex 3**, for counterplay in hex 4, and immediately **after hex 7**, for complexity in hex 8. All five disciplines remain available from the very first earned shared-spell choice; nothing locks an entire discipline.
- **CONFIRMED: Only the player's Origin has a progression roadmap.** Both AI companions are displayed from the start in the HUB as smaller, living orbs alongside the larger player orb. They have **no separate progression paths, hex maps, XP bars or achievement counters**; their STYLE/BUILD options unlock via the player's roadmap. Player should also read slightly bigger on the field; visual size must not affect combat collision or range.
- After ~5 clears on the **player's single journey**, unlock **AI behavior style controls** for both companions (four initial proposed modes: Balanced, Aggressive, Protective, Disruptive). These are configurable settings, **not separate companion development paths**. The upcoming hexes can favor strategic selection but remain winnable via multiple approaches.
- After ~15 clears on the **player's single journey**, unlock **optional AI spell-build editing**; curated, style-aware default presets work without needing edits. Companion build/style **settings** are stored within that player's Origin save, but the allies **do not earn independent progress**.
- **CONFIRMED: Temporary PvE buffs are called Overcharges** in the new design. Present **exactly four cards between waves: two self-targeted and one for each AI companion; pick ONE of the four per intermission**, for up to four Overcharges in a five-wave run. They expire after the run and need real per-actor AI cast/proc integration; the other three cards are not granted.
- **PvP is deliberately postponed**, no speculative 15-clear PvP gate or milestone in the active campaign design. Do not schedule or hard-code it until the user raises it again.
- Encounters need variety, but can reuse a set of mechanic packages with larger mixed waves, denser enemies and intentionally enjoyable high-VFX spell chaos. No need for twenty unique boss systems.
- Keep #10 Evolutions and #20 Synergies/Rift Expedition as provisional milestones; five Rift clears optionally opens synergy deepening. Replace levels/ranks coherently and migrate existing saves non-destructively.

## HISTORICAL DRAFT — No-level Progression Roadmap 1.0 (superseded)

**Status: DESIGN ONLY — no progression/gameplay code changed.** Full working specification: [PROGRESSION_ROADMAP_1_0.md](PROGRESSION_ROADMAP_1_0.md).

- **Explicit requirement:** All five disciplines (Void, Solar, Cryo, Kinetic, Vital) are available for selection at the **first earned shared-spell reward**; lock **individual advanced spells**, never a whole category. Selection remains free across Origin roles.
- Replace level 1–30 and numeric spell Rank 0–3 with a 20-hex first-clear Planet Defense journey. Two bound Origin spells at start, eight interchangeable shared slots, and 16 shared spells that are progressively discovered. Later discoveries go into the library without growing the 10-slot combat bar.
- Draft escalation: Counterplay pool after 3 unique hexes, Complex spell pool after 7; Evolutions around 10; Synergies and Rift Expedition around 20; optional deeper synergy tree after five unique Rift Expedition clears.
- **SUPERSEDED PvP idea:** The 1.0 suggestion of a 15-win PvP unlock has been withdrawn from the active progression design. PvP will be revisited separately at the user's request.
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
