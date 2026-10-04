import { BINDING_LABELS } from "../core/constants.js";
import { clamp, formatTime } from "../core/utils.js";
import { createActionSlot, createEmptyActionSlot, createUnitFrame } from "./components.js?v=20261004-iconart2";
import { classColorFor } from "../content/classes/classColors.js";
import { HONOR_RANKS } from "../core/HonorSystem.js?v=20260927-rank20rating2";
import { describeGearStats } from "../core/GearSystem.js";
import { drawClassGlyph } from "../rendering/ClassGlyphs.js";
import { classIconReady, getClassIcon } from "../rendering/ClassIconRegistry.js?v=20260929-unitframes1";
import { castBarPaletteFor } from "../rendering/CastPalette.js?v=20260928-focusrestyle1";
import { effectIconMarkup, effectIsImportant, effectPalette, effectPriority } from "../rendering/EffectIconRegistry.js?v=20261004-iconart2";
import { createHealthPresentation, updateHealthPresentation } from "../rendering/HealthPresentation.js?v=20260929-healthfeedback1";

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
  if ((spell.effects || []).some(effect => effect.kind === "damageReduction")) return "defensive";
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
    this.healthPresentation = new Map();
    this.meterElements = new Map();
    this.enemyCooldownRows = new Map();
    this.actionSlots = [];
    this.loadoutSlots = [];
    this.actionSlotSpellIds = [];
    this.draggedActionSlot = null;
    this.suppressActionClickUntil = 0;
    this.actionFeedbackTimers = new Map();
    this.lastActionCooldowns = new Map();
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
    this.resultProgressText = document.querySelector("#match-result-progress-text");
    this.resultProgressFill = document.querySelector("#match-result-progress-fill");
    this.resultNextRank = document.querySelector("#match-result-next-rank");
    this.resultWallet = document.querySelector("#match-result-wallet");
    this.resultAdvice = document.querySelector("#match-result-advice");
    this.deathForfeit = document.querySelector("#death-forfeit");
    this.deathKeepWatching = document.querySelector("#death-keep-watching");
    this.deathForfeitButton = document.querySelector("#death-forfeit-button");

    this.honorRank = document.querySelector("#honor-rank");
    this.honorTotal = document.querySelector("#honor-total");
    this.honorProgressFill = document.querySelector("#honor-progress-fill");
    this.honorProgressText = document.querySelector("#honor-progress-text");
    this.honorTalentPoints = document.querySelector("#honor-talent-points");
    this.talentsButton = document.querySelector("#talents-button");
    this.gearButton = document.querySelector("#gear-button");

    this.honorModal = document.querySelector("#honor-modal");
    this.honorModalRank = document.querySelector("#honor-modal-rank");
    this.honorModalRating = document.querySelector("#honor-modal-rating");
    this.honorModalTotal = document.querySelector("#honor-modal-total");
    this.honorModalWallet = document.querySelector("#honor-modal-wallet");
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

    this.gearModal = document.querySelector("#gear-modal");
    this.gearClass = document.querySelector("#gear-class");
    this.gearRank = document.querySelector("#gear-rank");
    this.gearWallet = document.querySelector("#gear-wallet");
    this.gearSetCount = document.querySelector("#gear-set-count");
    this.gearEmpty = document.querySelector("#gear-empty");
    this.gearSetSection = document.querySelector("#gear-set-section");
    this.gearSetName = document.querySelector("#gear-set-name");
    this.gearSetProgress = document.querySelector("#gear-set-progress");
    this.gearSetBonuses = document.querySelector("#gear-set-bonuses");
    this.gearGrid = document.querySelector("#gear-grid");

    this.playerCast = document.querySelector("#player-cast");
    this.playerCastLabel = document.querySelector("#player-cast-label");
    this.playerCastFill = document.querySelector("#player-cast-fill");

    this.playerFocusFrame = document.querySelector("#player-focus-frame");
    this.playerFocusIcon = document.querySelector("#player-focus-icon");
    this.targetFocusStack = document.querySelector("#target-focus-stack");
    this.targetFocusFrame = document.querySelector("#target-focus-frame");
    this.targetFocusIcon = document.querySelector("#target-focus-icon");
    this.targetCast = document.querySelector("#target-cast");
    this.targetCastLabel = document.querySelector("#target-cast-label");
    this.targetCastFill = document.querySelector("#target-cast-fill");

    this.playerCcAlert = document.querySelector("#player-cc-alert");
    this.playerCcTitle = document.querySelector("#player-cc-title");
    this.playerCcTime = document.querySelector("#player-cc-time");
    this.playerCcSource = document.querySelector("#player-cc-source");

    this.controlsModal = document.querySelector("#controls-modal");
    this.bindingList = document.querySelector("#binding-list");

    this.deathKeepWatching.addEventListener("click", () => this.hideDeathForfeit());
    this.deathForfeitButton.addEventListener("click", () => this.game.forfeitMatch());
    document.querySelector("#result-next-button")?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("arena3v3:request-next-match"));
    });
    document.querySelector("#result-restart-button").addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("arena3v3:request-match-setup"));
    });
    document.querySelector("#honor-button").addEventListener("click", () => this.openHonor());
    document.querySelector("#honor-close").addEventListener("click", () => this.closeHonor());
    document.querySelector("#talents-button").addEventListener("click", () => this.openTalents());
    document.querySelector("#talent-close").addEventListener("click", () => this.closeTalents());
    document.querySelector("#gear-button")?.addEventListener("click", () => this.openGear());
    document.querySelector("#gear-close")?.addEventListener("click", () => this.closeGear());
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
    document.querySelector("#copy-ai-movement-button")?.addEventListener("click", () => this.copyAiMovementReport());

    this.buildFrames();
    this.buildDamageMeter();
    this.buildActionBar();
    this.renderBindings();
  }

  buildFrames() {
    this.teamFrames.innerHTML = "";
    this.enemyFrames.innerHTML = "";
    this.frameElements.clear();
    this.healthPresentation.clear();

    const friendly = this.game.actors.filter(actor => actor.team === "friendly");

    for (const actor of this.game.actors) {
      const partyIndex = friendly.indexOf(actor);
      const partyKey = partyIndex >= 0 ? this.input.label("party" + (partyIndex + 1), true) : "";
      const frame = createUnitFrame(actor, id => this.game.selectTarget(id), partyKey);

      (actor.team === "friendly" ? this.teamFrames : this.enemyFrames).appendChild(frame);
      this.frameElements.set(actor.id, frame);
    }

    this.buildEnemyCooldowns();
  }

  buildEnemyCooldowns() {
    this.enemyCooldownRows.clear();

    // The old standalone ENEMY COOLDOWNS widget is intentionally retired.
    // Cooldown intel now lives directly under the matching enemy frame.
    if (this.enemyCooldowns) this.enemyCooldowns.innerHTML = "";
    if (this.enemyCooldownWidget) this.enemyCooldownWidget.hidden = true;

    const enemies = this.game.actors.filter(actor => actor.team === "enemy");

    for (const actor of enemies) {
      const frame = this.frameElements.get(actor.id);
      const container = frame?.querySelector(".frame-enemy-cooldowns");
      if (!container) continue;

      container.innerHTML = "";
      container.hidden = true;

      const trackedSpells = actor.spells
        .map(spell => ({ spell, category: enemyCooldownCategory(spell) }))
        .filter(item => item.category);

      for (const { spell, category } of trackedSpells) {
        const row = document.createElement("div");
        row.className = "enemy-cooldown-row frame-local " + category;
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
          category === "defensive" ? "DEF" : "CC";
        row.querySelector(".enemy-cooldown-name").textContent = spell.name;
        row.querySelector(".enemy-cooldown-fill").style.width = "100%";
        row.title = spell.name + " cooldown";

        container.appendChild(row);
        this.enemyCooldownRows.set(actor.id + ":" + spell.id, {
          row,
          actorId: actor.id,
          spellId: spell.id,
          cooldownMs: spell.cooldownMs,
          container,
        });
      }
    }
  }

  updateEnemyCooldowns() {
    const activeContainers = new Set();

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

      activeContainers.add(entry.container);

      const remainingFraction = entry.cooldownMs > 0
        ? clamp(remaining / entry.cooldownMs, 0, 1)
        : 0;

      row.querySelector(".enemy-cooldown-time").textContent =
        cooldownTimerLabel(remaining);
      row.querySelector(".enemy-cooldown-fill").style.width =
        (remainingFraction * 100).toFixed(1) + "%";
    }

    for (const actor of this.game.actors.filter(unit => unit.team === "enemy")) {
      const frame = this.frameElements.get(actor.id);
      const container = frame?.querySelector(".frame-enemy-cooldowns");
      if (container) container.hidden = !activeContainers.has(container);
    }

    if (this.enemyCooldownWidget) this.enemyCooldownWidget.hidden = true;
  }

  refreshPartyKeycaps() {
    const friendly = this.game.actors.filter(actor => actor.team === "friendly");

    friendly.forEach((actor, index) => {
      const frame = this.frameElements.get(actor.id);
      if (!frame) return;

      const key = frame.querySelector(".party-key");
      key.textContent = this.input.label("party" + (index + 1), true);
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

    this.pulseInputSlot(slotIndex);
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

    this.lastActionCooldowns.clear();

    this.actionSlots = this.actionSlotSpellIds.map((spellId, slotIndex) => {
      const spell = spellId
        ? this.game.player.spells.find(item => item.id === spellId)
        : null;

      const slot = spell
        ? createActionSlot(
          spell,
          slotIndex,
          index => this.castActionSlot(index),
          index => this.handleLiveActionKeycap(index),
        )
        : createEmptyActionSlot(
          slotIndex,
          index => this.handleLiveActionKeycap(index),
        );

      this.wireActionSlotDrag(slot, slotIndex, Boolean(spell));
      this.actionBar.appendChild(slot);

      if (spell) {
        this.lastActionCooldowns.set(spell.id, this.game.player.cooldownFor(spell.id));
        this.applyActionFeedbackPalette(slot, spell);
      }

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
      if (keycap) keycap.textContent = this.input.label("slot" + (index + 1), true);
    });
  }

  openLoadout() {
    this.buildLoadoutBar();
    this.loadoutModal?.classList.remove("hidden");
  }

  closeLoadout() {
    this.cancelBindingCapture();
    this.loadoutModal?.classList.add("hidden");
  }

  refreshActionKeycaps() {
    this.actionSlots.forEach((slot, index) => {
      const keycap = slot.querySelector(".keycap");
      if (keycap) keycap.textContent = this.input.label("slot" + (index + 1), true);
    });
  }

  handleLiveActionKeycap(slotIndex) {
    if (this.game.waitingForStart) {
      this.captureBinding("slot" + (slotIndex + 1));
      return;
    }

    // During a live match the visible key label is part of the spell button,
    // not a rebinding control. This also prevents accidental touch taps on
    // mobile from entering hidden key-capture mode mid-combat.
    this.castActionSlot(slotIndex);
  }

  cancelBindingCapture() {
    const cancelled = this.input.cancelCapture?.() || false;
    document.querySelectorAll(".binding-key.capturing")
      .forEach(button => button.classList.remove("capturing"));
    return cancelled;
  }

  captureBinding(action) {
    const keyButton = [...document.querySelectorAll(".binding-key")]
      .find(button => button.dataset.action === action);

    if (keyButton) keyButton.classList.add("capturing");
    this.toast(
      "Press a key or Ctrl/Shift/Alt + key for "
      + BINDING_LABELS[action] + " · Esc cancels",
    );

    this.input.captureNext(action, () => {
      this.renderBindings();
      this.refreshActionKeycaps();
      this.refreshLoadoutKeycaps();
      this.refreshPartyKeycaps();
    });
  }


  openGear() {
    if (!this.gearModal) return;
    this.renderGear();
    this.gearModal.classList.remove("hidden");
  }

  closeGear() {
    this.gearModal?.classList.add("hidden");
  }

  purchaseGear(itemId) {
    const result = this.game.purchaseGear(itemId);

    if (!result.ok) {
      this.toast(result.reason);
      this.renderGear();
      return;
    }

    this.renderGear();
    this.updateHonorStatus();
    this.toast(
      result.item.name + " purchased · "
      + (this.game.waitingForStart ? "equipped now" : "equips next match"),
    );
  }

  renderGear() {
    if (!this.gearModal || !this.gearGrid) return;

    const honor = this.game.honor.status();
    const status = this.game.gearStatus();

    this.gearClass.textContent = this.game.player?.className || "—";
    this.gearRank.textContent = "RANK " + honor.rank;
    this.gearWallet.textContent = honor.honorPoints.toLocaleString() + " HONOR";
    this.gearGrid.innerHTML = "";
    this.gearSetBonuses.innerHTML = "";

    if (!status.available) {
      this.gearEmpty.hidden = false;
      this.gearEmpty.textContent =
        "PvP gear is being introduced class by class. This class does not have a completed gear set yet.";
      this.gearSetSection.hidden = true;
      this.gearGrid.hidden = true;
      this.gearSetCount.textContent = "COMING LATER";
      return;
    }

    this.gearEmpty.hidden = true;
    this.gearSetSection.hidden = false;
    this.gearGrid.hidden = false;

    this.gearSetCount.textContent = status.setPieces + " / 6";
    this.gearSetName.textContent = status.set?.name?.toUpperCase() || "PVP SET";
    this.gearSetProgress.textContent = status.setPieces + " / 6 EQUIPPED";

    for (const bonus of status.set?.bonuses || []) {
      const active = status.setPieces >= bonus.pieces;
      const row = document.createElement("div");
      row.className = "gear-set-bonus" + (active ? " active" : "");
      row.innerHTML =
        '<span class="gear-set-threshold"></span>'
        + '<span class="gear-set-description"></span>'
        + '<strong class="gear-set-state"></strong>';
      row.querySelector(".gear-set-threshold").textContent = bonus.pieces + " PIECES";
      row.querySelector(".gear-set-description").textContent = bonus.description;
      row.querySelector(".gear-set-state").textContent = active ? "ACTIVE" : "LOCKED";
      this.gearSetBonuses.appendChild(row);
    }

    const slotOrder = {
      head: 0,
      shoulders: 1,
      chest: 2,
      hands: 3,
      legs: 4,
      feet: 5,
      weapon: 6,
      mainHand: 7,
      offHand: 8,
    };

    const items = [...status.items].sort((a, b) =>
      (slotOrder[a.slot] ?? 99) - (slotOrder[b.slot] ?? 99)
      || a.rankRequired - b.rankRequired
    );

    for (const item of items) {
      const card = document.createElement("article");
      card.className =
        "gear-item"
        + (item.equipped ? " equipped" : "")
        + (item.owned ? " owned" : "")
        + (!item.owned && !item.purchase.ok ? " unavailable" : "");

      card.innerHTML =
        '<div class="gear-item-head">'
        + '<div><span class="gear-slot"></span><strong class="gear-item-name"></strong></div>'
        + '<span class="gear-rank-lock"></span>'
        + '</div>'
        + '<div class="gear-item-stats"></div>'
        + '<div class="gear-item-footer">'
        + '<span class="gear-item-cost"></span>'
        + '<button class="gear-buy hud-button" type="button"></button>'
        + '</div>';

      card.querySelector(".gear-slot").textContent = item.slotLabel.toUpperCase();
      card.querySelector(".gear-item-name").textContent = item.name;
      card.querySelector(".gear-rank-lock").textContent =
        item.rankRequired <= 1 ? "BASE" : "RANK " + item.rankRequired;

      const stats = card.querySelector(".gear-item-stats");
      for (const line of describeGearStats(item)) {
        const stat = document.createElement("span");
        stat.textContent = line;
        stats.appendChild(stat);
      }

      const cost = card.querySelector(".gear-item-cost");
      cost.textContent = item.cost.toLocaleString() + " HONOR";

      const button = card.querySelector(".gear-buy");

      if (item.equipped) {
        button.textContent = "EQUIPPED";
        button.disabled = true;
      } else if (item.owned) {
        button.textContent = "OWNED";
        button.disabled = true;
      } else if (!item.purchase.ok) {
        const needsBase = item.upgradeFrom && !status.owned.includes(item.upgradeFrom);
        const lacksRank = honor.rank < item.rankRequired;
        const lacksHonor = honor.honorPoints < item.cost;

        if (lacksRank) button.textContent = "RANK " + item.rankRequired;
        else if (needsBase) button.textContent = "BASE REQUIRED";
        else if (lacksHonor) {
          button.textContent =
            "NEED " + (item.cost - honor.honorPoints).toLocaleString() + " HONOR";
        } else button.textContent = "LOCKED";

        button.title = item.purchase.reason;
        button.disabled = true;
      } else {
        button.textContent = "BUY & EQUIP";
        button.addEventListener("click", () => this.purchaseGear(item.id));
      }

      this.gearGrid.appendChild(card);
    }
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
      pointNote.textContent = "Reach Rank 2 to earn 1 Talent Point.";
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
    const rating = this.game.rating.status();

    this.honorModalRank.textContent = "RANK " + status.rank;
    if (this.honorModalRating) {
      this.honorModalRating.textContent =
        rating.rating.toLocaleString() + " · PEAK " + rating.peakRating.toLocaleString();
    }
    this.honorModalTotal.textContent = status.lifetimeHonor.toLocaleString();
    if (this.honorModalWallet) {
      this.honorModalWallet.textContent = status.honorPoints.toLocaleString();
    }
    this.honorModalRecord.textContent = status.wins + "W · " + status.losses + "L";
    const talentStatus = this.game.talentStatus();
    this.honorModalTp.textContent =
      talentStatus.availablePoints + " available · " + talentStatus.earnedPoints + " earned";

    if (status.nextRank) {
      this.honorModalProgressText.textContent =
        status.progressHonor.toLocaleString() + " / " + status.neededHonor.toLocaleString();
      this.honorModalProgressFill.style.width = (status.progress * 100).toFixed(1) + "%";
      this.honorModalNext.textContent =
        "Next: Rank " + status.nextRank.rank
        + " · " + (status.nextRank.requiredHonor - status.lifetimeHonor).toLocaleString() + " Honor remaining";
    } else {
      this.honorModalProgressText.textContent = "MAX RANK";
      this.honorModalProgressFill.style.width = "100%";
      this.honorModalNext.textContent = "Rank 20 reached";
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
      row.querySelector(".honor-rank-name").textContent =
        rank.rank === 20 ? "MAX" : "";
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
    this.cancelBindingCapture();
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

  drawFocusClassIcon(canvas, actor) {
    if (!canvas || !actor) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const image = getClassIcon(actor.classId);
    const pngReady = classIconReady(image);
    const signature = (actor.classId || "") + ":" + (pngReady ? "png" : "glyph");
    if (canvas.dataset.iconSignature === signature) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();

    if (pngReady) {
      const size = Math.min(canvas.width, canvas.height) - 6;
      const x = (canvas.width - size) / 2;
      const y = (canvas.height - size) / 2;

      context.beginPath();
      context.arc(
        canvas.width / 2,
        canvas.height / 2,
        size / 2,
        0,
        Math.PI * 2,
      );
      context.clip();
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, x, y, size, size);
    } else {
      // Keep the old vector glyph as a loading/missing-asset fallback.
      // Do not freeze the fallback: the signature changes once the PNG loads.
      context.translate(canvas.width / 2, canvas.height / 2);
      context.scale(1.55, 1.55);
      drawClassGlyph(context, {
        ...actor,
        x: 0,
        y: 0,
        radius: 20,
      });
    }

    context.restore();

    canvas.dataset.iconSignature = signature;
    canvas.setAttribute("aria-label", (actor.className || actor.name) + " class icon");
  }

  updateFocusFrame(frame, iconCanvas, actor) {
    if (!frame || !actor) return;

    const healthPct = clamp(actor.healthPct, 0, 1);
    const resourcePct = clamp(actor.resourcePct, 0, 1);
    const classColor = classColorFor(actor);
    const friendly = actor.team === this.game.player.team;

    frame.style.setProperty("--focus-class-color", classColor);
    frame.style.setProperty(
      "--focus-team-color",
      friendly ? "var(--friendly-bright)" : "var(--enemy-bright)",
    );
    frame.classList.toggle("enemy", !friendly);
    frame.classList.toggle("friendly", friendly);
    frame.classList.toggle("dead", !actor.alive);
    frame.classList.toggle("low-health", actor.alive && healthPct < 0.20);

    frame.querySelector(".focus-unit-name").textContent = actor.name;
    frame.querySelector(".focus-unit-meta").textContent =
      (actor.className || "") + " · " + actor.role;

    const healthFill = frame.querySelector(".focus-health-fill");
    healthFill.style.width = (healthPct * 100) + "%";
    healthFill.style.background = classColor;
    frame.querySelector(".focus-bar-value").textContent = actor.alive
      ? Math.ceil(actor.health) + " / " + actor.maxHealth
      : "DOWN";

    const resourceTrack = frame.querySelector(".focus-resource-track");
    const resourceFill = frame.querySelector(".focus-resource-fill");
    const hasResource = actor.resource?.max > 0;
    resourceTrack.style.display = hasResource ? "" : "none";

    if (hasResource) {
      resourceFill.className = "focus-resource-fill " + actor.resource.type;
      resourceFill.style.width = (resourcePct * 100) + "%";
      frame.querySelector(".focus-resource-label").textContent =
        String(actor.resource.type || "").toUpperCase();
      frame.querySelector(".focus-resource-value").textContent =
        Math.ceil(actor.resource.value) + " / " + actor.resource.max;
    }

    this.drawFocusClassIcon(iconCanvas, actor);
  }

  updateFocusCast(castElement, labelElement, fillElement, actor) {
    if (!castElement || !labelElement || !fillElement || !actor) return;

    if (actor.cast) {
      const spell = actor.getSpell(actor.cast.spellId);
      const totalMs = Math.max(1, actor.cast.totalMs || 1);
      const progress = clamp(1 - actor.cast.remainingMs / totalMs, 0, 1);
      const palette = castBarPaletteFor(actor, {
        cast: "var(--cast)",
        cream: "var(--cream)",
        border: "var(--line)",
      });

      castElement.style.setProperty("--focus-cast-start", palette.start);
      castElement.style.setProperty("--focus-cast-end", palette.end);
      castElement.style.setProperty("--focus-cast-glow", palette.glow);
      castElement.style.setProperty("--focus-cast-border", palette.border);
      castElement.classList.toggle(
        "uninterruptible",
        spell?.interruptible === false,
      );

      castElement.classList.remove("hidden");
      labelElement.textContent = spell?.name || "Casting";
      fillElement.style.width = (progress * 100) + "%";
    } else {
      fillElement.style.width = "0%";
      castElement.classList.remove("uninterruptible");
      castElement.classList.add("hidden");
    }
  }

  updateFocusHud() {
    const player = this.game.player;
    if (!player) return;

    this.updateFocusFrame(this.playerFocusFrame, this.playerFocusIcon, player);
    this.updateFocusCast(
      this.playerCast,
      this.playerCastLabel,
      this.playerCastFill,
      player,
    );

    const target = this.game.getActor(player.targetId);
    const hasTarget = Boolean(target);

    this.targetFocusStack.classList.toggle("hidden", !hasTarget);
    this.targetFocusStack.setAttribute("aria-hidden", hasTarget ? "false" : "true");

    if (!hasTarget) {
      this.targetCastFill.style.width = "0%";
      this.targetCast.classList.add("hidden");
      return;
    }

    this.updateFocusFrame(this.targetFocusFrame, this.targetFocusIcon, target);
    this.updateFocusCast(
      this.targetCast,
      this.targetCastLabel,
      this.targetCastFill,
      target,
    );
  }

  incomingHealPrediction(target) {
    if (
      !target?.alive
      || !this.game.player
      || target.team !== this.game.player.team
    ) {
      return 0;
    }

    let predicted = 0;

    for (const caster of this.game.actors) {
      if (
        !caster.alive
        || caster.team !== target.team
        || !caster.cast
        || caster.cast.targetId !== target.id
      ) {
        continue;
      }

      const spell = caster.getSpell(caster.cast.spellId);
      if (!spell) continue;

      for (const effect of spell.effects || []) {
        if (effect.kind !== "heal") continue;

        const effectTarget = effect.to === "self"
          ? caster
          : target;

        if (effectTarget.id !== target.id) continue;

        // Prediction deliberately uses the spell's normal, non-crit amount.
        // The live heal still rolls variance and crit at completion, so the UI
        // communicates incoming healing without exposing future RNG.
        let amount = this.game.dampening.applyToHealing(
          Math.max(0, Number(effect.amount) || 0),
        );
        amount = Math.round(
          amount * (1 - target.healingReduction()),
        );
        predicted += Math.max(0, amount);
      }
    }

    return Math.min(
      predicted,
      Math.max(0, target.maxHealth - target.health),
    );
  }

  updateHealPrediction(frame, actor) {
    const prediction = frame.querySelector(".frame-heal-prediction");
    if (!prediction) return;

    const friendly = actor.team === this.game.player?.team;
    const amount = friendly
      ? this.incomingHealPrediction(actor)
      : 0;

    const actualPct = clamp(actor.healthPct, 0, 1);
    const endPct = actor.maxHealth > 0
      ? clamp((actor.health + amount) / actor.maxHealth, 0, 1)
      : actualPct;

    // Keep the projected segment behind the real health fill. Starting at the
    // real HP value means recent smooth-health interpolation can never make
    // predicted healing overwrite health the player already has.
    const startPct = actualPct;
    const widthPct = Math.max(0, endPct - startPct);

    prediction.style.left = (startPct * 100).toFixed(3) + "%";
    prediction.style.width = (widthPct * 100).toFixed(3) + "%";
    prediction.classList.toggle(
      "active",
      actor.alive && amount > 0 && widthPct > 0.0005,
    );
  }

  primaryHealRangeSpell() {
    const player = this.game.player;
    if (!player || player.role !== "healer") return null;

    const directHeal = player.spells.find(spell =>
      spell.target === "ally"
      && Number(spell.range) > 0
      && ["quickHeal", "instantHeal", "bigHeal"].includes(spell.aiRole)
      && (spell.effects || []).some(effect => effect.kind === "heal")
    );

    if (directHeal) return directHeal;

    return player.spells.find(spell =>
      spell.target === "ally"
      && Number(spell.range) > 0
      && (spell.effects || []).some(effect =>
        effect.kind === "heal" || effect.kind === "hot"
      )
    ) || null;
  }

  updateFriendlyReachability(frame, actor, healSpell) {
    const player = this.game.player;
    const indicator = frame.querySelector(".frame-los-indicator");

    const relevant = Boolean(
      player?.alive
      && actor?.alive
      && !this.game.waitingForStart
      && healSpell
      && actor.team === player.team
      && actor.id !== player.id
    );

    if (!relevant) {
      frame.classList.remove("heal-out-of-range", "heal-los-blocked");
      if (indicator) {
        indicator.hidden = true;
        indicator.title = "";
      }
      return;
    }

    const inRange = this.game.combat.spellInRange(player, actor, healSpell);
    const losBlocked = inRange && !this.game.combat.hasLos(player, actor);

    frame.classList.toggle("heal-out-of-range", !inRange);
    frame.classList.toggle("heal-los-blocked", losBlocked);

    if (indicator) {
      indicator.hidden = !losBlocked;
      indicator.title = losBlocked
        ? "Line of sight blocked"
        : "";
    }
  }

  update() {
    this.matchClock.textContent = this.game.waitingForStart
      ? "READY"
      : formatTime(this.game.elapsedSeconds);

    const healthNowMs = performance.now();
    const primaryHealSpell = this.primaryHealRangeSpell();

    for (const actor of this.game.actors) {
      const frame = this.frameElements.get(actor.id);
      if (!frame) continue;

      const healthPct = clamp(actor.healthPct, 0, 1);
      const classColor = classColorFor(actor);
      let healthVisual = this.healthPresentation.get(actor.id);

      if (!healthVisual) {
        healthVisual = createHealthPresentation(healthPct, healthNowMs);
        this.healthPresentation.set(actor.id, healthVisual);
      }

      updateHealthPresentation(healthVisual, healthPct, healthNowMs);

      const healthFill = frame.querySelector(".frame-health");
      const healthTrail = frame.querySelector(".frame-health-trail");
      const healFlash = frame.querySelector(".frame-heal-flash");

      frame.style.setProperty("--class-health", classColor);
      healthFill.style.width = (healthVisual.displayPct * 100).toFixed(3) + "%";
      healthTrail.style.width = (healthVisual.trailPct * 100).toFixed(3) + "%";

      const healFrom = Math.min(healthVisual.healFromPct, healthVisual.healToPct);
      const healWidth = Math.max(0, healthVisual.healToPct - healFrom);
      healFlash.style.left = (healFrom * 100).toFixed(3) + "%";
      healFlash.style.width = (healWidth * 100).toFixed(3) + "%";
      healFlash.style.opacity = healthVisual.healFlashAlpha.toFixed(3);
      this.updateHealPrediction(frame, actor);

      frame.classList.toggle("low-health", actor.alive && healthPct < 0.20);

      const healthValue = frame.querySelector(".frame-value");
      healthValue.textContent = actor.alive
        ? Math.round(healthPct * 100) + "%"
        : "DOWN";
      healthValue.title = actor.alive
        ? Math.ceil(actor.health) + " / " + actor.maxHealth
        : "Down";

      const resourceFill = frame.querySelector(".frame-resource-fill");
      resourceFill.className = "frame-resource-fill " + actor.resource.type;
      resourceFill.style.width = (clamp(actor.resourcePct, 0, 1) * 100) + "%";

      frame.classList.toggle("dead", !actor.alive);
      frame.classList.toggle("targeted", this.game.player.targetId === actor.id);
      this.updateFriendlyReachability(frame, actor, primaryHealSpell);
      this.updateFrameCombatState(frame, actor);

      this.renderEffects(frame, actor);
      this.renderDr(frame, actor);

      const castTrack = frame.querySelector(".frame-cast");
      const castFill = frame.querySelector(".frame-cast-fill");
      const castName = frame.querySelector(".frame-cast-name");
      const castTime = frame.querySelector(".frame-cast-time");

      if (actor.cast) {
        const castProgress = clamp(
          1 - actor.cast.remainingMs / Math.max(1, actor.cast.totalMs),
          0,
          1,
        );
        const spell = actor.getSpell(actor.cast.spellId);
        const palette = castBarPaletteFor(actor, {
          cast: "var(--cast)",
          cream: "var(--cream)",
          border: "var(--gold)",
        });

        castTrack.classList.add("active");
        castTrack.classList.toggle(
          "uninterruptible",
          spell?.interruptible === false,
        );
        castTrack.style.setProperty("--frame-cast-start", palette.start);
        castTrack.style.setProperty("--frame-cast-end", palette.end);
        castTrack.style.setProperty("--frame-cast-glow", palette.glow);
        castTrack.style.setProperty("--frame-cast-border", palette.border);
        castFill.style.width = (castProgress * 100) + "%";
        castName.textContent = spell?.name || "CASTING";
        castTime.textContent = Math.max(0, actor.cast.remainingMs / 1000).toFixed(1);
      } else {
        castTrack.classList.remove("active", "uninterruptible");
        castFill.style.width = "0%";
        castName.textContent = "";
        castTime.textContent = "";
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
      const previousCooldown = this.lastActionCooldowns.get(spell.id);
      const overlay = slot.querySelector(".cooldown");
      const gcdSweep = slot.querySelector(".gcd-sweep");

      if (
        spell.cooldownMs > 0
        && Number.isFinite(previousCooldown)
        && previousCooldown > 0
        && cooldown <= 0
      ) {
        this.flashActionSlotClass(slotIndex, "cooldown-ready", 460);
      }
      this.lastActionCooldowns.set(spell.id, cooldown);

      const activeCast = this.game.player.cast?.spellId === spell.id;
      slot.classList.toggle("casting", activeCast);
      if (activeCast) {
        const cast = this.game.player.cast;
        const progress = clamp(1 - cast.remainingMs / Math.max(1, cast.totalMs), 0, 1);
        slot.style.setProperty("--action-cast-progress", progress.toFixed(4));
        this.applyActionFeedbackPalette(slot, spell);
      } else {
        slot.style.setProperty("--action-cast-progress", "0");
      }

      if (cooldown > 0) {
        const cooldownRatio = spell.cooldownMs > 0
          ? clamp(cooldown / spell.cooldownMs, 0, 1)
          : 0;
        overlay.classList.add("active");
        overlay.style.setProperty(
          "--cooldown-angle",
          (cooldownRatio * 360).toFixed(2) + "deg",
        );
        overlay.textContent = (cooldown / 1000).toFixed(cooldown > 9500 ? 0 : 1);
      } else {
        overlay.classList.remove("active");
        overlay.style.setProperty("--cooldown-angle", "0deg");
        overlay.textContent = "";
      }
      slot.classList.toggle("on-cooldown", cooldown > 0);

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
        gcdSweep.style.setProperty(
          "--gcd-angle",
          (gcdRatio * 360).toFixed(2) + "deg",
        );
      } else {
        gcdSweep.classList.remove("active");
        gcdSweep.style.setProperty("--gcd-angle", "0deg");
      }

      const selectedTarget = this.game.getActor(this.game.player.targetId);
      const target = spell.target === "self" ? this.game.player : selectedTarget;
      const invalidTarget = !this.game.combat.canTarget(this.game.player, target, spell);
      const outOfRange = !invalidTarget
        && spell.target !== "self"
        && !this.game.combat.spellInRange(this.game.player, target, spell);
      const noResource = !this.game.resources.canPay(this.game.player, spell);
      const controlled = this.game.cc.isHardControlled(this.game.player);
      const schoolLocked = this.game.cc.isSchoolLocked(this.game.player, spell);

      const playerDead = !this.game.player.alive;
      const disabled =
        invalidTarget || noResource || controlled || schoolLocked || playerDead;

      slot.classList.toggle("disabled", disabled);
      slot.classList.toggle("invalid-target", invalidTarget);
      slot.classList.toggle("no-resource", noResource);
      slot.classList.toggle("controlled", controlled);
      slot.classList.toggle("school-locked", schoolLocked);
      slot.classList.toggle("player-dead", playerDead);
      slot.classList.toggle("out-of-range", outOfRange);
      slot.classList.toggle(
        "available",
        !disabled && !outOfRange && cooldown <= 0,
      );
      slot.classList.toggle("queued", this.game.abilityQueue?.queuedIndex === spellIndex);
    });

    this.updateFocusHud();
  }

  updateFrameCombatState(frame, actor) {
    const ccKinds = ["stun", "fear", "incapacitate", "root"];
    const cc = actor.effects
      .filter(effect => effect.remainingMs > 0 && ccKinds.includes(effect.kind))
      .sort((a, b) => effectPriority(b) - effectPriority(a))[0];

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

    const majorCc = frame.querySelector(".frame-major-cc");
    const majorGlyph = frame.querySelector(".major-cc-glyph");
    const majorTime = frame.querySelector(".major-cc-time");
    const banner = frame.querySelector(".frame-state-banner");

    if (banner) {
      banner.hidden = true;
      banner.className = "frame-state-banner";
      banner.textContent = "";
    }

    if (cc) {
      const source = this.game.getActor(cc.sourceId);
      const spell = source?.getSpell(cc.spellId);
      const palette = effectPalette(cc);

      frame.classList.add("cc-active", "cc-" + cc.kind);
      majorCc.hidden = false;
      majorCc.className = "frame-major-cc " + cc.kind;
      majorCc.style.setProperty("--major-cc-border", palette.border);
      majorCc.style.setProperty("--major-cc-bg", palette.background);
      majorGlyph.innerHTML = effectIconMarkup(cc);
      majorTime.textContent = Math.max(0, cc.remainingMs / 1000).toFixed(1);
      majorCc.title = (spell?.name || cc.spellId || "Crowd control")
        + " · "
        + Math.max(0, cc.remainingMs / 1000).toFixed(1)
        + "s";
    } else {
      majorCc.hidden = true;
      majorCc.className = "frame-major-cc";
      majorGlyph.innerHTML = "";
      majorTime.textContent = "";
      majorCc.title = "";
    }

    if (burst) {
      frame.classList.add("burst-active");
    }
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
    const enemyFrame = actor.team === "enemy";

    container.innerHTML = "";
    container.hidden = statuses.length === 0;
    container.classList.toggle("enemy-dr-icons", enemyFrame);

    for (const status of statuses) {
      const nextState = status.immune ? "IMMUNE" : "50%";
      const seconds = Math.max(0, Math.ceil(status.resetRemainingMs / 1000));

      if (enemyFrame) {
        const effectKind = {
          stun: "stun",
          incapacitate: "incapacitate",
          disorient: "fear",
          root: "root",
        }[status.category] || "stun";
        const iconEffect = { kind: effectKind };
        const palette = effectPalette(iconEffect);
        const resetRatio = status.active
          ? 1
          : clamp(status.resetRemainingMs / 20000, 0, 1);

        const icon = document.createElement("span");
        icon.className =
          "dr-icon "
          + status.category
          + (status.active ? " active" : "")
          + (status.immune ? " immune" : "");
        icon.style.setProperty("--dr-color", palette.color);
        icon.style.setProperty("--dr-bg", palette.background);
        icon.style.setProperty("--dr-border", palette.border);
        icon.style.setProperty("--dr-sweep", Math.round(resetRatio * 360) + "deg");

        icon.innerHTML =
          '<span class="dr-icon-art">' + effectIconMarkup(iconEffect) + '</span>'
          + '<span class="dr-icon-state">' + (status.immune ? "IMM" : "50%") + '</span>'
          + (status.active
            ? '<span class="dr-icon-time">DR</span>'
            : '<span class="dr-icon-time">' + seconds + '</span>');

        icon.title = status.active
          ? status.label + " DR active · next " + status.label.toLowerCase()
            + " is " + (status.immune ? "immune" : "50% duration") + "."
          : status.label + " DR · next " + (status.immune ? "immune" : "50% duration")
            + " · resets in " + seconds + "s.";

        container.appendChild(icon);
        continue;
      }

      const badge = document.createElement("span");
      badge.className = "dr-badge " + status.category;
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
    const hardCcKinds = new Set(["fear", "incapacitate", "stun", "root"]);
    const visible = actor.effects
      .filter(effect => effect.remainingMs > 0)
      .filter(effect => !hardCcKinds.has(effect.kind))
      .sort((a, b) => {
        const priority = effectPriority(b) - effectPriority(a);
        return priority || a.remainingMs - b.remainingMs;
      })
      .slice(0, 5);

    container.innerHTML = "";
    container.hidden = visible.length === 0;

    for (const effect of visible) {
      const source = this.game.getActor(effect.sourceId);
      const spell = source?.getSpell(effect.spellId);
      const palette = effectPalette(effect);
      const ratio = effect.durationMs > 0
        ? clamp(effect.remainingMs / effect.durationMs, 0, 1)
        : 0;

      const icon = document.createElement("span");
      icon.className = "effect-icon effect-" + effect.kind
        + (effectIsImportant(effect) ? " important" : "")
        + (effect.remainingMs <= 3000 ? " expiring" : "");
      icon.style.setProperty("--effect-color", palette.color);
      icon.style.setProperty("--effect-bg", palette.background);
      icon.style.setProperty("--effect-border", palette.border);
      icon.style.setProperty("--effect-sweep", Math.round(ratio * 360) + "deg");
      icon.innerHTML =
        '<span class="effect-icon-art">' + effectIconMarkup(effect) + '</span>'
        + '<span class="effect-duration">'
        + (effect.remainingMs < 10000
          ? Math.max(0, effect.remainingMs / 1000).toFixed(1)
          : Math.ceil(effect.remainingMs / 1000))
        + '</span>';

      icon.title = (spell?.name || effect.spellId || effect.kind)
        + " · "
        + Math.max(0, effect.remainingMs / 1000).toFixed(1)
        + "s";

      container.appendChild(icon);
    }
  }

  updateHonorStatus() {
    const status = this.game.honor.status();
    const rating = this.game.rating.status();

    this.honorRank.textContent = "RANK " + status.rank;
    this.honorTotal.textContent = "RATING " + rating.rating.toLocaleString();
    const talentStatus = this.game.talentStatus();
    this.honorTalentPoints.textContent = "TP " + talentStatus.availablePoints;
    this.honorTalentPoints.title =
      talentStatus.availablePoints + " available · " + talentStatus.spentPoints + " spent";

    this.updateProgressionAttention(talentStatus);

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
      + " TO RANK " + status.nextRank.rank;
  }

  updateProgressionAttention(talentStatus = this.game.talentStatus()) {
    const hasUnspentTalents = (talentStatus?.availablePoints || 0) > 0;
    this.talentsButton?.classList.toggle("progression-ready", hasUnspentTalents);
    if (this.talentsButton) {
      this.talentsButton.title = hasUnspentTalents
        ? talentStatus.availablePoints + " unspent Talent Point"
          + (talentStatus.availablePoints === 1 ? "" : "s")
        : "";
    }

    const gearStatus = this.game.gearStatus();
    const purchasableGear = (gearStatus?.items || []).filter(item =>
      !item.owned && item.purchase?.ok
    );
    const hasPurchasableGear = purchasableGear.length > 0;

    this.gearButton?.classList.toggle("progression-ready", hasPurchasableGear);
    if (this.gearButton) {
      this.gearButton.title = hasPurchasableGear
        ? purchasableGear.length + " gear "
          + (purchasableGear.length === 1 ? "purchase" : "purchases")
          + " available"
        : "";
    }
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

  actionSlotIndexForSpellId(spellId) {
    return this.actionSlotSpellIds.indexOf(spellId);
  }

  actionSlotForSpellId(spellId) {
    const slotIndex = this.actionSlotIndexForSpellId(spellId);
    return slotIndex >= 0 ? this.actionSlots[slotIndex] : null;
  }

  actionSlotForSpellIndex(spellIndex) {
    const spell = this.game.player.spells[spellIndex];
    if (!spell) return null;
    return this.actionSlotForSpellId(spell.id);
  }

  applyActionFeedbackPalette(slot, spell) {
    if (!slot || !spell) return;

    const originalCast = this.game.player.cast;
    const needsShim = originalCast?.spellId !== spell.id;
    if (needsShim) {
      this.game.player.cast = {
        spellId: spell.id,
        totalMs: spell.castMs || 1,
        remainingMs: spell.castMs || 0,
      };
    }

    const palette = castBarPaletteFor(this.game.player, {
      cast: "var(--cast)",
      cream: "var(--cream)",
      border: "var(--line)",
    });

    if (needsShim) this.game.player.cast = originalCast;

    slot.style.setProperty("--action-spell-start", palette.start);
    slot.style.setProperty("--action-spell-end", palette.end);
    slot.style.setProperty("--action-spell-glow", palette.glow);
    slot.style.setProperty("--action-spell-border", palette.border);
  }

  flashActionSlotClass(slotIndex, className, durationMs = 360) {
    const slot = this.actionSlots[slotIndex];
    if (!slot) return;

    const key = slotIndex + ":" + className;
    const previousTimer = this.actionFeedbackTimers.get(key);
    if (previousTimer) window.clearTimeout(previousTimer);

    slot.classList.remove(className);
    void slot.offsetWidth;
    slot.classList.add(className);

    const timer = window.setTimeout(() => {
      slot.classList.remove(className);
      this.actionFeedbackTimers.delete(key);
    }, durationMs);
    this.actionFeedbackTimers.set(key, timer);
  }

  pulseInputSlot(slotIndex) {
    this.flashActionSlotClass(slotIndex, "input-pressed", 105);
  }

  pulseAction(index, success) {
    const spell = this.game.player.spells[index];
    if (!spell) return;

    const slotIndex = this.actionSlotIndexForSpellId(spell.id);
    if (slotIndex < 0) return;

    this.flashActionSlotClass(
      slotIndex,
      success ? "accepted" : "rejected",
      success ? 150 : 260,
    );
  }

  pulseQueuedAction(index) {
    const spell = this.game.player.spells[index];
    if (!spell) return;

    const slot = this.actionSlotForSpellId(spell.id);
    slot?.classList.remove("rejected");
    slot?.classList.add("queued");
  }

  onPlayerCastStarted(spellId) {
    const slotIndex = this.actionSlotIndexForSpellId(spellId);
    if (slotIndex < 0) return;

    const slot = this.actionSlots[slotIndex];
    const spell = this.game.player.getSpell(spellId);
    if (!slot || !spell) return;

    this.applyActionFeedbackPalette(slot, spell);
    slot.classList.remove("cast-success", "cast-interrupted", "cast-failed", "cooldown-ready");
    slot.classList.add("casting");
    slot.style.setProperty("--action-cast-progress", "0");
  }

  onPlayerSpellSucceeded(spellId) {
    const slotIndex = this.actionSlotIndexForSpellId(spellId);
    if (slotIndex < 0) return;

    const slot = this.actionSlots[slotIndex];
    const spell = this.game.player.getSpell(spellId);
    if (!slot || !spell) return;

    this.applyActionFeedbackPalette(slot, spell);
    slot.classList.remove("casting", "queued", "cast-interrupted", "cast-failed");
    slot.style.setProperty("--action-cast-progress", "0");
    this.flashActionSlotClass(slotIndex, "cast-success", 480);
  }

  onPlayerCastInterrupted(spellId) {
    const slotIndex = this.actionSlotIndexForSpellId(spellId);
    if (slotIndex < 0) return;

    const slot = this.actionSlots[slotIndex];
    if (!slot) return;

    slot.classList.remove("casting", "queued", "cast-success");
    slot.style.setProperty("--action-cast-progress", "0");
    this.flashActionSlotClass(slotIndex, "cast-interrupted", 620);
  }

  onPlayerCastFailed(spellId) {
    const slotIndex = this.actionSlotIndexForSpellId(spellId);
    if (slotIndex < 0) return;

    const slot = this.actionSlots[slotIndex];
    if (!slot) return;

    slot.classList.remove("casting", "queued", "cast-success");
    slot.style.setProperty("--action-cast-progress", "0");
    this.flashActionSlotClass(slotIndex, "cast-failed", 390);
  }

  onPlayerCastCancelled(spellId) {
    this.onPlayerCastFailed(spellId);
  }

  showDeathForfeit() {
    if (!this.deathForfeit || this.game.ended) return;
    this.deathForfeit.classList.remove("hidden");
  }

  hideDeathForfeit() {
    this.deathForfeit?.classList.add("hidden");
  }

  updateResultProgression() {
    const honor = this.game.honor.status();
    const talentStatus = this.game.talentStatus();
    const gearStatus = this.game.gearStatus();

    if (this.resultWallet) {
      this.resultWallet.textContent = honor.honorPoints.toLocaleString() + " HONOR";
    }

    if (honor.nextRank) {
      if (this.resultProgressFill) {
        this.resultProgressFill.style.width = (honor.progress * 100).toFixed(1) + "%";
      }
      if (this.resultProgressText) {
        this.resultProgressText.textContent =
          honor.progressHonor.toLocaleString()
          + " / " + honor.neededHonor.toLocaleString();
      }
      if (this.resultNextRank) {
        this.resultNextRank.textContent =
          "Next: Rank " + honor.nextRank.rank;
      }
    } else {
      if (this.resultProgressFill) this.resultProgressFill.style.width = "100%";
      if (this.resultProgressText) this.resultProgressText.textContent = "MAX RANK";
      if (this.resultNextRank) this.resultNextRank.textContent = "Rank 20 reached";
    }

    if (this.resultAdvice) {
      const notices = [];

      if (talentStatus.availablePoints > 0) {
        notices.push(
          talentStatus.availablePoints === 1
            ? "UNSPENT TALENT POINT"
            : talentStatus.availablePoints + " UNSPENT TALENT POINTS",
        );
      }

      const affordableGear = gearStatus.available
        ? gearStatus.items.filter(item => !item.owned && item.purchase?.ok)
        : [];

      if (affordableGear.length > 0) {
        notices.push(
          affordableGear.length === 1
            ? "GEAR AVAILABLE"
            : affordableGear.length + " GEAR UPGRADES AVAILABLE",
        );
      }

      this.resultAdvice.hidden = notices.length === 0;
      this.resultAdvice.textContent = notices.length > 0
        ? "CHECK BEFORE NEXT MATCH · " + notices.join(" · ")
        : "";
    }
  }

  setResult(title, honorAward = null, ratingAward = null) {
    this.playerCcAlert.classList.add("hidden");
    this.playerCcAlert.classList.remove("fear", "incapacitate", "stun", "root", "school-lock");
    this.resultTitle.textContent = title;

    if (honorAward) {
      const ratingText = ratingAward
        ? " · RATING "
          + (ratingAward.change >= 0 ? "+" : "")
          + ratingAward.change
          + " → " + ratingAward.after
        : "";
      this.resultHonor.textContent =
        "+" + honorAward.honor + " HONOR" + ratingText;

      if (honorAward.rankedUp) {
        this.resultRankUp.hidden = false;
        this.resultRankUp.textContent =
          "RANK UP · RANK " + honorAward.rankAfter
          + " · +" + honorAward.talentPointsGained
          + " TALENT POINT" + (honorAward.talentPointsGained === 1 ? "" : "S");
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
    this.updateResultProgression();

    if (this.gearModal && !this.gearModal.classList.contains("hidden")) {
      this.renderGear();
    }
    this.result.classList.remove("hidden");
  }

  clearResult() {
    this.result.classList.add("hidden");
    this.resultHonor.textContent = "";
    this.resultRankUp.hidden = true;
    this.resultRankUp.textContent = "";
    if (this.resultAdvice) {
      this.resultAdvice.hidden = true;
      this.resultAdvice.textContent = "";
    }
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

  async copyAiMovementReport() {
    const report = this.game.buildAiMovementReport();

    try {
      await navigator.clipboard.writeText(report);
      this.toast("AI movement log copied");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = report;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      this.toast("AI movement log copied");
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
