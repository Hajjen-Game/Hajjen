// Energy Build v1: design data only. Intentionally isolated from legacy arena3v3 combat.
export const MAX_FLUX = 100;
export const BASE_FLUX_REGEN = 8;
export const TALENT_BUDGET = 30;
export const MAX_TALENT_RANK = 3;
export const MAX_ACTIVE_EVOLUTIONS = 10;
export const FREE_ABILITY_SLOTS = 8;
export const SAVED_BUILD_SLOTS = 3;

// Player-facing Origins. Stable healer/melee/caster keys are intentionally
// unchanged for older saves, AI composition, abilities and combat rules.
export const ROLES = Object.freeze({
  healer: {
    name: "Genesis", color: "#66d5ad", subtitle: "Life & protection",
    description: "Genesis draws on the energy of creation. Restore health, protect allies and survive long enough to turn the tide.",
    playstyle: "Choose Genesis to heal, create absorb shields, save allies from heavy damage and protect your team with six exclusive Vital abilities.",
    passive: "Healing spells cost 15% less Flux.",
    locked: ["pulse-mend", "resonance-guard"],
  },
  melee: {
    name: "Impact", color: "#f27b83", subtitle: "Momentum & disruption",
    description: "Impact is a force of motion and collision. Rush into range and chain together fast Kinetic melee hits while disrupting dangerous foes.",
    playstyle: "Choose Impact for six exclusive Kinetic skills: charge, chain melee attacks, interrupt dangerous casts and smash clustered waves.",
    passive: "Successful melee hits restore 4 Flux, at most once per second.",
    locked: ["phase-rush", "arc-strike"],
  },
  caster: {
    name: "Eclipse", color: "#79cafd", subtitle: "Cryo & positioning",
    description: "Eclipse shapes Cryo energy into crystalline projectiles and roots. Slow advancing enemies, trap dangerous foes and control the space between you.",
    playstyle: "Choose Eclipse for six exclusive Cryo skills: precise Crystal Bolt casts, control, placed Froststorm, protective mirrors and directional Avalanche waves.",
    passive: "Ranged direct-damage spells cost 15% less Flux.",
    locked: ["crystal-bolt", "crystal-snare"],
  },
  solar: {
    name: "Solar", color: "#f2b56c", subtitle: "Sunfire & lightning",
    description: "Solar channels living suns, lightning and enormous skyfire into explosive ranged combat.",
    playstyle: "Choose Solar for six exclusive spells: three-hit energy rhythm, a protected Sun Lance, freely placed pillars, a living Cinder Familiar and spectacular burst.",
    passive: "Ranged direct-damage spells cost 15% less Flux.",
    locked: ["flux-bolt","sun-lance"],
  },
  void: {
    name:"Void",color:"#b785ed",subtitle:"Shadows & predation",
    description:"Void is a mobile shadow-blade and psychic-magic hybrid. Tear open reality, mark prey, steal life and transform into a nightmare.",
    playstyle:"Use twin Void blades up close and a corruption mark at range. Place Phase Slip with the mouse, trigger brutal shadow Evolutions and transform when enemies cluster.",
    passive:"Rift Slash against Entropy-marked enemies restores a little Flux.",
    locked:["rift-slash","entropy-mark"],
  },
});

export const DISCIPLINES = Object.freeze({
  void: { name: "Void", color: "#b785ed", subtitle: "Pressure & control" },
  solar: { name: "Solar", color: "#f2b56c", subtitle: "Burst & radiance" },
  cryo: { name: "Cryo", color: "#78d1fa", subtitle: "Kiting & shatter" },
  kinetic: { name: "Kinetic", color: "#f18491", subtitle: "Melee & mobility" },
  vital: { name: "Vital", color: "#6fdaad", subtitle: "Healing & support" },
});

function ability(id, name, discipline, category, description, details, evolutions, role = null) {
  return Object.freeze({
    id, name, discipline, category, description, details, role,
    evolutions: Object.freeze(evolutions.map(([id, name, description]) => Object.freeze({ id, name, description }))),
  });
}

