"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const E=require("../harmony/economy.js");
const S=require("../harmony/spirits.js");
const check=(label,fn)=>{fn();console.log("PASS "+label);};
const save=()=>({bestStars:{},fourFamilyStars:{}});

check("Migration is additive and retains the existing six charms, coins and ownership",()=>{
 const state=save();E.initialize(state);
 for(let i=0;i<7;i++)E.claim(state,i,3);
 assert(E.purchase(state,"sakura").ok);
 assert(E.equip(state,"sakura").ok);
 const before=JSON.stringify(state.economy);
 S.initialize(state);
 assert.equal(JSON.stringify(state.economy),before);
 assert.equal(S.VERSION,1);
 assert.deepEqual(Object.keys(S.IDENTITIES).sort(),["daruma","sakura"]);
 assert.equal(E.CATALOG.length,6);
 assert.equal(S.status(state,"sakura").tier,0);
 assert.equal(S.status(state,"koi"),null);
});

check("Sakura earns one unique level for a true Masterpiece, across replay and chains",()=>{
 const state=save();E.initialize(state);state.economy.owned.push("sakura");E.equip(state,"sakura");
 const hero=[{type:"hero",positions:[16]},{type:"collection",awards:[{family:"sakura",at:16}]}];
 assert.equal(S.observe(state,5,[{type:"fusion",groups:[{at:16}]}]).ok,false);
 const first=S.observe(state,5,hero);
 assert(first.ok);assert.equal(first.tierUnlocked,1);
 assert.equal(S.observe(state,5,hero).reason,"already-earned");
 assert.equal(S.observe(state,6,hero).ok,true);
 assert.equal(S.status(state,"sakura").tier,1);
 const third=S.observe(state,7,hero);
 assert.equal(third.tierUnlocked,2);
 for(const i of [8,9,10])S.observe(state,i,hero);
 const spirit=S.status(state,"sakura");
 assert.equal(spirit.count,6);assert.equal(spirit.tier,3);
 assert.equal(spirit.nextReward,null);
 assert.equal(S.observe(state,10,hero).ok,false);
 assert.equal(S.observe(state,11,hero).tierUnlocked,0);
 assert.equal(S.status(state,"sakura").tier,3);
});

check("Daruma missions work on actual blocker levels 21–40, not other chapters",()=>{
 const state=save();E.initialize(state);state.economy.owned.push("daruma");E.equip(state,"daruma");
 const hits=[{type:"daruma",hits:[{at:24,filled:1}]}];
 const stones=[{type:"sealed-hit",hits:[{at:24,remaining:3,via:"pulse"}]}];
 assert.equal(S.observe(state,19,hits).reason,"outside-chapter");
 assert.equal(S.observe(state,20,[{type:"pulse",targets:[{to:24}]}]).reason,"not-qualified");
 assert.equal(S.observe(state,20,hits).ok,true);
 assert.equal(S.observe(state,30,stones).ok,true);
 assert.equal(S.observe(state,39,stones).tierUnlocked,2);
 assert.equal(S.observe(state,40,stones).reason,"outside-chapter");
 assert.equal(S.status(state,"daruma").count,3);
});

check("Equipping is required; progress persists and never awards coins, score or bonus moves",()=>{
 const state=save();E.initialize(state);
 const hero=[{type:"hero",positions:[11]}];
 assert.equal(S.observe(state,2,hero).reason,"no-active-spirit");
 state.economy.owned.push("sakura");E.equip(state,"sakura");
 assert(S.observe(state,2,hero).ok);
 const frozenEconomy=JSON.stringify(state.economy);
 const restored=JSON.parse(JSON.stringify(state));
 assert.equal(S.status(restored,"sakura").count,1);
 assert.equal(JSON.stringify(state.economy),frozenEconomy);
 E.equip(restored,null);
 assert.equal(S.observe(restored,3,hero).reason,"no-active-spirit");
 assert.equal(S.status(restored,"sakura").count,1);
});

check("Malformed Bond save data is normalized without fabricating achievements",()=>{
 const state=save();state.spirits={version:1,bonds:{sakura:{levels:[2,2,3,-1,Infinity,"4"]},daruma:{levels:"bad"},evil:{levels:[5]}}};
 S.initialize(state);
 assert.deepEqual(state.spirits.bonds.sakura.levels,[2,3]);
 assert.deepEqual(state.spirits.bonds.daruma.levels,[]);
 assert.equal(state.spirits.bonds.evil,undefined);
 assert.equal(S.observe(state,-1,[]).reason,"invalid-level");
});

check("UI integrates a visible equipped Spirit and only cosmetic effects",()=>{
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/mobile-game.css"),"utf8");
 const rules=fs.readFileSync(path.join(__dirname,"../harmony/rules.js"),"utf8");
 assert(html.includes('harmony/spirits.js?v=6.48.0-identity-bond'));
 assert(html.includes('id="spiritBadge"'));
 assert(app.includes("S.observe(save,level,result.events)"));
 assert(app.includes("function spiritMoment(evt)"));
 assert(app.includes("omamori-bond-detail"));
 assert(css.includes(".omamori-spirit-fx"));
 assert(css.includes(".omamori-bond-fill"));
 assert(!rules.includes("HarmonySpirits"));
 assert(!rules.includes("Bond "));
});
console.log("Omamori Spirits 2.0 Identity & Bond tests passed.");
