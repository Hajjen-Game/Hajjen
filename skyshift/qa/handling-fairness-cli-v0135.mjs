import {writeFileSync} from "node:fs";
import {auditHandlingFairness} from "./handling-fairness-v0135.mjs";
const report=auditHandlingFairness();
const risk=report.stressEnvelope.filter(x=>x.centerlineDemandAboveGrip);
const clean=report.simulatedDriver.filter(x=>x.railContacts===0&&x.reachedExit);
const path="skyshift-fairness-v0135.json";
writeFileSync(path,JSON.stringify(report,null,2));
console.log("SKYSHIFT 0.13.5 REAL COURSE FAIRNESS AUDIT");
console.log("Authored corners:",report.geometry.length,
 "sampled stress cases:",report.stressEnvelope.length,
 "yaw-deficit centerline cases:",risk.length);
console.log("Scripted traces with no rails / exit reached:",clean.length,
 "of",report.simulatedDriver.length);
console.log("Worst margins:",risk.sort((a,b)=>a.authorityMargin-b.authorityMargin)
 .slice(0,8).map(r=>[r.section,"zone",r.zone,"boost",r.boost,
  "ratio",r.authorityMargin].join(" ")).join(" | "));
console.log("JSON ARTIFACT:",path);
