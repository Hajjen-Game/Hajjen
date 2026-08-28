(()=>{
  const build=document.querySelector('.build');
  if(build)build.textContent='V4-B 0.8 · ZONE 2 HORIZONTAL CAMERA';
  const meta=document.querySelector('meta[name="hajjen-build"]');
  if(meta)meta.content='v4-b-prototype-0.8-zone2-horizontal-camera';
  document.title='HAJJEN V4-B – Zone 2 Horizontal Camera Test';

  const objectives=document.querySelector('.objectives');
  if(!objectives||document.querySelector('.zone2-test-entry'))return;

  const panel=document.createElement('section');
  panel.className='panel zone2-test-entry';
  panel.innerHTML='<h2>ZONE 2 TEST</h2><button type="button" class="zone2-enter-btn">ENTER ZONE 2</button><p class="panel-note">Temporary 25 × 10 horizontal scrolling camera prototype.</p>';
  const button=panel.querySelector('.zone2-enter-btn');
  button.style.width='100%';
  button.style.minHeight='42px';
  button.style.fontWeight='900';
  button.addEventListener('click',()=>{location.href='zone2-test.html';});
  objectives.insertAdjacentElement('afterend',panel);
})();
