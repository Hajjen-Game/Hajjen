/**
 * Wildpath 0.9 · shared eight-stage spell presentation.
 * Visuals are strictly cosmetic: damage, AI, cooldowns and timing stay in combat.
 * Every spell follows: charge → core → trail → burst → reaction → sound →
 * aftermath → damage. Individual spells emphasize different stages.
 */
export const SPELL_STAGES=Object.freeze([
  'charge','core','trail','burst','reaction','sound','aftermath','damage'
]);
export const SPELL_PALETTES=Object.freeze({
  'Glint Dart':     {primary:'#93eafb',hot:'#ffffff',warm:'#dcfaff',radius:.53,kind:'ice'},
  'Winter Pool':    {primary:'#7cc6ff',hot:'#e8fcff',warm:'#bddfff',radius:1.15,kind:'frost'},
  'Crystal Bloom':  {primary:'#c0abff',hot:'#ffffff',warm:'#7edcf5',radius:1.20,kind:'crystal'},
  'Pale Guard':     {primary:'#8ff5cf',hot:'#f5ffe2',warm:'#a6ffe8',radius:.88,kind:'shield'},
  'Steel Arc':      {primary:'#ffc983',hot:'#fff9d7',warm:'#f7aa5c',radius:.65,kind:'steel'},
  'Wide Arc':       {primary:'#ffcd88',hot:'#ffffff',warm:'#e9ab70',radius:1.10,kind:'steel'},
  'Rushstrike':     {primary:'#ffba68',hot:'#fff8d5',warm:'#ed9862',radius:.93,kind:'steel'},
  'Earthwake':      {primary:'#ddb789',hot:'#fff1bf',warm:'#b9af9b',radius:1.36,kind:'earth'}
});
export const SPELL_PRESENTATION=Object.freeze(Object.fromEntries(
  Object.entries(SPELL_PALETTES).map(([key,s])=>[key,Object.freeze({
    steps:SPELL_STAGES,
    duration:{charge:.15,core:.22,trail:.21,burst:.26,reaction:.13,aftermath:.65,damage:.27},
    ...s
  })])
));
export function effectBudget(activeCount,maxCount=155){return activeCount<maxCount;}
export function stageDuration(stage){return {charge:.17,core:.24,trail:.25,burst:.31,reaction:.18,aftermath:.85,damage:.26}[stage]||.25;}
export function pickSpell(name){return SPELL_PRESENTATION[name]||SPELL_PRESENTATION['Glint Dart'];}
// Short isolated glow pips instead of continuously joining positions into a tube.
// Each fades within 0.15s and stays less than one world unit behind the bolt.
export function glintTrailSamples(x,y,z,dx=0,dz=0){
  const length=Math.hypot(dx,dz),nx=length>1e-6?dx/length:0,nz=length>1e-6?dz/length:0;
  return [
    {x:x-nx*.34,y:y-.02,z:z-nz*.34,size:.17,life:.15},
    {x:x-nx*.72,y:y-.04,z:z-nz*.72,size:.10,life:.12}
  ];
}

