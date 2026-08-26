# HAJJEN V4 — TODO / OPEN DESIGN QUESTIONS

This document tracks the systems we still need to define, prototype, test and balance for HAJJEN V4.

The goal is **not** to simplify the game into a casual board game. HAJJEN V4 should be relatively difficult and mechanically deep, with complexity coming from meaningful decisions, risk management and interacting systems.

---

## Locked foundation — do not redesign without a reason

These are the current baseline rules we are building around:

- [x] Each zone is one complete **10×10 board / world** with 100 tiles.
- [x] Sharkan moves using **two dice**:
  - Movement Die: `1–6`
  - Direction Die: `North / East / South / West / Choose Direction / Wild`
- [x] If movement reaches the edge of the board, Sharkan **bounces and continues in the opposite direction** using the remaining steps.
- [x] Rerolls can be used on **either die**.
- [x] No XP system and no character levels.
- [x] The board is the world; dice create the problem; cards give the player tools to solve the problem.
- [x] Start each zone with **5 cards**.
- [x] Before the first roll, redraw **0–3 starting cards**.
- [x] Current preferred maximum hand size: **7 cards**.
- [x] If the hand is full when receiving a new card, the player chooses which card to discard, including the newly drawn card.
- [x] Flight Paths are **free to use**, but both endpoints must first be discovered.
- [x] Danger is a slow pressure system rather than direct damage every turn.
- [x] Current Danger prototype direction: **+1 Danger per completed turn**, with meaningful effects at thresholds rather than every point.
- [x] There must be limited ways to **reduce Danger**, including cards.
- [x] Completing a zone grants **1 Talent Point**.
- [x] Very rare additional talent progression may be obtainable inside a zone.
- [x] Three equipped Spell slots and two separate contextual Action slots.
- [x] No companion system.
- [x] Graphics are secondary until the main game systems work.

---

# PRIORITY 0 — CORE GAME LOOP

These systems should be designed before expanding the amount of content.

## 1. Turn structure / turn loop

- [ ] Define the exact order of a complete turn.
- [ ] Decide which actions are allowed **before rolling**.
- [ ] Decide which cards/spells can be used **after rolling but before movement**.
- [ ] Decide whether anything can interrupt movement.
- [ ] Decide whether only the landing tile resolves, or whether some tile types can trigger while passing through them.
- [ ] Define the End-of-Turn phase.
- [ ] Define exactly when Danger increases.
- [ ] Define what happens if a turn begins while another encounter/event is unresolved.

Possible structure to test:

`Start Turn → optional pre-roll actions → roll dice → dice manipulation/reroll → movement → landing tile resolution → combat/event resolution → Danger/world reaction → End Turn`

---

## 2. Card system / card economy

- [ ] Finalize card categories.
- [ ] Decide whether Materials, Ingredients, Consumables and Tactical cards all share the same 7-card hand.
- [ ] Decide how often the player receives new cards during normal play.
- [ ] Decide whether there is any guaranteed passive draw over time.
- [ ] Define card rewards from:
  - [ ] normal exploration
  - [ ] mobs
  - [ ] elite/rare mobs
  - [ ] treasure
  - [ ] objectives
  - [ ] mystery events
  - [ ] boss rewards
- [ ] Decide how Search / Explore works on ordinary tiles.
- [ ] Decide what Search costs: Danger, a turn, another resource, or a combination.
- [ ] Define card rarity tiers.
- [ ] Define deck size / zone card pools.
- [ ] Decide whether discarded cards can return during the same zone.
- [ ] Prototype multi-use cards where one card can be used as either:
  - [ ] crafting material
  - [ ] ingredient
  - [ ] tactical effect
  - [ ] consumable effect
- [ ] Balance how painful it should be to discard cards at 7/7 hand size.

---

## 3. Danger system

- [ ] Finalize the total Danger scale. Current working model: `0–20`.
- [ ] Test `+1 Danger per completed turn`.
- [ ] Define the exact threshold levels. Initial test idea:
  - [ ] 0–4 Calm
  - [ ] 5–9 Uneasy
  - [ ] 10–14 Dangerous
  - [ ] 15–19 Hostile
  - [ ] 20 Critical / maximum state
