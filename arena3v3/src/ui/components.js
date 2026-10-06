import { classIconUrlFor } from "../rendering/ClassIconRegistry.js?v=20260929-unitframes1";

function seconds(ms) {
  return (ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1) + "s";
}

function effectSummary(effect) {
  switch (effect.kind) {
    case "heal":
      return "Heal " + effect.amount;
    case "hot":
      return "HoT " + effect.amount + " / " + seconds(effect.tickMs) + " · " + seconds(effect.durationMs);
    case "damage":
      return "Damage " + effect.amount;
    case "chainDamage":
      return "Chain damage " + effect.amount + " · up to " + (effect.maxTargets || 3);
    case "dot":
      return "DoT " + effect.amount + " / " + seconds(effect.tickMs) + " · " + seconds(effect.durationMs);
    case "damageReduction":
      return Math.round((effect.value || 0) * 100) + "% less damage · " + seconds(effect.durationMs);
    case "absorb":
      return "Absorb " + effect.amount + " · " + seconds(effect.durationMs);
    case "lifeGrip":
      return "Pull ally to you";
    case "groundBarrier":
      return "Ground barrier · " + Math.round((effect.value || 0) * 100)
        + "% less damage · " + seconds(effect.durationMs);
    case "healingReduction":
      return Math.round((effect.value || 0) * 100) + "% healing reduction · " + seconds(effect.durationMs);
    case "fear":
      return "Fear · " + seconds(effect.durationMs);
    case "fearAoE":
      return "AoE Fear · " + seconds(effect.durationMs);
    case "incapacitate":
      return "Incapacitate · " + seconds(effect.durationMs);
    case "stun":
      return "Stun · " + seconds(effect.durationMs);
    case "root":
      return "Root · " + seconds(effect.durationMs);
    case "rootAoE":
      return "AoE Root · " + seconds(effect.durationMs);
    case "interrupt":
      return "Interrupt · lock " + seconds(effect.lockMs || effect.durationMs || 0);
    case "gapClose":
      return "Gap closer";
    default:
      return "";
  }
}

function spellEffectSummary(spell) {
  return (spell.effects || [])
    .map(effectSummary)
    .filter(Boolean)
    .join(" + ");
}

