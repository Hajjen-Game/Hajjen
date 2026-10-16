// Gameplay Flow 0.6: no player-selected target or persistent WoW-style lock.
// Position, threat and the opportunity to finish an enemy determine each attack.
export function chooseAutoTarget(enemies,player,maxRange,previous=null){
  if(!(maxRange>0))return null;
  let best=null,bestScore=Infinity;
  for(const enemy of enemies){
    if(!enemy.alive)continue;
    const d=Math.hypot(enemy.x-player.x,enemy.z-player.z);
    if(d>maxRange)continue;
    // Near threats come first; low-health targets win close decisions.
    const hpRatio=Math.max(0,Math.min(1,enemy.hp/Math.max(1,enemy.maxHp)));
    const urgency=d<3?1.55:d<5?.55:0;
    const finishBonus=(1-hpRatio)*1.25;
    const score=d-urgency-finishBonus-(enemy===previous?.22:0);
    if(score<bestScore){best=enemy;bestScore=score;}
  }
  return best;
}
