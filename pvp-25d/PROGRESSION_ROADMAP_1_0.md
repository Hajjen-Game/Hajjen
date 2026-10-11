# Project Energy — Progression Roadmap 1.0 (DESIGN PROPOSAL)

**Created:** 2026-10-11  
**Status:** PROPOSAL / review before implementation. **Nothing in this document changes running gameplay.**  
**Scope:** Per-Origin progression, spell-library discovery, HUB, the 20-hex Planet Defense campaign, optional PvP gate and Rift Expedition.  
**User direction:** Remove levels and numeric spell ranks. Begin with two bound Origin spells. Each new Planet Defense clear advances a hex and gives a meaningful choice. Unlock Evolutions around clear 10; Synergies and Rift Expedition around clear 20; maybe deeper Synergy tree after five Rift Expedition clears. **All five disciplines must be offered from the first shared-spell choice**; never lock an entire discipline. The suggested PvP gate at clear 15 is **not yet decided**.

## Design pillars (intent agreed, details proposed)

1. **Progress, not XP:** show cleared campaign nodes and newly available mechanics, not LEVEL 1–30, spell rank 0–3 or XP bars.
2. **Build freedom first:** every Origin starts with its two immutable Origin spells, but every shared discipline (Void, Solar, Cryo, Kinetic, Vital) is eligible at **the first spell choice**. Never force a character down a preset element or role path.
3. **Teach mechanics, not elements:** progressively unlock *individual* spells because waves teach mobility, pressure, target priority, disruption, protection and then combos. Opening the next tier adds spells **across disciplines**, not a single new discipline.
4. **Library versus loadout:** earning a permanent spell means owning it in the character's library. An active spell slot is separate; the maximum is currently **10 active spells = 2 Origin-bound + 8 interchangeable shared**. Owning 16 shared spells must not result in 18 active abilities.
5. **A win means first-time clear of the next hex:** replaying a completed Planet Defense hex is allowed for practice/resources but should not farm new milestone progress. A loss doesn't erase completed hexes; retry the active node.
6. **One clear = roughly one meaningful moment:** a new chosen spell, new slot, Evolution choice or campaign milestone. Avoid forced filler rewards and avoid random offers that trap a build.
7. **No fake feature unlocks:** Rift Expedition and deeper Synergy trees remain locked/previewed until gameplay actually exists.

## Grounded catalogue: 22 existing spells, no invented new abilities

Currently six are bound to the three Origins:

| Origin | Bound starting spells |
|---|---|
| Genesis | Pulse Mend (Vital), Resonance Guard (Vital) |
| Impact | Phase Rush (Kinetic), Arc Strike (Kinetic) |
| Eclipse | Flux Bolt (Solar), Phase Slip (Void) |

There are **16** shared spells available to every Origin across five disciplines. Assign them to **discovery stages**, NOT role restrictions. The *exact* 1.0 proposal:

| Discipline | FIRST DISCOVERY: available for choice at victory 1 | COUNTERPLAY: added after clearing hex 3 | COMPLEXITY: added after clearing hex 7 |
|---|---|---|---|
| Void | **Entropy Mark** — simple pressure over time | Rift Slash — combines with debuffs | Null Prison — timed CC, DR and damage-break |
| Solar | **Sun Lance** — priority-target finisher | Photon Barrier — distinguish absorb from damage reduction | Zenith Crash — telegraphed ground AoE |
| Cryo | **Crystal Bolt** — a visible slow and ranged control | Crystal Snare — root and reposition | Fracture Spear — burst with slow/root setup |
| Kinetic | **Vector Rush** — physical mobility and dodging | Pulse Sever — melee interrupt timing | Gravity Hammer — melee telegraph; Resonance Cut — ranged interrupt |
| Vital | **Reactive Thread** — simple sustained survival | Cleanse Flux — counter newly introduced dispellable effects | Symbiosis Link — offensive damage-to-heal conversion |

**Availability timing:** hex 1–3 choices come from First Discovery (five spells, one per discipline). After the **third clear**, open all five Counterplay spells for the **fourth** reward. After the **seventh clear**, open all six Complexity spells for the **eighth** reward. Unlock logic should also allow all already-unlocked unowned spells in later picks; early tiers never disappear.

**Do not block cross-discipline picks.** For example, Impact may choose Reactive Thread or Crystal Bolt; Genesis may choose Sun Lance or Vector Rush. Show useful warnings like *“Melee range”* or *“Targets allies”* rather than disabling unusual combinations. Bound spells of *other* Origins are not in the shared pool unless separately decided in future.

**First spell reward UX:** present five equally prominent category sections (Void / Solar / Cryo / Kinetic / Vital), each with an unlocked spell card, **choose one**, not a random three-card roll. Later, show all available unowned choices within each section. Lock silhouettes and short, accurate descriptions are visible with reasons *“Counterplay — clear Planet Defense 3”*, *“Complexity — clear Planet Defense 7”*. If one discipline has no unowned eligible spells, mark it *“All discovered”*; never imply a discipline itself is locked.

