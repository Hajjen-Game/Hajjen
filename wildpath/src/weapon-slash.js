// Authentic CC0 PNG frames by Cethiel, Weapon Slash - Effect (2019).
// https://opengameart.org/content/weapon-slash-effect
// Local assets imported from the creator's unmodified Classic.zip.
export const WEAPON_SLASH_SOURCE='https://opengameart.org/content/weapon-slash-effect';
export const WEAPON_SLASH_LICENSE='CC0-1.0';
const prefix='./assets/weapon-slash/';
export function slashFramePaths(kind='basic'){
  const group=kind==='wide'?2:1;
  return Array.from({length:6},(_,i)=>{
    const n=String((group-1)*6+i+1).padStart(2,'0');
    return prefix+'Classic__'+group+'__Classic_'+n+'.png';
  });
}
export function slashFrameIndex(age,duration=.28,count=6){
  if(count<=0)return 0;
  if(!Number.isFinite(age)||!Number.isFinite(duration)||duration<=0)return 0;
  return Math.min(count-1,Math.max(0,Math.floor(Math.max(0,age)/duration*count)));
}
export function slashScreenAngle(origin,target){
  if(!origin||!target)return 0;
  return Math.atan2(target.y-origin.y,target.x-origin.x);
}
export function slashVisualSize(pixelsPerWorld,wide=false){
  return Math.max(46,Math.min(wide?105:86,(wide?8.8:7.2)*pixelsPerWorld));
}
