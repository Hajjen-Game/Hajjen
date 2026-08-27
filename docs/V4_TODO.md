# HAJJEN V4 — TODO / OPEN DESIGN QUESTIONS

This document tracks the current design, implemented prototype systems, open questions and recommended implementation order for HAJJEN V4.

HAJJEN V4 should be relatively difficult and mechanically deep. Complexity should come from meaningful decisions, risk management and interacting systems — not unnecessary UI or bookkeeping.

Current playable prototype: **0.5.1 — Elite Balance & Starter Resources**.

---

# LOCKED FOUNDATION

Do not redesign these without a clear reason.

## World and movement

- [x] Each zone is one complete **10×10 board / world** with 100 tiles.
- [x] The board is the world; there is no separate exploration mode.
- [x] Sharkan moves using two dice:
  - Movement Dice: `1–6`
  - Direction Dice: `North / East / South / West / Choose Direction / Wild`
- [x] If movement reaches the edge, Sharkan **bounces and continues in the opposite direction** using the remaining steps.
- [x] Rerolls can be used on either dice.
- [x] No XP system and no character levels.
- [x] No companion system.

## Wild

- [x] **Wild = two different random cardinal directions.**
- [x] The same direction may not be rolled twice in one Wild result.
- [x] Opposite directions are allowed, for example `Down → Up`.
- [x] Sharkan moves the **full Movement Dice value in the first Wild direction and then the full value again in the second**.
- [x] Both Wild directions are shown before movement begins.
- [x] The player may still reroll before accepting the movement.

Example:

`Movement 2 + Wild ↓ → = ↓ ↓ → →`

## Movement preview

- [x] After the dice are resolved, the board previews the route before Sharkan moves.
- [x] Tiles along the route are marked subtly.
- [x] The final reachable tile **blinks** before the player presses `FLYTTA SHARKAN`.
- [x] Choose Direction updates the preview after the chosen direction is selected.
- [x] Wild shows the complete two-direction path.
- [x] Rerolls and movement-changing cards update the preview immediately.
- [x] If an enemy will trigger before the theoretical destination, the preview stops at the encounter trigger instead.

## Core game identity

- [x] **The board is the world.**
- [x] **The dice create the problem.**
- [x] **Cards give the player tools to solve the problem.**
- [x] **Mobs and exploration provide ingredients, cards and other rewards.**
- [x] **Flight Paths give the player increasing control over the zone.**
- [x] **Danger prevents unlimited exploration and greed.**
- [x] **Objectives drive the player toward the boss.**
- [x] **Talents build Sharkan between zones.**

---

# CARD SYSTEM

## Current hand structure

- [x] Start each zone with **7 cards**.
- [x] Fixed category slots:
  - **3 Manipulation**
  - **2 Enhancement**
  - **2 Tactical**
- [x] Before the first roll, the player may redraw up to **3 cards total**.
- [x] Each redrawn card is replaced by a card from the **same category**.
- [x] A category cannot use another category's empty slot.
- [x] Current base hand limit is therefore 7 cards.
- [x] Card name **and card effect** are visible directly in the hand.
- [x] Delayed Manipulation effects are shown in a visible **ACTIVE MANIPULATION** area.
- [x] Maximum **2 delayed/combined Manipulation Cards** may be active at the same time.

## Passive card draw

- [x] Every **3 completed turns**, the player gets a new card if there is an empty hand slot.
- [x] The new card uses the category of the empty slot.
- [x] An active Manipulation Card does **not** block drawing a replacement card into its now-empty hand slot.
- [x] The deck UI shows a countdown such as `2 turns left to draw new card`.
- [x] If the hand is full when the draw occurs, the current prototype skips that draw and starts a new 3-turn countdown.

### Open card economy questions

- [ ] Decide whether a full-hand draw should truly be lost or instead create a replace/discard choice.
- [ ] Decide whether each category uses its own deck or a shared master pool queried by category.
- [ ] Decide whether discarded cards can return during the same zone.
- [ ] Define card rarity tiers if useful.
- [ ] Define card rewards from mobs, elites, treasure, objectives, events and bosses.
- [ ] Balance passive draw frequency after longer playtests.

### Pool size direction

Current working target:

