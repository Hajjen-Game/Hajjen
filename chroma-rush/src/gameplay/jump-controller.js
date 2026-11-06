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
    reset(){this.coyote=0;this.edgeX=-Infinity;this.buffer=0;this.graceUsed=false;}
    leaveLedge(edgeX){
      if(!Number.isFinite(edgeX))return;
      this.coyote=this.rules.coyoteSeconds;
      this.edgeX=edgeX;this.graceUsed=false;
    }
    tick(dt,worldX){
      if(!(dt>0))return;
      this.coyote=Math.max(0,this.coyote-dt);
      this.buffer=Math.max(0,this.buffer-dt);
      if(worldX-this.edgeX>this.rules.maxCoyoteDistance)this.coyote=0;
    }
    request({grounded=false,ducking=false,recovering=false,worldX=0}={}){
      // During duck and spectral gap recovery, input must not queue up a surprise jump.
      if(ducking||recovering)return 'ignored';
      if(grounded){this.consumeJump();return 'jump';}
      if(!this.graceUsed&&this.coyote>0&&worldX>=this.edgeX&&
         worldX-this.edgeX<=this.rules.maxCoyoteDistance){
        this.consumeJump();return 'coyote';
      }
      this.buffer=this.rules.bufferSeconds;
      return 'buffered';
    }
    consumeJump(){this.coyote=0;this.buffer=0;this.graceUsed=true;}
    onLand({ducking=false,recovering=false}={}){
      this.coyote=0;
      this.edgeX=-Infinity;
      this.graceUsed=false;
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
