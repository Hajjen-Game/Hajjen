// Energy Arena's independent copy of the marble-bag principle already used
// in arena3v3/src/core/MarbleBag.js: a shuffled 100-marble deck is drawn
// without replacement, then refilled. Separate keys avoid mixing spell types.
function shuffle(items,random=Math.random){
  for(let i=items.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
  return items;
}
export class EnergyMarbleBagPool{
  constructor(random=Math.random){this.random=random;this.bags=new Map();}
  drawWeighted(key,weights,size=100){
    const signature=JSON.stringify(weights);
    let stored=this.bags.get(key);
    if(!stored||stored.signature!==signature){
      const entries=Object.entries(weights).filter(([,value])=>value>0);
      if(!entries.length)return "none";
      const raw=entries.map(([name,weight])=>({name,exact:weight*size}));
      const counts=raw.map(item=>({...item,count:Math.floor(item.exact)}));
      let remaining=size-counts.reduce((total,item)=>total+item.count,0);
      counts.sort((a,b)=>(b.exact-b.count)-(a.exact-a.count));
      for(const item of counts){if(remaining<=0)break;item.count++;remaining--;}
      const deck=[];
      for(const item of counts)for(let i=0;i<item.count;i++)deck.push(item.name);
      while(deck.length<size)deck.push(entries[0][0]);
      stored={signature,deck:shuffle(deck,this.random)};
      this.bags.set(key,stored);
    }
    const result=stored.deck.pop();
    if(!stored.deck.length)this.bags.delete(key);
    return result;
  }
  reset(){this.bags.clear();}
}
