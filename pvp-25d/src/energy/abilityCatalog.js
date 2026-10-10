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
    playstyle: "Choose Genesis if you enjoy helping your team, surviving pressure and mixing support with your own attacks.",
    passive: "Healing spells cost 15% less Flux.",
    locked: ["pulse-mend", "resonance-guard"],
  },
  melee: {
    name: "Impact", color: "#f27b83", subtitle: "Momentum & disruption",
    description: "Impact is a force of motion and collision. Rush into range, pressure opponents and interrupt their most dangerous casts.",
    playstyle: "Choose Impact if you like aggressive movement, fighting up close and disrupting enemies at the right moment.",
    passive: "Successful melee hits restore 4 Flux, at most once per second.",
    locked: ["phase-rush", "pulse-sever"],
  },
  caster: {
    name: "Eclipse", color: "#79cafd", subtitle: "Energy & positioning",
    description: "Eclipse bends raw cosmic energy into powerful ranged attacks. Control the distance, time your casts and escape when cornered.",
    playstyle: "Choose Eclipse if you enjoy ranged combat, positioning and finding the perfect window to unleash spells.",
    passive: "Ranged direct-damage spells cost 15% less Flux.",
    locked: ["flux-bolt", "phase-slip"],
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

export const ABILITIES = Object.freeze([
  ability("pulse-mend","Pulse Mend","vital","Direct heal","Reliable casted heal on self or an ally.","1.5s cast · Role ability",[
    ["restoration","Restoration","Stronger direct healing at reduced Flux cost."],
    ["resonance","Resonance","Direct offensive damage charges up the next Pulse Mend."],
    ["preservation","Preservation","A portion of the heal becomes a short absorption shield."],
  ],"healer"),
  ability("resonance-guard","Resonance Guard","vital","Damage reduction","Brief percentage damage reduction on self or an ally.","Instant · Role defensive",[
    ["guardian","Guardian","Stronger damage reduction with a longer cooldown."],
    ["retaliation","Retaliation","A capped portion of prevented damage returns as offensive energy."],
    ["harmonic-field","Harmonic Field","Smaller protection also reaches a nearby ally."],
  ],"healer"),
  ability("phase-rush","Phase Rush","kinetic","Gap closer","Fast targeted rush toward an enemy; does not stun.","Instant · Role mobility",[
    ["impact","Impact","The next melee ability after rushing deals bonus damage."],
    ["pursuit","Pursuit","Shorter cooldown for more frequent pursuit."],
    ["disruption","Disruption","Applies a brief slow on arrival."],
  ],"melee"),
  ability("pulse-sever","Pulse Sever","kinetic","Melee interrupt","Close-range interrupt with school lockout on a successful stop.","Instant · Role interrupt",[
    ["suppression","Suppression","A successful interrupt extends the school lockout."],
    ["siphon","Siphon","A successful interrupt restores Flux."],
    ["shockwave","Shockwave","A successful interrupt produces a small damage pulse."],
  ],"melee"),
  ability("flux-bolt","Flux Bolt","solar","Ranged filler","Low-cost ranged direct damage; always available to casters.","1.5s cast · Role attack",[
    ["overcharge","Overcharge","Longer cast with a larger, harder-hitting projectile."],
    ["rapid-flux","Rapid Flux","Shorter cast at reduced damage."],
    ["fractured-energy","Fractured Energy","Next direct attack from another discipline gains a bonus."],
  ],"caster"),
  ability("phase-slip","Phase Slip","void","Escape","Short directional teleport, stopped by solid arena obstacles.","Instant · Role mobility",[
    ["extended-phase","Extended Phase","Teleport farther with a longer cooldown."],
    ["residual-field","Residual Field","Leave a short-lived slow field at the origin."],
    ["phase-shield","Phase Shield","Gain a small absorb shield on arrival."],
  ],"caster"),

  ability("entropy-mark","Entropy Mark","void","Damage over time","12-second dispellable damage-over-time mark.","Instant · 15 Flux",[
    ["deep-decay","Deep Decay","Damage ramps up while the mark remains active."],
    ["contagion","Contagion","A weaker mark may spread to a nearby second enemy."],
    ["collapse","Collapse","Direct damage can consume a charged mark for a burst."],
  ]),
  ability("rift-slash","Rift Slash","void","Melee burst","Heavy weaponless arc slash, empowered by a debuff from any discipline.","Instant · 6s cooldown",[
    ["echo-cut","Echo Cut","A second, weaker arc follows the first."],
    ["rift-hunger","Rift Hunger","A capped share of damage returns as self-healing."],
    ["fractured-edge","Fractured Edge","Striking a debuffed enemy empowers the next direct attack."],
  ]),
  ability("null-prison","Null Prison","void","Breakable CC","Castable incapacitates for up to 4 seconds; breaks on damage and follows DR.","1.4s cast · 24s cooldown",[
    ["rapid-seal","Rapid Seal","Faster cast with shorter crowd-control duration."],
    ["void-anchor","Void Anchor","A brief slow remains when the prison ends."],
    ["unstable-prison","Unstable Prison","Breaking the prison by damage emits a small damage pulse; no additional CC."],
  ]),
  ability("sun-lance","Sun Lance","solar","Ranged damage","Reliable high-impact ranged attack without a normal cooldown.","1.8s cast · 18 Flux",[
    ["overcharged-lance","Overcharged Lance","Longer cast with a larger direct hit."],
    ["scorching-lance","Scorching Lance","Apply a short Solar damage-over-time burn."],
    ["split-lance","Split Lance","Reduced secondary damage to a nearby second enemy."],
  ]),
  ability("zenith-crash","Zenith Crash","solar","Area burst","Telegraphed solar pillar lands from above. Positioning and LOS matter.","2s cast · 18s cooldown",[
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
  ]),
  ability("crystal-snare","Crystal Snare","cryo","Root","Instant 3-second root; the target can still cast and attack. Root DR applies.","Instant · 18s cooldown",[
    ["deep-freeze","Deep Freeze","Longer root with a longer cooldown; DR still applies."],
    ["shatterfield","Shatterfield","A brief slow field remains after the root ends."],
    ["frost-momentum","Frost Momentum","Landing the root grants temporary movement speed."],
  ]),
  ability("fracture-spear","Fracture Spear","cryo","Ranged burst","Heavy crystalline ranged attack, empowered versus any slowed or rooted target.","1.7s cast · 12s cooldown",[
    ["focused-fracture","Focused Fracture","Higher bonus against controlled targets, lower base damage."],
    ["crystal-rupture","Crystal Rupture","Reduced splash damage around the target."],
    ["delayed-shatter","Delayed Shatter","A crystal lodged in the target shatters with a second hit."],
  ]),
  ability("arc-strike","Arc Strike","kinetic","Melee filler","Fast, low-cost weaponless melee energy sweep.","Instant · 10 Flux",[
    ["twin-arc","Twin Arc","Every third hit creates a second arc from the opposite side."],
    ["momentum","Momentum","Successful hits return some Flux with an internal cooldown."],
    ["resonant-strike","Resonant Strike","Charge the next direct attack from another ability."],
  ]),
  ability("gravity-hammer","Gravity Hammer","kinetic","Melee burst","Heavy gravity impact from above in melee range; no stun.","0.6s warning · 12s cooldown",[
    ["singularity-impact","Singularity Impact","Concentrate the impact into higher single-target damage."],
    ["seismic-wave","Seismic Wave","Weaker primary hit but an expanding damage shockwave."],
    ["aftershock","Aftershock","A second weaker impact lands at the same location and can be avoided."],
  ]),
  ability("vector-rush","Vector Rush","kinetic","Directional dash","Dash in the chosen direction, respecting arena collisions.","Instant · 18s cooldown",[
    ["extended-vector","Extended Vector","Move farther, with a longer cooldown."],
    ["shock-trail","Shock Trail","Leave a brief damaging trail along the route."],
    ["kinetic-shield","Kinetic Shield","Gain a small absorb shield after completing the dash."],
  ]),
  ability("resonance-cut","Resonance Cut","kinetic","Ranged interrupt","Mid-range interrupt with school lockout only on a successful cast stop.","Instant · 20s cooldown · 15 Flux",[
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
    ["amplified-link","Amplified Link","Higher healing conversion with a per-second cap."],
    ["lingering-resonance","Lingering Resonance","Part of each heal becomes a short heal-over-time."],
    ["reciprocal-flow","Reciprocal Flow","Split the same total healing between ally and self."],
  ]),
  ability("cleanse-flux","Cleanse Flux","vital","Dispel","Remove a dispellable negative effect from self or an ally.","Instant · 10s cooldown",[
    ["purifying-surge","Purifying Surge","A successful dispel also restores a little HP."],
    ["flux-reclamation","Flux Reclamation","A successful dispel returns some Flux."],
    ["dual-purge","Dual Purge","Remove up to two eligible effects, with a longer cooldown."],
  ]),
]);

export const ABILITY_BY_ID = Object.freeze(Object.fromEntries(ABILITIES.map(a => [a.id, a])));
export const FREE_ABILITIES = Object.freeze(ABILITIES.filter(a => !a.role));
export function availableAbilities(role) {
  if (!ROLES[role]) throw new Error("Unknown role: " + role);
  return ABILITIES.filter(a => !a.role || a.role === role);
}
