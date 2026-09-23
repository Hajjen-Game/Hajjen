import { BINDING_LABELS } from "../core/constants.js";
import { clamp, formatTime } from "../core/utils.js";
import { createActionSlot, createUnitFrame } from "./components.js";

export class UIManager {
  constructor(game, input) {
    this.game = game;
    this.input = input;
    this.frameElements = new Map();
    this.meterElements = new Map();
    this.actionSlots = [];
    this.logLines = [];
    this.toastTimer = null;

    this.teamFrames = document.querySelector("#team-frames");
    this.enemyFrames = document.querySelector("#enemy-frames");
    this.damageMeter = document.querySelector("#damage-meter");
    this.actionBar = document.querySelector("#action-bar");
    this.matchClock = document.querySelector("#match-clock");
    this.combatLog = document.querySelector("#combat-log");
    this.toastElement = document.querySelector("#toast");
    this.result = document.querySelector("#match-result");
    this.resultTitle = document.querySelector("#match-result-title");
    this.playerCast = document.querySelector("#player-cast");
    this.playerCastLabel = document.querySelector("#player-cast-label");
    this.playerCastFill = document.querySelector("#player-cast-fill");

    this.playerResourceLabel = document.querySelector("#player-resource-label");
    this.playerResourceValue = document.querySelector("#player-resource-value");
    this.playerResourceFill = document.querySelector("#player-resource-fill");

    this.controlsModal = document.querySelector("#controls-modal");
    this.bindingList = document.querySelector("#binding-list");

    document.querySelector("#restart-button").addEventListener("click", () => game.reset());
    document.querySelector("#result-restart-button").addEventListener("click", () => game.reset());
    document.querySelector("#controls-button").addEventListener("click", () => this.openControls());
    document.querySelector("#controls-close").addEventListener("click", () => this.closeControls());

    document.querySelector("#reset-bindings").addEventListener("click", () => {
      this.input.reset();
      this.renderBindings();
      this.refreshActionKeycaps();
      this.refreshPartyKeycaps();
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

    for (const actor of this.game.actors.filter(unit => unit.team === "friendly")) {
      const row = document.createElement("div");
      row.className = "meter-row";
      row.innerHTML = `
        <span class="meter-name"></span>
        <span class="meter-value">0</span>
        <div class="meter-track"><div class="meter-fill"></div></div>
      `;
      row.querySelector(".meter-name").textContent = actor.name;
      this.damageMeter.appendChild(row);
      this.meterElements.set(actor.id, row);
    }
  }

  buildActionBar() {
    this.actionBar.innerHTML = "";

    this.actionSlots = this.game.player.spells.map((spell, index) => {
      const slot = createActionSlot(
        spell,
        index,
        spellIndex => this.game.castPlayerSpell(spellIndex),
        spellIndex => this.captureBinding("spell" + (spellIndex + 1)),
      );

      this.actionBar.appendChild(slot);
      return slot;
    });

    this.refreshActionKeycaps();
  }

  refreshActionKeycaps() {
    this.actionSlots.forEach((slot, index) => {
      slot.querySelector(".keycap").textContent = this.input.label("spell" + (index + 1));
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
      this.refreshPartyKeycaps();
    });
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
    this.matchClock.textContent = formatTime(this.game.elapsedSeconds);

    for (const actor of this.game.actors) {
      const frame = this.frameElements.get(actor.id);
      if (!frame) continue;

      const healthPct = clamp(actor.healthPct, 0, 1);
      frame.querySelector(".frame-health").style.width = (healthPct * 100) + "%";
      frame.querySelector(".frame-value").textContent = actor.alive
        ? Math.ceil(actor.health) + " / " + actor.maxHealth
        : "DOWN";

      const resourceFill = frame.querySelector(".frame-resource-fill");
      resourceFill.className = "frame-resource-fill " + actor.resource.type;
      resourceFill.style.width = (clamp(actor.resourcePct, 0, 1) * 100) + "%";

      frame.classList.toggle("dead", !actor.alive);
      frame.classList.toggle("targeted", this.game.player.targetId === actor.id);

      this.renderEffects(frame, actor);

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
    this.updatePlayerResource();

    this.game.player.spells.forEach((spell, index) => {
      const slot = this.actionSlots[index];
      const cooldown = this.game.player.cooldownFor(spell.id);
      const overlay = slot.querySelector(".cooldown");

      if (cooldown > 0) {
        overlay.classList.add("active");
        overlay.textContent = (cooldown / 1000).toFixed(cooldown > 9500 ? 0 : 1);
      } else {
        overlay.classList.remove("active");
        overlay.textContent = "";
      }

      const target = this.game.getActor(this.game.player.targetId);
      const invalidTarget = !this.game.combat.canTarget(this.game.player, target, spell);
      const noResource = !this.game.resources.canPay(this.game.player, spell);
      slot.classList.toggle("disabled", invalidTarget || noResource || !this.game.player.alive);
    });

    if (this.game.player.cast) {
      const spell = this.game.player.getSpell(this.game.player.cast.spellId);
      this.playerCast.classList.remove("hidden");
      this.playerCastLabel.textContent = spell?.name || "Casting";
      this.playerCastFill.style.width =
        ((1 - this.game.player.cast.remainingMs / this.game.player.cast.totalMs) * 100) + "%";
    } else {
      this.playerCast.classList.add("hidden");
    }
  }

  renderEffects(frame, actor) {
    const container = frame.querySelector(".frame-effects");
    const visible = actor.effects
      .filter(effect => effect.remainingMs > 0)
      .sort((a, b) => a.remainingMs - b.remainingMs)
      .slice(0, 5);

    container.innerHTML = "";

    for (const effect of visible) {
      const badge = document.createElement("span");
      const kind = effect.kind === "hot" ? "hot" : effect.kind === "dot" ? "dot" : "buff";
      badge.className = "effect-badge " + kind;

      const source = this.game.getActor(effect.sourceId);
      const spell = source?.getSpell(effect.spellId);
      const letter = effect.kind === "hot" ? "H" : effect.kind === "dot" ? "D" : "B";
      badge.textContent = letter + " " + Math.ceil(effect.remainingMs / 1000);
      badge.title = (spell?.name || effect.spellId) + " · " + Math.ceil(effect.remainingMs / 1000) + "s";

      container.appendChild(badge);
    }
  }

  updateDamageMeter() {
    const friendly = this.game.actors.filter(actor => actor.team === "friendly");
    const values = friendly.map(actor => this.game.matchStats.get(actor.id)?.damage || 0);
    const max = Math.max(1, ...values);

    friendly.forEach((actor, index) => {
      const row = this.meterElements.get(actor.id);
      if (!row) return;

      row.querySelector(".meter-value").textContent = Math.round(values[index]).toLocaleString();
      row.querySelector(".meter-fill").style.width = ((values[index] / max) * 100) + "%";
    });
  }

  updatePlayerResource() {
    const resource = this.game.player.resource;
    this.playerResourceLabel.textContent = resource.type.toUpperCase();
    this.playerResourceValue.textContent =
      Math.floor(resource.value) + " / " + resource.max;

    this.playerResourceFill.className = "player-resource-fill " + resource.type;
    this.playerResourceFill.style.width = (clamp(this.game.player.resourcePct, 0, 1) * 100) + "%";
  }

  pulseAction(index, success) {
    const slot = this.actionSlots[index];
    if (!slot) return;

    slot.classList.remove("pressed", "rejected");
    void slot.offsetWidth;
    slot.classList.add(success ? "pressed" : "rejected");

    window.setTimeout(() => {
      slot.classList.remove("pressed", "rejected");
    }, 170);
  }

  setResult(title) {
    this.resultTitle.textContent = title;
    this.result.classList.remove("hidden");
  }

  clearResult() {
    this.result.classList.add("hidden");
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
