/* CHROMA RUSH — Speed Trails 2.0.
 * Time-sampled square afterimages, backward-directed light fragments and
 * speed-proportional luminous streaks. Purely cosmetic: no RNG, hitboxes,
 * Director, Flow or player movement decisions. Side-on lines, never rings.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaSpeedTrails=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const SAMPLE_INTERVAL=.045;
  const MAX_ECHOES=10;
  const MAX_FRAGMENTS=36;
  const BASE_SPEED=370;
  const speedCharge=speed=>clamp((speed-BASE_SPEED)/1450,0,1);
  const trailReach=speed=>clamp(speed*.225,102,410);
  const profileDensity=quality=>clamp(quality?.density??1,.3,1);
  const profileGlow=quality=>clamp(quality?.glow??1,.15,1);

  class SpeedTrails {
    constructor(){this.reset();}
    reset(){
      this.elapsed=0;
      this.sampleAccumulator=0;
      this.fragmentAccumulator=0;
      this.sampleIndex=0;
      this.fragmentIndex=0;
      this.mutedFor=0;
      this.samples=[];
      this.fragments=[];
      this.current=null;
    }
    disrupt(){
      // A hit breaks the momentum *visually*, without touching Flow/HP.
      this.samples.length=0;
      this.fragments.length=0;
      this.sampleAccumulator=0;
      this.fragmentAccumulator=0;
      this.mutedFor=.19;
    }
    tick(dt,{playerX=300,feet=515,width=44,height=44,
      distance=0,speed=BASE_SPEED,flow=0,chromaActive=false,
      primary='#3feeff',secondary='#53b5ff',quality={},reducedMotion=false}={}){
      if(!(dt>0))return;
      this.elapsed+=dt;
      this.mutedFor=Math.max(0,this.mutedFor-dt);
      if(reducedMotion){
        this.samples.length=0;this.fragments.length=0;
        this.current=null;
        this.sampleAccumulator=0;this.fragmentAccumulator=0;
        return;
      }
      const density=profileDensity(quality);
      const charge=speedCharge(speed);
      const flowGlow=clamp(flow/100,0,1);
      this.current={playerX,feet,width,height,distance,speed,primary,secondary,
        chromaActive:Boolean(chromaActive),charge,flowGlow};
      for(const p of this.fragments){
        p.x+=p.vx*dt;
        p.y+=p.vy*dt;
        p.life-=dt;
      }
      this.fragments=this.fragments.filter(p=>p.life>0&&p.x>-65);
      const ageLimit=.34+.035*charge;
      this.samples=this.samples.filter(s=>this.elapsed-s.at<=ageLimit);

      if(this.mutedFor>0)return;
      this.sampleAccumulator+=dt;
      // Fixed-time sampling produces real temporal silhouettes, including
      // jump arcs and duck posture, not repainted copies of the current pose.
      let created=0;
      while(this.sampleAccumulator>=SAMPLE_INTERVAL&&created<3){
        this.sampleAccumulator-=SAMPLE_INTERVAL;created++;
        this.samples.push({at:this.elapsed,distance,x:playerX,feet,width,height,
          primary,secondary,chromaActive:Boolean(chromaActive)});
        if(this.samples.length>MAX_ECHOES)this.samples.shift();
      }
      const interval=clamp((.075-charge*.027-(chromaActive?.009:0))/density,.045,.21);
      this.fragmentAccumulator+=dt;
      let emissions=0;
      while(this.fragmentAccumulator>=interval&&emissions<3){
        this.fragmentAccumulator-=interval;emissions++;
        const n=this.fragmentIndex++;
        const lane=n%4;
        const life=.20+.105*charge+(n%3)*.027;
        this.fragments.push({
          x:playerX-width*.5-8,
          y:feet-height*(.14+.72*lane/3),
          vx:-(125+speed*(.28+.035*(n%3))),
          vy:((n%5)-2)*7,
          age:0,life,maxLife:life,
          length:clamp(7+charge*18+(n%3)*4,7,33),
          color:n%3===0?secondary:primary
        });
        if(this.fragments.length>MAX_FRAGMENTS)this.fragments.shift();
      }
    }
    get diagnostics(){return {samples:this.samples.length,fragments:this.fragments.length,
      charge:this.current?.charge??0,reach:trailReach(this.current?.speed??BASE_SPEED)};}

    draw(ctx,{quality={},reducedMotion=false}={}){
      const p=this.current;
      if(!p||reducedMotion)return;
      const density=profileDensity(quality),glow=profileGlow(quality);
      const {playerX,feet,width,height,distance,speed,primary,secondary,
        chromaActive,charge,flowGlow}=p;
      const strength=this.mutedFor>0?.22:1;
      const xLimit=playerX-width*.5-4;
      const maxReach=trailReach(speed);
      const echoLimit=density<.5?2:density<.8?4:7;
      const now=this.elapsed;
      ctx.save();
      // Layer 1: transparent time-history silhouettes. Older jump/duck
      // samples retain their OWN position and shape when moving backward.
      let drawn=0;
      for(let i=this.samples.length-1;i>=0&&drawn<echoLimit;i--){
        const s=this.samples[i],age=now-s.at;
        const x=s.x-(distance-s.distance);
        const behind=playerX-x,decay=1-age/(.34+.035*charge);
        if(x>=xLimit||behind>maxReach||x<-width||decay<=0)continue;
        drawn++;
        const alpha=(.10+.075*charge+.047*flowGlow+(chromaActive?.03:0))*
          decay*decay*density*strength;
        const ghostWidth=s.width*(1-.10*age/.375);
        const left=x-ghostWidth/2,top=s.feet-s.height;
        ctx.globalAlpha=alpha*.48;
        ctx.fillStyle=s.primary;
        ctx.fillRect(left,top,ghostWidth,s.height);
        ctx.globalAlpha=alpha;
        ctx.lineWidth=1.25;
        ctx.strokeStyle=s.secondary;
        ctx.shadowColor=s.primary;
        ctx.shadowBlur=7*glow;
        ctx.strokeRect(left,top,ghostWidth,s.height);
      }
      // Layer 2: main continuous speed rails. Starts just behind the
      // square's left edge. Length follows SPEED, not the score tier.
      const start=xLimit-3;
      const length=25+charge*156+(chromaActive?22:0);
      const railCount=density<.5?2:density<.8?3:4;
      for(let i=0;i<railCount;i++){
        const portion=i/(railCount-1);
        const y=feet-height*(.12+portion*.76);
        const wave=Math.sin(this.elapsed*(11+i*2.8)+i*1.9)*2;
        const len=length*(1-i*.12);
        const fade=(.15+.055*charge+.035*flowGlow+(chromaActive?.055:0))*strength;
        ctx.globalAlpha=fade*(i===0||i===railCount-1?1:.78)*density;
        ctx.lineWidth=i===0||i===railCount-1?1.9:1.2;
        ctx.strokeStyle=i%2?secondary:primary;
        ctx.shadowColor=primary;ctx.shadowBlur=(6+5*charge)*glow;
        ctx.beginPath();ctx.moveTo(start,y+wave);ctx.lineTo(start-len,y+wave);
        ctx.stroke();
        if(density>.5){
          ctx.globalAlpha=fade*.49*density;
          ctx.lineWidth=.85;ctx.shadowBlur=0;
          ctx.beginPath();ctx.moveTo(start-12,y+wave+4);
          ctx.lineTo(start-len*.73,y+wave+4);ctx.stroke();
        }
      }
      // Layer 3: backward-advecting point fragments with short, straight
      // tapered streaks. Each is bounded and travels only leftward.
      const fragmentLimit=density<.5?6:density<.8?12:20;
      let shown=0;
      for(let i=this.fragments.length-1;i>=0&&shown<fragmentLimit;i--){
        const f=this.fragments[i];
        if(f.x>xLimit||f.x<0)continue;
        shown++;
        const fade=clamp(f.life/f.maxLife,0,1);
        ctx.globalAlpha=(.18+.2*charge+(chromaActive?.09:0))*fade*density*strength;
        ctx.strokeStyle=f.color;ctx.lineWidth=shown%4===0?1.8:1.2;
        ctx.shadowColor=f.color;ctx.shadowBlur=5*glow;
        ctx.beginPath();ctx.moveTo(f.x,f.y);
        ctx.lineTo(f.x-f.length*(.55+.5*charge),f.y);ctx.stroke();
      }
      ctx.restore();
    }
  }
  return {SpeedTrails,BASE_SPEED,SAMPLE_INTERVAL,MAX_ECHOES,MAX_FRAGMENTS,
    speedCharge,trailReach};
});
