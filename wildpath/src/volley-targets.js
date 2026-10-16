import { chooseAutoTarget } from './targeting.js?v=0.6.0';

/**
 * Choose one DIFFERENT living, in-range enemy for each extra glint.
 * If fewer targets exist, use the primary again so single-target damage
 * still works. Never change game.target or the normal auto-target rules.
 */
export function chooseVolleyTargets(enemies,player,range,shotCount,primary=null){
  const count=Math.max(0,Math.min(3,Math.floor(shotCount)||0));
  if(!count)return [];
  const first=primary?.alive&&Math.hypot(primary.x-player.x,primary.z-player.z)<=range
    ?primary:chooseAutoTarget(enemies,player,range);
  if(!first)return [];
  const targets=[first],used=new Set([first]);
  while(targets.length<count){
    const remaining=enemies.filter(e=>e.alive&&!used.has(e));
    const next=chooseAutoTarget(remaining,player,range);
    if(!next)break;
    targets.push(next);used.add(next);
  }
  // Preserve the original number of shots against a lone enemy.
  while(targets.length<count)targets.push(first);
  return targets;
}
