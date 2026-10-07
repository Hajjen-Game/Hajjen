import { usesPaladinDkVfx2 } from "../systems/MageShamanVfxProfile.js?v=20260930-vfx2d";

const TAU = Math.PI * 2;

const PROFILE = Object.freeze({
  "paladin-holy-shock": { family: "paladin", kind: "holy-shock", main: "#e7c760", core: "#fff7c7", accent: "#c8913d" },
  "paladin-flash-light": { family: "paladin", kind: "flash-light", main: "#e9cf76", core: "#fffbe0", accent: "#c99b48" },
  "paladin-holy-light": { family: "paladin", kind: "holy-light", main: "#e5c76f", core: "#fffce3", accent: "#c18e3f" },
  "paladin-blessing": { family: "paladin", kind: "blessing", main: "#e7cd79", core: "#fff8cf", accent: "#a97835" },
  "paladin-hammer": { family: "paladin", kind: "hammer", main: "#e5bd58", core: "#fff2ad", accent: "#b97b2e" },
  "paladin-word-of-glory": { family: "paladin", kind: "word-glory", main: "#f0d57e", core: "#fffbe0", accent: "#c69745" },
  "paladin-judgment": { family: "paladin", kind: "judgment", main: "#e1b84f", core: "#fff4ae", accent: "#b7772d" },

  "dk-fever": { family: "dk", kind: "fever", main: "#6fb9d5", core: "#d9f5ff", accent: "#486c8d" },
  "dk-death-strike": { family: "dk", kind: "death-strike", main: "#9f454b", core: "#e8a4aa", accent: "#4e2329" },
  "dk-obliterate": { family: "dk", kind: "obliterate", main: "#74bad8", core: "#e3f8ff", accent: "#4f7291" },
  "dk-chains": { family: "dk", kind: "chains", main: "#75bcd8", core: "#e3f8ff", accent: "#536e86" },
  "dk-mind-freeze": { family: "dk", kind: "mind-freeze", main: "#6fb6d4", core: "#e4f9ff", accent: "#445f7c" },
  "dk-frost-strike": { family: "dk", kind: "frost-strike", main: "#75bcd8", core: "#e8fbff", accent: "#54728f" },
  "dk-rune-tap": { family: "dk", kind: "rune-tap", main: "#a34b51", core: "#ddb0b4", accent: "#513039" },
});

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function easeOut(v) { const t = clamp01(v); return 1 - Math.pow(1 - t, 3); }
function smooth(v) { const t = clamp01(v); return t * t * (3 - 2 * t); }
function seeded(seed, i) {
  const v = Math.sin((Number(seed) || 1) * 13.917 + i * 57.331) * 43758.5453;
  return v - Math.floor(v);
}
function along(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function basis(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.max(1, Math.hypot(dx, dy));
  return { tx: dx / len, ty: dy / len, nx: -dy / len, ny: dx / len, len, angle: Math.atan2(dy, dx) };
}
function dot(ctx, x, y, r, color, alpha=1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = r * 2.2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}
function ring(ctx, x, y, r, color, alpha, width=2) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.lineWidth = width;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
}

function paladinSourceCue(ctx, source, profile, p) {
  if (!source) return;
  const fade = 1 - clamp01(p);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(source.x, source.y); ctx.rotate(p * .45);
  ctx.strokeStyle = profile.main; ctx.shadowColor = profile.main; ctx.shadowBlur = 10; ctx.lineWidth = 1.8; ctx.globalAlpha = fade * .66;
  for (let i = 0; i < 4; i += 1) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -source.radius - 7); ctx.lineTo(0, -source.radius - 20); ctx.stroke();
  }
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = profile.core; ctx.globalAlpha = fade * .46;
  ctx.strokeRect(-8, -8, 16, 16);
  ctx.restore();
}

