-- JUST SAY production repair: review before running.
-- This script does NOT create auth users, delete data, or store passwords.
-- Assumes existing public.profiles(id uuid, role text, hotel_id uuid),
-- public.hotels(id uuid, slug text, is_active boolean),
-- and public.menu_items(hotel_id uuid, is_available boolean).
-- If your schema differs, STOP and share the schema query output before running.

-- 1) Role check helper. SECURITY DEFINER avoids recursive RLS checks on profiles.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'super_admin'
  );
$$;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- 2) Enable RLS on tables used by the website.
alter table public.profiles enable row level security;
alter table public.hotels enable row level security;
alter table public.menu_items enable row level security;

-- 3) A signed-in user can read only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = (select auth.uid()));

-- Profile updates are intentionally NOT granted to users, so users cannot promote themselves.

-- 4) Super Admin can manage hotels.
drop policy if exists "super_admin_manage_hotels" on public.hotels;
create policy "super_admin_manage_hotels" on public.hotels
for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

-- 5) Public can read published hotels; public cannot insert/update/delete hotels.
drop policy if exists "public_read_active_hotels" on public.hotels;
create policy "public_read_active_hotels" on public.hotels
for select to anon, authenticated using (is_active = true);

-- 6) Super Admin manages menu rows.
drop policy if exists "super_admin_manage_menu_items" on public.menu_items;
create policy "super_admin_manage_menu_items" on public.menu_items
for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

-- 7) Public can read available menu rows only when the parent hotel is published.
drop policy if exists "public_read_available_menu_items" on public.menu_items;
create policy "public_read_available_menu_items" on public.menu_items
for select to anon, authenticated
using (
  is_available = true and exists (
    select 1 from public.hotels h
    where h.id = menu_items.hotel_id and h.is_active = true
  )
);

-- 8) Hotel owner can read their linked hotel and menu. This does not grant write access.
drop policy if exists "hotel_owner_read_own_hotel" on public.hotels;
create policy "hotel_owner_read_own_hotel" on public.hotels
for select to authenticated
using (
  exists (select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.hotel_id = hotels.id
      and p.role in ('hotel_owner','hotel_manager'))
);

drop policy if exists "hotel_owner_read_own_menu" on public.menu_items;
create policy "hotel_owner_read_own_menu" on public.menu_items
for select to authenticated
using (
  exists (select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.hotel_id = menu_items.hotel_id
      and p.role in ('hotel_owner','hotel_manager'))
);

-- IMPORTANT:
-- * This is not a complete orders/reviews migration.
-- * Do not enable owner menu editing or order access until those policies are designed and tested.
-- * Existing schema constraints may restrict role values. Inspect them before creating hotel-owner profiles.
-- * Provision Super Admin and hotel-owner accounts using Supabase Auth; never put service_role keys in frontend code.
