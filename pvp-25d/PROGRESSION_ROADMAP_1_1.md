# Project Energy — Progression Roadmap 1.1: Team Journey

**Design date:** 2026-10-11 (updated after user feedback)  
**Status:** ACTIVE DESIGN + PARTIAL GAMEPLAY IMPLEMENTATION. The rankless 20-hex first-clear progression, initial spell discoveries, Cryo Eclipse starters and four run-only Overcharges are implemented for new Journey Origins. AI styles/build editors, permanent Evolutions/Synergies and Rift Expedition remain planned.  
**Supersedes:** [Roadmap 1.0](PROGRESSION_ROADMAP_1_0.md). Preserve 1.0 for design history; **1.1 is the active proposal**.  
**Concept:** A **single 20-hex progression roadmap for the player's Origin only**. Both AI companions appear alongside the player in the HUB and can eventually be assigned styles and optional preset/custom builds, but **have no separate development tracks, hex maps, levels, win counters, or reward routes**. All five disciplines are available from the first shared-spell choice. PvP is **out of scope and has NO proposed unlock date** until the user reopens that subject.

## User direction: decisions versus suggestions

**Explicit user intent:**
- Replace character levels and numeric spell ranks with a connected Planet Defense hex-roadmap.
- An Origin starts with **only its two bound spells**; shared spells unlock progressively; **Void, Solar, Cryo, Kinetic and Vital must all have eligible choices from the first win** and remain combinable across Origins.
- A new spell or counterplay category becomes available **BEFORE the encounter that will make it valuable**. Unlocks are preparation and anticipation, never compensation for a challenge already passed.
- **CONFIRMED:** Between waves, offer exactly **four Overcharge cards**: **two boost the player**, **one boosts AI companion A**, and **one boosts AI companion B**. The player selects **exactly ONE card per intermission**. The chosen effect lasts for the rest of the run; the other three cards are not granted.
- Both AI companions are visible in the HUB from the start; the player's orb is visually larger on the battlefield and HUB. **Only the player's Origin has a visible campaign progression track.** Companion style/build controls are features unlocked on that one shared player journey, not additional progression systems.
- Around first-clear #5, allow AI combat-behavior style selection; around #15, unlock optional AI build editing with **working style-based presets already supplied** so players never *have* to edit them.
- Encounter progression should vary enough to be interesting, but levels need not each introduce a bespoke boss/system: some steps should intentionally feature more enemies, more pressure, more simultaneous procs and enjoyable screen-filling chaos.
- **Do not plan PvP now.** Its availability timing will be decided later by the user.

**Draft tuning, subject to testing:** Stage gates #3/#7 for spells, #5 for AI styles, #10 for Evolutions, #15 for AI builds, #20 for Synergies and Rift Expedition, five unique Rift clears for optional Synergy Deepening. Exact encounter/balance/presentation details below are proposals, not accepted final decisions.

## Campaign principle: UNLOCK → EQUIP/PREPARE → FACE THE NEW THREAT

Every major hex should feature:
1. **After previous clear:** player sees a clearly marked reward on the hex and can immediately **choose or claim it**. Counterplay choices must be available in that post-win reward, never only after surviving the very encounter that requires them.
2. **In HUB:** player can equip the newly owned spell, edit companion styles/builds if unlocked, and inspect the next hex's general threat and reward.
3. **On NEXT hex:** new threats introduced, with room for more than one viable response. Telegraphs hint at intended counterplay, without naming the single correct build or hard-requiring a specific spell.

**Concrete revision from 1.0:** completing **hex 3** opens Counterplay and includes those spells in the **hex-3 reward selection**, for use in **hex 4**. Completing **hex 7** opens Complexity spells in the **hex-7 reward selection**, for use in **hex 8**. Unlocks at 5 and 15 similarly take effect for the **next** stage. Do not tell the player they earned an interrupt *after* being required to interrupt.

## Actual existing spell catalogue (22: 6 Origin-bound + 16 shared)

