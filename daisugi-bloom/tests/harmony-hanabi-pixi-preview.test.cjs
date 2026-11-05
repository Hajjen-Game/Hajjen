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
assert(app.includes("if(usedPixi){renderBoard(evt.board);refreshHanabiVfxStatus();return;}"),
 "GPU success must skip the classic duplicate");
assert(app.includes("async function animateHanabiLaunch(evt)"));
assert(src.includes('preference:"webgl"'));
assert(src.includes("const lib=pixi;"),
 "A successful prepare() returns boolean; GPU initialization must use the actual Pixi module");
assert(src.includes('backgroundAlpha:0'));
assert(src.includes('pointerEvents:"none"'));
assert(src.includes("if(!(await ensureGraphics()))return false"),
 "Failed GPU or dynamic import must hand control to Classic");
assert(src.includes("onReveal?.()"),"Sprite upgrades must remain visible during Pixi sparks");
assert(!src.includes("game.swap("));
assert(!src.includes("game.grow("));
assert(!src.includes("game.score="));
assert(!src.includes("Math.random("),"Visual emitter cannot alter game randomness");
assert.equal(preview.setMode("classic"),"classic");
console.log("PASS Hanabi Pixi Preview 1.0 · opt-in, pinned Pixi8, WebGL, safe fallback, no game mutation");
