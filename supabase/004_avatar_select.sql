-- Profil fotoğrafı değiştirilince eskisinin silinebilmesi için: Supabase Storage'da silme/güncelleme
-- işlemleri dosyayı okuma (SELECT) iznini de gerektirir.
drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_staff());