const ACTION_ICONS = Object.freeze({
  "priest-renew": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring" cx="32" cy="32" r="22"></circle>
      <path class="icon-line" d="M32 17 V47 M20 32 H44"></path>
      <path class="icon-line icon-soft" d="M17 21 C12 30 14 41 22 48 M47 21 C52 30 50 41 42 48"></path>
      <path class="icon-fill" d="M32 8 L35 14 L41 17 L35 20 L32 26 L29 20 L23 17 L29 14 Z"></path>
    </svg>
  `,
  "priest-flash-heal": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring icon-soft" cx="32" cy="32" r="22"></circle>
      <path class="icon-fill" d="M32 8 L38 26 L56 32 L38 38 L32 56 L26 38 L8 32 L26 26 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="5"></circle>
    </svg>
  `,
  "priest-greater-heal": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring" cx="32" cy="32" r="13"></circle>
      <circle class="icon-core" cx="32" cy="32" r="7"></circle>
      <path class="icon-fill" d="M32 4 L36 17 L44 7 L43 21 L56 14 L47 25 L61 24 L48 31 L60 38 L46 37 L54 50 L42 42 L41 57 L34 44 L28 59 L27 44 L15 53 L21 40 L7 43 L18 34 L4 29 L18 27 L8 16 L22 22 L20 8 L29 19 Z"></path>
    </svg>
  `,
  "priest-pain-suppression": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-shield" d="M32 7 L52 15 V31 C52 44 44 54 32 59 C20 54 12 44 12 31 V15 Z"></path>
      <path class="icon-line" d="M32 20 V45 M20 32 H44"></path>
      <path class="icon-ring icon-soft" d="M8 19 A28 28 0 0 1 16 9 M56 19 A28 28 0 0 0 48 9"></path>
    </svg>
  `,
  "priest-psychic-scream": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-head" cx="32" cy="28" r="8"></circle>
      <path class="icon-fill" d="M22 51 C23 41 27 36 32 36 C37 36 41 41 42 51 Z"></path>
      <path class="icon-line" d="M18 18 C11 24 11 36 18 42 M12 12 C1 22 1 42 12 52 M46 18 C53 24 53 36 46 42 M52 12 C63 22 63 42 52 52"></path>
    </svg>
  `,
  "priest-smite": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring icon-soft" cx="32" cy="32" r="20"></circle>
      <path class="icon-fill" d="M34 7 L29 26 L42 24 L24 55 L29 35 L17 38 Z"></path>
      <circle class="icon-core" cx="42" cy="17" r="4"></circle>
    </svg>
  `,
  "priest-holy-fire": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-fill" d="M34 6 C39 17 49 22 47 35 C46 48 39 57 28 57 C17 57 10 49 12 38 C14 28 23 24 24 13 C29 17 31 22 30 28 C37 23 38 15 34 6 Z"></path>
      <path class="icon-line" d="M31 31 C36 36 36 45 30 49 C24 47 22 42 24 37 C25 34 28 32 31 31 Z"></path>
    </svg>
  `,
  "priest-penance": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring icon-soft" cx="18" cy="32" r="8"></circle>
      <path class="icon-line" d="M24 24 L50 12 M26 32 L55 32 M24 40 L50 52"></path>
      <circle class="icon-core" cx="52" cy="12" r="4"></circle>
      <circle class="icon-core" cx="56" cy="32" r="4"></circle>
      <circle class="icon-core" cx="52" cy="52" r="4"></circle>
    </svg>
  `,
  "priest-life-grip": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="icon-ring icon-soft" cx="32" cy="32" r="22"></circle>
      <path class="icon-line" d="M10 32 H42 M34 22 L45 32 L34 42"></path>
      <path class="icon-shield" d="M46 14 L56 19 V29 C56 37 52 43 46 46 C40 43 36 37 36 29 V19 Z"></path>
    </svg>
  `,
  "priest-power-word-shield": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-shield" d="M32 6 L53 15 V31 C53 45 44 55 32 59 C20 55 11 45 11 31 V15 Z"></path>
      <path class="icon-line" d="M32 17 V47 M18 32 H46"></path>
      <circle class="icon-ring icon-soft" cx="32" cy="32" r="21"></circle>
    </svg>
  `,
  "priest-power-word-barrier": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M8 43 C13 20 22 10 32 10 C42 10 51 20 56 43"></path>
      <ellipse class="icon-ring" cx="32" cy="44" rx="24" ry="9"></ellipse>
      <path class="icon-line icon-soft" d="M32 13 V46 M18 24 L46 45 M46 24 L18 45"></path>
      <circle class="icon-core" cx="32" cy="31" r="4"></circle>
    </svg>
  `,
  "warrior-rend": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M18 12 L42 36 M28 9 L49 30 M12 24 L33 45"></path>
      <path class="icon-secondary" d="M42 37 C48 40 52 46 50 53 C43 54 37 50 34 44 Z"></path>
    </svg>
  `,
  "warrior-mortal-strike": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M17 49 L47 15 M14 16 L48 50"></path>
      <path class="icon-secondary" d="M44 11 L54 10 L51 20 Z M10 12 L20 14 L13 22 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="5"></circle>
    </svg>
  `,
  "warrior-slam": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M25 9 H39 L43 27 L36 34 H28 L21 27 Z"></path>
      <path class="icon-line" d="M32 34 V48 M21 49 H43"></path>
      <path class="icon-line icon-soft" d="M13 42 L20 37 M51 42 L44 37 M17 54 L24 49 M47 54 L40 49"></path>
    </svg>
  `,
  "warrior-charge": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M37 10 L55 32 L37 54 V42 H22 V22 H37 Z"></path>
      <path class="icon-line icon-soft" d="M10 20 H24 M7 32 H22 M10 44 H24"></path>
    </svg>
  `,
  "warrior-pummel": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M18 28 L22 15 L29 13 L32 19 L36 12 L43 14 L45 22 L51 24 L49 36 L42 46 L29 51 L18 44 Z"></path>
      <path class="icon-line" d="M22 29 H43 M28 22 L29 31 M36 19 L36 31 M43 23 L42 32"></path>
    </svg>
  `,
  "warrior-overpower": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M13 49 L48 14 M17 14 L50 47"></path>
      <path class="icon-secondary" d="M39 10 L55 9 L51 25 Z M9 39 L25 53 L9 55 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="6"></circle>
    </svg>
  `,
  "warrior-bloodthirst": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M32 6 C41 18 50 27 48 39 C47 51 40 58 31 58 C21 58 14 50 16 40 C18 30 27 24 32 6 Z"></path>
      <path class="icon-line" d="M21 37 C27 31 35 31 43 36 M25 45 C30 49 36 49 40 44"></path>
      <path class="icon-line icon-soft" d="M12 20 L21 25 M52 19 L43 25"></path>
    </svg>
  `,
  "rogue-garrote": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M13 44 C24 27 38 18 53 15 M14 50 C28 36 39 28 53 24"></path>
      <path class="icon-secondary" d="M10 39 L18 47 L12 55 L5 47 Z"></path>
    </svg>
  `,
  "rogue-sinister": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M13 48 C22 26 36 15 52 11 C47 29 36 43 17 53"></path>
      <path class="icon-secondary" d="M44 10 L56 8 L53 20 Z"></path>
    </svg>
  `,
  "rogue-eviscerate": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M12 19 L48 51 M17 49 L52 15 M10 34 H54"></path>
      <circle class="icon-core" cx="32" cy="32" r="5"></circle>
    </svg>
  `,
  "rogue-kidney": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M32 7 L38 23 L55 18 L46 32 L58 44 L41 41 L34 57 L28 41 L11 47 L19 32 L7 21 L24 24 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="6"></circle>
    </svg>
  `,
  "rogue-kick": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-secondary" d="M18 11 H31 L35 30 L51 38 L47 52 L29 44 L21 29 Z"></path>
      <path class="icon-line" d="M31 30 L21 45 M35 31 L26 50"></path>
    </svg>
  `,
  "rogue-mutilate": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line" d="M14 52 L48 14 M16 13 L50 49"></path>
      <path class="icon-secondary" d="M44 9 L56 8 L52 20 Z M8 8 L20 11 L12 22 Z"></path>
      <circle class="icon-core" cx="32" cy="32" r="4"></circle>
    </svg>
  `,
  "rogue-shadowstep": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="icon-line icon-soft" d="M8 20 H29 M5 32 H24 M10 44 H30"></path>
      <path class="icon-secondary" d="M34 10 L56 32 L34 54 V41 H22 V23 H34 Z"></path>
    </svg>
  `,

  "mage-living-bomb": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring icon-soft" cx="32" cy="32" r="21"></circle>
        <path class="icon-fill" d="M33 8 C39 18 47 20 47 32 C47 45 40 55 29 55 C18 55 11 47 13 37 C15 28 24 24 25 14 C29 18 31 22 30 28 C36 23 37 15 33 8 Z"></path>
        <circle class="icon-core" cx="43" cy="18" r="4"></circle>
      </svg>
  `,
  "mage-frostbolt": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-fill" d="M10 35 L42 14 L36 30 L54 28 L22 52 L28 36 Z"></path>
        <path class="icon-line icon-soft" d="M14 18 L50 46 M19 49 L47 18"></path>
        <circle class="icon-core" cx="45" cy="15" r="4"></circle>
      </svg>
  `,
  "mage-pyroblast": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring icon-soft" cx="33" cy="33" r="19"></circle>
        <path class="icon-fill" d="M34 7 C41 17 51 24 49 37 C47 50 39 57 29 56 C18 55 11 46 14 35 C17 24 26 22 27 12 C31 17 32 22 31 28 C38 23 39 14 34 7 Z"></path>
        <path class="icon-line" d="M12 49 L22 43 M46 18 L54 11"></path>
      </svg>
  `,
  "mage-frost-nova": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring" cx="32" cy="32" r="15"></circle>
        <path class="icon-line" d="M32 7 V57 M10 19 L54 45 M54 19 L10 45"></path>
        <path class="icon-line icon-soft" d="M32 7 L27 14 M32 7 L37 14 M10 19 L18 20 M54 19 L46 20 M10 45 L18 44 M54 45 L46 44"></path>
      </svg>
  `,
  "mage-polymorph": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M32 13 C45 13 51 25 45 35 C40 43 28 46 20 40 C12 34 13 23 21 18 C28 14 37 18 38 25 C39 31 33 35 28 32"></path>
        <path class="icon-secondary" d="M16 10 L20 17 L12 16 Z M50 13 L48 21 L55 18 Z"></path>
        <circle class="icon-core" cx="46" cy="45" r="4"></circle>
      </svg>
  `,
  "mage-frostfire-bolt": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M10 36 L33 13 L29 29 L42 27 L19 52 L24 35 Z"></path>
        <path class="icon-fill" d="M36 10 C43 19 51 25 48 36 C46 46 39 53 31 53 C35 47 36 40 33 35 C31 31 34 27 39 24 C42 20 41 15 36 10 Z"></path>
        <path class="icon-line icon-soft" d="M12 17 L51 48"></path>
      </svg>
  `,
  "mage-arcane-barrage": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring" cx="24" cy="32" r="10"></circle>
        <circle class="icon-ring icon-soft" cx="39" cy="20" r="8"></circle>
        <circle class="icon-ring icon-soft" cx="43" cy="43" r="7"></circle>
        <path class="icon-line" d="M10 32 H54 M18 18 L49 46 M18 47 L48 16"></path>
        <circle class="icon-core" cx="32" cy="32" r="4"></circle>
      </svg>
  `,
  "shaman-flame-shock": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-fill" d="M31 8 C36 19 45 22 44 34 C43 46 36 54 27 54 C18 54 12 47 14 38 C16 30 23 27 24 17 C28 21 29 26 28 31 C34 26 35 17 31 8 Z"></path>
        <path class="icon-line" d="M40 17 L54 30 L44 31 L50 43"></path>
        <circle class="icon-core" cx="45" cy="16" r="3"></circle>
      </svg>
  `,
  "shaman-chain-lightning": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M12 18 L27 29 L20 39 L35 47"></path>
        <path class="icon-line" d="M28 8 L42 22 L34 31 L52 42"></path>
        <circle class="icon-core" cx="12" cy="18" r="4"></circle>
        <circle class="icon-core" cx="35" cy="47" r="4"></circle>
        <circle class="icon-secondary" cx="52" cy="42" r="5"></circle>
      </svg>
  `,
  "shaman-lava-burst": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M13 41 L25 18 L43 14 L54 33 L43 50 L22 52 Z"></path>
        <path class="icon-line" d="M25 18 L29 31 L20 42 M43 14 L38 28 L49 36 M29 31 L39 28 L43 50"></path>
        <path class="icon-fill" d="M31 8 C38 14 42 20 40 27 C37 24 34 22 31 20 C30 16 30 12 31 8 Z"></path>
      </svg>
  `,
  "shaman-hex": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <ellipse class="icon-ring" cx="32" cy="34" rx="18" ry="13"></ellipse>
        <circle class="icon-core" cx="25" cy="31" r="3"></circle>
        <circle class="icon-core" cx="39" cy="31" r="3"></circle>
        <path class="icon-line" d="M21 22 L15 14 L25 18 M43 22 L49 14 L39 18 M24 41 C29 45 35 45 40 41"></path>
      </svg>
  `,
  "shaman-astral-shift": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-shield" d="M32 7 L51 15 V30 C51 43 43 53 32 58 C21 53 13 43 13 30 V15 Z"></path>
        <path class="icon-line" d="M35 15 L24 31 H32 L27 47 L43 26 H35 Z"></path>
      </svg>
  `,
  "shaman-elemental-blast": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring" cx="32" cy="32" r="19"></circle>
        <path class="icon-fill" d="M32 8 L37 25 L54 28 L40 37 L43 54 L32 43 L21 54 L24 37 L10 28 L27 25 Z"></path>
        <path class="icon-line icon-soft" d="M14 45 L50 18 M16 18 L49 47"></path>
      </svg>
  `,
  "shaman-stormstrike": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M16 12 L27 9 L31 18 L23 25 Z M48 12 L37 9 L33 18 L41 25 Z"></path>
        <path class="icon-line" d="M23 25 L43 50 M41 25 L21 50"></path>
        <path class="icon-fill" d="M34 20 L27 32 H33 L29 44 L40 29 H34 Z"></path>
      </svg>
  `,
  "dk-fever": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring" cx="32" cy="31" r="18"></circle>
        <path class="icon-line" d="M32 8 V54 M13 20 L51 42 M51 20 L13 42"></path>
        <path class="icon-fill" d="M25 28 H39 L36 39 H28 Z"></path>
        <circle class="icon-core" cx="28" cy="30" r="2"></circle>
        <circle class="icon-core" cx="36" cy="30" r="2"></circle>
      </svg>
  `,
  "dk-death-strike": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M15 52 L47 13 M19 14 L49 45"></path>
        <path class="icon-secondary" d="M40 8 L55 10 L48 23 Z"></path>
        <path class="icon-fill" d="M25 27 C31 22 38 24 40 30 C42 37 37 43 31 43 C24 43 20 37 22 31 Z"></path>
        <circle class="icon-core" cx="28" cy="32" r="2"></circle>
        <circle class="icon-core" cx="35" cy="32" r="2"></circle>
      </svg>
  `,
  "dk-obliterate": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M12 51 L47 12 M17 11 L52 48"></path>
        <path class="icon-secondary" d="M43 8 L56 9 L51 21 Z M8 42 L21 55 L8 56 Z"></path>
        <path class="icon-line icon-soft" d="M32 19 V46 M21 32 H44"></path>
      </svg>
  `,
  "dk-chains": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M18 20 C11 13 5 22 11 28 L20 37 C26 43 35 35 29 29 Z"></path>
        <path class="icon-line" d="M35 27 C29 21 20 29 26 35 L35 44 C42 51 51 42 45 36 Z"></path>
        <path class="icon-line icon-soft" d="M15 49 L49 15"></path>
      </svg>
  `,
  "dk-mind-freeze": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M32 7 V57 M11 20 L53 44 M53 20 L11 44"></path>
        <path class="icon-fill" d="M22 25 C23 17 42 17 43 27 C49 31 46 42 38 42 H25 C16 42 14 30 22 25 Z"></path>
        <path class="icon-line icon-soft" d="M23 32 H41"></path>
      </svg>
  `,
  "dk-frost-strike": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M16 51 L44 16 L51 13 L48 21 L22 55 Z"></path>
        <path class="icon-line" d="M35 10 V38 M23 17 L47 31 M47 17 L23 31"></path>
        <circle class="icon-core" cx="35" cy="24" r="4"></circle>
      </svg>
  `,
  "dk-rune-tap": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-shield" d="M32 7 L51 15 V31 C51 43 43 53 32 58 C21 53 13 43 13 31 V15 Z"></path>
        <path class="icon-line" d="M24 20 L40 20 L35 31 L42 42 H23 L29 31 Z"></path>
      </svg>
  `,
  "warlock-corruption": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring" cx="32" cy="32" r="20"></circle>
        <path class="icon-line" d="M17 31 C22 20 38 17 48 25 C39 25 34 30 34 36 C34 42 40 46 47 46 C35 54 18 47 17 31 Z"></path>
        <circle class="icon-core" cx="28" cy="31" r="4"></circle>
      </svg>
  `,
  "warlock-shadow-bolt": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-fill" d="M12 37 C19 19 36 12 52 18 C42 21 35 28 35 37 C35 44 39 49 46 53 C29 54 17 49 12 37 Z"></path>
        <path class="icon-line icon-soft" d="M10 45 C22 37 31 27 39 14"></path>
        <circle class="icon-core" cx="48" cy="19" r="4"></circle>
      </svg>
  `,
  "warlock-chaos-bolt": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M12 39 C18 20 35 10 53 18 C45 24 40 31 41 39 C42 45 46 49 53 52 C36 56 18 51 12 39 Z"></path>
        <path class="icon-line" d="M19 17 L29 28 L24 37 L38 46 M37 11 L43 24 L36 31 L52 39"></path>
        <circle class="icon-core" cx="31" cy="34" r="5"></circle>
      </svg>
  `,
  "warlock-resolve": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-shield" d="M32 7 L51 15 V31 C51 44 43 54 32 58 C21 54 13 44 13 31 V15 Z"></path>
        <path class="icon-line" d="M20 32 C24 24 40 24 44 32 C40 40 24 40 20 32 Z"></path>
        <circle class="icon-core" cx="32" cy="32" r="4"></circle>
      </svg>
  `,
  "warlock-fear": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M18 17 C20 9 44 9 46 17 L48 35 C48 46 41 53 32 55 C23 53 16 46 16 35 Z"></path>
        <circle class="icon-core" cx="25" cy="29" r="4"></circle>
        <circle class="icon-core" cx="39" cy="29" r="4"></circle>
        <path class="icon-line" d="M23 43 C28 37 36 37 41 43"></path>
      </svg>
  `,
  "warlock-drain-life": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring icon-soft" cx="20" cy="32" r="9"></circle>
        <circle class="icon-ring" cx="45" cy="32" r="9"></circle>
        <path class="icon-line" d="M28 28 C33 22 38 22 43 28 M28 36 C33 42 38 42 43 36"></path>
        <path class="icon-fill" d="M43 24 L54 32 L43 40 Z"></path>
      </svg>
  `,
  "warlock-conflagrate": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-fill" d="M34 6 C39 16 49 22 48 34 C47 47 39 56 28 56 C17 56 10 48 12 38 C14 28 23 25 24 14 C29 19 31 25 29 31 C37 25 39 15 34 6 Z"></path>
        <path class="icon-line" d="M8 47 L21 42 M44 18 L56 10"></path>
      </svg>
  `,
  "paladin-holy-shock": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring" cx="32" cy="32" r="16"></circle>
        <path class="icon-fill" d="M32 6 L37 22 L54 16 L44 31 L58 39 L41 41 L42 58 L32 45 L22 58 L23 41 L6 39 L20 31 L10 16 L27 22 Z"></path>
        <circle class="icon-core" cx="32" cy="32" r="5"></circle>
      </svg>
  `,
  "paladin-flash-light": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-fill" d="M32 6 L38 25 L58 32 L38 39 L32 58 L26 39 L6 32 L26 25 Z"></path>
        <path class="icon-line icon-soft" d="M15 15 L49 49 M49 15 L15 49"></path>
      </svg>
  `,
  "paladin-holy-light": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-ring" cx="32" cy="32" r="15"></circle>
        <path class="icon-line" d="M32 6 V58 M6 32 H58"></path>
        <path class="icon-line icon-soft" d="M14 14 L50 50 M50 14 L14 50"></path>
        <circle class="icon-core" cx="32" cy="32" r="6"></circle>
      </svg>
  `,
  "paladin-blessing": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-shield" d="M32 7 L51 15 V31 C51 44 43 54 32 58 C21 54 13 44 13 31 V15 Z"></path>
        <path class="icon-line" d="M32 18 V45 M21 31 H43"></path>
      </svg>
  `,
  "paladin-hammer": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M12 15 L32 7 L42 19 L24 32 Z"></path>
        <path class="icon-line" d="M25 31 L47 54 M18 38 L31 25"></path>
        <circle class="icon-core" cx="49" cy="16" r="4"></circle>
      </svg>
  `,
  "paladin-word-of-glory": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M13 24 L21 12 L31 22 L41 11 L51 24 L46 49 H18 Z"></path>
        <path class="icon-line" d="M32 20 V45 M22 32 H42"></path>
        <circle class="icon-core" cx="32" cy="32" r="5"></circle>
      </svg>
  `,
  "paladin-judgment": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-secondary" d="M17 8 L37 8 L43 21 L23 30 L13 20 Z"></path>
        <path class="icon-line" d="M28 30 L42 54"></path>
        <path class="icon-line icon-soft" d="M9 38 L20 34 M45 27 L56 22 M17 53 L25 45"></path>
      </svg>
  `,
  "druid-rejuvenation": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M16 49 C18 28 31 13 50 10 C51 29 41 47 22 52 Z"></path>
        <path class="icon-line icon-soft" d="M17 49 C27 38 36 27 48 14"></path>
        <circle class="icon-core" cx="16" cy="18" r="4"></circle>
      </svg>
  `,
  "druid-swiftmend": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M14 49 C17 29 30 14 49 11 C50 29 40 46 22 51 Z"></path>
        <path class="icon-fill" d="M44 7 L47 16 L56 19 L47 22 L44 31 L41 22 L32 19 L41 16 Z"></path>
      </svg>
  `,
  "druid-regrowth": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M32 53 V28 M32 35 C22 34 15 27 14 17 C25 16 32 22 32 31 M32 39 C42 37 49 29 50 19 C39 18 32 24 32 35"></path>
        <circle class="icon-core" cx="32" cy="18" r="5"></circle>
      </svg>
  `,
  "druid-ironbark": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-shield" d="M32 7 L51 15 V31 C51 44 43 54 32 58 C21 54 13 44 13 31 V15 Z"></path>
        <path class="icon-line" d="M25 15 V48 M39 16 V47 M19 26 H45 M20 39 H44"></path>
      </svg>
  `,
  "druid-cyclone": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M12 20 C21 10 42 10 50 22 C57 32 48 45 36 49 C25 53 13 47 11 37 C9 28 18 22 27 23 C36 24 40 31 37 37 C34 43 25 42 23 37"></path>
      </svg>
  `,
  "druid-lifebloom": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="icon-core" cx="32" cy="32" r="5"></circle>
        <path class="icon-line" d="M32 27 C22 20 20 11 25 8 C31 9 34 17 32 27 M37 32 C44 22 53 21 56 26 C55 32 47 35 37 32 M32 37 C40 44 41 53 36 56 C30 55 28 47 32 37 M27 32 C20 40 11 41 8 36 C9 30 17 28 27 32"></path>
      </svg>
  `,
  "druid-moonfire": `
    <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="icon-line" d="M40 10 C25 14 19 29 25 41 C31 52 44 55 54 48 C43 49 35 44 32 35 C28 25 31 16 40 10 Z"></path>
        <path class="icon-fill" d="M17 13 L20 21 L28 24 L20 27 L17 35 L14 27 L6 24 L14 21 Z"></path>
      </svg>
  `,
});

