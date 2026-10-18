import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEX_GRASS_TINTS,HEX_GRASS_SIZE,HEX_GRASS_TEXTURE_SIZE,
  hexVertices,hexTileLayout,paintHexGrass,applyHexGrassToGround}
  from '../src/hex-grass.js';
import {WILD_RADIUS,WILD_FLOOR_RADIUS,WILD_CAMERA_WIDTH}
  from '../src/open-layout.js';
import {CLASS_DATA} from '../src/config.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

function fakeCanvas(){
  const paths=[],fills=[];
  let current=[];
  const ctx={
    fillStyle:'',strokeStyle:'',lineWidth:0,
    fillRect(x,y,w,h){fills.push({kind:'background',color:this.fillStyle,x,y,w,h})},
    beginPath(){current=[]},
    moveTo(x,y){current.push({x,y})},
    lineTo(x,y){current.push({x,y})},
    closePath(){},
    fill(){paths.push({corners:current.slice(),color:this.fillStyle})},
    stroke(){}
  };
  return {ctx,paths,fills};
}
test('five clean green colors and a mobile-readable tile size',()=>{
  assert.equal(HEX_GRASS_TINTS.length,5);
  assert.equal(new Set(HEX_GRASS_TINTS).size,5);
  assert.ok(HEX_GRASS_SIZE>=2.8&&HEX_GRASS_SIZE<=4);
  assert.equal(HEX_GRASS_TEXTURE_SIZE,2048);
  const green=HEX_GRASS_TINTS.map(hex=>parseInt(hex.slice(3,5),16));
  assert.ok(Math.max(...green)-Math.min(...green)>=50);
});
test('hex tessellation is truly six-sided, not blurred grid squares',()=>{
  const corners=hexVertices(0,0,12);
  assert.equal(corners.length,6);
  for(const p of corners)assert.ok(Math.abs(Math.hypot(p.x,p.y)-12)<1e-8);
  const distances=corners.map((p,i)=>{
    const b=corners[(i+1)%6];return Math.hypot(p.x-b.x,p.y-b.y);
  });
  assert.ok(distances.every(v=>Math.abs(v-12)<1e-8));
  const tiles=hexTileLayout(180);
  assert.ok(tiles.length>800&&tiles.length<1800);
  assert.equal(new Set(tiles.map(t=>t.q+','+t.r)).size,tiles.length);
  assert.equal(new Set(tiles.map(t=>t.shade)).size,5);
});
test('canvas painter draws solid, crisp six-sided hexagons with no dark outlines',()=>{
  const {ctx,paths,fills}=fakeCanvas();
  const report=paintHexGrass(ctx,{textureSize:512,floorWidth:180});
  assert.equal(report.cells,paths.length);
  assert.equal(report.textureSize,512);
  assert.equal(fills.length,1);
  assert.equal(fills[0].w,512);
  for(const polygon of paths){
    assert.equal(polygon.corners.length,6);
    assert.ok(HEX_GRASS_TINTS.includes(polygon.color));
  }
  assert.equal(ctx.lineWidth,1.1);
  assert.ok(read('../src/hex-grass.js').includes('ctx.strokeStyle=shade'));
});
test('Babylon atlas applies to original material; no geometry/visibility changes',()=>{
  const saved=globalThis.window;
  let created=0,disposed=0,updates=0;
  class DynamicTexture{
    constructor(){created++;this.ctx=fakeCanvas().ctx}
    getContext(){return this.ctx}
    update(){updates++}
    isReady(){return true}
    dispose(){disposed++}
  }
  try{
    globalThis.window={BABYLON:{DynamicTexture,
      Texture:{BILINEAR_SAMPLINGMODE:2}}};
    const material={name:'original working meadow',diffuseTexture:null};
    const ground={material,isVisible:true,position:{y:-.12}};
    const result=applyHexGrassToGround({},ground,{floorWidth:180});
    assert.equal(result.applied,true);
    assert.equal(created,1);
    assert.equal(updates,1);
    assert.equal(disposed,0);
    assert.equal(ground.material,material);
    assert.equal(ground.isVisible,true);
    assert.equal(ground.position.y,-.12);
    assert.equal(material.diffuseTexture instanceof DynamicTexture,true);
  }finally{
    if(saved===undefined)delete globalThis.window;
    else globalThis.window=saved;
  }
});
test('texture failure preserves original green floor and previous material',()=>{
  const saved=globalThis.window;
  let disposed=0;
  class BrokenTexture{
    getContext(){throw Error('WebGL context unavailable')}
    dispose(){disposed++}
  }
  try{
    globalThis.window={BABYLON:{DynamicTexture:BrokenTexture,Texture:{}}};
    const previous={name:'old atlas'};
    const material={diffuseTexture:previous};
    const ground={isVisible:true,material};
    const warn=console.warn;
    console.warn=()=>{};
    try{
      const result=applyHexGrassToGround({},ground,{floorWidth:180});
      assert.equal(result.applied,false);
      assert.equal(material.diffuseTexture,previous);
      assert.equal(ground.isVisible,true);
      assert.equal(disposed,1);
    }finally{console.warn=warn}
  }finally{
    if(saved===undefined)delete globalThis.window;
    else globalThis.window=saved;
  }
});
test('original world keeps the same geometry, nature and movement in all modes',()=>{
  const world=read('../src/world-open.js');
  const main=read('../src/main.js');
  assert.ok(world.includes('subdivisions:20'));
  assert.ok(world.includes('applyHexGrassToGround(scene,ground,'));
  assert.ok(world.includes("return {ground,kind:'open'"));
  assert.ok(!world.includes('ground.isVisible=false'));
  assert.ok(!world.includes('createHexGrass('));
  assert.ok(main.includes("hexGrass:DAISUGI_MODE&&params.get('hex')!=='0'"));
  assert.ok(world.includes('staticVegetation=true,hexGrass=false'));
  assert.equal(WILD_RADIUS,43);
  assert.equal(WILD_FLOOR_RADIUS,90);
  assert.equal(WILD_CAMERA_WIDTH,29.5);
  assert.equal(CLASS_DATA.caster.speed,5.25);
  assert.ok(main.includes('const DAISUGI_CAMERA_WORLD_WIDTH=24.5'));
});