const V=(B,x,y,z)=>new B.Vector3(x,y,z);
export function createSpellAnimator(scene,{maxEffects=155,reducedMotion=false}={}){
  const B=window.BABYLON;
  const active=[],materials=new Map();
  let muted=false,context=null;
  const lastSoundByCue=new Map();
  const key=(hex,alpha)=>hex+'/'+alpha;
  function material(hex,alpha=.82){
    const k=key(hex,alpha);
    if(materials.has(k))return materials.get(k);
    const m=new B.StandardMaterial('spell layer '+k,scene),c=B.Color3.FromHexString(hex);
    m.diffuseColor=c;m.emissiveColor=c.scale(1.65);m.specularColor=B.Color3.Black();
    m.disableLighting=true;m.alpha=alpha;m.backFaceCulling=false;m.needDepthPrePass=alpha<1;
    materials.set(k,m);return m;
  }
  function createMesh(kind,name,hex,x,y,z,size,life,mode='shrink',alpha=.84){
    if(!effectBudget(active.length,maxEffects))return null;
    let mesh;
    if(kind==='ring')mesh=B.MeshBuilder.CreateTorus(name,{diameter:2,thickness:.12,tessellation:32},scene);
    else if(kind==='shard')mesh=B.MeshBuilder.CreatePolyhedron(name,{type:1,size:1},scene);
    else mesh=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:9},scene);
    mesh.material=material(hex,alpha);mesh.position=V(B,x,y,z);
    mesh.scaling.setAll(size);mesh.isPickable=false;
    active.push({mesh,age:0,life,mode,size,baseY:y});
    return mesh;
  }
  function pip(hex,x,y,z,size=.22,life=.3,mode='shrink'){
    return createMesh('sphere','spell spark',hex,x,y,z,size,life,mode,.90);
  }
  function ring(hex,x,z,size,life=.27,y=.22){
    return createMesh('ring','spell ripple',hex,x,y,z,size,life,'expand',.79);
  }
  function impactSparks(p,x,z,intensity=1){
    const count=reducedMotion?2:p.kind==='crystal'?4:5;
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count;
      const reach=(.38+Math.random()*.75)*intensity;
      const xx=x+Math.cos(a)*reach,zz=z+Math.sin(a)*reach;
      if(p.kind==='crystal')createMesh('shard','crystal chip',i%2?p.warm:p.primary,xx,.5+Math.random()*.85,zz,.34,.52,'shrink',.82);
      else pip(i%2?p.warm:p.hot,xx,.55+Math.random()*.65,zz,.22,.33,'rise');
    }
  }
  function emit(name,stage,{x=0,z=0,y=1.3,intensity=1,direction=0,directionX=0,directionZ=0}={}){
    if(!SPELL_STAGES.includes(stage))return;
    const p=pickSpell(name),r=p.radius*intensity;
    if(stage==='charge'){
      ring(p.primary,x,z,.50*r,.17,.22);
      pip(p.hot,x,y,z,.35*r,.17,'grow');
      if(!reducedMotion)for(let j=0;j<3;j++){
        const a=j*Math.PI*2/3+direction;
        pip(p.warm,x+Math.sin(a)*.55,y+.1,z+Math.cos(a)*.55,.13,.16,'shrink');
      }
    }else if(stage==='core'){
      pip(p.hot,x,y,z,.54*r,.25,'grow');
      pip(p.primary,x,y-.11,z,.80*r,.25,'shrink');
    }else if(stage==='trail'){
      if(name==='Glint Dart'){
        for(const [i,point] of glintTrailSamples(x,y,z,directionX,directionZ).entries()){
          pip(i===0?p.primary:p.warm,point.x,point.y,point.z,
            point.size*intensity,point.life,'shrink');
        }
      }else if(p.kind==='crystal'){
        pip(p.primary,x,y,z,.12*r,.12,'shrink');
      }else pip(p.primary,x,y,z,.19*r,.16,'shrink');
    }else if(stage==='burst'){
      ring(p.hot,x,z,Math.max(.55,r*.92),.30,.29);
      pip(p.primary,x,.85,z,.96*r,.19,'shrink');
      impactSparks(p,x,z,Math.min(2,intensity));
    }else if(stage==='reaction'){
      pip(p.hot,x,1.65,z,.62*r,.14,'shrink');
      if(!reducedMotion)ring(p.warm,x,z,.36*r,.18,.32);
    }else if(stage==='aftermath'){
      const brief=name==='Glint Dart',bloom=name==='Crystal Bloom';
      if(!brief)ring(p.primary,x,z,Math.min(1.55,.47*r),bloom?.28:.48,.24);
      if(!reducedMotion){
        const count=brief?2:bloom?2:3;
        for(let j=0;j<count;j++){
          const a=j*Math.PI*2/count+Math.random()*.3;
          pip(p.warm,x+Math.cos(a)*.52*r,.35,z+Math.sin(a)*.52*r,
            brief?.10:.15,brief?.22:bloom?.28:.43,'rise');
        }
      }
    }else if(stage==='damage'){
      pip(p.hot,x,2.4,z,.25*r,.25,'rise');
    }
  }
  function tick(dt){
    for(let i=active.length-1;i>=0;i--){
      const e=active[i];e.age+=dt;
      if(e.age>=e.life){e.mesh.dispose(false,false);active.splice(i,1);continue;}
      const t=Math.max(0,Math.min(1,e.age/e.life));
      let v=e.size;
      if(e.mode==='shrink')v*=Math.max(.015,1-t);
      if(e.mode==='expand')v*=.32+1.24*t;
      if(e.mode==='grow')v*=.52+1.12*Math.sin(t*Math.PI);
      if(e.mode==='rise'){v*=Math.max(.02,1-t);e.mesh.position.y=e.baseY+t*.8;}
      e.mesh.scaling.setAll(Math.max(.008,v));
    }
  }
  function clear(){for(const e of active)e.mesh.dispose(false,false);active.length=0;}
  function dispose(){clear();for(const m of materials.values())m.dispose();materials.clear();if(context?.state!=='closed')context?.close?.();}
  function unlock(){
    if(muted)return;
    try{
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C)return;
      if(!context)context=new C();
      if(context.state==='suspended')void context.resume();
    }catch{/* WebAudio optional, gameplay never waits */}
  }
  function sound(name,cue='launch'){
    if(muted||!context||context.state!=='running')return;
    const now=context.currentTime;
    const soundKey=cue+':'+name;
    const natural=name==='Nature Fusion'||name==='Nature Bloom';
    const signature=name==='Water Chain'||name==='Water Ricochet'||
      name==='Water Wave'||name==='Daisugi Upgrade';
    const minimum=natural?name==='Nature Fusion'?.65:.23:
      signature?name==='Water Chain'?.12:.20:cue==='launch'?.07:.09;
    if(now-(lastSoundByCue.get(soundKey)??-100)<minimum)return;
    lastSoundByCue.set(soundKey,now);
    // Short, layered WebAudio signatures — no MP3 requests or sound assets.
    // Mobile browsers unlock the AudioContext on the play-button gesture.
    function note(freq,t,duration,volume,type='sine',destination='lowpass'){
      const osc=context.createOscillator(),gain=context.createGain(),
        filter=context.createBiquadFilter();
      osc.type=type;osc.frequency.setValueAtTime(Math.max(60,freq),t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(60,freq*.70),t+duration);
      filter.type=destination;filter.frequency.setValueAtTime(3500,t);
      gain.gain.setValueAtTime(.0001,t);
      gain.gain.exponentialRampToValueAtTime(volume,t+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      osc.connect(filter);filter.connect(gain);gain.connect(context.destination);
      osc.start(t);osc.stop(t+duration+.02);
      osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();};
    }
    try{
      if(name==='Nature Fusion'){
        const rare=cue==='enchanted'||cue==='grove';
        note(rare?530:390,now,.23,.032,'sine');
        note(rare?740:560,now+.09,.28,.038,'triangle');
        note(rare?1050:780,now+.19,.38,.030,'sine');
        return;
      }
      if(name==='Nature Bloom'){
        note(cue==='blossom'?790:cue==='tree'?620:490,now,.18,.018,'sine');
        note(cue==='blossom'?1170:890,now+.08,.20,.014,'triangle');
        return;
      }
      if(name==='Water Chain'){
        note(770,now,.105,.034,'sawtooth');
        note(1120,now+.035,.09,.022,'sine');return;
      }
      if(name==='Water Ricochet'){
        note(390,now,.14,.033,'sine');
        note(730,now+.065,.14,.023,'triangle');return;
      }
      if(name==='Water Wave'){
        note(185,now,.34,.055,'triangle');
        note(425,now+.06,.25,.025,'sine');return;
      }
      if(name==='Daisugi Upgrade'){
        note(460,now,.19,.043,'triangle');
        note(680,now+.11,.20,.039,'sine');
        note(930,now+.22,.27,.025,'sine');return;
      }
    }catch{/* Audio must never interrupt combat or fusion */}
    // Make the second layer distinguishable even for instant-hit abilities.
    const t=now+(cue==='impact'?.075:0);
    const p=pickSpell(name),cold=p.kind==='ice'||p.kind==='frost'||p.kind==='crystal';
    const shield=p.kind==='shield',start=cold?620:shield?460:235;
    const base=cold?'sine':shield?'triangle':'triangle';
    const interval=cue==='impact'?.115:cue==='charge'?.105:.17;
    try{
      const osc=context.createOscillator(),gain=context.createGain(),filter=context.createBiquadFilter();
      filter.type='lowpass';filter.frequency.setValueAtTime(cold?3200:1600,t);
      osc.type=base;
      osc.frequency.setValueAtTime(start*(cue==='impact'?1.4:.65),t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(80,start*(cue==='impact'?.34:1.6)),t+interval);
      gain.gain.setValueAtTime(.0001,t);
      gain.gain.exponentialRampToValueAtTime(cue==='impact'?.045:.026,t+.013);
      gain.gain.exponentialRampToValueAtTime(.0001,t+interval);
      osc.connect(filter);filter.connect(gain);gain.connect(context.destination);
      osc.start(t);osc.stop(t+interval+.015);
      osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();};
    }catch{/* Audio failures cannot interrupt combat */}
  }
  return {emit,tick,clear,dispose,unlock,sound,
    get muted(){return muted;},setMuted(value){muted=Boolean(value);if(!muted)unlock();},
    get activeCount(){return active.length;}
  };
}
