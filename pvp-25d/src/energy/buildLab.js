import {
  ABILITY_BY_ID, DISCIPLINES, FREE_ABILITIES, ROLES,
  TALENT_BUDGET, MAX_TALENT_RANK, MAX_ACTIVE_EVOLUTIONS,
  FREE_ABILITY_SLOTS, MAX_FLUX, BASE_FLUX_REGEN,
} from "./abilityCatalog.js?v=20261008-energy-build-v1";
import {
  createBuild, changeRole, equipAbility, clearAbility, adjustTalent,
  chooseEvolution, renameBuild, resetTalents, readBuildStorage, writeBuildStorage,
  allEquippedIds, spentTalentPoints, activeEvolutionCount, isReady, validateBuild,
} from "./buildState.js?v=20261008-energy-build-v1";

const $ = id => document.getElementById(id);
const state = readBuildStorage(window.localStorage);
let build = state.draft;
let selectedAbilityId = ROLES[build.role].locked[0];
let selectedFreeSlot = build.freeSlots.indexOf(null);
if (selectedFreeSlot < 0) selectedFreeSlot = null;
let disciplineFilter = "all";

const icons = { void: "◈", solar: "✦", cryo: "❄", kinetic: "ϟ", vital: "✧" };
function el(tag, className = "", content = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== "") node.textContent = String(content);
  return node;
}
function colored(element, discipline) {
  element.style.setProperty("--tone", DISCIPLINES[discipline]?.color || "#8097af");
  return element;
}
function clear(element) { element.replaceChildren(); }
function add(parent, ...children) { parent.append(...children); return parent; }
function message(value, error = false) {
  const status = $("status-message");
  status.textContent = value;
  status.classList.toggle("error", error);
}
function persist() {
  state.draft = build;
  try { writeBuildStorage(window.localStorage, state); }
  catch { message("Browser storage unavailable. Changes are only kept in this tab.", true); }
}
function mutate(action) {
  try {
    build = action();
    const errors = validateBuild(build);
    if (errors.length) throw new Error(errors.join("; "));
    persist();
    render();
  } catch (error) { message(error?.message || "Unable to update build", true); }
}
function badgeNumber(parent, value, label) {
  const wrap = el("div");
  add(wrap, el("div", "summary-number", value), el("div", "summary-label", label));
  add(parent, wrap);
}

function renderSummary() {
  const parent = $("build-summary");
  clear(parent);
  badgeNumber(parent, allEquippedIds(build).length + " / 10", "SLOTS EQUIPPED");
  badgeNumber(parent, (TALENT_BUDGET - spentTalentPoints(build)) + "", "TP AVAILABLE");
  badgeNumber(parent, activeEvolutionCount(build) + " / 2", "EVOLUTIONS");
  $("loadout-count").textContent = allEquippedIds(build).length + " / 10 EQUIPPED" + (isReady(build) ? " · COMPLETE" : " · DRAFT");
  const talents = $("talent-summary"); clear(talents);
  add(talents,
    add(el("div", "talent-box"), el("strong", "", spentTalentPoints(build) + " / " + TALENT_BUDGET), el("span", "", "TALENT POINTS SPENT")),
    add(el("div", "talent-box"), el("strong", "", activeEvolutionCount(build) + " / " + MAX_ACTIVE_EVOLUTIONS), el("span", "", "ACTIVE EVOLUTIONS"))
  );
  $("flux-passive").textContent = ROLES[build.role].passive;
}

