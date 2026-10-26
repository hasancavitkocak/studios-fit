import { useState } from 'react'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import Sheet from './Sheet'
import { Field, Segmented, Spinner } from './ui'
import { isTrainer, SPECIALTIES, DURATIONS, addDays, toDateInput, toTimeInput, fromInputs, endTime, fmtTime } from '../utils'

const NEW_CLIENT = '__new'

function defaultStart(date) {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  if (date) {
    const x = new Date(date)
    x.setHours(Math.min(Math.max(d.getHours(), 7), 21), 0, 0, 0)
    return x
  }
  return d
}

export default function AppointmentForm({ appt, date, clientId }) {
  const { me, isAdmin, staff, clients, clientsById, reloadClients, bump, toast, close } = useAdmin()
  const editing = Boolean(appt)
  const trainers = staff.filter((s) => s.is_active && isTrainer(s))
  const start = appt ? new Date(appt.starts_at) : defaultStart(date)
  const presetClient = clientsById[clientId]

  const [form, setForm] = useState({
    client_id: appt?.client_id || clientId || '',
    trainer_id:
      appt?.trainer_id ||
      (!isAdmin ? me.id : presetClient?.trainer_id || (isTrainer(me) ? me.id : trainers[0]?.id) || ''),
    date: toDateInput(start),
    time: toTimeInput(start),
    duration_min: appt?.duration_min || 60,
    repeat: 0,
    notes: appt?.notes || '',
    new_name: '',
    new_phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  const activeClients = clients.filter((c) => c.is_active || c.id === form.client_id)

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!form.trainer_id) return setError('Önce Ekip sekmesinden bir eğitmen ekleyin.')
    if (!form.client_id) return setError('Lütfen bir danışan seçin.')
    if (form.client_id === NEW_CLIENT && !form.new_name.trim()) return setError('Yeni danışanın adını girin.')

    const startsAt = fromInputs(form.date, form.time)
    const candidate = { starts_at: startsAt.toISOString(), duration_min: Number(form.duration_min) }
    setSaving(true)

    // Aynı eğitmenün o gün çakışan seansı var mı?
    const { data: sameDay } = await supabase
      .from('appointments')
      .select('id, starts_at, duration_min, client_id')
      .eq('trainer_id', form.trainer_id)
      .eq('status', 'scheduled')
      .gte('starts_at', addDays(startsAt, -1).toISOString())
      .lt('starts_at', addDays(startsAt, 1).toISOString())
    const clash = (sameDay || []).find(
      (a) => a.id !== appt?.id && new Date(a.starts_at) < endTime(candidate) && endTime(a) > startsAt,
    )
    if (
      clash &&
      !window.confirm(
        `Bu saatte ${clientsById[clash.client_id]?.full_name || 'başka bir danışan'} ile ${fmtTime(clash.starts_at)} seansı çakışıyor. Yine de kaydedilsin mi?`,
      )
    ) {
      setSaving(false)
      return
    }

    let clientIdToUse = form.client_id
    if (clientIdToUse === NEW_CLIENT) {
      const { data, error } = await supabase
        .from('clients')
        .insert({ full_name: form.new_name.trim(), phone: form.new_phone.trim() || null, trainer_id: form.trainer_id })
        .select()
        .single()
      if (error) {
        setSaving(false)
        return setError(errorText(error))
      }
      clientIdToUse = data.id
      reloadClients()
    }

    const payload = {
      client_id: clientIdToUse,
      trainer_id: form.trainer_id,
      duration_min: Number(form.duration_min),
      notes: form.notes.trim() || null,
    }

    let result
    if (editing) {
      result = await supabase.from('appointments').update({ ...payload, starts_at: candidate.starts_at }).eq('id', appt.id)
    } else {
      const rows = Array.from({ length: Number(form.repeat) + 1 }, (_, i) => ({
        ...payload,
        starts_at: addDays(startsAt, i * 7).toISOString(),
      }))
      result = await supabase.from('appointments').insert(rows)
    }

    setSaving(false)
    if (result.error) return setError(errorText(result.error))
    toast(editing ? 'Randevu güncellendi' : form.repeat > 0 ? `${Number(form.repeat) + 1} randevu oluşturuldu` : 'Randevu oluşturuldu')
    bump()
    close()
  }

  return (
    <Sheet
      title={editing ? 'Randevuyu düzenle' : 'Yeni randevu'}
      onClose={close}
      footer={
        <button className="btn btn-primary btn-block btn-lg" form="appt-form" disabled={saving}>
          {saving ? <Spinner /> : editing ? 'Kaydet' : 'Randevu oluştur'}
        </button>
      }
    >
      <form id="appt-form" className="form" onSubmit={save}>
        <Field label="Danışan">
          <select value={form.client_id} onChange={set('client_id')}>
            <option value="">Seçin…</option>
            <option value={NEW_CLIENT}>+ Yeni danışan ekle</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </Field>

        {form.client_id === NEW_CLIENT && (
          <div className="form-row inset">
            <Field label="Ad Soyad">
              <input value={form.new_name} onChange={set('new_name')} placeholder="Örn. Ayşe Yılmaz" autoFocus />
            </Field>
            <Field label="Telefon">
              <input value={form.new_phone} onChange={set('new_phone')} placeholder="05xx xxx xx xx" inputMode="tel" />
            </Field>
          </div>
        )}

        {isAdmin && (
          <Field label="Eğitmen">
            <select value={form.trainer_id} onChange={set('trainer_id')}>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                  {t.specialty ? ` · ${SPECIALTIES[t.specialty]}` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="form-row">
          <Field label="Tarih">
            <input type="date" value={form.date} onChange={set('date')} required />
          </Field>
          <Field label="Saat">
            <input type="time" value={form.time} onChange={set('time')} step="300" required />
          </Field>
        </div>

        <Field label="Süre">
          <Segmented
            options={DURATIONS.map((d) => ({ value: d, label: `${d} dk` }))}
            value={Number(form.duration_min)}
            onChange={set('duration_min')}
          />
        </Field>

        {!editing && (
          <Field label="Haftalık tekrar" hint={form.repeat > 0 ? `Her hafta aynı gün ve saatte, toplam ${Number(form.repeat) + 1} seans.` : null}>
            <Segmented
              options={[
                { value: 0, label: 'Yok' },
                { value: 3, label: '4 hafta' },
                { value: 7, label: '8 hafta' },
                { value: 11, label: '12 hafta' },
              ]}
              value={Number(form.repeat)}
              onChange={set('repeat')}
            />
          </Field>
        )}

        <Field label="Not">
          <textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Program, hedef, hatırlatma…" />
        </Field>

        {error && <div className="form-error">{error}</div>}
      </form>
    </Sheet>
  )
}
