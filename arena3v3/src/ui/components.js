export function createUnitFrame(actor, onTarget) {
  const button = document.createElement("button");
  button.className = "unit-frame " + (actor.team === "enemy" ? "enemy" : "");
  button.type = "button";
  button.innerHTML = `
    <div class="unit-frame-top">
      <div class="unit-name"></div>
      <div class="unit-role"></div>
    </div>
    <div class="frame-bar"><div class="frame-health"></div></div>
    <div class="frame-value"></div>
    <div class="frame-cast"><div></div></div>
  `;
  button.querySelector(".unit-name").textContent = actor.name;
  button.querySelector(".unit-role").textContent = actor.role;
  button.addEventListener("click", () => onTarget(actor.id));
  return button;
}

export function createActionSlot(spell, index, onCast, onRebind) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-slot";
  button.innerHTML = `
    <span class="spell-name"></span>
    <span class="spell-meta"></span>
    <span class="keycap" role="button" tabindex="0"></span>
    <span class="cooldown"></span>
  `;
  button.querySelector(".spell-name").textContent = spell.name;
  const meta = [];
  if (spell.castMs > 0) meta.push((spell.castMs / 1000).toFixed(1) + "s cast");
  else meta.push("Instant");
  if (spell.cooldownMs > 0) meta.push((spell.cooldownMs / 1000).toFixed(0) + "s CD");
  button.querySelector(".spell-meta").textContent = meta.join(" · ");

  button.addEventListener("click", event => {
    if (event.target.closest(".keycap")) return;
    onCast(index);
  });

  const keycap = button.querySelector(".keycap");
  keycap.addEventListener("click", event => { event.stopPropagation(); onRebind(index, keycap); });
  keycap.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); onRebind(index, keycap);
    }
  });
  return button;
}
