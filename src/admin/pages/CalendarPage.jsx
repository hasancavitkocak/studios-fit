import { useEffect, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuCalendarPlus, LuPlus } from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import { AppointmentCard, Empty, Segmented, Spinner, TrainerChips } from '../components/ui'
import {
  addDays,
  startOfWeek,
  startOfDay,
  sameDay,
  fmtLong,
  fmtMonth,
  fmtShort,
  fmtTime,
  fmtWeekday,
  endTime,
} from '../utils'

const VIEW_KEY = 'sfit.calendarView'
const dayNameFmt = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' })

export default function CalendarPage() {
  const { isAdmin, staff, staffById, clientsById, version, open, toast, setCalendarDate } = useAdmin()
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) || 'week'
    } catch {
      return 'week'
    }
  })
  const [trainer, setTrainer] = useState('all')
  const [appts, setAppts] = useState(null)

  useEffect(() => {
    setCalendarDate(selected)
  }, [selected, setCalendarDate])

  const changeView = (v) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* depolama kapalıysa yalnızca bu oturumda kalır */
    }
  }

  const weekStart = startOfWeek(selected)
  const weekKey = weekStart.getTime()

  useEffect(() => {
    let q = supabase
      .from('appointments')
      .select('*')
      .gte('starts_at', new Date(weekKey).toISOString())
      .lt('starts_at', addDays(new Date(weekKey), 7).toISOString())
      .order('starts_at')
    if (trainer !== 'all') q = q.eq('trainer_id', trainer)
    q.then(({ data, error }) => {
      if (error) return toast(errorText(error), 'err')
      setAppts(data)
    })
  }, [weekKey, trainer, version, toast])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayAppts = (appts || []).filter((a) => sameDay(a.starts_at, selected))
  const countFor = (d) => (appts || []).filter((a) => sameDay(a.starts_at, d) && a.status !== 'cancelled').length
  const today = new Date()
  const isWeek = view === 'week'

  return (
    <div className="stack">
      <Segmented
        options={[
          { value: 'week', label: 'Hafta' },
          { value: 'day', label: 'Gün' },
        ]}
        value={view}
        onChange={changeView}
      />

      <section className="cal-head">
        <button className="icon-btn" onClick={() => setSelected(addDays(selected, -7))} aria-label="Önceki hafta">
          <LuChevronLeft />
        </button>
        <strong className="cal-month">
          {isWeek ? `${fmtShort(weekStart)} – ${fmtShort(addDays(weekStart, 6))}` : fmtMonth(selected)}
        </strong>
        <button className="icon-btn" onClick={() => setSelected(addDays(selected, 7))} aria-label="Sonraki hafta">
          <LuChevronRight />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(startOfDay(new Date()))}>
          Bugün
        </button>
      </section>

      {isAdmin && <TrainerChips staff={staff} value={trainer} onChange={setTrainer} />}

      {isWeek ? (
        <div className="week-board">
          {days.map((d) => {
            const list = (appts || []).filter((a) => sameDay(a.starts_at, d))
            return (
              <section key={d.getTime()} className={`wb-day ${sameDay(d, today) ? 'today' : ''}`}>
                <button
                  className="wb-head"
                  onClick={() => {
                    setSelected(d)
                    changeView('day')
                  }}
                >
                  <strong>{dayNameFmt.format(d)}</strong>
                  <span>{fmtShort(d)}</span>
                </button>
                {!appts ? null : list.length ? (
                  <ul className="wb-list">
                    {list.map((a) => {
                      const t = staffById[a.trainer_id]
                      return (
                        <li key={a.id}>
                          <button
                            className={`wb-item ${a.status}`}
                            style={{ '--c': t?.color }}
                            onClick={() => open('appt', { appt: a })}
                          >
                            <i className="wb-dot" />
                            <span className="wb-time">
                              {fmtTime(a.starts_at)}–{fmtTime(endTime(a))}
                            </span>
                            <span className="wb-name">{clientsById[a.client_id]?.full_name || 'Danışan'}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <button className="wb-add" onClick={() => open('appt-form', { date: d })} aria-label="Randevu ekle">
                    <LuPlus />
                  </button>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <div className="week">
            {days.map((d) => {
              const n = countFor(d)
              return (
                <button
                  key={d.getTime()}
                  className={`day ${sameDay(d, selected) ? 'active' : ''} ${sameDay(d, today) ? 'today' : ''}`}
                  onClick={() => setSelected(d)}
                >
                  <span className="day-name">{fmtWeekday(d)}</span>
                  <span className="day-num">{d.getDate()}</span>
                  <span className="day-dots">
                    {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                      <i key={i} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          <section className="card">
            <header className="card-head">
              <h3>{fmtLong(selected)}</h3>
              <span className="muted small">{dayAppts.filter((a) => a.status !== 'cancelled').length} seans</span>
            </header>
            {!appts ? (
              <Spinner center />
            ) : dayAppts.length ? (
              <div className="list">
                {dayAppts.map((a) => (
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
              <Empty
                icon={LuCalendarPlus}
                title="Bu gün için randevu yok"
                action={
                  <button className="btn btn-primary btn-sm" onClick={() => open('appt-form', { date: selected })}>
                    Randevu ekle
                  </button>
                }
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}
