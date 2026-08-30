(()=>{
  // Zone 1 presentation polish only. No gameplay/balance values are changed here.

  // ------------------------------------------------------------
  // SUPPRESSED SPAWN VISUAL GUARD
  //
  // The Zone 1 balance guard can cancel a spawn at materialization time
  // (for example when two delayed spawn requests resolve on the same step).
  // The core briefly renders the cancelled entity before the balance guard's
  // microtask removes it. Mark that exact tile before renderBoard() runs so a
  // cancelled mob can never flash on screen.
  // ------------------------------------------------------------
  const spawnStyle=document.createElement('style');
  spawnStyle.textContent=`
    .tile[data-suppress-spawn-render="1"]{
      --tile-overlay:linear-gradient(rgba(255,255,255,.035),rgba(255,255,255,.035))!important;
      background-color:var(--board-sage-light)!important;
      color:inherit!important;
      opacity:1!important;
      filter:none!important;
      box-shadow:none!important;
    }
    .tile[data-suppress-spawn-render="1"]:nth-child(even){background-color:var(--board-sage-dark)!important}
    .tile[data-suppress-spawn-render="1"]::after{content:none!important;display:none!important;animation:none!important}
  `;
  document.head.appendChild(spawnStyle);

  const previousMapSet=Map.prototype.set;
  Map.prototype.set=function(key,value){
    const result=previousMapSet.call(this,key,value);
    if(value?.spawned&&(value.type==='mob'||value.type==='elite')){
      const stored=this.get(key);
      if(stored?.suppressedSpawn){
        const tile=document.querySelector(`.tile[data-r="${stored.r}"][data-c="${stored.c}"]`);
        if(tile){
          tile.setAttribute('data-suppress-spawn-render','1');
          queueMicrotask(()=>tile.removeAttribute('data-suppress-spawn-render'));
        }
      }
    }
    return result;
  };

  // ------------------------------------------------------------
  // ZONE 1 WELCOME / INSTRUCTIONS
  // ------------------------------------------------------------
  const welcome=document.createElement('div');
  welcome.id='hajjenWelcomeModal';
  welcome.className='modal show hajjen-welcome-modal';
  welcome.setAttribute('role','dialog');
  welcome.setAttribute('aria-modal','true');
  welcome.setAttribute('aria-labelledby','hajjenWelcomeTitle');
  welcome.innerHTML=`
    <div class="modal-card hajjen-welcome-card">
      <div class="modal-kicker">WELCOME</div>
      <h2 id="hajjenWelcomeTitle">Welcome! This is HAJJEN!</h2>
      <p>Other games might start by asking you to defeat a few harmless mobs and call it a tutorial.</p>
      <p class="hajjen-welcome-punch"><strong>Not here.</strong></p>
      <p>From the very first zone, you'll need to explore, collect ingredients, create spells, manage <strong>Danger</strong>, and decide when a fight is actually worth taking.</p>
      <p>Level-ups restore your HP, enemies get stronger as Danger rises, and rushing the boss is an excellent way to become shark food.</p>
      <p class="hajjen-welcome-plan"><strong>Plan your route. Use what you find. Pick your fights.</strong></p>
      <p>Good luck, Sharkan. You'll probably need it.</p>
      <div class="hajjen-welcome-actions"><button id="hajjenWelcomeReady" type="button">I'M READY</button></div>
    </div>`;

  const welcomeStyle=document.createElement('style');
  welcomeStyle.textContent=`
    .hajjen-welcome-modal{z-index:120;background:rgba(247,247,244,.96)}
    .hajjen-welcome-card{width:min(620px,94vw);padding:24px 26px}
    .hajjen-welcome-card h2{font-size:24px;margin:4px 0 14px}
    .hajjen-welcome-card p{font-size:13px;line-height:1.48;margin:10px 0;color:#2d2d2d}
    .hajjen-welcome-card .hajjen-welcome-punch{font-size:16px;margin:13px 0}
    .hajjen-welcome-card .hajjen-welcome-plan{border-left:4px solid var(--green);padding:7px 10px;background:var(--green-soft);color:#172414}
    .hajjen-welcome-actions{display:flex;justify-content:flex-end;margin-top:17px}
    .hajjen-welcome-actions button{min-width:138px;padding:9px 14px;font-size:12px;font-weight:900;border-color:var(--green);background:var(--green-soft)}
    body.hajjen-welcome-open{overflow:hidden}
    @media(max-width:560px){
      .hajjen-welcome-card{padding:19px 18px}
      .hajjen-welcome-card h2{font-size:20px}
      .hajjen-welcome-card p{font-size:12px;line-height:1.42;margin:8px 0}
      .hajjen-welcome-actions button{width:100%}
    }
  `;
  document.head.appendChild(welcomeStyle);
  document.body.appendChild(welcome);
  document.body.classList.add('hajjen-welcome-open');

  let welcomeOpen=true;
  const ready=document.getElementById('hajjenWelcomeReady');
  const movementKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D']);
  const blockMovement=e=>{
    if(!welcomeOpen||!movementKeys.has(e.key))return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  document.addEventListener('keydown',blockMovement,true);

  function closeWelcome(){
    if(!welcomeOpen)return;
    welcomeOpen=false;
    welcome.classList.remove('show');
    document.body.classList.remove('hajjen-welcome-open');
    document.removeEventListener('keydown',blockMovement,true);
    setTimeout(()=>welcome.remove(),0);
  }
  ready?.addEventListener('click',closeWelcome);
  setTimeout(()=>ready?.focus(),0);
})();
