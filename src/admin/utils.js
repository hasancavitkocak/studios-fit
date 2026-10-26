export const STATUS = {
  scheduled: { label: 'Planlandı', tone: 'blue' },
  completed: { label: 'Tamamlandı', tone: 'green' },
  cancelled: { label: 'İptal', tone: 'gray' },
  no_show: { label: 'Gelmedi', tone: 'red' },
}

export const TRAINER_COLORS = ['#d4ff3a', '#5ac8fa', '#ff6b9a', '#ffb340', '#a78bfa', '#34d399']

export const DURATIONS = [30, 45, 60, 90]

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// Haftayı Pazartesi'den başlatır.
export function startOfWeek(d) {
  const x = startOfDay(d)
  return addDays(x, -((x.getDay() + 6) % 7))
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

const timeFmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })
const longFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
const shortFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' })
const weekdayFmt = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' })

export const fmtTime = (d) => timeFmt.format(new Date(d))
export const fmtLong = (d) => longFmt.format(new Date(d))
export const fmtShort = (d) => shortFmt.format(new Date(d))
export const fmtMonth = (d) => monthFmt.format(new Date(d))
export const fmtWeekday = (d) => weekdayFmt.format(new Date(d)).replace('.', '')

export function endTime(a) {
  return new Date(new Date(a.starts_at).getTime() + a.duration_min * 60000)
}

// <input type="date"> ve <input type="time"> için yerel değerler
export function toDateInput(d) {
  const x = new Date(d)
  const p = (n) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}

export function toTimeInput(d) {
  const x = new Date(d)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(x.getHours())}:${p(x.getMinutes())}`
}

export function fromInputs(date, time) {
  return new Date(`${date}T${time}:00`)
}

export function relativeFromNow(d) {
  const mins = Math.round((new Date(d) - Date.now()) / 60000)
  if (mins < 1) return 'şimdi'
  if (mins < 60) return `${mins} dk sonra`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa ${mins % 60 ? `${mins % 60} dk ` : ''}sonra`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yarın' : `${days} gün sonra`
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'İyi geceler'
  if (h < 12) return 'Günaydın'
  if (h < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr-TR'))
    .join('')
}

export function firstName(name = '') {
  return name.trim().split(/\s+/)[0]
}

// 0532..., 532..., +90 532... → 90532... (WhatsApp linki için)
export function waNumber(phone = '') {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '9' + digits
  else if (digits.length === 10 && digits.startsWith('5')) digits = '90' + digits
  return digits
}

// Kullanıcı adıyla giriş: "furkan" → furkan@studiosfit.local (e-posta da kabul edilir)
const LOGIN_DOMAIN = '@studiosfit.local'

export function toLoginEmail(input = '') {
  const v = input.trim().toLocaleLowerCase('tr-TR')
  return v.includes('@') ? v : v + LOGIN_DOMAIN
}

export function displayLogin(email = '') {
  return email.endsWith(LOGIN_DOMAIN) ? email.slice(0, -LOGIN_DOMAIN.length) : email
}

export const SPECIALTIES = {
  gym: 'Gym',
  pilates: 'Pilates',
}

// Branşı olan herkes eğitmendir; yöneticiler de branş seçerek eğitmen olabilir.
export const isTrainer = (p) => p.role === 'trainer' || Boolean(p.specialty)

export function roleLabel(p) {
  const trainer = p.specialty ? `${SPECIALTIES[p.specialty]} Eğitmeni` : 'Eğitmen'
  if (p.role !== 'admin') return trainer
  return p.specialty ? `${trainer} · Yönetici` : 'Yönetici'
}

// WhatsApp hatırlatma mesajı. Türkçe ek uyumu (18:00'de / 09:00'da) sorun çıkarmasın diye
// başlıklı satırlar halinde yazılır.
export function reminderText(appt, client, trainer) {
  const start = new Date(appt.starts_at)
  const days = Math.round((startOfDay(start) - startOfDay(new Date())) / 86400000)
  const prefix = days === 0 ? 'Bugün, ' : days === 1 ? 'Yarın, ' : ''
  return [
    `Merhaba ${firstName(client?.full_name)},`,
    '',
    'Studio S-Fit seans hatırlatması:',
    `Tarih: ${prefix}${fmtLong(start)}`,
    `Saat: ${fmtTime(start)} - ${fmtTime(endTime(appt))}`,
    trainer ? `Eğitmen: ${firstName(trainer.full_name)}` : null,
    '',
    'Görüşmek üzere!',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export function waLink(phone, text) {
  return `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// 750 → "12,5 sa"
export function fmtHours(minutes) {
  const h = minutes / 60
  return `${h.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sa`
}

export const METRICS = [
  { key: 'weight_kg', label: 'Kilo', unit: 'kg' },
  { key: 'body_fat', label: 'Yağ oranı', unit: '%' },
  { key: 'waist_cm', label: 'Bel', unit: 'cm' },
  { key: 'hip_cm', label: 'Kalça', unit: 'cm' },
  { key: 'arm_cm', label: 'Kol', unit: 'cm' },
  { key: 'chest_cm', label: 'Göğüs', unit: 'cm' },
  { key: 'thigh_cm', label: 'Bacak', unit: 'cm' },
]

export function fmtNum(v) {
  return Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
}