- [ ] Full game target: approximately **20 cards per category / 60 total**.
- [ ] First proper playable set: approximately **10 Manipulation / 10 Enhancement / 10 Tactical**.
- [ ] Build cards in mechanical families rather than forcing 60 unrelated effects.

---

## Manipulation Cards

- [x] Manipulation Cards alter **world rules, dice, movement, resource choices, card flow or Danger**.
- [x] Danger manipulation belongs here rather than in spells.
- [x] Maximum 2 delayed/combined Manipulation effects active at once.

Implemented prototype examples:

- [x] **Keen Eye** — next Ingredient Tile reveals 4 instead of 3.
- [x] **Double Harvest** — next Ingredient Tile lets the player choose 2 instead of 1.
- [x] **Long Reach** — collect from an Ingredient Tile in any of the 8 surrounding tiles while standing on an empty tile.
- [x] **Calm Waters** — reduce Danger by 2.
- [x] **Measured Step** — increase current Movement Dice by 1, up to 6.

Open:

- [ ] Expand the first Manipulation set.
- [ ] Add more dice/reroll manipulation.
- [ ] Add more movement/path manipulation.
- [ ] Add card-flow manipulation.
- [ ] Define stacking/chaining restrictions clearly.
- [ ] Prevent infinite Danger-reduction and resource-farming loops.

---

## Enhancement Cards

### Locked direction

- [x] Enhancement Cards provide **pure positive boosts only**.
- [x] No drawbacks or trade-offs.
- [x] Enhancement Cards now affect **finished spells directly**, not ingredients.
- [x] Enhancement effects last for the **current zone/run** because the cards themselves do not persist between zones.
- [x] Enhancement Cards never increase or decrease Danger.
- [x] Enhancement Cards are consumed when applied in the current prototype.

Example:

`Ember Surge — Give one Ember spell +5 direct damage for this zone.`

Implemented prototype behavior:

- [x] Enhancement Card opens a spell-selection choice.
- [x] The chosen spell immediately shows its increased damage in Spellbook, loadout and combat.
- [x] Multiple Enhancement Cards can currently stack on the same spell for testing.

Open:

- [ ] Decide final stacking limits.
- [ ] Decide whether identical Enhancement Cards may stack.
- [ ] Expand beyond raw damage once more spell types exist.
- [ ] Design Enhancement effects for shields, direct healing, control and other spell properties.
- [ ] Avoid damage-over-time and healing-over-time effects for now.

---

## Tactical Cards

- [x] Tactical Cards are used for **encounters/combat**, not exploration rules.
- [x] They do not duplicate Manipulation Cards.
- [x] They do not modify spell creation.
- [x] Before combat, the player may select **maximum 1 Tactical Card**.
- [x] The chosen Tactical Card is consumed when the fight begins in the current prototype.

Prototype examples:

- [x] Quick Guard
- [x] Dodge
- [x] First Strike
- [x] Battle Focus
- [x] Disengage

Open:

- [ ] Rebalance Tactical Cards after the combat system becomes deeper.
- [ ] Decide which effects should work against normal / elite / boss encounters.
- [ ] Decide whether some Tactical Cards should have timing inside combat rather than only pre-combat.
- [ ] Ensure defensive Tactical Cards do not trivialize Elite fights.

---

# INGREDIENTS / SPELL RESOURCES

## Ingredient Tiles

- [x] Landing on an **Ingredient Tile** reveals **3 ingredient choices**.
- [x] The player normally chooses **1 of 3**.
- [x] Ingredient options must be selected first and then confirmed with **CONFIRM**.
- [x] Selected ingredient choices are visibly marked before confirmation.
- [x] Manipulation Cards can change reveal/pick counts.
- [x] Long Reach can resolve a nearby Ingredient Tile without moving Sharkan.

## Zone 1 starter resources

- [x] Zone 1 currently starts Sharkan with **2 ingredients** already collected:
  - Bloomcap / Growth
  - Cinder Seed / Ember
- [x] This is intended to reduce early tutorial grind so the first created spell does not require collecting all ingredients from zero.

Open:

