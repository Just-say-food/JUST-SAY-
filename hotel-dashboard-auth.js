
(async function () {
  const db = window.JUST_SAY_DB?.client;
  const title = document.getElementById("welcome-title");
  const subtitle = document.getElementById("hotel-subtitle");
  const status = document.getElementById("dashboard-status");
  const content = document.getElementById("dashboard-content");
  const prompt = document.getElementById("dashboard-login-prompt");
  const logout = document.getElementById("dashboard-logout");
  const publicLink = document.getElementById("public-hotel-link");

  function showLogin(message) {
    status.textContent = message;
    content.classList.add("hidden");
    prompt.classList.remove("hidden");
  }

  if (!db) {
    status.textContent =
      "Supabase initialize nahi hua. supabase-config.js aur supabase-init.js check karein.";
    return;
  }

  try {
    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData.session;

    if (!session) {
      showLogin("Hotel dashboard ke liye pehle sign in karein.");
      return;
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, full_name, role, hotel_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (
      !profile ||
      !["hotel_owner", "hotel_manager"].includes(profile.role) ||
      !profile.hotel_id
    ) {
      await db.auth.signOut();
      showLogin("Authorized hotel profile nahi mila. Super Admin se contact karein.");
      return;
    }

    const { data: hotel, error: hotelError } = await db
      .from("hotels")
      .select("id, name, slug, is_active")
      .eq("id", profile.hotel_id)
      .maybeSingle();

    if (hotelError) throw hotelError;

    if (!hotel) {
      showLogin("Hotel record nahi mila. Super Admin se contact karein.");
      return;
    }

    title.textContent = "Welcome, " + (profile.full_name || session.user.email);
    subtitle.textContent = "Hotel: " + hotel.name;
    status.textContent = "Login successful · " + hotel.name;
    content.classList.remove("hidden");
    prompt.classList.add("hidden");

    if (publicLink && hotel.slug) {
      publicLink.href = "hotel.html?hotel=" + encodeURIComponent(hotel.slug);
    }

    if (logout) {
      logout.addEventListener("click", async function () {
        const { error } = await db.auth.signOut();
        if (error) {
          status.textContent = "Sign out failed: " + error.message;
          return;
        }
        location.href = "hotel-login.html";
      });
    }
  } catch (error) {
    console.error("Hotel dashboard error:", error);
    status.textContent =
      "Dashboard error: " + (error.message || "Session check failed.");
  }
})();
