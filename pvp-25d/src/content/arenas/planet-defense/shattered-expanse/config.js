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
  // Large gaps and offset rock clusters make long, readable routes.
  obstacles:[
    {id:"west-north-crystal",x:530,y:350,w:124,h:116},
    {id:"west-south-ledge",x:595,y:1310,w:170,h:104},
    {id:"north-rift-rock",x:1050,y:245,w:150,h:105},
    {id:"north-east-crystal",x:1860,y:360,w:130,h:135},
    {id:"east-ridge",x:2210,y:850,w:132,h:180},
    {id:"south-east-crystal",x:1840,y:1340,w:140,h:124},
    {id:"south-ridge",x:1155,y:1440,w:190,h:108},
    {id:"west-ridge",x:300,y:875,w:150,h:145}
  ],
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
