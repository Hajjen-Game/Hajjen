# HAJJEN V4 — TODO / OPEN DESIGN QUESTIONS

This document tracks the systems we still need to define, prototype, test and balance for HAJJEN V4.

HAJJEN V4 should be relatively difficult and mechanically deep. Complexity should come from meaningful decisions, risk management and interacting systems — not unnecessary UI or bookkeeping.

---

# LOCKED FOUNDATION

Do not redesign these without a clear reason.

## World and movement

- [x] Each zone is one complete **10×10 board / world** with 100 tiles.
- [x] The board is the world; there is no separate exploration mode.
- [x] Sharkan moves using two dice:
  - Movement Die: `1–6`
  - Direction Die: `North / East / South / West / Choose Direction / Wild`
- [x] If movement reaches the edge, Sharkan **bounces and continues in the opposite direction** using the remaining steps.
- [x] Rerolls can be used on either die.
- [x] No XP system and no character levels.
- [x] No companion system.

## Core game identity

- [x] **The board is the world.**
- [x] **The dice create the problem.**
- [x] **Cards give the player tools to solve the problem.**
- [x] **Mobs and exploration provide ingredients, cards and other rewards.**
- [x] **Flight Paths give the player increasing control over the zone.**
- [x] **Danger prevents unlimited exploration and greed.**
- [x] **Objectives drive the player toward the boss.**
- [x] **Talents build Sharkan between zones.**

## Current card-hand structure

- [x] Start each zone with **7 cards**.
- [x] The hand is divided into fixed category slots:
  - **3 Manipulation**
  - **2 Enhancement**
  - **2 Tactical**
- [x] Before the first roll, the player may redraw up to **3 cards total**.
- [x] A discarded starting card is replaced by a card from the **same category**.
- [x] Current base hand limit is therefore **7 cards**.
- [x] A category cannot use another category's empty slot.
- [x] If a category is full and the player receives a new card of that category, the player chooses whether to discard the new card or replace an existing card from that category.
- [x] Hand size may increase later through progression, preferably by adding category-specific slots rather than generic unrestricted slots.

## Card categories

### Manipulation Cards

- [x] Manipulation Cards alter the **world or game rules**.
- [x] They may affect things such as:
  - dice / rerolls
  - movement
  - resource choices
  - adjacent tiles
  - card flow
  - Danger
- [x] Danger reduction belongs here rather than in spells.

Examples already discussed:
- collect from an adjacent Ingredient Tile
- reveal 4 ingredient choices instead of 3, then choose 1
- choose 2 ingredients instead of 1
- reduce Danger

### Enhancement Cards

- [x] Enhancement Cards provide **pure positive boosts**.
- [x] They do not include drawbacks or trade-offs.
- [x] They modify ingredients, spells or potions.
- [x] They do **not** increase or decrease Danger.

Example:
- `Ember Focus — Increase the Critical Chance of an Ember spell by 5%.`

### Tactical Cards

- [x] Tactical Cards are for **encounters / combat in the current situation**.
- [x] They should not duplicate Manipulation Cards.
- [x] They should not modify spell creation like Enhancement Cards.

Possible examples to test later:
- Dodge
- Quick Guard
- First Strike
- Disengage
- temporary combat effects

## Ingredient tiles

- [x] Landing on an **Ingredient Tile** opens a choice of **3 ingredients**.
- [x] The player normally chooses **1 of the 3**.
- [x] This choice system compensates for the fact that movement is not fully under the player's control.
- [x] Manipulation Cards may alter this choice system.

## Empty tiles

- [x] There is **no recurring Action Window** on empty tiles.
- [x] The first time the player lands on an empty tile in Zone 1, show a short tutorial/info message.
- [x] After that, empty tiles should not repeatedly interrupt the game.
- [x] The same information should remain available through a future **HELP** button.
- [x] Cards that are legally playable from an empty tile may still be used without opening a generic action menu.

## Danger principles

- [x] Danger is a slow pressure / greed clock.
- [x] Current direction: **+1 Danger per completed turn**.
- [x] Meaningful world changes happen at thresholds rather than every single point.
- [x] There must be limited ways to reduce Danger, including Manipulation Cards.
- [x] **Spells and spell creation never increase Danger.**
- [x] **Spells and spell creation never decrease Danger.**
- [x] Danger reduction must remain separate from the spell-building system.

## Flight Paths

- [x] Flight Paths are **free to use**.
- [x] Both endpoints must be discovered before travel between them is available.
- [x] Reaching and discovering the Flight Paths is intended to be the difficult part.