function dkSourceCue(ctx, source, profile, p) {
  if (!source) return;
  const fade = 1 - clamp01(p);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(source.x, source.y); ctx.rotate(-p * .8);
  ctx.strokeStyle = profile.main; ctx.shadowColor = profile.main; ctx.shadowBlur = 11; ctx.lineWidth = 1.7; ctx.globalAlpha = fade * .62;
  for (let i = 0; i < 3; i += 1) {
    const a = i * TAU / 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (source.radius + 6), Math.sin(a) * (source.radius + 6));
    ctx.lineTo(Math.cos(a + .36) * (source.radius + 18), Math.sin(a + .36) * (source.radius + 18));
    ctx.lineTo(Math.cos(a + .72) * (source.radius + 9), Math.sin(a + .72) * (source.radius + 9));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPaladinHeal(ctx, source, target, profile, progress, seed, mode) {
  const p = clamp01(progress), fade = 1 - clamp01((p - .68) / .32);
  paladinSourceCue(ctx, source, profile, Math.min(1, p / .18));
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(target.x, target.y);
  const strong = mode === "holy-light";
  const burst = mode === "holy-shock";
  const scale = burst ? 1.15 : strong ? 1.32 : 1;
  ctx.strokeStyle = profile.main; ctx.shadowColor = profile.main; ctx.shadowBlur = strong ? 15 : 11; ctx.lineWidth = strong ? 2.7 : 2;
  ctx.globalAlpha = fade * .74;
  const r = 10 + easeOut(p) * (burst ? 28 : strong ? 34 : 25);
  // Angular sun seal, intentionally unlike Priest's round column.
  for (let i = 0; i < 8; i += 1) {
    const a = i * TAU / 8 + (burst ? -p * 1.5 : p * .45);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * .48, Math.sin(a) * r * .48);
    ctx.lineTo(Math.cos(a) * r * scale, Math.sin(a) * r * scale);
    ctx.stroke();
  }
  ctx.strokeStyle = profile.core; ctx.globalAlpha = fade * .5; ctx.rotate(Math.PI / 4 + p * .2);
  ctx.strokeRect(-r * .42, -r * .42, r * .84, r * .84);
  dot(ctx, 0, 0, strong ? 6.5 : 5, profile.core, fade * .72);
  ctx.restore();
}

function drawBlessing(ctx, source, target, profile, progress) {
  const p = clamp01(progress), fade = 1 - clamp01((p - .72) / .28);
  paladinSourceCue(ctx, source, profile, Math.min(1, p / .18));
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(target.x, target.y); ctx.globalAlpha = fade * .82;
  ctx.strokeStyle = profile.main; ctx.shadowColor = profile.main; ctx.shadowBlur = 13; ctx.lineWidth = 3;
  const r = 22 + easeOut(p) * 8;
  // Four shield plates around target.
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2 + p * .28;
    ctx.save(); ctx.rotate(a); ctx.translate(0, -r);
    ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, -7); ctx.lineTo(10, 3); ctx.lineTo(0, 10); ctx.lineTo(-10, 3); ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}

function drawHammer(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress), fade = 1 - clamp01((p - .72) / .28);
  paladinSourceCue(ctx, source, profile, Math.min(1, p / .16));
  const b = basis(source || target, target);
  const start = source || { x: target.x - 40, y: target.y - 30 };
  const swing = along(start, target, easeOut(p / .44));
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(swing.x, swing.y); ctx.rotate(b.angle + p * 2.8);
  ctx.globalAlpha = fade * .86; ctx.strokeStyle = profile.core; ctx.fillStyle = profile.main; ctx.shadowColor = profile.main; ctx.shadowBlur = 13; ctx.lineWidth = 2;
  ctx.fillRect(-4, -15, 8, 24); ctx.strokeRect(-13, -19, 26, 9); ctx.restore();
  if (p > .38) {
    const hit = clamp01((p - .38) / .45);
    ring(ctx, target.x, target.y, 10 + hit * 36, profile.main, (1 - hit) * .72, 2.4);
  }
}

