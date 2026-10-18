import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEX_GRASS_SHADES,HEX_GRASS_SIZE,buildHexGrassGeometry,
  createHexGrass} from '../src/hex-grass.js';
import {WILD_RADIUS,WILD_FLOOR_RADIUS,WILD_CAMERA_WIDTH}
  from '../src/open-layout.js';
import {CLASS_DATA} from '../src/config.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('five subtly different green shades form hexagons without drawn outlines',()=>{
  assert.equal(HEX_GRASS_SHADES.length,5);
  assert.ok(HEX_GRASS_SIZE>=1.8&&HEX_GRASS_SIZE<=2.5);
  const mesh=buildHexGrassGeometry({
    floorWidth:WILD_FLOOR_RADIUS*2,playRadius:WILD_RADIUS
  });
  assert.equal(mesh.shadeCounts.length,5);
  assert.equal(mesh.shadeCounts.reduce((a,b)=>a+b,0),mesh.count);
  assert.ok(mesh.shadeCounts.every(v=>v>400));
  assert.equal(mesh.positions.length,mesh.count*13*3);
  assert.equal(mesh.colors.length,mesh.count*13*4);
  assert.equal(mesh.indices.length,mesh.count*54);
  for(const t of mesh.colors)assert.ok(t>=0&&t<=1);
  const source=read('../src/hex-grass.js');
  assert.ok(source.includes('const edge=blend(base,tinted,.62)'));
  assert.ok(!source.includes('CreateLines('));
  assert.ok(!source.includes('ShaderMaterial'));
  assert.ok(!source.includes('DynamicTexture'));
});
test('hex triangles face upwards and remain one light mobile-sized mesh',()=>{
  const m=buildHexGrassGeometry({
    floorWidth:WILD_FLOOR_RADIUS*2,playRadius:WILD_RADIUS
  });
  assert.ok(m.count>2500&&m.count<4000);
  assert.ok(m.positions.length/3<50000);
  assert.ok(m.indices.length/3<60000);
  assert.ok(m.indices.every(i=>i>=0&&i<m.positions.length/3));
  for(let i=0;i<m.indices.length;i+=3){
    const a=m.indices[i]*3,b=m.indices[i+1]*3,c=m.indices[i+2]*3,p=m.positions;
    const dx1=p[b]-p[a],dz1=p[b+2]-p[a+2],
      dx2=p[c]-p[a],dz2=p[c+2]-p[a+2];
    const normalY=dz1*dx2-dx1*dz2;
    assert.ok(normalY>0,'hex face must be visible from above');
  }
});
test('Babylon adapter makes one noncolliding field; original ground remains intact',()=>{
  const original=globalThis.window;
  try{
    let meshCount=0;
    class MockMesh{
      constructor(name){this.name=name;meshCount++;this.position={y:0}}
    }
    class VertexData{
      applyToMesh(mesh){mesh.data={positions:this.positions,
        indices:this.indices,normals:this.normals,colors:this.colors}}
    }
    class Color3{constructor(r,g,b){this.r=r;this.g=g;this.b=b}}
    class StandardMaterial{constructor(name){this.name=name}}
    globalThis.window={BABYLON:{Mesh:MockMesh,VertexData,
      Color3,StandardMaterial}};
    const ground={position:{y:-.12},material:{name:'original matte'},
      isVisible:true};
    const mesh=createHexGrass({},ground,{
      floorWidth:WILD_FLOOR_RADIUS*2,playRadius:WILD_RADIUS
    });
    assert.equal(meshCount,1);
    assert.equal(mesh.position.y,ground.position.y);
    assert.notEqual(mesh.material,ground.material);
    assert.equal(mesh.material.disableLighting,true);
    assert.equal(mesh.material.backFaceCulling,false);
    assert.equal(mesh.material.specularColor.r,0);
    assert.equal(mesh.isPickable,false);
    assert.equal(mesh.useVertexColors,true);
    assert.equal(ground.isVisible,false);
    assert.ok(mesh.data.positions.length>50000);
  }finally{
    if(original===undefined)delete globalThis.window;
    else globalThis.window=original;
  }
});
test('Daisugi-only flag supports hex=0 comparison and preserves the original game',()=>{
  const main=read('../src/main.js'),world=read('../src/world-open.js');
  assert.ok(main.includes("staticVegetation:!DAISUGI_MODE"));
  assert.ok(main.includes("hexGrass:DAISUGI_MODE&&params.get('hex')!=='0'"));
  assert.ok(world.includes('createOpenWorld(scene,{staticVegetation=true,hexGrass=false}={})'));
  assert.ok(world.includes('const tiledGround=hexGrass?createHexGrass(scene,ground,'));
  assert.ok(world.includes('ground:tiledGround||ground'));
  assert.equal(WILD_RADIUS,43);
  assert.equal(WILD_FLOOR_RADIUS,90);
  assert.equal(WILD_CAMERA_WIDTH,29.5);
  assert.equal(CLASS_DATA.caster.speed,5.25);
  assert.ok(main.includes('const DAISUGI_CAMERA_WORLD_WIDTH=24.5'));
});

test('five mobile-readable greens have enough contrast even without scene lighting',()=>{
  assert.ok(HEX_GRASS_SHADES[0].g<-.10);
  assert.ok(HEX_GRASS_SHADES[4].g>.10);
  const spread=HEX_GRASS_SHADES[4].g-HEX_GRASS_SHADES[0].g;
  assert.ok(spread>.22,'hex cell palette needs visible shade separation');
  const materialSource=read('../src/hex-grass.js');
  assert.ok(materialSource.includes('material.disableLighting=true'));
  assert.ok(materialSource.includes('material.backFaceCulling=false'));
});
