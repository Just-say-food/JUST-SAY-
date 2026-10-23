/* JUST SAY V5 Supabase admin bridge. Requires supabase-config.js with publishable key and RLS policies from SUPABASE_ADMIN_POLICIES.sql. */
(function(){
  const ready = () => {
    const db = window.JUST_SAY_DB && window.JUST_SAY_DB.client;
    const gate = document.getElementById('admin-auth-gate');
    if (!gate) return;
    const status = document.getElementById('supabase-connection-status');
    const loginBox = document.getElementById('admin-auth-login');
    const setupBox = document.getElementById('admin-auth-setup');
    const verifyBox = document.getElementById('admin-auth-verify');
    const protectedArea = document.getElementById('admin-protected-content');
    const err = document.getElementById('admin-auth-error');
    const showError = (msg) => { err.textContent = msg; err.classList.remove('hidden'); };
    const hideError = () => { err.textContent = ''; err.classList.add('hidden'); };
    if (setupBox) setupBox.classList.add('hidden');
    if (verifyBox) verifyBox.classList.add('hidden');
    if (loginBox) loginBox.classList.remove('hidden');
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.innerHTML = '<label class="field">Admin email<input id="js-supa-email" type="email" required autocomplete="username" placeholder="Your existing Supabase email"></label><label class="field">Password<input id="js-supa-password" type="password" required autocomplete="current-password"></label><button type="submit">Sign in securely</button><p class="small">Use the existing Supabase Auth account. Do not create another admin account.</p>';
      loginForm.onsubmit = async (e) => {
        e.preventDefault(); hideError();
        if (!db) { showError('Supabase is not configured. Add the sb_publishable key in supabase-config.js, commit, and refresh.'); return; }
        const {data,error} = await db.auth.signInWithPassword({email:document.getElementById('js-supa-email').value.trim(),password:document.getElementById('js-supa-password').value});
        if (error) { showError('Sign-in failed: '+error.message); return; }
        const {data:profile,error:pe} = await db.from('profiles').select('id,full_name,role').eq('id',data.user.id).maybeSingle();
        if (pe || !profile || profile.role !== 'super_admin') { await db.auth.signOut(); showError('This account does not have a valid Super Admin profile. Check public.profiles and RLS policies.'); return; }
        gate.classList.add('hidden'); protectedArea.classList.remove('hidden');
        if (status) { status.textContent='Supabase connected · signed in as Super Admin'; status.className='notice'; }
        await loadHotelsIntoLocalCache(db);
      };
    }
    const logout = document.getElementById('admin-secure-logout');
    if (logout) logout.onclick = async () => { if(db) await db.auth.signOut(); protectedArea.classList.add('hidden'); gate.classList.remove('hidden'); if(loginBox) loginBox.classList.remove('hidden'); if(status) status.textContent='Signed out of Supabase.'; };
    async function loadHotelsIntoLocalCache(client){
      const {data,error}=await client.from('hotels').select('*').order('created_at',{ascending:false});
      if(error){ if(status) status.textContent='Signed in, but hotel list could not load: '+error.message; return; }
      const cached=(data||[]).map(h=>({id:h.id,name:h.name,slug:h.slug,description:h.description||'',address:h.address||'',phone:h.phone||'',whatsapp:h.whatsapp_number||'',status:h.is_active?'active':'draft',username:'',password:'',menu:[],rooms:[],hotelImages:[],roomImages:[]}));
      localStorage.setItem('jsv2_hotels',JSON.stringify(cached));
      // Render current app from the shared records by refreshing after auth session is established.
      if (sessionStorage.getItem('js_supa_hotels_loaded') !== 'yes') { sessionStorage.setItem('js_supa_hotels_loaded','yes'); location.reload(); }
    }
    async function checkSession(){
      if(!db){ if(status) {status.textContent='Supabase not configured: add the publishable key to supabase-config.js.';status.className='warning-box';} return; }
      const {data:{session}}=await db.auth.getSession();
      if(!session) { gate.classList.remove('hidden'); protectedArea.classList.add('hidden'); if(loginBox) loginBox.classList.remove('hidden'); return; }
      const {data:profile,error}=await db.from('profiles').select('id,full_name,role').eq('id',session.user.id).maybeSingle();
      if(error || !profile || profile.role!=='super_admin') { await db.auth.signOut(); gate.classList.remove('hidden'); protectedArea.classList.add('hidden'); showError('Signed-in account is not authorized as Super Admin.'); return; }
      gate.classList.add('hidden'); protectedArea.classList.remove('hidden'); if(status){status.textContent='Supabase connected · Super Admin session active';status.className='notice';}
      await loadHotelsIntoLocalCache(db);
    }
    const hotelForm=document.getElementById('hotel-form');
    if(hotelForm) hotelForm.onsubmit=async (e)=>{
      e.preventDefault();
      if(!db){alert('Supabase is not configured. Add the publishable key first.');return;}
      const {data:{session}}=await db.auth.getSession();
      if(!session){alert('Please sign in as Super Admin first.');return;}
      const {data:profile}=await db.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
      if(!profile||profile.role!=='super_admin'){alert('Super Admin permission required.');return;}
      const name=document.getElementById('hname').value.trim(), slug=document.getElementById('hslug').value.trim().toLowerCase(), wa=document.getElementById('hwa').value.trim().replace(/\D/g,'');
      const payload={name,slug,description:document.getElementById('hdesc').value.trim(),address:document.getElementById('haddress').value.trim(),phone:document.getElementById('hphone').value.trim(),whatsapp_number:wa,is_active:document.getElementById('hstatus').value==='active',owner_id:null};
      const editId=document.getElementById('hid').value;
      let result;
      if(editId && /^[0-9a-f-]{36}$/i.test(editId)) result=await db.from('hotels').update(payload).eq('id',editId).select().single();
      else result=await db.from('hotels').insert(payload).select().single();
      if(result.error){alert('Hotel save failed: '+result.error.message+'\n\nCheck that SUPABASE_ADMIN_POLICIES.sql has been run.');return;}
      const hotel=result.data;
      // Save menu items to shared table. Existing items for this hotel are replaced only after hotel save.
      const rows=[...document.querySelectorAll('#menu-fields .menu-row')].map(row=>({hotel_id:hotel.id,name:row.querySelector('.mn')?.value?.trim(),price:Number(row.querySelector('.mp')?.value||0),category:row.querySelector('.mc')?.value||'Other',description:row.querySelector('.md')?.value||'',is_available:true})).filter(x=>x.name&&Number.isFinite(x.price)&&x.price>=0);
      if(rows.length){ const del=await db.from('menu_items').delete().eq('hotel_id',hotel.id); if(del.error){alert('Hotel saved, but existing menu could not be updated: '+del.error.message);return;} const ins=await db.from('menu_items').insert(rows); if(ins.error){alert('Hotel saved, but menu save failed: '+ins.error.message);return;} }
      alert('Hotel saved to the shared Supabase database.\n\nHotel: '+hotel.name+'\nPublic page: '+new URL('hotel.html?hotel='+encodeURIComponent(hotel.slug),location.href).href+'\n\nNote: owner login creation is not included yet; do not give the owner a demo username/password as a secure login.');
      location.reload();
    };
    checkSession().catch(e=>{if(status)status.textContent='Supabase error: '+e.message;});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready); else ready();
})();
