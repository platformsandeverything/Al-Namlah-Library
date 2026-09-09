alter table public.profiles
  add column if not exists grade text;

alter table public.profiles
  drop constraint if exists profiles_grade_check;

alter table public.profiles
  add constraint profiles_grade_check
  check (grade is null or grade in ('first', 'second', 'third'));

create table if not exists public.app_settings (
  key text primary key,
  value_timestamptz timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value_timestamptz)
values (
  'weekly_last_reset',
  ((date_trunc('week', timezone('Asia/Riyadh', now()) - interval '3 days') + interval '3 days') at time zone 'Asia/Riyadh')
)
on conflict (key) do nothing;

create or replace function public.refresh_weekly_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cycle_start timestamptz := ((date_trunc('week', timezone('Asia/Riyadh', now()) - interval '3 days') + interval '3 days') at time zone 'Asia/Riyadh');
  last_reset timestamptz;
begin
  select value_timestamptz into last_reset
  from public.app_settings
  where key = 'weekly_last_reset'
  for update;

  if last_reset is null then
    insert into public.app_settings (key, value_timestamptz)
    values ('weekly_last_reset', cycle_start)
    on conflict (key) do update
      set value_timestamptz = excluded.value_timestamptz, updated_at = now();
    return;
  end if;

  if last_reset < cycle_start then
    update public.profiles
    set points = 0, pages_week = 0
    where role = 'student';

    update public.app_settings
    set value_timestamptz = cycle_start, updated_at = now()
    where key = 'weekly_last_reset';
  end if;
end;
$$;

revoke all on function public.refresh_weekly_scores() from public;
grant execute on function public.refresh_weekly_scores() to authenticated;

create or replace function public.admin_set_student_grade(account_phone text, new_grade text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  phone_digits text := regexp_replace(account_phone, '[^0-9]', '', 'g');
  local_phone text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'هذه العملية للمشرف فقط';
  end if;
  if new_grade not in ('first', 'second', 'third') then
    raise exception 'اختر صفًا دراسيًا صحيحًا';
  end if;

  local_phone := case
    when phone_digits like '9665%' then '0' || substr(phone_digits, 4)
    when phone_digits like '5%' then '0' || phone_digits
    else phone_digits
  end;

  update public.profiles
  set grade = new_grade,
      weekly_target = case new_grade when 'first' then 50 when 'second' then 75 else 100 end
  where regexp_replace(phone, '[^0-9]', '', 'g') = local_phone and role = 'student';

  if not found then raise exception 'لم يتم العثور على حساب الطالب'; end if;
end;
$$;

revoke all on function public.admin_set_student_grade(text, text) from public;
grant execute on function public.admin_set_student_grade(text, text) to authenticated;

create or replace function public.admin_update_account(
  target_user_id uuid,
  new_name text,
  new_phone text,
  new_role text,
  new_grade text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  phone_digits text := regexp_replace(new_phone, '[^0-9]', '', 'g');
  local_phone text;
  old_grade text;
  old_role text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'هذه العملية للمشرف فقط';
  end if;
  if target_user_id = auth.uid() and new_role <> 'admin' then
    raise exception 'لا يمكنك تحويل حسابك الحالي من مشرف إلى طالب';
  end if;
  if length(trim(new_name)) < 3 then raise exception 'اكتب الاسم بشكل صحيح'; end if;
  if new_role not in ('student', 'admin') then raise exception 'نوع الحساب غير صحيح'; end if;
  if new_role = 'student' and new_grade not in ('first', 'second', 'third') then
    raise exception 'اختر الصف الدراسي للطالب';
  end if;

  local_phone := case
    when phone_digits like '9665%' then '0' || substr(phone_digits, 4)
    when phone_digits like '5%' then '0' || phone_digits
    else phone_digits
  end;
  if local_phone !~ '^05[0-9]{8}$' then raise exception 'رقم الجوال غير صحيح'; end if;

  select grade, role into old_grade, old_role from public.profiles where id = target_user_id;
  if not found then raise exception 'الحساب غير موجود'; end if;

  update auth.users
  set email = local_phone || '@students.alnamlah.local',
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', trim(new_name), 'phone', local_phone, 'role', new_role, 'grade', new_grade),
      updated_at = now()
  where id = target_user_id;

  update public.profiles
  set name = trim(new_name),
      phone = local_phone,
      role = new_role,
      grade = case when new_role = 'student' then new_grade else null end,
      weekly_target = case
        when new_role = 'admin' then weekly_target
        when old_role is distinct from 'student' or old_grade is distinct from new_grade or weekly_target is null
          then case new_grade when 'first' then 50 when 'second' then 75 else 100 end
        else weekly_target
      end
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_update_account(uuid, text, text, text, text) from public;
grant execute on function public.admin_update_account(uuid, text, text, text, text) to authenticated;
