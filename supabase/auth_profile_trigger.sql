-- auth_profile_trigger.sql — create the public.users profile row automatically
-- whenever an auth user signs up. This makes signup work even with email
-- confirmation ON (the client has no session yet, so a client-side insert would
-- be blocked by RLS). full_name + role come from the signUp metadata.
-- Run in Supabase → SQL Editor. Idempotent.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;  -- safe if a profile already exists
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
