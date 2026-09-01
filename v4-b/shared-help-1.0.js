(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG||{};
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const zoneConfig=config.zones?.[zone];
  if(!zone||!zoneConfig)return;

  const modal=document.getElementById('helpModal');
  const openButton=document.querySelector('.help-open');
  if(!modal||!openButton)return;

  const card=modal.querySelector('.modal-card');
  const heading=card?.querySelector('.modal-heading');
  const body=heading?.nextElementSibling;
  if(!card||!heading||!body)return;

  modal.classList.add('shared-help-modal');
  const title=heading.querySelector('h2');
  if(title)title.textContent=config.text?.help||'HELP';

  const copy=document.createElement('div');
  copy.className='help-copy shared-help-copy';

  (zoneConfig.help||[]).forEach(section=>{
    const sectionNode=document.createElement('section');
    sectionNode.className='shared-help-section';

    const sectionTitle=document.createElement('strong');
    sectionTitle.className='shared-help-section-title';
    sectionTitle.textContent=section.title||'';
    sectionNode.appendChild(sectionTitle);

    const list=document.createElement('ul');
    (section.items||[]).forEach(item=>{
      const li=document.createElement('li');
      li.textContent=item;
      list.appendChild(li);
    });
    sectionNode.appendChild(list);
    copy.appendChild(sectionNode);
  });

  body.replaceChildren(copy);
  body.className='shared-help-body';

  window.HAJJEN_SHARED_HELP={
    zone,
    root:modal,
    body,
    content:copy
  };
})();