function actionIconFamily(spellId) {
  if (spellId.startsWith("dk-")) return "death-knight";
  return String(spellId || "").split("-")[0] || "generic";
}

function actionIconClassBackdrop(spellId) {
  const family = actionIconFamily(spellId);
  const motifs = {
    priest:
      '<g class="icon-class-sigil icon-class-priest"><circle cx="32" cy="32" r="25"></circle><path d="M32 5V18M32 46V59M5 32H18M46 32H59"></path></g>',
    warrior:
      '<g class="icon-class-sigil icon-class-warrior"><path d="M8 18L20 10M8 31L24 20M10 45L26 31M56 18L44 10M56 31L40 20M54 45L38 31"></path></g>',
    mage:
      '<g class="icon-class-sigil icon-class-mage"><circle cx="32" cy="32" r="24"></circle><circle cx="32" cy="32" r="18"></circle><path d="M32 5L35 13L43 16L35 19L32 27L29 19L21 16L29 13Z"></path></g>',
    shaman:
      '<g class="icon-class-sigil icon-class-shaman"><path d="M32 5L38 21L52 14L44 30L58 34L42 39L47 55L32 45L17 55L22 39L6 34L20 30L12 14L26 21Z"></path></g>',
    "death-knight":
      '<g class="icon-class-sigil icon-class-death-knight"><path d="M32 5V59M8 18L56 46M56 18L8 46"></path><circle cx="32" cy="32" r="20"></circle></g>',
    warlock:
      '<g class="icon-class-sigil icon-class-warlock"><circle cx="32" cy="32" r="24"></circle><path d="M18 14C36 8 51 21 47 39C44 51 31 57 19 50C31 48 38 41 38 32C38 23 31 17 18 14Z"></path></g>',
    paladin:
      '<g class="icon-class-sigil icon-class-paladin"><circle cx="32" cy="32" r="23"></circle><path d="M32 7V57M7 32H57M14 14L50 50M50 14L14 50"></path></g>',
    druid:
      '<g class="icon-class-sigil icon-class-druid"><path d="M12 45C15 25 30 10 50 9C50 29 40 47 21 53Z"></path><path d="M16 48C27 37 37 25 48 13"></path></g>',
    rogue:
      '<g class="icon-class-sigil icon-class-rogue"><path d="M10 49L29 9M24 55L43 15M39 53L55 22"></path><path d="M10 15L19 8L21 20Z"></path></g>',
  };
  return motifs[family] || "";
}

