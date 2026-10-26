import { useEffect, useState } from 'react'
import {
  LuChevronLeft, LuChevronRight, LuGraduationCap, LuTimer, LuCircleCheck, LuUserX, LuTriangleAlert, LuUserPlus,
  LuUserMinus, LuFlame,
} from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import { ColumnChart } from '../components/charts'
import { Avatar, Empty, Spinner, TrainerChips } from '../components/ui'
import { endTime, fmtHours, fmtMonth, fmtShort, isTrainer, roleLabel, toDateInput } from '../utils'

const PAGE = 1000

// Supabase tek istekte en fazla 1000 satır döner; ay boyunca hepsini topla.
async function fetchRange(from, to) {
  const rows = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, trainer_id, client_id, starts_at, duration_min, status')
      .gte('starts_at', from.toISOString())
      .lt('starts_at', to.toISOString())
      .order('starts_at')
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

const pct = (n) => `%${Math.round(n * 100)}`

// Ders saati: "Tamamlandı" seansların toplamı.
// Çalışma saati: eğitmenin her gün ilk seansının başından son seansının bitişine kadar geçen süre
// (iptal edilmeyen, saati geçmiş seanslar üzerinden).
function summarize(list, now) {
  const by = (s) => list.filter((a) => a.status === s)
  const completed = by('completed')
  const noShow = by('no_show')
  const past = list.filter((a) => a.status !== 'cancelled' && endTime(a) <= now)
  const spans = {}
  for (const a of past) {
    const key = `${a.trainer_id}|${toDateInput(a.starts_at)}`
    const s = new Date(a.starts_at).getTime()
    const e = endTime(a).getTime()
    spans[key] = spans[key] ? { s: Math.min(spans[key].s, s), e: Math.max(spans[key].e, e) } : { s, e }
  }
  const attended = completed.length + noShow.length
  return {
    completed: completed.length,
    noShow: noShow.length,
    cancelled: by('cancelled').length,
    unmarked: list.filter((a) => a.status === 'scheduled' && endTime(a) <= now).length,
    lessonMin: completed.reduce((t, a) => t + a.duration_min, 0),
    workMin: Object.values(spans).reduce((t, x) => t + (x.e - x.s) / 60000, 0),
    workDays: new Set(Object.keys(spans).map((k) => k.split('|')[1])).size,
    noShowRate: attended ? noShow.length / attended : 0,
  }
}

export default function Reports() {
  const { me, isAdmin, staff, staffById, clients, clientsById, version, toast } = useAdmin()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [trainer, setTrainer] = useState('all')
  const [appts, setAppts] = useState(null)
  const monthKey = month.getTime()

  useEffect(() => {
    const m = new Date(monthKey)
    fetchRange(new Date(m.getFullYear(), m.getMonth() - 1, 1), new Date(m.getFullYear(), m.getMonth() + 1, 1))
      .then(setAppts)
      .catch((err) => toast(errorText(err), 'err'))
  }, [monthKey, version, toast])

  const shift = (n) => {
    setAppts(null)
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  }

  const header = (
    <section className="cal-head">
      <button className="icon-btn" onClick={() => shift(-1)} aria-label="Önceki ay">
        <LuChevronLeft />
      </button>
      <strong className="cal-month">{fmtMonth(month)}</strong>
      <button className="icon-btn" onClick={() => shift(1)} aria-label="Sonraki ay">
        <LuChevronRight />
      </button>
    </section>
  )

  if (!appts) {
    return (
      <div className="stack">
        {header}
        <Spinner center />
      </div>
    )
  }

  const now = new Date()
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  const scoped = trainer === 'all' ? appts : appts.filter((a) => a.trainer_id === trainer)
  const cur = scoped.filter((a) => new Date(a.starts_at) >= month)
  const prev = scoped.filter((a) => new Date(a.starts_at) < month)
  const total = summarize(cur, now)

  // Günlük ders saati
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const daily = Array.from({ length: daysInMonth }, (_, i) => {
    const day = new Date(month.getFullYear(), month.getMonth(), i + 1)
    const done = cur.filter((a) => a.status === 'completed' && new Date(a.starts_at).getDate() === i + 1)
    return { key: i, label: String(i + 1), day, value: done.reduce((t, a) => t + a.duration_min, 0) / 60, count: done.length }
  })

  // Eğitmen kırılımı
  const trainerIds = isAdmin
    ? [...new Set([...staff.filter((s) => isTrainer(s) && s.is_active).map((s) => s.id), ...cur.map((a) => a.trainer_id)])]
    : [me.id]
  const perTrainer = trainerIds
    .filter((id) => trainer === 'all' || id === trainer)
    .map((id) => ({ person: staffById[id], ...summarize(cur.filter((a) => a.trainer_id === id), now) }))
    .filter((t) => t.person)

  // Danışanlar
  const clientCounts = {}
  for (const a of cur.filter((x) => x.status === 'completed')) {
    clientCounts[a.client_id] ??= { count: 0, minutes: 0 }
    clientCounts[a.client_id].count++
    clientCounts[a.client_id].minutes += a.duration_min
  }
  const topClients = Object.entries(clientCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, c]) => ({ client: clientsById[id], ...c }))
    .filter((c) => c.client)
  const newClients = clients.filter(
    (c) =>
      new Date(c.created_at) >= month &&
      new Date(c.created_at) < monthEnd &&
      (trainer === 'all' || c.trainer_id === trainer),
  )
  const activeNow = new Set(cur.filter((a) => a.status !== 'cancelled').map((a) => a.client_id))
  const lastPrev = {}
  for (const a of prev.filter((x) => x.status === 'completed')) lastPrev[a.client_id] = a.starts_at
  const lostClients = month <= now
    ? Object.entries(lastPrev)
        .filter(([id]) => !activeNow.has(id) && clientsById[id])
        .map(([id, last]) => ({ client: clientsById[id], last }))
    : []

  const tiles = [
    { icon: LuGraduationCap, label: 'Ders saati', value: fmtHours(total.lessonMin), sub: 'tamamlanan seanslar' },
    { icon: LuTimer, label: 'Çalışma saati', value: fmtHours(total.workMin), sub: `${total.workDays} gün` },
    { icon: LuCircleCheck, label: 'Tamamlanan', value: total.completed, sub: 'seans' },
    { icon: LuUserX, label: 'Gelmeme oranı', value: pct(total.noShowRate), sub: `${total.noShow} seans` },
  ]

  return (
    <div className="stack">
      {header}
      {isAdmin && <TrainerChips staff={staff} value={trainer} onChange={setTrainer} />}

      {total.unmarked > 0 && (
        <div className="notice">
          <LuTriangleAlert />
          <p>
            <strong>{total.unmarked} geçmiş seans işaretlenmemiş.</strong> Ders saatine yalnızca "Tamamlandı" işaretli
            seanslar sayılır.
          </p>
        </div>
      )}

      <section className="stats">
        {tiles.map((s) => (
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

      <section className="card">
        <header className="card-head">
          <h3>Günlük ders saati</h3>
          <span className="muted small">{fmtHours(total.lessonMin)} toplam</span>
        </header>
        <ColumnChart
          data={daily}
          formatTick={(v) => v.toLocaleString('tr-TR')}
          renderTip={(d) => (
            <>
              <strong>{fmtHours(d.value * 60)}</strong>
              <span>
                {fmtShort(d.day)} · {d.count} seans
              </span>
            </>
          )}
        />
      </section>

      <section className="card">
        <header className="card-head">
          <h3>Eğitmenler</h3>
        </header>
        {perTrainer.length ? (
          <div className="trainer-reports">
            {perTrainer.map((t) => {
              const util = t.workMin ? Math.min(1, t.lessonMin / t.workMin) : 0
              return (
                <div className="trainer-report" key={t.person.id}>
                  <div className="trainer-report-head">
                    <Avatar name={t.person.full_name} color={t.person.color} photo={t.person.avatar_path} size={40} />
                    <div>
                      <strong>{t.person.full_name}</strong>
                      <span className="muted small">{roleLabel(t.person)}</span>
                    </div>
                  </div>
                  <div className="hours-row">
                    <div>
                      <span className="muted small">Ders</span>
                      <strong>{fmtHours(t.lessonMin)}</strong>
                    </div>
                    <div>
                      <span className="muted small">Çalışma</span>
                      <strong>{fmtHours(t.workMin)}</strong>
                    </div>
                    <div>
                      <span className="muted small">Doluluk</span>
                      <strong>{pct(util)}</strong>
                    </div>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${util * 100}%` }} />
                  </div>
                  <dl className="kv">
                    <div>
                      <dt>Tamamlanan</dt>
                      <dd>{t.completed}</dd>
                    </div>
                    <div>
                      <dt>Gelmedi</dt>
                      <dd>{t.noShow}</dd>
                    </div>
                    <div>
                      <dt>İptal</dt>
                      <dd>{t.cancelled}</dd>
                    </div>
                    <div>
                      <dt>Gelmeme oranı</dt>
                      <dd>{pct(t.noShowRate)}</dd>
                    </div>
                    <div>
                      <dt>Çalışılan gün</dt>
                      <dd>{t.workDays}</dd>
                    </div>
                    <div>
                      <dt>İşaretlenmemiş</dt>
                      <dd>{t.unmarked}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="muted small">Bu ay için eğitmen verisi yok.</p>
        )}
        <p className="muted small hint">
          Çalışma saati: eğitmenin her gün ilk seansının başından son seansının bitişine kadar geçen süre. Doluluk: ders
          saatinin çalışma saatine oranı.
        </p>
      </section>

      <div className="grid-2">
        <section className="card">
          <header className="card-head">
            <h3>En aktif danışanlar</h3>
            <LuFlame className="muted" />
          </header>
          {topClients.length ? (
            <ol className="rank">
              {topClients.map((c, i) => (
                <li key={c.client.id}>
                  <span className="rank-n">{i + 1}</span>
                  <span className="rank-name">{c.client.full_name}</span>
                  <span className="muted small">
                    {c.count} seans · {fmtHours(c.minutes)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty title="Tamamlanan seans yok" />
          )}
        </section>

        <section className="card">
          <header className="card-head">
            <h3>Danışan hareketi</h3>
          </header>
          <div className="movement">
            <div>
              <span className="movement-icon">
                <LuUserPlus />
              </span>
              <strong>{newClients.length}</strong>
              <span className="muted small">Yeni danışan</span>
            </div>
            <div>
              <span className="movement-icon">
                <LuUserMinus />
              </span>
              <strong>{lostClients.length}</strong>
              <span className="muted small">Bu ay gelmeyen</span>
            </div>
          </div>
          {newClients.length > 0 && (
            <p className="small">
              <span className="muted">Yeni: </span>
              {newClients.map((c) => c.full_name).join(', ')}
            </p>
          )}
          {lostClients.length > 0 && (
            <ul className="lost">
              {lostClients.map(({ client, last }) => (
                <li key={client.id}>
                  <span>{client.full_name}</span>
                  <span className="muted small">Son seans {fmtShort(last)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small hint">"Bu ay gelmeyen": geçen ay seansı olup bu ay hiç randevusu olmayan danışanlar.</p>
        </section>
      </div>
    </div>
  )
}
