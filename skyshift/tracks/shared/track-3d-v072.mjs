// SKYSHIFT 0.7.2 – corkscrew roll topology for a real 3D racing circuit.
// Elevation is strictly periodic in arc length, independent of lap number.
// Quintic easing gives C2 joins with horizontal zero-grade at start / finish.
// One short, visible straight-line physical gap provides a forgiving LEAP.
import {CIRCUIT,lapPosition} from "./circuit-layout-v060.mjs";
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ease=t=>{const u=clamp(t,0,1);return u*u*u*(10+u*(-15+6*u));};
const easeDeriv=t=>{const u=clamp(t,0,1);return 30*u*u*(1-u)*(1-u);};
export const ELEVATION_KEYS=Object.freeze([
 [0,0],[180,0],[350,10],[525,10],[690,2],
 [750,2],[800,5.8],[808,6.15],[825.6,6.15],
 [925,3],[1050,1],[1250,0],
 [1410,0],[1610,12],[1795,12],[2010,4],[2200,1],
 [2360,1],[2550,-4.6],[2680,-4.6],[2880,2],
 [3100,2],[3290,0],[3400,0]
].map(([s,y])=>Object.freeze({s,y})));
export const SKYLINE_LEAP=Object.freeze({
 id:"skyline-leap",name:"SKYLINE LEAP",start:808,end:825.6,
 lipMeters:808,approachStart:750,landingClearance:17.6,
 launchVelocity:7.8,gravity:24,
 autoLaunch:true,
 minTakeoffSpeed:40,
 widthMeters:23.2
});
// One intentionally authored MAGNETIC WALL RIDE on the long coast straight.
// This is a true roll of the road collision/surface normal, not a camera trick.
// Quintic transitions have zero angular derivative at entry, plateau and exit.
export const MAGNETIC_WALL=Object.freeze({
 id:"coast-magnetic-wall",name:"MAGNETIC WALL RIDE",
 start:2418,riseEnd:2496,fallStart:2630,end:2698,
 maxBankDegrees:70,side:"right",requiresButton:false,
 keepsPhysicalGrip:true,magneticAdhesion:true
});
export function magneticBankAt(s){
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

// The second authored feature is deliberately isolated from the 70° wall.
// All 333m of the finish straight's spectacle rotate the actual road frame.
// At the exit -2π and 0 represent the SAME physical frame; easing reaches
// zero angular velocity at both ends, including the lap-boundary approach.
export const CORKSCREW=Object.freeze({
 id:"finish-corkscrew",name:"CORKSCREW SPECTACLE",
 start:3005,end:3338,lengthMeters:333,
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
 version:"corkscrew-spectacle-072",lapLength:CIRCUIT.lapLength,
 highestMeters:12,lowestMeters:-4.6,
 heightRangeMeters:16.6,
 bankAngleMaxRadians:Math.PI*2,
 jumpCount:1,
 mandatoryRolls:1,
 wallRide:true,ceilingRun:true, corkscrew:true,
 magneticWallId:MAGNETIC_WALL.id, corkscrewId:CORKSCREW.id,
 additionalRoadMeshes:0,
 gravity:24,
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
