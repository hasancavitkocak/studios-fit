import { useState } from 'react'
import { LuUser, LuLock, LuEye, LuEyeOff, LuArrowRight } from 'react-icons/lu'
import { supabase, errorText } from './supabase'
import { Spinner } from './components/ui'
import { toLoginEmail } from './utils'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(email), password })
    if (error) setError(errorText(error))
    setLoading(false)
  }

  return (
    <div className="login">
      <div className="login-glow" />
      <form className="login-card" onSubmit={submit}>
        <img src="/logo-white.png" alt="Studio S-Fit" className="login-logo" />
        <h1>Tekrar hoş geldin</h1>
        <p className="muted">Randevularını yönetmek için giriş yap.</p>

        <label className="input-icon">
          <LuUser />
          <input
            type="text"
            placeholder="Kullanıcı adı"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="input-icon">
          <LuLock />
          <input
            type={show ? 'text' : 'password'}
            placeholder="Şifre"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" className="input-action" onClick={() => setShow(!show)} aria-label="Şifreyi göster">
            {show ? <LuEyeOff /> : <LuEye />}
          </button>
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="btn btn-primary btn-block btn-lg" disabled={loading}>
          {loading ? <Spinner /> : (
            <>
              Giriş yap <LuArrowRight />
            </>
          )}
        </button>
      </form>
      <p className="login-foot muted">Studio S-Fit · Yönetim Paneli</p>
    </div>
  )
}
