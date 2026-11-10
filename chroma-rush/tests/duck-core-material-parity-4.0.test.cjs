const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const GEO=require('../src/core/geometry.js');
const worldLighting=require('../src/render/world-lighting.js');
const src=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
const from=src.indexOf('  function drawObstacle(o){');
const to=src.indexOf('  function drawPlayer(){',from);
assert.ok(from>=0&&to>from);
const renderSource=src.slice(from,to);

function paint(type,{glow=1,flow=60,surge=0}={}){
  const color='#63baf1',materialRig=worldLighting.evaluate({
    quality:{glow,density:1},flow,surge});
  const calls={fills:[],rects:[],rounds:[],gradients:[],strokes:[],lines:[]};
  let currentPath=null;
  const ctx={
    globalAlpha:1,shadowBlur:0,
    save(){},restore(){},beginPath(){currentPath=['lines']},
    moveTo(){},lineTo(){},stroke(){
      calls.strokes.push({path:currentPath,shadowBlur:this.shadowBlur,
        color:this.strokeStyle,width:this.lineWidth});
    },
    fill(){calls.fills.push({path:currentPath,style:this.fillStyle,
      shadowBlur:this.shadowBlur,alpha:this.globalAlpha});},
    fillRect(x,y,w,h){calls.rects.push({x,y,w,h,style:this.fillStyle,
      shadowBlur:this.shadowBlur});},
    createLinearGradient(x0,y0,x1,y1){
      const gradient={kind:'linear-gradient',x0,y0,x1,y1,stops:[],
        addColorStop(position,color){this.stops.push([position,color])}};
      calls.gradients.push(gradient);return gradient;
    }
  };
  const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);
    return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'};
  const roundRectPath=(x,y,w,h,r)=>{
    currentPath=['round',x,y,w,h,r];calls.rounds.push(currentPath);
  };
  const obstacle={type,x:360,width:71,height:type==='jump'?66:136,groundY:515};
  const env={ctx,GEO,worldLighting,frameLighting:materialRig,
    quality:{profile:{glow,density:1}},
    camera:{visibleRight:()=>1400,visibleLeft:()=>0,screenX:x=>x,screenY:y=>y},
    player:{x:360},floorY:515,W:1280,H:720,
    spectralWave:{colorAt:()=>color},
    rgba,roundRectPath,
    glowLine:(x1,y1,x2,y2,tint,width,blur,alpha)=>{
      calls.lines.push({x1,y1,x2,y2,tint,width,alpha});
    }
  };
  const draw=vm.runInNewContext('('+renderSource+')',env);
  draw(obstacle);
  return {calls,box:type==='jump'?GEO.obstacleBox(obstacle,515):
    GEO.duckGateCoreBox(obstacle,515),rig:materialRig,color};
}

