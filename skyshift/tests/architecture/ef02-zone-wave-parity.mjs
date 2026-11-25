// EF02J: exact deterministic wave and shader parity against the existing pinned EF01 reference.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const [before]=process.argv.slice(2);
assert.ok(before);
const root=fileURLToPath(new URL('../../',import.meta.url));
const load=(dir,path)=>import(pathToFileURL(resolve(dir,path)));
let oldBytes=0,newBytes=0;
for(const version of ['050','051','060']){
 const name='zone-wave-v'+version+'.mjs';
 const old=await load(resolve(before,'skyshift'),name),now=await load(root,name);
 oldBytes+=readFileSync(resolve(before,'skyshift',name)).length;
 newBytes+=readFileSync(resolve(root,name)).length;
 assert.deepEqual(Object.keys(now).sort(),Object.keys(old).sort());
 assert.deepEqual(now.ZONE_WAVE,old.ZONE_WAVE);
 assert.deepEqual(now.ZONE_PALETTES,old.ZONE_PALETTES);
 assert.equal(now.SPECTRAL_FRONT_GLSL,old.SPECTRAL_FRONT_GLSL);
 for(const times of [Array.from({length:21601},(_,i)=>i/120),[0,17,18,20,36,75,144,170,180]]){
  const a=now.newZoneWaveState(),b=old.newZoneWaveState();
  assert.deepEqual(a,b);
  for(const t of times){
   const s=60*t+20*Math.sin(t/3);
   assert.deepEqual(now.updateZoneWave(a,t,s),old.updateZoneWave(b,t,s));
   assert.deepEqual(a,b);
   assert.deepEqual(now.frontPaletteBlend(a,s),old.frontPaletteBlend(b,s));
   assert.equal(now.spectralChargeStrength(t),old.spectralChargeStrength(t));
   assert.equal(now.horizonWaveCue(a,s),old.horizonWaveCue(b,s));
   assert.equal(now.waveResonanceStrength(a,t),old.waveResonanceStrength(b,t));
   for(const point of [s-90,s,s+135,a.fronts[0],a.fronts[0]+.001]){
    assert.equal(now.stageAtS(a,point),old.stageAtS(b,point));
   }
  }
  assert.deepEqual(a.activatedStages,[1,2,3,4,5,6,7,8]);
 }
 for(const invalid of [[NaN,0],[0,Infinity]]){
  assert.throws(()=>now.updateZoneWave(now.newZoneWaveState(),...invalid),/Non-finite SKYSHIFT wave position\/time/);
 }
 console.log('SKYSHIFT_EF02_ZONE_WAVE_PARITY '+JSON.stringify({version,triggers:now.ZONE_WAVE.triggers,frontSpeed:now.ZONE_WAVE.frontMetersPerSecond,shaderIdentical:true}));
}
newBytes+=readFileSync(resolve(root,'core/zone-wave.mjs')).length;
assert.ok(newBytes<oldBytes);
console.log('SKYSHIFT_EF02_ZONE_WAVE_BYTES '+JSON.stringify({oldBytes,newBytes,reduction:oldBytes-newBytes}));
