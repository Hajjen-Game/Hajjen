export const CLASS_DATA = {
  caster: { name: 'Glintweaver', hp: 100, speed: 5.25, basic: 'Glint Dart', range: 13.5, attackSpeed: 0.78, baseDamage: 11, spells: ['Winter Pool', 'Crystal Bloom', 'Pale Guard'], cooldowns: [8, 6, 13] },
  melee: { name: 'Stoneblade', hp: 135, speed: 5.6, basic: 'Steel Arc', range: 2.8, attackSpeed: 0.65, baseDamage: 15, spells: ['Wide Arc', 'Rushstrike', 'Earthwake'], cooldowns: [5, 9, 13] },
};
// 0.6: four ultra-compact combat glades; backtracking is always permitted.
export const STAGE_GATES = [26, 52, 78, 104];
export const STAGE_BUDGETS = [12, 15, 18, 21];
export const STAGE_NAMES = ['HONEYDEW MEADOW', 'WHISPER GROVE', 'SUNLIT HOLLOW', 'THE OLD WILDS'];
export const ENEMIES = {
  mossling: { name: 'Mossling', hp: 36, speed: 2.7, damage: 7, range: 1.6, cooldown: 1.55, score: 100, weight: 1 },
  bramble: { name: 'Brambleback', hp: 66, speed: 2.12, damage: 11, range: 1.95, cooldown: 1.9, score: 160, weight: 1 },
  ember: { name: 'Ember Wisp', hp: 31, speed: 2.34, damage: 6, range: 8.3, cooldown: 2.35, score: 140, weight: 1 },
  guardian: { name: 'Grove Guardian', hp: 155, speed: 2.05, damage: 15, range: 2.2, cooldown: 2.25, score: 440, weight: 3 },
};
export const BOOSTS = [
  { id: 'double', classes: ['caster'], name: 'Twin Glint', icon: '✦', desc: 'Your basic attack fires an additional glint.' },
  { id: 'triple', classes: ['caster'], name: 'Prismatic Glint', icon: '✧', desc: 'Fire one more glint. Also improves projectile damage.' },
  { id: 'snowfield', classes: ['caster'], name: 'Winter Garden', icon: '❄', desc: 'Winter Pool grows, lasts longer, and strikes enemies with falling ice.' },
  { id: 'bloom', classes: ['caster'], name: 'Shatterbloom', icon: '✷', desc: 'Crystal Bloom radiates farther and hits harder.' },
  { id: 'critchill', classes: ['caster'], name: 'Glacial Luck', icon: '✳', desc: 'Your glints sometimes strike with even greater force.' },
  { id: 'shield', classes: ['caster'], name: 'Soft Aegis', icon: '❖', desc: 'Pale Guard protects more and chills nearby foes.' },
  { id: 'cascade', classes: ['caster'], onlyOpen:true, name: 'Crystal Cascade', icon:'✶', desc:'Defeated foes burst into crystals that hit up to four nearby enemies.' },
  { id: 'arc', classes: ['melee'], name: 'Long Edge', icon: '⚔', desc: 'Basic sword arcs sweep farther and wider.' },
  { id: 'echo', classes: ['melee'], name: 'Aftershock', icon: '〰', desc: 'Basic attacks release a short traveling shockwave.' },
  { id: 'cleave', classes: ['melee'], name: 'Broad Sweep', icon: '✺', desc: 'Wide Arc gets larger and deals more damage.' },
  { id: 'rush', classes: ['melee'], name: 'Rolling Thunder', icon: '↗', desc: 'Rushstrike blasts nearby foes at the end of the dash.' },
  { id: 'quake', classes: ['melee'], name: 'Rolling Earth', icon: '◎', desc: 'Earthwake expands farther and pushes enemies back.' },
  { id: 'critsteel', classes: ['melee'], name: 'Bright Edge', icon: '✸', desc: 'Your sword sometimes lands unusually powerful blows.' },
  { id: 'tempo', classes: ['caster', 'melee'], name: 'Quickened Heart', icon: '♡', desc: 'Your basic attacks become faster.' },
  { id: 'mend', classes: ['caster', 'melee'], name: 'Meadowgift', icon: '✿', desc: 'Recover health now, and raise maximum health for the run.' },
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const random = (a, b) => a + Math.random() * (b - a);
export const choice = a => a[Math.floor(Math.random() * a.length)];
export const smooth = (from, to, t) => from + (to - from) * t;