function roleButton(role, info) {
  const button = el("button", "role-card" + (build.role === role ? " selected" : ""));
  button.type = "button"; button.style.setProperty("--tone", info.color);
  button.setAttribute("aria-pressed", String(build.role === role));
  const heading = el("div", "role-heading");
  add(heading, el("span", "role-orb"), el("span", "", info.name));
  const locked = info.locked.map(id => ABILITY_BY_ID[id].name).join(" + ");
  add(button, heading, el("p", "", info.passive), el("span", "role-locked", locked));
  button.addEventListener("click", () => {
    if (role === build.role) return;
    if ((build.freeSlots.some(Boolean) || spentTalentPoints(build) > 0)
      && !window.confirm("Changing role starts a new draft. Save the current build as a preset first if you want to keep it.")) return;
    mutate(() => changeRole(build, role));
    selectedAbilityId = ROLES[role].locked[0];
    selectedFreeSlot = 0;
    render();
    message("New " + info.name + " draft. Select a free slot to begin.");
  });
  return button;
}
function renderRoles() {
  const root = $("role-selector");
  clear(root);
  for (const [id, info] of Object.entries(ROLES)) add(root, roleButton(id, info));
}

function renderLoadout() {
  const root = $("loadout"); clear(root);
  const abilities = ROLES[build.role].locked.concat(build.freeSlots);
  abilities.forEach((id, index) => {
    const roleLocked = index < 2;
    const entry = id ? ABILITY_BY_ID[id] : null;
    const button = el("button", "slot-card" + (roleLocked ? " locked" : "") + (index >= 2 && selectedFreeSlot === index - 2 ? " active" : ""));
    button.type = "button"; button.setAttribute("aria-label",
      (roleLocked ? "Locked role slot " : "Free slot ") + (index + 1) + ": " + (entry?.name || "Empty"));
    const tone = entry ? DISCIPLINES[entry.discipline].color : "#51637a";
    button.style.setProperty("--tone", tone);
    add(button, el("span", "slot-number", String(index + 1).padStart(2, "0")));
    const glyph = el("span", "slot-glyph" + (entry ? "" : " empty"));
    add(button, glyph, el("span", "slot-name", entry?.name || "+ EQUIP"), el("span", "slot-type",
      roleLocked ? "ROLE LOCKED" : entry ? DISCIPLINES[entry.discipline].name.toUpperCase() : "FREE SLOT"));
    if (entry && build.evolutions[id]) button.title = "Evolution active";
    button.addEventListener("click", () => {
      selectedFreeSlot = roleLocked ? null : index - 2;
      selectedAbilityId = id || null;
      render();
    });
    add(root, button);
  });
}

function libraryButton(ability) {
  const alreadyIndex = build.freeSlots.indexOf(ability.id);
  const card = colored(el("button", "ability-card" + (alreadyIndex >= 0 ? " equipped" : "") + (selectedAbilityId === ability.id ? " inspect" : "")), ability.discipline);
  card.type = "button";
  const icon = el("span", "ability-icon", icons[ability.discipline]);
  const body = el("span");
  const heading = el("span", "ability-title", ability.name + (alreadyIndex >= 0 ? " · EQUIPPED" : ""));
  add(body, heading, el("span", "ability-description", ability.description),
    el("span", "ability-discipline", DISCIPLINES[ability.discipline].name + " · " + ability.category));
  add(card, icon, body);
  card.addEventListener("click", () => {
    if (alreadyIndex >= 0) {
      selectedFreeSlot = alreadyIndex; selectedAbilityId = ability.id; render(); return;
    }
    const index = selectedFreeSlot !== null ? selectedFreeSlot : build.freeSlots.indexOf(null);
    if (index < 0 || index === null) {
      selectedAbilityId = ability.id;
      render();
      message("Select a free slot to replace an ability. All eight slots are occupied.", true);
      return;
    }
    mutate(() => equipAbility(build, index, ability.id));
    selectedAbilityId = ability.id;
    const nextBlank = build.freeSlots.indexOf(null);
    selectedFreeSlot = nextBlank >= 0 ? nextBlank : null;
    render();
    message(ability.name + " equipped.");
  });
  return card;
}
function renderCatalog() {
  const root = $("catalog-grid"); clear(root);
  const filtered = FREE_ABILITIES.filter(a => disciplineFilter === "all" || a.discipline === disciplineFilter);
  filtered.forEach(a => add(root, libraryButton(a)));
  $("catalog-count").textContent = filtered.length + " / " + FREE_ABILITIES.length + " SHARED ABILITIES";
  $("selection-prompt").textContent = selectedFreeSlot === null ? "Select a free slot to replace" : "EQUIPPING FREE SLOT " + (selectedFreeSlot + 3);
  $("filter-discipline").value = disciplineFilter;
}