**Why these unlocks:** the first three encounters teach direct damage, DOT, kiting, mobility and support. The next encounters introduce disruption, dispellable debuffs and protection. The later encounters add boss telegraphs, coordinated AoE, ranged interrupts, set-up burst and advanced links. **Important dependency:** modify the encounter sequence to actually *teach* each unlocked counter before requiring it.

## Campaign roadmap — draft 20-hex reward schedule

A hex represents a unique forward campaign step, not a generic counter increment. The next unfinished node is highlighted; completed nodes have a green check. The following schedule is a **proposed baseline**, not accepted balance:

| Planet Defense clear | Permanent reward / milestone | Active loadout capacity |
|---:|---|---|
| 0 — new Origin | Your **2 bound Origin spells** only; first five shared spells visible as potential discoveries | 2 |
| 1 | Choose 1 unowned shared spell from any of all **5 disciplines** | 3 |
| 2 | Choose 1 shared spell | 4 |
| 3 | Choose 1 shared spell; **Counterplay pool** becomes discoverable for the next clear | 5 |
| 4 | Choose 1 shared spell | 6 |
| 5 | Choose 1 shared spell | 7 |
| 6 | Choose 1 shared spell | 8 |
| 7 | Choose 1 shared spell; **Complexity pool** becomes discoverable for the next clear | 9 |
| 8 | Choose 1 shared spell; **active build now 10 spells max** | 10 |
| 9 | Discover 1 more shared spell in your **library**, can swap at HUB | 10 |
| 10 | Discover 1 shared spell; **EVOLUTIONS OPEN** and grant first Evolution choice | 10 |
| 11 | Discover 1 shared spell | 10 |
| 12 | Discover 1 shared spell + another Evolution choice | 10 |
| 13 | Discover 1 shared spell | 10 |
| 14 | Discover 1 shared spell + another Evolution choice | 10 |
| 15 | Discover 1 shared spell; **PVP candidate unlock (TBD)** | 10 |
| 16 | Discover final 16th shared spell + another Evolution choice | 10 |
| 17 | Evolution choice / special training milestone (details TBD) | 10 |
| 18 | Evolution choice / stronger encounter identity (details TBD) | 10 |
| 19 | Rift warning, final readiness test and upcoming-milestone preview (reward TBD) | 10 |
| 20 | **SYNERGIES + RIFT EXPEDITION unlock** (proposed). Forge first combination from spells you own. | 10 |

**Accounting check:** hexes 1–16 award exactly **16** shared spells (one per first-time clear), matching the full shared catalog; hexes 1–8 unlock exactly eight active slots. At hex 8 the player owns 8 shared + 2 bound, and at hex 16 owns all 16 shared but can equip only 8. Never award duplicate spells. The 17–19 rewards should be fleshed out before committing the campaign as final.

**Evolution design proposal:** at 10, open *one choice of one Evolution for one owned spell*, not the entire existing rank-driven tree at once. Additional Evolution selections at selected milestones; Evolutions are meaningful behavior changes rather than a 6%/12%/18% numeric Rank ladder. Each spell can have one selected Evolution, switchable with safeguards at HUB. **No spell ranks**; if temporary wave trials are kept, change them to **try a locked spell/Evolution briefly**, not Rank 1/2/3 upgrades.

## Post-campaign: Rift Expedition (proposal)

- After **20 first-time Planet Defense clears**, unlock Rift Expedition and the first **Synergy** tool together. Rift Expedition is not built yet; keep the menu locked until implementation.
- Five **unique** Rift Expedition clears then open an optional **Synergy Deepening Tree**. This deeper tree is *conditional* on deciding it is worth the system complexity. Do **not** implement placeholder numeric talents just to create a second XP bar.
- Beyond 20, progress can be about tougher encounters, alternate boss mechanics, synergy combinations, high-score/performance or cosmetic mastery, rather than infinite level numbers.

## PvP — **tentative 15-clear gate**, not a decision

- **PROPOSAL ONLY:** PvP remains locked initially with *“Suggested: unlock after 15 Planet Defense clears (TBD)”*. No hardcoded gate until confirmed. A test alternative is **12/15/18** clears depending on time-to-onboard.
- At unlock, the existing 1v1 / 2v2 / 3v3 modes can open together; retain freedom of mode choice. A separate stagger for 1v1→2v2→3v3 is an open design alternative.
- PvP must **not** give exclusive spells or shortcut the PvE hex road; normalisation/fair AI matching should be considered so someone who unlocked extra Evolutions doesn't steamroll a new PvP participant.
- Replaying PvE nodes or repeatedly winning 1v1 does not advance first-clear campaign milestones.

