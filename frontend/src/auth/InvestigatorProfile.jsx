import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, FileSearch, Fingerprint, KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import SiteHeader from '../components/SiteHeader'
import { ErrorState, Eyebrow, formatDate, LoadingState } from '../components/Shared'
import { authApi } from '../lib/api'

const emptyPassword = { currentPassword: '', newPassword: '', confirmNewPassword: '' }
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function InvestigatorBadge({ investigator }) {
  const stageRef = useRef(null)
  const barcodeRef = useRef(null)
  const animationRef = useRef(0)
  const inertiaRef = useRef(0)
  const reducedMotionRef = useRef(false)
  const motionRef = useRef({ dragging: false, pointerId: null, rotation: 0, angularVelocity: 0, dx: 0, dy: 0, vx: 0, vy: 0, lastX: 0, lastY: 0, lastAt: 0, startX: 0, startY: 0, startRotation: 0, startDx: 0, startDy: 0, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, lastFrame: 0 })

  const writePose = (unit, card, pose) => {
    unit?.style.setProperty('--badge-swing', `${pose.rotation || 0}deg`)
    unit?.style.setProperty('--badge-dx', `${pose.dx || 0}px`)
    unit?.style.setProperty('--badge-dy', `${pose.dy || 0}px`)
    card?.style.setProperty('--badge-rx', `${pose.rx || 0}deg`)
    card?.style.setProperty('--badge-ry', `${pose.ry || 0}deg`)
    card?.style.setProperty('--badge-px', `${pose.px ?? 50}%`)
    card?.style.setProperty('--badge-py', `${pose.py ?? 32}%`)
  }

  const queuePose = (pose, tracking = false) => {
    const stage = stageRef.current
    const unit = stage?.querySelector('.badge-suspended-unit')
    const card = stage?.querySelector('.investigator-badge-card')
    if (!stage || !unit || !card || reducedMotionRef.current) return
    window.cancelAnimationFrame(animationRef.current)
    animationRef.current = window.requestAnimationFrame(() => {
      writePose(unit, card, pose)
      card.classList.toggle('badge-is-tracking', tracking)
    })
  }

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => {
      reducedMotionRef.current = preference.matches
      const stage = stageRef.current
      const unit = stage?.querySelector('.badge-suspended-unit')
      const card = stage?.querySelector('.investigator-badge-card')
      stage?.classList.toggle('badge-reduced-motion', preference.matches)
      if (preference.matches && unit && card) {
        window.cancelAnimationFrame(animationRef.current)
        window.cancelAnimationFrame(inertiaRef.current)
        motionRef.current = { ...motionRef.current, dragging: false, pointerId: null, rotation: 0, angularVelocity: 0, dx: 0, dy: 0, vx: 0, vy: 0 }
        unit.classList.remove('badge-is-dragging', 'badge-is-swinging')
        card.classList.remove('badge-is-tracking', 'badge-touch-active')
        writePose(unit, card, {})
      }
    }
    syncPreference()
    preference.addEventListener?.('change', syncPreference)
    return () => {
      preference.removeEventListener?.('change', syncPreference)
      window.cancelAnimationFrame(animationRef.current)
      window.cancelAnimationFrame(inertiaRef.current)
    }
  }, [])

  const trackPointer = (event) => {
    if (reducedMotionRef.current) return
    const unit = event.currentTarget
    const card = unit.querySelector('.investigator-badge-card')
    if (!card) return
    const bounds = card.getBoundingClientRect()
    const px = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100))
    const py = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100))
    const motion = motionRef.current
    if (motion.dragging && motion.pointerId === event.pointerId) {
      const now = performance.now()
      const elapsed = Math.max(1, now - motion.lastAt)
      const previousDx = motion.dx
      const previousDy = motion.dy
      motion.dx = clamp(motion.startDx + event.clientX - motion.startX, motion.bounds.minX, motion.bounds.maxX)
      motion.dy = clamp(motion.startDy + event.clientY - motion.startY, motion.bounds.minY, motion.bounds.maxY)
      const actualDx = motion.dx - previousDx
      const actualDy = motion.dy - previousDy
      const angleDelta = (event.clientX - motion.lastX) * 0.22 + (event.clientY - motion.lastY) * 0.08
      motion.rotation = clamp(motion.startRotation + (event.clientX - motion.startX) * 0.22 + (event.clientY - motion.startY) * 0.08, -24, 24)
      motion.angularVelocity = clamp((angleDelta / elapsed) * 16, -10, 10)
      motion.vx = clamp((actualDx / elapsed) * 16, -18, 18)
      motion.vy = clamp((actualDy / elapsed) * 16, -18, 18)
      motion.lastX = event.clientX
      motion.lastY = event.clientY
      motion.lastAt = now
      queuePose({ rotation: motion.rotation, dx: motion.dx, dy: motion.dy, rx: (50 - py) * 0.06, ry: (px - 50) * 0.08, px, py }, true)
      return
    }
    if (event.pointerType === 'touch') return
    const swinging = unit.classList.contains('badge-is-swinging')
    const rotation = swinging ? motion.rotation : clamp((px - 50) * 0.045, -2.5, 2.5)
    const dx = swinging ? motion.dx : (px - 50) * 0.035
    const dy = swinging ? motion.dy : -2
    if (!swinging) { motion.rotation = rotation; motion.dx = dx; motion.dy = dy }
    queuePose({ rotation, dx, dy, rx: (50 - py) * 0.12, ry: (px - 50) * 0.15, px, py }, true)
  }

  const beginDrag = (event) => {
    if (reducedMotionRef.current || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    const unit = event.currentTarget
    const card = unit.querySelector('.investigator-badge-card')
    if (!card) return
    const motion = motionRef.current
    const rect = unit.getBoundingClientRect()
    const safeX = 42
    const safeTop = 82
    const safeBottom = 38
    window.cancelAnimationFrame(inertiaRef.current)
    motion.dragging = true
    motion.pointerId = event.pointerId
    motion.startX = event.clientX
    motion.startY = event.clientY
    motion.startRotation = motion.rotation
    motion.startDx = motion.dx
    motion.startDy = motion.dy
    motion.bounds = {
      minX: motion.dx + Math.min(0, safeX - rect.left),
      maxX: motion.dx + Math.max(0, window.innerWidth - safeX - rect.right),
      minY: motion.dy + Math.min(0, safeTop - rect.top),
      maxY: motion.dy + Math.max(0, window.innerHeight - safeBottom - rect.bottom),
    }
    motion.lastX = event.clientX
    motion.lastY = event.clientY
    motion.lastAt = performance.now()
    motion.angularVelocity = 0
    motion.vx = 0
    motion.vy = 0
    unit.classList.remove('badge-is-swinging')
    unit.classList.add('badge-is-dragging')
    if (event.pointerType === 'touch') card.classList.add('badge-touch-active')
    try { unit.setPointerCapture(event.pointerId) } catch { /* Pointer capture is optional in older browsers. */ }
  }

  const endDrag = (event, cancelled = false) => {
    const unit = event.currentTarget
    const card = unit.querySelector('.investigator-badge-card')
    const motion = motionRef.current
    if (!motion.dragging || motion.pointerId !== event.pointerId) return
    motion.dragging = false
    motion.pointerId = null
    if (cancelled) { motion.angularVelocity *= 0.25; motion.vx *= 0.25; motion.vy *= 0.25 }
    unit.classList.remove('badge-is-dragging')
    card?.classList.remove('badge-touch-active')
    if (event.pointerType === 'touch') card?.classList.remove('badge-is-tracking')
    try { unit.releasePointerCapture(event.pointerId) } catch { /* Capture may already have been released. */ }
    motion.lastFrame = performance.now()
    unit.classList.add('badge-is-swinging')

    const swing = (now) => {
      const frameScale = Math.min(2.5, Math.max(0.5, (now - motion.lastFrame) / 16.67))
      motion.lastFrame = now
      motion.angularVelocity -= motion.rotation * 0.022 * frameScale
      motion.angularVelocity *= Math.pow(0.95, frameScale)
      motion.rotation = clamp(motion.rotation + motion.angularVelocity * frameScale, -24, 24)
      motion.vx -= motion.dx * 0.014 * frameScale
      motion.vy -= motion.dy * 0.014 * frameScale
      motion.vx *= Math.pow(0.9, frameScale)
      motion.vy *= Math.pow(0.9, frameScale)
      motion.dx += motion.vx * frameScale
      motion.dy += motion.vy * frameScale
      if (motion.dx < motion.bounds.minX) { motion.dx = motion.bounds.minX; motion.vx = Math.max(0, motion.vx) * 0.2 }
      if (motion.dx > motion.bounds.maxX) { motion.dx = motion.bounds.maxX; motion.vx = Math.min(0, motion.vx) * 0.2 }
      if (motion.dy < motion.bounds.minY) { motion.dy = motion.bounds.minY; motion.vy = Math.max(0, motion.vy) * 0.2 }
      if (motion.dy > motion.bounds.maxY) { motion.dy = motion.bounds.maxY; motion.vy = Math.min(0, motion.vy) * 0.2 }
      writePose(unit, card, { rotation: motion.rotation, dx: motion.dx, dy: motion.dy, rx: 0, ry: 0, px: 50, py: 32 })
      if (Math.abs(motion.rotation) < 0.12 && Math.abs(motion.angularVelocity) < 0.12 && Math.abs(motion.dx) < 0.2 && Math.abs(motion.dy) < 0.2 && Math.abs(motion.vx) < 0.12 && Math.abs(motion.vy) < 0.12) {
        motion.rotation = 0; motion.angularVelocity = 0; motion.dx = 0; motion.dy = 0; motion.vx = 0; motion.vy = 0
        unit.classList.remove('badge-is-swinging')
        card?.classList.remove('badge-is-tracking')
        writePose(unit, card, {})
        inertiaRef.current = 0
        return
      }
      inertiaRef.current = window.requestAnimationFrame(swing)
    }
    inertiaRef.current = window.requestAnimationFrame(swing)
  }

  const leaveBadge = (event) => {
    const motion = motionRef.current
    if (motion.dragging) return
    const unit = event.currentTarget
    const card = unit.querySelector('.investigator-badge-card')
    card?.classList.remove('badge-is-tracking')
    if (!unit.classList.contains('badge-is-swinging')) {
      motion.rotation = 0; motion.dx = 0; motion.dy = 0
    }
    queuePose({ rotation: motion.rotation, dx: motion.dx, dy: motion.dy, rx: 0, ry: 0, px: 50, py: 32 }, false)
  }

  const investigatorId = investigator?.investigatorId
  const numericId = typeof investigatorId === 'number' ? investigatorId : Number(investigatorId)
  const badgeId = Number.isSafeInteger(numericId) && numericId > 0
    ? `CTI-${String(numericId).padStart(4, '0')}`
    : null

  useEffect(() => {
    if (!barcodeRef.current || !badgeId) return
    JsBarcode(barcodeRef.current, badgeId, {
      format: 'CODE128',
      lineColor: '#171914',
      background: '#eee8d9',
      width: 1.5,
      height: 42,
      displayValue: false,
      marginTop: 10,
      marginBottom: 10,
      marginLeft: 16,
      marginRight: 16,
    })
    barcodeRef.current.setAttribute('role', 'img')
    barcodeRef.current.setAttribute('aria-label', `Code 128 barcode for ${badgeId}`)
    barcodeRef.current.setAttribute('shape-rendering', 'crispEdges')
  }, [badgeId])

  const joined = investigator?.createdAt ? formatDate(investigator.createdAt, { dateOnly: true }) : null

  return <div className="investigator-badge-stage" ref={stageRef}>
    <div className="badge-suspended-unit" onPointerEnter={trackPointer} onPointerMove={trackPointer} onPointerLeave={leaveBadge} onPointerDown={beginDrag} onPointerUp={endDrag} onPointerCancel={(event) => endDrag(event, true)}>
      <div className="badge-lanyard" aria-hidden="true"><span /><i /></div>
      <article className="investigator-badge-card" aria-label={`CASETRACE display badge for ${investigator?.fullName || 'investigator'}`}>
      <div className="badge-perforation" aria-hidden="true" />
      <div className="badge-card-inner">
        <header className="badge-masthead"><span className="badge-wordmark">CASETRACE</span><span className="badge-card-type">FIELD ID / 01</span></header>
        <div className="badge-rule" />
        {badgeId && <div className="badge-number"><span>INVESTIGATOR ID</span><strong>{badgeId}</strong></div>}
        <div className="badge-name-block">
          <span className="badge-kicker">AUTHORIZED PERSONNEL</span>
          <h2>{investigator?.fullName || 'Investigator'}</h2>
          {investigator?.username && <p>@{investigator.username}</p>}
        </div>
        <div className="badge-access-row"><span>ACCESS LEVEL</span><strong>INVESTIGATOR</strong></div>
        {investigator?.status && <div className="badge-status-row"><i className={investigator.status === 'ACTIVE' ? 'badge-status-dot is-active' : 'badge-status-dot'} />{investigator.status} ACCOUNT</div>}
        {joined && <div className="badge-joined-row"><span>REGISTERED</span><strong>{joined}</strong></div>}
        <div className="badge-lower-band">
          <div className="badge-id-strip">
            {badgeId ? <svg ref={barcodeRef} className="badge-code128" /> : <span className="badge-no-id">BARCODE UNAVAILABLE — ID NOT PROVIDED</span>}
            <span>CODE 128 / INVESTIGATOR ID</span>
            <strong>{badgeId || 'INVESTIGATOR ID UNAVAILABLE'}</strong>
          </div>
          <div className="badge-file-mark" aria-hidden="true"><FileSearch size={25} strokeWidth={1.2} /><span>CT / FIELD FILE</span></div>
        </div>
      </div>
      <span className="badge-side-label" aria-hidden="true">AUTHORIZED INVESTIGATOR</span>
      <span className="badge-pointer-light" aria-hidden="true" />
      </article>
    </div>
    <p className="badge-display-note"><BadgeCheck size={12} /> DISPLAY IDENTITY / NOT AN ACCESS CREDENTIAL</p>
  </div>
}
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
        <div className="profile-overview">
          <InvestigatorBadge investigator={investigator} />
          <section className="profile-identity" aria-labelledby="profile-identity-heading"><div className="profile-monogram" aria-hidden="true"><Fingerprint size={22} /></div><div className="profile-identity-main"><Eyebrow icon={UserRound}>AUTHENTICATED INVESTIGATOR</Eyebrow><h2 id="profile-identity-heading">{investigator?.fullName}</h2><span>@{investigator?.username}</span></div><div className="profile-status"><i className={`status-dot ${investigator?.status === 'ACTIVE' ? 'status-good' : ''}`} /> {investigator?.status || 'UNKNOWN'}</div></section>
        </div>
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
