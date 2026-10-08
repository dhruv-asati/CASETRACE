import React, { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Fingerprint, KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import { ErrorState } from '../components/Shared'
import SiteHeader from '../components/SiteHeader'
import Brand from '../components/Brand'

function AuthFrame({ kicker, title, description, children, footer, navigate, authMode }) {
  return <main className="auth-shell">
    <div className="auth-grid" aria-hidden="true" />
    <SiteHeader navigate={navigate} authMode={authMode} />
    <section className="auth-layout">
      <aside className="auth-aside"><span className="eyebrow"><Fingerprint size={14} /> CASETRACE FIELD OFFICE</span><h1>Every clue<br />starts with a <em>name.</em></h1><p>Keep your investigations, case history, and evidence reviews together in a private investigator profile.</p><div className="auth-aside-seal"><ShieldCheck size={17} /><span>SESSION-SECURED INVESTIGATOR ACCESS</span></div></aside>
      <section className="auth-card"><div className="auth-card-brand"><Brand compact /><span><i className="status-dot status-good" /> SECURE FIELD OFFICE</span></div><div className="auth-card-heading"><span className="eyebrow">{kicker}</span><h2>{title}</h2><p>{description}</p></div>{children}<div className="auth-card-footer">{footer}</div></section>
    </section>
    <footer className="auth-footer"><span>CASETRACE <span className="mono">/</span> PRIVATE INVESTIGATION DESK</span><span>FOLLOW THE EVIDENCE. SOLVE THE MYSTERY.</span></footer>
  </main>
}

export function LoginPage({ navigate, onLogin, registered = false, passwordChanged = false, returnTo }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault(); setError(null); setBusy(true)
    try { await onLogin({ login: login.trim(), password }); returnTo() }
    catch (caught) { setError(caught.status === 401 ? new Error('The username/email or password was not recognized.') : caught) }
    finally { setBusy(false) }
  }

  return <AuthFrame kicker="INVESTIGATOR LOGIN" title="Welcome back." description="Sign in to return to your open case files." navigate={navigate} authMode="login" footer={<span>New to the field office? <button className="inline-auth-link" onClick={() => navigate('/register')}>Create an investigator profile <ArrowRight size={13} /></button></span>}>
    {registered && <div className="auth-notice"><ShieldCheck size={16} /> Profile created. Sign in to open the case archive.</div>}
    {passwordChanged && <div className="auth-notice"><ShieldCheck size={16} /> Password updated. Sign in with your new credentials.</div>}
    {error && <ErrorState error={error} />}
    <form className="auth-form" onSubmit={submit}>
      <label className="form-label"><span>USERNAME OR EMAIL</span><div className="auth-input"><UserRound size={16} /><input autoComplete="username" maxLength={254} required value={login} onChange={(event) => setLogin(event.target.value)} placeholder="investigator or name@example.com" /></div></label>
      <label className="form-label"><span>PASSWORD</span><div className="auth-input"><KeyRound size={16} /><input autoComplete="current-password" required type={visible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /><button className="password-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
      <button className="button button-primary button-large auth-submit" disabled={busy || !login.trim() || !password} type="submit">{busy ? 'Verifying investigator…' : 'Enter the field office'} <ArrowRight size={16} /></button>
    </form>
  </AuthFrame>
}

export function RegisterPage({ navigate, onRegister }) {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmation: '' })
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault(); setError(null)
    if (form.password !== form.confirmation) { setError(new Error('The passwords do not match.')); return }
    if (form.password.length < 12) { setError(new Error('Use at least 12 characters for your password.')); return }
    setBusy(true)
    try {
      await onRegister({ fullName: form.fullName.trim(), username: form.username.trim(), email: form.email.trim(), password: form.password, confirmPassword: form.confirmation })
      navigate('/login?registered=1')
    } catch (caught) { setError(caught) }
    finally { setBusy(false) }
  }

  return <AuthFrame kicker="NEW INVESTIGATOR FILE" title="Create your profile." description="Set up a private identity for your CASETRACE investigations." navigate={navigate} authMode="register" footer={<span>Already registered? <button className="inline-auth-link" onClick={() => navigate('/login')}>Return to login <ArrowRight size={13} /></button></span>}>
    {error && <ErrorState error={error} />}
    <form className="auth-form register-form" onSubmit={submit}>
      <label className="form-label"><span>FULL NAME</span><input autoComplete="name" maxLength={100} required value={form.fullName} onChange={set('fullName')} placeholder="Your name" /></label>
      <label className="form-label"><span>USERNAME</span><input autoComplete="username" minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]{3,32}" required value={form.username} onChange={set('username')} placeholder="3–32 letters, numbers, . _ -" /><small>Use 3–32 letters, numbers, dots, underscores, or hyphens.</small></label>
      <label className="form-label"><span>EMAIL</span><input autoComplete="email" type="email" maxLength={254} required value={form.email} onChange={set('email')} placeholder="name@example.com" /></label>
      <div className="form-two-col auth-password-grid">
        <label className="form-label"><span>PASSWORD</span><div className="auth-input"><input autoComplete="new-password" minLength={12} maxLength={128} required type={visible ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="12 characters minimum" /><button className="password-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><small>At least 12 characters. Use a unique passphrase.</small></label>
        <label className="form-label"><span>CONFIRM PASSWORD</span><input autoComplete="new-password" required type={visible ? 'text' : 'password'} value={form.confirmation} onChange={set('confirmation')} placeholder="Re-enter password" /></label>
      </div>
      <button className="button button-primary button-large auth-submit" disabled={busy || !form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.password || !form.confirmation} type="submit">{busy ? 'Creating investigator file…' : 'Create investigator profile'} <ArrowRight size={16} /></button>
    </form>
  </AuthFrame>
}
