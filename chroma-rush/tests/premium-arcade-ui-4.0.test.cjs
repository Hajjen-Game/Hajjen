const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
const arcade=require('../src/ui/arcade-ui.js');
const mock=()=>({textContent:'',classList:{items:new Set(),
  toggle(name,active){if(active)this.items.add(name);else this.items.delete(name)},
  contains(name){return this.items.has(name)}}});
const resultEls=()=>{
 const keys=['finalMode','finalScore','finalZone','finalBest','finalPerfect',
  'finalStreak','finalRecord','finalMilestones','gameover'];
 return Object.fromEntries(keys.map(key=>[key,mock()]));
};
test('one primary launch with calm records and accessible secondary navigation',()=>{
 const menu=html.slice(html.indexOf('<section id="menu"'),html.indexOf('<section id="milestone-panel"'));
 assert.match(menu,/id="start-btn" class="primary-btn"/);
 assert.equal((menu.match(/class="primary-btn"/g)||[]).length,1);
 assert.match(menu,/ONE RUN\. EVERY COLOR\./);
 assert.match(menu,/id="record-score"/);
 assert.match(menu,/id="record-zone"/);
 for(const id of ['practice-toggle-btn','milestone-view-btn','help-toggle-btn'])
  assert.ok(menu.includes('id="'+id+'"'),id);
 for(const id of ['menu-practice','menu-controls'])
  assert.ok(menu.includes('id="'+id+'"'),id);
 assert.match(css,/#menu \.menu-eyebrow\{display:none;\}/);
 assert.match(css,/#menu \.version\{display:none;\}/);
 assert.match(html,/style\.css\?v=premium-arcade-ui-4\.0-hud-anchor-4\.1/);
});
test('Run Complete has one replay CTA, compact stats, and export only in details',()=>{
 const results=html.slice(html.indexOf('<section id="gameover"'),html.indexOf('<div id="portrait-tip"'));
 const details=results.indexOf('id="result-details"');
 const exportLog=results.indexOf('id="export-run-btn"');
 assert.ok(details>0&&exportLog>details,
  'diagnostic export must be inside the opt-in details drawer');
 assert.ok(results.includes('id="retry-btn" class="primary-btn"'));
 assert.equal((results.match(/class="primary-btn"/g)||[]).length,1);
 assert.match(results,/id="final-zone"/);
 assert.match(results,/id="final-best"/);
 for(const id of ['final-perfect','final-streak','final-distance',
  'final-comparison','final-challenge','final-milestones'])
  assert.ok(results.indexOf('id="'+id+'"')>details,id+' remains in details');
 assert.match(results,/aria-expanded="false" aria-controls="result-details"/);
 assert.match(game,/el\('export-run-btn'\)/);
 assert.match(css,/#gameover #export-run-btn\{/);
});
test('arcade and practice result modes give distinct presentation without new rules',()=>{
 const ranked=resultEls();
 arcade.results(ranked,{practice:false,score:12345,zone:8,runStreak:12,
  perfectZones:3,bestScore:12345,recordScore:true,earned:[]});
 assert.equal(ranked.finalScore.textContent,'12,345');
 assert.equal(ranked.finalZone.textContent,'08');
 assert.equal(ranked.finalBest.textContent,'12,345');
 assert.equal(ranked.finalPerfect.textContent,'3');
 assert.ok(ranked.gameover.classList.contains('is-new-best'));
 assert.ok(!ranked.gameover.classList.contains('is-practice'));
 assert.ok(ranked.finalRecord.classList.contains('new-record'));
 const training=resultEls();
 arcade.results(training,{practice:true,score:100,zone:3,runStreak:2,
  perfectZones:0,bestScore:1200,recordScore:false,earned:[]});
 assert.ok(training.gameover.classList.contains('is-practice'));
 assert.ok(!training.gameover.classList.contains('is-new-best'));
 assert.equal(training.finalMode.textContent,'PRACTICE RUN · UNRANKED');
 assert.equal(training.finalRecord.textContent,'TRAINING DOES NOT SAVE RECORDS');
});
test('HUD hierarchy hides decorative and director labels, never deletes telemetry',()=>{
 for(const id of ['hp-number','flow-number','flow-outer','flow-inner',
  'flow-multiplier','score-display','speed-display','zone-display',
  'phase-display','flow-streak','danger-indicator','replay-progress'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/#hud \.hud-center \.small-label\{display:none;\}/);
 assert.match(css,/#hud #phase-display\{display:none;\}/);
 assert.match(game,/HUD\.update\(\$/);
 assert.doesNotMatch(css,/animation:\s*premiumArcadeUI/);
});
test('landscape responsive CTA, reduced motion, and controls are retained',()=>{
 assert.match(css,/@media\(max-height:440px\) and \(orientation:landscape\)/);
 assert.match(css,/@media\(max-width:650px\) and \(orientation:landscape\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 for(const id of ['jump-btn','duck-btn','graphics-mode','music-enabled',
  'effects-enabled','effects-volume','haptics-enabled','fullscreen-btn'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/(?:PREMIUM ARCADE UI 4\.0|ARCADE SIMPLIFICATION 1\.0|CORE PACE 1\.1|CHROMA SURGE 1\.0)/);
});

test('HUD Anchor 4.1 explicitly corrects the old asymmetric layout',()=>{
  assert.match(css,/#hud\{\s*right:max\(24px,env\(safe-area-inset-right\)\);\s*display:block;/);
  assert.match(css,/#hud \.hud-center\{\s*position:absolute;top:0;left:50%;\s*transform:translateX\(-50%\);/);
  assert.match(css,/#hud \.hud-right\{\s*position:absolute;top:0;\s*right:clamp\(144px,12vw,200px\);/);
  assert.match(css,/@media\(max-width:650px\) and \(orientation:landscape\)/);
  assert.match(css,/@media\(max-width:580px\) and \(orientation:landscape\)/);
  assert.ok(css.indexOf('/* HUD Anchor Alignment 4.1')>
    css.indexOf('/* PREMIUM ARCADE UI & FINAL COHESION 4.0'),
    'anchoring must override the older flex and 166px HUD inset');
  assert.match(html,/id="top-actions"/);
  assert.match(html,/id="zone-display"/);
  assert.match(html,/id="score-display"/);
});
