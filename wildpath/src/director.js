import { STAGE_BUDGETS, STAGE_GATES, clamp, choice, random } from './config.js?v=0.5.0';
// Finite budgets ensure dynamic pacing never generates infinite scoring opportunities.
export class Director {
  constructor(){this.reset();}
  reset(){this.stage=0;this.phase='build';this.phaseTime=0;this.spawnTimer=.18;this.stress=0;this.spent=0;this.stageAge=0;this.ready=false;this.guardianSent=false;}
  next(){this.stage++;this.phase='build';this.phaseTime=0;this.spawnTimer=.45;this.stress=0;this.spent=0;this.stageAge=0;this.ready=false;this.guardianSent=false;}
  tick(dt,game){
    if(this.ready)return;
    this.phaseTime+=dt;this.stageAge+=dt;
    const threats=game.enemies.filter(e=>e.alive).length;
    const hpLost=1-game.hp/game.maxHp;
    const near=game.enemies.filter(e=>e.alive&&Math.hypot(e.x-game.x,e.z-game.z)<5).length;
    const target=clamp(hpLost*.24+near*.125+Math.min(threats,10)*.037+(game.recentHit>0?.18:0),0,1);
    this.stress=clamp(this.stress+(target-this.stress)*Math.min(dt*1.7,1),0,1);
    if(this.phase==='build'&&(this.stress>.78||this.phaseTime>10)){this.phase='peak';this.phaseTime=0;}
    if(this.phase==='peak'&&this.phaseTime>4.1){this.phase='relax';this.phaseTime=0;}
    if(this.phase==='relax'&&this.phaseTime>4.4){this.phase='build';this.phaseTime=0;}
    const limit=STAGE_BUDGETS[this.stage]??0;
    const canSpawn=this.spent<limit&&threats<(this.phase==='peak'?10:7)&&this.phase!=='relax';
    if(canSpawn){this.spawnTimer-=dt;if(this.spawnTimer<=0){
      let variant='mossling';const left=limit-this.spent;
      if(this.stage>=2&&!this.guardianSent&&left>=3&&this.spent>limit*.45){variant='guardian';this.guardianSent=true;}
      else if(this.stage>0){variant=choice(this.stage===1?['mossling','mossling','bramble','ember']:['mossling','bramble','bramble','ember']);}
      const cost=variant==='guardian'?3:1;
      if(cost<=left){game.spawnEnemy(variant);this.spent+=cost;}
      this.spawnTimer=clamp(random(this.phase==='peak'?.5:.63,this.phase==='peak'?.88:1.22)+(this.stress>.67?.16:0),.48,1.6);
    }}
    if(this.spent>=limit&&threats===0){this.ready=true;game.showToast('Glade clear! Choose your next blessing.');}
  }
  get gate(){return STAGE_GATES[this.stage]??STAGE_GATES.at(-1);}
  get stateLabel(){return this.ready?'TRAIL CLEAR':this.phase==='relax'?'BREATHING ROOM':this.phase==='peak'?'WILD SURGE':'BUILDING PRESSURE';}
  get progress(){return clamp(this.spent/(STAGE_BUDGETS[this.stage]||1),0,1);}
}