- [ ] Define exactly what changes at each threshold.
- [ ] Make Zone 1 slow enough to teach the system without removing pressure.
- [ ] Decide how later zones scale Danger differently.
- [ ] Define sources of extra Danger, for example:
  - [ ] Search / greed
  - [ ] failed events
  - [ ] powerful cards
  - [ ] cursed treasure
  - [ ] certain mobs
  - [ ] special zone mechanics
- [ ] Define limited ways to reduce Danger.
- [ ] Create Danger-reduction cards.
- [ ] Prevent infinite Danger reduction / farming loops.
- [ ] Decide what happens at maximum Danger.

Core design goal:

**The player should often be able to stay longer and become stronger, but doing so should make the zone increasingly dangerous.**

---

## 4. Dice manipulation, rerolls and Wild

- [ ] Decide how many rerolls the player starts with.
- [ ] Decide how rerolls are earned during a zone.
- [ ] Decide whether rerolls are tokens, cards, both, or another system.
- [ ] Decide whether rerolls persist between zones.
- [ ] Finalize **Wild** on the Direction Die.
- [ ] Differentiate Wild clearly from Choose Direction.
- [ ] Define card effects that manipulate:
  - [ ] Movement Die
  - [ ] Direction Die
  - [ ] movement distance
  - [ ] direction after rolling
  - [ ] bounce behavior
  - [ ] movement during movement
- [ ] Decide whether Primal Forces can manipulate dice in characteristic ways.

---

# PRIORITY 1 — WORLD SYSTEMS

## 5. Tile types and board population

- [ ] Finalize the core tile types for Zone 1.
- [ ] Decide approximate distribution across 100 tiles.
- [ ] Define ordinary tile gameplay so blank-looking tiles can still matter.
- [ ] Define Healing tiles.
- [ ] Define Hazard tiles.
- [ ] Define Treasure tiles.
- [ ] Define Mystery tiles.
- [ ] Define Shrines.
- [ ] Define mob / encounter tiles or mob placement rules.
- [ ] Define rare encounter rules.
- [ ] Define Boss Shrine behavior.
- [ ] Decide whether special tiles remain fixed or whether some are randomized per run.

---

## 6. Mobs and combat

**Major open system.**

- [ ] Design the normal mob combat system.
- [ ] Decide whether combat happens in the main UI, a modal, or a separate combat view.
- [ ] Decide how the 3 equipped Spells are used in combat.
- [ ] Define the 2 contextual Action slots during combat.
- [ ] Decide whether there is Defend, Flee, Item, etc.
- [ ] Define enemy turns / enemy behavior.
- [ ] Define HP damage model.
- [ ] Define status effects.
- [ ] Define mob difficulty tiers:
  - [ ] normal
  - [ ] elite
  - [ ] rare
  - [ ] guardian
  - [ ] boss
- [ ] Define how Danger modifies mobs.
- [ ] Define mob drop tables.
- [ ] Ensure fighting mobs is valuable without XP.
- [ ] Make "fight or avoid?" a meaningful strategic decision.

---

## 7. Boss system

- [ ] Define what unlocks the boss in a typical zone.
- [ ] Decide how much unlock structure varies from zone to zone.
- [ ] Define boss combat separately from normal mobs if necessary.
- [ ] Define boss phases / mechanics.
- [ ] Define boss interaction with the six Primal Forces.
- [ ] Define how boss weaknesses are discovered.
- [ ] Decide how much Boss Info is initially hidden.
- [ ] Define rewards for defeating a boss.
- [ ] Define what happens to Danger when the boss is engaged.

UI rule already agreed:

- **MÅL** = what the player must do.
- **BOSS INFO** = what the player knows about the boss.
- Do not duplicate boss unlock requirements in both places.

---

## 8. Objectives / zone tasks

- [ ] Decide the terminology: Objectives, Tasks, Rumors, etc.
- [ ] Avoid generic MMO-style filler quests where possible.
- [ ] Define mandatory objectives versus optional objectives.
- [ ] Define objective reward types.
- [ ] Create examples such as:
  - [ ] restore a broken shrine
  - [ ] hunt a rare creature
  - [ ] locate lost cargo
  - [ ] collect a specific item/material
  - [ ] discover a location
