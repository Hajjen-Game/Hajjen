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
  { id: 'double', classes: ['caster'], name: 'Twin Glint', icon: '✦', desc: 'Fire two auto-targeting glints instead of one.' , category:'damage' },
  { id: 'triple', classes: ['caster'], name: 'Prismatic Glint', icon: '✧', desc: 'Fire FOUR glints in Wildpath 2.3, with stronger projectiles.' , category:'damage', requires:['double'] },
  { id: 'snowfield', classes: ['caster'], name: 'Winter Garden', icon: '❄', desc: 'Winter Pool grows to 5.2m, deals 17 damage every 0.48s and opens with a 24-damage wave.' , category:'damage' },
  { id: 'bloom', classes: ['caster'], name: 'Shatterbloom', icon: '✷', desc: 'Crystal Bloom grows to 5.4m and blasts enemies for 51 damage.' , category:'damage' },
  { id: 'critchill', classes: ['caster'], name: 'Glacial Luck', icon: '✳', desc: 'More critical hits and stronger crystal damage.' , category:'damage' },
  { id: 'shield', classes: ['caster'], name: 'Soft Aegis', icon: '❖', desc: 'Pale Guard absorbs more damage and slows nearby enemies.' , category:'defense' },
  { id: 'cascade', classes: ['caster'], onlyOpen:true, name: 'Crystal Cascade', icon:'✶', desc: 'Kills unleash 4.7m crystal bursts for 36 damage on up to six foes.' , category:'damage' },
  // Unlock-based open-world evolutions. Stoneblade and original road untouched.
  { id:'nova',classes:['caster'],onlyOpen:true,requires:['bloom'],category:'damage',
    name:'Grand Bloom',icon:'✺',desc:'7.3m Crystal Bloom: 78 damage plus four bursting crystal splinters.' },
  { id:'hailstorm',classes:['caster'],onlyOpen:true,requires:['snowfield'],category:'damage',
    name:'Hailstorm',icon:'☄',desc:'6.7m Winter Pool, 42-damage entry wave and rapid 26-damage pulses.' },
  { id:'glintstorm',classes:['caster'],onlyOpen:true,requires:['triple'],category:'damage',
    name:'Starfall Volley',icon:'✧',desc:'FIVE stronger glints; every hit splashes 26 damage onto five nearby foes.' },
  { id:'chain',classes:['caster'],onlyOpen:true,requires:['double'],category:'damage',
    name:'Ricochet Glint',icon:'⌁',desc:'Every glint hit splashes 19 damage onto two nearby enemies.' },
  { id:'cascadebloom',classes:['caster'],onlyOpen:true,requires:['cascade'],category:'damage',
    name:'Living Avalanche',icon:'✵',desc:'Crystal Cascade kills can chain through two waves of crystal bursts.' },
  { id: 'arc', classes: ['melee'], name: 'Long Edge', icon: '⚔', desc: 'Basic sword arcs sweep farther and wider.' },
  { id: 'echo', classes: ['melee'], name: 'Aftershock', icon: '〰', desc: 'Basic attacks release a short traveling shockwave.' },
  { id: 'cleave', classes: ['melee'], name: 'Broad Sweep', icon: '✺', desc: 'Wide Arc gets larger and deals more damage.' },
  { id: 'rush', classes: ['melee'], name: 'Rolling Thunder', icon: '↗', desc: 'Rushstrike blasts nearby foes at the end of the dash.' },
  { id: 'quake', classes: ['melee'], name: 'Rolling Earth', icon: '◎', desc: 'Earthwake expands farther and pushes enemies back.' },
  { id: 'critsteel', classes: ['melee'], name: 'Bright Edge', icon: '✸', desc: 'Your sword sometimes lands unusually powerful blows.' },
  { id: 'tempo', classes: ['caster', 'melee'], name: 'Quickened Heart', icon: '♡', desc: 'Basic attacks become significantly faster.' , category:'damage' },
  { id: 'mend', classes: ['caster', 'melee'], name: 'Meadowgift', icon: '✿', desc: 'Restore health now and increase maximum health for the run.' , category:'defense' },
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const random = (a, b) => a + Math.random() * (b - a);
export const choice = a => a[Math.floor(Math.random() * a.length)];
export const smooth = (from, to, t) => from + (to - from) * t;
