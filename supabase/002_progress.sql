-- Danışan gelişim takibi: ölçümler ve önce/sonra fotoğrafları
-- Supabase Dashboard > SQL Editor'e yapıştırıp bir kez çalıştırın.

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(5, 1),
  body_fat numeric(4, 1),
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  arm_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  thigh_cm numeric(5, 1),
  notes text,
  photo_path text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists measurements_client_idx on public.measurements (client_id, measured_at);

alter table public.measurements enable row level security;

drop policy if exists measurements_select on public.measurements;
drop policy if exists measurements_insert on public.measurements;
drop policy if exists measurements_update on public.measurements;
drop policy if exists measurements_delete on public.measurements;
create policy measurements_select on public.measurements for select to authenticated using (is_staff());
create policy measurements_insert on public.measurements for insert to authenticated with check (is_staff());
create policy measurements_update on public.measurements for update to authenticated using (is_staff()) with check (is_staff());
create policy measurements_delete on public.measurements for delete to authenticated using (is_staff());

-- Fotoğraflar herkese açık OLMAYAN bir bucket'ta tutulur; sadece ekip görebilir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists progress_photos_select on storage.objects;
drop policy if exists progress_photos_insert on storage.objects;
drop policy if exists progress_photos_update on storage.objects;
drop policy if exists progress_photos_delete on storage.objects;
create policy progress_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and public.is_staff());
create policy progress_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and public.is_staff());
create policy progress_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos' and public.is_staff());
create policy progress_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and public.is_staff());
