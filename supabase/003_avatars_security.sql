-- Profil fotoğrafları + güvenlik sıkılaştırmaları
-- Supabase Dashboard > SQL Editor'e yapıştırıp bir kez çalıştırın.

-- ─── Profil fotoğrafı ───────────────────────────────────────

alter table public.profiles add column if not exists avatar_path text;

-- Profil fotoğrafları uygulamanın her yerinde göründüğü için okuması açık bir bucket'ta;
-- dosya adları tahmin edilemez (rastgele uuid). Yükleme/silme sadece ekipte.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Herkes sadece kendi klasörüne (kullanıcı id'si) yazabilir; yönetici herkesinkine.
drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_staff());
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_staff()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.is_staff()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.is_staff()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Eğitmenler profil tablosunu güncelleyemez (rol yükseltmesini önlemek için);
-- fotoğrafı yalnızca bu fonksiyonla, sadece avatar alanını değiştirerek ayarlarlar.
create or replace function public.set_avatar(p_user uuid, p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_staff() and (p_user = auth.uid() or is_admin())) then
    raise exception 'Bu işlem için yetkiniz yok' using errcode = '42501';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> p_user::text then
    raise exception 'Geçersiz dosya yolu';
  end if;
  update profiles set avatar_path = p_path where id = p_user;
end;
$$;

revoke execute on function public.set_avatar(uuid, text) from public, anon;
grant execute on function public.set_avatar(uuid, text) to authenticated;

-- ─── Güvenlik: en az bir aktif yönetici her zaman kalmalı ──

create or replace function public.ensure_active_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where role = 'admin' and is_active) then
    raise exception 'En az bir aktif yönetici kalmalı';
  end if;
  return null;
end;
$$;

drop trigger if exists ensure_active_admin on public.profiles;
create trigger ensure_active_admin after update or delete on public.profiles
  for each statement execute function public.ensure_active_admin();

-- ─── Güvenlik: "oluşturan" alanı istemciden taklit edilemesin ──

create or replace function public.set_created_by() returns trigger
language plpgsql as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_created_by on public.appointments;
create trigger set_created_by before insert on public.appointments
  for each row execute function public.set_created_by();
drop trigger if exists set_created_by on public.measurements;
create trigger set_created_by before insert on public.measurements
  for each row execute function public.set_created_by();

-- ─── Güvenlik: şifreler en az 8 karakter ────────────────────

create or replace function public.admin_create_user(
  p_email text, p_password text, p_full_name text,
  p_role text default 'trainer', p_color text default '#d4ff3a'
) returns uuid
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not is_admin() then raise exception 'Bu işlem için yetkiniz yok' using errcode = '42501'; end if;
  if coalesce(length(p_password), 0) < 8 then raise exception 'Şifre en az 8 karakter olmalı'; end if;
  if p_role not in ('admin', 'trainer') then raise exception 'Geçersiz rol'; end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Bu kullanıcı adı zaten kayıtlı';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_full_name),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  insert into profiles (id, full_name, email, role, color)
  values (v_id, trim(p_full_name), v_email, p_role, coalesce(p_color, '#d4ff3a'));

  return v_id;
end;
$$;

create or replace function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not is_admin() then raise exception 'Bu işlem için yetkiniz yok' using errcode = '42501'; end if;
  if coalesce(length(p_password), 0) < 8 then raise exception 'Şifre en az 8 karakter olmalı'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
  where id = p_user;
end;
$$;
