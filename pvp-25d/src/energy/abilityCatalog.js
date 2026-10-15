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
  ability("pulse-mend","Pulse Mend","vital","Direct or offensive healing","Heal a teammate; with Vital Reversal, strike an enemy to heal wounded allies and restore an active Resonance Guard.","1.5s cast · Genesis core",[
    ["vital-crescendo","Vital Crescendo","Hold the cast longer to build a colossal single-target heal."],
    ["second-heart","Second Heart","Place an emergency Vital core that heals the recipient when critically wounded."],
    ["vital-reversal","Vital Reversal","Cast on an enemy to damage it, heal all injured teammates, and refill active Resonance Guard absorbs."],
  ],"healer"),
  ability("resonance-guard","Resonance Guard","vital","Absorb shield","Wrap yourself or an ally in a finite absorb shield; prevents damage rather than reducing damage by a percentage.","Instant · 8s absorb · 32s CD",[
    ["guardian-network","Guardian Network","Grant smaller absorb shields to all other teammates, regardless of spacing."],
    ["retaliation","Retaliation","Store absorbed damage, then launch energy bolts at the enemies when the shield bursts or expires."],
    ["last-stand","Last Stand","Once during the shield, prevent a lethal hit and restore some of the protected ally's HP."],
  ],"healer"),
  ability("vital-cascade","Vital Cascade","vital","Seeking team heal","Heal a selected teammate, then visibly chain to the other wounded allies no matter where they stand.","Instant · Team healing · 22s CD",[
    ["double-cascade","Double Cascade","Send a second smart healing wave to the allies who still need it most."],
    ["rejuvenating-orbit","Rejuvenating Orbit","Give healed teammates orbiting Vital cores that pulse healing for several seconds."],
    ["life-transfer","Life Transfer","Safely transfer a capped amount of HP from a healthy teammate to rescue the most injured one."],
  ],"healer"),
  ability("stasis-seal","Stasis Seal","vital","Breakable crowd control","Enclose a single target in luminous stasis; disables ordinary enemies until time expires or damage breaks it. Bosses resist hard CC.","Instant · Up to 5s CC · 24s CD",[
    ["tranquility-wave","Tranquility Wave","Spread shorter, damage-breakable stasis to eligible nearby mobs."],
    ["mercy-bloom","Mercy Bloom","On stasis break or expiry, send a healing blossom to the most injured teammate."],
    ["essence-siphon","Essence Siphon","While stasis holds, stream Flux back to Genesis and send gentle healing pulses to the team."],
  ],"healer"),
  ability("vital-recall","Vital Recall","vital","Healing rewind","Mark a teammate for four seconds, then recast to restore a large but capped share of health they lost since marking.","Instant · Recast · 36s CD",[],"healer"),
  ability("soul-relay","Soul Relay","vital","Life connection","Link two teammates, dividing some incoming damage and sharing part of their healing over any distance. Transferred damage cannot kill.","Instant · Paired link · 24s CD",[],"healer"),
  ability("seismic-uppercut","Seismic Uppercut","kinetic","Launch and crush","Strike a nearby enemy upward, then smash it down with a damaging shockwave. Bosses stay grounded but suffer cracked-earth bursts.","Instant · Melee · 25s CD",[

  ],"melee"),
  ability("kinetic-rampart","Kinetic Rampart","kinetic","Projectile counter","Raise a forward-facing energy barrier, catch limited hostile projectiles, then recast or wait to fire kinetic shards at enemies.","Instant · Recast · 30s CD",[

  ],"melee"),
  ability("phase-rush","Phase Rush","kinetic","Targeted charge","Charge visibly toward a selected enemy, stopping at melee range without crossing obstacles.","Instant · Targeted Charge · 17s CD",[
    ["meteor-charge","Meteor Charge","Impact lands in a powerful radial Kinetic blast that hits nearby enemies."],
    ["relentless-pursuit","Relentless Pursuit","If a charged enemy dies shortly afterward, refresh Charge once for a new target."],
    ["piercing-charge","Piercing Charge","An energy shock travels past the Charge target and cuts through lined-up enemies."],
  ],"melee"),
  ability("pulse-sever","Pulse Sever","kinetic","Melee interrupt","Interrupt an enemy cast at close range. Can counter interruptible boss abilities without stunning the boss.","Instant · Interrupt · 15s CD",[
    ["echo-sever","Echo Sever","A successful interrupt sends a ring that interrupts nearby ordinary enemies."],
    ["countershock","Countershock","A successful interrupt detonates kinetic damage around the interrupted enemy."],
    ["warpath","Warpath","A successful interrupt activates four seconds of aggressive empowered melee attacks."],
  ]),
  ability("flux-bolt","Flux Bolt","solar","Solar lightning rhythm","Cast a quick radiant bolt. Every third hit against the same target bursts with extra Solar energy.","1.5s cast · Three-hit rhythm",[
    ["corona-volley","Corona Volley","Each third hit sends bright seeking Solar bolts to up to three additional nearby enemies."],
    ["thunderhead","Thunderhead","Each third hit forms an electric storm cloud above the victim, delivering three lightning strikes over time."],
    ["helios-beam","Helios Beam","After three qualifying hits, hold the next Flux Bolt to channel a focused escalating Solar beam for up to two seconds; release early to stop."],
  ],"solar"),
  ability("phase-slip","Phase Slip","void","Mouse-placed teleport","Click an accessible landing position to instantly phase through shadows. Cannot cross solid arena walls or skip collisions.","Mouse-aimed · Short-range 23s CD",[
    ["shadow-ambush","Shadow Ambush","After Phase Slip, the next Rift Slash executes three rapid shadow-blade strikes."],
    ["rift-echo","Rift Echo","A shadow afterimage traces the legal teleport path and damages enemies it passes."],
    ["veilwalk","Veilwalk","After teleporting, the next direct hostile attack may pass harmlessly through the transparent Void shell."],
  ],"void"),
  ability("entropy-mark","Entropy Mark","void","Corruption DoT","A dark projectile implants a pulsing violet fracture in one enemy for around twelve seconds. Sets up devastating Void reactions.","Instant · 12s DoT · Recast when charged",[
    ["contagion","Contagion","On death, an Entropy-marked target explodes into seeking corruption shards that infect nearby enemies; chaining is capped."],
    ["psychic-collapse","Psychic Collapse","After two genuine DoT ticks, press Entropy Mark again to consume its mark in a powerful AoE psychic implosion."],
    ["devouring-pact","Devouring Pact","Rift Slash repeatedly tears bounded healing soul fragments from Entropy-marked enemies."],
  ],"void"),
  ability("rift-slash","Rift Slash","void","Twin shadow blades","A fast close-range attack with two void-forged blades. A marked target fractures under the dual strike.","Instant · Fast melee · 3s CD",[
    ["phantom-assault","Phantom Assault","Every third Rift Slash spawns a shadow clone BEHIND the target for two delayed mirrored strikes."],
    ["umbral-cyclone","Umbral Cyclone","Every third Rift Slash becomes a wide twin-blade cyclone hitting clustered enemies."],
    ["executioners-veil","Executioner's Veil","Slashing a low-health Entropy-marked victim triggers three-angle shadow finisher strikes with an internal cooldown."],
  ],"void"),
  ability("null-prison","Null Prison","void","Breakable CC","Castable incapacitates for up to 4 seconds; breaks on damage and follows DR.","1.4s cast · 24s cooldown",[
    ["rapid-seal","Rapid Seal","Faster cast with shorter crowd-control duration."],
    ["void-anchor","Void Anchor","A brief slow remains when the prison ends."],
    ["unstable-prison","Unstable Prison","Breaking the prison by damage emits a small damage pulse; no additional CC."],
  ]),
  ability("void-metamorphosis","Void Metamorphosis","void","Shadow transformation","Enter a terrifying eight-second dark combat form with twin curved shadow blades. Your Rift Slash cleaves and Entropy Mark erupts with psychic power.","Instant · 8s form · 45s CD",[
    ["dreadblade-form","Dreadblade Form","Two enormous shadow blades: wider Rift Slash and every third slash launches twin forward flying blade arcs."],
    ["mindstorm","Mindstorm","Marked enemies suffer conspicuous sky-falling psychic spears on their Entropy Mark ticks during transformation."],
    ["soul-devourer","Soul Devourer","Marked enemy deaths grant bounded soul healing and a capped form extension. End the form with a final Void blast."],
  ],"void"),
  ability("abyssal-rift","Abyssal Rift","void","Mouse-placed black hole","Click a location to tear a violet breach in reality. Tendrils repeatedly hurt nearby enemies, swallow a limited number of eligible hostile projectiles, then implode.","Mouse placement · 4s breach · 32s CD",[

  ],"void"),
  ability("dark-pact","Dark Pact","void","HP-sacrifice sky spears","Sacrifice a safe nonlethal fraction of your own health and call down three enormous staggered shadow spears over a chosen enemy.","Targeted · Three sky spears · 30s CD",[

  ],"void"),
  ability("sun-lance","Sun Lance","solar","Precision finisher","Heavy focused Solar lance with its existing signature animation. Hits a weakened enemy harder below 35% health.","1.8s cast · ORIGINAL SUN LANCE VISUALS PRESERVED",[
    ["judgment-of-dawn","Judgment of Dawn","A Lance against a victim below 35% HP triggers a monumental finishing Solar beam from the sky."],
    ["scorching-lance","Scorching Lance","Apply a spreading Solar burn. If its bearer dies, explode in flame and burn nearby enemies."],
    ["split-lance","Split Lance","On impact, fire two smaller lances into other already-wounded nearby targets."],
  ],"solar"),
  ability("zenith-crash","Zenith Crash","solar","Mouse-placed sun pillar","Freely choose a ground position with the mouse. After a visible two-second warning, a huge Solar pillar strikes that position.","2.0s cast · Mouse-placed AoE · 18s cooldown",[
    ["solar-aftershock","Solar Aftershock","After the main Solar pillar, a second delayed, weaker pillar strikes the exact same location."],
    ["burning-ground","Burning Ground","The crash leaves a clearly visible persistent damaging plasma field."],
    ["prism-cross","Prism Cross","Four broad Solar beams cross diagonally out from impact in an X; solid obstacles stop the beams."],
  ],"solar"),
  ability("cinder-familiar","Cinder Familiar","solar","Summoned elemental","Summon one hovering mini-sun for twelve seconds. It follows Solar, automatically shoots the priority enemy, and is not an AI party member.","Instant · 12s familiar · 35s CD",[
    ["phoenix-dive","Phoenix Dive","The one familiar becomes a blazing Solar-energy phoenix and dives through enemy packs every few seconds before returning."],
    ["soulbrand","Soulbrand","Lock the familiar to one target, sustaining a burn ray. Your further spell hits on that foe ignite extra Solar discharges."],
    ["dying-star","Dying Star","Recast while the familiar is alive to sacrifice it in a dramatic, targeted Supernova explosion."],
  ],"solar"),
  ability("solar-ascension","Solar Ascension","solar","Three celestial sigils","Call three brilliant Solar sigils. Each of your next three offensive Solar spellcasts calls down a powerful skybeam at its target.","Instant · Three empowered casts · 38s CD",[

  ],"solar"),
  ability("chain-tempest","Chain Tempest","solar","Chain lightning detonation","Launch one gigantic lightning orb that branches to up to four nearby enemies on hit. Against a lone foe, deliver multiple concentrated strikes.","Instant · Lightning chain · 26s CD",[

  ],"solar"),
  ability("photon-barrier","Photon Barrier","solar","Absorb shield","Short absorb shield on self or an ally; unlike percentage damage reduction.","Instant · 28s cooldown",[
    ["reinforced-prism","Reinforced Prism","Stronger absorb with a longer cooldown."],
    ["prismatic-return","Prismatic Return","When broken, release a capped damage pulse nearby."],
    ["shared-light","Shared Light","Share a smaller shield with another nearby ally."],
  ]),
  ability("crystal-bolt","Crystal Bolt","cryo","Signature crystal projectile","Crystal Bolt keeps its original beloved buildup, travel trail and impact. A precise ranged strike that chills the target.","1.3s cast · 12 Flux · Crystal Bolt VFX preserved",[
    ["rapid-crystal","Rapid Crystal","Faster Crystal Bolt; approximately every third cast can be performed while moving."],
    ["glacial-echo","Glacial Echo","A second smaller crystal follows the original Bolt and lands shortly after it."],
    ["fracture-chain","Fracture Chain","Every third Bolt fractures into seeking shards hitting up to three adjacent enemies."],
  ],"caster"),
  ability("crystal-snare","Crystal Snare","cryo","Multi-target root","Root a pack of nearby ordinary mobs for three seconds. Elites can be rooted; bosses only gain a Chilled mark for Fracture Spear.","Instant · Area root · 18s CD",[
    ["deep-freeze","Deep Freeze / Ice Tomb","Replace the pack root with a four-second single-target hard Ice Tomb, even on elites. Bosses remain CC-immune."],
    ["shatterfield","Shatterfield","After a root expires or breaks, the victim leaves a short damaging frost field that slows nearby mobs."],
    ["crystal-conduit","Crystal Conduit","Rooted targets are linked by visible crystal beams and share bounded damage while the links persist."],
  ],"caster"),
  ability("fracture-spear","Fracture Spear","cryo","Heavy shatter burst","Heavy long-range crystalline spear, especially effective against Snared or Chilled enemies, including marked bosses.","1.7s cast · 12s CD",[
    ["focused-fracture","Focused Fracture","Strictly single-target shatter burst against Snared or Chilled foes, including bosses."],
    ["crystal-rupture","Crystal Rupture","Spear bursts into a radial explosion of crystal shards, damaging nearby enemies."],
    ["riftbreaker","Riftbreaker","The spear pierces onward, splitting the ground in a narrow line of rising crystal spikes behind the victim."],
  ],"caster"),
  ability("froststorm","Froststorm","cryo","Mouse-placed frost area","Click a place in the arena to summon a persistent localized ice storm that damages clustered enemies and slows nonboss mobs.","Mouse target · 4s storm · 24s CD",[
    ["glacial-barrage","Glacial Barrage","Huge falling crystal comets slam into telegraphed pockets while Froststorm's standard ticks continue."],
    ["expanding-frost","Expanding Frost","Froststorm grows outward and lasts longer with NO damage-per-second penalty."],
    ["shattering-storm","Shattering Storm","Crystal Bolt or Fracture Spear hits inside Froststorm trigger extra visible shatter explosions."],
  ],"caster"),
  ability("crystal-mirror","Crystal Mirror","cryo","One-hit crystal reflection","Place a floating faceted mirror on yourself or an ally. It blocks the next direct hostile hit, then bursts into seeking crystals that strike the attacker.","Instant · Single direct-attack intercept · 28s CD",[

  ],"caster"),
  ability("avalanche","Avalanche","cryo","Directional ice onslaught","Aim in the arena with the mouse and unleash a traveling wall of massive crystals that damages and pushes regular mobs, leaving a short crystal track. Bosses resist pushback.","Mouse direction · Moving wave · 30s CD",[

  ],"caster"),
  ability("arc-strike","Arc Strike","kinetic","Melee combo","Rapid two-press melee rhythm: the second strike within four seconds hits harder.","Instant · Two-hit combo",[
    ["twin-arc","Twin Arc","Every third Arc Strike sends a sweeping energy arc that cleaves nearby foes ahead."],
    ["overdrive","Overdrive","The second button press in a combo becomes three fast visual hits with focused total damage."],
    ["kinetic-reprisal","Kinetic Reprisal","A completed combo raises a brief cracked shield that absorbs one hit and retaliates."],
  ],"melee"),
  ability("gravity-hammer","Gravity Hammer","kinetic","Mouse-placed AoE","Choose an arena position with the mouse; after a short warning, a heavy gravity impact damages nearby enemies and knocks down ordinary mobs.","Mouse target · 20s CD · Bosses immune to knockdown",[
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
