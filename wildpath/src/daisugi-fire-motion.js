// Daisugi Fire Motion 1.0 — subtle telegraphed shoot animation.
// Pure pose calculations based on EXISTING auto-attack clocks.
// The animation changes no game movement, attack interval or projectile logic.
export const DAISUGI_FIRE_WINDUP=.11;
export const DAISUGI_FIRE_RELEASE=.28;
const clamp01=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{const n=clamp01(t);return n*n*(3-2*n);};
export function daisugiFirePose(timeToShot,ageSinceShot,hasTarget=true){
  // A shot has just been released: quick forward lean then soft settle.
  if(ageSinceShot>=0&&ageSinceShot<DAISUGI_FIRE_RELEASE){
    const settle=1-smooth(ageSinceShot/DAISUGI_FIRE_RELEASE);
    return {
      phase:'release',pitch:.24*settle,
      arm:.56*settle,lift:.065*settle,
      squash:.08*settle
    };
  }
  // The wind-up starts BEFORE the next actual automatic attack,
  // as long as an enemy is within range. No windup against empty space.
  if(hasTarget&&timeToShot>0&&timeToShot<=DAISUGI_FIRE_WINDUP){
    const progress=smooth(1-timeToShot/DAISUGI_FIRE_WINDUP);
    return {
      phase:'windup',pitch:-.18*progress,
      arm:-.38*progress,lift:-.025*progress,
      squash:-.025*progress
    };
  }
  return {phase:'idle',pitch:0,arm:0,lift:0,squash:0};
}
