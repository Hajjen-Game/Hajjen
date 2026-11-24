// SKYSHIFT 0.13.4.3 — navigation and default Ghost regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
const read=file=>readFileSync(new URL("../../"+file,import.meta.url),"utf8");
const html=read("./index.html"),
  app=read("./legacy/game/game-v01343.mjs"),boot=read("./legacy/boot/boot-v01343.js"),
  css=read("./style-v0131.css");
const has=id=>new RegExp('id="'+id+'"').test(html);
test("main menu only has START RUN, Hangar and the discrete gear",()=>{
 assert.ok(has("start-btn")&&has("hangar-btn")&&has("menu-settings-btn"));
 assert.ok(has("tt-menu-status"));
 assert.doesNotMatch(html,/id="time-trial-btn"/);
 assert.doesNotMatch(html,/id="ghost-toggle"/);
 assert.ok(!/menu-utility-row|tt-start-row/.test(html));
 assert.match(html,/aria-label="Inställningar"/);
 assert.match(css,/#app>\.topbar\{z-index:9\}/);
});
test("Fidelity and Fullscreen live inside actual dedicated Settings screen",()=>{
 const settings=html.split('<section id="settings-screen"')[1].split('</section>')[0];
 const menu=html.split('<section id="menu"')[1].split('</section>')[0];
 assert.ok(settings.includes('id="fidelity-btn"'));
 assert.ok(settings.includes('id="menu-fullscreen-btn"'));
 assert.ok(settings.includes('id="settings-back-btn"'));
 assert.ok(!menu.includes('id="fidelity-btn"'));
 assert.ok(!menu.includes('id="menu-fullscreen-btn"'));
 assert.ok(has("fullscreen-help"));
 assert.match(app,/function openSettings\(/);
 assert.match(app,/function closeSettings\(/);
 assert.match(app,/UI\.settingsOpen\.addEventListener\("click",openSettings\)/);
 assert.match(app,/UI\.settingsBack\.addEventListener\("click",closeSettings\)/);
});
test("regular START RUN now records and plays back local personal ghost",()=>{
 assert.match(app,/selectedRaceMode="time-trial"/);
 assert.match(app,/function enterPlaying\(\)\{/);
 assert.match(app,/selectedRaceMode="time-trial";\s*\$\("app"\)/);
 assert.match(app,/UI\.start\.addEventListener\("click",startImmersiveTrial\)/);
 assert.match(app,/startTimeTrial\(timeTrialState,\{mode:selectedRaceMode/);
 assert.match(app,/captureTimeTrialSample\(timeTrialState,p,\{force\}\)/);
 assert.match(app,/ghostVisual\?\.frame\(\{active:true,enabled:ghostEnabled/);
 assert.match(app,/finishTimeTrial\(timeTrialState,\{won,elapsed:flight\.elapsed/);
 assert.ok(!app.includes("UI.timeTrialButton"));
 assert.match(boot,/pendingMode:"time-trial"/);
 assert.ok(!boot.includes("time-trial-btn"));
});
test("pause has working ghost toggle and return-to-menu without PB mutation",()=>{
 const pause=html.split('<section id="pause-screen"')[1].split('</section>')[0];
 assert.ok(pause.includes('id="resume-btn"'));
 assert.ok(pause.includes('id="restart-paused-btn"'));
 assert.ok(pause.includes('id="pause-ghost-toggle"'));
 assert.ok(pause.includes('id="pause-menu-btn"'));
 assert.match(app,/UI\.pauseGhostToggle\.addEventListener\("click",/);
 assert.match(app,/timeTrialState\.ghostEnabled=ghostEnabled/);
 assert.match(app,/saveGhostEnabled\(fleetStorage\(\),ghostEnabled\)/);
 assert.match(app,/UI\.pauseMenu\.addEventListener\("click",returnToMainMenu\)/);
 const method=app.split("function returnToMainMenu(){")[1].split("function pause(){")[0];
 assert.match(method,/if\(uiState\.mode!=="paused"\)return/);
 assert.match(method,/uiState\.mode="menu"/);
 assert.match(method,/ghostVisual\?\.hide\(\)/);
 assert.match(method,/UI\.trialHud\.classList\.add\("hidden"\)/);
 assert.match(method,/UI\.settingsOpen\.classList\.remove\("hidden"\)/);
 assert.match(method,/resetFlight\(\)/);
 assert.doesNotMatch(method,/finishTimeTrial|savePersonalGhost|clearPersonalGhost/);
});
test("active boot, CSS and audit are all version-consistent",()=>{
 assert.match(html,/boot-v01343\.js\?v=0\.13\.4\.3" data-game-module="game-v01343\.mjs"/);
 assert.match(boot,/import\("\.\.\/game\/game-v01343\.mjs\?v=0\.13\.4\.3"\)/);
 assert.match(html,/style-v0131\.css\?v=0\.13\.4\.3/);
 assert.match(app,/version:"0\.13\.4\.3"/);
 assert.match(app,/skyshift-v01343-performance-/);
 assert.match(app,/address\.searchParams\.set\("v","0\.13\.4\.3"\)/);
});