**Confirmed Origin-bound starter pairs:** Genesis: Pulse Mend + Resonance Guard (Vital); Impact: Phase Rush + Arc Strike (Kinetic); **Eclipse: Crystal Bolt + Crystal Snare (Cryo)**. Each Origin has exactly two spells from ONE discipline; the other Origins' bound spells are not in the shared pool. **Flux Bolt (Solar)** and **Phase Slip (Void)** remain fully functional as shared Journey discoveries. Total catalogue: 22 spells = 6 bound + 16 shared.

| Discipline | Choice pool at first clear (#1) | New spell options awarded with clear #3, usable in #4 | New spell options awarded with clear #7, usable in #8 |
|---|---|---|---|
| Void | Entropy Mark (DoT) | Rift Slash (debuff-follow-up melee strike), Phase Slip (mobility/slow cleanse) | Null Prison (breakable CC) |
| Solar | Sun Lance (finish wounded target) | Photon Barrier (absorb) | Zenith Crash (telegraphed AoE), Flux Bolt (multi-hit Solar rhythm) |
| Cryo | **Fracture Spear** (direct Cryo burst, stronger against slowed/rooted enemies) | — the two other existing Cryo spells are Eclipse-bound | — no additional shared Cryo spell yet |
| Kinetic | Vector Rush (travel/dodge) | Pulse Sever (melee interrupt) | Gravity Hammer (melee AoE telegraph), Resonance Cut (ranged interrupt) |
| Vital | Reactive Thread (HoT) | Cleanse Flux (dispel) | Symbiosis Link (damage-to-heal) |

**No discipline gating, EVER.** All five disciplines stay visible and selectable in each reward interface; options are filtered per individual spell ownership and hex unlock. Each new pool augments prior options, which never expire. **Design gap for future spell development:** the shared Cryo pool currently contains only Fracture Spear because Crystal Bolt and Crystal Snare are now Eclipse-bound. Fracture Spear works without setup and is therefore the initial Cryo option for ALL Origins; enemy/AI slows and roots increase its effectiveness. Consider adding a new distinct shared Cryo ability in a later Spell Identity pass if this feels too narrow.

Spells that have a counterplay prerequisite need adjacent encounters teaching that situation. Suggested encounter sequencing:
- **Hex 1–3:** distinguish DOT/direct burst, target focus, incoming swarm damage, positioning and basic slows. The player's first owned shared spell can come from any category.
- **Hex 4–7:** after hex 3 unlocked Counterplay, introduce dispellable status effects, dangerous interruptible Channeler casts, incoming spikes requiring barrier/positioning and some enemies that reward root/slow. No single interrupt or cleanse is mandatory to win.
- **Hex 8 onward:** after hex 7 unlocked Complexity, add multi-cast threats, clustered swarms and AoE opportunities, coordination with companions, opportunities for synergy and target setup. Don't put all new mechanics in one encounter without preparation.
- **Hex 6 onward:** after style unlock at #5, some encounters meaningfully reward changing one companion's behavior; e.g. Channeler-heavy wave rewards Disruptive, fragile-ally pressure rewards Protective, swarm DPS race rewards Aggressive.
- **Hex 16 onward:** after AI build access at #15, encounters can reward specific preset spell interactions or optional custom builds, but **no custom build editing is mandatory**.

### Active slots versus permanent collection
- At 0: 2 active bound spells. After clears 1–8, one **new owned shared spell + one active slot** per first-clear, reaching 10 active spells (2 bound + 8 shared).
- After clears 9–16, claim one more owned shared spell per clear. **These are in the library and can be swapped for the eight shared slots**, no more than 10 active total. No duplicate discoveries; at 16 all 16 shared spells may be owned.
- Hexes 17–19 require rewarding alternatives (more Evolution choices, specialized campaign challenges, cosmetics) rather than fake spell drops.
- All first-time post-clear rewards must persist if the player exits without choosing. Replays grant no extra permanent milestone.
- Genesis starts with two non-damaging spells; its allied melee/caster must be competent from the first round, without giving the player an unearned hidden third spell.

## Three-character HUB and battlefield identity — ONE player roadmap

**Beginning immediately, independently of customization unlocks:**
- **Current accepted HUB:** the player's large animated orb is alone in the Evolution Tree. Two compact AI panels are **beneath the central Evolution Tree**, side by side, each with its own smaller animated orb, role, spec and locked STYLE/BUILD controls. Do not show the rejected separate YOUR SQUAD strip or render multiple orbs inside the player's central tree. Companion appearance must not affect combat hitboxes.
- Each companion has role/name, health identity, default style label and a compact summary. Their silhouettes/colors derive from their own Origin identities. Do not render three independent heavy WebGL contexts; prefer one shared preview scene or reusable instances. **Only the player has an OPEN ROADMAP / hex progression view. No AI experience bars, victory counters, side-roadmaps or separate reward nodes.**
- Before player hex 5, companion cards are inspectable but their **STYLE** editor is preview/locked; before player hex 15, **BUILD** editor is preview/locked. Both unlocks appear as milestones on the **player's one roadmap**, not the companions' own tracks. No giant locked spell-tree panels cluttering the first HUB entry.
- Clicking self opens the main spell library and evolution tree. Clicking a companion after #5 exposes **STYLE**; after #15 also **BUILD**. Returning to self remains effortless.
- Companion presence is also identifiable during Planet Defense via existing friendly health/cast frames and role labels; player is visually the focal point. Player's larger graphic must not increase collision radius, targeting hitbox or AI melee range accidentally.

## IMPLEMENTED — Evolution System 1.0 (Stage 10+)

The Journey now unlocks rankless permanent Evolution choices after Stage **10, 12, 14, 16 and 20**. Each milestone adds one active choice to a maximum of five by Stage 20, with no additional invented rewards for 17–19. An Origin may activate **one of the three existing Evolutions per discovered or bound spell**; selecting a different option for that same spell is free, while choosing a new spell consumes another earned slot. Selections are saved per Origin as `journey.evolutions` and remain owned when switching equipped spells/presets; only equipped spells apply Evolution effects in live EnergyMatch combat. Full rankless Journey compatibility means `talentRank:0` even for evolved spells. Legacy Rank-based Evolutions remain unchanged.

The redundant right-side Evolution Preview summary beneath the three real Evolution cards has been removed. Locked Evolution descriptions remain inspectable before Stage 10. The DEV TEST ORIGIN starts with all five slots and can replay Stages 1–20 with the same Evolution-enabled full toolkit. All existing 66 Evolution definitions were retained for a future Spell Identity & Evolution design audit. **Manual browser combat QA pending.**

## IMPLEMENTED — AI Styles 1.0 (unlock after Stage 5)

**Live Stage-5 behavior pass:** each new Journey Origin saves a `companionStyles` selection for each of its two companion roles. HUB companion cards unlock their STYLE button after five first-clear Stages. Players may independently select Balanced, Aggressive, Protective or Disruptive; all default to Balanced. Each choice persists across matches and Origin switching. The selection is passed to the correct friendly AI actor, never to the human player or enemy bots. No new companion XP, extra progression maps or passive +% HP/damage modifiers.

- **Aggressive:** follows player focus, seeks vulnerable enemies and pursues offensive openings with closer ranged movement; emergency healing remains safe.
- **Protective:** prioritizes attackers near wounded allies, shields earlier, heals sooner and repositions more cautiously.
- **Disruptive:** focuses Channelers and active wind-ups, reacts sooner and attempts interrupts/control when those actual spells are available.
- **Balanced:** remains the baseline team planner with balanced target choice, defensive triage and pressure.
- **Safety/QA:** old XP/Rank Origins can be discarded by the roster loader per user approval; existing Journey Origins are kept with their owned spells, completed Stages and saved styles. UI lock, two independent style choices, save round-trip, actual distinct combat decisions, AI style report and match wiring were exercised in simulated JS tests. Browser visual review and tactical balance still needed.

### Original design intent (retained for context)

**Recommend only FOUR clear behavior presets initially** (default + three purposeful alternatives). Both allies can choose independently. Switch at HUB for free before each planet, and let chosen styles persist per Origin's team.

| AI style | Behavior priorities | Role-sensitive example |
|---|---|---|
| **Balanced** (default) | Existing adaptable pressure/burst/recovery and safe team play | Genesis heals when necessary, Eclipse contributes damage/interrupts |
| **Aggressive** | Prioritize exposed enemies and coordinated damage, shorter chase tolerance, offensive cooldown windows | Eclipse chains ranged damage on player's marked target; Genesis uses offensive downtime more actively but does not neglect emergency heals |
| **Protective** | Stay nearer vulnerable teammate, prioritize rescue and defensive control, risk-averse movement | Genesis pre-shields endangered ally; Eclipse kites and peels enemies attacking the player |
| **Disruptive** | Interrupt/countercast dangerous enemies, prioritize CC and boss abilities, interrupt-aware positioning | Eclipse focuses casting threats; Genesis dispels/counters if abilities permit |

**No hidden +% stat bonuses from selecting a style**; game should genuinely adjust `EnergyAI` target scores, cooldown choices, triage thresholds, movement distance and reaction priorities. Existing states PRESSURE / BURST / PEEL / RECOVER make this achievable, with explicit guardrails: never allow 'Aggressive' to skip emergency rescue entirely, never allow 'Disruptive' to cast an unavailable spell, prevent pathing thrash.

**Strategic encounters:** hint at what kinds of threats are coming via flavor, icons and enemy previews (e.g. “multiple concentrated channels detected”), but don't announce “Use Disruptive.” Try encounter simulations in Balanced and all other styles to ensure the player isn't hard-locked into exactly one solution.

## Companion build unlock (proposed: reward of clear #15)

- Both companion builds are **automatically complete and usable from the first battle**; they don't start with the player's two-spell restriction. Their *editor* unlocks at 15, not their combat competence.
- Default AI spell priorities/loadout should be preconfigured per companion role and style. Switching style earlier uses a curated corresponding AI loadout **preset** or behavior-appropriate priorities automatically; there is no requirement to hand-build two companions.
- On/after 15: optional custom spell selection, simple ability priority display and saved named presets; accessible through the same companion card. Choose whether to expose Evolutions simultaneously or separately after UX testing.
- Start with **role-and-style curated presets** rather than writing 12 new arbitrary builds if the current AI doesn't support the spells. Each preset must be tested for interrupt availability, healing coverage, travel and damage range.
- Optional “RESTORE RECOMMENDED BUILD” and free respec. Do not punish the player for leaving the AI on default.
- Persist ally role, selected behavior style, preset identifier, optional customized spells, and AI preferences *with that player's Origin/save*. Do not mix companion loadouts across character slots.

## Temporary between-wave buffs — **OVERCHARGES** (confirmed term for design)

**Implemented in first gameplay pass:** temporary **Overcharges** replace legacy between-wave Rank trials **for new Journey Origins**. Each card targets a specific live player/AI actor; real casts, hits and heals trigger bounded Overcharge effects with internal cooldowns and VFX events. Older legacy Origins retain their previous trial system. Overcharges are distinct from permanent spell/Evolution rewards granted after clearing a campaign hex.

**CONFIRMED OFFER/CLAIM RULE:** After each of the four intermissions in a five-wave Planet Defense run, present **four cards**: **two for YOU**, **one for AI A**, **one for AI B**. Player picks **ONE card total**. Apply it to the explicitly shown recipient, discard the other three choices, and begin the next wave. Thus one full run grants at most **four total Overcharges**, not four per wave. Never auto-apply all four.

Example after Wave 2:
| Target | Card example | Effect |
|---|---|---|
| YOU option 1 | **CHAIN REACTION** | Your primary attack can branch to other enemies during this run |
| YOU option 2 | **ORBITAL ECHO** | Each few successful hits conjure a orbiting spell echo that fires on the next target |
| GENESIS companion | **LIVING BLOOM** | Genesis healing periodically emits an allied healing pulse with a visible energy ring |
| ECLIPSE companion | **COMET RAIN** | Eclipse completed casts occasionally leave several small falling energy impacts |

- Exactly which cards appear is **curated based on current actors' actually equipped spells and roles**. Do not offer Impact-only spell buffs to Genesis. Each card visually shows the recipient's orb, name and discipline.
- After selection, only that target receives the buff; it lasts for the **remainder of that Planet Defense run**, disappears on win/loss/restart, and is not persisted as a permanent Evolution. A newly revived ally retains its run-specific Surge.
- Four intermissions in a five-wave battle → up to four chosen **Overcharges** in a run, each assigned to whichever of the three teammates was printed on the chosen card. Stacking allowed but bounded and visibly trackable; choose whether repeated effects increase tiers or open complementary combinatorial effects.
- This is the system for **high-ceiling fun/chaos**: split shots, pulsing orbital companions, echo casts, chain lightning/Flux arcs, larger falling impacts, shockwave chains, healing blooms. Allow deliberately flashy builds by later waves.
- Balance by **internal proc cooldowns, target caps, bounded recursion and total active particles**, not by removing all fun. Keep interrupt/dodge telegraphs legible. Avoid runaway lag and exponential damage when two procs trigger each other.
- **Implemented boundary:** `EnergyPlanetDefense.js` offers four Overcharges only for new Journey Origins; existing `EnergyDefenseTrials.js` Rank/Mastery choices remain available only to older legacy profiles. Player/companion Overcharges are run-only and never saved in permanent progress. Permanent discoveries happen after a first-clear, in HUB. The full visual/AI balance of Overcharges needs browser playtesting.
- AI-targeted buffs require a **target actor ID** and real event/proc hooks for AI casts/hits/heals; currently many Wave Resonances are player-only. Don't just recolor a card.

## The revised 20-hex milestone map

| Hex completed | Reward BEFORE starting next hex | New challenge in the following hex |
|---:|---|---|
| 0 | Create Origin; two bound spells; see companions in HUB | Hex 1 teaches basic team survival and targeting |
| 1 | Choose from all five shared disciplines; add third active slot | Hex 2 supports whatever player chose |
| 2 | Choose next shared spell, fourth slot | Hex 3 builds simple pressure and movement |
| **3** | **Open Counterplay pool immediately**; choose an eligible spell (fifth slot) | **Hex 4** introduces threat mechanics rewarding dispel/barrier/root/interrupt |
| 4 | Choose next shared spell (sixth slot) | Hex 5 increases counterplay opportunities |
| **5** | Choose shared spell (seventh slot) + **unlock AI STYLE selectors for both companions** | **Hex 6** rewards style experimentation |
| 6 | Choose next shared spell (eighth slot) | Hex 7 transitions toward advanced tactics |
| **7** | **Open Complexity pool immediately**; choose shared spell (ninth slot) | **Hex 8** introduces the more advanced situations |
| 8 | Choose shared spell (tenth, final active slot) | Hex 9 begins high-density threats |
| 9 | Choose unowned shared spell for collection | Hex 10 showcases full build potential |
| **10** | Choose unowned shared spell + earn first **permanent Evolution slot** | Hex 11 offers real Evolution strategies |
| 11–14 | Continue shared spell discoveries; earn Evolution slots after **12 and 14** | Gradually varied mechanics and greater enemy pressure |
| **15** | Choose unowned shared spell; optional **AI BUILD** editor remains planned | Hex 16 must work with curated AI defaults |
| 16 | Claim final shared spell + earn fourth Evolution slot | Hex 17 transitions to wider strategic challenges |
| 17–19 | No fabricated extra rewards; continue strategic encounter escalation | Mixed high-intensity swarms, harder boss conditions and meaningful strategy |
| **20** | Earn fifth Evolution slot. **Synergies + Rift Expedition** remain candidate future unlocks (not implemented) | Future Expedition campaign planned |
| Rift Expedition clear 5 | Optional Synergy Deepening Tree candidate | Further progress beyond Planet Defense |

**PvP is intentionally absent** from this table. It is postponed, not “unlocks at 15” and not replaced with another assumed date. The current prototype UI can remain during design experimentation, but the future PvP gate is a separate user decision.

### Keeping 20 campaign steps varied without requiring 20 wholly unique mechanics
Use a combinatorial encounter director drawing from a small but well-tested library:
- **Swarm Rush:** more Rift Shards / fast low-HP enemies.
- **Channel Threat:** more interruptible Channelers / synchronized casts.
- **Guardian Push:** Bulwark with protection / positional pressure.
- **Corruption Field:** dispellable dots and timing pressure.
- **Cluster Storm:** densely packed enemies that make AoE and chain Surges feel spectacular.
- **Boss Fusion:** a boss using two previously learned mechanics together.

Vary enemy counts, spawn directions, timing, spacing, environment or hazard density, ally pressure and boss phases. Some later planets are deliberately **“power fantasy”** stages with a larger enemy count and excellent compatibility with stacked Wave Surges, rather than strictly new boss mechanics. Give each hex a short threat description and one distinguishing modifier while reusing existing VFX/actors. Avoid overly long runs early on, and budget frame-time for many projectiles.

**Fairness:** Stage 5 does not assume AI styles are editable before its clear. Stage 15 does not assume manually edited AI builds before its clear. Preview and award before introducing a challenge that benefits from them. A loss allows retry and preparation; no forced new Origin, respec tax or unrecoverable build trap.

## HUB / UX / saving / migration implications

- **Current accepted navigation:** HUB contains the player's large Evolution Tree with the two small AI panels beneath it. The **Journey Roadmap is opened by HUB → PLAY**, not displayed directly in the HUB. Select the next available hex and then press PLAY to start that planet. Completed hexes show green ticks; future ones are locked. AI panels progressively unlock STYLE after player's 5th clear and BUILD after player's 15th clear, without any AI-specific progression tracks.
- Separate expandable views for the player's spell library and each companion's style/presets; avoid showing three giant trees simultaneously.
- Campaign roadmap: a curved, connected 20-hex map; completed green tick and text, active bright node, locked dark nodes with clear milestone icons at 3, 5, 7, 10, 15, 20. Click any future hex for a preview, not to play it. Use accessibility labels and keyboard focus.
- First-clear rewards (permanent): account for pending unclaimed reward and transactional save; library accepts all disciplines; max 10 active. **Overcharges** (temporary): actor-targeted, exactly one chosen from four cards per wave intermission, and run-only.
- Extend versioned **per-Origin** saves for first-clear node, chosen player spells, companions' style IDs, companion preset/build customisations and Expedition progress. Temporary Surges don't survive leaving the current run. Don't silently grant historic Planet Defense clears from existing aggregated wins.
- Existing level/rank/AI power progression and enemy level tiers are coupled to `EnergyProgression.js`, `EnergyMatch.js`, `EnergySpellBalance.js`, `EnergyPvEEncounters.js`, `EnergyAI.js`, `EnergyDefenseTrials.js`, `EnergyPlanetDefense.js` and HUB. Implement across files in guarded passes instead of hiding Level labels and leaving the old rules secretly active.
- **Implementation order proposal:** (1) isolated **single-player** Journey/Hex-map UI prototype + three-orb HUB composition (no save change); (2) campaign save schema/spell unlocks and encounter preview/tiers; (3) **Overcharges** per-actor and user-facing four-card/select-one UI; (4) AI STYLE behaviors at the player's fifth clear; (5) optional AI BUILD presets/editor at the player's fifteenth; (6) Evolutions/Synergies/Rift Expedition integration. Add tests for replay farming, duplicate spell rewards, multiple Origins, per-Origin companion settings (NOT independent ally tracks), AI-targeted buff procs and low-FPS large swarms.

## Remaining design decisions

1. **Overcharge selection — CONFIRMED:** Four cards between each wave; two for player, one per AI; select exactly ONE. This is not an open balance question.
2. **Terminology:** Use **Overcharges** for this run-only PvE buff system in the new design. Individual buff names/effects remain to be developed.
3. **AI style set — IMPLEMENTED:** Balanced/Aggressive/Protective/Disruptive now change actual companion target/triage/cast/movement decisions and save per Origin after Stage 5. Continue live playtesting role distinctions and pathing.
4. **AI build access at 15:** curated defaults remain automatic; how far to allow changing their class-bound spells/Evolutions is TBD.
5. **Progression pace:** initial 20-hex plan, 1–16 spell rewards and 17–19 alternate rewards to tune via real playtesting.
6. **Synergy Tree:** only if deeper tree changes gameplay meaningfully rather than simply increases stats; remains optional.
7. **PvP:** no progression milestone or release plan until user returns to it.
8. **Planet Defense/Project Energy naming:** “Space Surf” and final game title remain undecided.

**Important clarification — CONFIRMED:** AI allies are visible and customisable in the HUB, but **only the player's Origin roadmap is displayed**. The player clearing hex 5/15 globally unlocks AI style/build configuration. Companion settings are not companion progression.

**No gameplay code is changed by this design document.**
