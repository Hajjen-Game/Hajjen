function seconds(ms) {
  return (ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1) + "s";
}

function effectSummary(effect) {
  switch (effect.kind) {
    case "heal":
      return "Heal " + effect.amount;
    case "hot":
      return "HoT " + effect.amount + " / " + seconds(effect.tickMs) + " · " + seconds(effect.durationMs);
    case "damage":
      return "Damage " + effect.amount;
    case "chainDamage":
      return "Chain damage " + effect.amount + " · up to " + (effect.maxTargets || 3);
    case "dot":
      return "DoT " + effect.amount + " / " + seconds(effect.tickMs) + " · " + seconds(effect.durationMs);
    case "damageReduction":
      return Math.round((effect.value || 0) * 100) + "% less damage · " + seconds(effect.durationMs);
    case "healingReduction":
      return Math.round((effect.value || 0) * 100) + "% healing reduction · " + seconds(effect.durationMs);
    case "fear":
      return "Fear · " + seconds(effect.durationMs);
    case "fearAoE":
      return "AoE Fear · " + seconds(effect.durationMs);
    case "incapacitate":
      return "Incapacitate · " + seconds(effect.durationMs);
    case "stun":
      return "Stun · " + seconds(effect.durationMs);
    case "root":
      return "Root · " + seconds(effect.durationMs);
    case "rootAoE":
      return "AoE Root · " + seconds(effect.durationMs);
    case "interrupt":
      return "Interrupt · lock " + seconds(effect.lockMs || effect.durationMs || 0);
    case "gapClose":
      return "Gap closer";
    default:
      return "";
  }
}

function spellEffectSummary(spell) {
  return (spell.effects || [])
    .map(effectSummary)
    .filter(Boolean)
    .join(" + ");
}

export function createUnitFrame(actor, onTarget, partyKey = "") {
  const button = document.createElement("button");
  button.className = "unit-frame " + (actor.team === "enemy" ? "enemy" : "");
  button.type = "button";

  button.innerHTML = `
    <div class="frame-state-banner" hidden></div>
    <div class="unit-frame-top">
      <div class="unit-name"></div>
      <div class="unit-role-wrap">
        <span class="party-key"></span>
        <span class="unit-role"></span>
      </div>
    </div>
    <div class="frame-bar"><div class="frame-health"></div></div>
    <div class="frame-value"></div>
    <div class="frame-resource"><div class="frame-resource-fill"></div></div>
    <div class="frame-effects"></div>
    <div class="frame-cast"><div></div></div>
  `;

  button.querySelector(".unit-name").textContent = actor.name;
  button.querySelector(".unit-role").textContent =
    actor.control === "player"
      ? actor.className + " · " + actor.role
      : actor.role;

  const partyKeyElement = button.querySelector(".party-key");
  partyKeyElement.textContent = partyKey;
  partyKeyElement.hidden = !partyKey;

  button.addEventListener("click", () => onTarget(actor.id));
  return button;
}

export function createActionSlot(spell, index, onCast, onRebind) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-slot";
  button.draggable = true;
  button.title = "Drag to rearrange this action slot";

  button.innerHTML = `
    <span class="drag-handle" aria-hidden="true">⋮⋮</span>
    <span class="spell-name"></span>
    <span class="spell-meta"></span>
    <span class="keycap" role="button" tabindex="0"></span>
    <span class="cooldown"></span>
  `;

  button.querySelector(".spell-name").textContent = spell.name;

  const meta = [];
  meta.push(spell.castMs > 0 ? (spell.castMs / 1000).toFixed(1) + "s cast" : "Instant");
  if (spell.cooldownMs > 0) meta.push((spell.cooldownMs / 1000).toFixed(0) + "s CD");
  if (spell.resourceCost > 0) meta.push(spell.resourceCost + " resource");

  const effect = spellEffectSummary(spell);
  if (effect) meta.push(effect);

  button.querySelector(".spell-meta").textContent = meta.join(" · ");

  button.addEventListener("click", event => {
    if (event.target.closest(".keycap")) return;
    onCast(index);
  });

  const keycap = button.querySelector(".keycap");
  keycap.addEventListener("click", event => {
    event.stopPropagation();
    onRebind(index, keycap);
  });

  keycap.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRebind(index, keycap);
    }
  });

  return button;
}
