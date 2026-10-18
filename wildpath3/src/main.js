// Wildpath 3.0 first playable. No side effects in Wildpath 2.x.
import {Wildpath3Game} from './game.js?v=3.0.3-visual-clarity';
const $=id=>document.getElementById(id);
if(!window.BABYLON){
  $('intro').hidden=true;
  $('loadError').hidden=false;
}else{
  try{
    const game=new Wildpath3Game();
    if(new URLSearchParams(location.search).has('debug')){
      window.__wildpath3=Object.freeze({
        read:()=>({
          state:game.state,wave:game.wave??0,kills:game.kills??0,
          hp:game.hp??0,score:game.score?.total??0,
          combo:game.score?.combo??0,arenaRadius:17.5,cameraWidth:18.5,
          autoSpells:['Water Dart','Tidal Pulse','Auto Renewal'],
          enemyCount:game.enemies.filter(e=>e.alive).length,
          nature:game.nature.snapshot(),seeds:game.seedCount??0
        })
      });
    }
  }catch(error){
    console.error('Wildpath 3.0 boot failure:',error);
    $('intro').hidden=true;
    const panel=$('loadError');panel.hidden=false;
    panel.querySelector('p').textContent='Could not start Wildpath 3.0. Please reload or check your browser.';
  }
}
