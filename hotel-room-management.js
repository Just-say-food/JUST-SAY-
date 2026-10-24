(async function(){
'use strict';
const $=s=>document.querySelector(s), statusBox=$('#room-status'), app=$('#room-app'), form=$('#room-form');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=(msg,kind='notice')=>{statusBox.className=kind;statusBox.textContent=msg};
const db=window.JUST_SAY_DB&&window.JUST_SAY_DB.client;
if(!db){say('Supabase is not configured. Keep your existing working supabase-config.js and verify its publishable key.','warning-box');return;}
let hotelId=null, rows=[];
try{
 const {data:{session},error:sessionError}=await db.auth.getSession();
 if(sessionError) throw sessionError;
 if(!session){say('Please sign in with your hotel-owner account first. Opening hotel login…');setTimeout(()=>location.href='hotel-login.html?next=hotel-rooms.html',900);return;}
 const {data:profile,error:profileError}=await db.from('profiles').select('id,role,hotel_id').eq('id',session.user.id).maybeSingle();
 if(profileError) throw profileError;
 if(!profile||!['hotel_owner','hotel_manager'].includes(profile.role)||!profile.hotel_id){say('This signed-in account is not linked to an authorized hotel profile. Please contact JUST SAY Super Admin.','warning-box');return;}
 hotelId=profile.hotel_id;
 app.classList.remove('hidden');
 await loadRooms();
}catch(e){say('Could not verify your hotel account: '+(e.message||'Unknown error'),'warning-box');}
async function loadRooms(){
 const {data,error}=await db.from('hotel_rooms').select('id,hotel_id,room_number,room_type,price_per_night,status,notes,created_at,updated_at').eq('hotel_id',hotelId).order('room_number');
 if(error){say('Could not load rooms: '+error.message+'. Check that the hotel_rooms table and owner RLS policies were created.','warning-box');return;}
 rows=data||[]; draw(); say('Supabase connected · '+rows.length+' room(s) loaded.','success-box');
}
function draw(){
 $('#count-total').textContent=rows.length;
 $('#count-available').textContent=rows.filter(r=>r.status==='Available').length;
 $('#count-occupied').textContent=rows.filter(r=>r.status==='Occupied').length;
 $('#count-maintenance').textContent=rows.filter(r=>r.status==='Maintenance').length;
 $('#room-list').innerHTML=rows.length?`<table class="data-table"><thead><tr><th>Room</th><th>Type</th><th>Price/night</th><th>Status</th><th>Notes</th><th class="no-print">Actions</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.room_number)}</td><td>${esc(r.room_type)}</td><td>₹${Number(r.price_per_night).toLocaleString('en-IN',{maximumFractionDigits:2})}</td><td><span class="pill">${esc(r.status)}</span></td><td>${esc(r.notes||'—')}</td><td class="no-print"><button type="button" class="secondary" data-edit="${esc(r.id)}">Edit</button> <button type="button" class="danger" data-delete="${esc(r.id)}">Delete</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No rooms yet. Use the form above to add your first room.</p>';
}
function resetForm(){form.reset();form.elements.id.value='';form.elements.price_per_night.value='0';$('#form-title').textContent='Add a room';$('#save-room').textContent='Save room';$('#cancel-edit').classList.add('hidden');}
form.addEventListener('submit',async e=>{
 e.preventDefault();const d=new FormData(form);const id=String(d.get('id')||'');
 const payload={hotel_id:hotelId,room_number:String(d.get('room_number')).trim(),room_type:String(d.get('room_type')),price_per_night:Number(d.get('price_per_night')),status:String(d.get('status')),notes:String(d.get('notes')||'').trim()||null,updated_at:new Date().toISOString()};
 if(!payload.room_number||!Number.isFinite(payload.price_per_night)||payload.price_per_night<0){say('Enter a valid room number and non-negative price.','warning-box');return;}
 $('#save-room').disabled=true;
 try{let result;if(id) result=await db.from('hotel_rooms').update(payload).eq('id',id).eq('hotel_id',hotelId);else result=await db.from('hotel_rooms').insert(payload);
 if(result.error)throw result.error;resetForm();await loadRooms();say(id?'Room updated successfully.':'Room saved to Supabase successfully.','success-box');
 }catch(err){say('Could not save room: '+(err.message||'Unknown error'),'warning-box');}finally{$('#save-room').disabled=false;}
});
$('#room-list').addEventListener('click',async e=>{
 const edit=e.target.closest('[data-edit]');if(edit){const r=rows.find(x=>x.id===edit.dataset.edit);if(!r)return;form.elements.id.value=r.id;form.elements.room_number.value=r.room_number;form.elements.room_type.value=r.room_type;form.elements.price_per_night.value=r.price_per_night;form.elements.status.value=r.status;form.elements.notes.value=r.notes||'';$('#form-title').textContent='Edit room '+r.room_number;$('#save-room').textContent='Update room';$('#cancel-edit').classList.remove('hidden');form.scrollIntoView({behavior:'smooth',block:'start'});return;}
 const del=e.target.closest('[data-delete]');if(del){const r=rows.find(x=>x.id===del.dataset.delete);if(!r||!confirm('Delete room '+r.room_number+'? This cannot be undone.'))return;del.disabled=true;const {error}=await db.from('hotel_rooms').delete().eq('id',r.id).eq('hotel_id',hotelId);if(error){say('Could not delete room: '+error.message,'warning-box');del.disabled=false;return;}await loadRooms();say('Room deleted.','success-box');}
});
$('#cancel-edit').addEventListener('click',resetForm);$('#refresh-rooms').addEventListener('click',loadRooms);
})();