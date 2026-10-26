import { useState } from 'react'
import { LuCheck, LuX, LuUserX, LuPencil, LuTrash2, LuPhone, LuMessageCircle, LuClock, LuCalendar, LuDumbbell, LuRotateCcw, LuBellRing } from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import Sheet from './Sheet'
import { Avatar, StatusPill } from './ui'
import { fmtLong, fmtTime, endTime, reminderText, waLink } from '../utils'

export default function AppointmentDetail({ appt }) {
  const { clientsById, staffById, open, close, bump, toast } = useAdmin()
  const [status, setStatus] = useState(appt.status)
  const [busy, setBusy] = useState(false)
  const client = clientsById[appt.client_id]
  const trainer = staffById[appt.trainer_id]

  async function changeStatus(next) {
    setBusy(true)
    const { error } = await supabase.from('appointments').update({ status: next }).eq('id', appt.id)
    setBusy(false)
    if (error) return toast(errorText(error), 'err')
    setStatus(next)
    bump()
    toast('Durum güncellendi')
  }

  async function remove() {
    if (!window.confirm('Bu randevu kalıcı olarak silinsin mi?')) return
    const { error } = await supabase.from('appointments').delete().eq('id', appt.id)
    if (error) return toast(errorText(error), 'err')
    bump()
    toast('Randevu silindi')
    close()
  }

  return (
    <Sheet title="Randevu" onClose={close}>
      <div className="detail-head">
        <Avatar name={client?.full_name} color={trainer?.color} size={56} />
        <div>
          <strong className="detail-name">{client?.full_name || 'Danışan'}</strong>
          <StatusPill status={status} />
        </div>
      </div>

      {client?.phone && status === 'scheduled' && (
        <a
          className="btn btn-primary btn-block"
          href={waLink(client.phone, reminderText(appt, client, trainer))}
          target="_blank"
          rel="noreferrer"
        >
          <LuBellRing /> WhatsApp ile hatırlat
        </a>
      )}
      {client && !client.phone && (
        <p className="muted small">Hatırlatma göndermek için danışanın telefon numarasını ekleyin.</p>
      )}

      {client?.phone && (
        <div className="quick-actions">
          <a className="btn btn-ghost" href={`tel:${client.phone}`}>
            <LuPhone /> Ara
          </a>
          <a className="btn btn-ghost" href={waLink(client.phone)} target="_blank" rel="noreferrer">
            <LuMessageCircle /> WhatsApp
          </a>
        </div>
      )}

      <ul className="info-list">
        <li>
          <LuCalendar /> {fmtLong(appt.starts_at)}
        </li>
        <li>
          <LuClock /> {fmtTime(appt.starts_at)} – {fmtTime(endTime(appt))} · {appt.duration_min} dk
        </li>
        {trainer && (
          <li>
            <LuDumbbell /> {trainer.full_name}
          </li>
        )}
      </ul>

      {appt.notes && <p className="note">{appt.notes}</p>}

      <span className="section-label">Durumu işaretle</span>
      <div className="status-actions">
        {status !== 'completed' && (
          <button className="btn btn-success" disabled={busy} onClick={() => changeStatus('completed')}>
            <LuCheck /> Tamamlandı
          </button>
        )}
        {status !== 'no_show' && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => changeStatus('no_show')}>
            <LuUserX /> Gelmedi
          </button>
        )}
        {status !== 'cancelled' && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => changeStatus('cancelled')}>
            <LuX /> İptal et
          </button>
        )}
        {status !== 'scheduled' && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => changeStatus('scheduled')}>
            <LuRotateCcw /> Planlandıya al
          </button>
        )}
      </div>

      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={() => open('appt-form', { appt: { ...appt, status } })}>
          <LuPencil /> Düzenle
        </button>
        <button className="btn btn-danger-ghost" onClick={remove}>
          <LuTrash2 /> Sil
        </button>
      </div>
    </Sheet>
  )
}
