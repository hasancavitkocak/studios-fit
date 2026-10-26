import { useEffect, useState } from 'react'
import { LuPlus, LuActivity, LuArrowDown, LuArrowUp, LuMinus, LuImage } from 'react-icons/lu'
import { supabase, errorText } from '../supabase'
import { useAdmin } from '../context'
import { usePhotoUrls } from '../photos'
import { LineChart } from './charts'
import { Empty, Spinner } from './ui'
import { METRICS, fmtNum, fmtShort } from '../utils'

const asDate = (d) => new Date(`${d}T12:00:00`)

function Delta({ value, unit }) {
  if (value === 0) return <span className="delta"><LuMinus /> değişim yok</span>
  const Icon = value < 0 ? LuArrowDown : LuArrowUp
  return (
    <span className="delta">
      <Icon /> {value > 0 ? '+' : ''}
      {fmtNum(value)} {unit}
    </span>
  )
}

export default function ProgressTab({ client }) {
  const { open, toast } = useAdmin()
  const [rows, setRows] = useState(null)
  const [metric, setMetric] = useState(null)

  useEffect(() => {
    supabase
      .from('measurements')
      .select('*')
      .eq('client_id', client.id)
      .order('measured_at')
      .order('created_at')
      .then(({ data, error }) => {
        if (error) return toast(errorText(error), 'err')
        setRows(data)
      })
  }, [client.id, toast])

  const photoRows = (rows || []).filter((r) => r.photo_path)
  const urls = usePhotoUrls(photoRows.map((r) => r.photo_path))

  if (!rows) return <Spinner center />

  const add = (
    <button className="btn btn-primary btn-block" onClick={() => open('measurement-form', { client })}>
      <LuPlus /> Ölçüm ekle
    </button>
  )

  if (!rows.length) {
    return (
      <>
        <Empty icon={LuActivity} title="Henüz ölçüm yok" text="Kilo, yağ oranı ve ölçüleri girerek gelişimi takip edin." />
        {add}
      </>
    )
  }

  const available = METRICS.filter((m) => rows.some((r) => r[m.key] !== null))
  const current = available.find((m) => m.key === metric) || available[0]
  const series = current
    ? rows.filter((r) => r[current.key] !== null).map((r) => ({
        date: asDate(r.measured_at),
        value: Number(r[current.key]),
        label: fmtShort(asDate(r.measured_at)),
      }))
    : []
  const first = photoRows[0]
  const latest = photoRows.length > 1 ? photoRows[photoRows.length - 1] : null

  return (
    <>
      {add}

      {current && (
        <>
          <div className="chips">
            {available.map((m) => (
              <button key={m.key} className={`chip ${m.key === current.key ? 'active' : ''}`} onClick={() => setMetric(m.key)}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="progress-summary">
            <div>
              <span className="muted small">Son ölçüm</span>
              <strong>
                {fmtNum(series[series.length - 1].value)} <small>{current.unit}</small>
              </strong>
            </div>
            {series.length > 1 && (
              <div>
                <span className="muted small">İlk ölçüme göre</span>
                <Delta value={series[series.length - 1].value - series[0].value} unit={current.unit} />
              </div>
            )}
          </div>

          <LineChart
            points={series}
            format={(v) => fmtNum(v)}
            renderTip={(p) => (
              <>
                <strong>
                  {fmtNum(p.value)} {current.unit}
                </strong>
                <span>{p.label}</span>
              </>
            )}
          />
        </>
      )}

      {first && (
        <>
          <span className="section-label">{latest ? 'Önce / Sonra' : 'Fotoğraf'}</span>
          <div className="before-after">
            {[first, latest].filter(Boolean).map((r, i) => (
              <figure key={r.id}>
                {urls[r.photo_path] ? <img src={urls[r.photo_path]} alt="" /> : <div className="photo-skeleton" />}
                <figcaption>
                  <strong>{latest ? (i === 0 ? 'Önce' : 'Sonra') : 'İlk'}</strong> {fmtShort(asDate(r.measured_at))}
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}

      <span className="section-label">Ölçüm geçmişi</span>
      <ul className="history">
        {[...rows].reverse().map((r) => (
          <li key={r.id}>
            <button onClick={() => open('measurement-form', { client, measurement: r })}>
              <span className="measure-row">
                <strong>{fmtShort(asDate(r.measured_at))}</strong>
                <span className="muted small">
                  {METRICS.filter((m) => r[m.key] !== null)
                    .map((m) => `${m.label} ${fmtNum(r[m.key])}${m.unit === '%' ? '%' : ` ${m.unit}`}`)
                    .join(' · ') || 'Sadece fotoğraf'}
                </span>
              </span>
              {r.photo_path && <LuImage className="muted" />}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
