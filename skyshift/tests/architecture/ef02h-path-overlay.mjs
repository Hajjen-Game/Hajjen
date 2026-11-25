import {restoreEF02I} from './ef02i-path-overlay.mjs';
// Reverse only manifest-approved EF02H path edits, checking exact pre-migration identity.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const m=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef02h-track-geometry-ownership.json'),'utf8'));
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')};
export function restoreEF02H(source,path){
 source=restoreEF02I(source,path);
 const key=relative(repo,resolve(repo,path)).replaceAll('\\','/');
 // EF02J: reconstruct only the two approved historical Skyline physics adapters.
 if(["skyshift/trial-v0150.mjs","skyshift/trial-v0151.mjs"].includes(key)){
  const adapter="import {createHistoricalSkylineTrial} from \"./flight/historical-skyline-trial.mjs\";\nexport const {\n clamp,\n lerp,\n smooth,\n TRIAL,\n SHOWCASE_PLAN,\n COURSE_SEGMENTS,\n TECHNICAL_APEX_PULSES,\n circuitPlanSummary,\n MAX_BANK_RAD,\n GAPS,\n ISLANDS,\n SPLITS,\n RISK_CUTS,\n CHECKPOINTS,\n SECTORS,\n ROAD_CUES,\n ARCHES,\n GEOMETRY_BREAKS,\n SPEED_SECTIONS,\n easedCurvature,\n integratedEasedCurvature,\n headingAt,\n curvatureAt,\n bankAt,\n bankDegreesAt,\n heightAt,\n surfaceHeightAt,\n GRIP_APEX,\n gripApexAt,\n widthAt,\n speedAt,\n setZoneSpeedStage,\n sectorAt,\n gapAt,\n nextGap,\n roadIntervals,\n onRoad,\n GUARDRAIL,\n guardrailLateralLimit,\n constrainToGuardrail,\n checkpointFor,\n LOOP_CLOSURE_ERROR_METERS,\n poseAt,\n surfaceNormalAt,\n positionAt,\n PROJECTION_083,\n projectWorldToTrack,\n nearestLane,\n shapeSteer,\n newFlightState,\n stepFlight,\n validateTrial\n}=createHistoricalSkylineTrial({BOOST_PADS,BOOST_CONFIG,initBoostState,stepBoostState,boostedSpeedAt,GRIP_SPEC,initGripState,stepGripState,STEERING_AUTHORITY,normalYawFactorAt,yawAuthorityAt,steeringBalanceAt,AIR_TRICKS,initAirTrickState,beginAirTrick,advanceAirTrick,finalizeAirTrick,stepLandingBoost,settleTrickVisual,TRACK_3D,SKYLINE_LEAP,elevationAt,gradeAt,pitchAt,groundNormalAt,jumpAt,upcomingJump,elevationAudit,MAGNETIC_WALL,magneticBankAt,magneticWallAt,CORKSCREW,corkscrewBankAt,corkscrewAt,corkscrewProgressAt,CIRCUIT,CIRCUIT_LENGTH,LOOP_SEGMENTS,lapPosition,sectionAt,baseCircuitPlanSummary});\n";
  const prefix="// Shared historical Skyline physics; exact trial body with version-specific boost dependency.\nexport function createHistoricalSkylineTrial({BOOST_PADS,BOOST_CONFIG,initBoostState,stepBoostState,boostedSpeedAt,GRIP_SPEC,initGripState,stepGripState,STEERING_AUTHORITY,normalYawFactorAt,yawAuthorityAt,steeringBalanceAt,AIR_TRICKS,initAirTrickState,beginAirTrick,advanceAirTrick,finalizeAirTrick,stepLandingBoost,settleTrickVisual,TRACK_3D,SKYLINE_LEAP,elevationAt,gradeAt,pitchAt,groundNormalAt,jumpAt,upcomingJump,elevationAudit,MAGNETIC_WALL,magneticBankAt,magneticWallAt,CORKSCREW,corkscrewBankAt,corkscrewAt,corkscrewProgressAt,CIRCUIT,CIRCUIT_LENGTH,LOOP_SEGMENTS,lapPosition,sectionAt,baseCircuitPlanSummary}){\n",suffix="\n return {clamp,lerp,smooth,TRIAL,SHOWCASE_PLAN,COURSE_SEGMENTS,TECHNICAL_APEX_PULSES,circuitPlanSummary,MAX_BANK_RAD,GAPS,ISLANDS,SPLITS,RISK_CUTS,CHECKPOINTS,SECTORS,ROAD_CUES,ARCHES,GEOMETRY_BREAKS,SPEED_SECTIONS,easedCurvature,integratedEasedCurvature,headingAt,curvatureAt,bankAt,bankDegreesAt,heightAt,surfaceHeightAt,GRIP_APEX,gripApexAt,widthAt,speedAt,setZoneSpeedStage,sectorAt,gapAt,nextGap,roadIntervals,onRoad,GUARDRAIL,guardrailLateralLimit,constrainToGuardrail,checkpointFor,LOOP_CLOSURE_ERROR_METERS,poseAt,surfaceNormalAt,positionAt,PROJECTION_083,projectWorldToTrack,nearestLane,shapeSteer,newFlightState,stepFlight,validateTrial};\n}\n";
  const shared=readFileSync(resolve(repo,'skyshift/flight/historical-skyline-trial.mjs'),'utf8');
  assert.ok(source.endsWith(adapter),key+' unexpected historical trial adapter');
  assert.ok(shared.startsWith(prefix)&&shared.endsWith(suffix),'Unexpected historical trial factory shape');
  const body=shared.slice(prefix.length,-suffix.length).replace(/^(const (?:clamp|lerp|smooth|TRIAL|SHOWCASE_PLAN|COURSE_SEGMENTS|TECHNICAL_APEX_PULSES|circuitPlanSummary|MAX_BANK_RAD|GAPS|ISLANDS|SPLITS|RISK_CUTS|CHECKPOINTS|SECTORS|ROAD_CUES|ARCHES|GEOMETRY_BREAKS|SPEED_SECTIONS|easedCurvature|integratedEasedCurvature|headingAt|curvatureAt|bankAt|bankDegreesAt|heightAt|surfaceHeightAt|GRIP_APEX|gripApexAt|widthAt|speedAt|setZoneSpeedStage|sectorAt|gapAt|nextGap|roadIntervals|onRoad|GUARDRAIL|guardrailLateralLimit|constrainToGuardrail|checkpointFor|LOOP_CLOSURE_ERROR_METERS|poseAt|surfaceNormalAt|positionAt|PROJECTION_083|projectWorldToTrack|nearestLane|shapeSteer|newFlightState|stepFlight|validateTrial)=|function (?:clamp|lerp|smooth|TRIAL|SHOWCASE_PLAN|COURSE_SEGMENTS|TECHNICAL_APEX_PULSES|circuitPlanSummary|MAX_BANK_RAD|GAPS|ISLANDS|SPLITS|RISK_CUTS|CHECKPOINTS|SECTORS|ROAD_CUES|ARCHES|GEOMETRY_BREAKS|SPEED_SECTIONS|easedCurvature|integratedEasedCurvature|headingAt|curvatureAt|bankAt|bankDegreesAt|heightAt|surfaceHeightAt|GRIP_APEX|gripApexAt|widthAt|speedAt|setZoneSpeedStage|sectorAt|gapAt|nextGap|roadIntervals|onRoad|GUARDRAIL|guardrailLateralLimit|constrainToGuardrail|checkpointFor|LOOP_CLOSURE_ERROR_METERS|poseAt|surfaceNormalAt|positionAt|PROJECTION_083|projectWorldToTrack|nearestLane|shapeSteer|newFlightState|stepFlight|validateTrial)\()/gm,'export $1');
  source=source.slice(0,-adapter.length)+body;
 }
 const c=m.consumers.find(x=>x.path===key);
 if(!c)return source;
 let s=source;
 for(const e of [...c.edits].reverse()){
  assert.equal(s.split(e.after).length-1,e.count,key+' '+e.after);
  assert.ok(!s.includes(e.before),key+' '+e.before);
  s=s.split(e.after).join(e.before);
 }
 assert.equal(sha(s),c.sha,key+' EF02H inverse');
 return s;
}
export function ef02hCurrentPath(path){
 const key=relative(repo,resolve(repo,path)).replaceAll('\\','/');
 const move=m.moves.find(x=>x.oldPath===key);
 return move?resolve(repo,move.newPath):path;
}
