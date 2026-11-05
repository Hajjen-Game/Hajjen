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
  name:"A centered two-decision Hanabi introduction",
  rows:["CBCBDCA","DACBCAA","BCDADDB","ACADDBC","BDB-BAD","CDAABBD","CBC-DDC"],
  insight:"The first rocket sits right above its crate in the middle column",primary:"Hanabi delivery route",secondary:"Destination-controlled Fusion",
  sequence:["Find the centered rocket and the crate directly below it","Prepare the nearby match with a first Fusion","Make the second Fusion to launch Hanabi down the middle"],
  planned:[[32,33],[32,39]],
  detail:"The original two-decision tutorial translated into the central column. Two authentic swaps still deliver the firework."
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
 35:{"name":"Festival Sentinels","rows":["DACBDAE","DDCBEBB","ECA-BDE","AE-C-BB","EEC-ECA","ACECDDA","CDAADBB"],"planned":[[15,16],[30,37]],"insight":"An attack from either flank can strike a Stone and Daruma together.","primary":"Shared multi-obstacle hits","secondary":"Stone timing over Daruma","sequence":["Spot the two side approaches to the guardians","Use a shared hit to advance two different blockers","Prioritize Stones while finishing both Daruma"],"detail":"Stone and Daruma form a diamond around the center; attacking its flanks hits two obstacles."},
 36:{"name":"Firework Spiral","rows":["DABECBA","E-ADB-C","ABAACDD","EEB-ECC","E-ACA-C","DBDDEBD","C-ADE-B"],"planned":[[23,30],[35,36]],"insight":"Hanabi lines connect outer stones while the central stone requires local work.","primary":"Three-way Stone prioritization","secondary":"Hanabi sequencing","sequence":["Develop an adjacent Fusion for the center stone","Open the left launch path and watch its vertical pulse","Finish the second launch after weakening the remaining stones"],"detail":"The center stone sits outside both Hanabi columns; a rocket cannot solve it alone."},
 37:{"name":"Garden of Pulses","rows":["EEABECC","DEBEBBD","DC--AAE","BE--CDB","CDEAABB","DCACAED","CEADDBC"],"planned":[[15,22],[18,25]],"insight":"A four-stone cluster releases overlapping Awakening Pulses once the first stone breaks.","primary":"Stone cluster entry","secondary":"Pulse cascade control","sequence":["Work from the open sides rather than the blocked center","Focus one stone until its Awakening Pulse triggers","Use the new spaces to finish the cluster"],"detail":"A compact 2×2 Stone mass requires a deliberate entry from two sides."},
 38:{"name":"Wind Before Dawn","rows":["EABAEBC","CAAEDCD","DBB-CBB","ABD-DED","CAB-AEB","DEAEEAC","DCDCEAC"],"planned":[[22,23],[3,10]],"insight":"Wind can break a planned Fusion route while a vertical stone wall blocks the center.","primary":"Wind-step prediction","secondary":"Stone versus Masterpiece choices","sequence":["Read the next upper Wind shift before starting the central attack","Strike the stone corridor through a side landing","Develop the required Masterpiece without losing Stone momentum"],"detail":"Two moving rows run around an immovable three-Stone wall."},
 39:{"name":"Sealed Garden Finale","rows":["CABBDBE","C-EBB-E","BC-C-AD","EADEDBA","A-ADD-B","CACCADC","E-EDE-C"],"planned":[[2,9],[35,36]],"insight":"Two spaced Hanabi routes and four stones create a long-range awakening finale.","primary":"Festival finale target order","secondary":"Delayed Hanabi releases","sequence":["Weaken the upper Stone pair before launching","Guide the first rocket through its vertical lane","Exploit the Awakening chain and finish the second crate"],"detail":"Two upper stones guard the rockets; two inner stones create a second Awakening network."},
 30:{"name":"Stone Garden","rows":["ABDDAEA","ADEDBCC","BC-ADEC","DDE-BEB","ECCE-BC","EABBDEA","ADCCBDA"],"planned":[[17,18],[39,46]],"insight":"A diagonal trio makes it profitable to break the middle stone before the edge.","primary":"Diagonal Stone pressure","secondary":"Falling lane repair","sequence":["Recognize the stepped Stone formation","Focus an upper flank to weaken the center","Use the lower setup to continue the Awakening chain"],"detail":"Three diagonal stones link through eight-direction Awakening Pulse."},
 31:{"name":"First Echo","rows":["BADBBAC","DDCDECB","EC-E-BE","EDE-EAA","CD-EAAB","BBCADDC","CCEACBA"],"planned":[[2,9],[31,38]],"insight":"Diagonal Awakening connects stones that ordinary Fusion cannot strike together.","primary":"Eight-neighbor Stone cascade","secondary":"Top-down target priority","sequence":["Probe the upper bridge without trapping the center","Bring the lower match toward the fourth stone","Break the central stone when neighboring stones are damaged"],"detail":"Four separated stones surround an open socket; chain attacks, not immediate direct matches, unlock it."},
 32:{"name":"Wind Carved","rows":["CCDBCAC","BAEADDA","ECEDEAE","EEA-ECE","BBD-AAB","DCBCBDB","DDCBBDA"],"planned":[[22,23],[30,37]],"insight":"Two Wind rows change the approaches to vertically paired stones.","primary":"Wind-to-Stone alignment","secondary":"Four-object match timing","sequence":["Control the gust schedule on both marked rows","Use a side Fusion to crack the upper stone","Preserve a four-object opportunity while working the lower flank"],"detail":"Stones divide a central column while upper and lower wind shifts alter alignment."},
 33:{"name":"Hanabi Awakening","rows":["EBEEDAE","A-CAE-D","BCBCCBE","CBDEEDB","E-BBD-C","CBDAADA","A-CAD-C"],"planned":[[15,22],[40,41]],"insight":"The two launch columns pass through stone pressure points at the top of the board.","primary":"Firework-to-Stone timing","secondary":"Asymmetric first approach","sequence":["Soften a stone through its accessible left flank","Open the other rocket lane before committing the first launch","Use both Hanabi pulses against the stone pair"],"detail":"Both stones sit above their respective rocket columns; each launch pulse contributes one earned hit."},
 34:{"name":"Sealed Bridge","rows":["ECDDBAA","CAEDBAD","BEDEDCE","EA---BB","ACCDBAA","ECECBCE","DDBACAB"],"planned":[[17,18],[31,38]],"insight":"Three stones form a solid central bridge; upper and lower Fusions provide pressure.","primary":"Stone bridge sequencing","secondary":"Two-sided approach","sequence":["Find a route to hit the middle stone from above","Prepare the lower route before gravity rearranges it","Break one section to release Awakening Pulse into the others"],"detail":"Three adjacent fixed stones create a wide central barrier; there is no ordinary Fusion through the bridge."},
 25:{"name":"Windward Shrine","rows":["ABDEEBC","DEDCDDA","ACBBDEA","ACE-CDE","CDDC-AC","EABBCBB","EEADBAA"],"planned":[[25,26],[39,46]],"insight":"The upper wind row and a bottom approach provide different attacks on the stones.","primary":"Wind-supported Stone pressure","secondary":"Alternating approach routes","sequence":["Read the gust before committing the upper match","Break the first stone from its open flank","Use a lower approach to finish the second"],"detail":"Stones stagger from center to lower-right; marked wind runs above both."},
 26:{"name":"Hanabi Triad","rows":["ACACBAA","D-BBECE","AABEB-A","DDC-CDC","ABABACE","EAEDCEA","E-E-B-A"],"planned":[[10,17],[26,33],[29,36]],"insight":"All three rockets require distinct clearing routes: left on row 2, right on row 3, center on row 4. Initial Fusions work toward the outer lanes and the upper center without opening an immediate launch.","primary":"Three-lane Hanabi planning","secondary":"Build a Masterpiece while maintaining rocket access","sequence":["Compare the three staggered rockets and choose which route to build first","Use the right or left route Fusion while preserving the middle-column setup","Move the middle rocket toward its crate using a planned series of matches","Finish all three rockets and create the required Masterpiece"],"detail":"Three staggered cargo starts [8,19,24], their crates [43,45,47]. New fixed hand-authored 7×7 opening: the center rocket has no initial Fusion through the two squares below it. Three genuine first decisions [10,17], [26,33], [29,36]."},
 27:{"name":"Awakening Circle","rows":["DEECDAA","AABEDBB","BD--BEA","BBD-DEE","AAB--DD","ACBBADC","CCECECE"],"planned":[[22,23],[18,25]],"insight":"The new lower-right two-stone tail forms a five-stone Awakening cluster. A focused break can propagate hits instead of demanding twenty separate direct Fusions.","primary":"Five-stone Awakening chain","secondary":"Preserve both legal flank entrances","sequence":["Use either of the two original flank Fusions to prepare the center","Focus the reachable upper or central stone instead of spreading attacks","Exploit an Awakening Pulse to weaken the two new stones in row five","Finish the remaining seals through newly opened board space"],"detail":"Five fixed Sealed Stones at indices 16,17,24,31,32 (row 3 columns 3–4; row 4 column 4; row 5 columns 4–5). Both prior purposeful openings [22,23] and [18,25] remain legal, with no free automatic matches."},
 28:{"name":"Guardian Wind","rows":["CAAEBCB","EDBECDC","BAB-ACD","ECA-EAE","CCB-CDB","EDDADEC","DBEDBAA"],"planned":[[23,30],[38,45]],"insight":"The guardian column blocks ordinary travel; two Wind rows shift the approach.","primary":"Daruma corridor control","secondary":"Gust cycle prediction","sequence":["Prepare an approach from beside the guardian column","Watch both scheduled shifts before targeting the middle doll","Finish upper and lower Daruma with separate pressure"],"detail":"Three Daruma stack vertically; wind sweeps around rather than through fixed guardians."},
 29:{"name":"Festival Trials Finale","rows":["CBABDBA","EDDEDAE","A-B-B-A","EDDEDDC","C-CDA-E","CECCACD","E-BBE-B"],"planned":[[24,31],[35,36]],"insight":"The center seal needs a direct Fusion; both outer stones can be struck by Hanabi blasts in their own columns.","primary":"Stone-Hanabi timing","secondary":"Central Fusion route","sequence":["Use the accessible center approach to weaken the middle Stone","Open the left rocket lane and trigger its upward pulse","Plan the right launch and develop the required Masterpiece"],"detail":"Three Stones guard the center and the two exact rocket columns; a central Fusion and a cargo-lane Fusion are verified opening choices."},
 20:{"name":"Guardian Crossroads","rows":["AEBBCCB","CEDEDEE","AAE-ABE","ADDEDCB","CBB-DAA","DAADBCB","ECDACBC"],"planned":[[24,25],[38,45]],"insight":"A center Fusion can strike the upper and lower guardians together.","primary":"Two-target Daruma approach","secondary":"Choose the landing square","sequence":["Spot the center approach between the guardians","Use the shared attack before the lower route shifts","Finish the two-hit Daruma separately"],"detail":"The upper and lower Daruma form a vertical corridor; center and lower flank are intentional opening routes."},
 21:{"name":"Lantern Route","rows":["ABBDECB","ABD-CDD","DDBCBDE","AEC-ACA","DEEBECC","ACCEDAB","BAA-EDC"],"planned":[[31,38],[8,9]],"insight":"The rocket route and the upper guardian demand different Fusion positions.","primary":"Hanabi lane planning","secondary":"Daruma two-hit timing","sequence":["Inspect the rocket below the upper guardian","Create a Fusion under the rocket without losing the flank","Return to the guardian after launching"],"detail":"One opening targets the crate lane; a second approach hits the off-route Daruma."},
 22:{"name":"Two Winds","rows":["BEDCECD","DABACDA","AADCAEB","DCEBABD","EAEEBEC","DBCBEBD","CDCAEDC"],"planned":[[10,11],[31,32]],"insight":"Two wind rows offer competing tactical moves before the next gust.","primary":"Alternating Wind timing","secondary":"Four-match preparation","sequence":["Read which wind row moves first","Preserve the second-row match for the next cycle","Develop a Masterpiece while earning four-object turns"],"detail":"Each marked wind row starts with a distinct legal Fusion route."},
 23:{"name":"Sealed Heart","rows":["DEDECAE","DEDECBD","ABC-ABB","DCD-DDE","BACEAAC","BABCADA","CCBABDE"],"planned":[[16,23],[18,25]],"insight":"Two central stones form a real bottleneck: the left opening attacks the upper stone, the right opening attacks the lower stone.","primary":"Two-sided approach to the center","secondary":"Awakening Pulse target order","sequence":["Compare the legal Fusion approaches on either side of the stone column","Use a destination beside the upper or lower stone to begin cracking it","Concentrate hits to trigger Awakening Pulse against the neighboring stone"],"detail":"Both stones sit in the center column at 17 and 24. Eight legal openings, including separate targeted Fusions at destinations 16 and 25; no automatic starting matches."},
 24:{"name":"Festival Gates","rows":["DCBEACC","D-AAEBB","A-EBA-C","BBDBD-C","EAECCEB","CEBDBCA","A-ABD-D"],"planned":[[29,36],[33,40]],"insight":"Uneven Hanabi heights require a deliberate choice: start clearing the longer left route or earn an earlier launch on the right.","primary":"Asymmetric two-column Hanabi delivery","secondary":"Daruma timing and Fusion destination","sequence":["Compare the stepped Daruma and rocket positions: the left cargo path is longer","Open a real Fusion below either rocket while preserving the other setup","Use the first launch to weaken a guardian, then finish both Daruma and the remaining rocket"],"detail":"The left Daruma is at row 2 and rocket at row 3; the right Daruma at row 3 and rocket at row 4 (1-based). Both crates stay aligned. The two existing legal lower-lane opening swaps remain available, but the full-length delivery routes are unequal."},
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
