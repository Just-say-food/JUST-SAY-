
/* Secure hotel-owner sign-in */
(async function () {
  const form = document.getElementById('login-form');
  if (!form) return;

  const status = document.getElementById('supabase-connection-status');
  const db = window.JUST_SAY_DB?.client;

  const showStatus = (message) => {
    if (status) {
      status.textContent = message;
      status.className = 'notice';
    }
  };

  if (!db) {
    const errorBox = document.getElementById('login-error');
    if (errorBox) {
      errorBox.textContent =
        'Supabase is not configured. Check supabase-config.js.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  form.innerHTML = `
    <label class="field">
      Owner email
      <input id="owner-email" type="email" required autocomplete="username">
    </label>
    <label class="field">
      Password
      <input id="owner-password" type="password" required autocomplete="current-password">
    </label>
    <button type="submit">Sign in to hotel portal →</button>
    <p id="login-error" class="error hidden" role="alert"></p>
  `;

  const errorBox = document.getElementById('login-error');

  form.onsubmit = async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');

    const email = document.getElementById('owner-email').value.trim();
    const password = document.getElementById('owner-password').value;

    try {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('id, role, hotel_id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        !['hotel_owner', 'hotel_manager'].includes(profile.role) ||
        !profile.hotel_id
      ) {
        await db.auth.signOut();
        throw new Error(
          'Hotel owner profile not linked correctly. Contact JUST SAY Super Admin.'
        );
      }

      const { data: hotel, error: hotelError } = await db
        .from('hotels')
        .select('id')
        .eq('id', profile.hotel_id)
        .maybeSingle();

      if (hotelError || !hotel) {
        await db.auth.signOut();
        throw new Error('Hotel record could not be loaded. Contact support.');
      }

      showStatus('Login successful. Opening hotel dashboard…');
      window.location.replace('hotel-dashboard.html');

    } catch (error) {
      errorBox.textContent = 'Login failed: ' + error.message;
      errorBox.classList.remove('hidden');
    }
  };

  const { data: { session } } = await db.auth.getSession();

  if (session) {
    const { data: profile } = await db
      .from('profiles')
      .select('role, hotel_id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (
      profile &&
      ['hotel_owner', 'hotel_manager'].includes(profile.role) &&
      profile.hotel_id
    ) {
      showStatus('Hotel owner session detected.');
    }
  }
})();