## Progression

- [x] Completing a zone grants **1 Talent Point**.
- [x] Very rare additional Talent progression may be obtainable inside a zone.
- [x] Three equipped Spell slots and two separate contextual Action slots remain the current UI direction.

---

# PRIORITY 0 — CORE PLAYABLE LOOP

## 1. Exact turn structure

- [ ] Define the exact order of a complete turn.
- [ ] Decide what may be used before rolling.
- [ ] Decide what may be used after rolling but before movement.
- [ ] Decide whether any effects can interrupt movement.
- [ ] Decide whether only the landing tile resolves by default.
- [ ] Define the End-of-Turn phase.
- [ ] Define exactly when the standard `+1 Danger` is applied.
- [ ] Define what happens if an encounter/event is still unresolved.

Working structure:

`Start Turn → optional legal card effects → roll dice → reroll/manipulation → movement → landing tile → encounter/resource resolution → Danger/world update → End Turn`

---

## 2. Card system and card economy

### Decks and draws

- [ ] Decide whether each category has its own deck/pool or whether one master deck draws by requested category.
- [ ] Define deck sizes for Manipulation / Enhancement / Tactical.
- [ ] Define card rarity tiers, if useful.
- [ ] Decide whether discarded cards can return during the same zone.
- [ ] Decide how the player gains replacement/new cards during a run.
- [ ] Decide whether there is any guaranteed passive draw over time.
- [ ] Define card rewards from:
  - [ ] mobs
  - [ ] elite / rare mobs
  - [ ] treasure
  - [ ] objectives
  - [ ] mystery events
  - [ ] boss rewards
  - [ ] exploration

### Manipulation Cards

- [ ] Design the first playable set.
- [ ] Include dice manipulation cards.
- [ ] Include movement manipulation cards.
- [ ] Include Ingredient Tile manipulation cards.
- [ ] Include adjacent-resource collection.
- [ ] Include limited Danger-reduction cards.
- [ ] Decide whether multiple Manipulation Cards may be chained during one resolution.
- [ ] Prevent abusive/infinite combinations.

### Enhancement Cards

- [ ] Design the first playable set.
- [ ] Define which ingredient/spell/potion properties can be boosted.
- [ ] Decide when an Enhancement Card is attached/applied.
- [ ] Decide whether an Enhancement Card is consumed permanently when used.
- [ ] Define stacking rules.
- [ ] Keep all Enhancement effects **positive only**.

### Tactical Cards

- [ ] Finalize after the combat system is clearer.
- [ ] Define legal timing windows in combat.
- [ ] Define whether Tactical Cards are one-use per encounter or normal discard-on-use cards.
- [ ] Keep Tactical Cards encounter/combat-specific.

---

## 3. Ingredient system / Spell and Potion resources

- [ ] Define Ingredient Tile frequency across a 10×10 board.
- [ ] Define ingredient pools per zone.
- [ ] Decide whether all six Primal Forces can appear in every zone and at what frequency.
- [ ] Define the standard `Reveal 3 → Choose 1` UI.
- [ ] Implement Manipulation effects such as:
  - [ ] Reveal 4 → Choose 1
  - [ ] Reveal 3 → Choose 2
  - [ ] Collect from an adjacent Ingredient Tile
- [ ] Decide whether a depleted Ingredient Tile can be used again later in the same run.
- [ ] Decide whether ingredient options are random, weighted, or partially fixed.
- [ ] Decide where collected ingredients are stored: Spellbook, Backpack, or another dedicated resource area.
- [ ] Decide inventory limits for ingredients.

---

## 4. Danger system

- [ ] Finalize total Danger scale. Current working model: `0–20`.
- [ ] Test `+1 Danger per completed turn`.
- [ ] Test threshold structure such as:
  - [ ] 0–4 Calm
  - [ ] 5–9 Uneasy
  - [ ] 10–14 Dangerous
  - [ ] 15–19 Hostile
  - [ ] 20 Critical / maximum state
- [ ] Define exactly what changes at each threshold.
- [ ] Make Zone 1 slow enough to teach the game while still creating pressure.
- [ ] Decide how later zones scale Danger.
- [ ] Define non-spell sources of extra Danger, such as:
  - [ ] certain events
  - [ ] risky exploration decisions
  - [ ] cursed/rare world interactions
  - [ ] zone-specific mechanics
- [ ] Decide whether immediately rolling again after an empty tile should add extra Danger.
  - Current idea to test: normal turn `+1`, but choosing to simply press on from an empty tile may make the total `+2` for that turn.
  - Prefer whole Danger points; avoid half-points unless testing proves necessary.
