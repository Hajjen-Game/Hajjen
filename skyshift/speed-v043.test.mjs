import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  TRIAL,GAPS,COURSE_SEGMENTS,positionAt,headingAt,curvatureAt,
  speedAt,newFlightState,stepFlight,clamp,validateTrial
} from "./trial-v043.mjs";
import {
 MESH_SPEC,sampleDeckRows,createSmoothDeckData,createSmoothDeckGeometry
} from "./smooth-track-v043.mjs";
import {
  PACING,createFrameClock,advanceFrame,
  capturePose,interpolatePose,interpolateAngle,shouldSnapPose,
  createFrameMonitor,observeFrame,monitorSummary,
  createAdaptiveQuality,nextAdaptiveRatio
} from "./frame-pacing-v043.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const dt=1/120;

test("speed doubles without changing authored geometry or reintroducing lane guidance",()=>{
 assert.deepEqual(validateTrial(),[]);
 assert.equal(TRIAL.length,510);
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
 assert.equal(TRIAL.maxYawRate,1.24);
 assert.ok(TRIAL.turnRelease>24&&TRIAL.turnResponse>17);
 assert.deepEqual(GAPS,[]);
 assert.equal(COURSE_SEGMENTS.length,5);
 assert.equal(COURSE_SEGMENTS.filter(x=>x.type==="turn").length,2);
 for(const s of [0,50,95,165,222,360,510]){
   assert.ok(speedAt(s)>=44&&speedAt(s)<=47);
   assert.ok(Number.isFinite(headingAt(s)));
 }
 for(const s of [0,60,240,450])assert.equal(curvatureAt(s),0);
});

test("top deck is one indexed continuous mesh with SHARED cross-row vertices",()=>{
 const mesh=createSmoothDeckData();
 const rows=sampleDeckRows();
 assert.equal(rows.length,mesh.rows);
 assert.equal(mesh.cols,5);
 assert.equal(mesh.positions.length,mesh.rows*mesh.cols*3);
 assert.equal(mesh.indices.length,(mesh.rows-1)*(mesh.cols-1)*6);
 assert.equal(mesh.triangles,(mesh.rows-1)*(mesh.cols-1)*2);
 assert.equal(rows[0].s,0);
 assert.equal(rows.at(-1).s,510);
 assert.equal(MESH_SPEC.topSurfaceCount,1);
 assert.equal(MESH_SPEC.flatShadedSegments,0);
 // A given row's vertex index is shared by BOTH adjoining road quad rows.
 const boundary=MESH_SPEC.lateralColumns*60;
 assert.ok(mesh.indices.filter(i=>i===boundary+2).length>=3);
 const unique=new Set(mesh.indices);
 assert.equal(unique.size,mesh.rows*mesh.cols);
 for(let i=1;i<rows.length;i++){
   assert.ok(rows[i].s>rows[i-1].s);
   assert.ok(rows[i].s-rows[i-1].s<=MESH_SPEC.sampleStep+.00001);
 }
});

test("shared-vertex road surface has correct winding and no isolated normals",()=>{
 const data=createSmoothDeckData();
 const vertices=data.positions,indices=data.indices;
 const first=indices.slice(0,3);
 const points=first.map(i=>vertices.slice(i*3,i*3+3));
 const [a,b,c]=points;
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
 const ex=c[0]-a[0],ey=c[1]-a[1],ez=c[2]-a[2];
 const ny=dz*ex-dx*ez;
 assert.ok(ny>0,"normals on the top surface must face upward");
 class BufferGeometry{
   attributes={};index=null;normalCalls=0;boundingCalls=0;
   setAttribute(k,v){this.attributes[k]=v;}
   setIndex(v){this.index=v;}
   computeVertexNormals(){this.normalCalls++;}
   computeBoundingSphere(){this.boundingCalls++;}
 }
 class Float32BufferAttribute{constructor(array,size){this.array=array;this.itemSize=size;}}
 const THREE={BufferGeometry,Float32BufferAttribute};
 const geometry=createSmoothDeckGeometry(THREE,()=>({r:.12,g:.3,b:.45}));
 assert.equal(geometry.normalCalls,1);
 assert.equal(geometry.boundingCalls,1);
 assert.equal(geometry.index.length,data.indices.length);
 assert.equal(geometry.attributes.position.array.length,data.positions.length);
 assert.equal(geometry.attributes.color.array.length,data.positions.length);
});

