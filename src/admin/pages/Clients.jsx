import { useState } from 'react'
import { LuSearch, LuUserPlus, LuUsers, LuChevronRight } from 'react-icons/lu'
import { useSessionCounts } from '../hooks'
import { useAdmin } from '../context'
import { Avatar, Empty, Segmented, PackageProgress } from '../components/ui'
import { fmtShort } from '../utils'

export default function Clients() {
  const { clients, staffById, open } = useAdmin()
  const counts = useSessionCounts()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('active')

  const needle = q.trim().toLocaleLowerCase('tr-TR')
  const list = clients.filter(
    (c) =>
      (filter === 'active' ? c.is_active : !c.is_active) &&
      (!needle ||
        c.full_name.toLocaleLowerCase('tr-TR').includes(needle) ||
        (c.phone || '').replace(/\s/g, '').includes(needle.replace(/\s/g, ''))),
  )

  return (
    <div className="stack">
      <div className="toolbar">
        <label className="input-icon search">
          <LuSearch />
          <input placeholder="İsim veya telefon ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn btn-primary" onClick={() => open('client-form')}>
          <LuUserPlus /> <span className="hide-sm">Yeni danışan</span>
        </button>
      </div>

      <Segmented
        options={[
          { value: 'active', label: `Aktif (${clients.filter((c) => c.is_active).length})` },
          { value: 'archived', label: `Arşiv (${clients.filter((c) => !c.is_active).length})` },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {list.length ? (
        <div className="client-grid">
          {list.map((c) => {
            const trainer = staffById[c.trainer_id]
            const count = counts[c.id]
            return (
              <button key={c.id} className="client" onClick={() => open('client', { client: c })}>
                <Avatar name={c.full_name} color={trainer?.color} />
                <div className="client-body">
                  <strong>{c.full_name}</strong>
                  <span className="muted small">
                    {[c.phone, trainer && trainer.full_name.split(' ')[0]].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <PackageProgress client={c} count={count} />
                  {!c.package_sessions && count?.last_session && (
                    <span className="muted small">Son seans: {fmtShort(count.last_session)}</span>
                  )}
                </div>
                <LuChevronRight className="muted" />
              </button>
            )
          })}
        </div>
      ) : (
        <Empty
          icon={LuUsers}
          title={q ? 'Sonuç bulunamadı' : filter === 'active' ? 'Henüz danışan yok' : 'Arşiv boş'}
          action={
            !q && filter === 'active' && (
              <button className="btn btn-primary btn-sm" onClick={() => open('client-form')}>
                İlk danışanı ekle
              </button>
            )
          }
        />
      )}
    </div>
  )
}
