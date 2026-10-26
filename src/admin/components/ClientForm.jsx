import { useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import Sheet from './Sheet'
import { Field, Segmented, Spinner } from './ui'
import { isTrainer } from '../utils'

export default function ClientForm({ client }) {
  const { me, isAdmin, staff, reloadClients, bump, toast, close, open } = useAdmin()
  const editing = Boolean(client)
  const [form, setForm] = useState({
    full_name: client?.full_name || '',
    phone: client?.phone || '',
    email: client?.email || '',
    package_sessions: client?.package_sessions ?? '',
    trainer_id: client?.trainer_id || (isAdmin ? '' : me.id),
    notes: client?.notes || '',
    is_active: client?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  async function save(e) {
    e.preventDefault()
    if (!form.full_name.trim()) return setError('Ad soyad gerekli.')
    setSaving(true)
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      package_sessions: form.package_sessions === '' ? null : Number(form.package_sessions),
      trainer_id: form.trainer_id || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    }
    const { data, error } = editing
      ? await supabase.from('clients').update(payload).eq('id', client.id).select().single()
      : await supabase.from('clients').insert(payload).select().single()
    setSaving(false)
    if (error) return setError(errorText(error))
    await reloadClients()
    bump()
    toast(editing ? 'Danışan güncellendi' : 'Danışan eklendi')
    open('client', { client: data })
  }

  async function remove() {
    if (!window.confirm(`${client.full_name} ve tüm randevu geçmişi kalıcı olarak silinsin mi? Bunun yerine arşivlemeyi düşünebilirsiniz.`)) return
    const { error } = await supabase.from('clients').delete().eq('id', client.id)
    if (error) return toast(errorText(error), 'err')
    await reloadClients()
    bump()
    toast('Danışan silindi')
    close()
  }

  return (
    <Sheet
      title={editing ? 'Danışanı düzenle' : 'Yeni danışan'}
      onClose={close}
      footer={
        <button className="btn btn-primary btn-block btn-lg" form="client-form" disabled={saving}>
          {saving ? <Spinner /> : 'Kaydet'}
        </button>
      }
    >
      <form id="client-form" className="form" onSubmit={save}>
        <Field label="Ad Soyad">
          <input value={form.full_name} onChange={set('full_name')} placeholder="Örn. Ayşe Yılmaz" required />
        </Field>
        <div className="form-row">
          <Field label="Telefon">
            <input value={form.phone} onChange={set('phone')} placeholder="05xx xxx xx xx" inputMode="tel" />
          </Field>
          <Field label="E-posta">
            <input type="email" value={form.email} onChange={set('email')} placeholder="opsiyonel" />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Paket (seans)" hint="Boş bırakılırsa paket takibi yapılmaz.">
            <input type="number" min="0" inputMode="numeric" value={form.package_sessions} onChange={set('package_sessions')} placeholder="Örn. 12" />
          </Field>
          <Field label="Sorumlu eğitmen">
            <select value={form.trainer_id} onChange={set('trainer_id')}>
              <option value="">Atanmadı</option>
              {staff
                .filter((s) => s.is_active && isTrainer(s))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Notlar">
          <textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Hedef, sakatlık, tercihler…" />
        </Field>
        {editing && (
          <Field label="Durum">
            <Segmented
              options={[
                { value: true, label: 'Aktif' },
                { value: false, label: 'Arşiv' },
              ]}
              value={form.is_active}
              onChange={set('is_active')}
            />
          </Field>
        )}
        {error && <div className="form-error">{error}</div>}
        {editing && isAdmin && (
          <button type="button" className="btn btn-danger-ghost btn-block" onClick={remove}>
            <LuTrash2 /> Danışanı sil
          </button>
        )}
      </form>
    </Sheet>
  )
}
