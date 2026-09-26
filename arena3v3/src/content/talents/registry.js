import { priestTalentTree } from "../classes/priest/talents.js?v=20260926-mindblastvfx1";
import { druidTalentTree } from "../classes/druid/talents.js";
import { mageTalentTree } from "../classes/mage/talents.js";
import { paladinTalentTree } from "../classes/paladin/talents.js";
import { warriorTalentTree } from "../classes/warrior/talents.js";
import { rogueTalentTree } from "../classes/rogue/talents.js";
import { shamanTalentTree } from "../classes/shaman/talents.js";
import { deathKnightTalentTree } from "../classes/death-knight/talents.js";
import { warlockTalentTree } from "../classes/warlock/talents.js?v=20260925-schools1";

export const TALENT_TREE_REGISTRY = Object.freeze({
  priest: priestTalentTree,
  druid: druidTalentTree,
  mage: mageTalentTree,
  paladin: paladinTalentTree,
  warrior: warriorTalentTree,
  rogue: rogueTalentTree,
  shaman: shamanTalentTree,
  "death-knight": deathKnightTalentTree,
  warlock: warlockTalentTree,
});
