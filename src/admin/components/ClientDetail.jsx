import { useEffect, useState } from 'react'
import { LuPhone, LuMessageCircle, LuPencil, LuCalendarPlus, LuMail } from 'react-icons/lu'
import { supabase } from '../supabase'
import { useAdmin } from '../context'
import { useSessionCounts } from '../hooks'
import Sheet from './Sheet'
import ProgressTab from './ProgressTab'
import { Avatar, StatusPill, Spinner, PackageProgress, Segmented } from './ui'
import { fmtShort, fmtTime, waLink } from '../utils'

export default function ClientDetail({ client: initial, tab: initialTab = 'general' }) {
  const { clientsById, staffById, open, close, version } = useAdmin()
  const client = clientsById[initial.id] || initial
  const counts = useSessionCounts()
  const count = counts[client.id]
  const [history, setHistory] = useState(null)
  const [tab, setTab] = useState(initialTab)
  const trainer = staffById[client.trainer_id]

  useEffect(() => {
    supabase
      .from('appointments')
      .select('*')
      .eq('client_id', client.id)
      .order('starts_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setHistory(data || []))
  }, [client.id, version])

  return (
    <Sheet title="Danışan" onClose={close}>
      <div className="detail-head">
        <Avatar name={client.full_name} color={trainer?.color} size={56} />
        <div>
          <strong className="detail-name">{client.full_name}</strong>
          <span className="muted small">
            {trainer ? `Eğitmen: ${trainer.full_name}` : 'Eğitmen atanmadı'}
            {!client.is_active && ' · Arşivde'}
          </span>
        </div>
      </div>

      <div className="quick-actions">
        {client.phone && (
          <>
            <a className="btn btn-ghost" href={`tel:${client.phone}`}>
              <LuPhone /> Ara
            </a>
            <a className="btn btn-ghost" href={waLink(client.phone)} target="_blank" rel="noreferrer">
              <LuMessageCircle /> WhatsApp
            </a>
          </>
        )}
        {client.email && (
          <a className="btn btn-ghost" href={`mailto:${client.email}`}>
            <LuMail /> E-posta
          </a>
        )}
      </div>

      <Segmented
        options={[
          { value: 'general', label: 'Genel' },
          { value: 'progress', label: 'Gelişim' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'progress' ? (
        <ProgressTab client={client} />
      ) : (
        <>
          <div className="mini-stats">
            <div>
              <strong>{count?.completed || 0}</strong>
              <span>Tamamlanan</span>
            </div>
            <div>
              <strong>{count?.upcoming || 0}</strong>
              <span>Yaklaşan</span>
            </div>
            <div>
              <strong>{client.package_sessions ?? '—'}</strong>
              <span>Paket</span>
            </div>
          </div>
          <PackageProgress client={client} count={count} />

          {client.notes && <p className="note">{client.notes}</p>}

          <div className="sheet-actions">
            <button className="btn btn-primary" onClick={() => open('appt-form', { clientId: client.id })}>
              <LuCalendarPlus /> Randevu oluştur
            </button>
            <button className="btn btn-ghost" onClick={() => open('client-form', { client })}>
              <LuPencil /> Düzenle
            </button>
          </div>

          <span className="section-label">Seans geçmişi</span>
          {!history ? (
            <Spinner center />
          ) : history.length ? (
            <ul className="history">
              {history.map((a) => (
                <li key={a.id}>
                  <button onClick={() => open('appt', { appt: a })}>
                    <span>
                      <strong>{fmtShort(a.starts_at)}</strong> · {fmtTime(a.starts_at)}
                    </span>
                    <StatusPill status={a.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Henüz seans yok.</p>
          )}
        </>
      )}
    </Sheet>
  )
}
