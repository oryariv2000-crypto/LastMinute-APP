-- ============================================================================
-- LastMinute — Backfill: ליצור פרופילים/עסקים למשתמשים שכבר קיימים ב-auth.users
-- להריץ אחרי align_schema.sql.
-- ============================================================================

-- 1. פרופילים חסרים ב-public.users (תפקיד לפי אימייל — ערוך אם צריך).
insert into public.users (id, email, full_name, role)
select a.id, a.email,
  case a.email
    when 'daniel@bakery.com' then 'Daniel'
    when 'michal@neeman.com' then 'Michal Neeman'
    else 'Eli Cohen'
  end,
  case
    when a.email in ('daniel@bakery.com', 'michal@neeman.com') then 'business_owner'
    else 'customer'
  end
from auth.users a
where not exists (select 1 from public.users p where p.id = a.id);

-- 2. עסקים לבעלי עסק (עמודת הבעלים = user_id).
insert into public.businesses (user_id, name, address)
select u.id,
  case u.email when 'daniel@bakery.com' then 'Daniel Bakery' else 'מאפיית מיכל' end,
  ''
from public.users u
where u.role = 'business_owner'
  and not exists (select 1 from public.businesses b where b.user_id = u.id);

-- 3. אישור אימיילים שלא אושרו (כדי שיוכלו להתחבר).
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;

-- 4. אימות.
select a.email, (p.id is not null) as has_profile, p.role
from auth.users a left join public.users p on p.id = a.id
order by a.created_at;