- [ ] Design limited Manipulation Cards that reduce/prevent Danger.
- [ ] Prevent infinite Danger-reduction loops.
- [ ] Decide what happens at maximum Danger.

Core goal:

**The player can stay longer to improve their position, but every extra turn makes the zone increasingly dangerous.**

---

## 5. Dice manipulation, rerolls and Wild

- [ ] Decide how many rerolls the player starts with.
- [ ] Decide how rerolls are earned.
- [ ] Decide whether rerolls are a separate resource, cards, or a hybrid.
- [ ] Decide whether rerolls persist between zones.
- [ ] Finalize **Wild** on the Direction Die.
- [ ] Differentiate Wild clearly from Choose Direction.
- [ ] Define Manipulation Cards that can affect:
  - [ ] Movement Die
  - [ ] Direction Die
  - [ ] movement distance
  - [ ] direction after rolling
  - [ ] bounce behavior

---

# PRIORITY 1 — WORLD AND ENCOUNTERS

## 6. Tile types and board population

- [ ] Finalize Zone 1 core tile types.
- [ ] Decide approximate distribution across 100 tiles.
- [ ] Ingredient Tiles.
- [ ] Healing tiles.
- [ ] Hazard tiles.
- [ ] Treasure tiles.
- [ ] Mystery tiles.
- [ ] Shrines / objective tiles.
- [ ] Mob / encounter placement.
- [ ] Rare encounters.
- [ ] Flight Paths.
- [ ] Boss Shrine.
- [ ] Decide which tiles are fixed and which can vary between runs.

### Empty tile behavior

- [ ] Implement first-time Zone 1 tutorial popup.
- [ ] Do not show it again automatically after the first explanation.
- [ ] Add equivalent rule explanation to HELP.
- [ ] Test whether pressing on from an empty tile should cost extra Danger.

---

## 7. Mobs and combat

**Major open system.**

- [ ] Design normal mob combat.
- [ ] Decide whether combat occurs in the main UI, a modal, or a dedicated combat view.
- [ ] Define how the 3 equipped Spells are used.
- [ ] Define the 2 contextual Action slots.
- [ ] Define enemy turns / behavior.
- [ ] Define HP and damage model.
- [ ] Define status effects if used.
- [ ] Define mob difficulty tiers:
  - [ ] normal
  - [ ] elite
  - [ ] rare
  - [ ] guardian
  - [ ] boss
- [ ] Define how Danger changes encounters/mobs.
- [ ] Define mob reward/drop tables.
- [ ] Include card drops as a possible reward.
- [ ] Ensure mobs are valuable without XP.
- [ ] Make `fight or avoid?` a meaningful decision.
- [ ] Use the combat design to finalize Tactical Cards.

---

## 8. Boss system

- [ ] Define typical boss unlock conditions.
- [ ] Decide how unlock structures vary by zone.
- [ ] Define boss combat.
- [ ] Define boss phases / mechanics.
- [ ] Define interaction with the six Primal Forces.
- [ ] Define how boss weaknesses/information are discovered.
- [ ] Decide how much Boss Info is initially hidden.
- [ ] Define boss rewards.
- [ ] Decide how the world/Danger behaves once the boss encounter begins.

UI rule:
- **MÅL** = what the player needs to do.
- **BOSS INFO** = what the player knows about the boss.
- Do not duplicate unlock requirements in both panels.

---

## 9. Objectives / zone tasks

- [ ] Decide final terminology: Objectives, Tasks, Rumors, etc.
- [ ] Avoid generic filler quests.
- [ ] Define mandatory versus optional objectives.
- [ ] Define objective reward types.
- [ ] Decide whether objectives are visible from zone start or discovered while exploring.
- [ ] Decide whether optional objectives can reveal boss information.
- [ ] Make optional objectives compete with the Danger clock.

Possible patterns:
- restore a shrine
- hunt a rare creature
- locate something lost
- discover a location
- investigate a local event

---

## 10. Flight Paths

- [x] Free to use.
- [x] Both endpoints must be discovered.
- [ ] Decide how many a normal zone contains. Current idea: around 3.
- [ ] Decide whether Sharkan must land exactly on the Flight Path to discover it.
- [ ] Decide whether using a Flight Path consumes the current turn.
- [ ] Decide how arrival is resolved.
- [ ] Keep the system simple unless testing shows a need for more rules.

---

# PRIORITY 2 — SPELLS, POTIONS AND CHARACTER POWER

