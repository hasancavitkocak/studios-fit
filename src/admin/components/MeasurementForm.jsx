import { useState } from 'react'
import { LuCamera, LuTrash2, LuX } from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import { uploadPhoto, removePhoto, usePhotoUrls } from '../photos'
import Sheet from './Sheet'
import { Field, Spinner } from './ui'
import { METRICS, toDateInput } from '../utils'

// "72,5" ve "72.5" ikisini de kabul et
const toNumber = (v) => {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function MeasurementForm({ client, measurement }) {
  const { open, toast } = useAdmin()
  const editing = Boolean(measurement)
  const [form, setForm] = useState(() => ({
    measured_at: measurement?.measured_at || toDateInput(new Date()),
    notes: measurement?.notes || '',
    ...Object.fromEntries(METRICS.map((m) => [m.key, measurement?.[m.key] ?? ''])),
  }))
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dropPhoto, setDropPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const urls = usePhotoUrls([measurement?.photo_path])
  const existingUrl = !dropPhoto && measurement?.photo_path ? urls[measurement.photo_path] : null
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const back = () => open('client', { client, tab: 'progress' })

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearPhoto() {
    setFile(null)
    setPreview(null)
    setDropPhoto(true)
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    const values = Object.fromEntries(METRICS.map((m) => [m.key, toNumber(form[m.key])]))
    if (Object.values(values).every((v) => v === null) && !file && !existingUrl) {
      return setError('En az bir ölçüm ya da fotoğraf girin.')
    }
    setSaving(true)
    try {
      let photo_path = dropPhoto ? null : measurement?.photo_path || null
      if (file) photo_path = await uploadPhoto(client.id, file)
      const payload = { ...values, measured_at: form.measured_at, notes: form.notes.trim() || null, photo_path }
      const { error } = editing
        ? await supabase.from('measurements').update(payload).eq('id', measurement.id)
        : await supabase.from('measurements').insert({ ...payload, client_id: client.id })
      if (error) throw error
      if (measurement?.photo_path && measurement.photo_path !== photo_path) await removePhoto(measurement.photo_path)
      toast(editing ? 'Ölçüm güncellendi' : 'Ölçüm kaydedildi')
      back()
    } catch (err) {
      setError(errorText(err))
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm('Bu ölçüm kaydı silinsin mi?')) return
    const { error } = await supabase.from('measurements').delete().eq('id', measurement.id)
    if (error) return toast(errorText(error), 'err')
    await removePhoto(measurement.photo_path)
    toast('Ölçüm silindi')
    back()
  }

  const shown = preview || existingUrl

  return (
    <Sheet
      title={editing ? 'Ölçümü düzenle' : 'Yeni ölçüm'}
      onClose={back}
      footer={
        <button className="btn btn-primary btn-block btn-lg" form="measure-form" disabled={saving}>
          {saving ? <Spinner /> : 'Kaydet'}
        </button>
      }
    >
      <form id="measure-form" className="form" onSubmit={save}>
        <p className="muted small">{client.full_name} · Boş bıraktığınız alanlar kaydedilmez.</p>
        <Field label="Tarih">
          <input type="date" value={form.measured_at} onChange={set('measured_at')} required />
        </Field>
        <div className="metric-grid">
          {METRICS.map((m) => (
            <Field key={m.key} label={`${m.label} (${m.unit})`}>
              <input inputMode="decimal" value={form[m.key]} onChange={set(m.key)} placeholder="—" />
            </Field>
          ))}
        </div>
        <Field label="Fotoğraf" hint="Önce / sonra karşılaştırması için. Sadece ekip görebilir.">
          {shown ? (
            <div className="photo-preview">
              <img src={shown} alt="Ölçüm fotoğrafı" />
              <button type="button" className="icon-btn" onClick={clearPhoto} aria-label="Fotoğrafı kaldır">
                <LuX />
              </button>
            </div>
          ) : (
            <label className="photo-drop">
              <LuCamera />
              <span>Fotoğraf çek veya seç</span>
              <input type="file" accept="image/*" onChange={pickFile} hidden />
            </label>
          )}
        </Field>
        <Field label="Not">
          <textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Program değişikliği, beslenme…" />
        </Field>
        {error && <div className="form-error">{error}</div>}
        {editing && (
          <button type="button" className="btn btn-danger-ghost btn-block" onClick={remove}>
            <LuTrash2 /> Ölçümü sil
          </button>
        )}
      </form>
    </Sheet>
  )
}
