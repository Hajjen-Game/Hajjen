// SKYSHIFT 0.17.0 — Cinematic Space Lighting & Environmental Atmosphere.
// Art-only lighting. Shared for Skyline/Aurora; never modifies vehicle/track
// physics, camera movement, neon HDR, rail colliders or zone wave timing.
// The original 0.16.5 renderer is selectable through ?lighting=classic.
export const CINEMATIC_SPACE_0170=Object.freeze({
 version:"cinematic-space-lighting-0170",
 skyScale:.71,fogScale:.80,fogDensityScale:.88,
 ambientScale:.64,keyScale:1.12,fillScale:.49,
 keyPosition:Object.freeze([-44,39,-67]),
 fillPosition:Object.freeze([18,12,42]),
 starDistance:435,starDiameter:76,
 additionalDynamicLights:0,additionalRenderPasses:0,
 highQualityExtraDrawCalls:2,lowMemoryExtraDrawCalls:1,
 gamePhysicsUnchanged:true,cameraPhysicsUnchanged:true,
 activeTracks:"Skyline and Aurora"
});
const clamp01=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
export function cinematicLightLevels({ambient=1.62,key=2.55,fill=.72}={}){
 return {
  ambient:ambient*CINEMATIC_SPACE_0170.ambientScale,
  key:key*CINEMATIC_SPACE_0170.keyScale,
  fill:fill*CINEMATIC_SPACE_0170.fillScale
 };
}
// Integrated satin-light pockets anchored to real track arc coordinates.
// The outer shoulder picks up more indirect light than the race line.
// No luminous obstacles, new meshes or camera-following projections.
// Keep the exact diffuseColor assignment: existing Shadow Tunnel and
// Blackout decorators patch it *after* this and remain authoritative.
export function patchCinematicRoadFragment(fragment){
 const anchor="diffuseColor.rgb = road;";
 if(!fragment.includes(anchor)||
    !fragment.includes("float trackS = vTrackCoord.x;")||
    !fragment.includes("float absL = abs(trackL);"))
  throw new Error("SKYSHIFT 0.17.0: premium road shader anchors changed");
 const wash=[
  "  // Broad authored reflected-light pockets: no flashing stripes.",
  "  float cinemaPool = max(",
  "    trackWindow(trackS,115.0,330.0,48.0),",
  "    max(trackWindow(trackS,1530.0,1770.0,52.0),",
  "        trackWindow(trackS,3030.0,3290.0,54.0)));",
  "  float cinemaShoulder = smoothstep(2.7,9.7,absL);",
  "  road = mix(road, mix(zoneGuide,zoneAccent,0.12),",
  "    cinemaPool * (0.055 + 0.073 * cinemaShoulder));",
  "  diffuseColor.rgb = road;"
 ].join("\n");
 return fragment.replace(anchor,wash);
}
export function installCinematicRoadLighting(material){
 if(!material||typeof material.onBeforeCompile!=="function"||
    typeof material.customProgramCacheKey!=="function")
  throw new Error("SKYSHIFT 0.17.0 expects active premium PBR road");
 const previousCompile=material.onBeforeCompile;
 const previousCacheKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  previousCompile.call(this,shader,renderer);
  shader.fragmentShader=patchCinematicRoadFragment(shader.fragmentShader);
 };
 material.customProgramCacheKey=()=>previousCacheKey.call(material)+"-cinema-0170";
 material.needsUpdate=true;
 return material;
}
function starTexture(THREE){
 if(typeof document==="undefined")return null;
 const canvas=document.createElement("canvas");
 canvas.width=192;canvas.height=192;
 const ctx=canvas.getContext("2d");
 if(!ctx)return null;
 const g=ctx.createRadialGradient(96,96,0,96,96,94);
 g.addColorStop(0.00,"rgba(255,255,255,1)");
 g.addColorStop(0.030,"rgba(250,254,255,1)");
 g.addColorStop(0.073,"rgba(202,239,255,.82)");
 g.addColorStop(0.17,"rgba(123,190,255,.27)");
 g.addColorStop(0.40,"rgba(80,129,208,.07)");
 g.addColorStop(1.00,"rgba(50,80,151,0)");
 ctx.fillStyle=g;ctx.fillRect(0,0,192,192);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
const SKY_VERTEX=[
 "varying vec3 vSkyDirection;",
 "void main(){",
 "  vSkyDirection=position;",
 "  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);",
 "}"
].join("\n");
const SKY_FRAGMENT=[
 "uniform vec3 uSkyBase;",
 "uniform vec3 uFogBase;",
 "uniform vec3 uAccent;",
 "uniform vec3 uStarDirection;",
 "varying vec3 vSkyDirection;",
 "void main(){",
 "  vec3 d=normalize(vSkyDirection);",
 "  float horizon=pow(1.0-abs(d.y),2.0);",
 "  float source=max(0.0,dot(d,uStarDirection));",
 "  float halo=pow(source,14.0);",
 "  float shoulder=pow(source,3.0);",
 "  vec3 sky=mix(uSkyBase,uFogBase,horizon*0.23);",
 "  sky+=vec3(0.013,0.023,0.048)*shoulder;",
 "  sky+=(vec3(0.042,0.062,0.096)+uAccent*0.045)*halo;",
 "  gl_FragColor=vec4(sky,1.0);",
 "}"
].join("\n");
export function createCinematicSpaceLighting(THREE,{
 scene,camera,worldLights,lowMemory=false
}={}){
 if(!scene||!camera||!worldLights?.ambient||!worldLights?.key||
    !worldLights?.fill)
  throw new Error("SKYSHIFT 0.17.0: missing world light rig");
 const config=CINEMATIC_SPACE_0170;
 const ambient=worldLights.ambient,key=worldLights.key,fill=worldLights.fill;
 const levels=cinematicLightLevels({
  ambient:ambient.intensity,key:key.intensity,fill:fill.intensity
 });
 ambient.intensity=levels.ambient;
 ambient.color.set(0xaec5dc);
 ambient.groundColor.set(0x16273d);
 key.intensity=levels.key;
 key.color.set(0xe3f3ff);
 key.position.set(...config.keyPosition);
 fill.intensity=levels.fill;
 fill.color.set(0x938acc);
 fill.position.set(...config.fillPosition);
 const direction=new THREE.Vector3(...config.keyPosition).normalize();
 const baseKey=new THREE.Color(0xe3f3ff);
 const baseFill=new THREE.Color(0x938acc);
 const baseAmbient=new THREE.Color(0xaec5dc);
 const texture=starTexture(THREE);
 let star=null,skyDome=null,skyMaterial=null;
 if(texture){
  const material=new THREE.SpriteMaterial({
   map:texture,color:0xffffff,
   transparent:true,opacity:.79,depthTest:true,depthWrite:false,
   fog:false,toneMapped:false,blending:THREE.AdditiveBlending
  });
  star=new THREE.Sprite(material);
  star.scale.set(config.starDiameter,config.starDiameter,1);
  star.name="Cinematic coherent distant star · aligned with directional key";
  scene.add(star);
 }
 if(!lowMemory){
  skyMaterial=new THREE.ShaderMaterial({
   name:"Cinematic deep-space sky · fixed world-light scatter",
   uniforms:{
    uSkyBase:{value:new THREE.Color(0x041329)},
    uFogBase:{value:new THREE.Color(0x071629)},
    uAccent:{value:new THREE.Color(0x42dff5)},
    uStarDirection:{value:direction.clone()}
   },
   vertexShader:SKY_VERTEX,fragmentShader:SKY_FRAGMENT,
   side:THREE.BackSide,depthWrite:false,depthTest:false,
   transparent:false
  });
  skyDome=new THREE.Mesh(new THREE.SphereGeometry(570,24,14),skyMaterial);
  skyDome.name="Cinematic dark atmosphere · no world collisions";
  skyDome.frustumCulled=false;
  skyDome.renderOrder=-1000;
  scene.add(skyDome);
 }
 let updates=0;
 return {
  update({accent,sky,fog,resonance=0,darkness=0}={}){
   if(!accent||!sky||!fog)return;
   const pulse=clamp01(resonance);
   key.color.copy(baseKey).lerp(accent,.035+.055*pulse);
   fill.color.copy(baseFill).lerp(accent,.31+.10*pulse);
   ambient.color.copy(baseAmbient).lerp(accent,.022);
   if(skyMaterial){
    skyMaterial.uniforms.uSkyBase.value.copy(sky);
    skyMaterial.uniforms.uFogBase.value.copy(fog);
    skyMaterial.uniforms.uAccent.value.copy(accent);
   }
   // Black-room tunnel remains black, even with the star in view.
   if(star)star.material.opacity=.79*(1-clamp01(darkness)*.97);
   updates++;
  },
  frame(){
   // World-space light and apparent star stay aligned through turns.
   // Only draw positions change; camera pose itself is never touched.
   if(star)star.position.copy(camera.position)
     .addScaledVector(direction,config.starDistance);
   if(skyDome)skyDome.position.copy(camera.position);
  },
  stats(){
   return {...config,lowMemory,skyDomeEnabled:Boolean(skyDome),
    starEnabled:Boolean(star),lightDirection:[...config.keyPosition],
    currentLightLevels:{
     ambient:+ambient.intensity.toFixed(4),
     key:+key.intensity.toFixed(4),
     fill:+fill.intensity.toFixed(4)
    },updates,
    extraDrawCalls:Number(Boolean(star))+Number(Boolean(skyDome))};
  },
  dispose(){
   star?.removeFromParent();
   star?.material.dispose();texture?.dispose();
   skyDome?.removeFromParent();
   skyDome?.geometry.dispose();skyMaterial?.dispose();
  }
 };
}