function renderDetails() {
  const root = $("ability-details"); clear(root);
  const ability = ABILITY_BY_ID[selectedAbilityId];
  if (!ability) {
    add(root, el("p", "detail-desc", "Select an equipped ability to view its talents, or pick a shared ability from the library."));
    return;
  }
  const onLoadout = allEquippedIds(build).includes(ability.id);
  const tone = DISCIPLINES[ability.discipline].color;
  const wrap = el("div"); wrap.style.setProperty("--tone", tone);
  const head = el("div", "detail-head");
  const icon = el("span", "ability-icon", icons[ability.discipline]);
  const nameBlock = el("div");
  add(nameBlock, el("h3", "", ability.name), el("p", "", DISCIPLINES[ability.discipline].name.toUpperCase() + " · " + ability.category.toUpperCase()));
  add(head, icon, nameBlock);
  add(wrap, head, el("p", "detail-desc", ability.description), el("p", "detail-meta", ability.details));
  if (!onLoadout) {
    add(wrap, el("p", "evolution-locked", "Equip this ability in a free slot to assign Talent Points and an Evolution."));
    add(root, wrap); return;
  }
  const rank = build.talents[ability.id] || 0;
  const talentSection = el("div", "detail-section");
  add(talentSection, el("h3", "", "TALENT INVESTMENT"));
  const rankRow = el("div", "talent-row");
  const meter = el("div", "talent-meter");
  for (let i = 0; i < MAX_TALENT_RANK; i += 1) add(meter, el("span", "talent-pip" + (i < rank ? " filled" : "")));
  const controls = el("div", "talent-controls");
  const minus = el("button", "icon-button", "−"), plus = el("button", "icon-button", "+");
  minus.type = "button"; plus.type = "button";
  minus.disabled = rank === 0;
  plus.disabled = rank >= MAX_TALENT_RANK || spentTalentPoints(build) >= TALENT_BUDGET;
  minus.setAttribute("aria-label", "Remove a talent point from " + ability.name);
  plus.setAttribute("aria-label", "Add a talent point to " + ability.name);
  minus.addEventListener("click", () => mutate(() => adjustTalent(build, ability.id, -1)));
  plus.addEventListener("click", () => mutate(() => adjustTalent(build, ability.id, 1)));
  add(controls, minus, el("strong", "", rank + " / " + MAX_TALENT_RANK), plus);
  add(rankRow, meter, controls);
  add(talentSection, rankRow, el("p", "panel-footnote", "Three points unlock Evolution selection. Maximum 12 points across the build."));
  add(wrap, talentSection);
  const evSection = el("div", "detail-section");
  add(evSection, el("h3", "", "ABILITY EVOLUTION"));
  if (rank < MAX_TALENT_RANK) {
    add(evSection, el("p", "evolution-locked", "Invest " + (MAX_TALENT_RANK - rank) + " more Talent Point(s) to unlock one of three Evolutions."));
  } else {
    if (build.evolutions[ability.id]) {
      const clearButton = el("button", "ghost-button", "REMOVE ACTIVE EVOLUTION");
      clearButton.type = "button";
      clearButton.addEventListener("click", () => mutate(() => chooseEvolution(build, ability.id, null)));
      add(evSection, clearButton);
    }
    ability.evolutions.forEach(evo => {
      const active = build.evolutions[ability.id] === evo.id;
      const option = el("button", "evolution-option" + (active ? " active" : ""));
      option.type = "button"; option.setAttribute("aria-pressed", String(active));
      option.disabled = !active && !build.evolutions[ability.id] && activeEvolutionCount(build) >= MAX_ACTIVE_EVOLUTIONS;
      add(option, el("strong", "", evo.name + (active ? " · ACTIVE" : "")), el("span", "", evo.description));
      option.addEventListener("click", () => mutate(() => chooseEvolution(build, ability.id, active ? null : evo.id)));
      add(evSection, option);
    });
    if (!build.evolutions[ability.id] && activeEvolutionCount(build) >= MAX_ACTIVE_EVOLUTIONS) {
      add(evSection, el("p", "evolution-locked", "Both Evolution slots are occupied. Remove an active Evolution before choosing another."));
    }
  }
  add(wrap, evSection);
  if (!ability.role) {
    const remove = el("button", "danger-button", "UNEQUIP FROM LOADOUT");
    remove.type = "button";
    remove.style.marginTop = "14px";
    remove.addEventListener("click", () => {
      const slot = build.freeSlots.indexOf(ability.id);
      if (slot < 0) return;
      mutate(() => clearAbility(build, slot));
      selectedAbilityId = null; selectedFreeSlot = slot;
      render(); message(ability.name + " removed. Its allocated talents have been refunded.");
    });
    add(wrap, remove);
  }
  add(root, wrap);
}

