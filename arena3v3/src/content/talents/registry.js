import { priestTalentTree } from "../classes/priest/talents.js";
import { druidTalentTree } from "../classes/druid/talents.js";
import { mageTalentTree } from "../classes/mage/talents.js";
import { warriorTalentTree } from "../classes/warrior/talents.js";
import { rogueTalentTree } from "../classes/rogue/talents.js";
import { shamanTalentTree } from "../classes/shaman/talents.js";
import { deathKnightTalentTree } from "../classes/death-knight/talents.js";
import { warlockTalentTree } from "../classes/warlock/talents.js";

export const TALENT_TREE_REGISTRY = Object.freeze({
  priest: priestTalentTree,
  druid: druidTalentTree,
  mage: mageTalentTree,
  warrior: warriorTalentTree,
  rogue: rogueTalentTree,
  shaman: shamanTalentTree,
  "death-knight": deathKnightTalentTree,
  warlock: warlockTalentTree,
});
