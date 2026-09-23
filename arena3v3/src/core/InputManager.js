import { DEFAULT_BINDINGS } from "./constants.js";

const STORAGE_KEY = "arena3v3-bindings-v2";

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
      return { ...DEFAULT_BINDINGS, ...(stored || {}) };
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
