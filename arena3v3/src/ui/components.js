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

const ACTION_ICONS = Object.freeze({
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
  "priest-smite": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring icon-soft" cx="32" cy="32" r="20"></circle>
      <path class="icon-fill" d="M34 7 L29 26 L42 24 L24 55 L29 35 L17 38 Z"></path>
      <circle class="icon-core" cx="42" cy="17" r="4"></circle>
    </svg>
  `,
  "priest-holy-fire": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-fill" d="M34 6 C39 17 49 22 47 35 C46 48 39 57 28 57 C17 57 10 49 12 38 C14 28 23 24 24 13 C29 17 31 22 30 28 C37 23 38 15 34 6 Z"></path>
      <path class="icon-line" d="M31 31 C36 36 36 45 30 49 C24 47 22 42 24 37 C25 34 28 32 31 31 Z"></path>
    </svg>
  `,
  "warrior-rend": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M18 12 L42 36 M28 9 L49 30 M12 24 L33 45"></path>
      <path class="icon-secondary" d="M42 37 C48 40 52 46 50 53 C43 54 37 50 34 44 Z"></path>
    </svg>
  `,
  "warrior-mortal-strike": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M17 49 L47 15 M14 16 L48 50"></path>
      <path class="icon-secondary" d="M44 11 L54 10 L51 20 Z M10 12 L20 14 L13 22 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="5"></circle>
    </svg>
  `,
  "warrior-slam": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M25 9 H39 L43 27 L36 34 H28 L21 27 Z"></path>
      <path class="icon-line" d="M32 34 V48 M21 49 H43"></path>
      <path class="icon-line icon-soft" d="M13 42 L20 37 M51 42 L44 37 M17 54 L24 49 M47 54 L40 49"></path>
    </svg>
  `,
  "warrior-charge": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M37 10 L55 32 L37 54 V42 H22 V22 H37 Z"></path>
      <path class="icon-line icon-soft" d="M10 20 H24 M7 32 H22 M10 44 H24"></path>
    </svg>
  `,
  "warrior-pummel": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M18 28 L22 15 L29 13 L32 19 L36 12 L43 14 L45 22 L51 24 L49 36 L42 46 L29 51 L18 44 Z"></path>
      <path class="icon-line" d="M22 29 H43 M28 22 L29 31 M36 19 L36 31 M43 23 L42 32"></path>
    </svg>
  `,
  "warrior-overpower": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M13 49 L48 14 M17 14 L50 47"></path>
      <path class="icon-secondary" d="M39 10 L55 9 L51 25 Z M9 39 L25 53 L9 55 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="6"></circle>
    </svg>
  `,
  "warrior-bloodthirst": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M32 6 C41 18 50 27 48 39 C47 51 40 58 31 58 C21 58 14 50 16 40 C18 30 27 24 32 6 Z"></path>
      <path class="icon-line" d="M21 37 C27 31 35 31 43 36 M25 45 C30 49 36 49 40 44"></path>
      <path class="icon-line icon-soft" d="M12 20 L21 25 M52 19 L43 25"></path>
    </svg>
  `,
  "rogue-garrote": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M13 44 C24 27 38 18 53 15 M14 50 C28 36 39 28 53 24"></path>
      <path class="icon-secondary" d="M10 39 L18 47 L12 55 L5 47 Z"></path>
    </svg>
  `,
  "rogue-sinister": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M13 48 C22 26 36 15 52 11 C47 29 36 43 17 53"></path>
      <path class="icon-secondary" d="M44 10 L56 8 L53 20 Z"></path>
    </svg>
  `,
  "rogue-eviscerate": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M12 19 L48 51 M17 49 L52 15 M10 34 H54"></path>
      <circle class="icon-core" cx="32" cy="32" r="5"></circle>
    </svg>
  `,
  "rogue-kidney": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M32 7 L38 23 L55 18 L46 32 L58 44 L41 41 L34 57 L28 41 L11 47 L19 32 L7 21 L24 24 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="6"></circle>
    </svg>
  `,
  "rogue-kick": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M18 11 H31 L35 30 L51 38 L47 52 L29 44 L21 29 Z"></path>
      <path class="icon-line" d="M31 30 L21 45 M35 31 L26 50"></path>
    </svg>
  `,
  "rogue-mutilate": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M14 52 L48 14 M16 13 L50 49"></path>
      <path class="icon-secondary" d="M44 9 L56 8 L52 20 Z M8 8 L20 11 L12 22 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="4"></circle>
    </svg>
  `,
  "rogue-shadowstep": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line icon-soft" d="M8 20 H29 M5 32 H24 M10 44 H30"></path>
      <path class="icon-secondary" d="M34 10 L56 32 L34 54 V41 H22 V23 H34 Z"></path>
    </svg>
  `,

});

function actionIconMarkup(spellId) {
  return ACTION_ICONS[spellId] || "";
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
    <div class="frame-dr"></div>
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

export function createEmptyActionSlot(index, onRebind) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-slot empty-action-slot";
  button.draggable = false;
  button.title = "Empty action slot · talent-unlocked abilities can appear here";

  button.innerHTML = `
    <span class="spell-name">EMPTY</span>
    <span class="spell-meta">Available for unlocked abilities</span>
    <span class="keycap" role="button" tabindex="0"></span>
  `;

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