function renderSaved() {
  const root = $("saved-presets"); clear(root);
  for (let index = 0; index < state.saved.length; index += 1) {
    const saved = state.saved[index];
    const row = el("div", "preset-row");
    const info = el("span", "preset-info");
    add(info, el("strong", "", saved?.name || "EMPTY PRESET " + (index + 1)),
      el("small", "", saved ? ROLES[saved.role].name + " · " + allEquippedIds(saved).length + "/10 abilities · "
        + spentTalentPoints(saved) + " TP" : "Save your current build here"));
    add(row, info);
    if (saved) {
      const load = el("button", "ghost-button", "LOAD");
      load.type = "button"; load.setAttribute("aria-label", "Load preset " + (index + 1));
      load.addEventListener("click", () => {
        if (!window.confirm("Load preset " + (index + 1) + "? Unsaved edits to your current draft will be replaced.")) return;
        build = renameBuild(saved, saved.name);
        selectedAbilityId = ROLES[build.role].locked[0];
        const blank = build.freeSlots.indexOf(null);
        selectedFreeSlot = blank >= 0 ? blank : null;
        persist(); render(); message("Loaded preset " + (index + 1) + ": " + saved.name);
      });
      add(row, load);
    }
    add(root, row);
  }
}

function render() {
  renderSummary();
  renderRoles();
  renderLoadout();
  renderCatalog();
  renderDetails();
  renderSaved();
  if (document.activeElement !== $("build-name")) $("build-name").value = build.name;
}

$("filter-discipline").addEventListener("change", e => {
  disciplineFilter = e.target.value;
  renderCatalog();
});
$("build-name").addEventListener("input", e => {
  build = renameBuild(build, e.target.value);
  persist();
});
$("save-build").addEventListener("click", () => {
  const index = Number($("save-slot").value);
  build = renameBuild(build, $("build-name").value);
  const errors = validateBuild(build);
  if (errors.length) { message(errors.join("; "), true); return; }
  if (state.saved[index] && !window.confirm("Overwrite preset " + (index + 1) + "?")) return;
  state.saved[index] = renameBuild(build, build.name);
  persist(); render();
  message("Saved preset " + (index + 1) + ": " + build.name + (isReady(build) ? "" : " (unfinished draft)"));
});
$("new-build").addEventListener("click", () => {
  if (!window.confirm("Start a new build? Save your current draft to a preset first if you want to keep it.")) return;
  build = createBuild(build.role);
  selectedAbilityId = ROLES[build.role].locked[0];
  selectedFreeSlot = 0; persist(); render(); message("New build ready.");
});
$("reset-talents").addEventListener("click", () => {
  if (spentTalentPoints(build) === 0) return;
  if (!window.confirm("Refund all talent points and remove active Evolutions? Equipped abilities will remain.")) return;
  mutate(() => resetTalents(build));
  message("Talents reset. All 12 points are available.");
});

render();
message("Editor ready. Choose a role and equip your first shared ability.");
