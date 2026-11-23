// SKYSHIFT 0.8.2 – early apex, midrace wall and elevated Skyline Leap and preserved corkscrew roll topology for a real 3D racing circuit.
// Elevation is strictly periodic in arc length, independent of lap number.
// Quintic easing gives C2 joins with horizontal zero-grade at start / finish.
// One short, visible straight-line physical gap provides a forgiving LEAP.
import {CIRCUIT,lapPosition,COURSE_SEGMENTS} from "./circuit-layout-v0160.mjs";
import {isAurora,isVault} from "./track-selection-v0160.mjs";
import {VAULT_ELEVATION_KEYS_0270} from "./tracks/vault/full-tunnel-layout-v0270.mjs";
const isFlowTrack=()=>isAurora()||isVault();
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ease=t=>{const u=clamp(t,0,1);return u*u*u*(10+u*(-15+6*u));};
const easeDeriv=t=>{const u=clamp(t,0,1);return 30*u*u*(1-u)*(1-u);};
export const ELEVATION_KEYS=Object.freeze((isVault()?VAULT_ELEVATION_KEYS_0270:isAurora()?[
 [0,0],[200,0],[420,7],[580,7],[790,1],
 [955,1],[1180,14],[1300,14],[1570,6],[1700,4],
 [1870,-4],[2060,-4],[2210,3],[2440,3],
 [2700,16],[2890,16],[3140,4],[3400,0]
]:[
 [0,0],[180,0],[350,10],[455,2],
 [515,2],[565,5.8],[573,6.15],[606.6,6.15],
 [690,3],[815,1],[1015,0],
 [1175,0],[1375,12],[1560,12],[1775,4],[1965,1],
 [2125,1],[2315,-4.6],[2445,-4.6],[2645,2],
 [2865,2],[3055,0],[3400,0]
]).map(([s,y])=>Object.freeze({s,y})));
export const SKYLINE_LEAP=Object.freeze({
 id:isFlowTrack()?"no-skyline-leap":"skyline-leap",name:"SKYLINE LEAP",
 start:isFlowTrack()?4100:573,end:isFlowTrack()?4101:606.6,
 lipMeters:573,approachStart:515,landingClearance:33.6,
 launchVelocity:12.6,gravity:22,
 autoLaunch:true,
 minTakeoffSpeed:40,
 widthMeters:23.2
});
// Magnetic wall is now the deliberate mid-race technical release, with 67m of\n// straight-line recovery before the back sweeper and well separated\n// from the finale Corkscrew. Its 228m runtime fits the C2 release straight.
// This is a true roll of the road collision/surface normal, not a camera trick.
// Quintic transitions have zero angular derivative at entry, plateau and exit.
export const MAGNETIC_WALL=Object.freeze({
 id:isFlowTrack()?"no-magnetic-wall":"coast-magnetic-wall",name:"MAGNETIC WALL RIDE",
 start:isFlowTrack()?4200:1662,riseEnd:isFlowTrack()?4200:1710,
 fallStart:isFlowTrack()?4200:1794,end:isFlowTrack()?4200:1842,
 maxBankDegrees:70,side:"right",requiresButton:false,
 keepsPhysicalGrip:true,magneticAdhesion:true
});
export function magneticBankAt(s){
 if(isFlowTrack()){
  // Gentle physically rendered bank follows actual wide turn segments.
  // This is NOT an auto-steering or hidden grip modifier.
  const d=lapPosition(s);
  const arc=COURSE_SEGMENTS.find(t=>t.type==="turn"&&d>=t.start&&d<t.end);
  if(!arc)return 0;
  const f=(d-arc.start)/arc.length;
  return Math.sign(arc.turnAngle)*(isVault()?.17:.12)*
    ease(Math.min(1,f*5))*ease(Math.min(1,(1-f)*5));
 }
 const d=lapPosition(s),m=MAGNETIC_WALL;
 if(d<=m.start||d>=m.end)return 0;
 const blend=d<m.riseEnd?ease((d-m.start)/(m.riseEnd-m.start)):
   d<=m.fallStart?1:1-ease((d-m.fallStart)/(m.end-m.fallStart));
 return blend*m.maxBankDegrees*Math.PI/180;
}
export function magneticWallAt(s){
 const local=lapPosition(s),m=MAGNETIC_WALL;
 return local>m.start&&local<m.end?m:null;
}

