# JUST SAY — Repair build (Supabase + GitHub Pages)

## What this repair build changes

1. `hotel.html` now loads `supabase-public-hotel.js`, which fetches the requested published hotel by URL slug from Supabase and fetches available menu items from `menu_items`. This fixes the old localStorage-only hotel lookup on the public hotel page, provided the schema and RLS policies match.
2. `hotel-login.html` now uses email/password Supabase Auth and checks that the signed-in account has a `profiles` row with role `hotel_owner` or `hotel_manager` and a valid `hotel_id`.
3. `SUPABASE_SETUP_AND_FIX.sql` adds a role-check helper and read policies for published hotel profiles/menu items. It does not delete data or create users.
4. The code still requires your own Supabase publishable key and a matching existing database schema. No one can safely manufacture those project-specific values from the ZIP.

## Step 1 — Back up

- Keep your current ZIP and GitHub repository unchanged as a backup.
- Download a database backup/export before changing production policies.

## Step 2 — Configure Supabase browser key

1. Open Supabase Dashboard → your JUST SAY project → Project Settings → API Keys.
2. Copy the **publishable** key (often starts with `sb_publishable_`). Do not use a secret/service-role key.
3. Open `supabase-config.js` and replace `PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE` with that key.
4. Keep the project URL already in the file only if it matches your actual Supabase project.

## Step 3 — Inspect schema before SQL

In Supabase → SQL Editor, run this read-only query first:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public'
  and table_name in ('profiles','hotels','menu_items','orders','reviews')
order by table_name, ordinal_position;
```

Also inspect constraints/policies if needed. The included SQL expects these columns:
- `profiles`: `id` (same UUID as `auth.users.id`), `role`, `hotel_id`, and optionally `full_name`.
- `hotels`: `id`, `slug`, `name`, `is_active`, `description`, `address`, `phone`, `whatsapp_number`.
- `menu_items`: `hotel_id`, `name`, `price`, `category`, `description`, `is_available`.

**If any required column is missing or has a different name/type, do not run the SQL yet.** Adjust the migration to the real schema first.

## Step 4 — Apply SQL carefully

1. Review `SUPABASE_SETUP_AND_FIX.sql`.
2. Only run it if Step 3 confirms the expected schema.
3. Run it in Supabase → SQL Editor → New query.
4. If any statement errors, stop and save the exact error; do not keep running random SQL snippets.

## Step 5 — Set up the first Super Admin

The website does not securely self-promote a user to Super Admin. Create the user in Supabase → Authentication → Users (or use an authorized signup process), then, as the project owner, add the matching profile row with `role='super_admin'` using your actual schema. The profile `id` must exactly equal that Auth user's UUID. Never allow public signup to choose its own role.

Before inserting, verify whether a profile row already exists. Do not create duplicate profile IDs.

## Step 6 — Set up a hotel owner

Hotel owner accounts must be created through a trusted admin process. For the login page to accept an account, all must be true:
- the user exists in Supabase Auth;
- `profiles.id` equals that Auth user's UUID;
- `profiles.role` is `hotel_owner` or `hotel_manager`;
- `profiles.hotel_id` equals the intended hotel's `hotels.id`.

Do not store a plain-text password or hotel login password in the `hotels` table. This repair build validates the login and association, but a full owner dashboard for editing menus and managing orders is not yet implemented. Do not give owners write access until that dashboard and its policies are added and tested.

## Step 7 — Deploy to GitHub Pages

1. Extract this ZIP locally.
2. Open the repository that publishes `https://just-say-food.github.io/Just-say/`.
3. Replace the repository's website files with the repaired files while preserving repository metadata/workflows.
4. Commit and push to the branch/folder configured in Settings → Pages.
5. Wait for the GitHub Pages deployment to finish.
6. Open the live site in a private/incognito window or hard-refresh (Ctrl+Shift+R).

## Step 8 — Test public hotel QR

1. In Supabase `hotels`, ensure the target hotel has a unique `slug` and `is_active=true`.
2. Ensure menu rows use the exact `hotel_id` from that hotel and `is_available=true`.
3. Open `hotel.html?hotel=your-slug` on a phone not logged into Supabase.
4. If the page reports a database error, open browser DevTools → Console and copy the error. If it says hotel not found, verify the slug and active flag.
5. If the page loads the hotel but no menu, verify menu rows and their RLS policy.

## Important limitations

- This build fixes the public hotel profile lookup and replaces the demo hotel-login handler, but it is not a complete production backend rewrite. Other features in the old app (directory, reviews, orders, booking leads, and some admin displays) may still use `localStorage`.
- Admin hotel creation currently writes the hotel/menu rows to Supabase, but it does not securely create an Auth user for a hotel owner. That requires a trusted backend/Edge Function or a controlled manual provisioning workflow.
- I cannot verify private database data or prove the live deployment works without the project's actual schema and runtime results. Run the checklist and share any exact error for the next repair pass.


Updated repair build notes: see `REPAIR_DEPLOY_GUIDE_HINGLISH.md` for customer Supabase Auth, server-side hotel owner provisioning, required publishable-key setup, and exact deployment steps. This ZIP does not include any service-role secret.