test("road vertices are continuous and physical bank is unchanged across joins",()=>{
 const rows=sampleDeckRows();
 for(let i=1;i<rows.length;i++){
   const previous=rows[i-1],current=rows[i];
   for(let j=0;j<5;j++){
     const a=previous.points[j],b=current.points[j];
     const travel=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
     assert.ok(travel<1,"disconnected road at "+current.s+" column "+j);
   }
 }
 for(const join of [95,115,202,222,292,312,404,424]){
   const prev=positionAt(join-.001,7,0),next=positionAt(join+.001,7,0);
   assert.ok(Math.hypot(prev.x-next.x,prev.y-next.y,prev.z-next.z)<.04);
 }
});

test("interpolated render poses are between fixed simulation ticks, including wrapped yaw",()=>{
 const one={worldX:0,worldZ:-10,y:1,heading:Math.PI-.10,
   s:10,lateral:0,steering:-.2,vy:0,grounded:true};
 const two={worldX:1.2,worldZ:-12,y:2,heading:-Math.PI+.10,
   s:12,lateral:3,steering:.4,vy:1,grounded:true};
 const mid=interpolatePose(one,two,.5);
 assert.ok(Math.abs(mid.worldX-.6)<1e-8);
 assert.ok(Math.abs(mid.worldZ+11)<1e-8);
 assert.ok(Math.abs(mid.lateral-1.5)<1e-8);
 assert.ok(Math.abs(Math.abs(mid.heading)-Math.PI)<1e-8);
 assert.deepEqual(interpolatePose(one,two,0).worldX,0);
 assert.deepEqual(interpolatePose(one,two,1).worldX,1.2);
 assert.equal(shouldSnapPose(one,two),false);
 assert.equal(shouldSnapPose(one,{...two,worldX:120}),true);
 const f=newFlightState();
 assert.equal(capturePose(f).worldX,f.worldX);
});

test("frame pacing does not silently throw away physics time at 20–60fps",()=>{
 for(const fps of [20,24,30,33,60,90,120]){
   const clock=createFrameClock(),duration=3,frames=fps*duration;
   let steps=0;
   for(let i=0;i<frames;i++)
     advanceFrame(clock,1/fps,()=>{steps++;});
   assert.ok(Math.abs(clock.simulatedSeconds-duration)<.012,
     "sim time lost at "+fps+" fps: "+clock.simulatedSeconds);
   assert.ok(Math.abs(steps-fps*duration*120/fps)<=2);
   assert.equal(clock.droppedSeconds,0);
   assert.ok(clock.interpolationAlpha>=0&&clock.interpolationAlpha<=1);
   assert.ok(clock.stepsPeak<=PACING.maxStepsPerFrame);
 }
 const clock=createFrameClock();let steps=0;
 advanceFrame(clock,.8,()=>steps++);
 assert.ok(steps<=PACING.maxStepsPerFrame);
 assert.ok(clock.droppedSeconds>.5);
});

test("frame diagnostics report meaningful fps and p95 rather than optimistic averages",()=>{
 const m=createFrameMonitor();
 for(let i=0;i<100;i++)observeFrame(m,i<80?1/60:1/25,4.5);
 const summary=monitorSummary(m);
 assert.ok(summary.fpsAverage>40&&summary.fpsAverage<60);
 assert.ok(summary.frameMsP95>=39);
 assert.ok(summary.frameMsP99>=39);
 assert.equal(summary.renderCpuAverageMs,4.5);
 assert.equal(summary.renderCpuPeakMs,4.5);
});

