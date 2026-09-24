import { DEFAULT_BINDINGS } from "./constants.js";

const STORAGE_KEY = "arena3v3-bindings-v3";
const LEGACY_STORAGE_KEY = "arena3v3-bindings-v2";

function printableCode(code) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);

  const replacements = {
    Space: "SPACE",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ShiftLeft: "L-SHIFT",
    ShiftRight: "R-SHIFT",
    ControlLeft: "L-CTRL",
    ControlRight: "R-CTRL",
  };
  return replacements[code] || code.toUpperCase();
}

function isTextEntryTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.matches("input, textarea, select")) return true;
  return Boolean(target.closest("[contenteditable='true'], [contenteditable='']"));
}

export class InputManager {
  constructor() {
    this.keysDown = new Set();
    this.bindings = this.loadBindings();
    this.actionHandler = null;
    this.capture = null;

    window.addEventListener("keydown", event => this.onKeyDown(event));
    window.addEventListener("keyup", event => this.keysDown.delete(event.code));
    window.addEventListener("blur", () => this.keysDown.clear());
  }

  loadBindings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (stored) return { ...DEFAULT_BINDINGS, ...stored };

      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (!legacy) return { ...DEFAULT_BINDINGS };

      const migrated = { ...DEFAULT_BINDINGS };

      for (const action of ["moveUp", "moveLeft", "moveDown", "moveRight", "party1", "party2", "party3"]) {
        if (legacy[action]) migrated[action] = legacy[action];
      }

      for (let slot = 1; slot <= 5; slot += 1) {
        if (legacy["spell" + slot]) migrated["slot" + slot] = legacy["spell" + slot];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      return { ...DEFAULT_BINDINGS };
    }
  }

  saveBindings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
  }

  onKeyDown(event) {
    if (this.capture) {
      event.preventDefault();
      if (event.code === "Escape") {
        const callback = this.capture.callback;
        this.capture = null;
        callback(null);
        return;
      }

      this.rebind(this.capture.action, event.code);
      const callback = this.capture.callback;
      this.capture = null;
      callback(event.code);
      return;
    }

    if (isTextEntryTarget(event.target)) return;

    this.keysDown.add(event.code);
    const action = Object.entries(this.bindings).find(([, code]) => code === event.code)?.[0];
    if (!action || action.startsWith("move")) return;

    event.preventDefault();
    if (!event.repeat) this.actionHandler?.(action);
  }

  setActionHandler(handler) {
    this.actionHandler = handler;
  }

  isHeld(action) {
    return this.keysDown.has(this.bindings[action]);
  }

  movementVector() {
    return {
      x: (this.isHeld("moveRight") ? 1 : 0) - (this.isHeld("moveLeft") ? 1 : 0),
      y: (this.isHeld("moveDown") ? 1 : 0) - (this.isHeld("moveUp") ? 1 : 0),
    };
  }

  captureNext(action, callback) {
    this.capture = { action, callback };
  }

  rebind(action, code) {
    const currentCode = this.bindings[action];
    const duplicateAction = Object.entries(this.bindings)
      .find(([otherAction, otherCode]) => otherAction !== action && otherCode === code)?.[0];

    if (duplicateAction) this.bindings[duplicateAction] = currentCode;
    this.bindings[action] = code;
    this.saveBindings();
  }

  reset() {
    this.bindings = { ...DEFAULT_BINDINGS };
    this.saveBindings();
  }

  label(action) {
    return printableCode(this.bindings[action]);
  }
}
