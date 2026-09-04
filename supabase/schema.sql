create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can select their own profile" on public.profiles;
create policy "Users can select their own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
check (role in ('user', 'admin')) not valid;

alter table public.profiles drop constraint if exists profiles_full_name_length_check;
alter table public.profiles add constraint profiles_full_name_length_check
check (full_name is null or char_length(full_name) between 2 and 100) not valid;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, email, full_name, avatar_url) on table public.profiles to authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  explanation_level text not null default 'Student',
  topics text[] not null default '{}'::text[],
  daily_briefing_emails boolean not null default false,
  public_profile boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

alter table public.user_preferences drop constraint if exists user_preferences_level_check;
alter table public.user_preferences add constraint user_preferences_level_check
check (explanation_level in ('Beginner', 'Student', 'Researcher')) not valid;

alter table public.user_preferences drop constraint if exists user_preferences_topics_check;
alter table public.user_preferences add constraint user_preferences_topics_check
check (cardinality(topics) <= 20) not valid;

drop policy if exists "Users can select their own preferences" on public.user_preferences;
create policy "Users can select their own preferences"
on public.user_preferences
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
on public.user_preferences
for insert
with check (auth.uid() = user_id);

revoke all on table public.user_preferences from anon;
revoke all on table public.user_preferences from authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
on public.user_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.saved_discoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  title text not null,
  description text,
  source_url text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_discoveries_user_created_idx
on public.saved_discoveries (user_id, created_at desc);

alter table public.saved_discoveries enable row level security;

alter table public.saved_discoveries drop constraint if exists saved_discoveries_type_check;
alter table public.saved_discoveries add constraint saved_discoveries_type_check
check (item_type in ('apod', 'nasa-image', 'planet', 'briefing')) not valid;

alter table public.saved_discoveries drop constraint if exists saved_discoveries_title_length_check;
alter table public.saved_discoveries add constraint saved_discoveries_title_length_check
check (char_length(title) between 1 and 240) not valid;

alter table public.saved_discoveries drop constraint if exists saved_discoveries_metadata_object_check;
alter table public.saved_discoveries add constraint saved_discoveries_metadata_object_check
check (jsonb_typeof(metadata) = 'object') not valid;

drop policy if exists "Users can select their own saved discoveries" on public.saved_discoveries;
create policy "Users can select their own saved discoveries"
on public.saved_discoveries
for select
using (auth.uid() = user_id);

revoke all on table public.saved_discoveries from anon;
revoke all on table public.saved_discoveries from authenticated;
grant select, insert, update, delete on table public.saved_discoveries to authenticated;

drop policy if exists "Users can insert their own saved discoveries" on public.saved_discoveries;
create policy "Users can insert their own saved discoveries"
on public.saved_discoveries
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own saved discoveries" on public.saved_discoveries;
create policy "Users can update their own saved discoveries"
on public.saved_discoveries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own saved discoveries" on public.saved_discoveries;
create policy "Users can delete their own saved discoveries"
on public.saved_discoveries
for delete
using (auth.uid() = user_id);

create table if not exists public.mission_control_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  layout jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists mission_control_layouts_set_updated_at on public.mission_control_layouts;
create trigger mission_control_layouts_set_updated_at
before update on public.mission_control_layouts
for each row
execute function public.set_updated_at();

create index if not exists mission_control_layouts_user_idx
on public.mission_control_layouts (user_id);

alter table public.mission_control_layouts enable row level security;

alter table public.mission_control_layouts drop constraint if exists mission_control_layout_array_check;
alter table public.mission_control_layouts add constraint mission_control_layout_array_check
check (jsonb_typeof(layout) = 'array' and jsonb_array_length(layout) <= 16) not valid;

drop policy if exists "Users can select their own mission control layout" on public.mission_control_layouts;
create policy "Users can select their own mission control layout"
on public.mission_control_layouts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own mission control layout" on public.mission_control_layouts;
create policy "Users can insert their own mission control layout"
on public.mission_control_layouts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own mission control layout" on public.mission_control_layouts;
create policy "Users can delete their own mission control layout"
on public.mission_control_layouts
for delete
using (auth.uid() = user_id);

revoke all on table public.mission_control_layouts from anon;
revoke all on table public.mission_control_layouts from authenticated;
grant select, insert, update, delete on table public.mission_control_layouts to authenticated;

drop policy if exists "Users can update their own mission control layout" on public.mission_control_layouts;
create policy "Users can update their own mission control layout"
on public.mission_control_layouts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