function actionIconMarkup(spellId) {
  const icon = ACTION_ICONS[spellId] || "";
  if (!icon) return "";
  const backdrop = actionIconClassBackdrop(spellId);
  return icon.replace(
    /(<svg[^>]*>)/,
    '$1' + backdrop,
  );
}

export function createUnitFrame(actor, onTarget, partyKey = "") {
  const button = document.createElement("button");
  button.className = "unit-frame " + (actor.team === "enemy" ? "enemy" : "friendly");
  button.type = "button";

  const iconUrl = classIconUrlFor(actor.classId);
  const fallback = String(actor.className || actor.name || "?")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();

  button.innerHTML = `
    <div class="unit-frame-core">
      <div class="unit-portrait">
        <span class="unit-portrait-fallback">${fallback}</span>
        ${iconUrl ? '<img class="unit-class-icon" src="' + iconUrl + '" alt="" aria-hidden="true">' : ""}
        <span class="frame-major-cc" hidden>
          <span class="major-cc-glyph"></span>
          <span class="major-cc-time"></span>
        </span>
        <span class="party-key"></span>
      </div>

      <div class="unit-frame-main">
        <div class="frame-bar">
          <div class="frame-health-trail" aria-hidden="true"></div>
          <div class="frame-heal-prediction" aria-hidden="true"></div>
          <div class="frame-health"></div>
          <div class="frame-heal-flash" aria-hidden="true"></div>
          <div class="frame-health-glass"></div>
          <div class="frame-health-copy">
            <span class="unit-name"></span>
            <span class="frame-value"></span>
          </div>
        </div>

        <div class="frame-meta-row">
          <span class="unit-role"></span>
          <span class="frame-meta-status">
            <span class="frame-los-indicator" aria-hidden="true" hidden></span>
            <span class="frame-status-dot" aria-hidden="true"></span>
          </span>
        </div>

        <div class="frame-resource"><div class="frame-resource-fill"></div></div>

        <div class="frame-cast">
          <div class="frame-cast-fill"></div>
          <div class="frame-cast-copy">
            <span class="frame-cast-name"></span>
            <span class="frame-cast-time"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="frame-state-banner" hidden></div>
    <div class="frame-effects"></div>
    <div class="frame-dr"></div>
    <div class="frame-enemy-cooldowns" hidden></div>
  `;

  button.querySelector(".unit-name").textContent = actor.name;
  button.querySelector(".unit-role").textContent =
    String(actor.className || actor.name).toUpperCase()
    + " · "
    + String(actor.role || "").toUpperCase();

  const partyKeyElement = button.querySelector(".party-key");
  partyKeyElement.textContent = partyKey;
  partyKeyElement.hidden = !partyKey;

  button.addEventListener("click", () => onTarget(actor.id));
  return button;
}

