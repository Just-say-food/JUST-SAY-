-- JUST SAY V5: run this in Supabase SQL Editor as project owner.
-- These policies grant database access to authenticated users whose public.profiles.role is super_admin.
-- Never put a service_role / sb_secret key in website files.

alter table public.profiles enable row level security;
alter table public.hotels enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;

-- A signed-in user can read their own profile (needed to check the existing admin role).
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = (select auth.uid()));

-- Super Admin manages hotel profiles.
drop policy if exists "super_admin_manage_hotels" on public.hotels;
create policy "super_admin_manage_hotels" on public.hotels
for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

-- Super Admin manages menu items.
drop policy if exists "super_admin_manage_menu_items" on public.menu_items;
create policy "super_admin_manage_menu_items" on public.menu_items
for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

-- Super Admin can view and manage orders and reviews in the admin dashboard.
drop policy if exists "super_admin_manage_orders" on public.orders;
create policy "super_admin_manage_orders" on public.orders
for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists "super_admin_manage_reviews" on public.reviews;
create policy "super_admin_manage_reviews" on public.reviews
for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));
