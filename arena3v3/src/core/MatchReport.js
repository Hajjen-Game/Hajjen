function n(value) {
  return Math.round(value || 0);
}

export function buildMatchReport(game) {
  const result = game.resultText || (game.ended ? "ENDED" : "IN PROGRESS");
  const lines = [
    "3V3 ARENA — RUN REPORT",
    "Build: prototype-v0.3-cc",
    "Arena: " + game.arena.name,
    "Result: " + result,
    "Duration: " + game.elapsedSeconds.toFixed(1) + "s",
    "RNG: marble bags for hit / dodge / miss / crit / amount variance",
    "",
    "=== FRIENDLY TEAM ===",
  ];

  const appendTeam = team => {
    for (const actor of game.actors.filter(unit => unit.team === team)) {
      const stats = game.matchStats.get(actor.id);
      lines.push(
        actor.name
        + " [" + actor.role + "]"
        + " — HP " + n(actor.health) + "/" + actor.maxHealth
        + " | " + actor.resource.type.toUpperCase() + " " + n(actor.resource.value) + "/" + actor.resource.max
        + " | Damage " + n(stats?.damage)
        + " | Healing " + n(stats?.healing)
        + " | Taken " + n(stats?.damageTaken)
        + " | Casts " + n(stats?.casts)
        + " | Crits " + n(stats?.crits)
        + " | Misses " + n(stats?.misses)
        + " | Dodged " + n(stats?.dodges)
        + " | Interrupts " + n(stats?.interrupts)
        + " | CC " + n(stats?.ccApplied)
        + " (" + (stats?.ccSeconds || 0).toFixed(1) + "s)",
      );
    }
  };

  appendTeam("friendly");
  lines.push("", "=== ENEMY TEAM ===");
  appendTeam("enemy");

  lines.push("", "=== DEATH ORDER ===");
  if (game.deathEvents.length === 0) lines.push("None");
  else game.deathEvents.forEach(event => lines.push(event.time.toFixed(1) + "s — " + event.name));

  lines.push("", "=== COMBAT LOG ===");
  if (game.runLog.length === 0) lines.push("No combat events yet.");
  else game.runLog.forEach(entry => lines.push(entry.time.toFixed(1) + "s — " + entry.text));

  return lines.join("\n");
}