## Proposed HUB and hex-roadmap interface

**Navigation:** Main Menu → Resume/New Origin → HUB → PLAY → PvE/PvP. In the HUB, replace the Level/XP card with a prominent **JOURNEY** card: *“Planet Defense · 7/20 cleared · NEXT: Complexity spells”* and **OPEN ROADMAP**.

**Map layout:** 20 connected, softly staggered hexagons on a dark cosmic backdrop (not a spreadsheet). Use thin energy paths and subtle parallax rather than noisy stars. Completed nodes: clear green tick; active next node: bright blue/white pulse and a PLAY button; future nodes: dark outline; major milestones: taller highlighted hexes/icons at **3 (Counterplay), 7 (Complexity), 10 (Evolutions), 15 (PvP? tentative), 20 (Rift + Synergy)**. Clicking a future hex reveals the reason and expected reward; don't treat clicking it as starting the match. Clicking a completed hex gives Replay (no progression award).

**Reward sequence after a first-time clear:** match result → completed hex receives green tick and connected path lights up → player sees the newly earned choice (with five discipline headings) → selecting one persists the spell atomically → return to HUB or proceed to the next node. If they exit before choosing, save **pending reward** and require them to resolve it on next HUB entry. Never silently auto-select or lose a reward.

**Library:** 5 discipline sections in all contexts; distinguish **OWNED/EQUIPPED**, **OWNED/NOT EQUIPPED**, **DISCOVERABLE**, **LOCKED UNTIL HEX N**. Locked icons show rationale (not a dead blacked-out category). The only immutable spells are the two tied to the player's chosen Origin.

**Accessibility/readability:** hexes need status text/aria labels in addition to color (green tick alone isn't enough), reachable via keyboard, at usable mobile review scale although gameplay itself does not require mobile controls.

## System architecture and migration risks (must resolve before replacing progression)

- Remove **level 1–30, XP bars and per-spell Rank 0–3** from public UI and stored progression logic, not by merely hiding labels. Existing systems rely on level for `EnergyProgression.js` (`SPELL_SLOT_LEVELS`, `stagedLoadout`), `EnergyCharacter.js` talent points, `EnergySpellBalance.js` HP/damage/ranks, `EnergyPvEEncounters.js` tiers/boss difficulty and `EnergySingularity.js` Forge gates. All must be revised together, with tests.
- Keep baseline HP/damage defensible across campaigns and PvP. Scale **enemy wave mechanics/rosters and encounter challenge** to campaign node and toolkit, not simply inflate enemy health with every clear. Don't strand level-dependent AI/team stats.
- Store per-Origin `defenseClears` (distinct from old generic `wins`), `riftClears`, `unlockedSharedSpellIds`, `pendingRewards`, `activeLoadoutIds`, `selectedEvolutions` and `synergyUnlock`. Use an explicit **version 2** campaign schema and atomic award transactions.
- Existing profiles currently store XP and **generic total wins**, without reliable proof of Planet Defense wins. Never treat all historic wins as defense clears. Before release, offer a transparent, **non-destructive migration** preserving current characters and their learned spells/Evolutions, or an opt-in fresh Origin campaign. Do not silently reset saves or claim an inaccurate 20-node completion.
- The old `completeArenaBuild` automatically fills eight spells; under the new rules combat must use only *actually unlocked/equipped* spells or starting with two spells is fake. All between-wave Rank trials need conversion or retirement.
- PvE currently starts Genesis with two **non-offensive** bound spells (Pulse Mend/Resonance Guard); early Planet Defense needs its two AI allies to deal enough damage, or a carefully designed **non-spell basic action** (not a hidden third unlock) so the Origin feels playable and engaging.
- Need separately confirm whether existing **Spell Mastery**, **Talent Points** and the **Forge tier upgrades** remain as standalone systems or get folded into one Evolution/Synergy interface. **No blanket auto-removal based only on the word 'rank'.**

## Decisions still requested from user

| Item | Default proposal | Status |
|---|---|---|
| Levels and spell ranks | Remove, progression is a 20-hex campaign | Strong direction, not implemented |
| Discipline access | All five in first shared-spell reward | **Explicit user requirement** |
| Full active loadout | 10 (2 bound + 8 shared) after 8 clears | Proposal |
| Discovery gates | Counterplay after 3; Complexity after 7 | Proposal |
| Evolutions | First choice at 10, additional milestone choices | Proposal |
| PvP access | After ~15 clears, all three sizes | **TBD**, user uncertain |
| Synergies + Rift Expedition | After 20 clears | Proposal |
| Deepening tree | After 5 unique Rift Expedition clears | Optional/TBD |
| Planet Defense name | 'Space Surf' is a candidate, not final | TBD |
