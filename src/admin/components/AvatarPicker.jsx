import { useState } from 'react'
import { LuCamera, LuTrash2 } from 'react-icons/lu'
import { errorText } from '../supabase'
import { useAdmin } from '../context'
import { setAvatar } from '../photos'
import { Avatar, Spinner } from './ui'

export default function AvatarPicker({ person }) {
  const { reloadStaff, toast } = useAdmin()
  const [busy, setBusy] = useState(false)

  async function apply(file) {
    setBusy(true)
    try {
      await setAvatar(person, file)
      await reloadStaff()
      toast(file ? 'Profil fotoğrafı güncellendi' : 'Profil fotoğrafı kaldırıldı')
    } catch (err) {
      toast(errorText(err), 'err')
    }
    setBusy(false)
  }

  return (
    <div className="avatar-picker">
      <label className="avatar-picker-photo" aria-label="Profil fotoğrafını değiştir">
        <Avatar name={person.full_name} color={person.color} photo={person.avatar_path} size={84} />
        <span className="avatar-picker-badge">{busy ? <Spinner /> : <LuCamera />}</span>
        <input
          type="file"
          accept="image/*"
          hidden
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) apply(file)
          }}
        />
      </label>
      {person.avatar_path && (
        <button type="button" className="link link-muted" disabled={busy} onClick={() => apply(null)}>
          <LuTrash2 /> Fotoğrafı kaldır
        </button>
      )}
    </div>
  )
}