- [ ] Finalize the exact ingredients given at the start of Zone 1.
- [ ] Decide whether later zones also provide starter ingredients or only Zone 1.
- [ ] Define the number of ingredients needed to create a spell.
- [ ] Define Ingredient Tile frequency across a 10×10 board.
- [ ] Define zone-specific ingredient pools and weighting.
- [ ] Decide whether all six Primal Forces appear in every zone.
- [ ] Decide whether Ingredient Tiles deplete after use.
- [ ] Decide ingredient carrying limits.

---

# SPELLS / ACTIONS / BACKPACK

## Loadout

- [x] Main HUD contains **3 Spell Slots** and **2 Action Slots**.
- [x] Sharkan starts Zone 1 with **1 spell** and **1 action/potion** equipped.
- [x] Current starter spell: Ember Bolt.
- [x] Current starter action: Healing Potion.
- [x] The loadout persists after combat and remains visible in the main HUD.
- [x] The player may change loadout outside combat.
- [x] Combat preparation gives a final opportunity to change the existing loadout before the fight starts.
- [x] Clicking a Spell Slot opens the Spellbook.
- [x] Clicking an Action Slot opens the Backpack.

## Backpack usage

- [x] Outside combat, healing/consumables in the Backpack may be used regardless of which board tile Sharkan occupies.
- [x] During combat, the full Backpack is unavailable.
- [x] During combat, only items already equipped in the **2 Action Slots** are available.

## Current spell restrictions

- [x] No **damage-over-time** spells at this stage.
- [x] No **healing-over-time** spells at this stage.
- [x] Spell use and spell creation never increase or reduce Danger.

## Persistent loot direction

- [x] The old idea of Enhancement Cards permanently strengthening ingredients has been removed.
- [x] Instead, **persistent loot** may eventually strengthen ingredients.
- [x] Persistent loot can live in the Backpack and carry between zones until used.

Possible future example:

`Primal Ember Core — permanently increase one Ember ingredient's damage contribution.`

Open:

- [ ] Design persistent ingredient-upgrade loot.
- [ ] Define rarity and acquisition sources.
- [ ] Decide whether persistent loot is consumed when used.
- [ ] Decide how upgraded ingredients are represented between zones.

---

# DANGER SYSTEM

## Locked / current prototype

- [x] Danger is a slow pressure / greed clock.
- [x] Current scale: **0–20**.
- [x] Current baseline: **+1 Danger per completed turn**.
- [x] Current threshold labels:
  - 0–4 Calm
  - 5–9 Uneasy
  - 10–14 Dangerous
  - 15–19 Hostile
  - 20 Critical
- [x] Limited Manipulation Cards can reduce Danger.
- [x] Spells never affect Danger.

## Combat and zone irritation

- [x] Killing a **normal mob adds +2 Danger** in addition to the normal turn increase.
- [x] This represents Sharkan irritating/disturbing the zone.
- [x] Killing a normal mob schedules a possible replacement mob after several turns rather than spawning one immediately.
- [x] Current prototype delay is approximately **3–5 turns**.
- [x] Current prototype avoids spawning the replacement mob next to another active enemy.

### Future escalation idea

- [ ] At higher Danger, allow spawned mobs to appear closer to existing mobs.
- [ ] At sufficiently high Danger, back-to-back fights may become possible.
- [ ] Decide whether higher Danger changes mob stats, abilities, density, aggro range, spawn rules or combinations.

## Danger 10 aggro

- [x] At **Danger 10+**, active mobs/Guardians/unlocked boss can trigger when Sharkan enters one of the **8 adjacent tiles**.
- [x] At lower Danger, direct entry/crossing is required.

Open:

- [ ] Define meaningful changes at Danger 5, 10, 15 and 20.
- [ ] Decide whether an empty-tile `press on` turn should create extra Danger.
- [ ] Decide what happens at maximum Danger.
- [ ] Balance how quickly Zone 1 reaches dangerous states.
- [ ] Prevent infinite Danger-reduction loops.

---

# TILE TYPES / BOARD POPULATION

## Current Zone 1 prototype tiles

- [x] Empty / normal tiles
- [x] Ingredient Tiles
- [x] Healing Spring
- [x] Treasure
- [x] Mystery / event placeholder
- [x] Shrines
- [x] Normal mobs
- [x] Guardians / Elite encounters
- [x] Boss

## Removed from current core

