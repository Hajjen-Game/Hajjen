// Willowglow / Low-Poly Color Study 1.0.
// A real faceted 3D alternative to V11's thousands of thin blades.
// Shares the SIX in-game Nature Rebirth palettes, without changing gameplay.
import {NATURE_PALETTES,NATURE_PALETTE_IDS} from './nature-variety.js';

export const WILLOWGLOW_PALETTES=Object.freeze(['mixed',...NATURE_PALETTE_IDS]);
export const WILLOWGLOW_PALETTE_LABELS=Object.freeze({
  mixed:'Mixed',rose:'Rose',lilac:'Lilac',amber:'Amber',
  mint:'Mint',aqua:'Aqua',cream:'Cream'
});
// Each of V11's nine crown lobes keeps its own coherent colored neighborhood.
// The mixed version intentionally retains a sage-green backbone; the accent
// lobes read as botanical blooms, NOT confetti sprinkled on every triangle.
const MIXED_LOBES=['mint','mint','aqua','cream','amber','rose','mint','lilac','aqua'];
const LOBES=[
  [-2.20,5.32,.12,1.26,.81,1.09],
  [-1.44,6.40,-.66,1.16,.93,1.08],
  [-.24,7.35,-.21,1.33,.92,1.19],
  [1.35,6.81,-.48,1.23,.90,1.14],
  [2.36,5.80,.26,1.24,.81,1.05],
  [1.57,5.31,1.06,1.19,.81,1.06],
  [.25,5.50,1.42,1.27,.83,1.16],
  [-1.20,5.34,1.12,1.16,.82,1.08],
  [.19,6.16,-1.39,1.19,.85,1.06]
];
const ANGLE=2.399963229728653;
const HEX='#ffffff';
function random(seed=71123){
  return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
}
export function lowpolyPaletteForLobe(palette,index){
  if(!WILLOWGLOW_PALETTES.includes(palette))throw Error('Unknown Willowglow palette');
  return NATURE_PALETTES[palette==='mixed'?MIXED_LOBES[index%MIXED_LOBES.length]:palette];
}
export function buildLowPolyWillowglow(B,scene,{palette='mixed'}={}){
  if(!WILLOWGLOW_PALETTES.includes(palette))throw Error('Unknown Willowglow palette');
  const C=hex=>B.Color3.FromHexString(hex);
  const V=(x,y,z)=>new B.Vector3(x,y,z);
  const rand=random();
  const root=new B.TransformNode('HERO TREE / Willowglow low-poly color study',scene);
  const foliage={positions:[],indices:[],colors:[]};
  const wood={positions:[],indices:[],colors:[]};
  // Each triangle has its OWN three vertices, preserving deliberately crisp
  // planar normals and polygon edges without expensive normal smoothing.
  function triangle(batch,a,b,c,color){
    const start=batch.positions.length/3;
    for(const p of [a,b,c]){
      batch.positions.push(p.x,p.y,p.z);
      batch.colors.push(color.r,color.g,color.b,1);
    }
    batch.indices.push(start,start+1,start+2);
  }
  function prism(path,sides=7){
    for(let s=0;s<path.length-1;s++){
      const a=path[s],b=path[s+1];
      for(let j=0;j<sides;j++){
        const t=j*2*Math.PI/sides+.14,u=(j+1)*2*Math.PI/sides+.14;
        const p=V(a[0]+Math.cos(t)*a[3],a[1],a[2]+Math.sin(t)*a[3]);
        const q=V(a[0]+Math.cos(u)*a[3],a[1],a[2]+Math.sin(u)*a[3]);
        const r=V(b[0]+Math.cos(t)*b[3],b[1],b[2]+Math.sin(t)*b[3]);
        const w=V(b[0]+Math.cos(u)*b[3],b[1],b[2]+Math.sin(u)*b[3]);
        const facet=C(['#775947','#926f56','#ac8668','#816149'][j%4]);
        triangle(wood,p,q,r,facet);triangle(wood,q,w,r,facet);
      }
    }
  }
  prism([[0,-.08,0,.53],[-.06,.60,.03,.46],[-.15,1.40,.03,.35],
    [-.19,2.35,-.09,.27],[-.06,3.28,-.12,.21],[.10,4.47,-.16,.11]],9);
  // Deliberate but restrained angular forks: from above they peek through
  // the crown gaps instead of becoming a towering unrelated trunk.
  const branches=[
    [[-.12,2.70,0,.20],[-.66,4.08,.06,.125],[-1.76,5.27,.21,.04]],
    [[-.12,3.02,-.12,.18],[-.82,5.10,-.37,.10],[-1.19,6.35,-.34,.035]],
    [[-.06,3.15,-.12,.17],[.19,5.24,-.29,.09],[.31,6.85,-.21,.035]],
    [[-.08,2.90,-.12,.20],[.92,4.78,-.40,.11],[1.71,6.10,-.51,.04]],
    [[-.06,2.69,.04,.21],[.96,4.06,.42,.12],[2.17,5.42,.71,.04]],
    [[-.11,2.95,.09,.15],[.13,4.42,.86,.09],[.33,5.53,1.54,.04]]
  ];
  branches.forEach(path=>prism(path,6));

  let tuftCount=0;
  // 18-22 faceted foliage clumps per lobe, rather than ~4000 tiny V11 leaves.
  // Each clump has a non-spherical seven/eight-sided polygonal contour, a
  // bright upper plane, and darker sloping side planes. No hidden leaf balls.
  function clump(x,y,z,rx,ry,rz,pigment){
    const sides=7;
    const apex=V(x+(rand()-.5)*rx*.29,y+ry*.87,z+(rand()-.5)*rz*.20);
    const foot=V(x,y-ry*.54,z);
    const upper=[],lower=[];
    const phase=rand()*6.28;
    for(let j=0;j<sides;j++){
      const a=j*2*Math.PI/sides+phase;
      const r=.87+rand()*.25;
      upper.push(V(x+Math.cos(a)*rx*r,y+ry*(.12+rand()*.12),
        z+Math.sin(a)*rz*r));
      lower.push(V(x+Math.cos(a)*rx*r*.78,y-ry*(.32+rand()*.08),
        z+Math.sin(a)*rz*r*.78));
    }
    for(let j=0;j<sides;j++){
      const k=(j+1)%sides;
      const shade=(j%3)*.06;
      triangle(foliage,apex,upper[k],upper[j],
        B.Color3.Lerp(pigment,C(HEX),.10+shade));
      triangle(foliage,upper[j],upper[k],lower[j],
        B.Color3.Lerp(pigment,C('#345b4e'),.12+shade));
      triangle(foliage,upper[k],lower[k],lower[j],
        B.Color3.Lerp(pigment,C('#274538'),.24+shade));
      triangle(foliage,lower[j],lower[k],foot,
        B.Color3.Lerp(pigment,C('#294333'),.34));
    }
    tuftCount++;
  }
  LOBES.forEach((lobe,ci)=>{
    const [x,y,z,rx,ry,rz]=lobe,scheme=lowpolyPaletteForLobe(palette,ci);
    const leaf=C(scheme.leaf),light=C(scheme.light),petal=C(scheme.petal),accent=C(scheme.accent);
    const count=18+(ci%3)*2;
    for(let i=0;i<count;i++){
      const ny=1-2*(i+.5)/count,az=i*ANGLE+ci*1.29;
      const radial=Math.sqrt(1-ny*ny);
      const amount=.74+(rand()-.5)*.14;
      const bx=x+Math.cos(az)*rx*radial*amount;
      const by=y+ny*ry*amount;
      const bz=z+Math.sin(az)*rz*radial*amount;
      // Green structure, broad mid-tone foliage and grouped pastel blooms.
      // Facets within one clump vary in shade, not random pastel hue.
      const zone=(i+ci*3)%11;
      const base=zone<5?B.Color3.Lerp(leaf,light,.40+rand()*.40):
        zone<8?B.Color3.Lerp(light,petal,.32+rand()*.33):
        B.Color3.Lerp(petal,accent,.19+rand()*.36);
      const shade=ny<-.25?.82:ny>.44?1.08:.98;
      const tinted=base.scale(shade);
      const size=.31+rand()*.11;
      clump(bx,by,bz,size*(1+rx*.22),size*(.82+rand()*.36),
        size*(1+rz*.22),tinted);
    }
  });
  function mesh(name,batch,baseColor){
    const m=new B.Mesh(name,scene);
    const data=new B.VertexData();
    data.positions=batch.positions;data.indices=batch.indices;
    data.colors=batch.colors;data.normals=[];
    B.VertexData.ComputeNormals(batch.positions,batch.indices,data.normals);
    data.applyToMesh(m);
    const mat=new B.StandardMaterial(name+' / material',scene);
    mat.diffuseColor=C(baseColor);
    mat.ambientColor=C('#607969').scale(.38);
    mat.emissiveColor=C('#ffffff').scale(.07);
    mat.specularColor=C('#172d22').scale(.2);
    mat.backFaceCulling=false;mat.twoSidedLighting=true;
    m.material=mat;m.parent=root;m.useVertexColors=true;
    m.hasVertexAlpha=false;m.isPickable=false;
    return m;
  }
  mesh('Willowglow low-poly / seven-sided bark',wood,'#ffffff');
  mesh('Willowglow low-poly / faceted pastel canopy',foliage,'#ffffff');
  return {
    root,
    stats:{leaves:tuftCount,clusters:LOBES.length,branches:branches.length,
      triangles:(foliage.indices.length+wood.indices.length)/3,
      source:'faceted color-block clumps / in-game Nature Rebirth palettes'},
    palette
  };
}
