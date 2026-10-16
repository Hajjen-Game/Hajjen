import test from 'node:test';
import assert from 'node:assert/strict';
import {slashFramePaths,slashFrameIndex,slashScreenAngle,slashVisualSize,WEAPON_SLASH_LICENSE} from '../src/weapon-slash.js';
test('use Cethiel original 6-frame groups without assuming sprite grid',()=>{
  assert.equal(WEAPON_SLASH_LICENSE,'CC0-1.0');
  assert.deepEqual(slashFramePaths('basic').map(x=>x.split('_').at(-1)),['01.png','02.png','03.png','04.png','05.png','06.png']);
  assert.deepEqual(slashFramePaths('wide').map(x=>x.split('_').at(-1)),['07.png','08.png','09.png','10.png','11.png','12.png']);
});
test('one-shot playback is time based and never wraps unexpectedly',()=>{
  assert.equal(slashFrameIndex(0),0);
  assert.equal(slashFrameIndex(.14),3);
  assert.equal(slashFrameIndex(.279),5);
  assert.equal(slashFrameIndex(.8),5);
  assert.equal(slashFrameIndex(-1),0);
});
test('mobile slash size stays compact and follows target direction',()=>{
  assert.ok(slashVisualSize(12)<95);
  assert.ok(slashVisualSize(12,true)>slashVisualSize(12));
  assert.ok(slashVisualSize(200,true)<=105);
  assert.ok(slashScreenAngle({x:0,y:0},{x:20,y:0})===0);
  assert.ok(Math.abs(slashScreenAngle({x:0,y:0},{x:0,y:20})-Math.PI/2)<1e-9);
});

test('all 12 original Classic PNG frames are present in the public game bundle',async()=>{
  const {readFileSync}=await import('node:fs');
  for(const kind of ['basic','wide']){
    for(const pathname of slashFramePaths(kind)){
      const f=readFileSync(new URL('../'+pathname.slice(2),import.meta.url));
      assert.ok(f.length>1000,pathname);
      assert.equal(f.subarray(1,4).toString(),'PNG');
    }
  }
});
test('Cethiel slash can be compared live against the previous Pixi visual',async()=>{
  const {WildpathPixiCombat}=await import('../src/pixi-combat.js');
  let destroyed=0;
  class Sprite {
    constructor(texture){
      this.texture=texture;this.visible=true;
      this.anchor={set(){}};
      this.position={set(x,y){this.x=x;this.y=y;}};
      this.scale={set(v){this.x=v;this.y=v;}};
    }
    destroy(){destroyed++;}
  }
  const fx=new WildpathPixiCombat(null,null,null);
  fx.ready=true;fx.PIXI={Sprite};
  fx.slashLayer={addChild(){}};
  fx.slashFrames={
    basic:Array.from({length:6},()=>({height:150})),
    wide:Array.from({length:6},()=>({height:150}))
  };
  fx.at=(x,z)=>({x:x*10,y:z*10});
  fx.scaleAt=()=>12;
  fx.app={render(){}};
  fx.graphics={clear(){}};
  fx.setSlashMode('asset');
  fx.stage('Steel Arc','burst',{x:6,z:6,originX:2,originZ:3,
    targetX:6,targetZ:6,followPlayer:true});
  assert.equal(fx.slashes.length,1);
  assert.equal(fx.effects.length,0);
  fx.updateSlashes(.14,{state:'play',x:2,z:3});
  assert.equal(fx.slashes[0].sprite.position.x,20);
  assert.equal(fx.slashes[0].sprite.position.y,30);
  assert.equal(fx.slashes[0].sprite.texture,fx.slashFrames.basic[2]);
  fx.clear();
  assert.equal(fx.slashes.length,0);
  assert.equal(destroyed,1);
  fx.setSlashMode('original');
  fx.stage('Steel Arc','burst',{x:6,z:6});
  assert.equal(fx.slashes.length,0);
  assert.equal(fx.effects.length,1);
  fx.clear();
});
