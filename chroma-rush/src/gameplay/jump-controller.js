/* CHROMA RUSH — Jump Feel & Forgiveness 1.0
 * Input forgiveness only: never changes gravity, jump velocity, damage, speed
 * or the actual collision geometry. No DOM or rendering dependencies.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.JUMP_FEEL);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaJump=api;
})(typeof window!=='undefined'?window:null,function(DEFAULT_RULES){
  'use strict';
  class JumpController {
    constructor(rules=DEFAULT_RULES){this.rules=rules;this.reset()}
    reset(){this.coyote=0;this.edgeX=-Infinity;this.buffer=0;this.graceUsed=false;
      this.echoAvailable=false;this.echoUsed=false;this.airAge=0;this.pendingEcho=false;}
    leaveLedge(edgeX){
      if(!Number.isFinite(edgeX))return;
      this.coyote=this.rules.coyoteSeconds;
      this.edgeX=edgeX;this.graceUsed=false;this.echoAvailable=false;this.echoUsed=false;this.pendingEcho=false;
    }
    tick(dt,worldX){
      if(!(dt>0))return;
      this.coyote=Math.max(0,this.coyote-dt);
      this.buffer=Math.max(0,this.buffer-dt);
      if(this.echoAvailable)this.airAge+=dt;
      if(worldX-this.edgeX>this.rules.maxCoyoteDistance)this.coyote=0;
      // A rapid SECOND tap is an explicit player command, not an accidental
      // hold. Defer it until an impulse will actually extend the flight.
      // This also survives a 30fps mobile frame between press/release.
      if(this.pendingEcho&&this.echoAvailable&&!this.echoUsed&&
        this.airAge>=(this.rules.echoMinAirSeconds??.095)){
        this.consumeEcho();
        return 'echo';
      }
      return null;
    }
    request({grounded=false,ducking=false,recovering=false,worldX=0,echoEnabled=false}={}){
      // During duck and spectral gap recovery, input must not queue up a surprise jump.
      if(ducking||recovering)return 'ignored';
      if(grounded){this.consumeJump();return 'jump';}
      if(!this.graceUsed&&this.coyote>0&&worldX>=this.edgeX&&
         worldX-this.edgeX<=this.rules.maxCoyoteDistance){
        this.consumeJump();return 'coyote';
      }
      // A fresh press while airborne can trigger one additional vertical impulse.
      // The first few frames are guarded against accidental rapid double taps.
      // Holding input does not count as a new press; that is enforced by the UI.
      if(echoEnabled&&this.echoAvailable&&!this.echoUsed){
        // Never discard a fast new second tap: buffer it for a moment rather
        // than applying the second impulse while vy is still at jumpVelocity
        // (which would produce no extra lift).
        if(this.airAge<(this.rules.echoMinAirSeconds??.095)){
          this.pendingEcho=true;
          return 'echo-buffered';
        }
        this.consumeEcho();
        return 'echo';
      }
      this.buffer=this.rules.bufferSeconds;
      return 'buffered';
    }
    consumeEcho(){
      this.echoUsed=true;this.echoAvailable=false;
      this.pendingEcho=false;this.buffer=0;this.coyote=0;
    }
    consumeJump(){this.coyote=0;this.buffer=0;this.graceUsed=true;
      this.echoAvailable=true;this.echoUsed=false;this.airAge=0;this.pendingEcho=false;}
    onLand({ducking=false,recovering=false}={}){
      this.coyote=0;
      this.edgeX=-Infinity;
      this.graceUsed=false;
      this.echoAvailable=false;this.echoUsed=false;this.airAge=0;this.pendingEcho=false;
      if(recovering||ducking){this.buffer=0;return false;}
      const jump=this.buffer>0;
      this.buffer=0;
      if(jump)this.consumeJump();
      return jump;
    }
    cancel(){this.reset();}
  }
  return {JumpController};
});