- [x] **Hazard Tile removed.**
- [x] Extra danger/pressure should primarily come from mobs, encounters, Danger and zone mechanics instead of a generic Hazard Tile.

## Board icons

- [x] Prototype board letters have been replaced by simple lightweight symbols/icons.
- [x] Final art/icons remain a later visual-production task.

Open:

- [ ] Decide approximate distribution across 100 tiles.
- [ ] Define rare encounters.
- [ ] Add Flight Paths.
- [ ] Decide which tiles are fixed and which vary between runs.
- [ ] Decide whether Healing Spring / Mystery / Treasure all survive into the final core rules.

---

# COMBAT / ENCOUNTERS

## Trigger rules

- [x] Combat is **turn-based**.
- [x] A mob/Guardian/boss fight triggers when Sharkan **lands on or passes through** the enemy tile.
- [x] At Danger 10+, adjacent aggro can trigger combat before direct contact.
- [x] The movement preview stops at the first enemy trigger.

## Pre-combat preparation

- [x] Current equipped Spells and Actions automatically carry into combat preparation.
- [x] Player may change Spell loadout before starting combat.
- [x] Player may change Action loadout before starting combat.
- [x] Player may choose maximum **1 Tactical Card**.
- [x] The new choices remain the player's current loadout after combat.

## Current combat prototype

- [x] Player acts, then enemy acts.
- [x] Direct-damage spell attack implemented.
- [x] Equipped Healing Potion/action implemented.
- [x] Basic Tactical effects implemented.
- [x] 0 HP produces prototype game-over behavior.

## Normal mobs

- [x] Normal mobs are intentionally weaker than Guardians.
- [x] Killing a normal mob irritates the zone with +2 Danger and delayed respawn pressure.

Open:

- [ ] Define normal mob mechanics beyond simple HP/attack.
- [ ] Define drops/rewards.
- [ ] Make fighting a mob worthwhile without XP.
- [ ] Define rare mobs.
- [ ] Define flee rules without requiring one specific card in every future situation.

## Guardians / Elites

Current design goal:

**A Guardian encountered at the beginning of Zone 1 should feel too dangerous to fight comfortably with only the starter spell. The player should normally want to prepare, create another spell, improve the current spell, carry useful actions and/or use a strong Tactical Card.**

Current prototype balance:

- [x] Guardian HP increased from 55 to approximately **130 HP**.
- [x] Guardian attack increased from 10 to approximately **20 HP damage**.
- [x] Tile Info displays enemy HP and attack so danger is readable before contact.

Open:

- [ ] Playtest 130 HP / 20 damage.
- [ ] Ensure the Guardian is difficult without merely becoming a damage sponge.
- [ ] Add actual Elite mechanics/abilities rather than relying only on inflated HP/damage.
- [ ] Decide whether Guardians should require or strongly reward having at least 2 useful spells.
- [ ] Rebalance block/dodge Tactical Cards against Elites.

---

# BOSS SYSTEM

- [ ] Define typical boss unlock conditions.
- [ ] Decide how unlock structures vary by zone.
- [ ] Expand boss combat beyond the current HP/attack placeholder.
- [ ] Define boss phases / mechanics.
- [ ] Define interaction with the six Primal Forces.
- [ ] Define how weaknesses/information are discovered.
- [ ] Decide how much Boss Info is initially hidden.
- [ ] Define boss rewards.
- [ ] Decide how Danger behaves once a boss fight starts.

UI rule:

- **MÅL** = what the player needs to do.
- **TILE INFO** = what this tile/enemy is.
- **BOSS INFO** = what the player knows about the boss.
- Do not duplicate unlock requirements unnecessarily.

---

# OBJECTIVES / ZONE TASKS

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

# FLIGHT PATHS

- [x] Flight Paths are intended to be **free to use**.
- [x] Both endpoints must be discovered before travel is available.
- [x] Reaching/discovering them is intended to be the difficult part.

Open:

- [ ] Add Flight Paths to prototype.
- [ ] Decide how many a normal zone contains. Current idea: around 3.
- [ ] Decide whether Sharkan must land exactly on the Flight Path to discover it.
- [ ] Decide whether using a Flight Path consumes a turn.
- [ ] Decide arrival resolution and encounter interactions.