test('real Duck and Jump core materials use identical tint, gradient and inset',()=>{
  for(const glow of [.24,.6,1])for(const flow of [0,65,100]){
    const jump=paint('jump',{glow,flow});
    const duck=paint('duck',{glow,flow});
    const J=jump.calls,D=duck.calls;
    const veil=jump.rig.hazard.veil;
    const rgba=(color,a)=>{const n=parseInt(color.slice(1),16);
      return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'};
    const expectedVeil=rgba(jump.color,veil);
    // Duck paints a full-height hanging curtain before its core.
    // Jump paints that SAME pigment only inside the existing rounded body.
    assert.equal(D.rects.length,1,'Duck retains its intended hanging field');
    assert.equal(D.rects[0].style,expectedVeil);
    assert.equal(J.rects.length,0,'Jump must not grow a separate lower field');
    assert.equal(J.fills[0].style,expectedVeil);
    assert.equal(J.fills[0].shadowBlur,0,'no extra shadow pass on Jump undercoat');
    assert.deepEqual(J.fills[0].path,J.rounds[0],
      'the undercoat is clipped to the ONE existing rounded body');
    assert.equal(J.fills[0].alpha,1);
    assert.equal(J.rounds.length,2);
    assert.equal(D.rounds.length,2);
    assert.equal(J.gradients.length,1);
    assert.equal(D.gradients.length,1);
    assert.deepEqual(J.gradients[0].stops,D.gradients[0].stops,
      'both visible cores use exactly the same four World Lighting color stops');
    assert.deepEqual(J.gradients[0].stops.map(([p])=>p),[0,.25,.75,1]);
    const [js,ds]=[J.gradients[0],D.gradients[0]];
    assert.equal(js.y0,jump.box.y);assert.equal(js.y1,jump.box.y+jump.box.h);
    assert.equal(ds.y0,duck.box.y);assert.equal(ds.y1,duck.box.y+duck.box.h);
    assert.equal(J.fills[1].style,js);
    assert.equal(D.fills[0].style,ds);
    assert.equal(J.fills[2].style,D.fills[1].style,
      'the recessed inner face is now the EXACT Duck inset, no extra Jump tint');
    assert.equal(J.fills[1].shadowBlur,D.fills[0].shadowBlur);
    assert.equal(J.rounds[0][3],D.rounds[0][3],'same housing width');
    assert.equal(J.rounds[0][5],D.rounds[0][5],'same corner radius');
  }
});

test('the two obstacle silhouettes preserve intentional directional differences',()=>{
  const jump=paint('jump'),duck=paint('duck');
  const J=jump.calls,D=duck.calls;
  // Their physical collision outlines have different heights/actions by design.
  assert.equal(J.rounds[0][3],D.rounds[0][3]);
  assert.equal(J.rounds[0][5],D.rounds[0][5]);
  assert.equal(J.rounds[1][3],D.rounds[1][3]);
  assert.equal(J.rounds[1][5],D.rounds[1][5]);
  assert.equal(J.strokes[0].width,3);
  const duckCoreStroke=D.strokes.find(s=>s.width===3);
  assert.ok(duckCoreStroke);
  assert.equal(J.strokes[0].color,duckCoreStroke.color);
  assert.equal(J.strokes[0].shadowBlur,duckCoreStroke.shadowBlur);
  assert.equal(J.lines.filter(s=>s.width===1&&s.alpha===.36).length,4);
  assert.equal(D.lines.filter(s=>s.width===1&&s.alpha===.36).length,4);
  assert.ok(J.lines.filter(s=>s.width===1&&s.alpha===.36).every(s=>
    s.y1===s.y2&&s.x2>s.x1));
  assert.ok(D.lines.filter(s=>s.width===1&&s.alpha===.36).every(s=>
    s.x1===s.x2&&s.y2>s.y1));
  assert.ok(J.lines.some(s=>s.width===5&&s.y1===jump.box.y),
    'Jump light rail stays on its top');
  assert.ok(D.lines.some(s=>s.width===5&&s.y1===487),
    'Duck light rail stays on its bottom with duck clearance');
});

test('original hazard colors and existing renderer geometry stay unchanged',()=>{
  const branch=renderSource.split("if(o.type==='jump'){")[1]
    .split("}else if(isEcho||isLow){")[0];
  assert.match(renderSource,/\(isLow\|\|isEcho\)\?'secondary':'primary'/);
  assert.match(branch,/ctx\.fillStyle=rgba\(color,material\?\.veil\?\?\.105\);ctx\.fill\(\)/);
  assert.match(branch,/ctx\.fillStyle=shell\(b\.y,b\.h,\.30\);ctx\.fill\(\)/);
  assert.match(branch,/ctx\.fillStyle=rgba\(color,material\?\.inset\?\?\.18\)/);
  assert.doesNotMatch(branch,/jumpInset|const cap=|energyTop|fillRect\(/);
  assert.match(renderSource,/roundRectPath\(core\.x,core\.y,core\.w,core\.h,4\)/);
  assert.match(renderSource,/roundRectPath\(b\.x,b\.y,b\.w,b\.h,4\)/);
});
