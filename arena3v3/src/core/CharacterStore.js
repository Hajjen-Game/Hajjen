const STORAGE_KEY = "arena3v3-characters-v1";

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "char-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

export class CharacterStore {
  constructor() {
    this.characters = this.load();
  }

  load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(stored)) return [];

      return stored
        .filter(item => item && item.id && item.name && item.healerClass)
        .map(item => ({
          id: String(item.id),
          name: cleanName(item.name).slice(0, 18),
          healerClass: String(item.healerClass),
          createdAt: Number(item.createdAt) || Date.now(),
          lastPlayedAt: Number(item.lastPlayedAt) || 0,
        }))
        .slice(0, 12);
    } catch {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.characters));
    } catch {
      // Character selection should still work for the current session.
    }
  }

  all() {
    return [...this.characters].sort((a, b) =>
      (b.lastPlayedAt || b.createdAt) - (a.lastPlayedAt || a.createdAt)
    );
  }

  get(id) {
    return this.characters.find(character => character.id === id) || null;
  }

  create({ name, healerClass }) {
    const cleaned = cleanName(name);

    if (cleaned.length < 2 || cleaned.length > 18) {
      throw new Error("Name must be 2–18 characters.");
    }

    if (this.characters.some(character =>
      character.name.toLocaleLowerCase() === cleaned.toLocaleLowerCase()
    )) {
      throw new Error("That character name already exists.");
    }

    if (this.characters.length >= 12) {
      throw new Error("Character limit reached.");
    }

    const now = Date.now();
    const character = {
      id: newId(),
      name: cleaned,
      healerClass,
      createdAt: now,
      lastPlayedAt: now,
    };

    this.characters.push(character);
    this.save();
    return character;
  }

  touch(id) {
    const character = this.get(id);
    if (!character) return null;

    character.lastPlayedAt = Date.now();
    this.save();
    return character;
  }
}