---

# SPELL CREATION / SIX PRIMAL FORCES

- [x] Preserve all six Primal Forces as relevant systems:
  - Growth
  - Ember
  - Flow
  - Stone
  - Gale
  - Aether
- [x] Current prototype starts with Ember Bolt.
- [x] Enhancement Cards modify finished spells rather than ingredients.
- [x] No DoT/HoT for now.

Open:

- [ ] Define how ingredients create spells.
- [ ] Define how many ingredients a spell requires.
- [ ] Implement first new spell creation using Zone 1's two starter ingredients plus collected resources.
- [ ] Define what happens to ingredients when a spell is created.
- [ ] Define whether spells are reusable, charge-based, cooldown-based or another model.
- [ ] Define force identities in combat and exploration.
- [ ] Create at least one additional practical Zone 1 spell so Guardian preparation can be tested properly.
- [ ] Ensure spell creation never interacts with Danger.

---

# POTIONS / ACTIONS

- [x] Starter Healing Potion implemented.
- [x] Potion is instant healing, not healing-over-time.
- [x] Potions/actions can be used freely from Backpack outside combat.
- [x] Only equipped Actions are available in combat.

Open:

- [ ] Define how new potions are created or found.
- [ ] Decide whether potions use the same Ingredient Tiles as spells.
- [ ] Define potion storage limits.
- [ ] Add more Action types beyond healing.
- [ ] Keep potion-Danger interactions separate unless a strong later design reason appears.

---

# BACKPACK / SPELLBOOK

## Implemented prototype behavior

- [x] Clicking Spell Slots opens Spellbook.
- [x] Clicking Action Slots opens Backpack.
- [x] Spellbook shows collected ingredients.
- [x] Spellbook shows current zone Enhancement bonuses on spells.
- [x] Backpack supports using Healing Potion outside combat.
- [x] Backpack is intended to later hold persistent loot.

Open:

- [ ] Decide final ownership of ingredients: Spellbook vs Backpack vs dedicated ingredient page.
- [ ] Decide inventory limits.
- [ ] Add multiple spells/items cleanly.
- [ ] Add persistent ingredient-upgrade loot.
- [ ] Avoid unnecessary inventory micromanagement.

---

# TALENTS / PERMANENT PROGRESSION

- [x] Completing a zone grants **1 Talent Point**.
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

# RUN START / ZONE 1 ONBOARDING

## Implemented

- [x] Starting hand: 7 cards.
- [x] Starting split: 3 Manipulation / 2 Enhancement / 2 Tactical.
- [x] Starting redraw: up to 3 cards, same-category replacement.
- [x] Starting HP: current prototype 100.
- [x] Starting spell: Ember Bolt.
- [x] Starting Action: Healing Potion.
- [x] Starting ingredients: 2 in Zone 1 prototype.
- [x] Empty tile tutorial appears once.
- [x] HELP button exists with current prototype rules.

Open:

- [ ] Decide starting rerolls / reroll economy.
- [ ] Decide exact Zone 1 starter ingredients after spell crafting exists.
- [ ] Decide exact first-zone card pools.
- [ ] Decide which permanent progression carries into a zone.
- [ ] Decide whether Zone 1 board layout is fixed or partially randomized.

---

# WIN / LOSS

- [x] Prototype game-over exists at 0 HP.
- [ ] Define final 0 HP consequences.
- [ ] Define what happens at maximum Danger.
- [ ] Decide whether maximum Danger is instant loss or an extreme world state.
- [ ] Define retreat / voluntary exit if applicable.
- [ ] Define exactly when a zone is completed.
- [ ] Define zone-completion rewards and transition.

---

# UI / IMPLEMENTATION STATUS

## Implemented

- [x] KORTLEK panel below MÅL.
- [x] Card draw countdown.
- [x] Visible 7-card hand.
- [x] Fixed M/M/M + E/E + T/T slot structure.
- [x] Card name + effect visible directly on cards.
- [x] Active Manipulation display.
- [x] Mulligan / same-category redraw.
- [x] Ingredient selection + visual marking + confirm.
- [x] Choose Direction selection is visibly highlighted.
- [x] Wild displays both generated directions.
- [x] Movement route preview.
- [x] Blinking destination/encounter tile.
- [x] Spell/Action loadout persistence.
- [x] Spell Slot → Spellbook.
- [x] Action Slot → Backpack.
- [x] Combat preparation modal.
- [x] Basic turn-based combat modal.
- [x] Lightweight board symbols instead of letter markers.
- [x] HELP button and first empty-tile tutorial.

