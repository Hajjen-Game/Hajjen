import test from 'node:test';
import assert from 'node:assert/strict';
import {trueVelocityResponse,cameraHistoryValid,TRUE_VELOCITY_SHADER} from '../../rendering/true-velocity-motion-blur.mjs';
test('every mode is zero at and below launch speed, even with boost',()=>{
 for(const mode of ['off','low','medium','high','ultra','extreme'])for(const speedMultiplier of [0,.5,1])
  assert.equal(trueVelocityResponse({mode,playing:true,speedMultiplier,boostMultiplier:1.4}).gain,0);
 assert.equal(trueVelocityResponse({mode:'extreme',playing:false,speedMultiplier:3}).gain,0);
});
test('progressive response follows actual speed; quality and shutter normalization are bounded',()=>{
 const f={playing:true,mode:'high'};
 const values=[1,1.2,1.6,2,2.5,3.15].map(speedMultiplier=>trueVelocityResponse({...f,speedMultiplier}).gain);
 assert.equal(values[0],0);assert.ok(values.slice(1).every((v,i)=>v>values[i]));
 const high={...f,speedMultiplier:3},a=trueVelocityResponse(high);
 assert.ok(trueVelocityResponse({...high,mode:'ultra'}).gain>a.gain);
 assert.ok(trueVelocityResponse({...high,boostMultiplier:1.4}).gain>a.gain);
 assert.equal(trueVelocityResponse({...high,dt:1/30}).exposure,a.exposure/2);
 assert.equal(trueVelocityResponse({...high,dt:1/120}).exposure,a.exposure*2);
 assert.equal(trueVelocityResponse({...high,comparison:0}).gain,0);
 const reduced=trueVelocityResponse({...high,adaptiveLevel:2});
 assert.equal(reduced.samples,3);assert.ok(reduced.maxSpan<a.maxSpan&&reduced.gain<a.gain);
 assert.equal(trueVelocityResponse({...high,adaptiveLevel:1}).samples,5);
});
test('history rejects cuts, stalls and large rotation, allows genuine frame translation',()=>{
 const matrix=(x=0)=>({elements:[1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1]});
 assert.equal(cameraHistoryValid(null,matrix(),1/60),false);
 assert.equal(cameraHistoryValid(matrix(),matrix(2),1/60),true);
 assert.equal(cameraHistoryValid(matrix(),matrix(30),1/60),false);
 assert.equal(cameraHistoryValid(matrix(),matrix(2),.2),false);
 const rotated=matrix();rotated.elements[0]=-1;rotated.elements[10]=-1;
 assert.equal(cameraHistoryValid(matrix(),rotated,1/60),false);
});
test('shader uses real depth and previous clip, rejects cross-depth samples and protects craft',()=>{
 const s=TRUE_VELOCITY_SHADER.fragmentShader;
 assert.match(s,/texture2D\(tDepth,vUv\)/);assert.match(s,/uPreviousClipFromView\*view/);
 assert.match(s,/linearDepth\(d\)/);assert.match(s,/1\.0-protect\(uv\)/);
 assert.ok(!s.includes('vec2(0.5,0.55)'));
});
