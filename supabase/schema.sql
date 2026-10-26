-- Studio S-Fit yönetim paneli şeması
-- Supabase Dashboard > SQL Editor'e yapıştırıp bir kez çalıştırın.

create extension if not exists pgcrypto with schema extensions;

-- ─── Tablolar ───────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'trainer' check (role in ('admin', 'trainer')),
  color text not null default '#d4ff3a',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  notes text,
  package_sessions int check (package_sessions is null or package_sessions >= 0),
  trainer_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 5 and 600),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists appointments_starts_at_idx on public.appointments (starts_at);
create index if not exists appointments_trainer_idx on public.appointments (trainer_id, starts_at);
create index if not exists appointments_client_idx on public.appointments (client_id);

-- ─── Yetki yardımcıları ─────────────────────────────────────

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active and role = 'admin');
$$;

-- ─── RLS ────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (is_staff() or id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;
create policy clients_select on public.clients for select to authenticated using (is_staff());
create policy clients_insert on public.clients for insert to authenticated with check (is_staff());
create policy clients_update on public.clients for update to authenticated using (is_staff()) with check (is_staff());
create policy clients_delete on public.clients for delete to authenticated using (is_admin());

-- Antrenör yalnızca kendi randevularını görür/yönetir, admin hepsini.
drop policy if exists appointments_select on public.appointments;
drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;
drop policy if exists appointments_delete on public.appointments;
create policy appointments_select on public.appointments for select to authenticated
  using (is_admin() or (is_staff() and trainer_id = auth.uid()));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (is_admin() or (is_staff() and trainer_id = auth.uid()));
create policy appointments_update on public.appointments for update to authenticated
  using (is_admin() or (is_staff() and trainer_id = auth.uid()))
  with check (is_admin() or (is_staff() and trainer_id = auth.uid()));
create policy appointments_delete on public.appointments for delete to authenticated
  using (is_admin() or (is_staff() and trainer_id = auth.uid()));

-- ─── Danışan seans sayıları (tüm antrenörler üzerinden) ─────

create or replace function public.client_session_counts()
returns table (client_id uuid, completed bigint, upcoming bigint, last_session timestamptz)
language sql stable security definer set search_path = public as $$
  select a.client_id,
         count(*) filter (where a.status = 'completed'),
         count(*) filter (where a.status = 'scheduled' and a.starts_at >= now()),
         max(a.starts_at) filter (where a.status = 'completed')
  from appointments a
  where is_staff()
  group by a.client_id;
$$;

-- ─── Admin kullanıcı yönetimi ───────────────────────────────

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
  if coalesce(length(p_password), 0) < 6 then raise exception 'Şifre en az 6 karakter olmalı'; end if;
  if p_role not in ('admin', 'trainer') then raise exception 'Geçersiz rol'; end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Bu e-posta zaten kayıtlı';
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
  if coalesce(length(p_password), 0) < 6 then raise exception 'Şifre en az 6 karakter olmalı'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
  where id = p_user;
end;
$$;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'Bu işlem için yetkiniz yok' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'Kendi hesabınızı silemezsiniz'; end if;
  delete from auth.users where id = p_user;
end;
$$;

revoke execute on function public.admin_create_user(text, text, text, text, text) from public, anon;
revoke execute on function public.admin_set_password(uuid, text) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
revoke execute on function public.client_session_counts() from public, anon;
grant execute on function public.admin_create_user(text, text, text, text, text) to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.client_session_counts() to authenticated;

-- ─── Realtime (randevu değişiklikleri anında yansısın) ──────

do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception when duplicate_object then null;
end $$;

-- ─── Eğitmen branşı (Gym / Pilates) ─────────────────────────

alter table public.profiles add column if not exists specialty text
  check (specialty is null or specialty in ('gym', 'pilates'));
