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
    ["vital-crescendo","Vital Crescendo","Hold the cast longer to build a colossal single-target heal."],
    ["second-heart","Second Heart","Place an emergency Vital core that heals the recipient when critically wounded."],
    ["vital-reversal","Vital Reversal","Cast on an enemy to damage it, heal all injured teammates, and refill active Resonance Guard absorbs."],
  ],"healer"),
  ability("resonance-guard","Resonance Guard","vital","Absorb shield","Shields yourself or an ally, absorbing up to 80 base damage for 8 sec. Damage is absorbed before health is lost.","Instant · 22 Flux · 32 sec cooldown",[
    ["guardian-network","Guardian Network","Grant smaller absorb shields to all other teammates, regardless of spacing."],
    ["retaliation","Retaliation","Store absorbed damage, then launch energy bolts at the enemies when the shield bursts or expires."],
    ["last-stand","Last Stand","Once during the shield, prevent a lethal hit and restore some of the protected ally's HP."],
  ],"healer"),
  ability("vital-cascade","Vital Cascade","vital","Team healing","Heals the selected ally for 38 base health and each other injured teammate for about 30. Reaches allies anywhere on your team.","Instant · 32 Flux · 22 sec cooldown",[
    ["double-cascade","Double Cascade","Send a second smart healing wave to the allies who still need it most."],
    ["rejuvenating-orbit","Rejuvenating Orbit","Give healed teammates orbiting Vital cores that pulse healing for several seconds."],
    ["life-transfer","Life Transfer","Safely transfer a capped amount of HP from a healthy teammate to rescue the most injured one."],
  ],"healer"),
  ability("stasis-seal","Stasis Seal","vital","Crowd control","Incapacitates an enemy for up to 5 sec, preventing actions until the effect ends or damage breaks it. Bosses are immune; elites have a shorter duration.","Instant · 20 Flux · 24 sec cooldown",[
    ["tranquility-wave","Tranquility Wave","Spread shorter, damage-breakable stasis to eligible nearby mobs."],
    ["mercy-bloom","Mercy Bloom","On stasis break or expiry, send a healing blossom to the most injured teammate."],
    ["essence-siphon","Essence Siphon","While stasis holds, stream Flux back to Genesis and send gentle healing pulses to the team."],
  ],"healer"),
  ability("vital-recall","Vital Recall","vital","Healing recovery","Marks an ally for 4 sec. Cast again before the mark expires to restore 75% of health lost since marking, capped at 50% of the ally's maximum health.","Instant · 20 Flux · 36 sec cooldown",[],"healer"),
  ability("soul-relay","Soul Relay","vital","Linked protection","Select two different teammates to link for 10 sec. They share part of the damage and healing they receive. Transferred damage cannot kill the linked ally.","Instant · 22 Flux · 24 sec cooldown",[],"healer"),
  ability("seismic-uppercut","Seismic Uppercut","kinetic","Launch and slam","Hits a nearby enemy for 25 base damage, then slams the area for another 18 base damage after 0.42 sec. Ordinary enemies are briefly incapacitated; elites and bosses remain grounded.","Instant · 27 Flux · 25 sec cooldown",[

  ],"melee"),
  ability("kinetic-rampart","Kinetic Rampart","kinetic","Projectile defense","Raises a forward-facing barrier for up to 4 sec, blocking up to 3 incoming direct projectiles from its front. Recast or let it expire to fire stored kinetic damage at nearby enemies.","Instant · 24 Flux · 30 sec cooldown",[

  ],"melee"),
  ability("phase-rush","Phase Rush","kinetic","Targeted charge","Charges toward an enemy and stops at melee range. Cannot pass through walls or other obstacles.","Instant · 14 Flux · 17 sec cooldown",[
    ["meteor-charge","Meteor Charge","Impact lands in a powerful radial Kinetic blast that hits nearby enemies."],
    ["relentless-pursuit","Relentless Pursuit","If a charged enemy dies shortly afterward, refresh Charge once for a new target."],
    ["piercing-charge","Piercing Charge","An energy shock travels past the Charge target and cuts through lined-up enemies."],
  ],"melee"),
  ability("pulse-sever","Pulse Sever","kinetic","Melee interrupt","Interrupts an enemy that is casting a spell, locking its magic school for 3 sec and dealing 8 base damage. Has no interrupt effect if the target is not casting.","Instant · 10 Flux · 15 sec cooldown",[
    ["echo-sever","Echo Sever","A successful interrupt sends a ring that interrupts nearby ordinary enemies."],
    ["countershock","Countershock","A successful interrupt detonates kinetic damage around the interrupted enemy."],
    ["warpath","Warpath","A successful interrupt activates four seconds of aggressive empowered melee attacks."],
  ]),
  ability("flux-bolt","Flux Bolt","solar","Ranged damage combo","Deals 17 base Solar damage. Every third hit on the same enemy within 6 sec adds a burst of 6 base damage.","1.5 sec cast · 10 Flux for Solar",[
    ["corona-volley","Corona Volley","Each third hit sends bright seeking Solar bolts to up to three additional nearby enemies."],
    ["thunderhead","Thunderhead","Each third hit forms an electric storm cloud above the victim, delivering three lightning strikes over time."],
    ["helios-beam","Helios Beam","After three qualifying hits, hold the next Flux Bolt to channel a focused escalating Solar beam for up to two seconds; release early to stop."],
  ],"solar"),
  ability("phase-slip","Phase Slip","void","Placed teleport","Teleport to a chosen valid position within short range. Cannot teleport through solid walls or into occupied space.","Instant · 16 Flux · 23 sec cooldown",[
    ["shadow-ambush","Shadow Ambush","After Phase Slip, the next Rift Slash executes three rapid shadow-blade strikes."],
    ["rift-echo","Rift Echo","A shadow afterimage traces the legal teleport path and damages enemies it passes."],
    ["veilwalk","Veilwalk","After teleporting, the next direct hostile attack may pass harmlessly through the transparent Void shell."],
  ],"void"),
  ability("entropy-mark","Entropy Mark","void","Damage over time","Marks an enemy, dealing 5 base Void damage every 2 sec for 12 sec. Rift Slash against a marked enemy also restores 3 Flux.","Instant · 15 Flux · 12 sec duration",[
    ["contagion","Contagion","On death, an Entropy-marked target explodes into seeking corruption shards that infect nearby enemies; chaining is capped."],
    ["psychic-collapse","Psychic Collapse","After two genuine DoT ticks, press Entropy Mark again to consume its mark in a powerful AoE psychic implosion."],
    ["devouring-pact","Devouring Pact","Rift Slash repeatedly tears bounded healing soul fragments from Entropy-marked enemies."],
  ],"void"),
  ability("rift-slash","Rift Slash","void","Melee shadow damage","Strikes an enemy with two Void blades for 21 base damage. Hitting an enemy affected by your Entropy Mark also restores 3 Flux.","Instant · 13 Flux · 3 sec cooldown",[
    ["phantom-assault","Phantom Assault","Every third Rift Slash spawns a shadow clone BEHIND the target for two delayed mirrored strikes."],
    ["umbral-cyclone","Umbral Cyclone","Every third Rift Slash becomes a wide twin-blade cyclone hitting clustered enemies."],
    ["executioners-veil","Executioner's Veil","Slashing a low-health Entropy-marked victim triggers three-angle shadow finisher strikes with an internal cooldown."],
  ],"void"),
  ability("null-prison","Null Prison","void","Breakable CC","Castable incapacitates for up to 4 seconds; breaks on damage and follows DR.","1.4s cast · 24s cooldown",[
    ["rapid-seal","Rapid Seal","Faster cast with shorter crowd-control duration."],
    ["void-anchor","Void Anchor","A brief slow remains when the prison ends."],
    ["unstable-prison","Unstable Prison","Breaking the prison by damage emits a small damage pulse; no additional CC."],
  ]),
  ability("void-metamorphosis","Void Metamorphosis","void","Combat transformation","Transform into a Void combat form for 8 sec. Rift Slash hits in a wider area, while Entropy Mark ticks deal 27% more damage and trigger psychic strikes.","Instant · 23 Flux · 45 sec cooldown",[
    ["dreadblade-form","Dreadblade Form","Two enormous shadow blades: wider Rift Slash and every third slash launches twin forward flying blade arcs."],
    ["mindstorm","Mindstorm","Marked enemies suffer conspicuous sky-falling psychic spears on their Entropy Mark ticks during transformation."],
    ["soul-devourer","Soul Devourer","Marked enemy deaths grant bounded soul healing and a capped form extension. End the form with a final Void blast."],
  ],"void"),
  ability("abyssal-rift","Abyssal Rift","void","Placed area damage","Open a rift at a chosen location for 4 sec. It damages nearby enemies in repeated pulses, can absorb up to 3 eligible hostile projectiles, then implodes for additional damage.","Instant · 28 Flux · 32 sec cooldown",[

  ],"void"),
  ability("dark-pact","Dark Pact","void","Health-sacrifice finisher","Sacrifice up to 12% of your maximum health without killing yourself. Call down 3 staggered Void spears on an enemy, each also damaging nearby enemies.","Instant · 23 Flux · 30 sec cooldown",[

  ],"void"),
  ability("sun-lance","Sun Lance","solar","Ranged finisher","Strikes an enemy for 27 base Solar damage. Deals 18% more damage if the target is below 35% health.","1.8 sec cast · 16 Flux for Solar",[
    ["judgment-of-dawn","Judgment of Dawn","A Lance against a victim below 35% HP triggers a monumental finishing Solar beam from the sky."],
    ["scorching-lance","Scorching Lance","Apply a spreading Solar burn. If its bearer dies, explode in flame and burn nearby enemies."],
    ["split-lance","Split Lance","On impact, fire two smaller lances into other already-wounded nearby targets."],
  ],"solar"),
  ability("zenith-crash","Zenith Crash","solar","Placed area damage","Choose a ground location. After a 2 sec cast, a Solar pillar deals 38 base damage to enemies in the area. Secondary targets take reduced damage.","2 sec cast · 30 Flux · 18 sec cooldown",[
    ["solar-aftershock","Solar Aftershock","After the main Solar pillar, a second delayed, weaker pillar strikes the exact same location."],
    ["burning-ground","Burning Ground","The crash leaves a clearly visible persistent damaging plasma field."],
    ["prism-cross","Prism Cross","Four broad Solar beams cross diagonally out from impact in an X; solid obstacles stop the beams."],
  ],"solar"),
  ability("cinder-familiar","Cinder Familiar","solar","Summoned attacker","Summons one Solar familiar for 12 sec. It follows you and automatically attacks your selected enemy or another nearby enemy roughly every 0.86 sec.","Instant · 25 Flux · 35 sec cooldown",[
    ["phoenix-dive","Phoenix Dive","The one familiar becomes a blazing Solar-energy phoenix and dives through enemy packs every few seconds before returning."],
    ["soulbrand","Soulbrand","Lock the familiar to one target, sustaining a burn ray. Your further spell hits on that foe ignite extra Solar discharges."],
    ["dying-star","Dying Star","Recast while the familiar is alive to sacrifice it in a dramatic, targeted Supernova explosion."],
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
    ["rapid-crystal","Rapid Crystal","Faster Crystal Bolt; approximately every third cast can be performed while moving."],
    ["glacial-echo","Glacial Echo","A second smaller crystal follows the original Bolt and lands shortly after it."],
    ["fracture-chain","Fracture Chain","Every third Bolt fractures into seeking shards hitting up to three adjacent enemies."],
  ],"caster"),
  ability("crystal-snare","Crystal Snare","cryo","Area control","Roots nearby enemies around the selected target for up to 3 sec and marks them as Chilled for 5 sec. Bosses resist the root but can still be marked.","Instant · 15 Flux · 18 sec cooldown",[
    ["deep-freeze","Deep Freeze / Ice Tomb","Replace the pack root with a four-second single-target hard Ice Tomb, even on elites. Bosses remain CC-immune."],
    ["shatterfield","Shatterfield","After a root expires or breaks, the victim leaves a short damaging frost field that slows nearby mobs."],
    ["crystal-conduit","Crystal Conduit","Rooted targets are linked by visible crystal beams and share bounded damage while the links persist."],
  ],"caster"),
  ability("fracture-spear","Fracture Spear","cryo","Heavy ranged hit","Hurls a crystal spear for 32 base damage. Deals 30% more damage to a target that is Rooted, Slowed or Chilled.","1.7 sec cast · 21 Flux for Eclipse · 12 sec cooldown",[
    ["focused-fracture","Focused Fracture","Strictly single-target shatter burst against Snared or Chilled foes, including bosses."],
    ["crystal-rupture","Crystal Rupture","Spear bursts into a radial explosion of crystal shards, damaging nearby enemies."],
    ["riftbreaker","Riftbreaker","The spear pierces onward, splitting the ground in a narrow line of rising crystal spikes behind the victim."],
  ],"caster"),
  ability("froststorm","Froststorm","cryo","Ground damage","Creates a froststorm at a chosen location for 4 sec. Deals 8 base damage in pulses about once per second and slows ordinary enemies caught inside.","0.45 sec cast · 30 Flux · 24 sec cooldown",[
    ["glacial-barrage","Glacial Barrage","Huge falling crystal comets slam into telegraphed pockets while Froststorm's standard ticks continue."],
    ["expanding-frost","Expanding Frost","Froststorm grows outward and lasts longer with NO damage-per-second penalty."],
    ["shattering-storm","Shattering Storm","Crystal Bolt or Fracture Spear hits inside Froststorm trigger extra visible shatter explosions."],
  ],"caster"),
  ability("crystal-mirror","Crystal Mirror","cryo","Single-hit protection","Places a crystal mirror on yourself or an ally. Blocks the next eligible direct attack and launches retaliatory crystals at the attacker. Does not block damage-over-time or ground effects.","Instant · 23 Flux · 28 sec cooldown",[

  ],"caster"),
  ability("avalanche","Avalanche","cryo","Directional area damage","Sends a traveling wall of ice in the chosen direction, damaging and pushing ordinary enemies. Leaves a short damaging trail that slows enemies; bosses resist the push.","Instant · 35 Flux · 30 sec cooldown",[

  ],"caster"),
  ability("arc-strike","Arc Strike","kinetic","Melee combo","Strikes an enemy for 13 base damage. Use Arc Strike again within 4 sec to deal 16% more damage with the second strike and restore 3 Flux.","Instant · 10 Flux · Melee range",[
    ["twin-arc","Twin Arc","Every third Arc Strike sends a sweeping energy arc that cleaves nearby foes ahead."],
    ["overdrive","Overdrive","The second button press in a combo becomes three fast visual hits with focused total damage."],
    ["kinetic-reprisal","Kinetic Reprisal","A completed combo raises a brief cracked shield that absorbs one hit and retaliates."],
  ],"melee"),
  ability("gravity-hammer","Gravity Hammer","kinetic","Ground impact","Choose a location to deal 37 base damage to enemies in the impact area. Ordinary enemies are knocked down briefly; elites and bosses resist the knockdown.","0.6 sec cast · 30 Flux · 20 sec cooldown",[
    ["singularity-impact","Singularity Impact","A smaller targeted impact deals substantially more damage to a boss or isolated elite."],
    ["seismic-wave","Seismic Wave","Several expanding kinetic waves damage enemies farther from the impact."],
    ["gravity-well","Gravity Well","The impact leaves a damaging gravity field pulling ordinary mobs inward; bosses resist the pull."],
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
