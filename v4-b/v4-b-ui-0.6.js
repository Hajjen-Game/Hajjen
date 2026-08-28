(()=>{
  const build=document.querySelector('.build');
  if(build)build.textContent='V4-B 0.6 · PRIMAL SPRING';
  const meta=document.querySelector('meta[name="hajjen-build"]');
  if(meta)meta.content='v4-b-prototype-0.6-primal-spring';
  document.title='HAJJEN V4-B – Primal Spring';

  const scaling=document.getElementById('scalingText');
  const scalingLabel=scaling?.previousElementSibling;
  if(scalingLabel)scalingLabel.textContent='Enemy power';

  const legend=[...document.querySelectorAll('.legend span')].find(x=>x.textContent.includes('Shrine'));
  if(legend)legend.innerHTML='<i class="legend-dot spring-color">✧</i> Primal Spring';

  const help=document.querySelector('#helpModal .help-copy');
  if(help&&!help.querySelector('[data-primal-spring-help]')){
    const heading=document.createElement('strong');
    heading.textContent='PRIMAL SPRING';
    heading.dataset.primalSpringHelp='true';
    const list=document.createElement('ul');
    list.innerHTML='<li>One Primal Spring appears on the right half of Zone 1.</li><li>Step on it while injured to restore up to 45 HP. It can be used once per run.</li><li>If Sharkan is already at full HP, the Spring remains unused.</li>';
    const manipulation=[...help.querySelectorAll('strong')].find(x=>x.textContent==='MANIPULATION');
    if(manipulation)help.insertBefore(heading,manipulation),help.insertBefore(list,manipulation);
    else help.append(heading,list);
  }
})();
