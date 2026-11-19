// Regression: player-facing version, exported audit and copied links agree.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("the current published build is the HUD, audit and shared URL version",()=>{
 const game=read("./game-v0210.mjs");
 const html=read("./index.html");
 const boot=read("./boot-v0210.js");
 const version=boot.match(/game-v0210\.mjs\?v=(0\.23\.0)/)?.[1];
 assert.ok(version);
 assert.ok(html.includes("boot-v0210.js?v="+version));
 assert.ok(html.includes("SKYLINE CIRCUIT · "+version));
 assert.match(game,/const SKYSHIFT_BUILD_VERSION=new URL\(/);
 assert.match(game,/querySelector\("script\[data-game-module\]"\)/);
 assert.match(game,/topbarTrack\.textContent=ACTIVE_TRACK_0160\.name\+" · "\+SKYSHIFT_BUILD_VERSION/);
 assert.match(game,/game:"SKYSHIFT",version:SKYSHIFT_BUILD_VERSION/);
 assert.match(game,/buildVersion:SKYSHIFT_BUILD_VERSION/);
 assert.equal((game.match(/searchParams\.set\("v",SKYSHIFT_BUILD_VERSION\)/g)||[]).length,2);
 assert.doesNotMatch(game,/topbarTrack\.textContent[^\n]*0\.21\.2\.5/);
});