- [ ] Decide whether objectives are visible from zone start or discovered while exploring.
- [ ] Decide whether objectives can reveal boss information.
- [ ] Decide whether optional objectives should increase the player's power but consume precious turns/Danger.

---

## 9. Flight Paths

- [x] Flight Paths are free.
- [x] Both locations must be discovered before travel between them is available.
- [ ] Decide how many Flight Paths a normal 10×10 zone should contain. Current idea: around 3.
- [ ] Decide whether landing exactly on the Flight Path is required to discover it.
- [ ] Decide whether using a Flight Path consumes the current turn.
- [ ] Decide whether arrival immediately resolves the destination tile.
- [ ] Decide whether Flight Paths can be disabled by certain Danger levels / zone mechanics. Prefer not to unless it adds real value.

---

# PRIORITY 2 — CHARACTER POWER AND CRAFTING

## 10. Crafting

- [ ] Decide the final relationship between cards, Ingredients and Materials.
- [ ] Design Spell crafting.
- [ ] Design Alchemy.
- [ ] Decide whether Equipment is included.
- [ ] If Equipment exists, keep the slot count limited.
- [ ] Test a compact model such as:
  - [ ] Tool
  - [ ] Garb
  - [ ] Charm
- [ ] Decide whether equipment lasts only for the run or persists longer.
- [ ] Define recipes.
- [ ] Decide which recipes are known from the start versus discovered.
- [ ] Make crafting create meaningful opportunity costs because materials occupy hand/inventory space.

---

## 11. Spell system / six Primal Forces

- [ ] Preserve all six Primal Forces in every zone.
- [ ] Finalize how spells are created from cards/ingredients.
- [ ] Define the 3 equipped spell slots.
- [ ] Define spell costs and cooldowns, if any.
- [ ] Decide whether spells are discarded cards, reusable abilities, or a hybrid.
- [ ] Define non-combat spell uses.
- [ ] Explore force identities on the board:
  - [ ] Growth — healing / regeneration / safe tiles
  - [ ] Ember — damage / clearing hazards
  - [ ] Flow — movement distance manipulation
  - [ ] Stone — stop movement / resist forced movement / bounce interaction
  - [ ] Gale — direction manipulation / rerolls
  - [ ] Aether — teleportation / rule-breaking / unusual movement
- [ ] Balance force usefulness so no force is only valuable against one boss type.

---

## 12. Backpack / inventory

- [ ] Decide what belongs in the 7-card hand versus Backpack.
- [ ] Decide whether Backpack has its own slot limit.
- [ ] Decide whether consumables are cards or inventory items.
- [ ] Decide how keys / quest items are handled.
- [ ] Avoid turning the game into inventory micromanagement without meaningful decisions.

---

## 13. Talents and permanent progression

- [x] Zone completion = 1 Talent Point.
- [ ] Design the Talent Tree structure.
- [ ] Current possible branches:
  - [ ] Navigation
  - [ ] Survival
  - [ ] Arcana
- [ ] Define the number of talents per branch.
- [ ] Decide whether branches contain prerequisites.
- [ ] Decide whether talents can be respecced.
- [ ] Create talents that alter systems rather than simply adding raw percentages.
- [ ] Examples to explore:
  - [ ] increased starting redraw
  - [ ] +1 maximum hand size
  - [ ] improved rerolls
  - [ ] better Wild result
  - [ ] Danger resistance/manipulation
  - [ ] better Search
  - [ ] crafting advantages
  - [ ] stronger starting card selection
- [ ] Define rare in-zone talent progression.
- [ ] Test a `Primal Insight`-style system rather than direct random Talent Point drops.
- [ ] Prevent repeatable Talent Point farming.

---

# PRIORITY 3 — RUN STRUCTURE AND BALANCE

## 14. Run start

- [ ] Define exactly what carries into a new zone.
- [ ] Confirm starting hand = 5 cards.
- [ ] Confirm redraw = up to 3 cards.
- [ ] Decide starting HP.
- [ ] Decide starting rerolls.
- [ ] Decide starting equipment / spells.
- [ ] Decide whether the board layout is fixed, partially randomized, or fully fixed with randomized contents.