test('actual open world constructor keeps green ground in default, hex and fallback modes',async()=>{
  const prev=globalThis.window,groundMeshes=[];
  class Color3{
    constructor(r,g,b){this.r=r;this.g=g;this.b=b}
    scale(t){return new Color3(this.r*t,this.g*t,this.b*t)}
    static FromHexString(s){return new Color3(parseInt(s.slice(1,3),16)/255,
      parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255)}
    static Lerp(a,b,t){return new Color3(a.r+(b.r-a.r)*t,
      a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t)}
  }
  const mesh=(name)=>({
    name,position:{y:0,set(){}},scaling:{set(){}},rotation:{z:0},
    isVisible:true,isPickable:false,createInstance(n){return mesh(n)},
    getVerticesData(){return this.positions},
    setVerticesData(kind,values){this.colors=values}
  });
  class DynamicTexture{
    constructor(){this.ctx=fakeCanvas().ctx}
    getContext(){return this.ctx}
    update(){}
    isReady(){return true}
  }
  const B={
    Color3,StandardMaterial:class{constructor(name){this.name=name}},
    DynamicTexture,Texture:{BILINEAR_SAMPLINGMODE:2},
    VertexBuffer:{PositionKind:1,ColorKind:2},
    MeshBuilder:{
      CreateGround(name,{width,height,subdivisions:n}){
        const ground=mesh(name),positions=[];
        for(let j=0;j<=n;j++)for(let i=0;i<=n;i++)
          positions.push((i/n-.5)*width,0,(j/n-.5)*height);
        ground.positions=positions;groundMeshes.push(ground);
        return ground;
      },CreateSphere:mesh,CreateCylinder:mesh
    }
  };
  try{
    globalThis.window={BABYLON:B};
    const {createOpenWorld}=await import('../src/world-open.js?hex-1-3-world-smoke=1');
    const plain=createOpenWorld({},{staticVegetation:false,hexGrass:false});
    const hex=createOpenWorld({},{staticVegetation:false,hexGrass:true});
    assert.equal(groundMeshes.length,2);
    assert.equal(plain.ground.name,'continuous woodland floor');
    assert.equal(hex.ground.name,'continuous woodland floor');
    assert.equal(plain.ground.isVisible,true);
    assert.equal(hex.ground.isVisible,true);
    assert.equal(plain.ground.positions.length/3,441);
    assert.equal(hex.ground.positions.length/3,441);
    assert.ok(plain.ground.colors.every(Number.isFinite));
    assert.ok(hex.ground.colors.every(Number.isFinite));
    assert.equal(plain.hexApplied,false);
    assert.equal(hex.hexApplied,true);
    assert.equal(plain.ground.material.diffuseTexture,undefined);
    assert.ok(hex.ground.material.diffuseTexture instanceof DynamicTexture);
  }finally{
    if(prev===undefined)delete globalThis.window;
    else globalThis.window=prev;
  }
});
