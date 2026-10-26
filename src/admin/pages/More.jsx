import { LuChartColumn, LuShieldCheck, LuChevronRight, LuLogOut, LuSmartphone, LuKeyRound } from 'react-icons/lu'
import { supabase } from '../supabase'
import { useAdmin } from '../context'
import { Avatar } from '../components/ui'
import { roleLabel } from '../utils'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

function MenuItem(item) {
  const { title, text, onClick } = item
  return (
    <button className="menu-item" onClick={onClick}>
      <span className="menu-icon">
        <item.icon />
      </span>
      <span className="menu-text">
        <strong>{title}</strong>
        {text && <span>{text}</span>}
      </span>
      <LuChevronRight className="muted" />
    </button>
  )
}

export default function More() {
  const { me, isAdmin, open, goTo } = useAdmin()

  return (
    <div className="stack">
      <button className="menu-profile" onClick={() => open('profile')}>
        <Avatar name={me.full_name} color={me.color} photo={me.avatar_path} size={56} />
        <span className="menu-text">
          <strong>{me.full_name}</strong>
          <span>{roleLabel(me)}</span>
        </span>
        <LuChevronRight className="muted" />
      </button>

      <section>
        <span className="section-label">Yönetim</span>
        <div className="menu-group">
          <MenuItem icon={LuChartColumn} title="Raporlar" text="Ders ve çalışma saatleri, danışan hareketi" onClick={() => goTo('reports')} />
          {isAdmin && (
            <MenuItem icon={LuShieldCheck} title="Ekip" text="Eğitmenler, yetkiler ve şifreler" onClick={() => goTo('team')} />
          )}
        </div>
      </section>

      <section>
        <span className="section-label">Hesap</span>
        <div className="menu-group">
          <MenuItem icon={LuKeyRound} title="Profil ve şifre" text="Fotoğraf, şifre değiştirme" onClick={() => open('profile')} />
          <button className="menu-item danger" onClick={() => supabase.auth.signOut()}>
            <span className="menu-icon">
              <LuLogOut />
            </span>
            <span className="menu-text">
              <strong>Çıkış yap</strong>
            </span>
          </button>
        </div>
      </section>

      {!isStandalone() && (
        <div className="tip">
          <LuSmartphone />
          <p>
            <strong>Uygulama gibi kullan:</strong> iPhone'da Safari'de <em>Paylaş → Ana Ekrana Ekle</em>, Android'de Chrome
            menüsünden <em>Ana ekrana ekle</em> seçeneğine dokun.
          </p>
        </div>
      )}
    </div>
  )
}
