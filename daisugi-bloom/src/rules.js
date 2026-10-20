(function () {
  "use strict";
  var N=7, families=["sakura","verdant","mistbloom","sunleaf"];
  var levels=[
    {name:"First Petals",subtitle:"Få trädgården att vakna",moves:14,goal:{type:"fusion",count:9},par:8,intro:"Skapa nio fusioner. Varje matchning utvecklar en växt; försök att få en blomma på köpet."},
    {name:"Growing Together",subtitle:"Odla din första buske",moves:20,goal:{type:"stage",stage:4,count:11},par:12,intro:"Bygg upp en blomma och utveckla den vidare till buske. Växter i samma familj kan matchas oavsett stadium."},
    {name:"The First Bloom",subtitle:"Ditt första riktiga träd",moves:25,goal:{type:"trees",count:3},par:16,intro:"Nu börjar du med frön och några groddar. Odla själv fram en buske till ett träd och se den första pulsen."},
    {name:"Ripple Grove",subtitle:"Bygg din egen kedjereaktion",moves:35,goal:{type:"chain",count:2,trees:4},par:23,intro:"Placera och utveckla buskar nära varandra. Skapa sedan två träd i en sammanhängande Bloom Pulse-kedja."},
    {name:"Nature's Gift",subtitle:"Strategi med Power Move",moves:31,goal:{type:"powerTrees",count:5},par:20,intro:"Du börjar med en gratis Power Move, men behöver bygga upp dina träd. Använd fröplaceringen när den gör verklig nytta."}
  ];
  function rng(seed) {return function(){seed|=0;seed=(seed+0x6D2B79F5)|0;var t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
  function cell(family,stage,id) {return {family:family,stage:stage||1,id:id};}
  function coords(i) {return {r:Math.floor(i/N),c:i%N};}
  function neighbors(i) {var r=Math.floor(i/N),c=i%N,out=[];if(r>0)out.push(i-N);if(c<N-1)out.push(i+1);if(r<N-1)out.push(i+N);if(c>0)out.push(i-1);return out;}
  function adjacent(a,b) {return neighbors(a).indexOf(b)!==-1;}
  function clone(board) {return board.map(function(v){return v?Object.assign({},v):null;});}
  function scan(board) {
    var lines=[];
    for(var r=0;r<N;r++){var c=0;while(c<N){var f=board[r*N+c]&&board[r*N+c].family,e=c+1;while(f&&e<N&&board[r*N+e]&&board[r*N+e].family===f)e++;if(f&&e-c>=3){var row=[];for(var x=c;x<e;x++)row.push(r*N+x);lines.push(row);}c=e;}}
    for(var col=0;col<N;col++){var y=0;while(y<N){var g=board[y*N+col]&&board[y*N+col].family,z=y+1;while(g&&z<N&&board[z*N+col]&&board[z*N+col].family===g)z++;if(g&&z-y>=3){var column=[];for(var j=y;j<z;j++)column.push(j*N+col);lines.push(column);}y=z;}}
    var groups=[];
    lines.forEach(function(line){var merged=line.slice(),rest=[];groups.forEach(function(g){if(g.some(function(i){return merged.indexOf(i)!==-1;})){g.forEach(function(i){if(merged.indexOf(i)===-1)merged.push(i);});}else rest.push(g);});rest.push(merged);groups=rest;});
    var changed=true;while(changed){changed=false;outer:for(var a=0;a<groups.length;a++)for(var b=a+1;b<groups.length;b++)if(groups[a].some(function(i){return groups[b].indexOf(i)!==-1;})){groups[b].forEach(function(i){if(groups[a].indexOf(i)===-1)groups[a].push(i);});groups.splice(b,1);changed=true;break outer;}}
    return groups;
  }
  function wouldMatchAt(board,index,family){
    var row=Math.floor(index/N),col=index%N,patterns=[[0,-1],[0,1],[0,-2],[0,2],[-1,0],[1,0],[-2,0],[2,0]];
    function same(r,c){return r>=0&&r<N&&c>=0&&c<N&&board[r*N+c]&&board[r*N+c].family===family;}
    return (same(row,col-1)&&same(row,col-2))||(same(row,col+1)&&same(row,col+2))||
      (same(row,col-1)&&same(row,col+1))||(same(row-1,col)&&same(row-2,col))||
      (same(row+1,col)&&same(row+2,col))||(same(row-1,col)&&same(row+1,col));
  }
  function hasMove(board){
    for(var i=0;i<49;i++)for(var k=0;k<2;k++){var j=k===0?i+1:i+N;if(k===0&&i%N===N-1||j>=49||!board[i]||!board[j])continue;var a=board[i],b=board[j];if(a.family===b.family)continue;board[i]=b;board[j]=a;var good=scan(board).some(function(gr){return gr.indexOf(i)>=0||gr.indexOf(j)>=0;});board[i]=a;board[j]=b;if(good)return true;}
    return false;
  }
  function startBoard(level,random) {
    // 1.1: Real level setups, not pre-completed demo chains. Only seeds
    // fall during play; later introductory levels may start with modest
    // growth, never a ready-to-harvest bush.
    var id=1,board=[];
    for(var i=0;i<49;i++){
      var banned=[],r=Math.floor(i/N),c=i%N;
      if(c>=2&&board[i-1].family===board[i-2].family)banned.push(board[i-1].family);
      if(r>=2&&board[i-N].family===board[i-2*N].family)banned.push(board[i-N].family);
      var options=families.filter(function(f){return banned.indexOf(f)<0;});
      board.push(cell(options[Math.floor(random()*options.length)],1,id++));
    }
    // No stage 4 bushes or ready-made one-swap Bloom Pulse solutions.
    // A few isolated starters keep the first tree within reach without
    // allowing a one-move level clear.
    var starterGroups=[
      [],
      [{i:24,s:2}],
      [{i:24,s:2},{i:8,s:2}],
      [{i:17,s:3},{i:31,s:3},{i:38,s:2}],
      [{i:17,s:3},{i:31,s:3},{i:10,s:2}]
    ];
    starterGroups[level].forEach(function(p){board[p.i].stage=p.s;});
    // If a generated layout lacks a swap, regenerate via a tiny intentional
    // near-match, without creating an existing three-in-a-row.
    if(!hasMove(board)){
      board[23].family="sakura";board[24].family="sakura";
      board[25].family="verdant";board[18].family="sakura";
    }
    return board;
  }
  function Game(index,data) {
    this.level=Math.max(0,Math.min(levels.length-1,index||0));this.config=levels[this.level];
    this.seed=(Date.now()+this.level*43321)>>>0;this.random=rng(this.seed);
    this.nextId=50;this.board=startBoard(this.level,this.random);
    this.moves=this.config.moves;this.energy=0;this.powers=this.level===4?1:0;
    this.trees=0;this.essence=0;this.fusions=0;this.powerUsed=false;this.maxStage=Math.max.apply(null,this.board.map(function(p){return p.stage;}));this.bestChain=0;this.familyTrees={};this.complete=false;this.failed=false;
    if(data){Object.keys(data).forEach(function(k){if(k!=="random"&&k!=="config"&&k!=="level")this[k]=data[k];},this);this.config=levels[this.level];this.random=rng(this.seed+(data.rolls||0));}
    this.rolls=0;
  }
  Game.prototype.fresh=function(){var v=this.random();this.rolls++;return v;};
  Game.prototype.frame=function(type,extra){return Object.assign({type:type,board:clone(this.board),moves:this.moves,energy:this.energy,powers:this.powers,trees:this.trees,essence:this.essence,fusions:this.fusions,maxStage:this.maxStage,goal:this.progress()},extra||{});};
  Game.prototype.progress=function(){var g=this.config.goal;if(g.type==="fusion")return Math.min(this.fusions,g.count);if(g.type==="stage")return g.count?Math.min(this.fusions,g.count):Math.min(this.maxStage,g.stage);if(g.type==="trees")return this.trees;if(g.type==="chain")return this.bestChain;if(g.type==="powerTrees")return this.powerUsed?this.trees:0;return 0;};
  Game.prototype.goalText=function(){var g=this.config.goal;if(g.type==="fusion")return "Skapa "+g.count+" fusioner";if(g.type==="stage")return g.count?"Skapa "+g.count+" fusioner och odla en buske":"Utveckla till "+(["","frö","grodd","blomma","buske","träd"][g.stage]);if(g.type==="trees")return "Skapa "+g.count+" träd";if(g.type==="chain")return "Gör en pulskedja på "+g.count+" träd och skörda "+g.trees+" totalt";return "Använd Power Move och skapa "+g.count+" träd";};
  Game.prototype.target=function(){return this.config.goal.count||this.config.goal.stage;};
  Game.prototype.fulfilled=function(){var g=this.config.goal;return this.progress()>=this.target() && (g.type!=="stage"||this.maxStage>=g.stage) && (g.type!=="chain"||this.trees>=g.trees);};
  Game.prototype.stars=function(){if(!this.complete)return 0;var used=this.config.moves-this.moves,par=this.config.par||this.config.moves*.6;return used<=par?3:used<=par+4?2:1;};
  Game.prototype.save=function(){return {board:clone(this.board),moves:this.moves,energy:this.energy,powers:this.powers,trees:this.trees,essence:this.essence,fusions:this.fusions,powerUsed:this.powerUsed,maxStage:this.maxStage,bestChain:this.bestChain,familyTrees:this.familyTrees,complete:this.complete,failed:this.failed,seed:this.seed,nextId:this.nextId,rolls:this.rolls};};
  Game.prototype.charge=function(amount){if(this.powers>=1){this.energy=Math.min(99,this.energy+amount);return;}this.energy+=amount;if(this.energy>=100){this.energy=0;this.powers=1;}};
  Game.prototype.resolve=function(noEnergy,preferred) {
    var events=[],turns=0,self=this;
    while(turns++<45){
      var groups=scan(this.board);if(!groups.length)break;
      var allTree=[],fusionRecords=[],totalCharge=0;
      groups.forEach(function(indices){
        var ranked=indices.slice().sort(function(a,b){var d=self.board[b].stage-self.board[a].stage;if(d)return d;if(preferred===a)return -1;if(preferred===b)return 1;var center=indices.reduce(function(acc,i){return acc+i;},0)/indices.length;return Math.abs(a-center)-Math.abs(b-center)||a-b;});
        var survivor=ranked[0],plant=self.board[survivor],before=plant.stage,removed=indices.filter(function(i){return i!==survivor;});
        removed.forEach(function(i){self.board[i]=null;});
        plant.stage=Math.min(5,plant.stage+1);
        self.maxStage=Math.max(self.maxStage,plant.stage);
        if(plant.stage===5)allTree.push(survivor);
        fusionRecords.push({at:survivor,from:before,to:plant.stage,removed:removed,number:indices.length,family:plant.family});
        self.fusions++;
        totalCharge+=indices.length===3?22:indices.length===4?38:52;
      });
      if(!noEnergy)this.charge(totalCharge+(turns-1)*8);
      events.push(this.frame("fusion",{groups:fusionRecords,combo:turns,charge:noEnergy?0:totalCharge}));
      if(allTree.length){
        var pulseHit=new Set(),pulsed=new Set(),wave=allTree.slice(),allMade=new Set(allTree),waveNumber=0;
        while(wave.length&&waveNumber++<49){
          var targets=[],born=[],sources=wave.slice();
          wave.forEach(function(i){if(pulsed.has(i))return;pulsed.add(i);neighbors(i).forEach(function(j){if(pulseHit.has(j)||!self.board[j]||self.board[j].stage>=5)return;pulseHit.add(j);self.board[j].stage+=1;self.maxStage=Math.max(self.maxStage,self.board[j].stage);targets.push({from:i,to:j,stage:self.board[j].stage});if(self.board[j].stage===5){born.push(j);allMade.add(j);}});});
          if(targets.length)events.push(this.frame("pulse",{sources:sources,targets:targets,wave:waveNumber}));
          wave=Array.from(new Set(born));
        }
        var harvested=Array.from(allMade);
        harvested.forEach(function(i){var p=self.board[i];if(!p||p.stage!==5)return;self.familyTrees[p.family]=(self.familyTrees[p.family]||0)+1;self.board[i]=null;self.trees++;self.essence+=30;});
        self.bestChain=Math.max(self.bestChain,harvested.length);
        events.push(this.frame("harvest",{positions:harvested,chain:harvested.length}));
      }
      // Gravity preserves the evolved plants. New seeds are selected with
      // a soft cascade governor: occasional natural matches still happen,
      // but a single swap should not routinely solve half a level via luck.
      for(var c=0;c<N;c++){
        var existing=[];
        for(var row=N-1;row>=0;row--)if(this.board[row*N+c])existing.push(this.board[row*N+c]);
        for(var rr=N-1;rr>=0;rr--)this.board[rr*N+c]=existing[N-1-rr]||null;
      }
      for(var row2=0;row2<N;row2++)for(var col2=0;col2<N;col2++){
        var at=row2*N+col2;
        if(this.board[at])continue;
        var randomFamily=families[Math.floor(this.fresh()*4)];
        var chosen=randomFamily;
        if(wouldMatchAt(this.board,at,chosen)&&this.fresh()<.77){
          var safe=families.filter(function(f){return !wouldMatchAt(this.board,at,f);},this);
          if(safe.length)chosen=safe[Math.floor(this.fresh()*safe.length)];
        }
        this.board[at]=cell(chosen,1,this.nextId++);
      }
      events.push(this.frame("fall",{round:turns}));
      preferred=-1;
    }
    if(turns>=45)events.push(this.frame("limit",{message:"Kaskadgräns nådd"}));
    if(!hasMove(this.board)&&!this.fulfilled()){
      var seedCells=[];this.board.forEach(function(p,i){if(p&&p.stage===1)seedCells.push(i);});
      for(var attempt=0;attempt<90&&!hasMove(this.board);attempt++){for(var q=seedCells.length-1;q>0;q--){var k=Math.floor(this.fresh()*(q+1)),a=seedCells[q],b=seedCells[k],fam=this.board[a].family;this.board[a].family=this.board[b].family;this.board[b].family=fam;}}
      if(!hasMove(this.board)){
        var safe=[23,24,25,17];if(safe.every(function(i){return self.board[i]&&self.board[i].stage===1;})){this.board[23].family="sakura";this.board[24].family="sakura";this.board[25].family="verdant";this.board[17].family="sakura";}
      }
      events.push(this.frame("shuffle"));
    }
    if(this.fulfilled()){this.complete=true;events.push(this.frame("win",{stars:this.stars()}));}
    else if(this.moves<=0){this.failed=true;events.push(this.frame("lose"));}
    return events;
  };
  Game.prototype.swap=function(a,b){
    if(this.complete||this.failed)return {ok:false,reason:"Nivån är avslutad"};
    if(!adjacent(a,b)||!this.board[a]||!this.board[b])return {ok:false,reason:"Välj två intilliggande växter"};
    var p=this.board[a];this.board[a]=this.board[b];this.board[b]=p;
    var matches=scan(this.board).filter(function(group){return group.indexOf(a)>=0||group.indexOf(b)>=0;});
    if(!matches.length){this.board[b]=this.board[a];this.board[a]=p;return {ok:false,reason:"Skapa minst tre av samma naturfamilj"};}
    this.moves--;var events=[this.frame("swap",{from:a,to:b})].concat(this.resolve(false,b));return {ok:true,events:events};
  };
  Game.prototype.power=function(i,family){
    if(this.complete||this.failed)return {ok:false,reason:"Nivån är avslutad"};
    if(this.powers<1||families.indexOf(family)<0||i<0||i>=49)return {ok:false,reason:"Ingen Power Move tillgänglig"};
    var replaced=this.board[i];this.board[i]=cell(family,1,this.nextId++);this.powers--;this.powerUsed=true;
    var events=[this.frame("power",{at:i,family:family,replaced:replaced})].concat(this.resolve(true,i));
    return {ok:true,events:events};
  };
  window.DaisugiRules={Game:Game,levels:levels,families:families,scan:scan,hasMove:hasMove,neighbors:neighbors,coords:coords};
})();