export function createEmptyActionSlot(index, onRebind) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-slot empty-action-slot";
  button.draggable = false;
  button.title = "Empty action slot · talent-unlocked abilities can appear here";

  button.innerHTML = `
    <span class="spell-name">EMPTY</span>
    <span class="spell-meta">Available for unlocked abilities</span>
    <span class="keycap" role="button" tabindex="0"></span>
  `;

  const keycap = button.querySelector(".keycap");
  keycap.addEventListener("click", event => {
    event.stopPropagation();
    onRebind(index, keycap);
  });

  keycap.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRebind(index, keycap);
    }
  });

  return button;
}

export function createActionSlot(spell, index, onCast, onRebind) {
  const button = document.createElement("button");
  button.type = "button";
  const iconMarkup = actionIconMarkup(spell.id);
  button.className = "action-slot" + (iconMarkup ? " has-spell-icon spell-" + spell.id : "");
  button.draggable = true;
  button.title = "Drag to rearrange this action slot";

  button.innerHTML = `
    <span class="drag-handle" aria-hidden="true">⋮⋮</span>
    ${iconMarkup ? '<span class="spell-icon" aria-hidden="true">' + iconMarkup + '</span>' : ''}
    <span class="spell-name"></span>
    <span class="spell-meta"></span>
    <span class="keycap" role="button" tabindex="0"></span>
    <span class="action-cast-progress" aria-hidden="true"><span class="action-cast-edge"></span></span>
    <span class="action-feedback action-success-feedback" aria-hidden="true"></span>
    <span class="action-feedback action-interrupt-feedback" aria-hidden="true"></span>
    <span class="action-feedback action-fail-feedback" aria-hidden="true"></span>
    <span class="action-feedback action-ready-feedback" aria-hidden="true"></span>
    <span class="gcd-sweep" aria-hidden="true"></span>
    <span class="cooldown"></span>
  `;

  button.querySelector(".spell-name").textContent = spell.name;

  const meta = [];
  meta.push(spell.castMs > 0 ? (spell.castMs / 1000).toFixed(1) + "s cast" : "Instant");
  if (spell.cooldownMs > 0) meta.push((spell.cooldownMs / 1000).toFixed(0) + "s CD");
  if (spell.resourceCost > 0) meta.push(spell.resourceCost + " resource");

  const effect = spellEffectSummary(spell);
  if (effect) meta.push(effect);

  button.querySelector(".spell-meta").textContent = meta.join(" · ");

  button.addEventListener("click", event => {
    if (event.target.closest(".keycap")) return;
    onCast(index);
  });

  const keycap = button.querySelector(".keycap");
  keycap.addEventListener("click", event => {
    event.stopPropagation();
    onRebind(index, keycap);
  });

  keycap.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRebind(index, keycap);
    }
  });

  return button;
}
