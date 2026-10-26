import { useEffect, useState } from 'react'
import { LuUserPlus, LuChevronRight } from 'react-icons/lu'
import { supabase } from '../supabase'
import { useAdmin } from '../context'
import { Avatar } from '../components/ui'
import { startOfMonth, displayLogin, roleLabel } from '../utils'

export default function Team() {
  const { staff, me, version, open } = useAdmin()
  const [monthly, setMonthly] = useState({})

  useEffect(() => {
    supabase
      .from('appointments')
      .select('trainer_id, status')
      .gte('starts_at', startOfMonth(new Date()).toISOString())
      .neq('status', 'cancelled')
      .then(({ data }) => {
        if (!data) return
        const acc = {}
        for (const a of data) {
          acc[a.trainer_id] ??= { total: 0, done: 0 }
          acc[a.trainer_id].total++
          if (a.status === 'completed') acc[a.trainer_id].done++
        }
        setMonthly(acc)
      })
  }, [version])

  return (
    <div className="stack">
      <div className="toolbar">
        <p className="muted">Eğitmenler ve bu ayki seans sayıları.</p>
        <button className="btn btn-primary" onClick={() => open('user-form')}>
          <LuUserPlus /> <span className="hide-sm">Eğitmen ekle</span>
        </button>
      </div>

      <div className="client-grid">
        {staff.map((s) => {
          const m = monthly[s.id] || { total: 0, done: 0 }
          return (
            <button key={s.id} className={`client ${s.is_active ? '' : 'inactive'}`} onClick={() => open('user-form', { user: s })}>
              <Avatar name={s.full_name} color={s.color} photo={s.avatar_path} size={48} />
              <div className="client-body">
                <strong>
                  {s.full_name} {s.id === me.id && <span className="muted small">(sen)</span>}
                </strong>
                <span className="muted small">{displayLogin(s.email)}</span>
                <span className="row-gap">
                  <span className={`pill ${s.role === 'admin' ? 'pill-accent' : 'pill-blue'}`}>
                    {roleLabel(s)}
                  </span>
                  {!s.is_active && <span className="pill pill-gray">Pasif</span>}
                  <span className="muted small">
                    Bu ay {m.total} seans · {m.done} tamamlandı
                  </span>
                </span>
              </div>
              <LuChevronRight className="muted" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
