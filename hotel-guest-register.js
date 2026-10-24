
(async function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const statusBox = $('#guest-status');
  const app = $('#guest-app');
  const form = $('#guest-form');
  const db = window.JUST_SAY_DB?.client;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);

  const say = (msg, kind = 'notice') => {
    if (!statusBox) return;
    statusBox.className = kind;
    statusBox.textContent = msg;
  };

  if (!db) {
    say('Supabase is not configured. Check supabase-config.js.', 'warning-box');
    return;
  }

  if (!form || !app || !$('#guest-list')) {
    say('Guest Register page elements are missing. Please check hotel-guest-register.html.', 'warning-box');
    return;
  }

  let hotelId = null;
  let rooms = [];
  let rows = [];

  const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };

  const localDateTime = (d) => {
    const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return x.toISOString().slice(0, 16);
  };

  try {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;

    if (!session) {
      say('Please sign in with your hotel-owner account. Opening hotel login…');
      setTimeout(() => {
        location.href = 'hotel-login.html?next=hotel-guest-register.html';
      }, 900);
      return;
    }

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id,role,hotel_id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile ||
        !['hotel_owner', 'hotel_manager'].includes(profile.role) ||
        !profile.hotel_id) {
      say('This account is not linked to an authorized hotel profile. Contact JUST SAY Super Admin.', 'warning-box');
      return;
    }

    hotelId = profile.hotel_id;
    app.classList.remove('hidden');

    await loadRooms();
    await loadGuests();
    resetForm();

  } catch (error) {
    say('Could not verify or load your hotel account: ' +
      (error.message || 'Unknown error'), 'warning-box');
    return;
  }

  async function loadRooms() {
    const { data, error } = await db
      .from('hotel_rooms')
      .select('id,room_number,status')
      .eq('hotel_id', hotelId)
      .order('room_number');

    if (error) throw error;

    rooms = data || [];

    const select = form.elements.room_id;
    const previous = select.value;

    select.innerHTML = '<option value="">Select a room</option>' +
      rooms.map((room) =>
        `<option value="${esc(room.id)}">${esc(room.room_number)} · ${esc(room.status)}</option>`
      ).join('');

    if (previous) select.value = previous;

    if (!rooms.length) {
      say('No rooms found. Add rooms in Room Management before recording a guest.', 'warning-box');
    }
  }

  async function loadGuests() {
    const { data, error } = await db
      .from('hotel_guest_records')
      .select('id,hotel_id,room_id,guest_name,adults,children,phone,booking_source,check_in,check_out,booking_amount,payment_status,status,notes,created_at')
      .eq('hotel_id', hotelId)
      .order('check_in', { ascending: false });

    if (error) throw error;

    rows = data || [];
    draw();

    say('Supabase connected · ' + rows.length + ' guest record(s) loaded.', 'success-box');
  }

  function draw() {
    const active = rows.filter((r) => r.status === 'Checked in');

    $('#count-active').textContent = active.length;
    $('#count-guests').textContent = active.reduce(
      (sum, r) => sum + Number(r.adults || 0) + Number(r.children || 0), 0
    );

    $('#count-checkins').textContent = rows.filter(
      (r) => r.check_in &&
        r.check_in.slice(0, 10) === today() &&
        r.status !== 'Cancelled'
    ).length;

    $('#count-checkouts').textContent = rows.filter(
      (r) => r.check_out &&
        r.check_out.slice(0, 10) === today() &&
        r.status !== 'Cancelled'
    ).length;

    const roomMap = new Map(rooms.map((r) => [r.id, r.room_number]));

    const tableRows = rows.map((r) => `
      <tr>
        <td>${esc(r.guest_name)}<br><span class="muted">${esc(r.phone || '')}</span></td>
        <td>${esc(roomMap.get(r.room_id) || 'Room unavailable')}</td>
        <td>${Number(r.adults || 0)} adult(s), ${Number(r.children || 0)} child(ren)</td>
        <td>${esc(String(r.check_in || '').replace('T', ' ').slice(0, 16))}</td>
        <td>${esc(String(r.check_out || '').replace('T', ' ').slice(0, 16))}</td>
        <td>${esc(r.booking_source)}</td>
        <td>₹${Number(r.booking_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
        <td>${esc(r.payment_status)}</td>
        <td>${esc(r.status)}</td>
        <td>
          <button type="button" class="secondary" data-edit="${esc(r.id)}">Edit</button>
          <button type="button" class="danger" data-delete="${esc(r.id)}">Delete</button>
        </td>
      </tr>
    `).join('');

    $('#guest-list').innerHTML = rows.length
      ? `<table class="data-table">
          <thead>
            <tr>
              <th>Guest</th><th>Room</th><th>Guests</th>
              <th>Check-in</th><th>Check-out</th><th>Source</th>
              <th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>`
      : '<p class="muted">No guest records yet. Add your first record above.</p>';
  }

  function resetForm() {
    form.reset();
    form.elements.id.value = '';
    form.elements.adults.value = '1';
    form.elements.children.value = '0';
    form.elements.booking_amount.value = '0';
    form.elements.payment_status.value = 'Unpaid';
    form.elements.status.value = 'Requested';
    form.elements.check_in.value = localDateTime(new Date());

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    form.elements.check_out.value = localDateTime(tomorrow);

    $('#form-title').textContent = 'Add guest / booking';
    $('#save-guest').textContent = 'Save guest record';
    $('#cancel-edit').classList.add('hidden');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const id = String(data.get('id') || '');
    const checkIn = new Date(String(data.get('check_in')));
    const checkOut = new Date(String(data.get('check_out')));

    if (!Number.isFinite(checkIn.getTime()) ||
        !Number.isFinite(checkOut.getTime())) {
      say('Please enter valid check-in and check-out dates.', 'warning-box');
      return;
    }

    const payload = {
      hotel_id: hotelId,
      room_id: String(data.get('room_id') || ''),
      guest_name: String(data.get('guest_name') || '').trim(),
      adults: Number(data.get('adults')),
      children: Number(data.get('children') || 0),
      phone: String(data.get('phone') || '').trim() || null,
      booking_source: String(data.get('booking_source') || ''),
      check_in: checkIn.toISOString(),
      check_out: checkOut.toISOString(),
      booking_amount: Number(data.get('booking_amount')),
      payment_status: String(data.get('payment_status') || ''),
      status: String(data.get('status') || ''),
      notes: String(data.get('notes') || '').trim() || null,
      updated_at: new Date().toISOString()
    };

    if (!payload.guest_name ||
        !payload.room_id ||
        !Number.isInteger(payload.adults) ||
        payload.adults < 1 ||
        !Number.isInteger(payload.children) ||
        payload.children < 0 ||
        !Number.isFinite(payload.booking_amount) ||
        payload.booking_amount < 0 ||
        checkOut <= checkIn) {
      say('Please check the required fields, guest count, amount and check-out time.', 'warning-box');
      return;
    }

    if (!rooms.some((room) => room.id === payload.room_id)) {
      say('Please select a room belonging to your hotel.', 'warning-box');
      return;
    }

    $('#save-guest').disabled = true;

    try {
      const result = id
        ? await db.from('hotel_guest_records')
            .update(payload).eq('id', id).eq('hotel_id', hotelId)
        : await db.from('hotel_guest_records').insert(payload);

      if (result.error) throw result.error;

      resetForm();
      await loadGuests();
      say(id ? 'Guest record updated.' : 'Guest record saved to Supabase.', 'success-box');

    } catch (error) {
      say('Could not save guest record: ' +
        (error.message || 'Unknown error'), 'warning-box');
    } finally {
      $('#save-guest').disabled = false;
    }
  });

  $('#guest-list').addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit]');

    if (editButton) {
      const record = rows.find((r) => r.id === editButton.dataset.edit);
      if (!record) return;

      form.elements.id.value = record.id;
      form.elements.guest_name.value = record.guest_name;
      form.elements.room_id.value = record.room_id;
      form.elements.adults.value = record.adults;
      form.elements.children.value = record.children;
      form.elements.phone.value = record.phone || '';
      form.elements.booking_source.value = record.booking_source;
      form.elements.check_in.value = localDateTime(new Date(record.check_in));
      form.elements.check_out.value = localDateTime(new Date(record.check_out));
      form.elements.booking_amount.value = record.booking_amount;
      form.elements.payment_status.value = record.payment_status;
      form.elements.status.value = record.status;
      form.elements.notes.value = record.notes || '';

      $('#form-title').textContent = 'Edit guest record';
      $('#save-guest').textContent = 'Update guest record';
      $('#cancel-edit').classList.remove('hidden');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const deleteButton = event.target.closest('[data-delete]');
    if (!deleteButton) return;

    const record = rows.find((r) => r.id === deleteButton.dataset.delete);
    if (!record || !confirm('Delete this guest record? This cannot be undone.')) return;

    try {
      const { error } = await db
        .from('hotel_guest_records')
        .delete()
        .eq('id', record.id)
        .eq('hotel_id', hotelId);

      if (error) throw error;

      await loadGuests();
      say('Guest record deleted.', 'success-box');

    } catch (error) {
      say('Could not delete record: ' + (error.message || 'Unknown error'), 'warning-box');
    }
  });

  $('#cancel-edit').addEventListener('click', resetForm);

  $('#refresh-guests').addEventListener('click', async () => {
    try {
      await loadRooms();
      await loadGuests();
    } catch (error) {
      say('Refresh failed: ' + (error.message || 'Unknown error'), 'warning-box');
    }
  });
})();
