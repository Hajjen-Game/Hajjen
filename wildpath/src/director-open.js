import {clamp,random} from './config.js';
import {energyProgress} from './open-layout.js';
export class OpenDirector {
  constructor(){this.reset();}
  reset(){
    this.stage=0;this.phase='build';this.phaseTime=0;this.spawnTimer=.6;
    this.stress=0;this.ready=false;this.kills=0;this.time=0;this.guardianSent=false;
  }
  next(){
    this.stage++;this.phase='build';this.phaseTime=0;this.spawnTimer=.95;
    this.ready=false;this.stress=0;this.kills=0;this.guardianSent=false;
  }
  tick(dt,game){
    if(this.ready)return;
    this.time+=dt;this.phaseTime+=dt;
    if(energyProgress(game.energy,this.stage)>=1){
      this.ready=true;
      game.showToast(this.stage===7?'Final surge mastered!':'Magic surges! Choose your next blessing.');
      return;
    }
    const living=game.enemies.filter(e=>e.alive),count=living.length;
    const close=living.filter(e=>Math.hypot(e.x-game.x,e.z-game.z)<5).length;
    const pressure=clamp((1-game.hp/game.maxHp)*.30+Math.min(count,16)*.025+close*.12+(game.recentHit>0?.13:0),0,1);
    this.stress=clamp(this.stress+(pressure-this.stress)*Math.min(1,dt*1.5),0,1);
    if(this.phase==='build'&&(this.phaseTime>11||this.stress>.85)){this.phase='peak';this.phaseTime=0;}
    if(this.phase==='peak'&&this.phaseTime>4.8){this.phase='relax';this.phaseTime=0;}
    if(this.phase==='relax'&&this.phaseTime>4.0){this.phase='build';this.phaseTime=0;}
    if(this.phase==='relax')return;
    const limit=Math.min(21,7+this.stage*2);
    if(count>=limit)return;
    this.spawnTimer-=dt;
    if(this.spawnTimer>0)return;
    let type='mossling';
    const roll=Math.random();
    if(this.stage>=4&&!this.guardianSent&&this.kills>5&&roll<.16){
      type='guardian';this.guardianSent=true;
    }else if(this.stage>=2&&roll<.22)type='ember';
    else if(this.stage>=1&&roll<.41)type='bramble';
    game.spawnEnemy(type);
    const pace=Math.max(.56,1.30-this.stage*.08);
    this.spawnTimer=random(pace*.70,pace*1.16)+(this.stress>.7?.20:0);
  }
  get stateLabel(){return this.ready?'MAGIC READY':this.phase==='relax'?'BREATHING ROOM':this.phase==='peak'?'WILD SURGE':'GROWING MAGIC';}
  get progress(){return Math.max(0,Math.min(1,this.kills/30));}
}
