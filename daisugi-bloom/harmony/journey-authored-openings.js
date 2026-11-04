/* Japanese Harmony · Journey 2.0 · focused 1–20 spatial reference boards.
 * Fifteen complete, fixed 7x7 openings for the four core mechanics.
 * Stage-one family letters A-E are mapped to each level's actual active families.
 * Ordinary published levels and all player saves remain unchanged.
 */
(function(root){
"use strict";
const A=root.HarmonyPuzzleArchitect||(typeof require==="function"?require("./puzzle-architect.js"):null);
const R=root.HarmonyRules||(typeof require==="function"?require("./rules.js"):null);
const D=root.HarmonyJourneyDrafts||(typeof require==="function"?require("./journey-levels-v2.js"):null);
if(!A||!R||!D)throw Error("Journey reference boards require Puzzle Architect and HarmonyRules");
const VERSION=2;
const boards=Object.freeze({
 4:{
  name:"A two-decision Hanabi introduction",
  rows:["CBDCACB","CBCAADA","DADDBBC","ADDBCAC","B-BADBD","AABBDCD","C-DDCCB"],
  insight:"One setup Fusion precedes the launch",primary:"Hanabi delivery route",secondary:"Destination-controlled Fusion",
  sequence:["Recognize the unfinished bottom-column match","Prepare it with C5 to D5","Make the second Fusion to deliver Hanabi"],
  planned:[[30,31],[30,37]],
  detail:"Two actual swaps from the previously tested first Hanabi board."
 },
 5:{
  name:"Top-row rocket has a longer route",
  rows:["C-DABAC","BBADAAB","DCDDBBD","CADBABD","AABCDDC","CDBABCC","B-CCDDB"],
  insight:"Plan downward progress through several intervening rows",primary:"Vertical route planning",secondary:"Fusion destination choice",
  sequence:["Identify the rocket's entire column","Prepare safe Fusions through the lane","Deliver to the bottom crate"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 6:{
  name:"Two top-row rockets have separate routes",
  rows:["B-ACD-C","ADAACBC","CBBDDAD","CACBDDA","DBDABAB","DCDBBAA","B-CDD-C"],
  insight:"Do not assume the second launch follows automatically",primary:"Multi-column routing",secondary:"Route prioritization",
  sequence:["Compare the two long delivery columns","Open the more accessible route","Adapt the other route after the first launch"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 7:{
  name:"A top-row rocket can develop treasures",
  rows:["CAB-DCC","AACDABB","DBBDDCD","DBABDAC","CDDCBAA","CCBABDC","BDD-CAB"],
  insight:"Time an earned launch around the two Masterpieces",primary:"Pulse timing",secondary:"Masterpiece setup",
  sequence:["Locate a promising higher-stage chain","Advance the rocket down its lane","Exploit its upward Pulse for Masterpiece growth"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 8:{
  name:"Not every Mist patch lies on the launch line",
  rows:["B-CCD-B","CDBABCC","AABCDDC","CADBABD","DCDDBBD","BBADAAB","C-DAB-C"],
  insight:"Combine two full-length deliveries with an off-column clearing",primary:"Blast-column geometry",secondary:"Mist destination planning",
  sequence:["Identify Mist inside and outside the launch columns","Prepare the off-column Fusion","Deliver the two rockets to clear the remaining lanes"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 10:{
  name:"The wind can complete a vertical Fusion",
  rows:["DADEDCE","DBCDEBA","BDAEEAA","DABBDCC","BAADBDE","EECBEDA","EBBECAC"],
  insight:"A forecast row shift changes the useful landing cell",primary:"Predictable Wind timing",secondary:"Spatial Fusion setup",
  sequence:["Read which row shifts on the third turn","Keep a useful pair in place","Use the rightward shift to connect the family"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 11:{
  name:"Alternating wind rows demand a choice",
  rows:["CACEBBE","ADEBCEE","EDBDAAB","CCDBBAD","AAEEADB","ABEDCBD","ECDEDAD"],
  insight:"Prepare the next scheduled row without wasting the other",primary:"Wind schedule planning",secondary:"Four-match setup",
  sequence:["Check which row moves next","Preserve a possible four-family grouping","Use a shift to advance the Masterpiece route"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 12:{
  name:"The wind controls the upper approach to Hanabi",
  rows:["DDCEABB","DADEBEC","AACBAEE","EEACACB","B-EAEAD","BADCCBE","E-CDDCA"],
  insight:"Develop useful pieces in the wind row before clearing cargo below",primary:"Wind and cargo coordination",secondary:"Stage-four routing",
  sequence:["Watch the shift over the rocket","Use a Fusion to improve the lower path","Guide Hanabi and develop the required treasures"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 13:{
  name:"The Daruma needs two deliberate hits",
  rows:["EBCCEEC","EACEBDD","CCDADEA","EDA-AEB","ACBADCB","ADBCABC","EADCDAC"],
  insight:"A fixed central blocker rewards nearby Fusion destinations",primary:"Local adjacency",secondary:"Two-hit sequencing",
  sequence:["Look for legal Fusions beside the doll","Strike the doll once without losing the route","Follow with a second earned hit or Pulse"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 14:{
  name:"Two guardians share a constrained center",
  rows:["EBBEADD","BAAEAAD","CDEACDC","DC-C-EE","DCEAABA","CBACEEB","AEDBECB"],
  insight:"The middle space can contribute toward both Daruma",primary:"Multi-target Fusion placement",secondary:"Pulse positioning",
  sequence:["Find a landing between the guardians","Land a Fusion or Pulse near one or both","Finish the second hit on each"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 15:{
  name:"Two independent Hanabi routes guard two Daruma",
  rows:["CDCBCBE","ACACDCB","B-DAA-E","ACDAECD","A-ABA-A","BBAABEC","E-DDB-A"],
  insight:"Each guardian belongs to a separate launch column",primary:"Two-lane Hanabi routing",secondary:"Daruma follow-up",
  sequence:["Compare the two Daruma columns and their crates","Open one rocket route without neglecting the other","Launch both rockets and finish the remaining guardian hits"],
  planned:[],
  detail:"Two rockets at 29 and 33, two crates at 43 and 47, Daruma at 15 and 19; normal refills remain genuine."
 },
 16:{
  name:"A predictable wind row sets up blocker hits",
  rows:["EEBDBDD","BEAADBA","BCABACD","EBD-EDE","CEBD-ED","ADDCABC","CAECAAE"],
  insight:"Move treasures toward a Fusion beside the guardians",primary:"Wind to blocker route",secondary:"Destination control",
  sequence:["Watch the upper row's left shift","Prepare matches near the fixed Daruma","Convert the wind-aligned Fusions into real hits"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 17:{
  name:"Sealed Stone resists four distinct hits",
  rows:["CDABBCC","EDEECBA","EBDADAD","CEA-ACC","CCDABBD","BACDCDA","EECEAAE"],
  insight:"Find successive adjacent Fusions instead of waiting for chance",primary:"Four-hit planning",secondary:"Pulse opportunity",
  sequence:["Study the routes around the center stone","Use Fusion destinations to cause cracks","Break the stone to release Awakening Pulse"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 18:{
  name:"One Awakening Pulse helps damage a second stone",
  rows:["EBDDBBA","BBAABEC","ACABADA","AAD-ECD","BCD-AEE","ACACDCB","CDCBCBE"],
  insight:"A vertical pair of stones rewards focused attacks",primary:"Chained blocker strategy",secondary:"Area hit timing",
  sequence:["Choose which stone to focus first","Arrange repeated hits around it","Exploit its Awakening Pulse on the second stone"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 },
 19:{
  name:"Fireworks can soften distant stone pairs",
  rows:["CABAABE","DCCACBB","C-DDA-D","B-AAB-D","C-AEA-B","BCECDEB","E-EDA-A"],
  insight:"Two long-range launch columns connect rockets with stones",primary:"Hanabi vs Stone alignment",secondary:"Two-route priorities",
  sequence:["Notice each rocket's column intersects Sealed Stones","Open both cargo routes strategically","Finish weakened stones with Fusion or Harmony Pulse"],
  planned:[],
  detail:"The complete board geometry is fixed; later refills remain genuine and unpredicted."
 }
});
// Chapter 3–4: fixed 7×7 treasure placements, never a fresh captured seed.
// Each board reserves its real engine fixtures with '-' and documents
// intended opening decisions for regression tests and later playtest review.
const chapterBoards=Object.freeze({
 25:{"name":"Windward Shrine","rows":["ABDEEBC","DEDCDDA","ACBBDEA","ACE-CDE","CDDC-AC","EABBCBB","EEADBAA"],"planned":[[25,26],[39,46]],"insight":"The upper wind row and a bottom approach provide different attacks on the stones.","primary":"Wind-supported Stone pressure","secondary":"Alternating approach routes","sequence":["Read the gust before committing the upper match","Break the first stone from its open flank","Use a lower approach to finish the second"],"detail":"Stones stagger from center to lower-right; marked wind runs above both."},
 26:{"name":"Hanabi Split","rows":["E-EBDDE","CADACAC","CEBDCBB","DABCEAD","EADCE-C","ADABBEB","E-CDD-A"],"planned":[[36,37],[40,41]],"insight":"A top-row rocket and a lower rocket require different-length routes.","primary":"Asymmetric Hanabi routing","secondary":"Masterpiece timing","sequence":["Start moving the distant rocket before the lower one launches","Use bottom lane Fusions to create vertical space","Save a developed family for the required Masterpiece"],"detail":"Two rockets start at deliberately different heights and share no crate column."},
 27:{"name":"Awakening Circle","rows":["DEECDAA","AABEDBB","BD--BEA","BBD-DEE","AABCCDD","ACBBADC","CCECECE"],"planned":[[22,23],[18,25]],"insight":"The tight three-stone cluster can be weakened in sequence by Awakening Pulse.","primary":"Chain-target order","secondary":"Two flank approaches","sequence":["Find the accessible lower and upper flanks","Focus one stone instead of scattering hits","Release an Awakening Pulse into its neighbors"],"detail":"Three Sealed Stones create a hooked central cluster with two legal flank entries."},
 28:{"name":"Guardian Wind","rows":["CAAEBCB","EDBECDC","BAB-ACD","ECA-EAE","CCB-CDB","EDDADEC","DBEDBAA"],"planned":[[23,30],[38,45]],"insight":"The guardian column blocks ordinary travel; two Wind rows shift the approach.","primary":"Daruma corridor control","secondary":"Gust cycle prediction","sequence":["Prepare an approach from beside the guardian column","Watch both scheduled shifts before targeting the middle doll","Finish upper and lower Daruma with separate pressure"],"detail":"Three Daruma stack vertically; wind sweeps around rather than through fixed guardians."},
 29:{"name":"Festival Trials Finale","rows":["ABCACEE","CA-CBDD","ABE-DBC","ACBE-DE","E-BDE-A","DBDDCAE","A-CEE-B"],"planned":[[15,16],[35,36]],"insight":"A diagonal stone corridor connects both Hanabi blasts to the central chain.","primary":"Stone-Hanabi route ordering","secondary":"Awakening Pulse sequencing","sequence":["Begin attacking the two linked upper stones","Open one rocket route to strike along its column","Release Awakening Pulse and finish the second launch"],"detail":"Three Sealed Stones cut diagonally across the middle while two launch columns stay open."},
 20:{"name":"Guardian Crossroads","rows":["AEBBCCB","CEDEDEE","AAE-ABE","ADDEDCB","CBB-DAA","DAADBCB","ECDACBC"],"planned":[[24,25],[38,45]],"insight":"A center Fusion can strike the upper and lower guardians together.","primary":"Two-target Daruma approach","secondary":"Choose the landing square","sequence":["Spot the center approach between the guardians","Use the shared attack before the lower route shifts","Finish the two-hit Daruma separately"],"detail":"The upper and lower Daruma form a vertical corridor; center and lower flank are intentional opening routes."},
 21:{"name":"Lantern Route","rows":["ABBDECB","ABD-CDD","DDBCBDE","AEC-ACA","DEEBECC","ACCEDAB","BAA-EDC"],"planned":[[31,38],[8,9]],"insight":"The rocket route and the upper guardian demand different Fusion positions.","primary":"Hanabi lane planning","secondary":"Daruma two-hit timing","sequence":["Inspect the rocket below the upper guardian","Create a Fusion under the rocket without losing the flank","Return to the guardian after launching"],"detail":"One opening targets the crate lane; a second approach hits the off-route Daruma."},
 22:{"name":"Two Winds","rows":["BEDCECD","DABACDA","AADCAEB","DCEBABD","EAEEBEC","DBCBEBD","CDCAEDC"],"planned":[[10,11],[31,32]],"insight":"Two wind rows offer competing tactical moves before the next gust.","primary":"Alternating Wind timing","secondary":"Four-match preparation","sequence":["Read which wind row moves first","Preserve the second-row match for the next cycle","Develop a Masterpiece while earning four-object turns"],"detail":"Each marked wind row starts with a distinct legal Fusion route."},
 23:{"name":"Sealed Corner","rows":["DEAECAE","DEAECBD","AD-CABB","DC-EDDE","BBCEEAC","BABCDAA","CCBABDE"],"planned":[[17,24],[30,37]],"insight":"Adjacent stones reward focused attacks and a timed Awakening Pulse.","primary":"Stone chain preparation","secondary":"Four-hit sequencing","sequence":["Attack one stone from the upper approach","Prepare a lower Fusion while the first stone weakens","Use Awakening Pulse to help crack its neighbor"],"detail":"A vertical pair of Sealed Stones constrains the left side of the center."},
 24:{"name":"Festival Gates","rows":["DCBEACC","D-AAE-B","ADEBADC","B-DBD-C","EAECCEB","CEBDBCA","A-ABD-D"],"planned":[[29,36],[33,40]],"insight":"Two separate rocket lanes must be cleared without ignoring the Daruma guards.","primary":"Parallel Hanabi delivery","secondary":"Guardian cleanup","sequence":["Compare the left and right cargo routes","Open one lane and use its upward blast","Complete the second lane and remaining Daruma hits"],"detail":"Paired Hanabi routes have legal lower approaches on both sides of a split center."},
});
function get(index){
 const spec=boards[index]||chapterBoards[index];if(!spec)return null;
 const names=R.activeFamilies(index,index<10?4:5);
 const pattern=spec.rows.join("");
 if(pattern.length!==49)throw Error("Bad authored 7x7 grid at "+(index+1));
 const grid=[...pattern].map((ch,at)=>{
  if(ch==="-")return null;
  const digit="ABCDE".indexOf(ch);
  if(digit<0||digit>=names.length)throw Error("Wrong active family token at "+at);
  return names[digit];
 });
 return A.normalize({version:1,id:"journey-authored-"+(index+1),
  insight:spec.insight,primarySkill:spec.primary,secondarySkill:spec.secondary,
  sequence:spec.sequence,designNotes:spec.detail,
  recipe:D.get(index),opening:{grid,provenance:"hand-authored"}},R);
}
function summary(){
 return Object.keys(boards).map(key=>{const index=Number(key),x=boards[key];
  return {index,level:index+1,name:x.name,insight:x.insight,
   planned:x.planned.map(pair=>pair.slice()),rows:x.rows.slice()};
 });
}
const api=Object.freeze({VERSION,COUNT:Object.keys(boards).length,CHAPTER_COUNT:Object.keys(chapterBoards).length,get,summary,
 chapterSummary:()=>Object.keys(chapterBoards).map(key=>{const x=chapterBoards[key];return {index:Number(key),level:Number(key)+1,name:x.name,rows:x.rows.slice(),planned:x.planned.map(m=>m.slice())};})});
root.HarmonyJourneyAuthoredOpenings=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
