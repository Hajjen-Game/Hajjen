import { BINDING_LABELS } from "../core/constants.js";
import { clamp, formatTime } from "../core/utils.js";
import { createActionSlot, createUnitFrame } from "./components.js";

export class UIManager {
  constructor(game, input) {
    this.game = game;
    this.input = input;
    this.frameElements = new Map();
    this.actionSlots = [];
    this.logLines = [];
    this.toastTimer = null;

    this.teamFrames = document.querySelector("#team-frames");
    this.enemyFrames = document.querySelector("#enemy-frames");
    this.actionBar = document.querySelector("#action-bar");
    this.matchClock = document.querySelector("#match-clock");
    this.combatLog = document.querySelector("#combat-log");
    this.toastElement = document.querySelector("#toast");
    this.result = document.querySelector("#match-result");
    this.resultTitle = document.querySelector("#match-result-title");
    this.playerCast = document.querySelector("#player-cast");
    this.playerCastLabel = document.querySelector("#player-cast-label");
    this.playerCastFill = document.querySelector("#player-cast-fill");
    this.controlsModal = document.querySelector("#controls-modal");
    this.bindingList = document.querySelector("#binding-list");

    document.querySelector("#restart-button").addEventListener("click", () => game.reset());
    document.querySelector("#result-restart-button").addEventListener("click", () => game.reset());
    document.querySelector("#controls-button").addEventListener("click", () => this.openControls());
    document.querySelector("#controls-close").addEventListener("click", () => this.closeControls());
    document.querySelector("#reset-bindings").addEventListener("click", () => {
      this.input.reset(); this.renderBindings(); this.refreshActionKeycaps();
    });

    this.buildFrames();
    this.buildActionBar();
    this.renderBindings();
  }

  buildFrames() {
    this.teamFrames.innerHTML = "";
    this.enemyFrames.innerHTML = "";
    this.frameElements.clear();
    for (const actor of this.game.actors) {
      const frame = createUnitFrame(actor, id => this.game.selectTarget(id));
      (actor.team === "friendly" ? this.teamFrames : this.enemyFrames).appendChild(frame);
      this.frameElements.set(actor.id, frame);
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
    const keyButton = [...document.querySelectorAll(".binding-key")].find(button => button.dataset.action === action);
    if (keyButton) keyButton.classList.add("capturing");
    this.toast("Press a key for " + BINDING_LABELS[action] + " · Esc cancels");
    this.input.captureNext(action, () => { this.renderBindings(); this.refreshActionKeycaps(); });
  }

  openControls() { this.controlsModal.classList.remove("hidden"); this.renderBindings(); }
  closeControls() { this.controlsModal.classList.add("hidden"); }

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
      const pct = clamp(actor.healthPct, 0, 1);
      frame.querySelector(".frame-health").style.width = (pct * 100) + "%";
      frame.querySelector(".frame-value").textContent = actor.alive
        ? Math.ceil(actor.health) + " / " + actor.maxHealth
        : "DOWN";
      frame.classList.toggle("dead", !actor.alive);
      frame.classList.toggle("targeted", this.game.player.targetId === actor.id);

      const castTrack = frame.querySelector(".frame-cast");
      const castFill = castTrack.querySelector("div");
      if (actor.cast) {
        castTrack.classList.add("active");
        castFill.style.width = ((1 - actor.cast.remainingMs / actor.cast.totalMs) * 100) + "%";
      } else castTrack.classList.remove("active");
    }

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
      slot.classList.toggle("disabled", !this.game.combat.canTarget(this.game.player, target, spell) || !this.game.player.alive);
    });

    if (this.game.player.cast) {
      const spell = this.game.player.getSpell(this.game.player.cast.spellId);
      this.playerCast.classList.remove("hidden");
      this.playerCastLabel.textContent = spell?.name || "Casting";
      this.playerCastFill.style.width = ((1 - this.game.player.cast.remainingMs / this.game.player.cast.totalMs) * 100) + "%";
    } else this.playerCast.classList.add("hidden");
  }

  setResult(title) { this.resultTitle.textContent = title; this.result.classList.remove("hidden"); }
  clearResult() { this.result.classList.add("hidden"); }

  addLog(text) {
    this.logLines.unshift(text);
    this.logLines = this.logLines.slice(0, 6);
    this.combatLog.innerHTML = this.logLines.map(line => '<div class="log-line">' + line + "</div>").join("");
  }

  clearLog() { this.logLines = []; this.combatLog.innerHTML = ""; }

  toast(message) {
    this.toastElement.textContent = message;
    this.toastElement.classList.add("visible");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastElement.classList.remove("visible"), 1200);
  }
}
