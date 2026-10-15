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
    playstyle: "Choose Impact for aggressive melee combat: close the gap, keep striking and choose utility such as interrupts as your build grows.",
    passive: "Successful melee hits restore 4 Flux, at most once per second.",
    locked: ["phase-rush", "arc-strike"],
  },
  caster: {
    name: "Eclipse", color: "#79cafd", subtitle: "Cryo & positioning",
    description: "Eclipse shapes Cryo energy into crystalline projectiles and roots. Slow advancing enemies, trap dangerous foes and control the space between you.",
    playstyle: "Choose Eclipse to kite with Crystal Bolt and hold enemies in place with Crystal Snare. Discover other disciplines as your Journey progresses.",
    passive: "Ranged direct-damage spells cost 15% less Flux.",
    locked: ["crystal-bolt", "crystal-snare"],
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
  ability("phase-rush","Phase Rush","kinetic","Gap closer","Fast targeted rush toward an enemy; does not stun.","Instant · Role mobility",[
    ["impact","Impact","The next melee ability after rushing deals bonus damage."],
    ["pursuit","Pursuit","Shorter cooldown for more frequent pursuit."],
    ["disruption","Disruption","Applies a brief slow on arrival."],
  ],"melee"),
  ability("pulse-sever","Pulse Sever","kinetic","Melee counter-interrupt","Interrupt at melee range and counterstrike for minor Kinetic damage when you successfully stop a cast.","Instant · Melee counter · 15s CD",[
    ["suppression","Suppression","A successful interrupt extends the school lockout."],
    ["siphon","Siphon","A successful interrupt restores Flux."],
    ["shockwave","Shockwave","A successful interrupt produces a small damage pulse."],
  ]),
  ability("flux-bolt","Flux Bolt","solar","Ranged rhythm","Consecutive hits on one target build Solar Rhythm; every third Flux Bolt releases an extra energy burst. Resets if you switch target or wait too long.","1.5s cast · Every 3rd hit bursts",[
    ["overcharge","Overcharge","Longer cast with a larger, harder-hitting projectile."],
    ["rapid-flux","Rapid Flux","Shorter cast at reduced damage."],
    ["fractured-energy","Fractured Energy","Next direct attack from another discipline gains a bonus."],
  ]),
  ability("phase-slip","Phase Slip","void","Void escape","Instant directional phase jump that removes slows on arrival, but cannot escape roots or cross solid obstacles.","Instant · Removes slows · 23s CD",[
    ["extended-phase","Extended Phase","Teleport farther with a longer cooldown."],
    ["residual-field","Residual Field","Leave a short-lived slow field at the origin."],
    ["phase-shield","Phase Shield","Gain a small absorb shield on arrival."],
  ]),

  ability("entropy-mark","Entropy Mark","void","Damage over time","12-second dispellable damage-over-time mark.","Instant · 15 Flux",[
    ["deep-decay","Deep Decay","Damage ramps up while the mark remains active."],
    ["contagion","Contagion","Applying Entropy Mark also spreads a half-strength mark to one nearby unmarked enemy."],
    ["collapse","Collapse","After two damage ticks, your next direct damaging spell detonates and consumes the charged mark."],
  ]),
  ability("rift-slash","Rift Slash","void","Melee burst","Heavy weaponless arc slash, empowered by a debuff from any discipline.","Instant · 6s cooldown",[
    ["echo-cut","Echo Cut","A second, weaker arc follows the first."],
    ["rift-hunger","Rift Hunger","Rift Slash heals you for a capped portion of its hit, helping Impact survive close combat."],
    ["fractured-edge","Fractured Edge","Striking a debuffed enemy empowers the next direct attack."],
  ]),
  ability("null-prison","Null Prison","void","Breakable CC","Castable incapacitates for up to 4 seconds; breaks on damage and follows DR.","1.4s cast · 24s cooldown",[
    ["rapid-seal","Rapid Seal","Faster cast with shorter crowd-control duration."],
    ["void-anchor","Void Anchor","A brief slow remains when the prison ends."],
    ["unstable-prison","Unstable Prison","Breaking the prison by damage emits a small damage pulse; no additional CC."],
  ]),
  ability("sun-lance","Sun Lance","solar","Precision finisher","Focused Solar lance deals 18% extra damage to enemies below 35% HP. Unlike Flux Bolt, it rewards choosing a weakened priority target.","1.8s cast · +18% below 35% HP",[
    ["overcharged-lance","Overcharged Lance","Longer cast with a larger direct hit."],
    ["scorching-lance","Scorching Lance","Apply a short Solar damage-over-time burn."],
    ["split-lance","Split Lance","Reduced secondary damage to a nearby second enemy."],
  ]),
  ability("zenith-crash","Zenith Crash","solar","Telegraphed area burst","Mark the enemy’s current position; after 2 seconds a Solar pillar lands there, damaging enemies still inside. The impact can be dodged.","2s warning · Ground-locked impact · 18s CD",[
    ["focused-impact","Focused Impact","Smaller impact area with higher focused damage."],
    ["solar-aftershock","Solar Aftershock","A weaker second explosion follows at the same location."],
    ["burning-ground","Burning Ground","Leave a short-lived damaging plasma field."],
  ]),
  ability("photon-barrier","Photon Barrier","solar","Absorb shield","Short absorb shield on self or an ally; unlike percentage damage reduction.","Instant · 28s cooldown",[
    ["reinforced-prism","Reinforced Prism","Stronger absorb with a longer cooldown."],
    ["prismatic-return","Prismatic Return","When broken, release a capped damage pulse nearby."],
    ["shared-light","Shared Light","Share a smaller shield with another nearby ally."],
  ]),
  ability("crystal-bolt","Crystal Bolt","cryo","Ranged slow","Quick ranged crystal hit with a 35% slow for 3 seconds.","1.3s cast · 12 Flux",[
    ["rapid-crystal","Rapid Crystal","Faster cast for less damage."],
    ["glacial-echo","Glacial Echo","Launch a second, smaller crystal after the first."],
    ["brittle-core","Brittle Core","Empower the next direct attack from any discipline."],
  ],"caster"),
  ability("crystal-snare","Crystal Snare","cryo","Root","Instant 3-second root; the target can still cast and attack. Root DR applies.","Instant · 18s cooldown",[
    ["deep-freeze","Deep Freeze","Longer root with a longer cooldown; DR still applies."],
    ["shatterfield","Shatterfield","A brief slow field remains after the root ends."],
    ["frost-momentum","Frost Momentum","Landing the root grants temporary movement speed."],
  ],"caster"),
  ability("fracture-spear","Fracture Spear","cryo","Ranged burst","Heavy crystalline ranged attack, empowered versus any slowed or rooted target.","1.7s cast · 12s cooldown",[
    ["focused-fracture","Focused Fracture","Higher bonus against controlled targets, lower base damage."],
    ["crystal-rupture","Crystal Rupture","Reduced splash damage around the target."],
    ["delayed-shatter","Delayed Shatter","A crystal lodged in the target shatters with a second hit."],
  ]),
  ability("arc-strike","Arc Strike","kinetic","Melee combo","Fast instant Kinetic strike. A second Arc Strike within 4 seconds hits 16% harder and returns 3 Flux; then the rhythm resets.","Instant · Two-hit rhythm · No CD",[
    ["twin-arc","Twin Arc","Every third hit creates a second arc from the opposite side."],
    ["momentum","Momentum","Successful hits return some Flux with an internal cooldown."],
    ["resonant-strike","Resonant Strike","Charge the next direct attack from another ability."],
  ],"melee"),
  ability("gravity-hammer","Gravity Hammer","kinetic","Melee burst","Heavy gravity impact from above in melee range; no stun.","0.6s warning · 12s cooldown",[
    ["singularity-impact","Singularity Impact","Concentrate the impact into higher single-target damage."],
    ["seismic-wave","Seismic Wave","Weaker primary hit but an expanding damage shockwave."],
    ["aftershock","Aftershock","A second weaker impact lands at the same location and can be avoided."],
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
  // Genesis is the first fully migrated, class-locked six-spell kit.
  // Other Origins retain their legacy shared pools until their own class passes.
  if (role === "healer") return GENESIS_CLASS_SPELL_IDS.map(id => ABILITY_BY_ID[id]);
  return ABILITIES.filter(a => !a.role || a.role === role);
}
