import { LuClock, LuChevronRight } from 'react-icons/lu'
import { STATUS, fmtTime, endTime, initials, isTrainer } from '../utils'
import { avatarUrl } from '../photos'

// `photo`: profil fotoğrafının storage yolu (varsa baş harfler yerine gösterilir)
export function Avatar({ name, color, photo, size = 40 }) {
  const src = avatarUrl(photo)
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, '--c': color || 'var(--accent)' }}
    >
      {src ? <img src={src} alt="" loading="lazy" /> : initials(name)}
    </span>
  )
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.scheduled
  return <span className={`pill pill-${s.tone}`}>{s.label}</span>
}

export function Spinner({ center }) {
  return center ? (
    <div className="center-pad">
      <span className="spinner" />
    </div>
  ) : (
    <span className="spinner" />
  )
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty-icon">
          <Icon />
        </span>
      )}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function TrainerChips({ staff, value, onChange }) {
  const trainers = staff.filter((s) => s.is_active && isTrainer(s))
  if (trainers.length < 2) return null
  return (
    <div className="chips">
      <button className={`chip ${value === 'all' ? 'active' : ''}`} onClick={() => onChange('all')}>
        Tümü
      </button>
      {trainers.map((t) => (
        <button
          key={t.id}
          className={`chip ${value === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="dot" style={{ background: t.color }} />
          {t.full_name.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}

export function AppointmentCard({ appt, client, trainer, showTrainer, onClick }) {
  const past = appt.status !== 'scheduled'
  return (
    <button className={`appt ${past ? 'appt-muted' : ''}`} onClick={onClick} style={{ '--c': trainer?.color }}>
      <div className="appt-time">
        <strong>{fmtTime(appt.starts_at)}</strong>
        <span>{fmtTime(endTime(appt))}</span>
      </div>
      <div className="appt-body">
        <strong className="appt-title">{client?.full_name || 'Danışan'}</strong>
        <span className="appt-meta">
          <LuClock /> {appt.duration_min} dk
          {showTrainer && trainer && (
            <>
              <span className="sep">•</span>
              <span className="dot" style={{ background: trainer.color }} />
              {trainer.full_name.split(' ')[0]}
            </>
          )}
        </span>
      </div>
      <div className="appt-end">
        <StatusPill status={appt.status} />
        <LuChevronRight className="muted" />
      </div>
    </button>
  )
}

export function PackageProgress({ client, count }) {
  if (!client.package_sessions) return null
  const done = count?.completed || 0
  const left = client.package_sessions - done
  const pct = Math.min(100, (done / client.package_sessions) * 100)
  return (
    <div className="progress-wrap">
      <div className="progress">
        <div className={`progress-fill ${left <= 2 ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`small ${left <= 2 ? 'text-warn' : 'muted'}`}>
        {left > 0 ? `${left} seans kaldı` : 'Paket bitti'}
      </span>
    </div>
  )
}
