import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Fingerprint, KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import SiteHeader from '../components/SiteHeader'
import { ErrorState, Eyebrow, formatDate, LoadingState } from '../components/Shared'
import { authApi } from '../lib/api'

const emptyPassword = { currentPassword: '', newPassword: '', confirmNewPassword: '' }

export default function InvestigatorProfile({ navigate, user, onLogout, onProfileUpdated, onPasswordChanged }) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [identity, setIdentity] = useState({ fullName: '', email: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileNotice, setProfileNotice] = useState('')
  const [password, setPassword] = useState(emptyPassword)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordNotice, setPasswordNotice] = useState('')

  const load = useCallback(() => {
    setState({ data: null, loading: true, error: null })
    Promise.all([authApi.dashboard(), authApi.me()]).then(([dashboard, investigator]) => {
      setState({ data: { ...dashboard, investigator }, loading: false, error: null })
      setIdentity({ fullName: investigator.fullName || '', email: investigator.email || '' })
    }).catch((error) => setState({ data: null, loading: false, error }))
  }, [])
  useEffect(() => { load() }, [load])

  const investigator = state.data?.investigator || user
  const statistics = state.data?.statistics
  const metrics = [
    { label: 'CASES INVESTIGATED', value: statistics?.casesInvestigated },
    { label: 'EVIDENCE REVIEWED', value: statistics?.evidenceReviewed },
    { label: 'THEORIES SUBMITTED', value: statistics?.solutionsSubmitted },
    { label: 'CASES SOLVED', value: statistics?.casesSolved },
  ]

  const saveProfile = async (event) => {
    event.preventDefault()
    setProfileError(null); setProfileNotice('')
    const fullName = identity.fullName.trim()
    const email = identity.email.trim()
    if (!fullName || !email) { setProfileError(new Error('Name and email are required.')); return }
    if (fullName.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProfileError(new Error('Enter a valid email address and a name within 100 characters.')); return
    }
    setSavingProfile(true)
    try {
      const updated = await authApi.updateProfile({ fullName, email })
      setIdentity({ fullName: updated.fullName, email: updated.email })
      setState((current) => ({ ...current, data: { ...current.data, investigator: updated } }))
      onProfileUpdated?.(updated)
      setProfileNotice('Identity record updated.')
    } catch (error) { setProfileError(error) }
    finally { setSavingProfile(false) }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setPasswordError(null); setPasswordNotice('')
    if (password.newPassword.length < 12 || password.newPassword.length > 128) {
      setPasswordError(new Error('Use a new password between 12 and 128 characters.')); return
    }
    if (password.newPassword !== password.confirmNewPassword) {
      setPasswordError(new Error('The new password confirmation does not match.')); return
    }
    setSavingPassword(true)
    try {
      await authApi.changePassword(password)
      setPassword(emptyPassword)
      setPasswordNotice('Password changed. This session is now closed; sign in with the new password.')
      window.setTimeout(() => onPasswordChanged?.(), 800)
    } catch (error) { setPasswordError(error) }
    finally { setSavingPassword(false) }
  }

  return <main className="profile-shell dossier-page">
    <SiteHeader navigate={navigate} user={user} onLogout={onLogout} active="profile" />
    <section className="profile-content">
      <button className="back-link" onClick={() => navigate('/dashboard')}><ArrowLeft size={15} /> Return to briefing</button>
      <div className="profile-title"><div><Eyebrow>FIELD OFFICE / INVESTIGATOR RECORD</Eyebrow><h1>Investigator profile.</h1><p>Identity, security, and activity recorded for this authenticated field office account.</p></div><div className="profile-index"><span>INVESTIGATOR ID</span><strong>{investigator?.investigatorId ? `CTI—${String(investigator.investigatorId).padStart(4, '0')}` : '—'}</strong></div></div>
      {state.loading ? <LoadingState label="Retrieving investigator record" /> : state.error ? <ErrorState error={state.error} onRetry={load} /> : <>
        <section className="profile-identity" aria-labelledby="profile-identity-heading"><div className="profile-monogram" aria-hidden="true"><Fingerprint size={22} /></div><div className="profile-identity-main"><Eyebrow icon={UserRound}>AUTHENTICATED INVESTIGATOR</Eyebrow><h2 id="profile-identity-heading">{investigator?.fullName}</h2><span>@{investigator?.username}</span></div><div className="profile-status"><i className={`status-dot ${investigator?.status === 'ACTIVE' ? 'status-good' : ''}`} /> {investigator?.status || 'UNKNOWN'}</div></section>
        <form className="profile-edit-section" onSubmit={saveProfile}>
          <div className="profile-section-heading"><div><Eyebrow>IDENTITY RECORD</Eyebrow><h2>Investigator details</h2></div><span>USERNAME IS FIXED</span></div>
          {profileError && <ErrorState error={profileError} />}{profileNotice && <div className="profile-inline-notice"><ShieldCheck size={15} />{profileNotice}</div>}
          <div className="profile-edit-grid">
            <label className="profile-field"><span>FULL NAME</span><input autoComplete="name" maxLength={100} required value={identity.fullName} onChange={(event) => setIdentity((current) => ({ ...current, fullName: event.target.value }))} /></label>
            <label className="profile-field"><span>USERNAME</span><input value={`@${investigator?.username || ''}`} readOnly aria-readonly="true" /><small>Username cannot be changed.</small></label>
            <label className="profile-field"><span>EMAIL</span><input autoComplete="email" type="email" maxLength={254} required value={identity.email} onChange={(event) => setIdentity((current) => ({ ...current, email: event.target.value }))} /></label>
            <div className="profile-field profile-readonly"><span>MEMBER SINCE</span><strong>{formatDate(investigator?.createdAt, { dateOnly: true })}</strong></div>
          </div>
          <div className="profile-form-actions"><button className="button button-primary" type="submit" disabled={savingProfile}>{savingProfile ? 'Saving identity…' : 'Save identity record'} <ArrowRight size={15} /></button></div>
        </form>
        <form className="profile-security-section" onSubmit={changePassword}>
          <div className="profile-section-heading"><div><Eyebrow>ACCOUNT SECURITY</Eyebrow><h2><KeyRound size={18} /> Change password</h2></div><span>SESSION REVOKED AFTER CHANGE</span></div>
          {passwordError && <ErrorState error={passwordError} />}{passwordNotice && <div className="profile-inline-notice"><ShieldCheck size={15} />{passwordNotice}</div>}
          <div className="password-edit-grid">
            <label className="profile-field"><span>CURRENT PASSWORD</span><input autoComplete="current-password" type="password" required maxLength={128} value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} /></label>
            <label className="profile-field"><span>NEW PASSWORD</span><input autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} /><small>Use 12–128 characters.</small></label>
            <label className="profile-field"><span>CONFIRM NEW PASSWORD</span><input autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={password.confirmNewPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmNewPassword: event.target.value }))} /></label>
          </div>
          <div className="profile-form-actions"><button className="button button-secondary" type="submit" disabled={savingPassword}>{savingPassword ? 'Updating password…' : 'Change password'} <ArrowRight size={15} /></button></div>
        </form>
        <section className="profile-activity"><div className="profile-section-heading"><div><Eyebrow>ACTIVITY REGISTER</Eyebrow><h2>Investigation record</h2></div><span>LIVE / DATABASE COUNTS</span></div><dl className="profile-metrics">{metrics.map(({ label, value }, index) => <div className="profile-metric" key={label}><dt><span className="metric-index">{String(index + 1).padStart(2, '0')}</span>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl></section>
      </>}
      <section className="profile-settings"><div><Eyebrow>ACCOUNT ACCESS</Eyebrow><h2>End this session</h2><p>Your session is protected by server-side authentication and CSRF validation.</p></div><button className="profile-logout" onClick={onLogout}><LogOut size={15} /> SIGN OUT <ArrowRight size={14} /></button></section>
    </section>
    <footer className="dossier-footer"><span>INVESTIGATOR FILE <span className="mono">/</span> CASETRACE</span></footer>
  </main>
}