function drawWordGlory(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress), fade = 1 - clamp01((p - .70) / .30);
  paladinSourceCue(ctx, source, profile, Math.min(1, p / .16));
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(target.x, target.y);
  ctx.strokeStyle = profile.main; ctx.shadowColor = profile.main; ctx.shadowBlur = 12; ctx.lineWidth = 2.2; ctx.globalAlpha = fade * .76;
  // Crown-like sigil above the ally.
  const rise = 18 + easeOut(p) * 12;
  ctx.beginPath();
  ctx.moveTo(-20, -rise); ctx.lineTo(-11, -rise - 13); ctx.lineTo(0, -rise - 4); ctx.lineTo(11, -rise - 13); ctx.lineTo(20, -rise); ctx.stroke();
  ctx.strokeStyle = profile.core; ctx.beginPath(); ctx.moveTo(-17, -rise + 4); ctx.lineTo(17, -rise + 4); ctx.stroke();
  for (let i = 0; i < 5; i += 1) dot(ctx, (i-2)*7, -rise + 8 + p*9, 1.8, i===2?profile.core:profile.main, fade*.62);
  ctx.restore();
}

function drawJudgment(ctx, source, target, profile, progress, seed, missed) {
  const p = clamp01(progress);
  paladinSourceCue(ctx, source, profile, Math.min(1, p / .20));
  const side = missed ? (seeded(seed, 0) > .5 ? 48 : -48) : 0;
  const to = { x: target.x + side, y: target.y - (missed ? 10 : 0) };
  const strike = clamp01((p - .10) / .55), fade = 1 - clamp01((p - .72) / .28);
  const topY = to.y - 128;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  // Descending judgment seal/hammer from above.
  ctx.globalAlpha = fade * .74; ctx.strokeStyle = profile.core; ctx.shadowColor = profile.main; ctx.shadowBlur = 18; ctx.lineWidth = 4;
  const y = topY + easeOut(strike) * 122;
  ctx.beginPath(); ctx.moveTo(to.x, topY); ctx.lineTo(to.x, y); ctx.stroke();
  ctx.save(); ctx.translate(to.x, y); ctx.rotate(.18);
  ctx.fillStyle = profile.main; ctx.globalAlpha = fade * .82; ctx.fillRect(-4, -20, 8, 27); ctx.fillRect(-15, -24, 30, 9); ctx.restore();
  if (!missed && strike > .58) {
    const hit = (strike - .58) / .42;
    for (let i=0;i<8;i+=1){const a=i*TAU/8; const rr=9+easeOut(hit)*(25+(i%2)*9); dot(ctx,to.x+Math.cos(a)*rr,to.y+Math.sin(a)*rr,1.8,i%2?profile.main:profile.core,(1-hit)*.72);}
  }
  ctx.restore();
}

function drawFever(ctx, source, target, profile, progress, seed, missed=false) {
  const p=clamp01(progress), fade=1-clamp01((p-.62)/.38);
  dkSourceCue(ctx, source, profile, Math.min(1,p/.18));
  const visualTarget = missed
    ? { x: target.x + (seeded(seed, 4) > .5 ? 42 : -42), y: target.y - 12 }
    : target;
  ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.translate(visualTarget.x,visualTarget.y);
  ctx.strokeStyle=profile.main; ctx.shadowColor=profile.main; ctx.shadowBlur=12; ctx.lineWidth=1.8; ctx.globalAlpha=fade*.74;
  // Jagged frost rune grows under target.
  const r=9+easeOut(p)*24;
  for(let i=0;i<6;i+=1){const a=i*TAU/6+p*.35;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.35,Math.sin(a)*r*.35);ctx.lineTo(Math.cos(a+.14)*r,Math.sin(a+.14)*r);ctx.stroke();}
  for(let i=0;i<7;i+=1){const a=seeded(seed,i)*TAU;const rr=8+p*(15+seeded(seed+20,i)*16);dot(ctx,Math.cos(a)*rr,Math.sin(a)*rr-p*9,1.5,profile.core,fade*.46);}
  ctx.restore();
}

