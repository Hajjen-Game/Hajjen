import { DEFAULT_BINDINGS } from "./constants.js";

const STORAGE_KEY = "arena3v3-bindings-v3";
const LEGACY_STORAGE_KEY = "arena3v3-bindings-v2";

const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
]);

function printableCode(code) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);

  const replacements = {
    Space: "SPACE",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ShiftLeft: "SHIFT",
    ShiftRight: "SHIFT",
    ControlLeft: "CTRL",
    ControlRight: "CTRL",
    AltLeft: "ALT",
    AltRight: "ALT",
  };
  return replacements[code] || code.toUpperCase();
}

function isModifierCode(code) {
  return MODIFIER_CODES.has(code);
}

function modifiersFromEvent(event) {
  const modifiers = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.altKey) modifiers.push("Alt");
  return modifiers;
}

function bindingFromEvent(event) {
  if (isModifierCode(event.code)) return null;
  return [...modifiersFromEvent(event), event.code].join("+");
}

function bindingParts(binding) {
  const parts = String(binding || "").split("+").filter(Boolean);
  const baseCode = parts.pop() || "";
  return {
    baseCode,
    ctrl: parts.includes("Ctrl"),
    shift: parts.includes("Shift"),
    alt: parts.includes("Alt"),
  };
}

function printableBinding(binding, compact = false) {
  const { baseCode, ctrl, shift, alt } = bindingParts(binding);
  const labels = [];
  if (ctrl) labels.push(compact ? "C" : "Ctrl");
  if (shift) labels.push(compact ? "S" : "Shift");
  if (alt) labels.push(compact ? "A" : "Alt");
  if (baseCode) labels.push(printableCode(baseCode));
  return labels.join("+") || "—";
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

      // Modifier keys arm the chord but do not complete capture by themselves.
      // Example: Ctrl keydown -> W keydown captures "Ctrl+KeyW".
      if (isModifierCode(event.code)) return;

      const binding = bindingFromEvent(event);
      if (!binding) return;

      this.rebind(this.capture.action, binding);
      const callback = this.capture.callback;
      this.capture = null;
      callback(binding);
      return;
    }

    if (isTextEntryTarget(event.target)) return;

    this.keysDown.add(event.code);

    const binding = bindingFromEvent(event);
    if (!binding) return;

    const action = Object.entries(this.bindings)
      .find(([, configuredBinding]) => configuredBinding === binding)?.[0];

    if (!action || action.startsWith("move")) return;

    event.preventDefault();
    if (!event.repeat) this.actionHandler?.(action);
  }

  setActionHandler(handler) {
    this.actionHandler = handler;
  }

  activeModifiers() {
    return {
      ctrl: this.keysDown.has("ControlLeft") || this.keysDown.has("ControlRight"),
      shift: this.keysDown.has("ShiftLeft") || this.keysDown.has("ShiftRight"),
      alt: this.keysDown.has("AltLeft") || this.keysDown.has("AltRight"),
    };
  }

  isHeld(action) {
    const { baseCode, ctrl, shift, alt } = bindingParts(this.bindings[action]);
    if (!baseCode || !this.keysDown.has(baseCode)) return false;

    const active = this.activeModifiers();

    // Movement and any future hold action only fires for its exact chord.
    // This prevents Ctrl+W from also triggering a plain W movement bind.
    return active.ctrl === ctrl
      && active.shift === shift
      && active.alt === alt;
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

  cancelCapture() {
    if (!this.capture) return false;

    const callback = this.capture.callback;
    this.capture = null;
    callback?.(null);
    return true;
  }

  rebind(action, binding) {
    const currentBinding = this.bindings[action];
    const duplicateAction = Object.entries(this.bindings)
      .find(([otherAction, otherBinding]) =>
        otherAction !== action && otherBinding === binding
      )?.[0];

    if (duplicateAction) this.bindings[duplicateAction] = currentBinding;
    this.bindings[action] = binding;
    this.saveBindings();
  }

  reset() {
    this.bindings = { ...DEFAULT_BINDINGS };
    this.saveBindings();
  }

  label(action, compact = false) {
    return printableBinding(this.bindings[action], compact);
  }
}
