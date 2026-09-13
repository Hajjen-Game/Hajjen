# HAJJEN — RPG progression direction (locked design)

Status: **LOCKED DIRECTION** as of 2026-09-13. Balance numbers are tunable through playtesting, but the architecture and design principles below are the agreed direction unless we explicitly decide to change them later.

## Core identity

HAJJEN should become a **persistent RPG built around expedition-style zone runs**.

The game should keep its current strengths — board movement, Danger, deterministic problem solving, Manipulation, Tactical, Enchantments, crafted spells, elites and bosses — while adding a stronger long-term sense that **Sharkan himself is growing**.

The goal is not to turn HAJJEN into a small MMO or a conventional random-loot roguelike. The inspirations are:

- **World of Warcraft:** satisfying gear progression, talents, clear power milestones, boss rewards, upgradeable favourite items, and build choice.
- **Clair Obscur: Expedition 33:** equipment/passives that can become learned build components, character/stat customization, and boss encounters that reward understanding mechanics rather than only larger numbers.
- **HAJJEN:** deterministic puzzle/problem-solving identity, Danger as pressure, card tools, spell crafting, and moving enemies on the board.

## 1. Permanent Sharkan Profile vs Expedition Run

This separation is foundational.

### Permanent Profile

Persists between runs and deaths:

- Level and XP
- Spell Library / persistent spell progression
- Equipment
- Inventory / collected permanent loot
- Sharkan stats
- Talents and talent points
- Mastered Traits
- Active Traits and Trait Capacity
- Secured Primal Essence
- Permanent unlock/progression metadata

### Run State

Exists for the current zone expedition and resets on a failed/new run:

- Current HP
- Danger
- Position and enemy state
- Manipulation hand / used state
- Tactical hand / used state
- Zone Enchantments
- Zone ingredients
- Run-local potion ingredients/resources where applicable
- Springs and Card Reward state
- Unsecured Primal Essence
- Temporary buffs/debuffs and encounter state

Current legacy save behaviour should remain compatible while the new architecture is introduced. The permanent profile becomes the foundation for upcoming RPG systems; run state remains isolated so future death rules are straightforward.

## 2. Backpack becomes Inventory + Equipment

Potion/spell crafting belongs primarily in the Spellbook. Backpack gets a clear RPG purpose.

Initial equipment slots:

1. **Armor** — health/defence identity
2. **Charm** — spell/Enchantment identity
3. **Relic** — stronger unique passive identity
4. **Tool** — exploration/Manipulation/Danger identity

Four slots are intentionally enough. Do not create MMO-style inventory complexity with many armour pieces.

## 3. Sharkan stats

Start with only three deterministic stats:

- **Power** — increases spell damage. Initial design target: +1 spell damage per point.
- **Vitality** — increases Max HP. Initial design target: +5 Max HP per point.
- **Resolve** — reduces incoming damage. Initial design target: every 2 Resolve reduces incoming damage by 1.

No Crit Chance, Dodge Chance, Lucky Hit or other random combat stats. HAJJEN should remain a deterministic puzzle/problem-solving game.

Exact numbers can be balanced later; the three-stat structure is locked.

## 4. Loot philosophy

Loot should be **meaningful and relatively rare**, not a constant shower of disposable items.

Preferred reward structure:

- Normal mob: XP + Primal Essence
- Optional exploration/cache: Essence and/or Relic opportunity
- First elite: choose between 2 equipment rewards
- Card Reward: continues to improve the current run through Manipulation / Enchantment / Tactical
- Second elite: equipment/relic choice
- Boss: signature gear + major progression reward
- Level-up: talent point

Prefer **choice-based rewards** (for example choose 1 of 2) over very low random drop chances. Randomness can exist in run systems such as card draws, but permanent gear progression should remain understandable and player-driven.

## 5. Boss signature loot

Boss kills should be desirable for more than opening the next zone.

Each boss should eventually have a small signature reward pool with memorable items whose passive effects fit the zone/boss identity.

Example concepts:

- Rootheart Vest — defensive/spring passive
- Ember Fang Charm — Ember opening damage
- Hunter's Compass — improves Misdirection/range control

Names/effects are examples and may change. The principle — bosses provide signature permanent loot — is locked.

## 6. Item ranks / upgrading favourite gear

Permanent gear should support a simple upgrade path such as:

- Rank I
- Rank II
- Rank III

Upgrading consumes Primal Essence. The item's identity/passive stays the same while its stats improve.

Purpose: an item the player likes should not automatically become trash two zones later.

Keep this much simpler than a full MMO item-level/upgrade-track system.

## 7. Trait Mastery — inspired by Pictos/Lumina

Equipment can carry a unique **Trait**.

Initial design target:

- Win approximately **4 combats** while the relevant item/Trait is equipped to Master it.
- Once Mastered, the Trait can be activated without keeping that item equipped.
- Active Traits consume limited **Trait Capacity**.
- Stronger Traits cost more Capacity.

This creates long-term collection value: even an item with worse raw stats can be exciting because Sharkan can learn its Trait.