function drawSlash(ctx, target, profile, progress, seed, double=false, frost=false) {
  const p=clamp01(progress), fade=1-clamp01((p-.68)/.32);
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.translate(target.x,target.y);ctx.lineCap="round";
  const count=double?2:1;
  for(let i=0;i<count;i+=1){
    const angle=(i?-.72:.72)+(seeded(seed,i)-.5)*.12;
    ctx.save();ctx.rotate(angle);
    ctx.strokeStyle=i?profile.core:profile.main;ctx.shadowColor=profile.main;ctx.shadowBlur=15;ctx.lineWidth=i?3.2:5;
    ctx.globalAlpha=fade*(.72+i*.12);ctx.beginPath();ctx.moveTo(-34+easeOut(p)*8,-6);ctx.quadraticCurveTo(0,-2,34,6);ctx.stroke();ctx.restore();
  }
  if(frost){
    for(let i=0;i<7;i++){const a=seeded(seed+30,i)*TAU;const rr=9+easeOut(p)*(18+seeded(seed+50,i)*15);dot(ctx,Math.cos(a)*rr,Math.sin(a)*rr,1.4+(i%2)*.5,profile.core,fade*.6);}
  }
  ctx.restore();
}

function drawDeathStrike(ctx, source, target, profile, progress, seed, missed=false) {
  const p=clamp01(progress);
  dkSourceCue(ctx, source, profile, Math.min(1,p/.15));
  if (missed || !source) return;

  const hit=clamp01((p-.12)/.56);
  const fade=1-clamp01((p-.72)/.28);
  const expand=easeOut(hit);
  const facing=Math.atan2(target.y-source.y,target.x-source.x);

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  ctx.lineCap="round";

  // One dark blood cleave at contact: the runeblade itself is drawn by the
  // shared melee layer, so this is the wound/payoff rather than another weapon.
  ctx.strokeStyle=profile.main;
  ctx.shadowColor=profile.main;
  ctx.shadowBlur=12;
  ctx.lineWidth=5.5;
  ctx.globalAlpha=fade*.52;
  ctx.beginPath();
  ctx.arc(target.x,target.y,18+expand*14,facing-1.05,facing+.18);
  ctx.stroke();

  ctx.strokeStyle=profile.core;
  ctx.lineWidth=2.1;
  ctx.globalAlpha=fade*.78;
  ctx.beginPath();
  ctx.arc(target.x,target.y,15+expand*11,facing-.98,facing+.12);
  ctx.stroke();

  // Blood runes implode toward the wound before the stolen life returns.
  for(let i=0;i<5;i++){
    const a=i*TAU/5-hit*.52;
    const outer=34+(i%2)*5;
    const inner=9+expand*5;
    ctx.beginPath();
    ctx.moveTo(
      target.x+Math.cos(a)*outer,
      target.y+Math.sin(a)*outer
    );
    ctx.lineTo(
      target.x+Math.cos(a+.22)*inner,
      target.y+Math.sin(a+.22)*inner
    );
    ctx.strokeStyle=i%2?profile.core:profile.main;
    ctx.lineWidth=i%2?1.7:2.2;
    ctx.globalAlpha=fade*.62;
    ctx.stroke();
  }

  ctx.restore();

  if(p>.24){
    const t=clamp01((p-.24)/.54);
    const q=along(target,source,easeOut(t));
    const b=basis(target,source);
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    ctx.strokeStyle=profile.main;
    ctx.shadowColor=profile.main;
    ctx.shadowBlur=10;
    ctx.lineWidth=2.2;
    ctx.globalAlpha=fade*.56;
    ctx.beginPath();
    ctx.moveTo(target.x,target.y);
    ctx.quadraticCurveTo(
      (target.x+source.x)/2+b.nx*14,
      (target.y+source.y)/2+b.ny*14,
      q.x,q.y
    );
    ctx.stroke();
    dot(ctx,q.x,q.y,3.5,profile.core,fade*.72);
    ctx.restore();
  }
}

