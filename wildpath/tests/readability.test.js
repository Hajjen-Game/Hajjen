import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

class Color {
  constructor(r=0,g=0,b=0){this.r=r;this.g=g;this.b=b;}
  static FromHexString(s){return new Color(parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255);}
  static Black(){return new Color();}
  scale(n){return new Color(this.r*n,this.g*n,this.b*n);}
}
class Vector {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;}
}
class Node {
  constructor(name,scene){this.name=name;this.scene=scene;this.position=new Vector();this.scaling=new Vector(1,1,1);this.rotation={x:0,y:0,z:0};scene.meshes.push(this);}
  dispose(){this.disposed=true;}
}
class Material{constructor(){this.emissiveColor=new Color();}dispose(){}}
const makeMesh=(name,options,scene)=>new Node(name,scene);
globalThis.window={BABYLON:{
  Vector3:Vector,Color3:Color,TransformNode:Node,StandardMaterial:Material,
  MeshBuilder:{
    CreateSphere:makeMesh,CreateCapsule:makeMesh,CreateCylinder:makeMesh,
    CreateBox:makeMesh,CreatePolyhedron:makeMesh,CreateTorus:makeMesh,
    CreateDisc:makeMesh,CreateTube:makeMesh
  }
}};
const [{createActor},fx]=await Promise.all([
  import('../src/actors-v2.js'),import('../src/vfx-v2.js')
]);
const scene=()=>({meshes:[]});

test('heroes use rounded capsule bodies and readable equipment',()=>{
  for(const type of ['caster','melee']){
    const s=scene(),actor=createActor(s,type);
    assert.match(actor.body.name,/rounded capsule/);
    assert.ok(actor.leftArm&&actor.rightArm);
    if(type==='melee')assert.ok(actor.root.metadata.sword);
    actor.dispose();
  }
});
test('each enemy uses a recognizable capsule silhouette',()=>{
  for(const name of ['mossling','bramble','ember','guardian']){
    const s=scene(),actor=createActor(s,name,true);
    assert.equal(actor.body.name,name+' rounded capsule');
    actor.dispose();
  }
});
test('projectiles, ground AoE, shields, slashes and impacts construct',()=>{
  const s=scene();
  assert.match(fx.magicProjectile(s).name,/projectile/);
  assert.match(fx.vfxRing(s,'#bbffff').name,/magic wave/);
  assert.match(fx.crystal(s).name,/crystal/);
  assert.ok(fx.visibleGroundPool(s,'#bbffff',3).edge);
  assert.match(fx.shieldDome(s).name,/shield/);
  assert.match(fx.meleeSlash(s,0,0,.4).name,/sword slash/);
});
test('the UI and keyboard both use spell keys 1, 2, 3',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const keys=Array.from(html.matchAll(/class="ability-key">([1-3])<\/div>/g),m=>m[1]);
  assert.deepEqual(keys,['1','2','3']);
  assert.match(js,/Digit1','Digit2','Digit3/);
  assert.doesNotMatch(js,/Digit2','Digit3','Digit4/);
  assert.match(js,/vfx-v2\.js/);
});
