// Planet Defense biome 01: broad, open planetary wilderness. All coordinates
// are in the same collision/world units as EnergyMatch (not Babylon units).
// This is NOT a reskin of the four-pillar PvP arena.
export const SHATTERED_EXPANSE = Object.freeze({
  id:"shattered-expanse",
  name:"The Shattered Expanse",
  description:"An open, fractured moon plateau with crystal outcrops, distant rifts and broad kiting routes.",
  mode:"defense",
  width:2640,height:1760,boundaryPadding:52,
  bounds:{x:52,y:52,w:2536,h:1656},
  cameraStart:{x:1320,y:880},
  // Open wave-survival field: PvP Arena's clean dark visual language, without
  // the pillars/mesas that cluttered the first Planet Defense playtest.
  obstacles:[],
  spawns:{
    "friendly-healer":{x:1275,y:880,facing:0},
    "friendly-melee":{x:1345,y:815,facing:0},
    "friendly-caster":{x:1345,y:950,facing:0},
    "enemy-healer":{x:1940,y:1030,facing:Math.PI},
    "enemy-melee":{x:1950,y:840,facing:Math.PI},
    "enemy-caster":{x:1930,y:910,facing:Math.PI}
  },
  presentation:{
    biome:"shattered-moon",
    sky:"#060e1e",ground:"#182434",groundLight:"#273546",
    groundDark:"#0c1828",stone:"#3f4b5e",stoneLight:"#677085",
    stoneDark:"#1b2939",accent:"#72bbc6"
  }
});
