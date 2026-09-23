function n(value) {
  return Math.round(value || 0);
}

export function buildMatchReport(game) {
  const result = game.resultText || (game.ended ? "ENDED" : "IN PROGRESS");
  const lines = [
    "3V3 ARENA — RUN REPORT",
    "Build: prototype-v0.36-combat-hud-layout",
    "Arena: " + game.arena.name,
    "Character: " + (game.activeCharacterName || game.player?.name || "Player")
      + " [" + (game.player?.className || "Healer") + "]",
    "Result: " + result,
    "Duration: " + game.elapsedSeconds.toFixed(1) + "s",
    "Input queue: 400ms ability queue window",
    "RNG: marble bags for hit / dodge / miss / crit / amount variance",
    "Caster splash: chain spell can hit up to 3 enemies when each is in range + LOS",
    "Dampening: " + game.dampening.percent + "% final | starts 10% at 45s | +2% every 10s",
    "Team AI: preserves breakable friendly CC and peels melee pressure from vulnerable healer/caster allies",
    "Caster survival: casters kite active melee tunnel pressure; Mage/Shaman receive a light survivability tune",
    "Healer-aware kiting: threatened/low casters try to remain in healing range + LOS of their healer",
    "Combat readability: raised CC markers, red enemy names, WoW class-color HP bars and pulsing red sub-20% health",
    "Caster healer safety: low/pressured casters will not start or finish offensive casts while outside healer range/LOS",
    "Movement polish: AI slides around pillar corners, never bypasses anti-stuck on blocked steering, flips route side under sustained obstruction and recovers rare collider overlaps",
    "Action bar: spell cards now show their actual combat effect, including defensive reduction and CC duration",
    "Spell VFX: lightweight procedural class/spell effects add projectiles, melee arcs, healing halos, defensive shields and control swirls",
    "Player control alerts: every implemented hard CC/root plus interrupt school lock shows a large center icon + countdown",
    "Matchmaking: enemy healer/melee/caster setup is randomized for every new match",
    "Honor progression: victory awards 200 Honor, defeat awards 70 Honor; persistent Classic-inspired ranks 1-14 award one future Talent Point per rank gained",
    "Honor menu: top-bar HONOR button opens full rank, record, progress, rewards and 14-rank ladder view",
    "Pre-match draft: random enemy composition is revealed before combat, then the player chooses their melee/caster teammates and explicitly starts the match",
    "Character select: persistent WoW-style healer characters have their own name, fixed healer class, Honor/Rank record and future Talent Points",
    "Mouse steering: hold left + right mouse buttons together to continuously move toward the cursor; either button alone does not trigger movement and instant abilities remain usable while moving",
    "Playable DPS: Warrior and Mage can now be created and controlled as the player; match setup automatically fills the missing role choices for the selected player class",
    "Responsive arena layout: unused horizontal letterbox space beside the 16:9 arena is reassigned to wider friendly/enemy team panels",
    "Action bar customization: spells can be drag-reordered per character; keybinds now belong to Slot 1-5 instead of fixed spell positions and persist independently",
    "Role-based Tab targeting: Tab selects the nearest living enemy for DPS characters and the nearest living teammate for healer characters",
    "Range feedback: action-bar abilities dim in real time when the currently selected valid target is outside that ability's range",
    "Combat HUD layout: cast/resource bars moved into a larger centered arena overlay, action slots are taller, and persistent control hints moved into a dedicated HELP menu",
    "",
    "=== FRIENDLY TEAM ===",
  ];

  const appendTeam = team => {
    for (const actor of game.actors.filter(unit => unit.team === team)) {
      const stats = game.matchStats.get(actor.id);
      lines.push(
        actor.name
        + " [" + actor.className + " / " + actor.role + "]"
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

  lines.push("", "=== AI MOVEMENT DIAGNOSTICS ===");
  const movementDiagnostics = game.actors
    .filter(actor => actor.control !== "player")
    .map(actor => ({
      name: actor.name,
      reroutes: actor.aiPathReroutes || 0,
      overlapRecoveries: actor.aiOverlapRecoveries || 0,
    }))
    .filter(item => item.reroutes > 0 || item.overlapRecoveries > 0);

  if (movementDiagnostics.length === 0) {
    lines.push("No path recovery events recorded.");
  } else {
    movementDiagnostics.forEach(item => {
      lines.push(
        item.name
        + " — route flips " + item.reroutes
        + " | collider recoveries " + item.overlapRecoveries
      );
    });
  }

  lines.push("", "=== RESET / RELOAD DIAGNOSTICS ===");
  if (!game.resetDiagnostics || game.resetDiagnostics.length === 0) {
    lines.push("None detected in this browser tab.");
  } else {
    game.resetDiagnostics.forEach(event => {
      const at = Number(event.previousElapsedSeconds || 0).toFixed(1);
      lines.push(
        event.kind.toUpperCase()
        + " — previous match " + at + "s"
        + " — " + event.reason
        + (event.recordedAt ? " — " + event.recordedAt : "")
      );
    });
  }

  lines.push("", "=== DEATH ORDER ===");
  if (game.deathEvents.length === 0) lines.push("None");
  else game.deathEvents.forEach(event => lines.push(event.time.toFixed(1) + "s — " + event.name));

  lines.push("", "=== COMBAT LOG ===");
  if (game.runLog.length === 0) lines.push("No combat events yet.");
  else game.runLog.forEach(entry => lines.push(entry.time.toFixed(1) + "s — " + entry.text));

  return lines.join("\n");
}