// The finale corkscrew is more than a kilometre after the 70° wall.
// All 333m of the finish straight's spectacle rotate the actual road frame.
// At the exit -2π and 0 represent the SAME physical frame; easing reaches
// zero angular velocity at both ends, including the lap-boundary approach.
export const CORKSCREW=Object.freeze({
 id:isFlowTrack()?"no-corkscrew":"finish-corkscrew",name:"CORKSCREW SPECTACLE",
 start:isFlowTrack()?4200:3005,end:isFlowTrack()?4200:3338,
 lengthMeters:isFlowTrack()?0:333,
 revolutions:1,peakUnwrappedDegrees:-360,
 direction:"left-ceiling-right",
 autoEngage:true,requiresButton:false,requiresTrick:false,
 magnetized:true,independentOfMagneticWall:true
});
export function corkscrewProgressAt(s){
 const d=lapPosition(s);
 if(d<=CORKSCREW.start)return 0;
 if(d>=CORKSCREW.end)return 1;
 return ease((d-CORKSCREW.start)/(CORKSCREW.end-CORKSCREW.start));
}
export function corkscrewBankAt(s){
 const d=lapPosition(s);
 if(d<=CORKSCREW.start||d>=CORKSCREW.end)return 0;
 return -2*Math.PI*corkscrewProgressAt(s);
}
export function corkscrewAt(s){
 const d=lapPosition(s);
 return d>=CORKSCREW.start&&d<CORKSCREW.end?CORKSCREW:null;
}
export const TRACK_3D=Object.freeze({
 version:isVault()?"neon-vault-enclosed-elevation-0270":
  isAurora()?"aurora-run-rolling-hills-0160":"track-rhythm-grip-apex-082",
 lapLength:CIRCUIT.lapLength,
 highestMeters:isVault()?8:isFlowTrack()?16:12,
 lowestMeters:isVault()?-1:isFlowTrack()?-4:-4.6,
 heightRangeMeters:isVault()?9:isFlowTrack()?20:16.6,
 bankAngleMaxRadians:isVault()?.17:isFlowTrack()?.12:Math.PI*2,
 jumpCount:isFlowTrack()?0:1,
 mandatoryRolls:isFlowTrack()?0:1,
 wallRide:!isFlowTrack(),ceilingRun:!isFlowTrack(),corkscrew:!isFlowTrack(),
 magneticWallId:MAGNETIC_WALL.id, corkscrewId:CORKSCREW.id,
 additionalRoadMeshes:0,
 gravity:22,
 terrainBands:3
});
function segment(s){
 const d=lapPosition(s);
 let lo=0,hi=ELEVATION_KEYS.length-2;
 while(lo<=hi){
  const m=(lo+hi)>>1;
  if(d<ELEVATION_KEYS[m].s)hi=m-1;
  else if(d>=ELEVATION_KEYS[m+1].s)lo=m+1;
  else return [ELEVATION_KEYS[m],ELEVATION_KEYS[m+1],d];
 }
 return [ELEVATION_KEYS.at(-2),ELEVATION_KEYS.at(-1),d];
}
export function elevationAt(s){
 const [a,b,d]=segment(s),t=(d-a.s)/(b.s-a.s);
 return a.y+(b.y-a.y)*ease(t);
}
export function gradeAt(s){
 const [a,b,d]=segment(s),length=b.s-a.s;
 return (b.y-a.y)/length*easeDeriv((d-a.s)/length);
}
export function pitchAt(s){return Math.atan(gradeAt(s));}
export function groundNormalAt(s,heading){
 const g=gradeAt(s),scale=1/Math.hypot(1,g);
 return {x:-Math.sin(heading)*g*scale,y:scale,
  z:Math.cos(heading)*g*scale};
}
export function jumpAt(s){
 const p=lapPosition(s);
 return p>=SKYLINE_LEAP.start&&p<SKYLINE_LEAP.end?SKYLINE_LEAP:null;
}
export function upcomingJump(s,distance=90){
 if(isFlowTrack())return null;
 const p=lapPosition(s),jump=SKYLINE_LEAP;
 const delta=(jump.start-p+CIRCUIT.lapLength)%CIRCUIT.lapLength;
 return delta<=distance?{...jump,distance:delta}:null;
}
export function elevationAudit(){
 const heights=ELEVATION_KEYS.map(x=>x.y);
 return {topology:TRACK_3D.version,high:Math.max(...heights),
  low:Math.min(...heights),rise:Math.max(...heights)-Math.min(...heights),
  jump:SKYLINE_LEAP.id,
  lipElevation:elevationAt(SKYLINE_LEAP.lipMeters),
  seamHeightError:Math.abs(elevationAt(0)-elevationAt(3400)),
  seamGradeError:Math.abs(gradeAt(0)-gradeAt(3400)),
   wallStart:MAGNETIC_WALL.start,wallEnd:MAGNETIC_WALL.end,
   wallPeakDegrees:MAGNETIC_WALL.maxBankDegrees,
   corkscrewStart:CORKSCREW.start,corkscrewEnd:CORKSCREW.end,
   corkscrewRotationDegrees:CORKSCREW.peakUnwrappedDegrees};
}
