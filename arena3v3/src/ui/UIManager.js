import { BINDING_LABELS } from "../core/constants.js";
import { clamp, formatTime } from "../core/utils.js";
import { createActionSlot, createEmptyActionSlot, createUnitFrame } from "./components.js";
import { classColorFor } from "../content/classes/classColors.js";
import { HONOR_RANKS } from "../core/HonorSystem.js";

const ACTION_BAR_STORAGE_PREFIX = "arena3v3-actionbar-v1:";
const ACTION_BAR_SLOT_COUNT = 7;
const ENEMY_CC_KINDS = new Set([
  "fearAoE",
  "fear",
  "incapacitate",
  "stun",
  "root",
  "rootAoE",
]);

function enemyCooldownCategory(spell) {
  if (!spell || spell.cooldownMs <= 0) return null;
  if (spell.offensiveCooldown) return "burst";
  if ((spell.effects || []).some(effect => ENEMY_CC_KINDS.has(effect.kind))) return "cc";
  return null;
}

function cooldownTimerLabel(remainingMs) {
  if (remainingMs <= 0) return "READY";
  const seconds = remainingMs / 1000;
  return seconds >= 10 ? Math.ceil(seconds) + "s" : seconds.toFixed(1) + "s";
}

export class UIManager {
  constructor(game, input) {
    this.game = game;
    this.input = input;
    this.frameElements = new Map();
    this.meterElements = new Map();
    this.enemyCooldownRows = new Map();
    this.actionSlots = [];
    this.loadoutSlots = [];
    this.actionSlotSpellIds = [];
    this.draggedActionSlot = null;
    this.suppressActionClickUntil = 0;
    this.logLines = [];
    this.toastTimer = null;

    this.teamFrames = document.querySelector("#team-frames");
    this.enemyFrames = document.querySelector("#enemy-frames");
    this.enemyCooldowns = document.querySelector("#enemy-cooldowns");
    this.enemyCooldownWidget = document.querySelector("#enemy-cooldown-widget");
    this.damageMeter = document.querySelector("#damage-meter");
    this.actionBar = document.querySelector("#action-bar");
    this.loadoutModal = document.querySelector("#loadout-modal");
    this.loadoutActionBar = document.querySelector("#loadout-action-bar");
    this.matchClock = document.querySelector("#match-clock");
    this.dampeningIndicator = document.querySelector("#dampening-indicator");
    this.dampeningValue = document.querySelector("#dampening-value");
    this.dampeningNext = document.querySelector("#dampening-next");
    this.combatLog = document.querySelector("#combat-log");
    this.toastElement = document.querySelector("#toast");
    this.result = document.querySelector("#match-result");
    this.resultTitle = document.querySelector("#match-result-title");
    this.resultHonor = document.querySelector("#match-result-honor");
    this.resultRankUp = document.querySelector("#match-result-rank-up");
    this.deathForfeit = document.querySelector("#death-forfeit");
    this.deathKeepWatching = document.querySelector("#death-keep-watching");
    this.deathForfeitButton = document.querySelector("#death-forfeit-button");

    this.honorRank = document.querySelector("#honor-rank");
    this.honorTotal = document.querySelector("#honor-total");
    this.honorProgressFill = document.querySelector("#honor-progress-fill");
    this.honorProgressText = document.querySelector("#honor-progress-text");
    this.honorTalentPoints = document.querySelector("#honor-talent-points");

    this.honorModal = document.querySelector("#honor-modal");
    this.honorModalRank = document.querySelector("#honor-modal-rank");
    this.honorModalTotal = document.querySelector("#honor-modal-total");
    this.honorModalRecord = document.querySelector("#honor-modal-record");
    this.honorModalTp = document.querySelector("#honor-modal-tp");
    this.honorModalProgressText = document.querySelector("#honor-modal-progress-text");
    this.honorModalProgressFill = document.querySelector("#honor-modal-progress-fill");
    this.honorModalNext = document.querySelector("#honor-modal-next");
    this.honorRankList = document.querySelector("#honor-rank-list");

    this.talentModal = document.querySelector("#talent-modal");
    this.talentClass = document.querySelector("#talent-class");
    this.talentAvailable = document.querySelector("#talent-available");
    this.talentSpent = document.querySelector("#talent-spent");
    this.talentTree = document.querySelector("#talent-tree");
    this.talentEmpty = document.querySelector("#talent-empty");

    this.playerCast = document.querySelector("#player-cast");
    this.playerCastLabel = document.querySelector("#player-cast-label");
    this.playerCastFill = document.querySelector("#player-cast-fill");

    this.playerCcAlert = document.querySelector("#player-cc-alert");
    this.playerCcTitle = document.querySelector("#player-cc-title");
    this.playerCcTime = document.querySelector("#player-cc-time");
    this.playerCcSource = document.querySelector("#player-cc-source");

    this.controlsModal = document.querySelector("#controls-modal");
    this.bindingList = document.querySelector("#binding-list");

    this.deathKeepWatching.addEventListener("click", () => this.hideDeathForfeit());
    this.deathForfeitButton.addEventListener("click", () => this.game.forfeitMatch());
    document.querySelector("#result-restart-button").addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("arena3v3:request-match-setup"));
    });
    document.querySelector("#honor-button").addEventListener("click", () => this.openHonor());
    document.querySelector("#honor-close").addEventListener("click", () => this.closeHonor());
    document.querySelector("#talents-button").addEventListener("click", () => this.openTalents());
    document.querySelector("#talent-close").addEventListener("click", () => this.closeTalents());
    document.querySelector("#talent-reset").addEventListener("click", () => this.resetTalents());
    document.querySelector("#loadout-close").addEventListener("click", () => this.closeLoadout());
    document.querySelector("#loadout-done").addEventListener("click", () => this.closeLoadout());
    document.querySelector("#controls-button").addEventListener("click", () => this.openControls());
    document.querySelector("#controls-close").addEventListener("click", () => this.closeControls());
    document.querySelector("#help-button").addEventListener("click", () => this.openHelp());
    document.querySelector("#help-close").addEventListener("click", () => this.closeHelp());

    document.querySelector("#reset-bindings").addEventListener("click", () => {
      this.input.reset();
      this.renderBindings();
      this.refreshActionKeycaps();
      this.refreshLoadoutKeycaps();
      this.refreshPartyKeycaps();
    });

    document.querySelector("#reset-actionbar").addEventListener("click", () => {
      this.resetActionBarLayout();
      this.toast("Action bar reset");
    });

    document.querySelector("#copy-report-button").addEventListener("click", () => this.copyRunReport());

    this.buildFrames();
    this.buildDamageMeter();
    this.buildActionBar();
    this.renderBindings();
  }

  buildFrames() {
    this.teamFrames.innerHTML = "";
    this.enemyFrames.innerHTML = "";
    this.frameElements.clear();

    const friendly = this.game.actors.filter(actor => actor.team === "friendly");

    for (const actor of this.game.actors) {
      const partyIndex = friendly.indexOf(actor);
      const partyKey = partyIndex >= 0 ? this.input.label("party" + (partyIndex + 1)) : "";
      const frame = createUnitFrame(actor, id => this.game.selectTarget(id), partyKey);

      (actor.team === "friendly" ? this.teamFrames : this.enemyFrames).appendChild(frame);
      this.frameElements.set(actor.id, frame);
    }

    this.buildEnemyCooldowns();
  }

  buildEnemyCooldowns() {
    this.enemyCooldowns.innerHTML = "";
    this.enemyCooldownRows.clear();

    const enemies = this.game.actors.filter(actor => actor.team === "enemy");

    for (const actor of enemies) {
      const trackedSpells = actor.spells
        .map(spell => ({ spell, category: enemyCooldownCategory(spell) }))
        .filter(item => item.category);

      if (trackedSpells.length === 0) continue;

      const group = document.createElement("div");
      group.className = "enemy-cooldown-group";
      group.hidden = true;

      const heading = document.createElement("div");
      heading.className = "enemy-cooldown-class";
      heading.textContent = actor.className || actor.name;
      heading.style.setProperty("--cooldown-class", classColorFor(actor));
      group.appendChild(heading);

      for (const { spell, category } of trackedSpells) {
        const row = document.createElement("div");
        row.className = "enemy-cooldown-row " + category;
        row.hidden = true;
        row.dataset.actorId = actor.id;
        row.dataset.spellId = spell.id;
        row.innerHTML = `
          <div class="enemy-cooldown-head">
            <span class="enemy-cooldown-type"></span>
            <span class="enemy-cooldown-name"></span>
            <span class="enemy-cooldown-time">READY</span>
          </div>
          <div class="enemy-cooldown-track">
            <div class="enemy-cooldown-fill"></div>
          </div>
        `;

        row.querySelector(".enemy-cooldown-type").textContent =
          category === "burst" ? "BURST" : "CC";
        row.querySelector(".enemy-cooldown-name").textContent = spell.name;
        row.querySelector(".enemy-cooldown-fill").style.width = "100%";

        group.appendChild(row);
        this.enemyCooldownRows.set(actor.id + ":" + spell.id, {
          row,
          actorId: actor.id,
          spellId: spell.id,
          cooldownMs: spell.cooldownMs,
          group,
        });
      }

      this.enemyCooldowns.appendChild(group);
    }
  }

  updateEnemyCooldowns() {
    const activeGroups = new Set();
    let activeCount = 0;

    for (const entry of this.enemyCooldownRows.values()) {
      const actor = this.game.getActor(entry.actorId);
      const row = entry.row;
      if (!actor) continue;

      const remaining = actor.cooldownFor(entry.spellId);
      const active = actor.alive && remaining > 0;

      row.hidden = !active;
      row.classList.toggle("cooling", active);
      row.classList.remove("ready", "dead");

      if (!active) continue;

      activeCount += 1;
      activeGroups.add(entry.group);

      const remainingFraction = entry.cooldownMs > 0
        ? clamp(remaining / entry.cooldownMs, 0, 1)
        : 0;

      row.querySelector(".enemy-cooldown-time").textContent =
        cooldownTimerLabel(remaining);
      row.querySelector(".enemy-cooldown-fill").style.width =
        (remainingFraction * 100).toFixed(1) + "%";
    }

    for (const group of this.enemyCooldowns.querySelectorAll(".enemy-cooldown-group")) {
      group.hidden = !activeGroups.has(group);
    }

    this.enemyCooldownWidget.hidden = activeCount === 0;
  }

  refreshPartyKeycaps() {
    const friendly = this.game.actors.filter(actor => actor.team === "friendly");

    friendly.forEach((actor, index) => {
      const frame = this.frameElements.get(actor.id);
      if (!frame) return;

      const key = frame.querySelector(".party-key");
      key.textContent = this.input.label("party" + (index + 1));
      key.hidden = false;
    });
  }

  buildDamageMeter() {
    this.damageMeter.innerHTML = "";
    this.meterElements.clear();

    for (const team of ["friendly", "enemy"]) {
      const heading = document.createElement("div");
      heading.className = "meter-team-heading " + team;
      heading.textContent = team === "friendly" ? "YOUR TEAM" : "ENEMY TEAM";
      this.damageMeter.appendChild(heading);

      for (const actor of this.game.actors.filter(unit => unit.team === team)) {
        const row = document.createElement("div");
        row.className = "meter-row";
        row.innerHTML = `
          <span class="meter-name"></span>
          <span class="meter-value">0</span>
          <div class="meter-track"><div class="meter-fill"></div></div>
        `;

        row.querySelector(".meter-name").textContent = actor.name;
        row.querySelector(".meter-fill").classList.toggle("enemy", team === "enemy");
        this.damageMeter.appendChild(row);
        this.meterElements.set(actor.id, row);
      }
    }
  }

  actionBarStorageKey() {
    const owner = this.game.activeCharacterId
      || ("class-" + (this.game.player?.classId || "default"));
    return ACTION_BAR_STORAGE_PREFIX + owner;
  }

  defaultActionBarSpellIds() {
    return this.game.player.spells.map(spell => spell.id).slice(0, ACTION_BAR_SLOT_COUNT);
  }

  defaultActionBarLayout() {
    const layout = Array(ACTION_BAR_SLOT_COUNT).fill(null);
    this.defaultActionBarSpellIds().forEach((spellId, index) => {
      layout[index] = spellId;
    });
    return layout;
  }

  loadActionBarLayout() {
    const defaults = this.defaultActionBarSpellIds();

    try {
      const stored = JSON.parse(localStorage.getItem(this.actionBarStorageKey()) || "null");
      if (!Array.isArray(stored)) return this.defaultActionBarLayout();

      const layout = Array(ACTION_BAR_SLOT_COUNT).fill(null);
      const used = new Set();

      for (let index = 0; index < Math.min(stored.length, ACTION_BAR_SLOT_COUNT); index += 1) {
        const spellId = stored[index];
        if (!spellId || !defaults.includes(spellId) || used.has(spellId)) continue;
        layout[index] = spellId;
        used.add(spellId);
      }

      for (const spellId of defaults) {
        if (used.has(spellId)) continue;
        const emptyIndex = layout.indexOf(null);
        if (emptyIndex < 0) break;
        layout[emptyIndex] = spellId;
        used.add(spellId);
      }

      return layout;
    } catch {
      return this.defaultActionBarLayout();
    }
  }

  saveActionBarLayout() {
    try {
      localStorage.setItem(
        this.actionBarStorageKey(),
        JSON.stringify(this.actionSlotSpellIds),
      );
    } catch {
      // Action-bar customization should never block gameplay.
    }
  }

  resetActionBarLayout() {
    this.actionSlotSpellIds = this.defaultActionBarLayout();

    try {
      localStorage.removeItem(this.actionBarStorageKey());
    } catch {
      // Ignore storage failures and still rebuild the current bar.
    }

    this.buildActionBar();
    this.buildLoadoutBar();
  }

  spellIndexForActionSlot(slotIndex) {
    const spellId = this.actionSlotSpellIds[slotIndex];
    return this.game.player.spells.findIndex(spell => spell.id === spellId);
  }

  castActionSlot(slotIndex) {
    if (performance.now() <= this.suppressActionClickUntil) return false;

    const spellIndex = this.spellIndexForActionSlot(slotIndex);
    if (spellIndex < 0) return false;
    return this.game.castPlayerSpell(spellIndex);
  }

  moveActionSlot(fromIndex, toIndex) {
    if (
      fromIndex === toIndex
      || fromIndex < 0
      || toIndex < 0
      || fromIndex >= this.actionSlotSpellIds.length
      || toIndex >= this.actionSlotSpellIds.length
    ) return;

    const next = [...this.actionSlotSpellIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    this.actionSlotSpellIds = next;
    this.saveActionBarLayout();
    this.buildActionBar();
    this.buildLoadoutBar();
  }

  wireActionSlotDrag(slot, slotIndex, hasSpell = true) {
    slot.dataset.slotIndex = String(slotIndex);
    slot.draggable = hasSpell;

    slot.addEventListener("dragstart", event => {
      if (!hasSpell) {
        event.preventDefault();
        return;
      }
      this.draggedActionSlot = slotIndex;
      slot.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(slotIndex));
    });

    slot.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("drag-over");
    });

    slot.addEventListener("drop", event => {
      event.preventDefault();
      slot.classList.remove("drag-over");

      const fromIndex = Number.parseInt(
        event.dataTransfer.getData("text/plain"),
        10,
      );

      if (Number.isInteger(fromIndex)) {
        this.moveActionSlot(fromIndex, slotIndex);
      }
    });

    slot.addEventListener("dragend", () => {
      this.suppressActionClickUntil = performance.now() + 180;
      this.draggedActionSlot = null;

      for (const actionSlot of this.actionSlots) {
        actionSlot.classList.remove("dragging", "drag-over");
      }
    });
  }

  buildActionBar() {
    this.actionBar.innerHTML = "";
    this.actionSlotSpellIds = this.loadActionBarLayout();

    this.actionSlots = this.actionSlotSpellIds.map((spellId, slotIndex) => {
      const spell = spellId
        ? this.game.player.spells.find(item => item.id === spellId)
        : null;

      const slot = spell
        ? createActionSlot(
          spell,
          slotIndex,
          index => this.castActionSlot(index),
          index => this.captureBinding("slot" + (index + 1)),
        )
        : createEmptyActionSlot(
          slotIndex,
          index => this.captureBinding("slot" + (index + 1)),
        );

      this.wireActionSlotDrag(slot, slotIndex, Boolean(spell));
      this.actionBar.appendChild(slot);
      return slot;
    });

    this.refreshActionKeycaps();
  }

  buildLoadoutBar() {
    if (!this.loadoutActionBar) return;

    this.loadoutActionBar.innerHTML = "";
    this.actionSlotSpellIds = this.loadActionBarLayout();

    this.loadoutSlots = this.actionSlotSpellIds.map((spellId, slotIndex) => {
      const spell = spellId
        ? this.game.player.spells.find(item => item.id === spellId)
        : null;

      const slot = spell
        ? createActionSlot(
          spell,
          slotIndex,
          () => {},
          index => this.captureBinding("slot" + (index + 1)),
        )
        : createEmptyActionSlot(
          slotIndex,
          index => this.captureBinding("slot" + (index + 1)),
        );

      slot.classList.add("loadout-action-slot");
      this.wireLoadoutSlotDrag(slot, slotIndex, Boolean(spell));

      const shell = document.createElement("div");
      shell.className = "loadout-slot-shell";

      const label = document.createElement("div");
      label.className = "loadout-slot-label";
      label.textContent = "SLOT " + (slotIndex + 1);

      shell.append(label, slot);
      this.loadoutActionBar.appendChild(shell);
      return slot;
    });

    this.refreshLoadoutKeycaps();
  }

  wireLoadoutSlotDrag(slot, slotIndex, hasSpell = true) {
    slot.dataset.slotIndex = String(slotIndex);
    slot.draggable = hasSpell;

    slot.addEventListener("dragstart", event => {
      if (!hasSpell) {
        event.preventDefault();
        return;
      }

      slot.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(slotIndex));
    });

    slot.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("drag-over");
    });

    slot.addEventListener("drop", event => {
      event.preventDefault();
      slot.classList.remove("drag-over");

      const fromIndex = Number.parseInt(
        event.dataTransfer.getData("text/plain"),
        10,
      );

      if (Number.isInteger(fromIndex)) {
        this.moveActionSlot(fromIndex, slotIndex);
      }
    });

    slot.addEventListener("dragend", () => {
      for (const loadoutSlot of this.loadoutSlots) {
        loadoutSlot.classList.remove("dragging", "drag-over");
      }
    });
  }

  refreshLoadoutKeycaps() {
    this.loadoutSlots.forEach((slot, index) => {
      const keycap = slot.querySelector(".keycap");
      if (keycap) keycap.textContent = this.input.label("slot" + (index + 1));
    });
  }

  openLoadout() {
    this.buildLoadoutBar();
    this.loadoutModal?.classList.remove("hidden");
  }

  closeLoadout() {
    this.loadoutModal?.classList.add("hidden");
  }

  refreshActionKeycaps() {
    this.actionSlots.forEach((slot, index) => {
      const keycap = slot.querySelector(".keycap");
      if (keycap) keycap.textContent = this.input.label("slot" + (index + 1));
    });
  }

  captureBinding(action) {
    const keyButton = [...document.querySelectorAll(".binding-key")]
      .find(button => button.dataset.action === action);

    if (keyButton) keyButton.classList.add("capturing");
    this.toast("Press a key for " + BINDING_LABELS[action] + " · Esc cancels");

    this.input.captureNext(action, () => {
      this.renderBindings();
      this.refreshActionKeycaps();
      this.refreshLoadoutKeycaps();
      this.refreshPartyKeycaps();
    });
  }


  openTalents() {
    this.renderTalentTree();
    this.talentModal.classList.remove("hidden");
  }

  closeTalents() {
    this.talentModal.classList.add("hidden");
  }

  learnTalent(talentId) {
    const result = this.game.spendTalent(talentId);

    if (!result.ok) {
      this.toast(result.reason);
      return;
    }

    this.renderTalentTree();
    this.updateHonorStatus();
    window.dispatchEvent(new CustomEvent("arena3v3:talents-updated"));
    this.toast(this.game.waitingForStart
      ? "Talent learned · pre-match loadout updated"
      : "Talent learned · applies next match");
  }

  resetTalents() {
    const status = this.game.talentStatus();
    if (status.spentPoints <= 0) {
      this.toast("No talents to reset");
      return;
    }

    this.game.resetTalents();
    this.renderTalentTree();
    this.updateHonorStatus();
    window.dispatchEvent(new CustomEvent("arena3v3:talents-updated"));
    this.toast(this.game.waitingForStart
      ? "Talents reset · pre-match loadout updated"
      : "Talents reset · applies next match");
  }

  renderTalentTree() {
    const status = this.game.talentStatus();
    const tree = status.tree;

    this.talentAvailable.textContent = status.availablePoints + " TP";
    this.talentSpent.textContent = status.spentPoints + " / " + status.earnedPoints;
    this.talentTree.innerHTML = "";

    const pointNote = document.querySelector("#talent-point-note");
    if (status.availablePoints > 0) {
      pointNote.textContent =
        status.availablePoints + " Talent Point" + (status.availablePoints === 1 ? "" : "s")
        + " available. Click a highlighted talent or its +1 button.";
    } else if (status.earnedPoints === 0) {
      pointNote.textContent = "Reach Rank 2 to earn your first Talent Point.";
    } else {
      pointNote.textContent = "All earned Talent Points are currently spent. Reset to rebuild.";
    }

    if (!tree) {
      this.talentClass.textContent = this.game.player?.className || "—";
      this.talentEmpty.hidden = false;
      this.talentEmpty.textContent =
        "This class uses the shared Talent system, but its two branches have not been built yet.";
      this.talentTree.hidden = true;
      document.querySelector("#talent-reset").hidden = true;
      return;
    }

    this.talentClass.textContent = tree.displayName;
    this.talentEmpty.hidden = true;
    this.talentTree.hidden = false;
    document.querySelector("#talent-reset").hidden = false;

    for (const branch of tree.branches) {
      const branchElement = document.createElement("section");
      branchElement.className = "talent-branch";
      branchElement.style.setProperty("--branch-accent", branch.accent || "#d9b977");

      const branchHeader = document.createElement("div");
      branchHeader.className = "talent-branch-header";
      branchHeader.innerHTML =
        '<div><strong class="talent-branch-name"></strong><span class="talent-branch-subtitle"></span></div>'
        + '<span class="talent-branch-points"></span>';
      branchHeader.querySelector(".talent-branch-name").textContent = branch.name;
      branchHeader.querySelector(".talent-branch-subtitle").textContent = branch.subtitle;
      branchHeader.querySelector(".talent-branch-points").textContent =
        (status.branchPoints[branch.id] || 0) + " PTS";
      branchElement.appendChild(branchHeader);

      const grid = document.createElement("div");
      grid.className = "talent-branch-grid";

      for (const talent of branch.talents) {
        const rank = status.allocations[talent.id] || 0;
        const check = this.game.canSpendTalent(talent.id);
        const maxed = rank >= talent.maxRank;
        const branchPoints = status.branchPoints[branch.id] || 0;
        const tierLocked = branchPoints < talent.requiredPoints;

        const node = document.createElement("div");
        node.className =
          "talent-node"
          + (talent.capstone ? " capstone" : "")
          + (maxed ? " maxed" : "")
          + (tierLocked ? " locked" : "")
          + (!maxed && check.ok ? " spendable" : "");
        node.style.gridRow = String(talent.tier);
        if (talent.capstone) node.style.gridColumn = "1 / -1";

        node.innerHTML =
          '<div class="talent-node-top">'
          + '<span class="talent-tier"></span>'
          + '<span class="talent-rank"></span>'
          + '</div>'
          + '<strong class="talent-name"></strong>'
          + '<span class="talent-description"></span>'
          + '<div class="talent-rank-effects" hidden>'
          + '<div class="talent-effect-current" hidden><span>CURRENT</span><strong></strong></div>'
          + '<div class="talent-effect-next" hidden><span>NEXT</span><strong></strong></div>'
          + '</div>'
          + '<div class="talent-node-bottom">'
          + '<span class="talent-requirement"></span>'
          + '<button class="talent-add" type="button"></button>'
          + '</div>';

        node.querySelector(".talent-tier").textContent =
          talent.capstone ? "CAPSTONE" : "TIER " + talent.tier;
        node.querySelector(".talent-rank").textContent = rank + " / " + talent.maxRank;
        node.querySelector(".talent-name").textContent = talent.name;
        node.querySelector(".talent-description").textContent = talent.description;

        const rankEffects = node.querySelector(".talent-rank-effects");
        const currentEffect = node.querySelector(".talent-effect-current");
        const nextEffect = node.querySelector(".talent-effect-next");
        const rankDescriptions = Array.isArray(talent.rankDescriptions)
          ? talent.rankDescriptions
          : [];

        if (rankDescriptions.length > 0) {
          rankEffects.hidden = false;

          if (rank > 0 && rankDescriptions[rank - 1]) {
            currentEffect.hidden = false;
            currentEffect.querySelector("strong").textContent = rankDescriptions[rank - 1];
          }

          if (!maxed && rankDescriptions[rank]) {
            nextEffect.hidden = false;
            nextEffect.querySelector("strong").textContent = rankDescriptions[rank];
            nextEffect.querySelector("span").textContent = rank === 0 ? "RANK 1" : "NEXT RANK";
          }
        }

        node.querySelector(".talent-requirement").textContent =
          talent.requiredPoints > 0
            ? talent.requiredPoints + " pts in branch"
            : "Available from start";

        const add = node.querySelector(".talent-add");
        add.disabled = !check.ok;
        add.textContent = maxed
          ? "MAX"
          : tierLocked
            ? "LOCKED"
            : status.availablePoints <= 0
              ? "0 TP"
              : "+1";
        add.title = check.ok ? "Spend 1 Talent Point" : check.reason;
        add.addEventListener("click", event => {
          event.stopPropagation();
          this.learnTalent(talent.id);
        });

        node.title = check.ok ? "Click to spend 1 Talent Point" : check.reason;
        if (check.ok) {
          node.tabIndex = 0;
          node.setAttribute("role", "button");
          node.addEventListener("click", () => this.learnTalent(talent.id));
          node.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              this.learnTalent(talent.id);
            }
          });
        }

        grid.appendChild(node);
      }

      branchElement.appendChild(grid);
      this.talentTree.appendChild(branchElement);
    }
  }

  openHonor() {
    this.updateHonorMenu();
    this.honorModal.classList.remove("hidden");
  }

  closeHonor() {
    this.honorModal.classList.add("hidden");
  }

  updateHonorMenu() {
    const status = this.game.honor.status();

    this.honorModalRank.textContent = "RANK " + status.rank + " · " + status.title.toUpperCase();
    this.honorModalTotal.textContent = status.lifetimeHonor.toLocaleString();
    this.honorModalRecord.textContent = status.wins + "W · " + status.losses + "L";
    const talentStatus = this.game.talentStatus();
    this.honorModalTp.textContent =
      talentStatus.availablePoints + " available · " + talentStatus.earnedPoints + " earned";

    if (status.nextRank) {
      this.honorModalProgressText.textContent =
        status.progressHonor.toLocaleString() + " / " + status.neededHonor.toLocaleString();
      this.honorModalProgressFill.style.width = (status.progress * 100).toFixed(1) + "%";
      this.honorModalNext.textContent =
        "Next: Rank " + status.nextRank.rank + " · " + status.nextRank.title
        + " · " + (status.nextRank.requiredHonor - status.lifetimeHonor).toLocaleString() + " Honor remaining";
    } else {
      this.honorModalProgressText.textContent = "MAX RANK";
      this.honorModalProgressFill.style.width = "100%";
      this.honorModalNext.textContent = "Grand Marshal reached";
    }

    this.honorRankList.innerHTML = "";

    for (const rank of HONOR_RANKS) {
      const row = document.createElement("div");
      const reached = status.rank >= rank.rank;
      const current = status.rank === rank.rank;

      row.className =
        "honor-rank-entry"
        + (reached ? " reached" : "")
        + (current ? " current" : "");

      row.innerHTML =
        '<span class="honor-rank-number"></span>'
        + '<span class="honor-rank-name"></span>'
        + '<span class="honor-rank-requirement"></span>'
        + '<span class="honor-rank-reward"></span>';

      row.querySelector(".honor-rank-number").textContent = "R" + rank.rank;
      row.querySelector(".honor-rank-name").textContent = rank.title;
      row.querySelector(".honor-rank-requirement").textContent =
        rank.requiredHonor.toLocaleString() + " Honor";
      row.querySelector(".honor-rank-reward").textContent =
        rank.rank === 1 ? "START" : "+1 TP";

      this.honorRankList.appendChild(row);
    }
  }

  openHelp() {
    document.querySelector("#help-modal").classList.remove("hidden");
  }

  closeHelp() {
    document.querySelector("#help-modal").classList.add("hidden");
  }

  openControls() {
    this.controlsModal.classList.remove("hidden");
    this.renderBindings();
  }

  closeControls() {
    this.controlsModal.classList.add("hidden");
  }

  renderBindings() {
    this.bindingList.innerHTML = "";

    for (const [action, label] of Object.entries(BINDING_LABELS)) {
      const row = document.createElement("div");
      row.className = "binding-row";
      row.innerHTML = '<span class="binding-label"></span><button class="binding-key" type="button"></button>';

      row.querySelector(".binding-label").textContent = label;
      const key = row.querySelector(".binding-key");
      key.textContent = this.input.label(action);
      key.dataset.action = action;
      key.addEventListener("click", () => this.captureBinding(action));

      this.bindingList.appendChild(row);
    }
  }

  update() {
    this.matchClock.textContent = this.game.waitingForStart
      ? "READY"
      : formatTime(this.game.elapsedSeconds);

    for (const actor of this.game.actors) {
      const frame = this.frameElements.get(actor.id);
      if (!frame) continue;

      const healthPct = clamp(actor.healthPct, 0, 1);
      const healthFill = frame.querySelector(".frame-health");
      healthFill.style.width = (healthPct * 100) + "%";
      healthFill.style.setProperty("--class-health", classColorFor(actor));
      frame.classList.toggle("low-health", actor.alive && healthPct < 0.20);
      frame.querySelector(".frame-value").textContent = actor.alive
        ? Math.ceil(actor.health) + " / " + actor.maxHealth
        : "DOWN";

      const resourceFill = frame.querySelector(".frame-resource-fill");
      resourceFill.className = "frame-resource-fill " + actor.resource.type;
      resourceFill.style.width = (clamp(actor.resourcePct, 0, 1) * 100) + "%";

      frame.classList.toggle("dead", !actor.alive);
      frame.classList.toggle("targeted", this.game.player.targetId === actor.id);
      this.updateFrameCombatState(frame, actor);

      this.renderEffects(frame, actor);
      this.renderDr(frame, actor);

      const castTrack = frame.querySelector(".frame-cast");
      const castFill = castTrack.querySelector("div");

      if (actor.cast) {
        castTrack.classList.add("active");
        castFill.style.width = ((1 - actor.cast.remainingMs / actor.cast.totalMs) * 100) + "%";
      } else {
        castTrack.classList.remove("active");
      }
    }

    this.updateDamageMeter();
    this.updateEnemyCooldowns();
    this.updatePlayerCcAlert();
    this.updateDampening();
    this.updateHonorStatus();

    this.actionSlotSpellIds.forEach((spellId, slotIndex) => {
      const spellIndex = this.game.player.spells.findIndex(spell => spell.id === spellId);
      const spell = this.game.player.spells[spellIndex];
      const slot = this.actionSlots[slotIndex];
      if (!spell || !slot) return;

      const cooldown = this.game.player.cooldownFor(spell.id);
      const overlay = slot.querySelector(".cooldown");
      const gcdSweep = slot.querySelector(".gcd-sweep");

      if (cooldown > 0) {
        overlay.classList.add("active");
        overlay.textContent = (cooldown / 1000).toFixed(cooldown > 9500 ? 0 : 1);
      } else {
        overlay.classList.remove("active");
        overlay.textContent = "";
      }

      const gcdActive =
        !spell.ignoreGcd
        && this.game.player.gcdRemaining > 0
        && this.game.player.gcdTotalMs > 0;

      if (gcdActive) {
        const gcdRatio = Math.max(
          0,
          Math.min(1, this.game.player.gcdRemaining / this.game.player.gcdTotalMs),
        );
        gcdSweep.classList.add("active");
        gcdSweep.style.transform = "scaleY(" + gcdRatio.toFixed(4) + ")";
      } else {
        gcdSweep.classList.remove("active");
        gcdSweep.style.transform = "scaleY(0)";
      }

      const selectedTarget = this.game.getActor(this.game.player.targetId);
      const target = spell.target === "self" ? this.game.player : selectedTarget;
      const invalidTarget = !this.game.combat.canTarget(this.game.player, target, spell);
      const outOfRange = !invalidTarget
        && spell.target !== "self"
        && !this.game.combat.inRange(this.game.player, target, spell.range);
      const noResource = !this.game.resources.canPay(this.game.player, spell);
      const controlled = this.game.cc.isHardControlled(this.game.player);
      const schoolLocked = this.game.cc.isSchoolLocked(this.game.player, spell);

      slot.classList.toggle(
        "disabled",
        invalidTarget || noResource || controlled || schoolLocked || !this.game.player.alive,
      );
      slot.classList.toggle("out-of-range", outOfRange);
      slot.classList.toggle("queued", this.game.abilityQueue?.queuedIndex === spellIndex);
    });

    const healerCast = this.game.player.role === "healer";
    this.playerCast.classList.toggle("healer", healerCast);
    this.playerCast.classList.toggle("dps", !healerCast);

    if (this.game.player.cast) {
      const spell = this.game.player.getSpell(this.game.player.cast.spellId);
      this.playerCast.classList.remove("hidden");
      this.playerCastLabel.textContent = spell?.name || "Casting";
      this.playerCastFill.style.width =
        ((1 - this.game.player.cast.remainingMs / this.game.player.cast.totalMs) * 100) + "%";
    } else {
      this.playerCastFill.style.width = "0%";
      this.playerCast.classList.add("hidden");
    }
  }

  updateFrameCombatState(frame, actor) {
    const ccKinds = ["stun", "fear", "incapacitate", "root"];
    const cc = actor.effects
      .filter(effect => effect.remainingMs > 0 && ccKinds.includes(effect.kind))
      .sort((a, b) => {
        const priority = { stun: 0, fear: 1, incapacitate: 2, root: 3 };
        return priority[a.kind] - priority[b.kind];
      })[0];

    const burst = actor.effects.find(effect =>
      effect.kind === "offensiveCooldown" && effect.remainingMs > 0
    );

    frame.classList.remove(
      "cc-active",
      "cc-stun",
      "cc-fear",
      "cc-incapacitate",
      "cc-root",
      "burst-active",
    );

    const banner = frame.querySelector(".frame-state-banner");

    if (cc) {
      const labels = {
        stun: "STUN",
        fear: "FEAR",
        incapacitate: "CC",
        root: "ROOT",
      };
      frame.classList.add("cc-active", "cc-" + cc.kind);
      banner.hidden = false;
      banner.className = "frame-state-banner cc-state " + cc.kind;
      banner.textContent =
        labels[cc.kind] + " · " + Math.max(0, cc.remainingMs / 1000).toFixed(1) + "s";
      return;
    }

    if (burst) {
      frame.classList.add("burst-active");
      banner.hidden = false;
      banner.className = "frame-state-banner burst-state";
      banner.textContent =
        (burst.label || "BURST") + " · " + Math.max(0, burst.remainingMs / 1000).toFixed(1) + "s";
      return;
    }

    banner.hidden = true;
    banner.className = "frame-state-banner";
    banner.textContent = "";
  }

  updateDampening() {
    const dampening = this.game.dampening;
    const percent = dampening.percent;
    const next = dampening.nextStepSeconds(this.game.elapsedSeconds);

    this.dampeningIndicator.classList.toggle("active", percent > 0);
    this.dampeningValue.textContent = percent + "%";

    if (percent <= 0) {
      this.dampeningNext.textContent = "starts in " + Math.ceil(next || 0) + "s";
    } else if (percent >= dampening.maxPercent) {
      this.dampeningNext.textContent = "maximum";
    } else {
      this.dampeningNext.textContent = "+" + dampening.stepPercent + "% in " + Math.ceil(next || 0) + "s";
    }
  }

  updatePlayerCcAlert() {
    const supportedKinds = ["stun", "fear", "incapacitate", "root", "schoolLock"];
    const priority = { stun: 0, fear: 1, incapacitate: 2, root: 3, schoolLock: 4 };
    const alertClasses = ["fear", "incapacitate", "stun", "root", "school-lock"];

    if (this.game.ended || this.game.waitingForStart || !this.game.player.alive) {
      this.playerCcAlert.classList.add("hidden");
      this.playerCcAlert.classList.remove(...alertClasses);
      return;
    }

    const effect = this.game.player.effects
      .filter(item => item.remainingMs > 0 && supportedKinds.includes(item.kind))
      .sort((a, b) => priority[a.kind] - priority[b.kind])[0];

    if (!effect) {
      this.playerCcAlert.classList.add("hidden");
      this.playerCcAlert.classList.remove(...alertClasses);
      return;
    }

    const source = this.game.getActor(effect.sourceId);
    const spell = source?.getSpell(effect.spellId);
    const alertClass = effect.kind === "schoolLock" ? "school-lock" : effect.kind;

    this.playerCcAlert.classList.remove("hidden", ...alertClasses);
    this.playerCcAlert.classList.add(alertClass);

    const titles = {
      fear: "FEARED",
      incapacitate: "INCAPACITATED",
      stun: "STUNNED",
      root: "ROOTED",
      schoolLock: "INTERRUPTED",
    };

    this.playerCcTitle.textContent = titles[effect.kind] || "CONTROLLED";
    this.playerCcTime.textContent = Math.max(0, effect.remainingMs / 1000).toFixed(1) + "s";

    if (effect.kind === "schoolLock") {
      const school = effect.lockedSchool ? effect.lockedSchool.toUpperCase() + " LOCKED" : "SCHOOL LOCKED";
      this.playerCcSource.textContent = spell?.name ? spell.name + " · " + school : school;
    } else {
      this.playerCcSource.textContent = spell?.name ? spell.name : "";
    }
  }

  renderDr(frame, actor) {
    const container = frame.querySelector(".frame-dr");
    if (!container) return;

    const statuses = this.game.cc.drStatuses(actor);
    container.innerHTML = "";
    container.hidden = statuses.length === 0;

    for (const status of statuses) {
      const badge = document.createElement("span");
      badge.className = "dr-badge " + status.category;

      const nextState = status.immune ? "IMMUNE" : "50%";
      const seconds = Math.max(0, Math.ceil(status.resetRemainingMs / 1000));

      badge.textContent = status.active
        ? status.label + " → " + nextState
        : status.label + " " + nextState + " · " + seconds + "s";

      badge.title = status.active
        ? status.label + " DR is active. The next " + status.label.toLowerCase()
          + " effect is " + (status.immune ? "immune" : "50% duration") + "."
        : status.label + " DR resets in " + seconds + "s.";

      container.appendChild(badge);
    }
  }

  renderEffects(frame, actor) {
    const container = frame.querySelector(".frame-effects");
    const visible = actor.effects
      .filter(effect => effect.remainingMs > 0)
      .filter(effect => !["fear", "incapacitate", "stun", "root"].includes(effect.kind))
      .sort((a, b) => a.remainingMs - b.remainingMs)
      .slice(0, 6);

    container.innerHTML = "";

    for (const effect of visible) {
      const badge = document.createElement("span");
      let style = "buff";
      let letter = "B";

      if (effect.kind === "hot") {
        style = "hot";
        letter = "H";
      } else if (effect.kind === "dot") {
        style = "dot";
        letter = "D";
      } else if (effect.kind === "fear") {
        style = "cc";
        letter = "FEAR";
      } else if (effect.kind === "incapacitate") {
        style = "cc";
        letter = "CC";
      } else if (effect.kind === "stun") {
        style = "cc";
        letter = "STUN";
      } else if (effect.kind === "root") {
        style = "cc";
        letter = "ROOT";
      } else if (effect.kind === "healingReduction") {
        style = "debuff";
        letter = "MORTAL";
      } else if (effect.kind === "offensiveCooldown") {
        style = "burst";
        letter = effect.label || "BURST";
      } else if (effect.kind === "schoolLock") {
        style = "lock";
        letter = "LOCK";
      }

      badge.className = "effect-badge " + style;

      const source = this.game.getActor(effect.sourceId);
      const spell = source?.getSpell(effect.spellId);
      badge.textContent = letter + " " + Math.ceil(effect.remainingMs / 1000);
      badge.title = (spell?.name || effect.spellId) + " · " + Math.ceil(effect.remainingMs / 1000) + "s";

      container.appendChild(badge);
    }
  }

  updateHonorStatus() {
    const status = this.game.honor.status();

    this.honorRank.textContent = "RANK " + status.rank + " · " + status.title;
    this.honorTotal.textContent = status.lifetimeHonor.toLocaleString() + " HONOR";
    const talentStatus = this.game.talentStatus();
    this.honorTalentPoints.textContent = "TP " + talentStatus.availablePoints;
    this.honorTalentPoints.title =
      talentStatus.availablePoints + " available · " + talentStatus.spentPoints + " spent";

    if (!this.honorModal.classList.contains("hidden")) {
      this.updateHonorMenu();
    }
    if (!status.nextRank) {
      this.honorProgressFill.style.width = "100%";
      this.honorProgressText.textContent = "MAX RANK";
      return;
    }

    this.honorProgressFill.style.width = (status.progress * 100).toFixed(1) + "%";
    this.honorProgressText.textContent =
      status.progressHonor.toLocaleString()
      + " / " + status.neededHonor.toLocaleString()
      + " TO " + status.nextRank.title.toUpperCase();
  }

  updateDamageMeter() {
    const actors = [...this.game.actors];
    const values = actors.map(actor => this.game.matchStats.get(actor.id)?.damage || 0);
    const max = Math.max(1, ...values);

    actors.forEach((actor, index) => {
      const row = this.meterElements.get(actor.id);
      if (!row) return;

      row.querySelector(".meter-value").textContent = Math.round(values[index]).toLocaleString();
      row.querySelector(".meter-fill").style.width = ((values[index] / max) * 100) + "%";
    });
  }

  actionSlotForSpellIndex(spellIndex) {
    const spell = this.game.player.spells[spellIndex];
    if (!spell) return null;

    const slotIndex = this.actionSlotSpellIds.indexOf(spell.id);
    return slotIndex >= 0 ? this.actionSlots[slotIndex] : null;
  }

  pulseAction(index, success) {
    const slot = this.actionSlotForSpellIndex(index);
    if (!slot) return;

    slot.classList.remove("pressed", "rejected");
    void slot.offsetWidth;
    slot.classList.add(success ? "pressed" : "rejected");

    window.setTimeout(() => {
      slot.classList.remove("pressed", "rejected");
    }, 170);
  }

  pulseQueuedAction(index) {
    const slot = this.actionSlotForSpellIndex(index);
    if (!slot) return;

    slot.classList.remove("rejected");
    slot.classList.add("queued");
  }

  showDeathForfeit() {
    if (!this.deathForfeit || this.game.ended) return;
    this.deathForfeit.classList.remove("hidden");
  }

  hideDeathForfeit() {
    this.deathForfeit?.classList.add("hidden");
  }

  setResult(title, honorAward = null) {
    this.playerCcAlert.classList.add("hidden");
    this.playerCcAlert.classList.remove("fear", "incapacitate", "stun", "root", "school-lock");
    this.resultTitle.textContent = title;

    if (honorAward) {
      this.resultHonor.textContent = "+" + honorAward.honor + " HONOR";

      if (honorAward.rankedUp) {
        this.resultRankUp.hidden = false;
        this.resultRankUp.textContent =
          "RANK UP · " + honorAward.rankTitle.toUpperCase()
          + " · +" + honorAward.talentPointsGained + " TALENT POINT";
      } else {
        this.resultRankUp.hidden = true;
        this.resultRankUp.textContent = "";
      }
    } else {
      this.resultHonor.textContent = "";
      this.resultRankUp.hidden = true;
      this.resultRankUp.textContent = "";
    }

    this.updateHonorStatus();
    this.result.classList.remove("hidden");
  }

  clearResult() {
    this.result.classList.add("hidden");
    this.resultHonor.textContent = "";
    this.resultRankUp.hidden = true;
    this.resultRankUp.textContent = "";
    this.updateHonorStatus();
  }

  addLog(text) {
    this.logLines.unshift(text);
    this.logLines = this.logLines.slice(0, 6);
    this.combatLog.innerHTML = "";

    for (const line of this.logLines) {
      const element = document.createElement("div");
      element.className = "log-line";
      element.textContent = line;
      this.combatLog.appendChild(element);
    }
  }

  clearLog() {
    this.logLines = [];
    this.combatLog.innerHTML = "";
  }

  async copyRunReport() {
    const report = this.game.buildRunReport();

    try {
      await navigator.clipboard.writeText(report);
      this.toast("Run report copied");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = report;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      this.toast("Run report copied");
    }
  }

  toast(message) {
    this.toastElement.textContent = message;
    this.toastElement.classList.add("visible");

    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove("visible");
    }, 1300);
  }
}
