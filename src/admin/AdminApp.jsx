import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LuLayoutDashboard,
  LuCalendarDays,
  LuUsers,
  LuShieldCheck,
  LuPlus,
  LuLogOut,
  LuChartColumn,
  LuMenu,
  LuChevronLeft,
} from 'react-icons/lu'
import { supabase, errorText } from './supabase'
import { AdminContext } from './context'
import { Avatar, Spinner } from './components/ui'
import { roleLabel } from './utils'
import Login from './Login'
import Dashboard from './pages/Dashboard'
import CalendarPage from './pages/CalendarPage'
import Clients from './pages/Clients'
import Team from './pages/Team'
import Reports from './pages/Reports'
import More from './pages/More'
import AppointmentForm from './components/AppointmentForm'
import AppointmentDetail from './components/AppointmentDetail'
import ClientForm from './components/ClientForm'
import ClientDetail from './components/ClientDetail'
import UserForm from './components/UserForm'
import ProfileSheet from './components/ProfileSheet'
import MeasurementForm from './components/MeasurementForm'
import Clock from './components/Clock'
import './admin.css'

// place: 'main' → telefonda alt menüde; 'menu' → telefonda "Menü" sayfasının içinde;
// 'mobile' → sadece telefonda. Masaüstü kenar çubuğunda 'mobile' dışındakilerin hepsi görünür.
const TABS = [
  { id: 'dashboard', label: 'Özet', icon: LuLayoutDashboard, page: Dashboard, place: 'main' },
  { id: 'calendar', label: 'Takvim', icon: LuCalendarDays, page: CalendarPage, place: 'main' },
  { id: 'clients', label: 'Danışanlar', icon: LuUsers, page: Clients, place: 'main' },
  { id: 'reports', label: 'Raporlar', icon: LuChartColumn, page: Reports, place: 'menu' },
  { id: 'team', label: 'Ekip', icon: LuShieldCheck, page: Team, place: 'menu', adminOnly: true },
  { id: 'more', label: 'Menü', icon: LuMenu, page: More, place: 'mobile' },
]

const SHEETS = {
  'appt-form': AppointmentForm,
  appt: AppointmentDetail,
  'client-form': ClientForm,
  client: ClientDetail,
  'user-form': UserForm,
  profile: ProfileSheet,
  'measurement-form': MeasurementForm,
}

export default function AdminApp() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <div className="adm">
      {session === undefined ? <Splash /> : session ? <Shell userId={session.user.id} /> : <Login />}
    </div>
  )
}

function Splash() {
  return (
    <div className="splash">
      <img src="/logo-white.png" alt="Studio S-Fit" />
      <Spinner />
    </div>
  )
}