export const GENESIS_CLASS_SPELL_IDS = Object.freeze(["pulse-mend","resonance-guard","vital-cascade","stasis-seal","vital-recall","soul-relay"]);
export const GENESIS_CORE_SPELL_IDS = Object.freeze(["pulse-mend","resonance-guard","vital-cascade","stasis-seal"]);
export const IMPACT_CLASS_SPELL_IDS = Object.freeze(["phase-rush","arc-strike","pulse-sever","gravity-hammer","seismic-uppercut","kinetic-rampart"]);
export const IMPACT_CORE_SPELL_IDS = Object.freeze(["phase-rush","arc-strike","pulse-sever","gravity-hammer"]);
export const ECLIPSE_CLASS_SPELL_IDS = Object.freeze(["crystal-bolt","crystal-snare","fracture-spear","froststorm","crystal-mirror","avalanche"]);
export const ECLIPSE_CORE_SPELL_IDS = Object.freeze(ECLIPSE_CLASS_SPELL_IDS.slice(0,4));
export const SOLAR_CLASS_SPELL_IDS = Object.freeze(["flux-bolt","sun-lance","zenith-crash","cinder-familiar","solar-ascension","chain-tempest"]);
export const SOLAR_CORE_SPELL_IDS = Object.freeze(SOLAR_CLASS_SPELL_IDS.slice(0,4));
export const VOID_CLASS_SPELL_IDS = Object.freeze(["rift-slash","entropy-mark","phase-slip","void-metamorphosis","abyssal-rift","dark-pact"]);
export const VOID_CORE_SPELL_IDS = Object.freeze(VOID_CLASS_SPELL_IDS.slice(0,4));

