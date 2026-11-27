// SKYSHIFT 0.3.4 – Premium craft accents and soft landing contact.
// A few purposeful sculpted panels replace many floating rectangular trim
// blocks. All effects are decorative and isolated from flight physics.
export const SHIP_STYLE=Object.freeze({
  contactShadow:"soft dark contact occlusion",
  removedTurquoiseDisc:true,
  highEnergyAccentCount:4,
  wingMaterial:"satin titanium with inlaid light"
});

function surface(THREE,vertices,material){
  const data=[];
  for(const p of vertices)data.push(p[0],p[1],p[2]);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(data,3));
  geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,material);
  m.material.side=THREE.DoubleSide;
  return m;
}
function facet(THREE,points,material){
  // Convex quadrilateral: top-mounted shield plate, not a free-floating box.
  const [a,b,c,d]=points;
  return surface(THREE,[a,b,c,a,c,d],material);
}
export function refineCraftSilhouette(THREE,ship){
  const armor=new THREE.MeshPhysicalMaterial({color:0x354a61,metalness:.67,
    roughness:.29,clearcoat:.72,clearcoatRoughness:.16});
  const inset=new THREE.MeshPhysicalMaterial({color:0x0b1c30,metalness:.66,
    roughness:.33,clearcoat:.65,clearcoatRoughness:.15});
  const brushed=new THREE.MeshStandardMaterial({color:0x7893ab,
    metalness:.72,roughness:.32});
  const cyan=new THREE.MeshBasicMaterial({color:0x78d7e7,
    toneMapped:true});
  const rose=new THREE.MeshBasicMaterial({color:0xe29bc5,
    toneMapped:true});
  // Sculpted cockpit brow, with taper from needle nose toward twin engines.
  const spine=surface(THREE,[
    [-.32,.38,-1.96],[0,.64,-1.64],[.32,.38,-1.96],
    [-.32,.38,-1.96],[-.47,.42,.42],[0,.74,.21],
    [0,.74,.21],[.47,.42,.42],[.32,.38,-1.96],
    [-.47,.42,.42],[0,.74,.21],[.47,.42,.42]
  ],armor);
  ship.add(spine);
  for(const sign of [-1,1]){
    const blade=(x,y,z)=>[sign*x,y,z];
    const side=facet(THREE,[
      blade(.80,.20,-.90),blade(2.79,.14,.53),
      blade(2.34,.23,1.55),blade(.92,.29,.84)
    ],armor);
    ship.add(side);
    // A gently recessed shoulder panel. Satin dark dominates over light.
    ship.add(facet(THREE,[
      blade(1.10,.24,-.40),blade(2.12,.18,.48),
      blade(1.94,.29,1.12),blade(1.10,.31,.58)
    ],inset));
    const edge=facet(THREE,[
      blade(2.51,.242,.71),blade(2.63,.242,.80),
      blade(2.36,.252,1.48),blade(2.26,.252,1.40)
    ],rose);
    ship.add(edge);
    const vent=new THREE.Mesh(new THREE.BoxGeometry(.48,.16,.41),inset);
    vent.position.set(sign*.87,-.09,2.25);ship.add(vent);
    const light=new THREE.Mesh(new THREE.BoxGeometry(.29,.055,.038),cyan);
    light.position.set(sign*.87,-.043,2.48);ship.add(light);
    // Dark wing trailing lip is readable even when pink neon dominates.
    ship.add(facet(THREE,[
      blade(1.08,.17,1.12),blade(2.38,.11,1.52),
      blade(2.28,-.02,1.71),blade(1.11,.07,1.46)
    ],brushed));
  }
  return {armor,inset,brushed,cyan,rose};
}

export function createContactShadow(THREE,scene){
  // Alpha is baked into one 128² texture so the contact darkening fades
  // naturally; unlike the previous opaque cyan disc it emits NO light.
  const canvas=document.createElement("canvas");
  canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext("2d");
  const gradient=ctx.createRadialGradient(64,64,10,64,64,64);
  gradient.addColorStop(0,"rgba(2,9,21,.44)");
  gradient.addColorStop(.40,"rgba(2,9,21,.24)");
  gradient.addColorStop(.78,"rgba(2,9,21,.06)");
  gradient.addColorStop(1,"rgba(2,9,21,0)");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);
  const mat=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,opacity:.62,
    color:0xffffff,depthWrite:false,toneMapped:true,
    side:THREE.DoubleSide
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.3,4.1),mat);
  mesh.rotation.x=-Math.PI/2;
  mesh.renderOrder=5;
  scene.add(mesh);
  return mesh;
}
