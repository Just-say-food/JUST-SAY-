# JUST SAY repair build — Hinglish deployment guide

## Is build mein kya fix hua
- Customer signup/sign-in ab Supabase Auth use karta hai; password localStorage mein nahi rakha jata.
- Homepage se “List your hotel” / partner signup links aur public owner-promo section hata diye gaye hain.
- Super Admin hotel save ke baad secure owner account banane ke liye `provision-hotel-owner` Edge Function call karta hai. Password hotel table mein store nahi hota.
- Hotel login flow profile role + `hotel_id` check karta hai.
- Public hotel/QR page Supabase se published hotel aur available menu load karta hai; mobile frontend styles improve kiye gaye.

## Important: do configuration steps abhi bhi zaroori hain
Static ZIP apne aap tumhare Supabase project ki secret settings nahi jaan sakta. Is ZIP mein `supabase-config.js` ka publishable key placeholder hai. Isko configure kiye bina auth/data calls kaam nahi karenge.

### A. Browser publishable key
1. Supabase Dashboard → JUST SAY project → Project Settings → API Keys.
2. `sb_publishable_...` key copy karo. `sb_secret_...` ya service-role key kabhi browser code mein mat daalna.
3. `supabase-config.js` mein `PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE` replace karo.
4. Supabase project URL `https://okvehzycjehxbothkqwk.supabase.co` tumhare project se match honi chahiye; agar nahi, correct Project URL lagao.

### B. Check database schema first
Supabase SQL Editor mein pehle ye read-only query run karo:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public'
  and table_name in ('profiles','hotels','menu_items')
order by table_name, ordinal_position;
```

The owner-provision function expects `profiles(id uuid, full_name text, role text, hotel_id uuid)` and `hotels(id uuid, name text)`. `profiles.role` must allow `hotel_owner`. If your real schema differs, adjust before deploying. Do not blindly run SQL against a different schema.

### C. Deploy secure owner account function
The service-role key must remain on Supabase server-side, never in this ZIP.

From a computer with Supabase CLI installed and linked to the correct project:

```bash
supabase login
supabase link --project-ref okvehzycjehxbothkqwk
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy provision-hotel-owner
```

The platform normally supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions. If your project does not, set those server secrets too. Get the service-role key from the Supabase Dashboard and do not share it in chat or commit it to GitHub.

### D. Test in this order
1. Deploy the website files to the GitHub Pages repository root (do not upload the parent folder as a nested folder).
2. Open `customer-login.html`, create an account with email + password, and verify the email if Supabase requests it. Sign in using that email. Phone OTP is not included.
3. Sign into Super Admin using an existing Supabase Auth user whose `profiles.role` is `super_admin`.
4. Create a test hotel with owner email and a temporary password of at least 10 characters. Check the alert for success. If hotel/menu save succeeds but owner provisioning fails, read the exact function error and fix deployment/schema before retrying.
5. Open the public hotel URL / QR on a different phone. The hotel must be active and menu rows must reference its `hotels.id`.

## Honest limitations
- The website files do not contain your real publishable key; configure it before deploying.
- This does not add phone OTP, password reset, payment processing, or a complete hotel-owner dashboard for menu/order editing.
- The hotel owner function creates a Supabase Auth user and a `profiles` row; it does not expose or store the password after provisioning.
- Existing legacy features such as bookings, some admin views, reviews and orders may still use browser localStorage. Do not treat those as shared production records until migrated and tested.
