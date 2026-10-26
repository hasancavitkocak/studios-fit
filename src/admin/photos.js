import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const PHOTO_BUCKET = 'progress-photos'

// Telefondan gelen büyük fotoğrafları yüklemeden önce küçültür (en uzun kenar 1280px, JPEG).
export async function compressImage(file, max = 1280, quality = 0.82) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob || file
  } catch {
    return file
  }
}

export async function uploadPhoto(clientId, file) {
  const blob = await compressImage(file)
  const path = `${clientId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export function removePhoto(path) {
  return path ? supabase.storage.from(PHOTO_BUCKET).remove([path]) : Promise.resolve()
}

// Özel bucket'taki fotoğraflar için 1 saatlik imzalı adresler üretir.
export function usePhotoUrls(paths) {
  const [urls, setUrls] = useState({})
  const key = paths.filter(Boolean).join('|')

  useEffect(() => {
    const list = key ? key.split('|') : []
    if (!list.length) return
    supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(list, 3600)
      .then(({ data }) => {
        if (data) setUrls(Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])))
      })
  }, [key])

  return urls
}

// ─── Profil fotoğrafları (açık "avatars" bucket'ı) ──────────

export function avatarUrl(path) {
  return path ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : null
}

// Ortadan kare kırpıp 512px JPEG'e çevirir.
async function squareImage(file, size = 512) {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(size, side)
  canvas
    .getContext('2d')
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

export async function setAvatar(person, file) {
  let path = null
  if (file) {
    const blob = await squareImage(file)
    path = `${person.id}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg' })
    if (error) throw error
  }
  const { error } = await supabase.rpc('set_avatar', { p_user: person.id, p_path: path })
  if (error) throw error
  if (person.avatar_path) await supabase.storage.from('avatars').remove([person.avatar_path])
}