function Shell({ userId }) {
  const [me, setMe] = useState(undefined)
  const [staff, setStaff] = useState([])
  const [clients, setClients] = useState([])
  const [tab, setTab] = useState(() => sessionStorage.getItem('sfit-tab') || 'dashboard')
  const [sheet, setSheet] = useState(null)
  const [version, setVersion] = useState(0)
  const [toastMsg, setToastMsg] = useState(null)
  const calendarDate = useRef(null)

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const toast = useCallback((text, tone = 'ok') => {
    setToastMsg({ text, tone, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 2600)
    return () => clearTimeout(t)
  }, [toastMsg])

  const reloadStaff = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name')
    if (error) return toast(errorText(error), 'err')
    setStaff(data)
    setMe(data.find((p) => p.id === userId) || null)
  }, [userId, toast])

  const reloadClients = useCallback(async () => {
    const { data, error } = await supabase.from('clients').select('*').order('full_name')
    if (error) return toast(errorText(error), 'err')
    setClients(data)
  }, [toast])

  useEffect(() => {
    Promise.resolve().then(() => Promise.all([reloadStaff(), reloadClients()]))
  }, [reloadStaff, reloadClients])

  // Başka cihazdan yapılan randevu değişikliklerini anında yansıt
  useEffect(() => {
    const channel = supabase
      .channel('appointments-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, bump)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [bump])

  useEffect(() => {
    sessionStorage.setItem('sfit-tab', tab)
  }, [tab])

  const value = useMemo(
    () => ({
      me,
      isAdmin: me?.role === 'admin',
      staff,
      clients,
      staffById: Object.fromEntries(staff.map((s) => [s.id, s])),
      clientsById: Object.fromEntries(clients.map((c) => [c.id, c])),
      reloadStaff,
      reloadClients,
      version,
      bump,
      toast,
      open: (type, props = {}) => setSheet({ type, props }),
      close: () => setSheet(null),
      goTo: setTab,
      setCalendarDate: (d) => {
        calendarDate.current = d
      },
    }),
    [me, staff, clients, reloadStaff, reloadClients, version, bump, toast],
  )

  if (me === undefined) return <Splash />

  if (!me || !me.is_active) {
    return (
      <div className="splash">
        <img src="/logo-white.png" alt="Studio S-Fit" />
        <p className="muted center">Bu hesabın panele erişim yetkisi yok.</p>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
          <LuLogOut /> Çıkış yap
        </button>
      </div>
    )
  }

  const tabs = TABS.filter((t) => !t.adminOnly || value.isAdmin)
  const current = tabs.find((t) => t.id === tab) || tabs[0]
  const Page = current.page
  const SheetComp = sheet && SHEETS[sheet.type]
  const byId = (id) => tabs.find((t) => t.id === id)
  const inMenu = current.place === 'menu' || current.id === 'more'
  const newAppointment = () => value.open('appt-form', current.id === 'calendar' ? { date: calendarDate.current } : {})
  const tabButton = (t) => (
    <button
      key={t.id}
      className={t.id === current.id || (t.id === 'more' && inMenu) ? 'active' : ''}
      onClick={() => setTab(t.id)}
    >
      <t.icon />
      <span>{t.label}</span>
    </button>
  )

  return (
    <AdminContext.Provider value={value}>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <img src="/logo-white.png" alt="Studio S-Fit" />
            <span>Yönetim Paneli</span>
          </div>
          <nav>
            {tabs
              .filter((t) => t.place !== 'mobile')
              .map((t) => (
                <button
                  key={t.id}
                  className={`nav-item ${t.id === current.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <t.icon /> {t.label}
                </button>
              ))}
          </nav>
          <button className="btn btn-primary btn-block" onClick={newAppointment}>
            <LuPlus /> Yeni randevu
          </button>
          <button className="me-card" onClick={() => value.open('profile')}>
            <Avatar name={me.full_name} color={me.color} photo={me.avatar_path} size={36} />
            <div>
              <strong>{me.full_name}</strong>
              <span>{roleLabel(me)}</span>
            </div>
          </button>
        </aside>

        <main className="main">
          <header className="topbar">
            {current.place === 'menu' ? (
              <button className="icon-btn topbar-back" onClick={() => setTab('more')} aria-label="Menüye dön">
                <LuChevronLeft />
              </button>
            ) : (
              <img src="/icons/icon-192.png" alt="" className="topbar-logo" />
            )}
            <h1>{current.label}</h1>
            <Clock />
            <button className="topbar-avatar" onClick={() => value.open('profile')} aria-label="Profil">
              <Avatar name={me.full_name} color={me.color} photo={me.avatar_path} size={34} />
            </button>
          </header>
          <div className="content" key={current.id}>
            <Page />
          </div>
        </main>

        <nav className="tabbar">
          {[byId('dashboard'), byId('calendar')].map(tabButton)}
          <button className="tab-plus" onClick={newAppointment} aria-label="Yeni randevu">
            <span>
              <LuPlus />
            </span>
          </button>
          {[byId('clients'), byId('more')].map(tabButton)}
        </nav>
      </div>

      {SheetComp && (
        <SheetComp
          key={
            sheet.type +
            (sheet.props.appt?.id ||
              sheet.props.measurement?.id ||
              sheet.props.client?.id ||
              sheet.props.user?.id ||
              '')
          }
          {...sheet.props}
        />
      )}

      {toastMsg && (
        <div key={toastMsg.id} className={`toast toast-${toastMsg.tone}`}>
          {toastMsg.text}
        </div>
      )}
    </AdminContext.Provider>
  )
}