## UI still open

- [ ] Improve visual distinction between normal mob / Elite / boss icons without adding clutter.
- [ ] Improve combat readability as mechanics become deeper.
- [ ] Add proper spell-selection controls when more than one spell exists.
- [ ] Add richer Backpack inventory when multiple Actions/loot exist.
- [ ] Decide final HP presentation.
- [ ] Keep MÅL / TILE INFO / BOSS INFO responsibilities cleanly separated.

---

# SAVE / PERSISTENCE

- [ ] Decide when the game saves.
- [ ] Persist Talent progression.
- [ ] Persist ingredient upgrades / persistent loot if implemented.
- [ ] Persist discovered knowledge if applicable.
- [ ] Decide whether an active zone/run can resume after closing the browser.
- [ ] Keep run-state separate from permanent progression.

---

# FUTURE TODO — NOT PART OF THE CURRENT CORE BUILD

These ideas remain possible but should **not** shape the current prototype until the core loop is proven.

## Crafting / materials / equipment

- [ ] Revisit traditional crafting after several zones, once the base game is established.
- [ ] Decide whether later zones introduce Material Tiles.
- [ ] If Material Tiles are introduced, consider the same `reveal several → choose` principle as Ingredient Tiles.
- [ ] Design equipment only if it adds meaningful strategic depth.
- [ ] Keep equipment slots limited if introduced.
- [ ] Decide whether equipment is run-only or persistent.

## Expanded hand progression

- [ ] Test increasing hand size later in the game.
- [ ] Prefer category-specific slot increases over unrestricted hand expansion.
- [ ] Ensure larger hands do not become visually or mentally overwhelming.

## Advanced Danger / enemy spawning

- [ ] Allow high-Danger mob spawns to appear near other mobs.
- [ ] Test forced back-to-back encounters later in the game.
- [ ] Introduce zone-specific mob reactions and spawn rules.

## Advanced zone systems

- [ ] Introduce more complicated rules in later zones after Zone 1 establishes the fundamentals.
- [ ] Consider zone-specific card pools, travel rules and objective structures.
- [ ] Consider additional rare world systems only if they reinforce the core loop.

---

# LATER — VISUAL PRODUCTION

Do not prioritize this until gameplay systems are proven.

- [ ] Replace the black-and-white prototype with the final HAJJEN UI language.
- [ ] Each zone uses **one complete background/world image**, not stitched generated segments.
- [ ] True 90° top-down presentation.
- [ ] Preserve HAJJEN visual identity: approximately **65% low-poly / 35% pixel-art influence**.
- [ ] Keep the grid readable and relatively subtle.
- [ ] Replace temporary board symbols with final game icons.
- [ ] Add final Sharkan sprite/animation when mechanics are stable.

---

# CURRENT RECOMMENDED DESIGN / IMPLEMENTATION ORDER

The basic prototype framework is now far enough along that the next work should focus less on adding isolated placeholders and more on proving the complete Zone 1 loop.

1. **Implement first real spell-creation flow**
2. **Create at least one additional Zone 1 spell** so Guardian preparation can be tested
3. **Re-test Guardian difficulty** with 1 spell vs prepared 2-spell loadout
4. **Improve Elite mechanics beyond HP/damage**
5. **Finalize reroll economy**
6. **Expand card test pool toward 10 / 10 / 10**
7. **Define normal mob rewards / drops**
8. **Define Danger threshold effects at 5 / 10 / 15 / 20**
9. **Add Flight Paths**
10. **Define objectives and boss unlock structure**
11. **Expand boss combat**
12. **Add first persistent loot that can strengthen an ingredient between zones**
13. **Prototype Talent progression**
14. **Balance Zone 1 as one complete playable run**

---

# Design principle

**A simple-looking 10×10 board should produce difficult decisions because movement, cards, ingredients, enemies, objectives and Danger constantly compete for the player's limited opportunities.**