function drawObliterate(ctx, source, target, profile, progress, seed, missed=false) {
  const p=clamp01(progress);
  dkSourceCue(ctx, source, profile, Math.min(1,p/.20));
  if (missed || !source) return;

  const hit=clamp01((p-.10)/.62);
  const fade=1-clamp01((p-.76)/.24);
  const expand=easeOut(hit);
  const facing=Math.atan2(target.y-source.y,target.x-source.x);

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  ctx.lineCap="round";

  // Obliterate = one massive frozen runeblade connection followed by a
  // crystalline rupture. It should feel much heavier than Frost Strike.
  const cutA={
    x:target.x-Math.cos(facing)*38,
    y:target.y-Math.sin(facing)*38,
  };
  const cutB={
    x:target.x+Math.cos(facing)*40,
    y:target.y+Math.sin(facing)*40,
  };
  ctx.strokeStyle=profile.main;
  ctx.shadowColor=profile.main;
  ctx.shadowBlur=18;
  ctx.lineWidth=15;
  ctx.globalAlpha=fade*.16;
  ctx.beginPath();ctx.moveTo(cutA.x,cutA.y);ctx.lineTo(cutB.x,cutB.y);ctx.stroke();

  ctx.strokeStyle=profile.core;
  ctx.shadowBlur=7;
  ctx.lineWidth=4.2;
  ctx.globalAlpha=fade*.90;
  ctx.beginPath();ctx.moveTo(cutA.x,cutA.y);ctx.lineTo(cutB.x,cutB.y);ctx.stroke();

  const flash=Math.exp(-hit*9);
  dot(ctx,target.x,target.y,8+flash*13,profile.core,fade*(.22+flash*.38));

  // Uneven ice fractures are the main payoff instead of a generic circle.
  for(let i=0;i<14;i++){
    const a=i*TAU/14+seeded(seed,i)*.12;
    const inner=8+(i%2)*3;
    const outer=24+expand*(18+(i%4)*8);
    const bend=a+(i%2?.10:-.10);
    ctx.strokeStyle=i%3===0?profile.core:profile.main;
    ctx.lineWidth=i%3===0?2.7:1.7;
    ctx.globalAlpha=fade*(i%3===0?.82:.64);
    ctx.beginPath();
    ctx.moveTo(
      target.x+Math.cos(a)*inner,
      target.y+Math.sin(a)*inner
    );
    ctx.lineTo(
      target.x+Math.cos(bend)*outer,
      target.y+Math.sin(bend)*outer
    );
    ctx.stroke();
  }

  // Four chunky shards make the frozen impact readable even at full zoom-out.
  for(let i=0;i<4;i++){
    const a=facing+Math.PI/4+i*Math.PI/2;
    const rr=21+expand*17;
    const cx=target.x+Math.cos(a)*rr;
    const cy=target.y+Math.sin(a)*rr;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(a);
    ctx.fillStyle=i%2?profile.core:profile.main;
    ctx.globalAlpha=fade*.58;
    ctx.beginPath();
    ctx.moveTo(9,0);
    ctx.lineTo(-4,-3.5);
    ctx.lineTo(-2,3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawChains(ctx, source, target, profile, progress, seed) {
  const p=clamp01(progress), fade=1-clamp01((p-.72)/.28);
  dkSourceCue(ctx,source,profile,Math.min(1,p/.16));
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.strokeStyle=profile.main;ctx.shadowColor=profile.main;ctx.shadowBlur=10;ctx.lineWidth=2.4;ctx.globalAlpha=fade*.82;
  // Links rise from ground and wrap target. No projectile.
  for(let i=0;i<7;i++){
    const a=i*TAU/7+p*.8; const rr=19+(i%2)*4; const yOff=18-easeOut(p)*(8+(i%3)*6);
    ctx.save();ctx.translate(target.x+Math.cos(a)*rr,target.y+yOff+Math.sin(a)*rr*.35);ctx.rotate(a+p*1.8);
    ctx.beginPath();ctx.ellipse(0,0,6,3,0,0,TAU);ctx.stroke();ctx.restore();
  }
  ring(ctx,target.x,target.y,16+easeOut(p)*13,profile.core,fade*.42,1.4);ctx.restore();
}

function drawMindFreeze(ctx, source, target, profile, progress) {
  const p=clamp01(progress), fade=1-clamp01((p-.58)/.42);
  dkSourceCue(ctx,source,profile,Math.min(1,p/.12));
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.translate(target.x,target.y);ctx.strokeStyle=profile.core;ctx.shadowColor=profile.main;ctx.shadowBlur=13;ctx.lineWidth=2.7;ctx.globalAlpha=fade*.86;
  const close=1-easeOut(p);
  for(const sign of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(sign*(28+close*12),-16);
    ctx.lineTo(sign*(11+close*5),0);
    ctx.lineTo(sign*(28+close*12),16);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrostStrike(ctx, source, target, profile, progress, seed, missed=false) {
  const p=clamp01(progress);
  dkSourceCue(ctx,source,profile,Math.min(1,p/.12));
  if (missed || !source) return;

  const hit=clamp01((p-.08)/.50);
  const fade=1-clamp01((p-.66)/.34);
  const expand=easeOut(hit);
  const facing=Math.atan2(target.y-source.y,target.x-source.x);

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  ctx.lineCap="round";

  // Fast icy runeblade cut: narrow, directional and much less explosive than
  // Obliterate.
  ctx.strokeStyle=profile.main;
  ctx.shadowColor=profile.main;
  ctx.shadowBlur=12;
  ctx.lineWidth=8;
  ctx.globalAlpha=fade*.13;
  ctx.beginPath();
  ctx.arc(target.x,target.y,22+expand*18,facing-.86,facing+.38);
  ctx.stroke();

  ctx.strokeStyle=profile.core;
  ctx.lineWidth=2.7;
  ctx.globalAlpha=fade*.82;
  ctx.beginPath();
  ctx.arc(target.x,target.y,20+expand*15,facing-.82,facing+.34);
  ctx.stroke();

  for(let i=0;i<6;i++){
    const spread=(i-2.5)*.18;
    const a=facing+spread;
    const r0=7+(i%2)*2;
    const r1=24+expand*(12+(i%3)*5);
    ctx.strokeStyle=i%2?profile.core:profile.main;
    ctx.lineWidth=i%2?1.5:2.0;
    ctx.globalAlpha=fade*.66;
    ctx.beginPath();
    ctx.moveTo(
      target.x+Math.cos(a)*r0,
      target.y+Math.sin(a)*r0
    );
    ctx.lineTo(
      target.x+Math.cos(a)*r1,
      target.y+Math.sin(a)*r1
    );
    ctx.stroke();
  }
  dot(ctx,target.x,target.y,4.2,profile.core,fade*.62);
  ctx.restore();
}

function drawRuneTap(ctx, source, profile, progress) {
  const p=clamp01(progress),fade=1-clamp01((p-.74)/.26);
  dkSourceCue(ctx,source,profile,Math.min(1,p/.12));
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.translate(source.x,source.y);ctx.rotate(-p*.7);
  ctx.strokeStyle=profile.main;ctx.shadowColor=profile.main;ctx.shadowBlur=12;ctx.lineWidth=2.8;ctx.globalAlpha=fade*.74;
  for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(-7,-source.radius-9);ctx.lineTo(0,-source.radius-18);ctx.lineTo(7,-source.radius-9);ctx.stroke();}
  ctx.strokeStyle=profile.core;ctx.lineWidth=1.4;ctx.strokeRect(-10,-10,20,20);ctx.restore();
}

export function drawPaladinDkCastVfx(ctx, actor, spell, progress, nowMs=performance.now()) {
  if(!spell || !usesPaladinDkVfx2(spell.id)) return false;
  const profile=PROFILE[spell.id]; if(!profile) return false;
  const p=clamp01(progress), pulse=.5+.5*Math.sin(nowMs*.015);
  if(profile.family==="paladin"){
    ctx.save();ctx.globalCompositeOperation="lighter";ctx.translate(actor.x,actor.y);ctx.rotate(p*.35);
    ctx.strokeStyle=profile.main;ctx.shadowColor=profile.main;ctx.shadowBlur=10+p*8;ctx.lineWidth=1.8+p*.7;ctx.globalAlpha=.28+p*.48;
    const r=actor.radius+12+p*10+pulse*2;ctx.strokeRect(-r*.62,-r*.62,r*1.24,r*1.24);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.55,Math.sin(a)*r*.55);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}
    ctx.restore();
  } else {
    ctx.save();ctx.globalCompositeOperation="lighter";ctx.translate(actor.x,actor.y);ctx.rotate(-p*.65);
    ctx.strokeStyle=profile.main;ctx.shadowColor=profile.main;ctx.shadowBlur=11+p*8;ctx.lineWidth=1.7;ctx.globalAlpha=.28+p*.48;
    for(let i=0;i<3;i++){const a=i*TAU/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*(actor.radius+7),Math.sin(a)*(actor.radius+7));ctx.lineTo(Math.cos(a+.4)*(actor.radius+20-p*6),Math.sin(a+.4)*(actor.radius+20-p*6));ctx.stroke();}
    if(profile.kind==="obliterate"){
      const pull=1-easeOut(p);
      for(let i=0;i<6;i++){
        const a=i*TAU/6-p*.55;
        const outer=actor.radius+28+pull*10+(i%2)*4;
        const inner=actor.radius+8+p*5;
        ctx.strokeStyle=i%2?profile.core:profile.main;
        ctx.lineWidth=i%2?1.8:2.3;
        ctx.globalAlpha=.30+p*.50;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*outer,Math.sin(a)*outer);
        ctx.lineTo(Math.cos(a+.12)*inner,Math.sin(a+.12)*inner);
        ctx.stroke();
      }
      ring(ctx,0,0,actor.radius+10+p*7,profile.core,.18+p*.30,1.4);
      for(let i=0;i<5;i++){
        const a=i*TAU/5;
        dot(ctx,Math.cos(a)*(actor.radius+13),Math.sin(a)*(actor.radius+13),1.8,profile.core,.32+p*.46);
      }
    }
    ctx.restore();
  }
  return true;
}

