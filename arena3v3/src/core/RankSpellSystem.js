const PRIEST_RANK_SPELLS = Object.freeze([
  {
    rank: 5,
    spell: Object.freeze({
      id: "priest-penance",
      name: "Penance",
      rankRequired: 5,
      rankUnlock: true,
      aiRole: "quickHeal",
      visualStyle: "priest",
      target: "ally",
      school: "holy",
      resourceCost: 16,
      castMs: 1100,
      cooldownMs: 7000,
      gcdMs: 1200,
      range: 385,
      effects: [{ kind: "heal", amount: 210 }],
    }),
  },
  {
    rank: 10,
    spell: Object.freeze({
      id: "priest-life-grip",
      name: "Life Grip",
      rankRequired: 10,
      rankUnlock: true,
      visualStyle: "priest",
      target: "ally",
      excludeSelf: true,
      school: "holy",
      utility: true,
      resourceCost: 10,
      castMs: 0,
      cooldownMs: 22000,
      gcdMs: 1200,
      range: 385,
      noHitRoll: true,
      effects: [{ kind: "lifeGrip", stopDistance: 56, pullDurationMs: 280 }],
    }),
  },
  {
    rank: 15,
    spell: Object.freeze({
      id: "priest-power-word-shield",
      name: "Power Word: Shield",
      rankRequired: 15,
      rankUnlock: true,
      aiRole: "defensive",
      visualStyle: "priest",
      target: "ally",
      school: "holy",
      utility: true,
      resourceCost: 16,
      castMs: 0,
      cooldownMs: 10000,
      gcdMs: 1200,
      range: 385,
      noHitRoll: true,
      effects: [{ kind: "absorb", amount: 250, durationMs: 6500 }],
    }),
  },
  {
    rank: 20,
    spell: Object.freeze({
      id: "priest-power-word-barrier",
      name: "Power Word: Barrier",
      rankRequired: 20,
      rankUnlock: true,
      visualStyle: "priest",
      target: "ground",
      school: "holy",
      utility: true,
      resourceCost: 25,
      castMs: 0,
      cooldownMs: 30000,
      gcdMs: 1200,
      range: 360,
      noHitRoll: true,
      effects: [{ kind: "groundBarrier", radius: 130, value: 0.25, durationMs: 8000 }],
    }),
  },
]);

const RANK_SPELLS = Object.freeze({
  priest: PRIEST_RANK_SPELLS,
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function rankSpellUnlocksForClass(classId) {
  return (RANK_SPELLS[classId] || []).map(entry => ({
    rank: entry.rank,
    spell: clone(entry.spell),
  }));
}

export function rankSpellUnlockForRank(classId, rank) {
  const entry = (RANK_SPELLS[classId] || [])
    .find(item => item.rank === Number(rank));
  return entry ? { rank: entry.rank, spell: clone(entry.spell) } : null;
}

export function rankSpellUnlocksBetween(classId, fromRank, toRank) {
  const low = Number(fromRank) || 0;
  const high = Number(toRank) || 0;
  return (RANK_SPELLS[classId] || [])
    .filter(entry => entry.rank > low && entry.rank <= high)
    .map(entry => ({ rank: entry.rank, spell: clone(entry.spell) }));
}

export function applyRankSpellUnlocks(config, rank) {
  const next = clone(config);
  const currentRank = Math.max(1, Math.min(20, Number(rank) || 1));

  for (const entry of RANK_SPELLS[next.classId] || []) {
    if (currentRank < entry.rank) continue;
    if (next.spells.some(spell => spell.id === entry.spell.id)) continue;
    next.spells.push(clone(entry.spell));
  }

  return next;
}
