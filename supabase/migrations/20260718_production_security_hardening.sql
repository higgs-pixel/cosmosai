-- Apply through the Supabase SQL editor or migration workflow before production monetisation.
-- Constraints are NOT VALID so existing rows do not block deployment; validate them after reviewing legacy data.

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.saved_discoveries enable row level security;
alter table public.mission_control_layouts enable row level security;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin')) not valid;
alter table public.profiles drop constraint if exists profiles_full_name_length_check;
alter table public.profiles add constraint profiles_full_name_length_check
  check (full_name is null or char_length(full_name) between 2 and 100) not valid;

alter table public.user_preferences drop constraint if exists user_preferences_level_check;
alter table public.user_preferences add constraint user_preferences_level_check
  check (explanation_level in ('Beginner', 'Student', 'Researcher')) not valid;
alter table public.user_preferences drop constraint if exists user_preferences_topics_check;
alter table public.user_preferences add constraint user_preferences_topics_check
  check (cardinality(topics) <= 20) not valid;

alter table public.saved_discoveries drop constraint if exists saved_discoveries_type_check;
alter table public.saved_discoveries add constraint saved_discoveries_type_check
  check (item_type in ('apod', 'nasa-image', 'planet', 'briefing')) not valid;
alter table public.saved_discoveries drop constraint if exists saved_discoveries_title_length_check;
alter table public.saved_discoveries add constraint saved_discoveries_title_length_check
  check (char_length(title) between 1 and 240) not valid;
alter table public.saved_discoveries drop constraint if exists saved_discoveries_metadata_object_check;
alter table public.saved_discoveries add constraint saved_discoveries_metadata_object_check
  check (jsonb_typeof(metadata) = 'object') not valid;

alter table public.mission_control_layouts drop constraint if exists mission_control_layout_array_check;
alter table public.mission_control_layouts add constraint mission_control_layout_array_check
  check (jsonb_typeof(layout) = 'array' and jsonb_array_length(layout) <= 16) not valid;

drop policy if exists "Users can delete their own mission control layout" on public.mission_control_layouts;
create policy "Users can delete their own mission control layout"
on public.mission_control_layouts for delete using (auth.uid() = user_id);

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, email, full_name, avatar_url) on table public.profiles to authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;

revoke all on table public.user_preferences from anon, authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;

revoke all on table public.saved_discoveries from anon, authenticated;
grant select, insert, update, delete on table public.saved_discoveries to authenticated;

revoke all on table public.mission_control_layouts from anon, authenticated;
grant select, insert, update, delete on table public.mission_control_layouts to authenticated;
