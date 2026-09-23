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

const PRIEST_ACTION_ICONS = Object.freeze({
  "priest-renew": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring" cx="32" cy="32" r="22"></circle>
      <path class="icon-line" d="M32 17 V47 M20 32 H44"></path>
      <path class="icon-line icon-soft" d="M17 21 C12 30 14 41 22 48 M47 21 C52 30 50 41 42 48"></path>
      <path class="icon-fill" d="M32 8 L35 14 L41 17 L35 20 L32 26 L29 20 L23 17 L29 14 Z"></path>
    </svg>
  `,
  "priest-flash-heal": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring icon-soft" cx="32" cy="32" r="22"></circle>
      <path class="icon-fill" d="M32 8 L38 26 L56 32 L38 38 L32 56 L26 38 L8 32 L26 26 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="5"></circle>
    </svg>
  `,
  "priest-greater-heal": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring" cx="32" cy="32" r="13"></circle>
      <circle class="icon-core" cx="32" cy="32" r="7"></circle>
      <path class="icon-fill" d="M32 4 L36 17 L44 7 L43 21 L56 14 L47 25 L61 24 L48 31 L60 38 L46 37 L54 50 L42 42 L41 57 L34 44 L28 59 L27 44 L15 53 L21 40 L7 43 L18 34 L4 29 L18 27 L8 16 L22 22 L20 8 L29 19 Z"></path>
    </svg>
  `,
  "priest-pain-suppression": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-shield" d="M32 7 L52 15 V31 C52 44 44 54 32 59 C20 54 12 44 12 31 V15 Z"></path>
      <path class="icon-line" d="M32 20 V45 M20 32 H44"></path>
      <path class="icon-ring icon-soft" d="M8 19 A28 28 0 0 1 16 9 M56 19 A28 28 0 0 0 48 9"></path>
    </svg>
  `,
  "priest-psychic-scream": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-head" cx="32" cy="28" r="8"></circle>
      <path class="icon-fill" d="M22 51 C23 41 27 36 32 36 C37 36 41 41 42 51 Z"></path>
      <path class="icon-line" d="M18 18 C11 24 11 36 18 42 M12 12 C1 22 1 42 12 52 M46 18 C53 24 53 36 46 42 M52 12 C63 22 63 42 52 52"></path>
    </svg>
  `,
});

function actionIconMarkup(spellId) {
  return PRIEST_ACTION_ICONS[spellId] || "";
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
  const iconMarkup = actionIconMarkup(spell.id);
  button.className = "action-slot" + (iconMarkup ? " has-spell-icon spell-" + spell.id : "");
  button.draggable = true;
  button.title = "Drag to rearrange this action slot";

  button.innerHTML = `
    <span class="drag-handle" aria-hidden="true">⋮⋮</span>
    ${iconMarkup ? '<span class="spell-icon" aria-hidden="true">' + iconMarkup + '</span>' : ''}
    <span class="spell-name"></span>
    <span class="spell-meta"></span>
    <span class="keycap" role="button" tabindex="0"></span>
    <span class="gcd-sweep" aria-hidden="true"></span>
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
