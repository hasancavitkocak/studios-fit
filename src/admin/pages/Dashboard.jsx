import { useEffect, useState } from 'react'
import { LuCalendarCheck, LuCalendarRange, LuTrophy, LuUsers, LuSunrise, LuArrowRight, LuPhone, LuBellRing } from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import { AppointmentCard, Empty, Spinner, TrainerChips } from '../components/ui'
import {
  addDays, startOfWeek, startOfMonth, startOfDay, sameDay, fmtLong, fmtTime, fmtWeekday,
  relativeFromNow, greeting, firstName, reminderText, waLink,
} from '../utils'

// Selamlamadaki emoji branşa göre: PT → ağırlık, Pilates → pilates duruşu, branşsız → el sallama
const GREETING_EMOJI = { gym: '🏋️', pilates: '🧘‍♀️' }

export default function Dashboard() {
  const { me, isAdmin, staff, staffById, clientsById, clients, version, open, toast, goTo } = useAdmin()
  const [trainer, setTrainer] = useState('all')
  const [appts, setAppts] = useState(null)
  const [next, setNext] = useState(null)

  const today = startOfDay(new Date())
  const weekStart = startOfWeek(today)
  const monthStart = startOfMonth(today)

  useEffect(() => {
    const now = new Date()
    const from = new Date(Math.min(startOfWeek(now), startOfMonth(now)))
    const to = new Date(Math.max(addDays(startOfWeek(now), 7), new Date(now.getFullYear(), now.getMonth() + 1, 1)))

    let range = supabase
      .from('appointments')
      .select('*')
      .gte('starts_at', from.toISOString())
      .lt('starts_at', to.toISOString())
      .order('starts_at')
    let upcoming = supabase
      .from('appointments')
      .select('*')
      .eq('status', 'scheduled')
      .gte('starts_at', new Date(now.getTime() - 15 * 60000).toISOString())
      .order('starts_at')
      .limit(1)
    if (trainer !== 'all') {
      range = range.eq('trainer_id', trainer)
      upcoming = upcoming.eq('trainer_id', trainer)
    }

    Promise.all([range, upcoming]).then(([r, u]) => {
      if (r.error || u.error) return toast(errorText(r.error || u.error), 'err')
      setAppts(r.data)
      setNext(u.data[0] || null)
    })
  }, [version, trainer, toast])

  if (!appts) return <Spinner center />

  const active = appts.filter((a) => a.status !== 'cancelled')
  const todays = appts.filter((a) => sameDay(a.starts_at, today))
  const week = active.filter((a) => new Date(a.starts_at) >= weekStart && new Date(a.starts_at) < addDays(weekStart, 7))
  const monthDone = appts.filter((a) => a.status === 'completed' && new Date(a.starts_at) >= monthStart)
  const myClients = clients.filter((c) => c.is_active && (isAdmin || !c.trainer_id || c.trainer_id === me.id))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { d, count: week.filter((a) => sameDay(a.starts_at, d)).length }
  })
  const maxCount = Math.max(1, ...days.map((x) => x.count))

  const stats = [
    { icon: LuCalendarCheck, label: 'Bugün', value: todays.filter((a) => a.status !== 'cancelled').length, sub: `${todays.filter((a) => a.status === 'completed').length} tamamlandı` },
    { icon: LuCalendarRange, label: 'Bu hafta', value: week.length, sub: 'seans' },
    { icon: LuTrophy, label: 'Bu ay tamamlanan', value: monthDone.length, sub: 'seans' },
    { icon: LuUsers, label: 'Aktif danışan', value: myClients.length, sub: 'kişi' },
  ]

  const nextClient = next && clientsById[next.client_id]

  return (
    <div className="stack">
      <section className="hello">
        <div>
          <span className="eyebrow">{fmtLong(today)}</span>
          <h2>
            {greeting()}, {firstName(me.full_name)} <span className="hello-emoji" aria-hidden="true">{GREETING_EMOJI[me.specialty] || '👋'}</span>
          </h2>
        </div>
      </section>

      {isAdmin && <TrainerChips staff={staff} value={trainer} onChange={setTrainer} />}

      {next ? (
        <div
          className="upnext"
          role="button"
          tabIndex={0}
          onClick={() => open('appt', { appt: next })}
          onKeyDown={(e) => e.key === 'Enter' && open('appt', { appt: next })}
        >
          <div className="upnext-top">
            <span className="upnext-label">Sıradaki seans</span>
            <span className="upnext-badge">{relativeFromNow(next.starts_at)}</span>
          </div>
          <strong className="upnext-name">{nextClient?.full_name || 'Danışan'}</strong>
          <div className="upnext-meta">
            <span>
              {sameDay(next.starts_at, today) ? 'Bugün' : fmtLong(next.starts_at)} · {fmtTime(next.starts_at)}
            </span>
            {isAdmin && staffById[next.trainer_id] && <span>· {firstName(staffById[next.trainer_id].full_name)}</span>}
          </div>
          {nextClient?.phone && (
            <div className="upnext-actions" onClick={(e) => e.stopPropagation()}>
              <a href={`tel:${nextClient.phone}`}>
                <LuPhone /> Ara
              </a>
              <a
                href={waLink(nextClient.phone, reminderText(next, nextClient, staffById[next.trainer_id]))}
                target="_blank"
                rel="noreferrer"
              >
                <LuBellRing /> Hatırlat
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="upnext upnext-empty">
          <LuSunrise />
          <div>
            <strong>Yaklaşan seans yok</strong>
            <span>Yeni bir randevu oluşturarak başla.</span>
          </div>
        </div>
      )}

      <section className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <span className="stat-icon">
              <s.icon />
            </span>
            <span className="stat-label">{s.label}</span>
            <strong className="stat-value">{s.value}</strong>
            <span className="stat-sub">{s.sub}</span>
          </div>
        ))}
      </section>

      <div className="grid-2">
        <section className="card">
          <header className="card-head">
            <h3>Bugünün programı</h3>
            <button className="link" onClick={() => goTo('calendar')}>
              Takvim <LuArrowRight />
            </button>
          </header>
          {todays.length ? (
            <div className="list">
              {todays.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appt={a}
                  client={clientsById[a.client_id]}
                  trainer={staffById[a.trainer_id]}
                  showTrainer={isAdmin}
                  onClick={() => open('appt', { appt: a })}
                />
              ))}
            </div>
          ) : (
            <Empty icon={LuCalendarCheck} title="Bugün seans yok" text="Dinlenme günü ya da boş bir slot." />
          )}
        </section>

        <section className="card">
          <header className="card-head">
            <h3>Bu hafta</h3>
            <span className="muted small">{week.length} seans</span>
          </header>
          <div className="bars">
            {days.map(({ d, count }) => (
              <div key={d.toISOString()} className={`bar ${sameDay(d, today) ? 'today' : ''}`}>
                <span className="bar-count">{count || ''}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="bar-label">{fmtWeekday(d)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
