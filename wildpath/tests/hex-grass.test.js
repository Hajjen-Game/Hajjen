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
