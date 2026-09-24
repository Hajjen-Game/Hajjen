import { priestTalentTree } from "../classes/priest/talents.js";
import { warriorTalentTree } from "../classes/warrior/talents.js";
import { rogueTalentTree } from "../classes/rogue/talents.js";

export const TALENT_TREE_REGISTRY = Object.freeze({
  priest: priestTalentTree,
  warrior: warriorTalentTree,
  rogue: rogueTalentTree,
});
