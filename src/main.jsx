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
// Viewport ve iOS etiketleri ilk çizimden önce index.html'deki satır içi script ile eklenir.
function setupAdminPwa() {
  document.title = 'S-Fit Yönetim'

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js', { scope: '/yonetici' }).catch(() => {})
  }
}
