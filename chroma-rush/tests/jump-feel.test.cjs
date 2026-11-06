const test=require('node:test');
const assert=require('node:assert/strict');
const {JumpController}=require('../src/gameplay/jump-controller.js');
const {PlayerMotion}=require('../src/render/player-motion.js');
const {JUMP_FEEL,GAME}=require('../src/core/config.js');
const GEO=require('../src/core/geometry.js');

const req=(j,opts={})=>j.request({grounded:false,ducking:false,recovering:false,worldX:0,...opts});
test('grounded jump fires instantly and cannot be repeated as a coyote jump',()=>{
 const c=new JumpController();
 assert.equal(req(c,{grounded:true}),'jump');
 assert.equal(req(c),'buffered');
 assert.equal(c.coyote,0);
});
test('coyote works immediately after leaving a ledge and consumes grace once',()=>{
 const c=new JumpController();c.leaveLedge(500);
 c.tick(.04,520);
 assert.equal(req(c,{worldX:520}),'coyote');
 assert.equal(req(c,{worldX:520}),'buffered');
 assert.equal(c.coyote,0);
});
test('coyote expires both by time and by world distance at high speed',()=>{
 const elapsed=new JumpController();elapsed.leaveLedge(500);
 elapsed.tick(.081,535);assert.equal(req(elapsed,{worldX:535}),'buffered');
 const fast=new JumpController();fast.leaveLedge(500);
 fast.tick(.03,500+JUMP_FEEL.maxCoyoteDistance+1);
 assert.equal(req(fast,{worldX:549}),'buffered');
});
test('short jump buffer executes once on landing then clears',()=>{
 const c=new JumpController();
 assert.equal(req(c),'buffered');c.tick(.065,100);
 assert.equal(c.onLand(),true);assert.equal(c.onLand(),false);
 assert.equal(c.buffer,0);
});
test('buffer expires and never auto-triggers after the window',()=>{
 const c=new JumpController();req(c);c.tick(.120,0);
 assert.equal(c.onLand(),false);
});
test('duck, spectral gap recovery and recovery landings never queue jumps',()=>{
 const c=new JumpController();
 assert.equal(req(c,{ducking:true}),'ignored');
 assert.equal(req(c,{recovering:true}),'ignored');
 assert.equal(c.buffer,0);
 req(c);assert.equal(c.onLand({recovering:true}),false);
 assert.equal(c.buffer,0);
});
test('landing squash scales back to 1 with a brief release rebound',()=>{
 const m=new PlayerMotion();
 const impact=m.land(1050);
 assert.ok(impact>.75);
 const first=m.sample({landed:true});
 assert.ok(first.scaleY<1&&first.scaleX>1);
 m.tick(.16);
 const rebound=m.sample({landed:true});assert.ok(rebound.scaleY>=1);
 m.tick(.2);assert.equal(m.sample({landed:true}).scaleY,1);
});
test('jump begins with squash and becomes vertical stretch, no camera/physics changes',()=>{
 const m=new PlayerMotion();m.jump();
 assert.ok(m.sample({landed:false,vy:-870}).scaleY<1.11);
 m.tick(.06);assert.ok(m.sample({landed:false,vy:-700}).scaleY>1);
 m.tick(.15);assert.ok(m.sample({landed:false,vy:0}).scaleY<=1.001);
 assert.equal(GAME.jumpVelocity,-870);assert.equal(GAME.gravity,2140);
});
test('drawing deformation does not change geometry hitbox for any motion state',()=>{
 const m=new PlayerMotion();const p={x:250,feet:515,landed:true,duck:false};
 const original=GEO.playerBox(p);
 m.land(1000);m.tick(.05);m.sample({landed:true});
 assert.deepEqual(GEO.playerBox(p),original);
 p.landed=false;p.vy=-870;m.jump();m.sample(p);
 assert.deepEqual(GEO.playerBox(p),{x:232,y:463,w:36,h:52});
});
test('module order and cache versions include both new independent modules',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sources=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 const ctrl=sources.indexOf('src/gameplay/jump-controller.js?v=jump-1.0');
 const motion=sources.indexOf('src/render/player-motion.js?v=jump-1.0');
 const game=sources.indexOf('src/gameplay/game.js?v=background-1.0');
 const config=sources.indexOf('src/core/config.js?v=jump-1.0');
 assert.ok(config>=0&&ctrl>config&&motion>ctrl&&game>motion);
 for(const src of sources)assert.ok(fs.existsSync(path.join(root,src.split('?')[0])),src);
});
