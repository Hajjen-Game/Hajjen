// Rift Expedition 1.0 — a traversable five-sector PvE world, not a wave arena.
// Distances are EnergyMatch world units; collision rectangles are shared with
// real AI navigation, projectiles, and line-of-sight checks.
const route=[
  {id:"threshold",name:"THE FRACTURED THRESHOLD",center:{x:530,y:865},
    gate:{x:835,y:840},focus:"Break through the ruined Rift entrance"},
  {id:"causeway",name:"THE SHATTERED CAUSEWAY",center:{x:1180,y:790},
    gate:{x:1500,y:900},focus:"Clear the defenders among the broken pillars"},
  {id:"garden",name:"THE GLASSWOUND GROVE",center:{x:1880,y:995},
    gate:{x:2180,y:950},focus:"Fight through the crystalline growth"},
  {id:"sanctum",name:"THE SILENT SANCTUM",center:{x:2515,y:830},
    gate:{x:2830,y:890},focus:"Unseal the last approach to the Nexus"},
  {id:"heart",name:"THE RIFT HEART",center:{x:3230,y:875},
    gate:null,focus:"Defeat the Rift Heart guardian"}
];
const obstacle=(id,x,y,w,h,kind)=>({id,x,y,w,h,kind});
export const ECHOING_RIFT=Object.freeze({
  id:"echoing-rift",name:"The Echoing Rift",mode:"rift",
  description:"Cross five connected Rift sectors, break their seals and confront the Heart guardian.",
  width:3700,height:1740,boundaryPadding:58,
  bounds:{x:58,y:58,w:3584,h:1624},
  cameraStart:{x:530,y:865},route:Object.freeze(route),
  // A safe central route is retained for both melee and AI pathfinding.
  // Ruins and crystals are real obstacles, not just visual decorations.
  obstacles:Object.freeze([
    obstacle("threshold-nw",335,525,155,135,"ruin"),
    obstacle("threshold-se",660,1120,135,130,"stone"),
    obstacle("causeway-n",1055,500,170,165,"column"),
    obstacle("causeway-s",1320,1045,150,150,"ruin"),
    obstacle("causeway-east",1510,610,110,130,"crystal"),
    obstacle("grove-nw",1695,665,160,150,"crystal"),
    obstacle("grove-sw",1755,1250,185,145,"crystal"),
    obstacle("grove-ne",1985,650,150,120,"crystal"),
    obstacle("grove-se",2060,1190,130,155,"crystal"),
    obstacle("sanctum-n",2405,500,205,145,"column"),
    obstacle("sanctum-s",2590,1110,205,155,"ruin"),
    obstacle("sanctum-west",2270,1200,120,135,"stone"),
    obstacle("heart-nw",3000,555,155,170,"monolith"),
    obstacle("heart-ne",3400,600,150,175,"monolith"),
    obstacle("heart-sw",3020,1180,145,160,"monolith"),
    obstacle("heart-se",3390,1135,145,165,"monolith")
  ]),
  spawns:{
    "friendly-healer":{x:400,y:822,facing:0},
    "friendly-melee":{x:345,y:865,facing:0},
    "friendly-caster":{x:402,y:918,facing:0},
    "enemy-healer":{x:645,y:960,facing:Math.PI},
    "enemy-melee":{x:650,y:792,facing:Math.PI},
    "enemy-caster":{x:720,y:875,facing:Math.PI}
  },
  presentation:{
    biome:"echoing-rift",sky:"#070a19",ground:"#151629",groundLight:"#2a263d",
    groundDark:"#0b1224",stone:"#494665",stoneLight:"#807a9b",
    stoneDark:"#20203a",accent:"#b582fb"
  }
});
