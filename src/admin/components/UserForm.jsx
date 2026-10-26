import { useState } from 'react'
import { LuTrash2, LuKeyRound } from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import Sheet from './Sheet'
import { Field, Segmented, Spinner } from './ui'
import AvatarPicker from './AvatarPicker'
import { TRAINER_COLORS, SPECIALTIES, toLoginEmail, displayLogin } from '../utils'

export default function UserForm({ user }) {
  const { me, staffById, reloadStaff, bump, toast, close } = useAdmin()
  const editing = Boolean(user)
  const isSelf = user?.id === me.id
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: displayLogin(user?.email),
    specialty: user ? user.specialty || 'none' : 'gym',
    password: '',
    role: user?.role || 'trainer',
    color: user?.color || TRAINER_COLORS[1],
    is_active: user?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim()) return setError('Ad soyad gerekli.')
    if (!editing && !/^[a-z0-9._-]+(@[^\s@]+\.[^\s@]+)?$/i.test(form.email.trim()))
      return setError('Kullanıcı adında sadece İngilizce harf, rakam, nokta, tire kullanın (örn. furkan).')
    if ((!editing || form.password) && form.password.length < 8) return setError('Şifre en az 8 karakter olmalı.')
    setSaving(true)

    // Eğitmenin branşı zorunlu; yönetici için "Yok" seçilebilir.
    const specialty = form.specialty === 'none' ? (form.role === 'trainer' ? 'gym' : null) : form.specialty
    let error
    if (editing) {
      ;({ error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          role: form.role,
          color: form.color,
          is_active: form.is_active,
          specialty,
        })
        .eq('id', user.id))
      if (!error && form.password) {
        ;({ error } = await supabase.rpc('admin_set_password', { p_user: user.id, p_password: form.password }))
      }
    } else {
      let id
      ;({ data: id, error } = await supabase.rpc('admin_create_user', {
        p_email: toLoginEmail(form.email),
        p_password: form.password,
        p_full_name: form.full_name,
        p_role: form.role,
        p_color: form.color,
      }))
      if (!error && specialty) {
        ;({ error } = await supabase.from('profiles').update({ specialty }).eq('id', id))
      }
    }

    setSaving(false)
    if (error) return setError(errorText(error))
    await reloadStaff()
    bump()
    toast(editing ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu')
    close()
  }

  async function remove() {
    if (!window.confirm(`${user.full_name} hesabı ve tüm randevuları kalıcı olarak silinsin mi? Bunun yerine pasifleştirmeyi düşünebilirsiniz.`)) return
    const { error } = await supabase.rpc('admin_delete_user', { p_user: user.id })
    if (error) return toast(errorText(error), 'err')
    await reloadStaff()
    bump()
    toast('Kullanıcı silindi')
    close()
  }

  return (
    <Sheet
      title={editing ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı'}
      onClose={close}
      footer={
        <button className="btn btn-primary btn-block btn-lg" form="user-form" disabled={saving}>
          {saving ? <Spinner /> : editing ? 'Kaydet' : 'Kullanıcı oluştur'}
        </button>
      }
    >
      <form id="user-form" className="form" onSubmit={save} autoComplete="off">
        {editing && staffById[user.id] && <AvatarPicker person={staffById[user.id]} />}
        <Field label="Ad Soyad">
          <input value={form.full_name} onChange={set('full_name')} placeholder="Örn. Furkan" required />
        </Field>
        <Field label="Kullanıcı adı" hint={editing ? 'Kullanıcı adı değiştirilemez.' : 'Giriş için kullanılacak, örn. furkan'}>
          <input
            value={form.email}
            onChange={set('email')}
            disabled={editing}
            required
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder="furkan"
          />
        </Field>
        <Field label={editing ? 'Yeni şifre' : 'Şifre'} hint={editing ? 'Değiştirmek istemiyorsanız boş bırakın.' : 'En az 8 karakter.'}>
          <label className="input-icon">
            <LuKeyRound />
            <input type="text" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="••••••" />
          </label>
        </Field>
        {!isSelf && (
          <Field label="Rol">
            <Segmented
              options={[
                { value: 'trainer', label: 'Eğitmen' },
                { value: 'admin', label: 'Yönetici' },
              ]}
              value={form.role}
              onChange={set('role')}
            />
          </Field>
        )}
        <Field label="Branş" hint={form.role === 'admin' ? 'Branş seçilirse yönetici aynı zamanda eğitmen olarak randevu alır.' : null}>
          <Segmented
            options={[
              ...Object.entries(SPECIALTIES).map(([value, s]) => ({ value, label: s.label })),
              ...(form.role === 'admin' ? [{ value: 'none', label: 'Yok' }] : []),
            ]}
            value={form.role === 'trainer' && form.specialty === 'none' ? 'gym' : form.specialty}
            onChange={set('specialty')}
          />
        </Field>
        <Field label="Takvim rengi">
          <div className="swatches">
            {TRAINER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${form.color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => set('color')(c)}
                aria-label={c}
              />
            ))}
          </div>
        </Field>
        {editing && !isSelf && (
          <Field label="Hesap durumu" hint="Pasif kullanıcılar panele giriş yapamaz.">
            <Segmented
              options={[
                { value: true, label: 'Aktif' },
                { value: false, label: 'Pasif' },
              ]}
              value={form.is_active}
              onChange={set('is_active')}
            />
          </Field>
        )}
        {error && <div className="form-error">{error}</div>}
        {editing && !isSelf && (
          <button type="button" className="btn btn-danger-ghost btn-block" onClick={remove}>
            <LuTrash2 /> Kullanıcıyı sil
          </button>
        )}
      </form>
    </Sheet>
  )
}