The exact mastery count and Capacity costs are tunable; the Mastered Trait + limited Capacity architecture is locked.

## 8. Talent Tree

Sharkan gets three compact talent branches:

### Explorer

Focus on:
- Danger control
- movement / board positioning
- Manipulation
- loot / Essence / exploration
- Card Reward interactions

### Spellweaver

Focus on:
- crafted spells
- Primal Forces
- Enchantments
- spell specialization/synergy

### Survivor

Focus on:
- Max HP / defence
- healing
- potions and Springs
- Tactical cards
- low-HP survival tools

Initial target: roughly one talent point per level. There should be more useful nodes than the player can purchase, so builds differ.

**Free respec between expedition runs** is the intended rule. Do not allow constant mid-run respec.

## 9. Death / punishment philosophy

Do **not** use harsh XP loss, permanent gear loss, or durability as the main death punishment.

Death should be a **soft but meaningful expedition loss**.

Introduce Primal Essence in two states:

- **Secured Essence** — permanent and safe
- **Unsecured Essence** — earned during the current expedition and at risk

Primal Springs should eventually gain an additional function: **heal + secure accumulated Essence**.

On death:

- Permanent Profile remains: gear, talents, level/XP, mastered Traits, secured Essence, permanent spell progression.
- Run-local state resets.
- Unsecured Essence is lost (or otherwise subjected to the run-loss rule we finalize in testing).

This creates a real risk/reward decision without making failure feel punitive or grindy.

## 10. Danger should become risk/reward

Danger should not only be punishment.

High Danger already increases pressure and enemy strength. Future rewards should sometimes improve at higher Danger, for example:

- bonus Essence for elite kills at high Danger
- bonus boss reward / extra choice at very high Danger
- specific Traits/Talents that reward operating under pressure

The player should sometimes face a genuine decision between using Danger-control tools and keeping Danger high for a better reward.

Exact thresholds and reward amounts are tunable.

## 11. Boss and elite mechanics

Future bosses/elites should increasingly be **mechanical puzzles**, not only larger HP/attack values.

Examples:

- a shield vulnerable to a particular Force
- punish repeating the same spell
- mechanic that encourages alternating/ordering spells
- add/shield state that must be solved before normal damage

Do not copy real-time parry/timing gameplay from Expedition 33. HAJJEN should stay web/mobile friendly and keep its deterministic decision-focused combat.

## 12. Exploration rewards

Optional movement should have desirable rewards so the optimal route is not always a straight line to the boss.

Future board rewards can include:

- Relic caches
- Essence caches
- optional elite/reward encounters
- rare Trait/item opportunities

Exploration should create the thought: “Do I take the extra risk for that reward?”

## 13. Progression presentation

Progression must be visibly celebrated, not only stored as numbers.

Future feedback moments should include clear UI for:

- LEVEL UP
- LOOT ACQUIRED / CHOOSE REWARD
- TRAIT MASTERED
- BOSS SIGNATURE ITEM
- EXPEDITION FAILED summary
- Secured vs Lost/Unsecured Essence

Use the existing fantasy HUD family, HTML/CSS/SVG and PNG icons. No heavy engine requirement.

## 14. Shared Effect system before deep build complexity

Before stacking many gear Traits, talents and new passives onto combat, create a small shared modifier/effect architecture.

Target concepts/events:

- spell damage calculation
- incoming damage calculation
- Max HP/stat calculation
- onCombatStart
- onSpellCast
- onDamageTaken
- onEnemyKilled
- onMove
- onSpring
- onDangerChanged

This avoids multiple independent scripts monkey-patching HP/damage/DOM as build complexity grows.

## 15. Implementation order

Locked roadmap:

1. **Separate permanent Sharkan Profile from run state.**
2. **Backpack → Inventory + Equipment** with four slots and Power/Vitality/Resolve.
3. **Real loot loop**: mobs Essence, elites gear choices, bosses signature gear.
4. **Death stakes**: Secured/Unsecured Essence and Spring securing.
5. **Talent Tree**: Explorer / Spellweaver / Survivor, with between-run respec.
6. **Trait Mastery + Trait Capacity**.
7. **More mechanical elites/bosses** built around builds and problem solving.
8. **Danger reward layer** so pressure can be deliberately exploited for better rewards.

## Web implementation constraints

Everything above must remain practical for the existing GitHub Pages/browser game.

Preferred implementation:

- JavaScript state/config objects
- `localStorage` for the Permanent Profile
- in-memory run state (explicit run persistence only if later needed)
- HTML/CSS/SVG UI
- PNG/WebP icons/assets
- no server required for the core game

## Guardrails

- Preserve deterministic problem solving.
- Do not create excessive stats/currencies/gear slots.
- Do not make normal mobs into loot-pinatas.
- Do not punish death by deleting permanent accomplishments.
- Do not let RPG progression remove the importance of board movement, Danger, Manipulation, Tactical, Enchantments or spell choice.
- New systems should deepen the existing HAJJEN loop, not replace it.
