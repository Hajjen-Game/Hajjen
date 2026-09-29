function roleCode(role) {
  if (role === "healer") return "H";
  if (role === "melee") return "M";
  if (role === "caster") return "C";
  return "?";
}

function rolePattern(units) {
  return units
    .map(unit => roleCode(unit.role))
    .sort((a, b) => {
      const order = { H: 0, M: 1, C: 2, "?": 3 };
      return order[a] - order[b];
    })
    .join("+") || "—";
}

export function buildArenaState(game, team) {
  const own = game.actors.filter(actor => actor.alive && actor.team === team);
  const enemy = game.actors.filter(actor => actor.alive && actor.team !== team);
  const ownAlive = own.length;
  const enemyAlive = enemy.length;
  const delta = ownAlive - enemyAlive;

  let mode = "EVEN";
  if (enemyAlive === 0) mode = "WON";
  else if (ownAlive === 0) mode = "LOST";
  else if (ownAlive === 1 && enemyAlive === 1) mode = "DUEL";
  else if (delta > 0 && enemyAlive === 1) mode = "CLEANUP";
  else if (delta > 0) mode = "ADVANTAGE";
  else if (delta < 0 && ownAlive === 1) mode = "LAST_STAND";
  else if (delta < 0) mode = "UNDERDOG";
  else if (ownAlive === 2) mode = "SKIRMISH_2V2";

  const ownHealer = own.find(actor => actor.role === "healer") || null;
  const enemyHealer = enemy.find(actor => actor.role === "healer") || null;
  const ownRoles = rolePattern(own);
  const enemyRoles = rolePattern(enemy);

  return {
    team,
    mode,
    label: ownAlive + "v" + enemyAlive,
    rolePattern: ownRoles + " vs " + enemyRoles,
    ownAlive,
    enemyAlive,
    delta,
    advantage: delta > 0,
    disadvantage: delta < 0,
    even: delta === 0,
    cleanup: mode === "CLEANUP",
    lastStand: mode === "LAST_STAND",
    duel: mode === "DUEL",
    ownHealerAlive: Boolean(ownHealer),
    enemyHealerAlive: Boolean(enemyHealer),
    enemyHealerOnly: enemyAlive === 1 && enemy[0]?.role === "healer",
    enemyDpsOnly: enemyAlive > 0 && enemy.every(actor => actor.role !== "healer"),
    ownDpsOnly: ownAlive > 0 && own.every(actor => actor.role !== "healer"),
    ownIds: own.map(actor => actor.id).sort(),
    enemyIds: enemy.map(actor => actor.id).sort(),
  };
}

export function arenaStateSignature(state) {
  if (!state) return "";
  return state.ownIds.join(",") + "|" + state.enemyIds.join(",");
}
