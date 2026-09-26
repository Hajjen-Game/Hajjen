function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function rollRange(min, max) {
  // Most players cluster around the middle, with occasional stronger
  // personalities so the arena can still produce memorable outlier games.
  const roll = Math.random() < 0.18
    ? Math.random()
    : (Math.random() + Math.random()) / 2;
  return min + (max - min) * roll;
}

function roleRange(role, healer, melee, caster) {
  if (role === "healer") return healer;
  if (role === "melee") return melee;
  return caster;
}

export function aiSkillForRank(rank) {
  const normalized = clamp((Math.max(1, Math.min(14, Number(rank) || 1)) - 1) / 13);
  // Rank should improve decision quality, not raw combat stats. Even low-rank
  // opponents remain functional; high-rank opponents become more disciplined.
  return 0.36 + normalized * 0.64;
}

export function createAiBehaviorProfile(role, rank) {
  const skill = aiSkillForRank(rank);
  const range = (healer, melee, caster) => {
    const [min, max] = roleRange(role, healer, melee, caster);
    return clamp(rollRange(min, max));
  };

  return {
    seed: Math.floor(Math.random() * 0x7fffffff),
    rank: Math.max(1, Math.min(14, Number(rank) || 1)),
    skill,

    // Shared personality dimensions.
    volatility: range([0.18, 0.68], [0.20, 0.72], [0.18, 0.68]),
    aggression: range([0.18, 0.62], [0.52, 0.94], [0.36, 0.82]),
    targetStickiness: range([0.35, 0.78], [0.28, 0.92], [0.28, 0.82]),
    healerSwapBias: range([0.10, 0.42], [0.18, 0.88], [0.16, 0.72]),
    peelBias: range([0.35, 0.78], [0.14, 0.82], [0.24, 0.84]),
    ccBias: range([0.30, 0.88], [0.30, 0.82], [0.42, 0.92]),
    defensiveGreed: range([0.12, 0.72], [0.22, 0.78], [0.18, 0.76]),
    interruptDiscipline: range([0.45, 0.90], [0.38, 0.94], [0.34, 0.86]),
    chaseGreed: range([0.10, 0.50], [0.28, 0.90], [0.12, 0.48]),

    // Healer identity.
    healerOffenseBias: range([0.12, 0.78], [0.30, 0.50], [0.30, 0.50]),
    healerTriage: range([0.48, 0.96], [0.60, 0.70], [0.60, 0.70]),
    manaConservation: range([0.18, 0.88], [0.40, 0.55], [0.40, 0.55]),
    healerKiteBias: range([0.32, 0.92], [0.50, 0.60], [0.50, 0.60]),
    healerSelfPreservation: range([0.38, 0.96], [0.55, 0.65], [0.55, 0.65]),
    healerCastGreed: range([0.12, 0.72], [0.35, 0.45], [0.35, 0.45]),

    // Caster identity.
    casterKiteBias: range([0.45, 0.55], [0.45, 0.55], [0.42, 0.96]),
    supportDiscipline: range([0.50, 0.62], [0.50, 0.62], [0.38, 0.96]),
    casterCastGreed: range([0.30, 0.42], [0.30, 0.42], [0.12, 0.80]),
  };
}
