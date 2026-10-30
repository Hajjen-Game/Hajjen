"use strict";
/* Lotus Stream 1.1 — repeatable diagnostic simulations, NOT player win rates.
 * Run: node daisugi-bloom/tools/lotus-routing-diagnostics.cjs [seedCount] [turnLimit]
 * Deliberately scoped to named diagnostic prototypes on level index 60.
 */
const R=require("../harmony/rules.js"),L=require("../harmony/lotus-routing.js");
const count=Math.min(30,Math.max(1,Number(process.argv[2])||4));
const limit=Math.min(70,Math.max(1,Number(process.argv[3])||12));
const seeds=[135,742,1212,4089,9813,20442,5678,1027,30330,4922];
const report=[];
for(const name of Object.keys(L.prototypes)){
 const samples=[];
 for(let i=0;i<count;i++){
  const seed=seeds[i%seeds.length]+Math.floor(i/seeds.length)*9973;
  const g=new R.Game(60,null,{seed,directorMode:"v4",lotusPrototype:name});
  let turns=0,firstDelivery=null;
  const initial=L.distance(g.board,g.lotus);
  while(turns<limit&&g.moves>0&&!g.complete&&!g.failed){
   const h=R.bestHint(g);
   if(!h)break;
   const old=g.lotusDelivered,done=g.swap(h.from,h.to);
   if(!done.ok)throw Error("Director suggested an illegal move in "+name);
   turns++;
   if(g.lotusDelivered>old&&firstDelivery===null)firstDelivery=turns;
  }
  const remaining=L.distance(g.board,g.lotus);
  if(remaining>initial)throw Error("Cargo moved away from its collection gates");
  samples.push({seed,turns,delivered:g.lotusDelivered,
   total:g.lotus.starts.length,remaining,firstDelivery,complete:g.complete});
 }
 report.push({prototype:name,limit,samples:samples.length,
  completed:samples.filter(x=>x.complete).length,
  anyDelivery:samples.filter(x=>x.delivered>0).length,
  anyDescent:samples.filter(x=>x.remaining<L.get(name).lotus.starts.reduce(
   (sum,at)=>sum+Math.floor((L.get(name).lotus.exits.find(x=>x%7===at%7)-at)/7),0)).length,
  avgDelivered:Number((samples.reduce((s,x)=>s+x.delivered,0)/samples.length).toFixed(2)),
  avgRemaining:Number((samples.reduce((s,x)=>s+x.remaining,0)/samples.length).toFixed(2)),
  runs:samples});
}
console.log(JSON.stringify({label:"Lotus routing prototype diagnostics — not human completion rates",report},null,2));