## 11. Spell system / six Primal Forces

- [ ] Preserve all six Primal Forces as relevant systems across the game.
- [ ] Define how ingredients create spells.
- [ ] Define how Enhancement Cards modify spell creation.
- [ ] Define the 3 equipped Spell slots.
- [ ] Define spell costs/cooldowns if any.
- [ ] Decide whether spells are reusable, charge-based, or another model.
- [ ] Define combat uses.
- [ ] Define possible non-combat uses without letting spells control Danger.
- [ ] Define force identities clearly.
- [ ] Balance forces so each remains broadly useful.

Hard rule:

**Spell use and spell creation must never increase or decrease Danger.**

---

## 12. Potion / Alchemy system

- [ ] Decide whether potions use the same Ingredient Tiles as spells.
- [ ] Define how potion recipes work.
- [ ] Define where potions are stored.
- [ ] Define how Enhancement Cards can boost potions.
- [ ] Keep potion effects separate from spell creation where useful.
- [ ] Decide whether any potion may interact with Danger. Current preference: keep Danger manipulation in Manipulation Cards unless a later design reason proves otherwise.

---

## 13. Backpack / Spellbook resource storage

- [ ] Decide exactly what belongs in Spellbook versus Backpack.
- [ ] Decide where collected ingredients live.
- [ ] Decide whether ingredients have a carrying limit.
- [ ] Decide where potions live.
- [ ] Decide how quest/special items are handled.
- [ ] Avoid unnecessary inventory micromanagement.

---

## 14. Talents and permanent progression

- [x] Zone completion = 1 Talent Point.
- [ ] Design Talent Tree structure.
- [ ] Define branches/themes.
- [ ] Define prerequisites/respec rules if used.
- [ ] Prefer talents that alter systems rather than only raw stat percentages.
- [ ] Explore category-slot talents:
  - [ ] +1 Manipulation slot
  - [ ] +1 Enhancement slot
  - [ ] +1 Tactical slot
- [ ] Explore improved starting redraw/card selection.
- [ ] Explore reroll/navigation talents.
- [ ] Explore Danger-related talents carefully.
- [ ] Define rare in-zone Talent progression.
- [ ] Test a `Primal Insight`-style system rather than farmable random Talent Point drops.
- [ ] Prevent repeatable Talent Point farming.

---

# PRIORITY 3 — RUN STRUCTURE AND BALANCE

## 15. Run start

- [x] Starting hand = **7 cards**.
- [x] Starting category split = **3 Manipulation / 2 Enhancement / 2 Tactical**.
- [x] Starting redraw = up to **3 total cards**, replaced from the same categories.
- [ ] Decide exact first-zone card pools.
- [ ] Decide starting HP.
- [ ] Decide starting rerolls.
- [ ] Decide starting spells/potions.
- [ ] Decide what permanent progression carries into a zone.
- [ ] Decide whether board layout is fixed, partially randomized, or fixed with randomized contents.

---

## 16. Win / loss conditions

- [ ] Define what happens at 0 HP.
- [ ] Define what happens at maximum Danger.
- [ ] Decide whether maximum Danger is instant loss or an extreme world state.
- [ ] Define retreat / voluntary exit if applicable.
- [ ] Define exactly when a zone is completed.
- [ ] Define rewards and transition to the next zone.

---

## 17. Difficulty scaling

- [ ] Zone 1 should teach systems while still being meaningfully difficult.
- [ ] Make Danger relatively slow/forgiving in Zone 1 compared with later zones.
- [ ] Increase difficulty through mechanics rather than simple HP/damage inflation.
- [ ] Scale through combinations of:
  - [ ] Danger behavior
  - [ ] enemy mechanics
  - [ ] hazards
  - [ ] objective complexity
  - [ ] card pools
  - [ ] movement problems
  - [ ] boss mechanics
  - [ ] zone-specific rules
- [ ] Introduce new systems gradually across zones rather than exposing every system immediately.

---

# PRIORITY 4 — UI / IMPLEMENTATION

## 18. Card UI

- [ ] Add **KORTLEK / deck** below the MÅL panel.
- [ ] Add the visible **7-card hand above SPELLBOOK / BACKPACK / TALENTS**.
- [ ] Visually separate hand slots as:
  - [ ] `M M M`
  - [ ] `E E`
  - [ ] `T T`
- [ ] Build the initial 7-card draw.
- [ ] Build same-category redraw for up to 3 cards before the first roll.
- [ ] Build inspect / select / play / discard states.
- [ ] Build same-category replacement when a category is full.
- [ ] Show card category and legal timing clearly without cluttering the board.

