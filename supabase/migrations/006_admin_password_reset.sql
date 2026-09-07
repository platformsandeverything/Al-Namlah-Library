create or replace function public.admin_reset_password(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  temporary_password text := 'Nm!' || substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12);
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'هذه العملية للمشرف فقط';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'لا يمكنك إعادة تعيين كلمة مرور حسابك الحالي من هنا';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'الحساب غير موجود';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(temporary_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;

  update public.profiles
  set must_change_password = true
  where id = target_user_id;

  return temporary_password;
end;
$$;

revoke all on function public.admin_reset_password(uuid) from public;
grant execute on function public.admin_reset_password(uuid) to authenticated;
