import { useEffect, useState } from 'react'
import { LuClock } from 'react-icons/lu'

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' })
const timeFmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })

export default function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="clock" aria-label="Güncel tarih ve saat">
      <LuClock />
      <span className="clock-date">{dateFmt.format(now)}</span>
      <strong className="clock-time">{timeFmt.format(now)}</strong>
    </div>
  )
}