---

## 19. Ingredient choice UI

- [ ] Add Ingredient Tile popup/modal.
- [ ] Default: show **3 choices, choose 1**.
- [ ] Support Manipulation modifier: **4 choices, choose 1**.
- [ ] Support Manipulation modifier: **3 choices, choose 2**.
- [ ] Support collection from an adjacent Ingredient Tile via card.
- [ ] Make the choice readable and fast enough not to interrupt the turn flow excessively.

---

## 20. HELP / tutorial UI

- [ ] Add a HELP button.
- [ ] Add rule pages for:
  - [ ] movement / bounce
  - [ ] dice / rerolls
  - [ ] card categories
  - [ ] Ingredient Tiles
  - [ ] Danger
  - [ ] Flight Paths
  - [ ] objectives
  - [ ] combat when implemented
- [ ] Add one-time Zone 1 empty-tile tutorial.
- [ ] Track tutorial dismissal so it does not repeatedly appear.

---

## 21. Current HUD refinement

- [ ] Keep MÅL compact.
- [ ] Keep SHARKAN status focused mainly on HP + Danger.
- [ ] Keep rerolls attached visually to dice controls.
- [ ] Keep TILE INFO / BOSS INFO contextual.
- [ ] Implement real Spellbook, Backpack and Talents panels as their systems are defined.
- [ ] Implement contextual Spell / Action behavior when combat is designed.
- [ ] Decide final HP presentation: percentage versus another model.

---

## 22. Save / persistence

- [ ] Decide when the game saves.
- [ ] Persist Talent progression.
- [ ] Persist discovered knowledge if applicable.
- [ ] Decide whether an active zone/run can resume after closing the browser.
- [ ] Keep run-state separate from permanent progression.

---

# FUTURE TODO — NOT PART OF THE CURRENT CORE BUILD

These ideas remain possible but should **not** shape the current prototype until the core loop is proven.

## Crafting / materials / equipment

- [ ] Revisit crafting after several zones, once the base game is established.
- [ ] Decide whether later zones introduce **Material Tiles**.
- [ ] If Material Tiles are introduced, use the same general resource-choice principle as Ingredient Tiles: reveal several options and let the player choose.
- [ ] Decide whether Manipulation Cards can alter Material Tile choices.
- [ ] Design equipment only if it adds meaningful strategic depth.
- [ ] Keep equipment slots limited if introduced.
- [ ] Decide whether equipment is run-only or persistent.
- [ ] Define recipes and material storage only when crafting becomes an active system.

## Expanded hand progression

- [ ] Test increasing total hand size later in the game.
- [ ] Prefer category-specific slot increases over unrestricted hand expansion.
- [ ] Ensure larger hands do not become visually or mentally overwhelming.

## Advanced zone systems

- [ ] Introduce more complicated rules in later zones after Zone 1 establishes the fundamentals.
- [ ] Consider zone-specific card pools, hazards, travel rules and objective structures.
- [ ] Consider additional rare world systems only if they reinforce the core loop.

---

# LATER — VISUAL PRODUCTION

Do not prioritize this until gameplay systems are proven.

- [ ] Replace the black-and-white prototype with the final HAJJEN UI language.
- [ ] Each zone uses **one complete background/world image**, not stitched generated segments.
- [ ] True 90° top-down presentation.
- [ ] Preserve HAJJEN visual identity: approximately **65% low-poly / 35% pixel-art influence**.
- [ ] Keep the grid readable and relatively subtle.
- [ ] Keep special-tile icons restrained so the board does not become visually noisy.
- [ ] Add final Sharkan sprite/animation when mechanics are stable.

---

# CURRENT RECOMMENDED DESIGN / IMPLEMENTATION ORDER

1. **7-card category hand + mulligan**
2. **Card decks and basic card-use framework**
3. **Exact turn loop**
4. **Ingredient Tile: Reveal 3 → Choose 1**
5. **First Manipulation Cards**
6. **Danger thresholds + empty-tile Danger test**
7. **Reroll economy + Wild**
8. **Mob combat + Tactical Cards**
9. **Spell creation + Enhancement Cards**
10. **Potion system**
11. **Objectives + boss unlock**
12. **Flight Paths**
13. **Talents / permanent progression**
14. **Balance Zone 1 as a complete playable run**

---

# Design principle

**A simple-looking 10×10 board should produce difficult decisions because movement, cards, ingredients, enemies, objectives and Danger constantly compete for the player's limited opportunities.**
