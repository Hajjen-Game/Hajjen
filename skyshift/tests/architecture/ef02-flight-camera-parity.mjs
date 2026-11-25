// EF02C exact parity of camera and presentation, not a physics rewrite.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
const [ref,track]=process.argv.slice(2);
assert.ok(ref&&['vault','skyline','aurora'].includes(track));
globalThis.location={search:'?track='+track+'&v=0.28.9.7'};
const root=fileURLToPath(new URL('../../',import.meta.url)),old=resolve(ref,'skyshift');
const load=(dir,p)=>import(pathToFileURL(resolve(dir,p)));
const cv=['081','082','083','084','090','0901','0161','0162','0163','0164','0165'],uv=['0112','0161','0162','0163','0164','0165'];
const cam=v=>(v==='0165'?'flight/':'')+'cinematic-v'+v+'.mjs';
const rig=v=>'flight/unified-flight-v'+v+'.mjs';
const camVersion=v=>v==='0112'?'0901':v;
const points=[-1,0,5,120,510,573,606.6,1662,1740,1842,3004,3005,3100,3180,3337,3338,3399,3400,3410,6580];
let oldBytes=0,newBytes=0;
for(const v of cv){
 const path=cam(v),a=await load(old,path),b=await load(root,path);
 oldBytes+=readFileSync(resolve(old,path)).length;newBytes+=readFileSync(resolve(root,path)).length;
 assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());
 assert.deepEqual(a.CINEMATIC_DEFAULTS,b.CINEMATIC_DEFAULTS);
 const sa=a.createCinematicState(),sb=b.createCinematicState();
 for(let i=0;i<400;i++){
  const s=points[i%points.length],heading=i*.05;
  const view={s,heading,worldX:s*.2,worldZ:s*.3,y:5,steering:Math.sin(i*.1),yawRate:Math.cos(i*.15),clearance:i%7,kineticSideMeters:.2,kineticEyeLiftMeters:.1,kineticDistanceMeters:.3};
  const m={cameraHeading:heading+.2,hover:.15};
  const preview=a.turnPreview(heading,heading+.2);
  assert.equal(preview,b.turnPreview(heading,heading+.2));
  a.stepCinematic(sa,view,preview,1/120);b.stepCinematic(sb,view,preview,1/120);
  assert.deepEqual(sa,sb);
  assert.equal(a.cameraBankAt(s),b.cameraBankAt(s));
  const out={};assert.equal(b.chasePose(view,m,sb,undefined,out),out);
  assert.deepEqual(out,a.chasePose(view,m,sa));
  assert.equal(a.cinematicFov(44+i*.1,44),b.cinematicFov(44+i*.1,44));
  assert.equal(a.engineLightFactor(sa),b.engineLightFactor(sb));
  // Preserve caller-supplied settings, angle wrapping, kinetic fields and classic defaults.
  const custom={...a.CINEMATIC_DEFAULTS,previewGain:.4,previewMaximum:.08,cameraDistance:16,cameraHeight:8.5};
  assert.equal(a.headingDelta(heading,heading+Math.PI*1.5),b.headingDelta(heading,heading+Math.PI*1.5));
  assert.equal(a.turnPreview(heading,heading+2,custom),b.turnPreview(heading,heading+2,custom));
  assert.deepEqual(a.chasePose(view,m,sa,custom),b.chasePose(view,m,sb,custom));
  assert.equal(a.cinematicFov(44+i*.1,44,custom),b.cinematicFov(44+i*.1,44,custom));
 }
 console.log('SKYSHIFT_EF02_CAMERA_PARITY '+JSON.stringify({track,version:v,frames:400}));
}
async function dependencies(dir,v){
 const [m,s,k,c]=await Promise.all([load(dir,'flight/flight-motion-v0112.mjs'),load(dir,'flight/signature-flight-v091.mjs'),load(dir,'flight/kinetic-camera-v090.mjs'),load(dir,cam(camVersion(v)))]);
 return {motion:m.createFlightMotionState(0),signature:s.createSignatureFlightState(),kinetic:k.createKineticCameraState(),cinematic:c.createCinematicState(),flightTuning:m.MOTION_DEFAULTS,cinematicTuning:c.CINEMATIC_DEFAULTS};
}
for(const v of uv){
 const path=rig(v),a=await load(old,path),b=await load(root,path);
 oldBytes+=readFileSync(resolve(old,path)).length;newBytes+=readFileSync(resolve(root,path)).length;
 assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());
 const sa=await dependencies(old,v),sb=await dependencies(root,v);
 const config={flightTuning:sa.flightTuning,cinematicTuning:sa.cinematicTuning,headingAt:s=>Math.sin(s*.003),surfaceHeightAt:(s,l)=>Math.sin(s*.004)*2+Math.abs(l)*.005,hoverHeight:1.1,cameraGain:.85,lapLength:3400,magneticWall:{start:1662,end:1842},corkscrew:{start:3005,end:3338}};
 const ra=a.createUnifiedFlightRig(config),rb=b.createUnifiedFlightRig(config);
 for(let i=0;i<400;i++){
  const s=points[i%points.length],dt=[1/120,1/60,1/30][i%3],view={s,heading:config.headingAt(s),worldX:s*.2,worldZ:s*.3,y:1.1+config.surfaceHeightAt(s,2)+Math.sin(i*.1),lateral:2,steering:Math.sin(i*.17),yawRate:Math.cos(i*.13),sideVelocity:Math.sin(i*.2)*3,vy:Math.cos(i*.14),grounded:i%19!==0};
  const flight={gripIntensity:Math.abs(Math.sin(i*.06)),currentSpeed:44+(i%160)*.35,boostMultiplier:i%35<9?1.35:1,landingBoostMultiplier:i%37<5?1.22:1,trickActive:i%19===0,vy:view.vy};
  const original=structuredClone(flight);
  for(const [mod,r,x] of [[a,ra,sa],[b,rb,sb]])mod.advanceUnifiedFlightRig(r,view,flight,dt,i/60,i%23!==0,x.motion,x.signature,x.cinematic,x.kinetic);
  assert.deepEqual(flight,original);
  assert.deepEqual(sa,sb);assert.deepEqual(ra,rb);
  assert.deepEqual(a.unifiedFlightAudit(ra),b.unifiedFlightAudit(rb));
 }
 assert.deepEqual(a.resetUnifiedFlightRig(ra),b.resetUnifiedFlightRig(rb));
 console.log('SKYSHIFT_EF02_FLIGHT_PARITY '+JSON.stringify({track,version:v,frames:400}));
}
for(const p of ['flight/cinematic-camera.mjs','flight/classic-camera.mjs','flight/unified-flight.mjs'])newBytes+=readFileSync(resolve(root,p)).length;
assert.ok(newBytes<oldBytes);
console.log('SKYSHIFT_EF02_FLIGHT_BYTES '+JSON.stringify({oldBytes,newBytes,reduction:oldBytes-newBytes}));
