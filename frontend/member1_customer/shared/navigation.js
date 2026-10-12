/* EventHub shared portal navigation. Does not touch login tokens or API requests. */
(() => {
  const current = location.pathname.includes('member2_organiser') ? 'organiser'
    : location.pathname.includes('member3_venues') ? 'venues'
    : location.pathname.includes('member4_tickets') ? 'tickets'
    : location.pathname.includes('member1_customer') ? 'customer' : 'home';
  const base = current === 'home' ? './' : '../';
  const links = [
    ['home','Home','index.html'],
    ['customer','Explore Events','member1_customer/index.html'],
    ['organiser','Organiser','member2_organiser/index.html'],
    ['venues','Venues','member3_venues/index.html'],
    ['tickets','My Tickets','member4_tickets/index.html']
  ];
  const roles = {home:'UNIFIED EVENT SYSTEM',customer:'CUSTOMER',organiser:'ORGANISER',venues:'VENUE MANAGER',tickets:'MY BOOKINGS'};
  function render(){
    if(document.getElementById('eventhub-global-nav'))return;
    document.body.classList.add('eventhub-unified');
    document.body.dataset.ehPortal=current;
    const nav=document.createElement('nav');nav.id='eventhub-global-nav';nav.setAttribute('aria-label','EventHub main navigation');
    const logo=document.createElement('a');logo.className='eh-logo';logo.href=base+'index.html';logo.innerHTML='Event<span>Hub.</span>';nav.append(logo);
    const group=document.createElement('div');group.className='eh-links';
    links.forEach(([key,label,path])=>{const a=document.createElement('a');a.href=base+path;a.textContent=label;if(key===current)a.setAttribute('aria-current','page');group.append(a);});
    nav.append(group);
    const tag=document.createElement('span');tag.className='eh-role';tag.textContent=roles[current];nav.append(tag);
    document.body.prepend(nav);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
