import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sfit-admin-auth' } },
)

// Supabase hata mesajlarını kullanıcıya gösterilebilir Türkçe metne çevirir.
export function errorText(error) {
  if (!error) return ''
  const msg = error.message || String(error)
  if (/Invalid login credentials/i.test(msg)) return 'Kullanıcı adı veya şifre hatalı.'
  if (/Email not confirmed/i.test(msg)) return 'E-posta adresi doğrulanmamış.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Bağlantı hatası. İnternetinizi kontrol edin.'
  if (/row-level security|permission denied/i.test(msg)) return 'Bu işlem için yetkiniz yok.'
  if (/Password should be at least/i.test(msg)) return 'Şifre en az 8 karakter olmalı.'
  if (/Bucket not found/i.test(msg) || /column .* does not exist|Could not find the (table|function)/i.test(msg))
    return 'Veritabanı kurulumu eksik: Supabase SQL dosyası henüz çalıştırılmamış olabilir.'
  if (/exceeded the maximum allowed size|Payload too large/i.test(msg)) return 'Fotoğraf çok büyük.'
  if (/mime type .* is not supported/i.test(msg)) return 'Bu dosya türü desteklenmiyor. JPG veya PNG seçin.'
  return msg
}
