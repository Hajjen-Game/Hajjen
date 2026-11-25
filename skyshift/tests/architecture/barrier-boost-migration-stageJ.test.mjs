import {restoreEF02H,ef02hCurrentPath} from './ef02h-path-overlay.mjs';
// SKYSHIFT Architecture Cleanup 2.0 Stage J: preserve immutable source, paths and runtime imports.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'docs/architecture/stageJ-migration-manifest.json'),'utf8'));
const entries=Object.entries(manifest.files);
const originalAbs=new Map(entries.map(([name,{destination}])=>[resolve(root,destination),resolve(root,name)]));
const originalNames=new Set(entries.map(([name])=>name));
function hash(text){const bytes=Buffer.from(text,'utf8');return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')}
function importSpec(from,to){let spec=relative(dirname(from),to).split(sep).join('/');return spec.startsWith('.')?spec:'./'+spec}
function walk(dir,out=[]){for(const d of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,d.name);if(d.isDirectory())walk(p,out);else if(d.isFile()&&['.mjs','.js','.html','.yml','.yaml'].includes(extname(p)))out.push(p)}return out}
test('Stage J preserves exact 35 original barrier/boost Git blobs after only import rebases',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(entries.length,35);
 assert.equal(entries.filter(([name])=>name.startsWith('aero-barrier-')).length,24);
 assert.equal(entries.filter(([name])=>name.startsWith('boost-')).length,11);
 for(const [name,{destination,originalGitBlobSha}] of entries){
  assert.equal(existsSync(resolve(root,name)),false,'Unmoved old root module '+name);
  const relocated=resolve(root,destination);assert.ok(existsSync(relocated),'Missing relocated module '+name);
  let currentSource=readFileSync(relocated,'utf8');
  // EF02J: for exactly three grouped boost adapters, reverse the shared-body extraction
  // using the actual shared implementation, then run the original immutable blob guard.
  if(['boost-v0150.mjs','boost-v0151.mjs','boost-v0160.mjs'].includes(name)){
   const prefix="// Shared grouped-pad boost solver; all per-version track policy stays in adapters.\nexport function createGroupedBoostAPI(BOOST_CONFIG,riskChoiceAt){\n",suffix="\n return {clamp,boostPadAt,initBoostState,boostedSpeedAt,stepBoostState};\n}\n";
   const adapter="import {createGroupedBoostAPI} from \"./grouped-boost.mjs\";\nexport const {clamp,boostPadAt,initBoostState,boostedSpeedAt,stepBoostState}=createGroupedBoostAPI(BOOST_CONFIG,riskChoiceAt);\n";
   assert.ok(currentSource.endsWith(adapter),name+' unexpected grouped boost adapter');
   const shared=readFileSync(resolve(root,'flight/boost/grouped-boost.mjs'),'utf8');
   assert.ok(shared.startsWith(prefix)&&shared.endsWith(suffix),'Unexpected grouped boost factory shape');
   const body=shared.slice(prefix.length,-suffix.length).replace(/^(const clamp=|function (?:boostPadAt|initBoostState|boostedSpeedAt|stepBoostState)\()/gm,'export $1');
   currentSource=currentSource.slice(0,-adapter.length)+body;
  }
  // EF02J: reverse only the approved thirteen aero-barrier factory extractions.
  const railVersions=["072","081","082","083","084","0901","0160","0161","0162","0163","0164","070","071"];
  const railVersion=name.match(/^aero-barrier-v(\d+)\.mjs$/)?.[1];
  if(railVersions.includes(railVersion)){
   const legacy=['070','071'].includes(railVersion);
   const aurora=['0161','0162','0163','0164'].includes(railVersion);
   const adapter=legacy?"import {createAeroBarrierAPI} from \"./shared-aero-barrier.mjs\";\nexport const {\n AERO_BARRIER,\n AERO_PROFILE,\n cornerRailEmphasisAt,\n railHeightAt,\n sampleAeroProfile,\n createAeroBarrierData,\n createAeroDetailData,\n RAIL_SPECTRAL_VERTEX,\n RAIL_SPECTRAL_FRAGMENT,\n patchRailShaders,\n installAeroBarriers\n}=createAeroBarrierAPI({TRIAL,GUARDRAIL,COURSE_SEGMENTS,positionAt,widthAt,curvatureAt,gapAt,GAPS,ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL,classicChevrons:true});\n":aurora?"import {createAeroBarrierAPI} from \"./shared-aero-barrier.mjs\";\nexport const {\n AERO_BARRIER,\n AERO_PROFILE,\n cornerRailEmphasisAt,\n railHeightAt,\n sampleAeroProfile,\n createAeroBarrierData,\n createAeroDetailData,\n RAIL_SPECTRAL_VERTEX,\n RAIL_SPECTRAL_FRAGMENT,\n patchRailShaders,\n installAeroBarriers\n}=createAeroBarrierAPI({TRIAL,GUARDRAIL,COURSE_SEGMENTS,positionAt,widthAt,curvatureAt,gapAt,GAPS,CORKSCREW,ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL,isAurora});\n":"import {createAeroBarrierAPI} from \"./shared-aero-barrier.mjs\";\nexport const {\n AERO_BARRIER,\n AERO_PROFILE,\n cornerRailEmphasisAt,\n railHeightAt,\n sampleAeroProfile,\n createAeroBarrierData,\n createAeroDetailData,\n RAIL_SPECTRAL_VERTEX,\n RAIL_SPECTRAL_FRAGMENT,\n patchRailShaders,\n installAeroBarriers\n}=createAeroBarrierAPI({TRIAL,GUARDRAIL,COURSE_SEGMENTS,positionAt,widthAt,curvatureAt,gapAt,GAPS,CORKSCREW,ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL});\n";
   const prefix="// Shared terrain-following aero barrier. Track samplers, wave inputs and density policy stay explicit.\nexport function createAeroBarrierAPI({TRIAL,GUARDRAIL,COURSE_SEGMENTS,positionAt,widthAt,curvatureAt,gapAt,GAPS,CORKSCREW,ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL,isAurora=()=>false,classicChevrons=false}){\n",suffix="\n return {AERO_BARRIER,AERO_PROFILE,cornerRailEmphasisAt,railHeightAt,sampleAeroProfile,createAeroBarrierData,createAeroDetailData,RAIL_SPECTRAL_VERTEX,RAIL_SPECTRAL_FRAGMENT,patchRailShaders,installAeroBarriers};\n}\n";
   const shared=readFileSync(resolve(root,'tracks/barriers/shared-aero-barrier.mjs'),'utf8');
   assert.ok(currentSource.endsWith(adapter),name+' unexpected aero barrier adapter');
   assert.ok(shared.startsWith(prefix)&&shared.endsWith(suffix),'Unexpected aero barrier factory shape');
   const body=shared.slice(prefix.length,-suffix.length)
    .replace("function createAeroBarrierData(step=isAurora()?1.55:AERO_BARRIER.step){",aurora?"// Aurora's broad minimum ~120m turns need no 0.95m rail tessellation:\n // 1.55m changes the polyline arc sagitta by <3mm, halves expensive\n // world rail triangles on the user's 4GB mobile GPU. Physical collider\n // and constant-width steering geometry stay at full precision.\nfunction createAeroBarrierData(step=isAurora()?1.55:AERO_BARRIER.step){":"function createAeroBarrierData(step=AERO_BARRIER.step){")
    .replace("  const screw=!classicChevrons&&s>=CORKSCREW.start&&s<=CORKSCREW.end;\n   if(!screw&&Math.abs(curvatureAt(s))<AERO_BARRIER.arrowCurvatureThreshold)continue;",legacy?"  if(Math.abs(curvatureAt(s))<AERO_BARRIER.arrowCurvatureThreshold)continue;":"  const screw=s>=CORKSCREW.start&&s<=CORKSCREW.end;\n   if(!screw&&Math.abs(curvatureAt(s))<AERO_BARRIER.arrowCurvatureThreshold)continue;")
    .replace("   const intensity=screw?1.46:(side===outer?1.33:1.13);",legacy?"   const intensity=side===outer?1.33:1.13;":"   const intensity=screw?1.46:(side===outer?1.33:1.13);")
    .replace(/^(const (?:AERO_BARRIER|AERO_PROFILE|RAIL_SPECTRAL_VERTEX|RAIL_SPECTRAL_FRAGMENT)=|function (?:cornerRailEmphasisAt|railHeightAt|sampleAeroProfile|createAeroBarrierData|createAeroDetailData|patchRailShaders|installAeroBarriers)\()/gm,'export $1');
   currentSource=currentSource.slice(0,-adapter.length)+body;
  }
  const source=restoreEF02H(currentSource,relocated);
  const reconstructed=source.replace(/(["'])(\.{1,2}\/[^"'\r\n]+)\1/g,(ent,quote,spec)=>{
   const pure=spec.split(/[?#]/)[0],suffix=spec.slice(pure.length);
   const current=resolve(dirname(relocated),pure);
   assert.ok(existsSync(ef02hCurrentPath(current)),'Unresolved Stage J ESM/file reference '+name+' -> '+spec);
   const oldTarget=originalAbs.get(current)||current;
   return quote+importSpec(resolve(root,name),oldTarget)+suffix+quote;
  });
  assert.equal(hash(reconstructed),originalGitBlobSha,'Unexpected runtime logic/graphics change in '+name);
 }
});
test('Stage J leaves no stale root references in executable sources or workflow checks',()=>{
 const candidates=[...walk(root),...walk(resolve(repo,'.github/workflows'))];
 assert.ok(candidates.length>200,'Incomplete executable source audit');
 for(const path of candidates){
  if(path===fileURLToPath(import.meta.url))continue;
  const src=readFileSync(path,'utf8');
  for(const name of originalNames)assert.ok(!src.includes('skyshift/'+name),'Stale workflow/command path '+name+' in '+relative(repo,path));
  for(const match of src.matchAll(/["'](\.{1,2}\/[^"'\r\n]+)["']/g)){
   const target=resolve(dirname(path),match[1].split(/[?#]/)[0]);
   assert.ok(!originalNames.has(relative(root,target)),'Stale root import '+relative(repo,path)+' -> '+match[1]);
  }
 }
});
