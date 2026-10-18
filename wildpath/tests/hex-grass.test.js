import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEX_GRASS_COLORS,HEX_GRASS_SIZE,HEX_GRASS_SUBDIVISIONS,
  hexGrassCell,sampleHexGrass} from '../src/hex-grass.js';
import {WILD_RADIUS,WILD_FLOOR_RADIUS,WILD_CAMERA_WIDTH}
  from '../src/open-layout.js';
import {CLASS_DATA} from '../src/config.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('five meaningful green shades and large visible hex fields',()=>{
  assert.equal(HEX_GRASS_COLORS.length,5);
  assert.equal(new Set(HEX_GRASS_COLORS).size,5);
  assert.ok(HEX_GRASS_SIZE>=2.8&&HEX_GRASS_SIZE<=4.0);
  assert.ok(HEX_GRASS_SUBDIVISIONS>=140&&HEX_GRASS_SUBDIVISIONS<=190);
  const green=HEX_GRASS_COLORS.map(c=>parseInt(c.slice(3,5),16));
  assert.ok(Math.max(...green)-Math.min(...green)>=55);
});
test('axial rounding produces stable neighboring hex cells',()=>{
  for(let q=-6;q<=6;q++)for(let r=-6;r<=6;r++){
    const x=Math.sqrt(3)*HEX_GRASS_SIZE*(q+r/2),z=1.5*HEX_GRASS_SIZE*r;
    const cell=hexGrassCell(x,z);
    assert.equal(cell.q,q);
    assert.equal(cell.r,r);
    assert.ok(cell.shade>=0&&cell.shade<HEX_GRASS_COLORS.length);
  }
});
test('hex interiors have distinct greens and boundaries smoothly return to meadow',()=>{
  const base={r:.27,g:.56,b:.41};
  const shades=new Map();
  for(let q=-9;q<=9;q++)for(let r=-9;r<=9;r++){
    const x=Math.sqrt(3)*HEX_GRASS_SIZE*(q+r/2),z=1.5*HEX_GRASS_SIZE*r;
    const cell=hexGrassCell(x,z);
    if(!shades.has(cell.shade))shades.set(cell.shade,sampleHexGrass(x,z,base));
  }
  assert.equal(shades.size,5);
  const values=[...shades.values()].map(c=>c.g);
  assert.ok(Math.max(...values)-Math.min(...values)>.17);
  const center=sampleHexGrass(0,0,base);
  const closeToEdge=sampleHexGrass(HEX_GRASS_SIZE*Math.sqrt(3)/2-.07,0,base);
  assert.ok(Math.abs(closeToEdge.g-base.g)<Math.abs(center.g-base.g)+.001);
  for(const c of shades.values()){
    for(const v of Object.values(c))assert.ok(v>=0&&v<=1);
  }
});
test('critical regression: original ground is NEVER hidden or replaced',()=>{
  const world=read('../src/world-open.js');
  assert.ok(world.includes('subdivisions:hexGrass?HEX_GRASS_SUBDIVISIONS:20'));
  assert.ok(world.includes('const tile=hexGrass?sampleHexGrass(x,z,c):c;'));
  assert.ok(world.includes('return {ground,kind:'));
  assert.ok(!world.includes('ground.isVisible=false'));
  assert.ok(!world.includes('createHexGrass('));
  assert.ok(!world.includes('tiledGround'));
  assert.ok(!read('../src/hex-grass.js').includes('new B.Mesh('));
  assert.ok(!read('../src/hex-grass.js').includes('disableLighting'));
});
test('legacy defaults and Daisugi-only feature flag preserve player movement',()=>{
  const main=read('../src/main.js'),world=read('../src/world-open.js');
  assert.ok(main.includes("staticVegetation:!DAISUGI_MODE"));
  assert.ok(main.includes("hexGrass:DAISUGI_MODE&&params.get('hex')!=='0'"));
  assert.ok(world.includes('createOpenWorld(scene,{staticVegetation=true,hexGrass=false}={})'));
  assert.equal(WILD_RADIUS,43);
  assert.equal(WILD_FLOOR_RADIUS,90);
  assert.equal(WILD_CAMERA_WIDTH,29.5);
  assert.equal(CLASS_DATA.caster.speed,5.25);
  assert.ok(main.includes('const DAISUGI_CAMERA_WORLD_WIDTH=24.5'));
  assert.ok(main.includes("const dz=OPEN_WORLD?z*game.spec.speed*dt:"));
});

test('actual open-world floor stays visible in original, flat and hex Daisugi',async()=>{
  const previous=globalThis.window;
  class Color3{
    constructor(r,g,b){this.r=r;this.g=g;this.b=b}
    scale(n){return new Color3(this.r*n,this.g*n,this.b*n)}
    static FromHexString(s){return new Color3(
      parseInt(s.slice(1,3),16)/255,
      parseInt(s.slice(3,5),16)/255,
      parseInt(s.slice(5,7),16)/255)}
    static Lerp(a,b,t){return new Color3(
      a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t)}
  }
  const make=(name)=>({
    name,position:{y:0,set(){}},scaling:{set(){}},rotation:{z:0},
    isVisible:true,createInstance(name){return make(name)},
    getVerticesData(){return this.positions},
    setVerticesData(kind,values){this.colors=values}
  });
  const B={
    Color3,StandardMaterial:class{constructor(name){this.name=name}},
    VertexBuffer:{PositionKind:1,ColorKind:2},
    MeshBuilder:{
      CreateGround(name,{width,height,subdivisions:n}){
        const mesh=make(name),p=[];
        for(let z=0;z<=n;z++)for(let x=0;x<=n;x++)
          p.push((x/n-.5)*width,0,(z/n-.5)*height);
        mesh.positions=p;return mesh;
      },
      CreateSphere:make,CreateCylinder:make
    }
  };
  try{
    globalThis.window={BABYLON:B};
    // Deliberately import the REAL world module after setting its Babylon mock.
    // This guards against returning a hidden mesh, not just against bad text.
    const {createOpenWorld}=await import('../src/world-open.js?hex-ground-smoke=1');
    const flat=createOpenWorld({},{staticVegetation:false,hexGrass:false});
    const hex=createOpenWorld({},{staticVegetation:false,hexGrass:true});
    assert.equal(flat.ground.isVisible,true);
    assert.equal(hex.ground.isVisible,true);
    assert.equal(flat.ground.name,'continuous woodland floor');
    assert.equal(hex.ground.name,'continuous woodland floor');
    assert.equal(flat.ground.positions.length/3,21*21);
    assert.equal(hex.ground.positions.length/3,161*161);
    assert.equal(hex.ground.material.name,flat.ground.material.name);
    const greens=[];
    for(let i=1;i<hex.ground.colors.length;i+=4)greens.push(hex.ground.colors[i]);
    assert.ok(Math.min(...greens)>.15);
    assert.ok(Math.max(...greens)-Math.min(...greens)>.20);
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
});
