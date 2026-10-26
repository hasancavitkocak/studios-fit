import { useState } from 'react'
import { LuLogOut, LuKeyRound, LuSmartphone } from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import Sheet from './Sheet'
import { Field, Spinner } from './ui'
import AvatarPicker from './AvatarPicker'
import { displayLogin, roleLabel } from '../utils'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export default function ProfileSheet() {
  const { me, close, toast } = useAdmin()
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function changePassword(e) {
    e.preventDefault()
    if (password.length < 8) return toast('Şifre en az 8 karakter olmalı.', 'err')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) return toast(errorText(error), 'err')
    setPassword('')
    toast('Şifren güncellendi')
  }

  return (
    <Sheet title="Profil" onClose={close}>
      <div className="profile-head">
        <AvatarPicker person={me} />
        <strong className="detail-name">{me.full_name}</strong>
        <span className="muted small">
          {displayLogin(me.email)} · {roleLabel(me)}
        </span>
      </div>

      <form className="form" onSubmit={changePassword}>
        <Field label="Şifreni değiştir">
          <div className="inline-form">
            <label className="input-icon">
              <LuKeyRound />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Yeni şifre" autoComplete="new-password" />
            </label>
            <button className="btn btn-ghost" disabled={saving || !password}>
              {saving ? <Spinner /> : 'Güncelle'}
            </button>
          </div>
        </Field>
      </form>

      {!isStandalone() && (
        <div className="tip">
          <LuSmartphone />
          <p>
            <strong>Uygulama gibi kullan:</strong> iPhone'da Safari'de <em>Paylaş → Ana Ekrana Ekle</em>, Android'de Chrome menüsünden{' '}
            <em>Ana ekrana ekle</em> seçeneğine dokun.
          </p>
        </div>
      )}

      <button className="btn btn-danger-ghost btn-block" onClick={() => supabase.auth.signOut()}>
        <LuLogOut /> Çıkış yap
      </button>
    </Sheet>
  )
}
