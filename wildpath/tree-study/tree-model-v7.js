// Willowglow 7.0: SILHOUETTE FIRST.
 // Shape nine rounded overlapping lobes BEFORE placing any visible foliage.
 // Lobes are positioning guides only; all visible foliage is curved real leaf geometry.
 // Reuses the successful 4.0 curved trunk and six sculpted main branches.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — silhouette first 7.0',
  foliage: ['#244932', '#326845', '#5a9759', '#89bf73', '#b2d38b'],
  blossoms: ['#f6d7c0', '#ffe9cc', '#efb8bb'],
  bark: '#815744'
});

function random(seed = 472031) {
  let n = seed >>> 0;
  return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function buildHeroTree(B, scene, shadows) {
  const V = (x,y,z) => new B.Vector3(x,y,z);
  const C = hex => B.Color3.FromHexString(hex);
  const rand = random();
  const pick = a => a[Math.floor(rand() * a.length)];
  const treeRoot = new B.TransformNode('HERO TREE / Willowglow', scene);

  const bark = new B.StandardMaterial('warm painted bark', scene);
  bark.diffuseColor = C('#b58b72');
  bark.specularColor = C('#16110c');
  bark.specularPower = 20;
  const barkCanvas = new B.DynamicTexture('bark grain / artist brushstrokes', {width:512,height:512}, scene, false);
  const barkCtx = barkCanvas.getContext();
  barkCtx.fillStyle = '#95634e';
  barkCtx.fillRect(0,0,512,512);
  // Fine parallel strokes and soft pale ridges make bark read at game distance.
  for (let i=0; i<300; i++) {
    const x = rand()*512, y = rand()*512, len = 14+rand()*155;
    barkCtx.strokeStyle = rand()<.50 ? 'rgba(65,36,30,'+(0.06+rand()*.16)+')' :
      'rgba(241,198,139,'+(0.05+rand()*.16)+')';
    barkCtx.lineWidth = 1+rand()*4;
    barkCtx.beginPath(); barkCtx.moveTo(x,y);
    barkCtx.bezierCurveTo(x+8*(rand()-.5),y+len*.35,x+12*(rand()-.5),y+len*.7,x+10*(rand()-.5),y+len);
    barkCtx.stroke();
  }
  barkCanvas.update();
  bark.diffuseTexture=barkCanvas;
  bark.backFaceCulling=true;

  function tube(name, points, startRadius, endRadius, tessellation=12) {
    const path = B.Curve3.CreateCatmullRomSpline(points.map(p=>V(...p)),8,false).getPoints();
    const mesh = B.MeshBuilder.CreateTube(name,{
      path, tessellation, cap:B.Mesh.CAP_ALL,
      radiusFunction:(i)=>startRadius+(endRadius-startRadius)*Math.pow(i/Math.max(1,path.length-1),.82)
    },scene);
    mesh.material=bark; mesh.parent=treeRoot; mesh.isPickable=false;
    shadows?.addShadowCaster(mesh);
    return mesh;
  }

  // Distinct root buttresses and a curved asymmetrical trunk.
  tube('continuous tapered trunk',[
    [0,-.05,0],[-.08,.85,.08],[-.19,1.9,-.10],[-.11,3.16,-.20],
    [.16,4.29,-.07],[.22,5.28,-.06]
  ],.49,.16,16);
  const roots = [
    [[-.05,.40,.12],[-.57,.21,.24],[-.95,.10,.40],[-1.15,.02,.58]],
    [[.09,.38,-.14],[.48,.22,-.54],[.8,.09,-.84]],
    [[.23,.38,.11],[.68,.17,.31],[.99,.08,.42]],
    [[-.15,.36,-.12],[-.47,.16,-.61],[-.55,.04,-.98]]
  ];
  roots.forEach((p,i)=>tube('sculpted root '+(i+1),p,.15,.025,8));

  // Six major branches, not fifteen straight spikes. Deliberate branching
  // gives a readable fork silhouette when camera rotates down to eye level.
  const boughs = [
    {name:'left lower',points:[[.00,3.50,.02],[-.40,4.12,.05],[-1.05,4.95,.22],[-1.83,5.90,.20]],a:.24,b:.048},
    {name:'left high',points:[[-.05,4.10,-.04],[-.40,5.02,-.17],[-.80,6.35,-.46],[-1.11,7.42,-.32]],a:.21,b:.040},
    {name:'center crown',points:[[.12,4.55,-.08],[.17,5.65,-.22],[.24,6.67,-.35],[.34,7.85,-.21]],a:.21,b:.041},
    {name:'right high',points:[[.13,4.06,-.08],[.72,5.01,-.28],[1.16,6.13,-.49],[1.73,7.20,-.50]],a:.23,b:.045},
    {name:'right low',points:[[.15,3.64,.06],[.72,4.42,.29],[1.55,5.10,.55],[2.13,6.23,.72]],a:.25,b:.048},
    {name:'front sheltered',points:[[-.06,3.93,.10],[.08,4.72,.69],[.18,5.45,1.24],[.34,6.40,1.65]],a:.18,b:.039}
  ];
  for(const b of boughs)tube('sculpted main bough / '+b.name,b.points,b.a,b.b,11);
  // These nine design envelopes define the intended finished silhouette.
  // They are NOT rendered: no hidden sphere, pancake or leaf-mass primitive.
  // Overlap is intentionally modest; valleys remain between crowned groups.
  const crowns = [
    {name:'left droop',x:-2.20,y:5.94,z:.12,rx:1.26,ry:.81,rz:1.09,leaves:298,lean:-.19},
    {name:'left summit',x:-1.44,y:7.02,z:-.66,rx:1.16,ry:.93,rz:1.08,leaves:280,lean:-.13},
    {name:'upper crown',x:-.24,y:7.97,z:-.21,rx:1.33,ry:.92,rz:1.19,leaves:346,lean:.02},
    {name:'right summit',x:1.35,y:7.43,z:-.48,rx:1.23,ry:.90,rz:1.14,leaves:316,lean:.18},
    {name:'right droop',x:2.36,y:6.42,z:.26,rx:1.24,ry:.81,rz:1.05,leaves:294,lean:.20},
    {name:'right front',x:1.57,y:5.93,z:1.06,rx:1.19,ry:.81,rz:1.06,leaves:281,lean:.07},
    {name:'center front',x:.25,y:6.12,z:1.42,rx:1.27,ry:.83,rz:1.16,leaves:310,lean:-.06},
    {name:'left front',x:-1.20,y:5.96,z:1.12,rx:1.16,ry:.82,rz:1.08,leaves:285,lean:-.14},
    {name:'back shoulder',x:.19,y:6.78,z:-1.39,rx:1.19,ry:.85,rz:1.06,leaves:301,lean:.07}
  ];
  // Four fine secondary branches are attached to actual bough ends only.
  // We deliberately avoid the original 15 trunk-to-tip spokes.
  const shoots=[
    [[-1.16,5.17,.14],[-1.66,5.52,.85],[-1.92,5.91,1.14]],
    [[-1.03,6.40,-.41],[-1.32,6.88,.29],[-1.46,7.23,.72]],
    [[1.36,6.13,-.48],[1.77,6.39,.27],[2.09,6.69,.83]],
    [[.21,5.69,1.12],[.72,5.87,1.31],[1.21,6.20,1.45]]
  ];
  shoots.forEach((pts,i)=>tube('hidden curved secondary twig '+i,pts,.080,.017,7));

  // Leaves are 3D curved surfaces with raised veins. Their positions are
  // derived from designed canopy envelopes; unlike 5/6 there are no visible
  // rosette centers, no long fern sprays, and no chunky volume meshes.
  const dark=C('#244d39'),mid=C('#4f8553'),bright=C('#8fbd73'),
    tips=C('#bdd698'),deep=C('#183b2d');
  const gradient=(a,b,t)=>B.Color3.Lerp(a,b,clamp(t,0,1));
  const batches=[
    {positions:[],indices:[],colors:[],uvs:[],name:'deep layered leaf undergrowth'},
    {positions:[],indices:[],colors:[],uvs:[],name:'sunlit sculpted crown leaves'}
  ];
  function addLeaf(batch,base,growth,length,width,pigment,curve) {
    const {positions,indices,colors,uvs}=batch;
    const forward=growth.normalize();
    let side=B.Vector3.Cross(forward,V(.18,1,.09)).normalize();
    if(side.lengthSquared()<.01)side=V(1,0,0);
    const lift=B.Vector3.Cross(side,forward).normalize();
    const first=positions.length/3;
    // Curved two-sided leaf with real midrib, not a billboard sprite.
    for(let k=0;k<=5;k++){
      const t=k/5;
      const w=width*Math.sin(Math.PI*t)**.70;
      const spine=base.add(forward.scale(length*t))
        .add(lift.scale(length*(.055*Math.sin(Math.PI*t)+curve*t*t)));
      const points=[
        {p:spine.subtract(side.scale(w)),c:gradient(pigment,deep,.13),u:0},
        {p:spine.add(lift.scale(w*.11)),c:gradient(pigment,tips,.16+.13*t),u:.5},
        {p:spine.add(side.scale(w)),c:gradient(pigment,dark,.09),u:1}
      ];
      for(const q of points){
        positions.push(q.p.x,q.p.y,q.p.z);
        colors.push(q.c.r,q.c.g,q.c.b,1);uvs.push(q.u,t);
      }
    }
    for(let k=0;k<5;k++){
      const a=first+k*3,b=a+3;
      indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
    }
  }
  // Quasi-uniform, nonrepeating distribution over each hand-designed lobe.
  // Tangential leaf orientation softly "tiles" each surface and keeps edges
  // rounded when viewed at 30–80 degrees, including side perspectives.
  const GOLDEN_ANGLE=2.399963229728653;
  let leafCount=0;
  crowns.forEach((g,ci)=>{
    const origin=V(g.x,g.y,g.z),phase=ci*1.61;
    for(let layer=0;layer<2;layer++){
      const inner=layer===0;
      const count=inner?Math.round(g.leaves*.25):g.leaves; // inner depth, mobile-friendly budget
      const density=inner?.69:.91;
      const batch=batches[inner?0:1];
      for(let i=0;i<count;i++){
        const cy=1-2*(i+.5)/count,az=i*GOLDEN_ANGLE+phase;
        const ring=Math.sqrt(Math.max(0,1-cy*cy));
        const norm=V(ring*Math.cos(az),cy,ring*Math.sin(az));
        // Asymmetric shapes: bias side lobes and the undersides, without spikes.
        const waviness=1+.05*Math.sin(az*3.0+ci*.7)+.027*Math.sin(az*7.0-ci);
        const x=norm.x*g.rx*density*waviness,
              y=norm.y*g.ry*density*(norm.y<0?.80:1.04),
              z=norm.z*g.rz*density*waviness;
        const base=origin.add(V(x+g.lean*(1-norm.y)*.13,y,z));
        // Gradient of the hidden guide ellipsoid gives the surface normal.
        const n=V(x/(g.rx*g.rx),y/(g.ry*g.ry),z/(g.rz*g.rz)).normalize();
        const down=V(g.lean*.35,-1,.04);
        const tangential=down.subtract(n.scale(B.Vector3.Dot(down,n))).normalize();
        let tangent=tangential.lengthSquared()<.05
           ?V(Math.cos(az+Math.PI/2),-.12,Math.sin(az+Math.PI/2))
           :tangential;
        const across=B.Vector3.Cross(n,tangent).normalize();
        tangent=tangent.add(across.scale((rand()-.5)*.55)).normalize();
        // Leaves lie along the envelope instead of radiating from a flower hub.
        const direction=tangent.scale(.78)
          .add(n.scale(.22+(rand()-.5)*.10)).normalize();
        const sunshine=Math.max(0,n.y),exposure=inner?.12:.40;
        let pigment=inner
          ?gradient(deep,dark,.28+.38*sunshine)
          :gradient(mid,bright,exposure+.42*sunshine+(rand()-.5)*.24);
        if(!inner&&ci%3===0)pigment=gradient(pigment,tips,.10);
        addLeaf(batch,base,direction,
          inner?.40+rand()*.10:.44+rand()*.15,
          inner?.14+rand()*.025:.165+rand()*.042,
          pigment,(rand()-.5)*.09);
        leafCount++;
        // On alternating exposed samples, add a small *overlapping* leaf to
        // close pinholes without puffing out the outer silhouette.
        if(!inner&&i%6===0){ // fewer occlusion leaves while preserving the envelope
          const second=direction.scale(.74).add(across.scale(.32)).normalize();
          const offset=base.subtract(n.scale(.05)).add(across.scale(.10));
          addLeaf(batch,offset,second,.31+rand()*.10,.126,
            gradient(pigment,dark,.14),-.045);
          leafCount++;
        }
      }
    }
  });
  function finishBatch(batch){
    const mesh=new B.Mesh('7.0 / '+batch.name,scene);
    const data=new B.VertexData();
    data.positions=batch.positions;data.indices=batch.indices;
    data.colors=batch.colors;data.uvs=batch.uvs;data.normals=[];
    B.VertexData.ComputeNormals(batch.positions,batch.indices,data.normals);
    data.applyToMesh(mesh);
    mesh.parent=treeRoot;mesh.useVertexColors=true;mesh.hasVertexAlpha=false;
    const m=new B.StandardMaterial('painted '+batch.name,scene);
    m.diffuseColor=C('#fffaf2');m.ambientColor=C('#395339');
    m.specularColor=C('#0b2111');m.specularPower=19;
    m.backFaceCulling=false;m.twoSidedLighting=true;mesh.material=m;
    return mesh;
  }
  const innerMesh=finishBatch(batches[0]);
  const outerMesh=finishBatch(batches[1]);
  const leavesMat=outerMesh.material;
  // Nothing solid hides gaps. The resulting silhouette is entirely composed
  // of shaped leaves, objectively inspectable in the new black silhouette mode.
  // Painted blossom geometry batched into ONE mesh, not hundreds of draw calls.
  const flowerPositions=[],flowerIndices=[],flowerColors=[];
  const cream=ART_DIRECTION.blossoms.map(C),gold=C('#e6bd79');
  let blossomCount=0;
  function flowerVertex(p,c){
    flowerPositions.push(p.x,p.y,p.z);
    flowerColors.push(c.r,c.g,c.b,1);
  }
  for(let i=0;i<16;i++){
    const g=crowns[i%5===0?2:i%3===0?4:6];
    const az=rand()*Math.PI*2,r=.55+rand()*.68;
    const p=V(g.x+Math.cos(az)*g.rx*r,g.y+(rand()-.5)*g.ry*1.6,g.z+Math.sin(az)*g.rz*r);
    const flowerTint=pick(cream);
    for(let a=0;a<5;a++){
      const t=a*Math.PI*2/5,dx=Math.sin(t),dz=Math.cos(t);
      const side=V(dz,0,-dx),out=V(dx,.15,dz);
      const start=flowerPositions.length/3;
      flowerVertex(p, B.Color3.Lerp(flowerTint,gold,.1));
      flowerVertex(p.add(out.scale(.12)).add(side.scale(.052)),flowerTint);
      flowerVertex(p.add(out.scale(.19)).add(V(0,.04,0)),B.Color3.Lerp(flowerTint,C('#fff4d6'),.17));
      flowerVertex(p.add(out.scale(.12)).subtract(side.scale(.052)),flowerTint);
      flowerIndices.push(start,start+1,start+2,start,start+2,start+3);
    }
    // Tiny raised pollen point: center of each five-petal flower.
    const start=flowerPositions.length/3;
    flowerVertex(p.add(V(-.035,.035,-.025)),gold);
    flowerVertex(p.add(V(.035,.035,-.025)),gold);
    flowerVertex(p.add(V(0,.075,.02)),gold);
    flowerIndices.push(start,start+1,start+2);
    blossomCount++;
  }
  const flowerMesh=new B.Mesh('batched sculpted coral blossom geometry',scene);
  const floralData=new B.VertexData();
  floralData.positions=flowerPositions;floralData.indices=flowerIndices;floralData.colors=flowerColors;
  floralData.normals=[];B.VertexData.ComputeNormals(flowerPositions,flowerIndices,floralData.normals);
  floralData.applyToMesh(flowerMesh);flowerMesh.useVertexColors=true;flowerMesh.hasVertexAlpha=false;
  flowerMesh.material=leavesMat;flowerMesh.parent=treeRoot;
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,triangles:Math.floor((batches[0].indices.length+batches[1].indices.length)/3),source:'Silhouette-designed organic leaf envelopes; no solid crown meshes'}};
}
