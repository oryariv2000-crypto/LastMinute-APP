-- ============================================================================
-- support_tickets.sql — help & support tickets for both B2C and B2B users.
--
-- Any signed-in user can open a ticket and see their own tickets. The support
-- team (an email allowlist) can see and triage ALL tickets.
--
-- ⚠️ Set your support/admin email(s) in the ADMIN check below (used in 3 RLS
-- policies). Add more with: auth.email() in ('a@x.com','b@x.com').
--
-- Run this in the Supabase SQL editor after align_schema.sql.
-- ============================================================================

create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text,                              -- 'customer' | 'business_owner'
  category     text not null default 'question',  -- 'bug' | 'question' | 'request'
  priority     text not null default 'normal',    -- 'low' | 'normal' | 'high'
  subject      text not null,
  description  text not null,
  contact      text,                              -- phone/email for callback
  screenshot_url text,
  status       text not null default 'new',       -- 'new' | 'in_progress' | 'resolved'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists support_tickets_user_idx   on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

alter table public.support_tickets enable row level security;

-- Submitter can create their own tickets.
drop policy if exists "tickets: insert own" on public.support_tickets;
create policy "tickets: insert own" on public.support_tickets
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Submitter sees their own; the support team sees everything.
drop policy if exists "tickets: read own or admin" on public.support_tickets;
create policy "tickets: read own or admin" on public.support_tickets
  for select to authenticated
  using (auth.uid() = user_id or auth.email() = 'oryariv2000@gmail.com');

-- Only the support team can triage (status / category / priority).
drop policy if exists "tickets: admin update" on public.support_tickets;
create policy "tickets: admin update" on public.support_tickets
  for update to authenticated
  using (auth.email() = 'oryariv2000@gmail.com')
  with check (auth.email() = 'oryariv2000@gmail.com');

-- Keep updated_at fresh on every change.
create or replace function public.touch_support_ticket()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists support_tickets_touch on public.support_tickets;
create trigger support_tickets_touch
  before update on public.support_tickets
  for each row execute function public.touch_support_ticket();

notify pgrst, 'reload schema';