---

## 15. Win / loss conditions

- [ ] Define what happens at 0 HP.
- [ ] Define what happens at maximum Danger.
- [ ] Decide whether reaching maximum Danger automatically loses the run or creates an extreme final state.
- [ ] Define retreat / voluntary exit possibilities.
- [ ] Define exactly when a zone is considered completed.
- [ ] Define rewards and transition to the next zone.

---

## 16. Zone difficulty scaling

- [ ] Use Zone 1 as the baseline learning zone while keeping meaningful difficulty.
- [ ] Decide how later zones become harder without simply inflating HP/damage.
- [ ] Scale through combinations of:
  - [ ] Danger behavior
  - [ ] mob mechanics
  - [ ] board hazards
  - [ ] objective complexity
  - [ ] card availability
  - [ ] movement restrictions
  - [ ] boss mechanics
  - [ ] zone-specific rules
- [ ] Define a unique board mechanic for each major zone.
- [ ] Ensure all six Primal Forces remain relevant in every zone.

---

# PRIORITY 4 — UI / IMPLEMENTATION

## 17. Card hand UI

- [ ] Add visible hand of cards to the current V4 UI.
- [ ] Support up to 7 cards.
- [ ] Build the initial 5-card draw.
- [ ] Build the pre-run redraw flow for up to 3 cards.
- [ ] Build card selection / inspect state.
- [ ] Build card discard flow when hand is full.
- [ ] Add timing labels for tactical cards, e.g.:
  - [ ] Before Roll
  - [ ] After Roll
  - [ ] During Movement
  - [ ] Combat
  - [ ] Reaction
- [ ] Keep the board readable and avoid UI overload.

---

## 18. Current HUD refinement

- [ ] Keep MÅL compact.
- [ ] Keep SHARKAN panel limited mainly to HP + Danger unless another permanent value proves necessary.
- [ ] Keep rerolls attached visually to the dice controls rather than the Sharkan status panel.
- [ ] Keep TILE INFO / BOSS INFO contextual.
- [ ] Implement real Spellbook, Backpack and Talents panels when their systems are ready.
- [ ] Implement contextual Action 1 / Action 2.
- [ ] Decide final HP presentation: percentage versus another model.

---

## 19. Save / persistence

- [ ] Decide when the game saves.
- [ ] Persist Talent progression.
- [ ] Persist unlocked recipes / discovered knowledge if those systems are used.
- [ ] Decide whether an active zone/run can be resumed after closing the browser.
- [ ] Keep run-state separate from permanent progression.

---

# LATER — VISUAL PRODUCTION

Do not prioritize this until the gameplay systems are proven.

- [ ] Replace black-and-white prototype with final HAJJEN UI language.
- [ ] Each zone uses **one complete background/world image**, not stitched generated segments.
- [ ] True 90° top-down presentation.
- [ ] Preserve HAJJEN visual identity: approximately **65% low-poly / 35% pixel-art influence**.
- [ ] Keep the grid readable and relatively subtle over the world background.
- [ ] Use limited icons on special tiles so the board does not become visually noisy.
- [ ] Add Sharkan production sprite/animation only when board mechanics are stable.

---

# Current recommended design order

1. **Cards + starting hand + redraw + hand limit**
2. **Turn loop**
3. **Danger thresholds and Danger reduction**
4. **Reroll economy + Wild**
5. **Normal tile Search / Explore**
6. **Mob combat + drops**
7. **Objectives + Boss unlock**
8. **Flight Paths**
9. **Crafting / Alchemy / Equipment decision**
10. **Spell system integration**
11. **Talents**
12. **Zone scaling and content**
13. **Final graphics**

---

## Core design statement

> **The board is the world.**  
> **The dice create the problem.**  
> **Cards give the player tools to solve the problem.**  
> **Mobs and exploration provide cards and materials.**  
> **Crafting turns materials into power during the run.**  
> **Flight Paths give the player control over the world.**  
> **Danger prevents the player from staying forever and collecting everything.**  
> **Objectives drive the player toward the boss.**  
> **Talents build Sharkan between zones.**