export function drawPaladinDkSpellVfx(ctx,effect,game,progress,alpha){
  const id=effect?.spellId||""; if(!usesPaladinDkVfx2(id)) return false;
  const profile=PROFILE[id]; if(!profile) return false;
  const source=game.getActor(effect.sourceId);
  const target=game.getActor(effect.targetId) || {x:effect.targetX??effect.sourceX??0,y:effect.targetY??effect.sourceY??0,radius:20};
  const p=clamp01(progress),seed=effect.seed||effect.id||1;
  ctx.save();ctx.globalAlpha*=Math.min(1,alpha*1.35);
  switch(profile.kind){
    case "holy-shock": drawPaladinHeal(ctx,source,target,profile,p,seed,"holy-shock"); break;
    case "flash-light": drawPaladinHeal(ctx,source,target,profile,p,seed,"flash"); break;
    case "holy-light": drawPaladinHeal(ctx,source,target,profile,p,seed,"holy-light"); break;
    case "blessing": drawBlessing(ctx,source,target,profile,p); break;
    case "hammer": drawHammer(ctx,source,target,profile,p,seed); break;
    case "word-glory": drawWordGlory(ctx,source,target,profile,p,seed); break;
    case "judgment": drawJudgment(ctx,source,target,profile,p,seed,Boolean(effect.missed)); break;
    case "fever": drawFever(ctx,source,target,profile,p,seed,Boolean(effect.missed)); break;
    case "death-strike": drawDeathStrike(ctx,source,target,profile,p,seed,Boolean(effect.missed)); break;
    case "obliterate": drawObliterate(ctx,source,target,profile,p,seed,Boolean(effect.missed)); break;
    case "chains": drawChains(ctx,source,target,profile,p,seed); break;
    case "mind-freeze": drawMindFreeze(ctx,source,target,profile,p); break;
    case "frost-strike": drawFrostStrike(ctx,source,target,profile,p,seed,Boolean(effect.missed)); break;
    case "rune-tap": drawRuneTap(ctx,source||target,profile,p); break;
    default: break;
  }
  ctx.restore();return true;
}
