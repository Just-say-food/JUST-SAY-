/* Secure hotel-owner sign-in. Accounts must be created by an administrator through a trusted process. */
(async function(){
 const form=document.getElementById('login-form'); if(!form)return;
 const card=form.closest('.login-card'); const msg=document.getElementById('login-error');
 const status=document.getElementById('supabase-connection-status');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const db=window.JUST_SAY_DB?.client;
 form.innerHTML='<label class="field">Owner email<input id="owner-email" type="email" required autocomplete="username"></label><label class="field">Password<input id="owner-password" type="password" required autocomplete="current-password"></label><button type="submit">Sign in securely →</button><p id="login-error" class="error hidden" role="alert"></p>';
 const errorBox=document.getElementById('login-error');
 const showError=t=>{errorBox.textContent=t;errorBox.classList.remove('hidden')};
 const showStatus=t=>{if(status){status.textContent=t;status.className='notice'}};
 if(!db){showError('Supabase is not configured. Add the publishable key in supabase-config.js.');return;}
 form.onsubmit=async e=>{e.preventDefault();errorBox.classList.add('hidden');const email=document.getElementById('owner-email').value.trim(),password=document.getElementById('owner-password').value;
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error){showError('Login failed: '+error.message);return;}
  const {data:profile,error:pe}=await db.from('profiles').select('id,full_name,role,hotel_id').eq('id',data.user.id).maybeSingle();
  if(pe||!profile||!['hotel_owner','hotel_manager'].includes(profile.role)||!profile.hotel_id){await db.auth.signOut();showError('This account is not linked to an authorized hotel profile. Ask JUST SAY Super Admin to set up your hotel-owner access.');return;}
  const {data:hotel,error:he}=await db.from('hotels').select('id,name,slug,address,phone,whatsapp_number,is_active').eq('id',profile.hotel_id).maybeSingle();
  if(he||!hotel){await db.auth.signOut();showError('Your hotel account is linked incorrectly or the hotel record could not be loaded. Contact JUST SAY support.');return;}
  card.innerHTML=`<span class="tag">HOTEL PARTNER ACCESS</span><h1>Welcome, ${esc(profile.full_name||hotel.name)}</h1><p class="muted">Signed in securely. Hotel profile: <b>${esc(hotel.name)}</b></p><p>Status: ${hotel.is_active?'Published':'Draft / unpublished'}</p><p>Public link: <a href="hotel.html?hotel=${encodeURIComponent(hotel.slug)}">Open hotel profile</a></p><p class="small">This login validates your account and hotel association. Menu editing and order management must be implemented as protected Supabase-backed portal features before use.</p><button id="owner-logout" type="button">Sign out</button>`;
  document.getElementById('owner-logout').onclick=async()=>{await db.auth.signOut();location.reload()};showStatus('Supabase connected · hotel owner signed in');
 };
 const {data:{session}}=await db.auth.getSession();
 if(session){const {data:p}=await db.from('profiles').select('id,full_name,role,hotel_id').eq('id',session.user.id).maybeSingle();if(p&&['hotel_owner','hotel_manager'].includes(p.role)&&p.hotel_id){document.getElementById('owner-email').value=session.user.email||'';showStatus('Existing Supabase session detected. Submit login again only if required.');}}
})();
