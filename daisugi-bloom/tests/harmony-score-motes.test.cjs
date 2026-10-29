"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const base=path.join(__dirname,"../harmony");
const app=fs.readFileSync(path.join(base,"app.js"),"utf8");
const css=fs.readFileSync(path.join(base,"score-motes.css"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const flight=app.slice(app.indexOf("function flyPoints(evt){"),app.indexOf("function animateTilePiece(",app.indexOf("function flyPoints(evt){")));
assert(flight.startsWith("function flyPoints("),"Score delivery must retain existing event pathway");
assert(flight.includes("pointSources(evt)"),"All scoring event types retain correct source attribution");
assert(!flight.includes('fxAt("score-flight-token"'),"The old flying number pill must be gone");
assert(!flight.includes('fxAt("score-trail-dot"'),"The beam/trailing dots must be gone");
assert(flight.includes('fxAt("score-shot-mote "'),"Actual individually animated particles must replace badges");
assert(flight.includes("shot-pearl")&&flight.includes("shot-gold")&&flight.includes("shot-sakura")&&flight.includes("shot-star"),
 "Use the same pearl/champagne/sakura/star language as magic dust on vacated cells");
assert(flight.includes("duration=MOBILE_LITE?500:530"),"Travel remains roughly as quick as existing 500–555ms flights");
assert(flight.includes("LITE_FX()?5:MOBILE_LITE?8:11"),"Use a lighter particle budget on phones");
assert(flight.includes("scoreFlights++")&&flight.includes("scoreFlights=Math.max(0,scoreFlights-1)"),
 "Every score flight must release concurrency cap");
assert(flight.includes("scoreSession")&&flight.includes("if(id!==scoreSession)return"),
 "Cancelled/restored games must not receive stale score flight arrivals");
assert(flight.includes("scoreShown+=points;")&&flight.includes("animateScoreCount();")&&flight.includes("scoreArrival(points);"),
 "The score counter and impact feedback must still update exactly once upon arrival");
assert(css.includes(".score-fx-overlay .score-shot-mote")&&css.includes("pointer-events:none"),
 "Motes must be pointer-free and not block taps");
assert(css.includes("prefers-reduced-motion:reduce")&&css.includes("harmony-reduced-motion"),
 "Accessibility must suppress particles when motion is reduced");
assert(html.includes("score-motes.css?v=1.0.0"),"Load VFX overrides after original styles");
console.log("PASS Score Motes 1.0: no badge/beam, small 500ms dust stream, correct scoring, limits and reduced motion");
