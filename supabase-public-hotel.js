/* JUST SAY: public hotel page backed by Supabase. This replaces the old localStorage-only hotel lookup. */
(async function(){
  const root=document.getElementById('hotel-page'); if(!root) return;
  const cfg=window.JUST_SAY_DB; const slug=new URLSearchParams(location.search).get('hotel');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
  const status=document.getElementById('supabase-connection-status');
  if(!slug){root.innerHTML='<section class="panel"><h2>Hotel link is incomplete</h2><p>This QR/link does not include a hotel slug.</p><a class="btn" href="index.html">Back to JUST SAY</a></section>';return;}
  if(!cfg?.client){root.innerHTML='<section class="panel"><h2>Website setup incomplete</h2><p>Supabase is not configured. The administrator must add the Supabase publishable key in <code>supabase-config.js</code>.</p></section>';return;}
  root.innerHTML='<section class="panel"><h2>Loading hotel…</h2><p>Please wait while we retrieve the latest hotel profile.</p></section>';
  try{
    const db=cfg.client;
    const {data:h,error}=await db.from('hotels').select('*').eq('slug',slug).eq('is_active',true).maybeSingle();
    if(error) throw error;
    if(!h){root.innerHTML='<section class="panel"><h2>Hotel not found</h2><p>No published hotel matches <b>'+esc(slug)+'</b>. Check the QR link and ensure the hotel is published in Super Admin.</p><a class="btn" href="index.html">Back to hotels</a></section>';return;}
    const {data:items,error:menuError}=await db.from('menu_items').select('*').eq('hotel_id',h.id).eq('is_available',true).order('category').order('name');
    if(menuError) throw menuError;
    const menu=items||[]; const wa=String(h.whatsapp_number||h.whatsapp||'').replace(/\D/g,'');
    const groups={}; menu.forEach(m=>(groups[m.category||'Menu']??=[]).push(m));
    root.innerHTML=`<section class="hero"><span class="tag">JUST SAY PARTNER</span><h1>${esc(h.name)}</h1><p class="muted">${esc(h.description||'')}<br>${esc(h.address||'')}${h.phone?' · '+esc(h.phone):''}</p><div class="actions"><a class="btn secondary" href="index.html">All hotels</a>${wa?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent('Hello '+h.name+', I found your profile on JUST SAY.')}">Contact on WhatsApp ↗</a>`:''}</div></section><section class="panel"><h2>Menu</h2><p class="muted">Prices and availability are provided by the hotel. Your order is a request until the hotel confirms it.</p>${menu.length?Object.entries(groups).map(([category,rows])=>`<h3>${esc(category)}</h3><div class="grid">${rows.map(m=>`<article class="card"><h3>${esc(m.name)}</h3><p>${esc(m.description||'')}</p><div class="price">${money(m.price)}</div>${wa?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent('Hello '+h.name+', I would like to order: '+m.name+' — '+money(m.price)+'. Please confirm availability.')}">Order via WhatsApp</a>`:''}</article>`).join('')}</div>`).join(''):'<p>No menu items have been published yet. Please contact the hotel directly.</p>'}</section>`;
    if(status){status.textContent='Connected to Supabase · hotel profile loaded';status.className='notice';}
  }catch(e){console.error('JUST SAY hotel page error:',e);root.innerHTML='<section class="panel"><h2>Could not load this hotel</h2><p>The website reached the data-loading step but Supabase returned an error. The administrator should check the hotels/menu_items table names, columns, and public SELECT policies.</p><details><summary>Technical error</summary><code>'+esc(e.message||String(e))+'</code></details><a class="btn" href="index.html">Back to JUST SAY</a></section>';if(status){status.textContent='Hotel data error: '+(e.message||String(e));status.className='warning-box';}}
})();
