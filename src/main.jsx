import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const isAdmin = window.location.pathname.startsWith('/yonetici')
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

if (isAdmin) setupAdminPwa()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)

// Yönetim paneli "Ana ekrana ekle" ile ayrı bir uygulama gibi açılsın.
function setupAdminPwa() {
  document.title = 'S-Fit Yönetim'
  const head = document.head
  const add = (tag, attrs) => {
    const el = document.createElement(tag)
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
    head.appendChild(el)
  }

  add('link', { rel: 'manifest', href: '/yonetici.webmanifest' })
  add('link', { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' })
  add('meta', { name: 'theme-color', content: '#09090b' })
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' })
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' })
  // Durum çubuğu düz siyah; sayfa onun altından başlar (çift boşluk oluşmasın diye viewport-fit=cover kullanılmıyor)
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' })
  add('meta', { name: 'apple-mobile-web-app-title', content: 'S-Fit' })

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js', { scope: '/yonetici' }).catch(() => {})
  }
}
