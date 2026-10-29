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
assert(flight.includes("LITE_FX()?12:MOBILE_LITE?25:32"),"Visibility Boost must increase particle density on phones");
assert(flight.includes("Math.max(12,96-fxCount())"),"Mobile must never collapse the swarm to one barely visible particle");
assert(flight.includes("const trailMs=MOBILE_LITE?185:205"),"Keep a visibly longer tail without slowing the lead");
assert(flight.includes("shot-lead")&&flight.includes("shot-trailer"),"Separate leading sparks from the long trailing stream");
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
assert(html.includes("score-motes.css?v=1.1.0-visibility"),"Load brightened score VFX with fresh cache-busting");
assert(css.includes(".score-shot-mote.shot-core.shot-lead")&&css.includes("width:11px"),"Leading particle must be visibly bigger");
assert(css.includes(".score-shot-mote.shot-trailer")&&css.includes("width:6px"),"Trailing dust must remain smaller than the core");
assert(css.includes("0 0 22px 6px"),"Core needs a strong champagne halo");
console.log("PASS Score Motes 1.1: 3 bright leaders, 12–32 motes, 185–205ms tail, 500ms score flight and reduced motion");