test("slow devices may reduce only internal HDR resolution; fast devices retain 2x",()=>{
 const q=createAdaptiveQuality();let requested=null;
 for(let i=0;i<120;i++){
   const next=nextAdaptiveRatio(q,31,11000+i*31,2);
   if(next!==null)requested=next;
 }
 assert.equal(requested,1.75);
 assert.equal(q.level,1);
 requested=null;
 for(let i=0;i<120;i++){
   const next=nextAdaptiveRatio(q,15,26000+i*16,2);
   if(next!==null)requested=next;
 }
 assert.equal(requested,2);
 assert.equal(q.level,0);
 const fast=createAdaptiveQuality();
 for(let i=0;i<150;i++){
   assert.equal(nextAdaptiveRatio(fast,13,15000+i*13,2),null);
 }
 assert.equal(fast.level,0);
});

test("transient frame spikes never downgrade premium HDR quality",()=>{
 const quality=createAdaptiveQuality();
 let changes=0;
 // Sustained 60fps start, then a brief 500ms hitchy period.
 for(let i=0;i<96;i++){
   if(nextAdaptiveRatio(quality,16,10000+i*16,2)!==null)changes++;
 }
 for(let i=0;i<20;i++){
   if(nextAdaptiveRatio(quality,40,11536+i*40,2)!==null)changes++;
 }
 assert.equal(changes,0);
 assert.equal(quality.level,0);
});

test("a plausible pilot can finish double-speed lab while manually steering",()=>{
 let successful=null;
 // Different lookahead gains are simple deterministic player policies.
 for(const lookAhead of [14,19,25,31,38]){
   for(const gain of [4,6,8.4,11]){
     const flight=newFlightState();let frames=0,falls=0;
     while(!flight.finished&&!flight.failed&&frames++<2400){
       const target=positionAt(Math.min(TRIAL.length,flight.s+lookAhead),0,0);
       const heading=Math.atan2(target.x-flight.worldX,
         -(target.z-flight.worldZ));
       const diff=Math.atan2(Math.sin(heading-flight.heading),
         Math.cos(heading-flight.heading));
       const r=stepFlight(flight,dt,{steer:clamp(diff*gain,-1,1)});
       if(r.crashed)falls++;
     }
     if(flight.finished&&falls===0){
       successful={lookAhead,gain,flight};
       break;
     }
   }
   if(successful)break;
 }
 assert.ok(successful,"No safe deterministic pilot policy could finish the fast lab");
 assert.ok(successful.flight.steerSeconds>1);
 assert.equal(successful.flight.falls,0);
 assert.equal(successful.flight.jumps,0);
});

test("archived 0.4.3 build retains speed, mesh and pacing; current page is 0.4.4",()=>{
 const game=source("game-v043.mjs"),html=source("index.html");
 assert.match(game,/from "\.\/trial-v043\.mjs"/);
 assert.match(game,/from "\.\/smooth-track-v043\.mjs"/);
 assert.match(game,/createSmoothDeckGeometry\(THREE,surfaceColor\)/);
 assert.doesNotMatch(game,/addQuad\(deck,colors,p1,p2,p3,p4/);
 assert.match(game,/interpolatePose\(previousRenderPose,currentRenderPose,frameBlend\)/);
 assert.match(game,/advanceFrame\(frameClock,rawDt/);
 assert.match(game,/nextAdaptiveRatio\(/);
 assert.match(game,/frameMsP95/);
 assert.match(game,/game:"SKYSHIFT",version:"0\.4\.3"/);
 assert.match(game,/skyshift-handling-v043-audit\.json/);
 assert.match(html,/game-v049\.mjs\?v=0\.4\.9/);
 assert.match(html,/style-v043\.css\?v=0\.4\.9/);
 assert.match(html,/id="fullscreen-btn"/);
});
