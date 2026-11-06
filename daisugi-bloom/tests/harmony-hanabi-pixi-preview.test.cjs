"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const preview=require("../harmony/hanabi-pixi-preview.js");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const src=fs.readFileSync(path.join(__dirname,"../harmony/hanabi-pixi-preview.js"),"utf8");

assert.equal(preview.mode(),"classic","Classic must remain default on all player devices");
assert.equal(preview.isEnabled(),false,"No automatic Pixi loading for existing players");
assert.equal(typeof preview.play,"function");
assert.equal(typeof preview.prepare,"function");
assert.equal(typeof preview.inspect,"function");
assert.match(preview.MODULE_URL,/pixi\.js@8\.21\.0\/dist\/pixi\.min\.mjs$/);
assert(preview.TIMING.total>=1700);
assert(preview.TIMING.burst>preview.TIMING.charge);
assert(html.includes('id="hanabiVfxMode"'));
assert(html.includes('<option value="classic" selected>'));
assert(html.includes('<option value="pixi">'));
assert(html.includes('harmony/hanabi-pixi-preview.js'));
assert(html.indexOf('harmony/hanabi-pixi-preview.js')<html.indexOf('harmony/app.js'));
assert(app.includes("window.HarmonyHanabiPixi?.isEnabled()"));
assert(app.includes("if(usedPixi){")&&app.includes("await reveal();"),
 "GPU success must complete Hanabi stage transitions before final rendering");
assert(app.includes("onReveal:()=>{void reveal();}"),
 "Pixi impact must trigger the same staged reveal as Classic");
assert(app.includes("fireworks.push(reveal())"),
 "Classic impact must play the shared staged reveal during its fireworks");
assert(app.includes("async function animateHanabiLaunch(evt)"));
assert(src.includes('preference:"webgl"'));
assert(src.includes("const lib=pixi;"),
 "A successful prepare() returns boolean; GPU initialization must use the actual Pixi module");
assert(src.includes('backgroundAlpha:0'));
assert(src.includes('pointerEvents:"none"'));
assert(src.includes("if(!(await ensureGraphics()))return false"),
 "Failed GPU or dynamic import must hand control to Classic");
assert(src.includes("onReveal?.()"),"Sprite upgrades must remain visible during Pixi sparks");
assert(src.includes("streakTextureFor(lib)"),"The main burst must use crisp streak particles");
assert(src.includes("tileTextureFor(lib)"),"Column cells must receive persistent square highlights");
assert(src.includes("layerHosts={field:new pixi.Container(),aura:new pixi.Container()"),
 "Pixi must separate the tile field, aura, core, rays and glints");
assert(src.includes("curl.side*q*2.55"),"The two fireworks curls must counter-rotate");
assert(src.includes("side:i%2?1:-1"),"Helix and effect layers must use independent alternating motion");
assert(src.includes("const echoes=Array.from"),"Main burst must include delayed spark echoes");
assert(src.includes("const lightFx="),"Low-spec devices must use a reduced particle budget");
assert(src.includes("child.destroy({children:true})"),"All nested GPU particle containers must be destroyed");
assert(src.includes("layerHosts=null;"),"A finished animation must release its layer registry");
assert(src.includes("const petals=Array.from"),"Main aerial burst must have colored flower petals");
assert(src.includes("const source=loc(evt.at),apex=loc(7+evt.at%7)"),"Pixi firework must bloom at Classic canopy height");
assert(src.includes("const columnHits=path.map"),"Each real column cell must have a small spark hit");
assert(preview.TIMING.sideDelay>=70+2*58+preview.TIMING.sideFlight,
 "Game-board upgrades must wait until all secondary rockets land");
assert(preview.TIMING.total>=preview.TIMING.charge+preview.TIMING.ascent+
 70+2*58+preview.TIMING.sideFlight+680,
 "All side floral impacts must fade before the overlay disappears");
assert(src.includes("halo:particle"),"Each side hit must have its own fade-out glow");
assert(preview.TIMING.sideDelay>=70+preview.TIMING.sideFlight,
 "Targets must not reveal before the first firework impact");
assert(preview.TIMING.total>=preview.TIMING.charge+preview.TIMING.ascent+
 70+2*58+preview.TIMING.sideFlight+610,
 "The final side explosion must fade before the Pixi overlay disappears");
assert(!src.includes("game.swap("));
assert(!src.includes("game.grow("));
assert(!src.includes("game.score="));
assert(!src.includes("Math.random("),"Visual emitter cannot alter game randomness");
assert.equal(preview.setMode("classic"),"classic");
console.log("PASS Hanabi Pixi Preview 1.3 · opt-in, pinned Pixi8, WebGL, safe fallback, no game mutation");
