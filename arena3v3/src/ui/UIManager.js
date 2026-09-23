import { BINDING_LABELS } from "../core/constants.js";
import { clamp, formatTime } from "../core/utils.js";
import { createActionSlot, createUnitFrame } from "./components.js";
import { classColorFor } from "../content/classes/classColors.js";

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
    this.dampeningIndicator = document.querySelector("#dampening-indicator");
    this.dampeningValue = document.querySelector("#dampening-value");
    this.dampeningNext = document.querySelector("#dampening-next");
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

    this.playerCcAlert = document.querySelector("#player-cc-alert");
    this.playerCcTitle = document.querySelector("#player-cc-title");
    this.playerCcTime = document.querySelector("#player-cc-time");
    this.playerCcSource = document.querySelector("#player-cc-source");

    this.controlsModal = document.querySelector("#controls-modal");
    this.bindingList = document.querySelector("#binding-list");
    this.restartButton = document.querySelector("#restart-button");
    this.restartConfirmTimer = null;
    this.restartArmed = false;

    this.restartButton.addEventListener("click", event => this.handleRestartClick(event));
    document.querySelector("#result-restart-button").addEventListener("click", () => game.reset("play again after match"));
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

  handleRestartClick(event) {
    // Ignore keyboard-generated button activation. In a WASD/action-key game,
    // a focused HUD button should never be able to restart the match.
    if (event.detail === 0) {
      this.toast("Restart requires two mouse clicks");
      return;
    }

    if (!this.restartArmed) {
      this.restartArmed = true;
      this.restartButton.textContent = "CONFIRM RESTART";
      this.restartButton.classList.add("primary");
      this.toast("Click RESTART again to confirm");

      window.clearTimeout(this.restartConfirmTimer);
      this.restartConfirmTimer = window.setTimeout(() => {
        this.disarmRestart();
      }, 2200);
      return;
    }

    this.disarmRestart();
    this.game.reset("manual restart button");
  }

  disarmRestart() {
    this.restartArmed = false;
    window.clearTimeout(this.restartConfirmTimer);
    this.restartConfirmTimer = null;

    if (this.restartButton) {
      this.restartButton.textContent = "RESTART";
      this.restartButton.classList.remove("primary");
    }
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
    this.updatePlayerCcAlert();
    this.updateDampening();

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

      const selectedTarget = this.game.getActor(this.game.player.targetId);
      const target = spell.target === "self" ? this.game.player : selectedTarget;
      const invalidTarget = !this.game.combat.canTarget(this.game.player, target, spell);
      const noResource = !this.game.resources.canPay(this.game.player, spell);
      const controlled = this.game.cc.isHardControlled(this.game.player);
      const schoolLocked = this.game.cc.isSchoolLocked(this.game.player, spell);

      slot.classList.toggle(
        "disabled",
        invalidTarget || noResource || controlled || schoolLocked || !this.game.player.alive,
      );
      slot.classList.toggle("queued", this.game.abilityQueue?.queuedIndex === index);
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

    const effect = this.game.player.effects
      .filter(item => item.remainingMs > 0 && supportedKinds.includes(item.kind))
      .sort((a, b) => priority[a.kind] - priority[b.kind])[0];

    const alertClasses = ["fear", "incapacitate", "stun", "root", "school-lock"];

    if (!effect || !this.game.player.alive) {
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

  pulseQueuedAction(index) {
    const slot = this.actionSlots[index];
    if (!slot) return;

    slot.classList.remove("rejected");
    slot.classList.add("queued");
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