export const ABILITIES = Object.freeze([
  ability("pulse-mend","Pulse Mend","vital","Direct healing","Heals a friendly target for 60 base health.","1.5 sec cast · 16 Flux for Genesis",[
    ["vital-crescendo","Vital Crescendo","Hold Pulse Mend to extend its cast to 2.5 sec, increasing its direct healing by 78%. Only applies when healing an ally."],
    ["second-heart","Second Heart","Pulse Mend also protects its target for 12 sec. If they fall to 30% health or lower, the mark is consumed to restore at least 22 health or 27% of their maximum health, whichever is higher."],
    ["vital-reversal","Vital Reversal","Pulse Mend can now target enemies. Deals 23 base damage to that enemy and heals each injured ally for 22 base health. Also restores up to 22% of the capacity of their active Resonance Guard."],
  ],"healer"),
  ability("resonance-guard","Resonance Guard","vital","Absorb shield","Shields yourself or an ally, absorbing up to 80 base damage for 8 sec. Damage is absorbed before health is lost.","Instant · 22 Flux · 32 sec cooldown",[
    ["guardian-network","Guardian Network","Resonance Guard also grants every other teammate an absorb shield with 42% of the main shield's capacity, regardless of their position."],
    ["retaliation","Retaliation","Damage absorbed by Resonance Guard is stored. When the shield breaks or expires, release that stored energy as damage against up to 3 nearby enemies."],
    ["last-stand","Last Stand","Once during Resonance Guard, prevent an otherwise lethal hit and restore the protected ally to at least 28% of maximum health. Consumes the shield's rescue effect."],
  ],"healer"),
  ability("vital-cascade","Vital Cascade","vital","Team healing","Heals the selected ally for 38 base health and each other injured teammate for about 30. Reaches allies anywhere on your team.","Instant · 32 Flux · 22 sec cooldown",[
    ["double-cascade","Double Cascade","After Vital Cascade, a second healing wave occurs 0.65 sec later, restoring 20 base health to each ally who is still injured."],
    ["rejuvenating-orbit","Rejuvenating Orbit","Allies healed by Vital Cascade gain a 6 sec healing effect that restores 5 base health every second."],
    ["life-transfer","Life Transfer","After Vital Cascade, move health from a healthy ally to the most injured teammate. Transfers at most 14% of the donor's maximum health and never reduces the donor below 55% health."],
  ],"healer"),
  ability("stasis-seal","Stasis Seal","vital","Crowd control","Incapacitates an enemy for up to 5 sec, preventing actions until the effect ends or damage breaks it. Bosses are immune; elites have a shorter duration.","Instant · 20 Flux · 24 sec cooldown",[
    ["tranquility-wave","Tranquility Wave","Stasis Seal also incapacitates up to 5 nearby ordinary enemies for up to 2 sec. Additional targets must be in range and are freed when damaged; bosses remain immune."],
    ["mercy-bloom","Mercy Bloom","When the Stasis Seal ends or is broken, heal the most injured teammate for 24 base health."],
    ["essence-siphon","Essence Siphon","While Stasis Seal is active, restore 4 Flux to Genesis every second and heal the most injured teammate for 5 base health each second."],
  ],"healer"),
  ability("vital-recall","Vital Recall","vital","Healing recovery","Marks an ally for 4 sec. Cast again before the mark expires to restore 75% of health lost since marking, capped at 50% of the ally's maximum health.","Instant · 20 Flux · 36 sec cooldown",[],"healer"),
  ability("soul-relay","Soul Relay","vital","Linked protection","Select two different teammates to link for 10 sec. They share part of the damage and healing they receive. Transferred damage cannot kill the linked ally.","Instant · 22 Flux · 24 sec cooldown",[],"healer"),
  ability("seismic-uppercut","Seismic Uppercut","kinetic","Launch and slam","Hits a nearby enemy for 25 base damage, then slams the area for another 18 base damage after 0.42 sec. Ordinary enemies are briefly incapacitated; elites and bosses remain grounded.","Instant · 27 Flux · 25 sec cooldown",[

  ],"melee"),
  ability("kinetic-rampart","Kinetic Rampart","kinetic","Projectile defense","Raises a forward-facing barrier for up to 4 sec, blocking up to 3 incoming direct projectiles from its front. Recast or let it expire to fire stored kinetic damage at nearby enemies.","Instant · 24 Flux · 30 sec cooldown",[

  ],"melee"),
  ability("phase-rush","Phase Rush","kinetic","Targeted charge","Charges toward an enemy and stops at melee range. Cannot pass through walls or other obstacles.","Instant · 14 Flux · 17 sec cooldown",[
    ["meteor-charge","Meteor Charge","When Phase Rush reaches its target, unleash a kinetic blast dealing 20 base damage to nearby enemies."],
    ["relentless-pursuit","Relentless Pursuit","If the enemy reached by Phase Rush dies within 3 sec, reset Phase Rush and allow another charge. Can refresh up to twice in one pursuit chain."],
    ["piercing-charge","Piercing Charge","On reaching the target, send a kinetic shock through enemies lined up behind it, dealing 18 base damage to each eligible enemy in the path."],
  ],"melee"),
  ability("pulse-sever","Pulse Sever","kinetic","Melee interrupt","Interrupts an enemy that is casting a spell, locking its magic school for 3 sec and dealing 8 base damage. Has no interrupt effect if the target is not casting.","Instant · 10 Flux · 15 sec cooldown",[
    ["echo-sever","Echo Sever","A successful Pulse Sever also interrupts up to 5 nearby ordinary enemies that are currently casting. Each additional interrupted enemy suffers a 2.5 sec school lock."],
    ["countershock","Countershock","A successful Pulse Sever releases a shockwave, dealing 15 base damage to enemies near the interrupted target."],
    ["warpath","Warpath","Successfully interrupting with Pulse Sever empowers your Arc Strike, Seismic Uppercut, Gravity Hammer and Phase Rush damage by 20% for 4 sec."],
  ]),
  ability("flux-bolt","Flux Bolt","solar","Ranged damage combo","Deals 17 base Solar damage. Every third hit on the same enemy within 6 sec adds a burst of 6 base damage.","1.5 sec cast · 10 Flux for Solar",[
    ["corona-volley","Corona Volley","Every third successful Flux Bolt hit sends additional Solar bolts to up to 3 other enemies near the original target, dealing 13 base damage each."],
    ["thunderhead","Thunderhead","Every third Flux Bolt hit creates a storm over the target, striking it 3 additional times over about 1.6 sec."],
    ["helios-beam","Helios Beam","After 3 qualifying Flux Bolt hits on the same enemy, hold the next Flux Bolt to channel a focused beam for up to 2 sec. The beam deals repeated damage that grows with each tick; release early to stop."],
  ],"solar"),
  ability("phase-slip","Phase Slip","void","Placed teleport","Teleport to a chosen valid position within short range. Cannot teleport through solid walls or into occupied space.","Instant · 16 Flux · 23 sec cooldown",[
    ["shadow-ambush","Shadow Ambush","For 4 sec after Phase Slip, your next Rift Slash triggers 3 extra delayed shadow strikes against its target, each dealing 40% of the original Slash's damage."],
    ["rift-echo","Rift Echo","Phase Slip damages enemies along its actual teleport path with 5 delayed shadow echoes. Each echo deals 8 base damage in a small area."],
    ["veilwalk","Veilwalk","After Phase Slip, gain a 2.5 sec shadow veil. The next direct hostile attack against you passes through harmlessly and consumes the protection."],
  ],"void"),
  ability("entropy-mark","Entropy Mark","void","Damage over time","Marks an enemy, dealing 5 base Void damage every 2 sec for 12 sec. Rift Slash against a marked enemy also restores 3 Flux.","Instant · 15 Flux · 12 sec duration",[
    ["contagion","Contagion","When an enemy affected by your Entropy Mark dies, spread the mark to up to 3 nearby unmarked enemies. The infection can spread through up to 3 generations."],
    ["psychic-collapse","Psychic Collapse","After Entropy Mark has dealt damage twice, recast it for no Flux to consume the mark and deal 32 base damage to the target and 17 to nearby enemies. The recast starts a 3 sec cooldown."],
    ["devouring-pact","Devouring Pact","Damaging an Entropy-marked enemy with Rift Slash also heals you for up to 23% of the damage dealt, capped at 13 health per trigger. Can trigger at most once every 0.75 sec."],
  ],"void"),
  ability("rift-slash","Rift Slash","void","Melee shadow damage","Strikes an enemy with two Void blades for 21 base damage. Hitting an enemy affected by your Entropy Mark also restores 3 Flux.","Instant · 13 Flux · 3 sec cooldown",[
    ["phantom-assault","Phantom Assault","Every third Rift Slash creates a shadow clone behind the struck enemy. The clone lands 2 additional delayed attacks, each dealing 46% of the original Slash's damage."],
    ["umbral-cyclone","Umbral Cyclone","Every third Rift Slash also strikes up to 10 other nearby enemies with a broad twin-blade cyclone, dealing 67% of that Slash's damage to each."],
    ["executioners-veil","Executioner's Veil","Rift Slash against an Entropy-marked enemy at or below 30% health triggers 3 delayed finishing strikes. Can trigger once every 8 sec."],
  ],"void"),
  ability("null-prison","Null Prison","void","Breakable CC","Castable incapacitates for up to 4 seconds; breaks on damage and follows DR.","1.4s cast · 24s cooldown",[
    ["rapid-seal","Rapid Seal","Faster cast with shorter crowd-control duration."],
    ["void-anchor","Void Anchor","A brief slow remains when the prison ends."],
    ["unstable-prison","Unstable Prison","Breaking the prison by damage emits a small damage pulse; no additional CC."],
  ]),
  ability("void-metamorphosis","Void Metamorphosis","void","Combat transformation","Transform into a Void combat form for 8 sec. Rift Slash hits in a wider area, while Entropy Mark ticks deal 27% more damage and trigger psychic strikes.","Instant · 23 Flux · 45 sec cooldown",[
    ["dreadblade-form","Dreadblade Form","During Void Metamorphosis, Rift Slash gains greater reach. Every third Slash also sends out damaging blade arcs that hit other nearby enemies."],
    ["mindstorm","Mindstorm","While transformed, each damage tick from your Entropy Mark calls down an additional psychic spear, dealing 9 base damage to the marked enemy."],
    ["soul-devourer","Soul Devourer","While transformed, deaths of enemies affected by your Entropy Mark heal you for 14 health and extend the form by 1 sec, up to 4 extra sec. The form ends with a damaging Void blast."],
  ],"void"),
  ability("abyssal-rift","Abyssal Rift","void","Placed area damage","Open a rift at a chosen location for 4 sec. It damages nearby enemies in repeated pulses, can absorb up to 3 eligible hostile projectiles, then implodes for additional damage.","Instant · 28 Flux · 32 sec cooldown",[

  ],"void"),
  ability("dark-pact","Dark Pact","void","Health-sacrifice finisher","Sacrifice up to 12% of your maximum health without killing yourself. Call down 3 staggered Void spears on an enemy, each also damaging nearby enemies.","Instant · 23 Flux · 30 sec cooldown",[

  ],"void"),
  ability("sun-lance","Sun Lance","solar","Ranged finisher","Strikes an enemy for 27 base Solar damage. Deals 18% more damage if the target is below 35% health.","1.8 sec cast · 16 Flux for Solar",[
    ["judgment-of-dawn","Judgment of Dawn","When Sun Lance hits an enemy below 35% health, it deals 90% more damage than its normal base hit and triggers a finishing Solar beam from above."],
    ["scorching-lance","Scorching Lance","Sun Lance burns its target for 5 base damage every 2 sec for 8 sec. If the burning target dies, it explodes and spreads a shorter Solar burn to nearby enemies."],
    ["split-lance","Split Lance","After Sun Lance hits, launch smaller follow-up lances at up to 2 nearby enemies that are already injured. Each deals 38% of the primary Lance's damage."],
  ],"solar"),
  ability("zenith-crash","Zenith Crash","solar","Placed area damage","Choose a ground location. After a 2 sec cast, a Solar pillar deals 38 base damage to enemies in the area. Secondary targets take reduced damage.","2 sec cast · 30 Flux · 18 sec cooldown",[
    ["solar-aftershock","Solar Aftershock","Zenith Crash triggers a second impact at the same location 0.85 sec later, dealing 45% of the main pillar's damage in a smaller area."],
    ["burning-ground","Burning Ground","Zenith Crash leaves a burning field that deals 5.5 base damage to enemies in the area once per second for 3 sec."],
    ["prism-cross","Prism Cross","Zenith Crash releases 4 diagonal Solar beams from its impact point. Each beam damages enemies along its path and stops at solid obstacles."],
  ],"solar"),
  ability("cinder-familiar","Cinder Familiar","solar","Summoned attacker","Summons one Solar familiar for 12 sec. It follows you and automatically attacks your selected enemy or another nearby enemy roughly every 0.86 sec.","Instant · 25 Flux · 35 sec cooldown",[
    ["phoenix-dive","Phoenix Dive","While Cinder Familiar is active, it dives through enemies near its target roughly every 2.7 sec, damaging them and leaving a short damaging trail."],
    ["soulbrand","Soulbrand","Cinder Familiar focuses on one enemy and attacks it more frequently. Your Flux Bolt, Sun Lance, Zenith Crash and Chain Tempest hits on that enemy trigger extra Solar damage."],
    ["dying-star","Dying Star","Recast Cinder Familiar while it is active to consume it in a targeted supernova, dealing 35 base damage to nearby enemies."],
  ],"solar"),
  ability("solar-ascension","Solar Ascension","solar","Empowered Solar spells","Grants 3 Solar sigils for up to 12 sec. Each of your next 3 offensive Solar spells consumes one sigil to deal 15 additional base damage to its target.","Instant · 28 Flux · 38 sec cooldown",[

  ],"solar"),
  ability("chain-tempest","Chain Tempest","solar","Chain lightning","Hits an enemy for 27 base Solar damage, then chains to up to 4 other nearby enemies. If no other enemy is in range, strikes the original target 3 more times.","Instant · 25 Flux for Solar · 26 sec cooldown",[

  ],"solar"),
  ability("photon-barrier","Photon Barrier","solar","Absorb shield","Short absorb shield on self or an ally; unlike percentage damage reduction.","Instant · 28s cooldown",[
    ["reinforced-prism","Reinforced Prism","Stronger absorb with a longer cooldown."],
    ["prismatic-return","Prismatic Return","When broken, release a capped damage pulse nearby."],
    ["shared-light","Shared Light","Share a smaller shield with another nearby ally."],
  ]),
  ability("crystal-bolt","Crystal Bolt","cryo","Ranged damage","Launches a crystal for 15 base damage and slows the target by 35% for 3 sec.","1.3 sec cast · 11 Flux for Eclipse",[
    ["rapid-crystal","Rapid Crystal","Reduces Crystal Bolt's cast time from 1.3 sec to 0.88 sec. Every third Crystal Bolt may also be cast while moving."],
    ["glacial-echo","Glacial Echo","Crystal Bolt is followed 0.36 sec later by a second smaller hit on the same enemy, dealing 40% of the original Bolt's damage."],
    ["fracture-chain","Fracture Chain","Every third Crystal Bolt releases additional crystal hits at up to 3 other nearby enemies, each dealing 38% of the original Bolt's damage."],
  ],"caster"),
  ability("crystal-snare","Crystal Snare","cryo","Area control","Roots nearby enemies around the selected target for up to 3 sec and marks them as Chilled for 5 sec. Bosses resist the root but can still be marked.","Instant · 15 Flux · 18 sec cooldown",[
    ["deep-freeze","Deep Freeze / Ice Tomb","Crystal Snare becomes a 4 sec single-target incapacitate instead of an area root. Works on elites; bosses remain immune to hard crowd control."],
    ["shatterfield","Shatterfield","When a Crystal Snare root expires, it releases 3 delayed frost pulses around the target, damaging and slowing nearby enemies."],
    ["crystal-conduit","Crystal Conduit","Enemies rooted together by Crystal Snare are linked for 3 sec. A direct hit on one linked target also deals up to 24% of that hit's damage to other linked rooted targets, capped at 12 base damage each."],
  ],"caster"),
  ability("fracture-spear","Fracture Spear","cryo","Heavy ranged hit","Hurls a crystal spear for 32 base damage. Deals 30% more damage to a target that is Rooted, Slowed or Chilled.","1.7 sec cast · 21 Flux for Eclipse · 12 sec cooldown",[
    ["focused-fracture","Focused Fracture","Fracture Spear deals 92% more damage to targets that are Rooted, Slowed or Chilled, including marked bosses. Remains strictly single-target."],
    ["crystal-rupture","Crystal Rupture","Fracture Spear also explodes on impact, dealing 40% of the Spear's damage to up to 4 nearby enemies."],
    ["riftbreaker","Riftbreaker","Fracture Spear creates up to 4 delayed crystal eruptions in a line beyond its target. Each eruption damages and briefly slows enemies; obstacles stop the sequence."],
  ],"caster"),
  ability("froststorm","Froststorm","cryo","Ground damage","Creates a froststorm at a chosen location for 4 sec. Deals 8 base damage in pulses about once per second and slows ordinary enemies caught inside.","0.45 sec cast · 30 Flux · 24 sec cooldown",[
    ["glacial-barrage","Glacial Barrage","Froststorm also calls down 3 additional crystal comets at positions inside the storm, each dealing 12 base damage in a small area."],
    ["expanding-frost","Expanding Frost","Froststorm lasts 6 sec instead of 4 and gradually expands its radius. It continues dealing its normal damage pulses throughout the extended duration."],
    ["shattering-storm","Shattering Storm","Crystal Bolt or Fracture Spear hitting an enemy inside your Froststorm triggers an additional shatter pulse, dealing 7 base damage to nearby enemies."],
  ],"caster"),
  ability("crystal-mirror","Crystal Mirror","cryo","Single-hit protection","Places a crystal mirror on yourself or an ally. Blocks the next eligible direct attack and launches retaliatory crystals at the attacker. Does not block damage-over-time or ground effects.","Instant · 23 Flux · 28 sec cooldown",[

  ],"caster"),
  ability("avalanche","Avalanche","cryo","Directional area damage","Sends a traveling wall of ice in the chosen direction, damaging and pushing ordinary enemies. Leaves a short damaging trail that slows enemies; bosses resist the push.","Instant · 35 Flux · 30 sec cooldown",[

  ],"caster"),
  ability("arc-strike","Arc Strike","kinetic","Melee combo","Strikes an enemy for 13 base damage. Use Arc Strike again within 4 sec to deal 16% more damage with the second strike and restore 3 Flux.","Instant · 10 Flux · Melee range",[
    ["twin-arc","Twin Arc","Every third Arc Strike releases a wide frontal attack, dealing 65% of that strike's damage to up to 5 additional nearby enemies in front of you."],
    ["overdrive","Overdrive","The second Arc Strike of a combo becomes 3 rapid hits on the same target: one immediate strike and two delayed follow-ups. The combo's damage is split across the hits."],
    ["kinetic-reprisal","Kinetic Reprisal","Completing an Arc Strike combo grants a 3 sec one-hit shield. It absorbs part of the next direct hit and retaliates against the attacker."],
  ],"melee"),
  ability("gravity-hammer","Gravity Hammer","kinetic","Ground impact","Choose a location to deal 37 base damage to enemies in the impact area. Ordinary enemies are knocked down briefly; elites and bosses resist the knockdown.","0.6 sec cast · 30 Flux · 20 sec cooldown",[
    ["singularity-impact","Singularity Impact","Gravity Hammer deals 65% more base damage in an area 40% smaller than normal. The concentrated impact no longer knocks enemies down."],
    ["seismic-wave","Seismic Wave","Gravity Hammer also releases 3 expanding shockwaves after impact, each dealing 8 base damage to enemies in its moving outer ring."],
    ["gravity-well","Gravity Well","Gravity Hammer leaves a gravity field that pulses 4 times over 2.8 sec, dealing 6 base damage per pulse and pulling ordinary enemies toward its center. Bosses resist the pull."],
  ]),
  ability("vector-rush","Vector Rush","kinetic","Kinetic dash","A visible high-speed rush in your chosen direction. Unlike Phase Slip, it follows a kinetic travel path and does not cleanse slows.","Instant · Kinetic trail · 18s CD",[
    ["extended-vector","Extended Vector","Move farther, with a longer cooldown."],
    ["shock-trail","Shock Trail","Leave a brief damaging trail along the route."],
    ["kinetic-shield","Kinetic Shield","Gain a small absorb shield after completing the dash."],
  ]),
  ability("resonance-cut","Resonance Cut","kinetic","Ranged disruption","Interrupt a cast from range; on success, the target’s next damaging attack within 5 seconds deals 18% less damage.","Instant · Ranged dissonance · 20s CD",[
    ["long-reach","Long Reach","Longer range but a slightly longer cooldown."],
    ["flux-siphon","Flux Siphon","Regain Flux on a successful interrupt."],
    ["disruptive-wake","Disruptive Wake","A successful interrupt also briefly slows the target."],
  ]),
  ability("reactive-thread","Reactive Thread","vital","Reactive healing","10-second heal-over-time with a bonus pulse after damage, at most once per 2 seconds.","Instant · 18 Flux",[
    ["emergency-weave","Emergency Weave","Stronger reactive heals at low HP, weaker baseline healing."],
    ["steady-flow","Steady Flow","Stronger regular healing, weaker reactive pulses."],
    ["harmonic-thread","Harmonic Thread","Reactive pulses also heal another injured ally for a smaller amount."],
  ]),
  ability("symbiosis-link","Symbiosis Link","vital","Damage-to-heal","Link an ally for 10 seconds; capped direct damage converts to healing.","Instant · 10s duration",[
    ["amplified-link","Amplified Link","More healing from your direct damage, capped at one healing pulse per second."],
    ["lingering-resonance","Lingering Resonance","Each converted heal also leaves a two-second healing echo on the linked ally."],
    ["reciprocal-flow","Reciprocal Flow","Split the same total healing between ally and self."],
  ]),
  ability("cleanse-flux","Cleanse Flux","vital","Dispel","Remove a dispellable negative effect from self or an ally.","Instant · 10s cooldown",[
    ["purifying-surge","Purifying Surge","A successful dispel also restores a little HP."],
    ["flux-reclamation","Flux Reclamation","A successful dispel returns some Flux."],
    ["dual-purge","Dual Purge","Remove up to two negative effects from one ally, but with a longer cooldown."],
  ]),
]);

export const ABILITY_BY_ID = Object.freeze(Object.fromEntries(ABILITIES.map(a => [a.id, a])));
export const FREE_ABILITIES = Object.freeze(ABILITIES.filter(a => !a.role));
export function availableAbilities(role) {
  if (!ROLES[role]) throw new Error("Unknown role: " + role);
  // Five independent class-locked six-spell Origins; cross-class synergies parked.
  if (role === "healer") return GENESIS_CLASS_SPELL_IDS.map(id => ABILITY_BY_ID[id]);
  if (role === "melee") return IMPACT_CLASS_SPELL_IDS.map(id => ABILITY_BY_ID[id]);
  if (role === "caster") return ECLIPSE_CLASS_SPELL_IDS.map(id => ABILITY_BY_ID[id]);
  if (role === "solar") return SOLAR_CLASS_SPELL_IDS.map(id => ABILITY_BY_ID[id]);
  if (role === "void") return VOID_CLASS_SPELL_IDS.map(id => ABILITY_BY_ID[id]);
  return ABILITIES.filter(a => !a.role || a.role === role);
}
