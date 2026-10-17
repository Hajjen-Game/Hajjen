// Willowglow 10.0: TRUNK CHARACTER & BRANCH WEIGHT.
// All 9.0 foliage positions, shapes and colors are IDENTICAL to version 9.
// New artist-shaped wood geometry, naturally tapered forks and restrained roots.
// No paid assets, imported models, foliage changes or new rendering engine.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — trunk character and branch weight 10.0',
  foliage: ['#153726', '#24553a', '#3b7446', '#6ba358', '#a5c975'],
  blossoms: ['#f6d7c0', '#ffe9cc', '#efb8bb'],
  bark: '#65503d'
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

  // Wood is built with swept, hand-shaped rings instead of generic CreateTube.
  // It widens naturally at the foot and fork junctions, while the final bark
  // texture and subtle vertex shading make the trunk feel sculpted, not red.
  const bark = new B.StandardMaterial('10.0 / deep umber hand-painted bark',scene);
  bark.diffuseColor=C('#efe2cf');
  bark.specularColor=C('#15130f');
  bark.specularPower=18;
  const barkCanvas=new B.DynamicTexture('10.0 / painted bark grain',{width:512,height:512},scene,false);
  const barkCtx=barkCanvas.getContext();
  barkCtx.fillStyle='#6c533f';
  barkCtx.fillRect(0,0,512,512);
  // Narrow, low-contrast, almost-vertical veins: visual detail rather than
  // photography or bark noise that turns into harsh pixels on old Android.
  for(let i=0;i<225;i++){
    const x=rand()*512,y=rand()*512,len=34+rand()*190;
    barkCtx.strokeStyle=rand()<.64
      ?'rgba(39,30,25,'+(.055+rand()*.14)+')'
      :'rgba(200,163,119,'+(.05+rand()*.12)+')';
    barkCtx.lineWidth=.7+rand()*3.1;
    barkCtx.beginPath();barkCtx.moveTo(x,y);
    barkCtx.bezierCurveTo(x+(rand()-.5)*10,y+len*.3,
      x+(rand()-.5)*12,y+len*.72,x+(rand()-.5)*12,y+len);
    barkCtx.stroke();
  }
  // A few oval softened knots, distributed low on the trunk instead of busy
  // uniform stripes. Drawn into the same free procedural texture.
  for(let k=0;k<6;k++){
    const x=40+rand()*425,y=60+rand()*415;
    barkCtx.fillStyle='rgba(50,34,27,.12)';
    barkCtx.beginPath();barkCtx.ellipse(x,y,5+rand()*4,10+rand()*8,
      (rand()-.5)*.24,0,Math.PI*2);barkCtx.fill();
  }
  barkCanvas.update();
  bark.diffuseTexture=barkCanvas;
  bark.backFaceCulling=true;

  const woodShadow=C('#a4a298'),woodHighlight=C('#f5eee0');
  const woodMeshes=[];
  function sculptedWood(name,controlPoints,radiusAt,segments=12,steps=9,kind='branch'){
    const path=B.Curve3.CreateCatmullRomSpline(
      controlPoints.map(p=>V(...p)),steps,false).getPoints();
    if(path.length<2)throw Error('Wood sweep needs at least two points: '+name);
    const positions=[],indices=[],colors=[],uvs=[];
    const last=path.length-1;
    // Use a stable perpendicular axis through an entire branch so the rings
    // cannot suddenly rotate when its curve bends into the leaf canopy.
    const heading=path[1].subtract(path[0]).normalize();
    const ref=Math.abs(heading.y)>.79?V(0,0,1):V(0,1,0);
    for(let i=0;i<=last;i++){
      const t=i/last,p=path[i];
      const tangent=path[Math.min(last,i+1)]
        .subtract(path[Math.max(0,i-1)]).normalize();
      let side=B.Vector3.Cross(tangent,ref).normalize();
      if(side.lengthSquared()<.0001)
        side=B.Vector3.Cross(tangent,V(1,0,0)).normalize();
      const across=B.Vector3.Cross(tangent,side).normalize();
      for(let j=0;j<=segments;j++){
        const a=2*Math.PI*j/segments;
        // Coherent shallow longitudinal ridges and subtly asymmetric trunk.
        const rib=1+.039*Math.sin(a*5+name.length*.34)
          +.022*Math.sin(a*9+t*9);
        const bulge=kind==='trunk'
          ?1+.035*Math.sin(a*3+t*4.0)+.018*Math.cos(a*6-t*5)
          :1+.017*Math.sin(a*3+t*5);
        const radius=radiusAt(t,p)*rib*bulge;
        const pos=p.add(side.scale(Math.cos(a)*radius))
          .add(across.scale(Math.sin(a)*radius));
        positions.push(pos.x,pos.y,pos.z);
        const light=clamp(.47+.27*Math.cos(a+.55)+.09*Math.sin(t*7+a*2),.12,.92);
        const tone=B.Color3.Lerp(woodShadow,woodHighlight,light);
        colors.push(tone.r,tone.g,tone.b,1);
        uvs.push(j/segments,t*(kind==='trunk'?2.7:1.75));
        if(i<last&&j<segments){
          const n=i*(segments+1)+j;
          indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);
        }
      }
    }
    // Cap both ends so sideways views of a branch tip never expose a hole.
    for(const top of [false,true]){
      const ring=top?last:0,first=positions.length/3,p=path[ring];
      positions.push(p.x,p.y,p.z);
      colors.push(.52,.46,.39,1);uvs.push(.5,.5);
      for(let j=0;j<segments;j++){
        const a=ring*(segments+1)+j,b=a+1;
        if(top)indices.push(first,a,b);else indices.push(first,b,a);
      }
    }
    const mesh=new B.Mesh('10.0 / '+name,scene),vd=new B.VertexData();
    vd.positions=positions;vd.indices=indices;vd.colors=colors;vd.uvs=uvs;
    vd.normals=[];B.VertexData.ComputeNormals(positions,indices,vd.normals);
    vd.applyToMesh(mesh);
    mesh.parent=treeRoot;mesh.material=bark;
    mesh.useVertexColors=true;mesh.hasVertexAlpha=false;mesh.isPickable=false;
    shadows?.addShadowCaster(mesh);
    woodMeshes.push(mesh);
    return mesh;
  }
  // A thicker grounded foot, softly twisting middle and narrower neck.
  // Upper shaft is inside the branching, not a straight exposed pole.
  const trunkPath=[
    [0,-.065,0],[-.052,.42,.047],[-.112,1.25,.063],
    [-.24,2.33,-.105],[-.17,3.26,-.18],
    [.045,4.15,-.115],[.16,5.26,-.12]
  ];
  sculptedWood('sculpted continuous trunk',trunkPath,t=>{
    const taper=.16+.46*Math.pow(1-t,1.43);
    const buttress=.135*Math.exp(-t*23);
    const fork=.055*Math.exp(-Math.pow((t-.70)/.11,2));
    return taper+buttress+fork;
  },16,12,'trunk');

  // Small embedded buttress roots rather than four claw-like spikes. Most
  // volume is already contained in the trunk flare above the soil.
  const roots=[
    {pts:[[-.05,.38,.06],[-.33,.21,.22],[-.57,.07,.36],[-.67,-.055,.40]],a:.22},
    {pts:[[.06,.37,-.04],[.29,.20,-.24],[.52,.065,-.40],[.57,-.055,-.43]],a:.20},
    {pts:[[.07,.40,.07],[.29,.22,.21],[.48,.07,.37],[.51,-.055,.43]],a:.19},
    {pts:[[-.11,.36,-.11],[-.30,.17,-.27],[-.45,.045,-.45],[-.48,-.055,-.47]],a:.17}
  ];
  roots.forEach((r,i)=>sculptedWood('subtle root buttress '+(i+1),
    r.pts,t=>r.a*Math.pow(Math.max(.065,1-t),1.05),9,9,'root'));

  // Six differently weighted boughs. Four are robust load-bearing curves,
  // two stay slender secondary leaders. Bases begin INSIDE the trunk, bloom
  // a little at the fork, then taper progressively under the existing leaves.
  const boughs=[
    {name:'left lower',points:[[ -.08,3.28,-.06],[-.40,3.83,.06],[-.85,4.61,.16],[-1.46,5.29,.17],[-1.93,5.88,.20]],a:.34,b:.047},
    {name:'left high',points:[[-.13,3.82,-.13],[-.36,4.61,-.25],[-.73,5.54,-.47],[-1.05,6.46,-.49],[-1.32,7.26,-.49]],a:.255,b:.035},
    {name:'center crown',points:[[.045,4.01,-.14],[.10,4.82,-.20],[.11,5.85,-.31],[.20,6.88,-.26],[.27,7.94,-.21]],a:.23,b:.038},
    {name:'right high',points:[[.015,3.71,-.16],[.40,4.44,-.32],[.86,5.32,-.47],[1.36,6.38,-.54],[1.78,7.17,-.55]],a:.29,b:.043},
    {name:'right low',points:[[.02,3.37,.04],[.47,3.95,.24],[.97,4.64,.47],[1.64,5.31,.61],[2.25,6.14,.68]],a:.36,b:.048},
    {name:'front sheltered',points:[[-.10,3.72,.08],[.06,4.30,.45],[.13,4.97,.89],[.25,5.61,1.32],[.34,6.35,1.61]],a:.24,b:.035}
  ];
  for(const b of boughs)sculptedWood(
    'load bearing bough / '+b.name,b.points,
    t=>b.b+(b.a-b.b)*Math.pow(1-t,1.18)
      +.065*Math.exp(-Math.pow((t-.13)/.13,2)),
    11,10,'branch');
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
    [[-1.32,5.15,.19],[-1.68,5.50,.76],[-1.95,5.96,1.04]],
    [[-.91,6.06,-.41],[-1.30,6.72,.19],[-1.48,7.20,.68]],
    [[1.38,6.28,-.51],[1.78,6.44,.14],[2.06,6.73,.77]],
    [[.20,5.58,1.15],[.64,5.81,1.32],[1.17,6.22,1.48]]
  ];
  shoots.forEach((pts,i)=>sculptedWood('fine naturally tapering branch '+i,
    pts,t=>.073*Math.pow(1-t,.9)+.015,7,7,'twig'));

  // REAL curved leaf blades on THREE separate layers, no solid canopy shell.
  // Their 9 non-rendered envelopes stay identical to 7/8 so this is a clean A/B.
  // Surface leaves are longer, narrower, sharply tapered and directionally
  // staggered; dark inner leaves remain visible between them.
  const deep=C('#102c20'),forest=C('#1c5035'),shade=C('#2c6742'),
    living=C('#447f4b'),spring=C('#78aa5e'),highlight=C('#b5d17c');
  const mix=(a,b,t)=>B.Color3.Lerp(a,b,clamp(t,0,1));
  const layerNames=['dark inner foliage','rich middle foliage','lit exterior foliage'];
  const batches=layerNames.map(name=>({name,positions:[],indices:[],colors:[],uvs:[]}));
  const GOLDEN_ANGLE=2.399963229728653;
  const layers=[
    {ratio:.28,radius:.59,length:.42,width:.122},
    {ratio:.43,radius:.80,length:.49,width:.133},
    {ratio:.70,radius:.96,length:.54,width:.125}
  ];
  function addLeaf(batch,base,growth,length,width,pigment,curve,asymmetry) {
    const {positions,indices,colors,uvs}=batch;
    const forward=growth.normalize();
    let side=B.Vector3.Cross(forward,V(.15+asymmetry,.92,.12)).normalize();
    if(side.lengthSquared()<.01)side=V(1,0,0);
    const lift=B.Vector3.Cross(side,forward).normalize();
    const first=positions.length/3;
    // Willow-like lanceolate blade: widest in its first third, then a long
    // thin tip. A raised midrib and subtle sideways curl keep it truly 3D.
    // Six stations = 20 two-sided triangles per leaf; mobile GPU budget safe.
    for(let k=0;k<=5;k++){
      const t=k/5;
      const taper=t<.36?Math.pow(t/.36,.74):Math.pow(Math.max(0,(1-t)/.64),.96);
      const w=width*taper*(1+.07*Math.sin(t*5+asymmetry*2));
      const spine=base.add(forward.scale(length*t))
        .add(lift.scale(length*(.08*Math.sin(Math.PI*t)+curve*t*t)))
        .add(side.scale(length*asymmetry*.07*Math.sin(t*Math.PI*.9)));
      const left=spine.subtract(side.scale(w*(.92+asymmetry*.11)));
      const right=spine.add(side.scale(w*(1.05-asymmetry*.14)));
      const raised=spine.add(lift.scale(w*.22));
      for(const q of [
        {p:left,c:mix(pigment,deep,.31),u:0},
        {p:raised,c:mix(pigment,highlight,.13+.16*t),u:.5},
        {p:right,c:mix(pigment,forest,.23),u:1}
      ]){
        positions.push(q.p.x,q.p.y,q.p.z);
        colors.push(q.c.r,q.c.g,q.c.b,1);uvs.push(q.u,t);
      }
    }
    for(let k=0;k<5;k++){
      const a=first+k*3,b=a+3;
      indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
    }
  }
  let leafCount=0;
  crowns.forEach((g,ci)=>{
    const origin=V(g.x,g.y,g.z),phase=ci*1.61;
    for(let layer=0;layer<3;layer++){
      const setup=layers[layer],batch=batches[layer];
      const count=Math.round(g.leaves*setup.ratio);
      for(let i=0;i<count;i++){
        const cy=1-2*(i+.5)/count,az=i*GOLDEN_ANGLE+phase+layer*.77;
        const ring=Math.sqrt(Math.max(0,1-cy*cy));
        const n=V(ring*Math.cos(az),cy,ring*Math.sin(az));
        // Minor organic distortion to 3–4 lobes. It changes leaf position,
        // not the approved rounded nine-lobe outer envelope of the tree.
        const leafRipple=1+.036*Math.sin(az*3+ci*.81)+.024*Math.cos(az*5-ci);
        const droop=(ci===0||ci===4||ci===7)&&cy<-.12?-.09*(1-cy):0;
        const radial=setup.radius*leafRipple;
        const x=n.x*g.rx*radial,z=n.z*g.rz*radial;
        const y=n.y*g.ry*radial*(n.y<0?.82:1.02)+droop;
        const base=origin.add(V(x+g.lean*(1-n.y)*.13,y,z));
        const normal=V(n.x/g.rx,n.y/g.ry,n.z/g.rz).normalize();
        const down=V(g.lean*.4,-1,.06);
        let tangent=down.subtract(normal.scale(B.Vector3.Dot(down,normal)));
        if(tangent.lengthSquared()<.03)
          tangent=V(Math.cos(az+Math.PI/2),-.08,Math.sin(az+Math.PI/2));
        tangent=tangent.normalize();
        const lateral=B.Vector3.Cross(normal,tangent).normalize();
        const directionalVariation=(rand()-.5)*(layer===2?.85:.48);
        const direction=tangent.scale(layer===2?.59:.75)
          .add(normal.scale(layer===2?.43:.29))
          .add(lateral.scale(directionalVariation)).normalize();
        // Baked painterly shade pockets plus directional top light:
        // deep leaves stay forest-dark, center reads a rich mid-green,
        // upper/exposed tips catch restrained warm-green sunlight.
        const top=Math.max(0,normal.y);
        const towardLight=Math.max(0,-normal.x*.65+normal.z*.25+.35*normal.y);
        // Boundary AO: darken *actual* leaves wherever one lobe is recessed
        // into a neighbor. Pure one-time baked vertex color, no SSAO cost.
        let overlap=0;
        for(let other=0;other<crowns.length;other++){
          if(other===ci)continue;
          const h=crowns[other];
          const dx=(base.x-h.x)/h.rx,dy=(base.y-h.y)/h.ry,dz=(base.z-h.z)/h.rz;
          const d2=dx*dx+dy*dy+dz*dz;
          if(d2<1.20)overlap=Math.max(overlap,Math.min(.85,(1.20-d2)*1.35));
        }
        const pocket=Math.max(0,Math.sin(az*2.7+ci*.94)*Math.cos(cy*7.4));
        const underside=Math.max(0,-normal.y);
        let pigment;
        if(layer===0) pigment=mix(deep,forest,.16+.20*top+.12*rand());
        else if(layer===1) pigment=mix(forest,living,.29+.23*top+.17*towardLight+.11*rand());
        else {
          pigment=mix(living,spring,.30+.30*top+.20*towardLight+.14*rand());
          pigment=mix(pigment,shade,.04+.18*pocket);
          if(top>.55) pigment=mix(pigment,highlight,.08+.15*(top-.55));
        }
        // Darker undersides, recesses and intersections create depth without
        // flattening every visible blade into the same dark mass.
        const occlusion=clamp(overlap*.55+underside*(layer===2?.27:.35)
          +pocket*.10+(layer===0?.13:0),0,.75);
        pigment=mix(pigment,deep,occlusion);
        // Some individual darker leaves create a fractured, natural boundary
        // between adjacent crown lobes instead of a uniform bright pillow.
        if(layer===2&&(i+ci*7)%9===0)
          pigment=mix(pigment,forest,.36);
        const length=setup.length*(.80+rand()*.44)*(layer===2?1:.92);
        const width=setup.width*(.77+rand()*.41);
        addLeaf(batch,base,direction,length,width,pigment,(rand()-.5)*.14,
          (rand()-.5)*.50);
        leafCount++;
        // Sparse overlapping detail on the *same* local direction: noticeable
        // leaf layers without 7.0's dense wool-like even tessellation.
        // A sparse second leaf breaks the scalloped outline; below the
        // equator slightly drooping blades produce a natural leafy fringe.
        if(layer===2&&i%13===0){
          const edge=normal.y<.25;
          const smallBase=base.add(normal.scale(edge?.06:-.035))
            .add(lateral.scale(.085));
          const smallDir=direction.scale(.68)
            .add(lateral.scale(.24))
            .add(V(0,edge?-.16:.06,0)).normalize();
          addLeaf(batch,smallBase,smallDir,length*(edge?.83:.69),width*.78,
            mix(pigment,forest,.20),-.06,(rand()-.5)*.42);
          leafCount++;
        }
      }
    }
  });
  function finishBatch(batch,layer){
    const mesh=new B.Mesh('10.0 / '+batch.name,scene);
    const vd=new B.VertexData();
    vd.positions=batch.positions;vd.indices=batch.indices;
    vd.colors=batch.colors;vd.uvs=batch.uvs;vd.normals=[];
    B.VertexData.ComputeNormals(batch.positions,batch.indices,vd.normals);
    vd.applyToMesh(mesh);
    mesh.parent=treeRoot;mesh.useVertexColors=true;mesh.hasVertexAlpha=false;
    const mat=new B.StandardMaterial('painterly '+batch.name,scene);
    mat.diffuseColor=C(layer===0?'#d6e2cf':layer===1?'#e6eee0':'#faf8e9');
    mat.ambientColor=C(layer===0?'#152d22':layer===1?'#28452f':'#3b5739');
    mat.specularColor=C('#071b0d');mat.specularPower=15;
    mat.backFaceCulling=false;mat.twoSidedLighting=true;
    mesh.material=mat;
    return mesh;
  }
  const innerMesh=finishBatch(batches[0],0);
  const middleMesh=finishBatch(batches[1],1);
  const outerMesh=finishBatch(batches[2],2);
  const leavesMat=outerMesh.material;
  // Blades remain visibly separate, with no canopy sphere/pancake geometry.
  // Main branch/trunk still cast realistic shadows, while foliage shadows
  // are kept soft to avoid noisy artifacts on mobile.
  // Painted blossom geometry batched into ONE mesh, not hundreds of draw calls.
  const flowerPositions=[],flowerIndices=[],flowerColors=[];
  const cream=ART_DIRECTION.blossoms.map(C),gold=C('#e6bd79');
  let blossomCount=0;
  function flowerVertex(p,c){
    flowerPositions.push(p.x,p.y,p.z);
    flowerColors.push(c.r,c.g,c.b,1);
  }
  for(let i=0;i<10;i++){
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
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,triangles:Math.floor(batches.reduce((sum,b)=>sum+b.indices.length,0)/3),source:'9.0 leaf canopy unchanged; custom sculpted umber trunk and six weighted boughs'}};
}
