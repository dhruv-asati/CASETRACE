import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, Archive, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, BadgeCheck, Binoculars,
  BookOpen, Camera, CarFront, ChevronRight, CircleDot, Clock3, FileSearch, Fingerprint, KeyRound,
  Link2, MapPin, MessageSquareQuote, Pencil, Plus, Search, ShieldAlert, ShieldCheck, Sparkles, Trash2, Users, Waves, X,
} from 'lucide-react'
import { api, authApi, toApiTimestamp } from './lib/api'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoginPage, RegisterPage } from './auth/AuthPages'
import InvestigatorDashboard from './auth/InvestigatorDashboard'
import InvestigatorProfile from './auth/InvestigatorProfile'
import SiteHeader from './components/SiteHeader'
import {
  DataTable, EmptyState, ErrorState, Eyebrow, formatDate, LoadingState, Panel, RecordMeta,
  ResourceState, SectionHeading, Tag,
} from './components/Shared'

const sections = [
  { id: 'overview', label: 'Case overview', icon: BookOpen },
  { id: 'suspects', label: 'People of interest', icon: Users },
  { id: 'evidence', label: 'Evidence locker', icon: Fingerprint },
  { id: 'cctv', label: 'CCTV observations', icon: Camera },
  { id: 'access-logs', label: 'Access logs', icon: KeyRound },
  { id: 'phone-records', label: 'Phone records', icon: AudioLines },
  { id: 'witnesses', label: 'Witness accounts', icon: MessageSquareQuote },
  { id: 'vehicles', label: 'Vehicles', icon: CarFront },
  { id: 'vehicle-logs', label: 'Vehicle movements', icon: Activity },
  { id: 'timeline', label: 'Case timeline', icon: Clock3 },
  { id: 'connections', label: 'Connections', icon: Link2 },
  { id: 'contradictions', label: 'Contradictions', icon: ShieldAlert },
  { id: 'search', label: 'Investigation search', icon: Search },
  { id: 'solve', label: 'Submit theory', icon: BadgeCheck },
]

const apiSections = ['suspects', 'evidence', 'cctv', 'access-logs', 'phone-records', 'witnesses', 'witness-statements', 'vehicles', 'vehicle-logs', 'timeline', 'timeline-records', 'participants', 'connections', 'contradictions']
const emptyResource = () => ({ data: null, loading: true, error: null })

function getRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const match = path.match(/^\/case\/(\d+)$/)
  if (match) return { page: 'case', caseId: match[1] }
  if (path === '/login') return { page: 'login', returnTo: new URLSearchParams(window.location.search).get('returnTo'), registered: new URLSearchParams(window.location.search).get('registered') === '1', passwordChanged: new URLSearchParams(window.location.search).get('passwordChanged') === '1' }
  if (path === '/register') return { page: 'register' }
  if (path === '/dashboard') return { page: 'dashboard' }
  if (path === '/profile') return { page: 'profile' }
  if (path === '/cases') return { page: 'cases' }
  if (path === '/cases/new') return { page: 'new-case' }
  return { page: 'landing' }
}

function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}

function AppRoutes() {
  const auth = useAuth()
  const [route, setRoute] = useState(getRoute)
  const navigate = useCallback((path, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
    setRoute(getRoute())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  useEffect(() => {
    const onPop = () => setRoute(getRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const isPrivate = ['case', 'cases', 'new-case', 'dashboard', 'profile'].includes(route.page)
  useEffect(() => {
    if (auth.loading) return
    if (isPrivate && !auth.user) {
      const target = `${window.location.pathname}${window.location.search}`
      window.sessionStorage.setItem('casetrace:return-to', target)
      navigate(`/login?returnTo=${encodeURIComponent(target)}`, true)
    } else if (!isPrivate && auth.user && ['login', 'register'].includes(route.page)) {
      navigate('/dashboard', true)
    }
  }, [auth.loading, auth.user, isPrivate, navigate, route.page])

  const signOut = async () => {
    try { await auth.logout() } catch { /* The server session can expire independently. */ }
    navigate('/', true)
  }
  const afterLogin = () => {
    const saved = route.returnTo || window.sessionStorage.getItem('casetrace:return-to')
    window.sessionStorage.removeItem('casetrace:return-to')
    const safeTarget = saved && (/^\/cases\/?$/.test(saved) || /^\/cases\/new\/?$/.test(saved) || /^\/(dashboard|profile)\/?$/.test(saved) || /^\/case\/\d+\/?$/.test(saved)) ? saved : '/dashboard'
    navigate(safeTarget, true)
  }

  if (route.page === 'login') return <LoginPage navigate={navigate} onLogin={auth.login} returnTo={afterLogin} registered={route.registered} passwordChanged={route.passwordChanged} />
  if (route.page === 'register') return <RegisterPage navigate={navigate} onRegister={auth.register} />
  if (isPrivate && auth.loading) return <main className="auth-shell"><LoadingState label="Checking investigator session" /></main>
  if (isPrivate && !auth.user) return <main className="auth-shell"><LoadingState label="Opening investigator login" /></main>
  if (route.page === 'dashboard') return <InvestigatorDashboard navigate={navigate} user={auth.user} onLogout={signOut} />
  if (route.page === 'profile') return <InvestigatorProfile navigate={navigate} user={auth.user} onLogout={signOut} onProfileUpdated={auth.updateUser} onPasswordChanged={() => { auth.clearSession(); navigate('/login?passwordChanged=1', true) }} />
  if (route.page === 'case') return <CaseInvestigation key={route.caseId} caseId={route.caseId} navigate={navigate} user={auth.user} onLogout={signOut} />
  if (route.page === 'cases') return <CaseSelection navigate={navigate} user={auth.user} onLogout={signOut} />
  if (route.page === 'new-case') return <NewCase navigate={navigate} user={auth.user} onLogout={signOut} />
  return <Landing navigate={navigate} user={auth.user} onLogout={signOut} />
}

function Landing({ navigate, user, onLogout }) {
  const sequenceRef = useRef(null)
  const stageRef = useRef(null)
  const resolutionRef = useRef(null)
  const [summaries, setSummaries] = useState([])
  const [summaryState, setSummaryState] = useState({ loading: false, error: false })
  const [records, setRecords] = useState({ caseFile: null, evidence: [], cctv: [], access: [], witness: [], phone: [], vehicle: [], connections: [], contradictions: [], loading: false, error: false })

  useEffect(() => {
    document.body.classList.add('landing-v4-active')
    return () => document.body.classList.remove('landing-v4-active')
  }, [])

  useEffect(() => {
    if (!user) { setSummaries([]); setSummaryState({ loading: false, error: false }); return undefined }
    let current = true
    setSummaryState({ loading: true, error: false })
    api.listCases().then((result) => {
      if (!current) return
      setSummaries(Array.isArray(result) ? result : [])
      setSummaryState({ loading: false, error: false })
    }).catch(() => { if (current) setSummaryState({ loading: false, error: true }) })
    return () => { current = false }
  }, [user?.investigatorId])

  const selectedCase = summaries[0] || null
  const caseId = user ? selectedCase?.caseId : null

  useEffect(() => {
    if (!user || !caseId) { setRecords({ caseFile: null, evidence: [], cctv: [], access: [], witness: [], phone: [], vehicle: [], connections: [], contradictions: [], loading: false, error: false }); return undefined }
    let current = true
    setRecords((value) => ({ ...value, loading: true, error: false }))
    const sections = ['evidence', 'cctv', 'access-logs', 'witness-statements', 'phone-records', 'vehicle-logs', 'connections', 'contradictions']
    Promise.allSettled([api.getCase(caseId), ...sections.map((section) => api.getSection(caseId, section))]).then((results) => {
      if (!current) return
      const [caseFile, ...responses] = results
      const values = Object.fromEntries(sections.map((key, index) => [key, responses[index].status === 'fulfilled' && Array.isArray(responses[index].value) ? responses[index].value : []]))
      setRecords({ caseFile: caseFile.status === 'fulfilled' ? caseFile.value : selectedCase, evidence: values.evidence, cctv: values.cctv, access: values['access-logs'], witness: values['witness-statements'], phone: values['phone-records'], vehicle: values['vehicle-logs'], connections: values.connections, contradictions: values.contradictions, loading: false, error: results.some((result) => result.status === 'rejected') })
    })
    return () => { current = false }
  }, [user?.investigatorId, caseId])

  useEffect(() => {
    const clamp = (value) => Math.max(0, Math.min(1, value))
    const smooth = (start, end, value) => { const t = clamp((value - start) / (end - start)); return t * t * (3 - 2 * t) }
    const mix = (a, b, t) => a + (b - a) * t
    const envelope = (progress, start, full, fade, end) => smooth(start, full, progress) * (1 - smooth(fade, end, progress))
    const sample = (points, progress) => {
      for (let i = 1; i < points.length; i += 1) {
        if (progress <= points[i][0]) {
          const [a, b] = [points[i - 1], points[i]]
          const t = smooth(a[0], b[0], progress)
          return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t), mix(a[4], b[4], t)]
        }
      }
      return points[points.length - 1].slice(1)
    }
    const sequence = sequenceRef.current
    const stage = stageRef.current
    const resolution = resolutionRef.current
    if (!sequence || !stage || !resolution) return undefined
    const heroCopy = stage.querySelector('.v4-hero-copy')
    const landingFooter = document.querySelector('.landing-cinematic-footer')

    let startY = 0
    let range = 1
    let target = 0
    let current = 0
    let frame = 0
    let lastFrame = 0
    let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const points = [[0, 0, 0, .9, 0], [.15, 0, -18, 1.02, -.4], [.34, -22, -25, 1.13, -1], [.52, 24, -18, 1.15, .7], [.69, 4, -22, 1.1, 0], [.82, 0, -8, 1.04, 0], [1, 0, 0, .96, 0]]
    const write = (progress) => {
      const file = (.08 + .92 * smooth(0, .16, progress)) * (1 - .92 * smooth(.84, .91, progress))
      const mobile = window.matchMedia('(max-width: 600px)').matches
      const phone = envelope(progress, mobile ? .3 : .2, mobile ? .39 : .31, mobile ? .56 : .45, mobile ? .66 : .58) * .82
      const cctv = mobile
        ? envelope(progress, .14, .22, .32, .41) * (1 - smooth(.27, .36, progress))
        : envelope(progress, .14, .22, .35, .46)
      const access = envelope(progress, .38, .47, .61, .7)
      const witness = envelope(progress, .53, .61, .68, .76) * .55
      const vehicle = envelope(progress, .6, .68, .74, .82) * .3
      const links = .06 + envelope(progress, .47, .55, .65, .72) * .58
      const anomaly = envelope(progress, .59, .67, .75, .81)
      const dim = 0
      const deskAlpha = 1 - smooth(.88, .94, progress)
      const archive = smooth(.91, .96, progress)
      const heroAlpha = 1 - smooth(.87, .95, progress)
      const [x, y, scale, rotate] = sample(points, progress)
      stage.style.setProperty('--progress', progress.toFixed(4))
      stage.style.setProperty('--camera-x', `${(x * window.innerWidth / 1440).toFixed(2)}px`)
      stage.style.setProperty('--camera-y', `${y.toFixed(2)}px`)
      stage.style.setProperty('--camera-scale', scale.toFixed(4))
      stage.style.setProperty('--camera-rotate', `${rotate.toFixed(3)}deg`)
      stage.style.setProperty('--hero-open', (1 - smooth(0, .22, progress)).toFixed(4))
      stage.style.setProperty('--hero-alpha', heroAlpha.toFixed(4))
      stage.style.setProperty('--file-reveal', file.toFixed(4))
      stage.style.setProperty('--file-exit', smooth(.84, .91, progress).toFixed(4))
      stage.style.setProperty('--cctv-reveal', cctv.toFixed(4))
      stage.style.setProperty('--access-reveal', access.toFixed(4))
      stage.style.setProperty('--witness-reveal', witness.toFixed(4))
      stage.style.setProperty('--phone-reveal', phone.toFixed(4))
      stage.style.setProperty('--connection-reveal', links.toFixed(4))
      stage.style.setProperty('--vehicle-reveal', vehicle.toFixed(4))
      stage.style.setProperty('--anomaly-reveal', anomaly.toFixed(4))
      stage.style.setProperty('--scene-dim', dim.toFixed(4))
      stage.style.setProperty('--desk-alpha', deskAlpha.toFixed(4))
      stage.style.setProperty('--archive-reveal', archive.toFixed(4))
      landingFooter?.style.setProperty('--ending-opacity', (1 - smooth(.9, .96, progress)).toFixed(4))
      stage.style.setProperty('--focus-x', `${mix(-120, 215, smooth(.03, .31, progress)).toFixed(2)}px`)
      stage.style.setProperty('--focus-y', `${mix(-10, 64, smooth(.1, .3, progress)).toFixed(2)}px`)
      const ready = progress > .9
      resolution.classList.toggle('is-ready', ready)
      resolution.setAttribute('aria-hidden', String(!ready))
      resolution.inert = !ready
    }
    const measure = () => {
      const rect = sequence.getBoundingClientRect()
      startY = rect.top + window.scrollY
      range = Math.max(1, sequence.offsetHeight - window.innerHeight)
      return clamp((window.scrollY - startY) / range)
    }
    const measureHeroCenter = () => {
      if (!heroCopy) return
      const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0
      const centerOffsetX = stage.clientWidth / 2 - heroCopy.offsetLeft - heroCopy.offsetWidth / 2
      const centerOffset = window.innerHeight / 2 - headerHeight - heroCopy.offsetTop - heroCopy.offsetHeight / 2
      stage.style.setProperty('--hero-center-x', `${centerOffsetX.toFixed(2)}px`)
      stage.style.setProperty('--hero-center-y', `${centerOffset.toFixed(2)}px`)
    }
    const tick = (now) => {
      frame = 0
      if (reduced) return
      const elapsed = lastFrame ? Math.min(64, now - lastFrame) : 16
      lastFrame = now
      const follow = 1 - Math.exp(-elapsed / 92)
      current += (target - current) * follow
      if (Math.abs(target - current) < .0006) current = target
      write(current)
      if (current !== target) frame = requestAnimationFrame(tick)
      else lastFrame = 0
    }
    const schedule = () => {
      if (reduced) return
      target = measure()
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const onResize = () => { measureHeroCenter(); schedule() }
    measureHeroCenter()
    target = measure()
    current = reduced ? 0 : target
    write(current)
    if (!reduced) write(target)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionChange = () => {
      reduced = motion.matches
      if (reduced) { cancelAnimationFrame(frame); frame = 0; resolution.classList.remove('is-ready'); resolution.setAttribute('aria-hidden', 'true'); resolution.inert = true }
      else { target = measure(); current = target; write(current) }
    }
    motion.addEventListener?.('change', onMotionChange)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', onResize); motion.removeEventListener?.('change', onMotionChange) }
  }, [])

  const fieldCase = records.caseFile || selectedCase
  const trainingCase = { caseCode: 'TRAINING / 01', title: 'The Missing Diamond', description: 'A gallery display was found open after the evening exhibition.', incidentLocation: 'EAST GALLERY', evidenceCount: 3 }
  const caseFile = user ? fieldCase : trainingCase
  const trainingEvidence = [
    { evidenceCode: 'CAM / 04', evidenceType: 'CCTV FRAME', timestamp: '21:31:08', locationName: 'EAST GALLERY', activity: 'A figure crosses the gallery threshold.' },
    { evidenceCode: 'ENTRY / 02', evidenceType: 'ACCESS LOG', timestamp: '21:34:12', locationName: 'EXHIBITION ROOM', activity: 'A credential is used after the room closes.' },
    { evidenceCode: 'NOTE / 01', evidenceType: 'WITNESS STATEMENT', timestamp: '21:40:00', locationName: 'NORTH CORRIDOR', statement: 'A time in the account needs another look.' },
    { evidenceCode: 'CALL / 03', evidenceType: 'PHONE RECORD', timestamp: '21:37:44', locationName: 'EAST GALLERY', activity: 'A short call is recorded before the report.' },
  ]
  const evidence = user ? records.evidence : trainingEvidence
  const cctv = user ? records.cctv[0] : trainingEvidence[0]
  const access = user ? records.access[0] : trainingEvidence[1]
  const witness = user ? records.witness[0] : trainingEvidence[2]
  const phone = user ? records.phone[0] : trainingEvidence[3]
  const vehicle = user ? records.vehicle[0] : null
  const connection = records.connections[0]
  const contradiction = records.contradictions[0]
  const value = (record, ...keys) => { for (const key of keys) if (record?.[key] !== undefined && record?.[key] !== null && String(record[key]).trim()) return String(record[key]); return '' }
  const evidenceCode = (record, fallback) => value(record, 'evidenceCode', 'recordCode', 'cameraId', 'accessCode') || fallback
  const recordTime = (record) => value(record, 'timestamp', 'recordedAt', 'discoveredAt', 'eventTime', 'time') || 'TIME / NOT RECORDED'
  const recordPlace = (record) => value(record, 'locationName', 'location', 'placeName', 'locationId') || 'LOCATION / NOT RECORDED'
  const recordDescription = (record) => value(record, 'activity', 'description', 'statement', 'eventDescription', 'phoneNumber') || 'No description returned by this record.'
  const noCases = user && !summaryState.loading && (summaryState.error || summaries.length === 0)
  const connectionFrom = user ? value(connection, 'fromLabel', 'personName', 'sourceLabel') || 'PERSON LINK NOT RETURNED' : 'M. VALE / PERSON OF INTEREST'
  const connectionTo = user ? value(connection, 'toLabel', 'evidenceLabel', 'targetLabel') || 'RECORD LINK NOT RETURNED' : 'CAMERA 04 / EAST GALLERY'
  const connectionType = user ? value(connection, 'relationship', 'connectionType', 'eventType') || 'RELATED RECORD' : 'ACCESS EVENT / 21:34'
  const anomalyTitle = user ? value(contradiction, 'person', 'suspectName') || (records.loading ? 'Comparing source records…' : 'No contradiction returned.') : 'Time record does not align'
  const anomalyDescription = user && contradiction ? `${value(contradiction, 'claimedLocation', 'claimLocation') || 'Claim location'} / recorded at ${value(contradiction, 'recordedLocation', 'recordLocation') || 'recorded location'}` : user ? 'Review the returned statements beside their source records.' : 'Witness account / access record · 21:34'

  return <main className="landing-cinematic landing-v4">
    <SiteHeader navigate={navigate} user={user} onLogout={onLogout} active="" />
    <section className="v4-scroll-length" ref={sequenceRef} aria-label="CASETRACE investigation desk">
      <div className="v4-stage" ref={stageRef}>
        <div className="v4-background" aria-hidden="true"><span className="v4-desk-grain" /><span className="v4-desk-rule rule-horizontal" /><span className="v4-desk-rule rule-vertical" /><span className="v4-desk-stamp">FIELD OFFICE / PRIVATE EVIDENCE ROOM</span></div>
        <div className="v4-world">
          <div className="v4-hero-copy"><span className="v4-eyebrow">CASETRACE / PRIVATE INVESTIGATION DESK</span><h1>Every record<br /><em>leaves a trail.</em></h1><p>Follow the evidence. Connect the clues.</p><span className="v4-hero-meta">DIGITAL FORENSIC ARCHIVE <i>·</i> EST. 2026</span></div>
          <div className="v4-camera" aria-hidden="true">
            <div className="v4-case-file" aria-hidden="true">
              <span className="v4-folder-tab">CASE FILE / {user ? caseFile?.caseCode || 'REGISTER' : 'TRAINING 01'}</span>
              <div className="v4-paper-face"><div className="v4-paper-mast"><span>CASETRACE <i>/</i> FIELD COPY</span><span>{user ? caseFile?.status || 'OPEN FILE' : 'ILLUSTRATIVE'}</span></div><div className="v4-paper-title"><small>INVESTIGATION RECORD / 00—01</small><strong>{caseFile?.title || (noCases ? 'No open case files' : summaryState.loading ? 'Opening case register…' : 'Case file')}</strong><p>{caseFile?.description || (noCases ? 'The case register returned no files.' : 'The selected record is not available yet.')}</p></div><div className="v4-paper-fields"><span>INCIDENT LOCATION<b>{caseFile?.incidentLocation || caseFile?.locationName || 'NOT RECORDED'}</b></span><span>RECORDS LINKED<b>{caseFile?.evidenceCount ?? evidence.length}</b></span><span>CLASSIFICATION<b>{user ? caseFile?.difficulty || 'ACTIVE' : 'TRAINING FILE'}</b></span></div><small className="v4-page-number">CT / {caseFile?.caseId || '00—01'} / 01</small></div>
              <span className="v4-paper-underlay" aria-hidden="true" />
            </div>
            <div className="v4-artifact v4-cctv" aria-hidden="true"><span className="v4-artifact-head"><b>CAMERA RECORD / 04</b><i>{recordTime(cctv)}</i></span><span className="v4-cctv-frame"><i /><b>REC</b><small>{recordPlace(cctv)}</small></span><strong>{evidenceCode(cctv, 'CCTV / NO RECORD')}</strong><p>{recordDescription(cctv)}</p></div>
            <div className="v4-artifact v4-access" aria-hidden="true"><span className="v4-artifact-head"><b>ACCESS LOG</b><i>{recordTime(access)}</i></span><strong>{evidenceCode(access, 'ACCESS / NO RECORD')}</strong><p>{recordDescription(access)}</p><small>{recordPlace(access)}</small></div>
            <div className="v4-artifact v4-witness" aria-hidden="true"><span className="v4-artifact-head"><b>WITNESS STATEMENT</b><i>RECORD / 03</i></span><p>{recordDescription(witness)}</p><small>{recordTime(witness)} / {recordPlace(witness)}</small></div>
            <div className="v4-artifact v4-phone" aria-hidden="true"><span className="v4-artifact-head"><b>PHONE RECORD</b><i>{recordTime(phone)}</i></span><strong>{evidenceCode(phone, 'PHONE / NO RECORD')}</strong><p>{recordDescription(phone)}</p></div>
            {vehicle && <div className="v4-artifact v4-vehicle" aria-hidden="true"><span className="v4-artifact-head"><b>VEHICLE EVENT</b><i>{recordTime(vehicle)}</i></span><strong>{evidenceCode(vehicle, 'VEHICLE / NO RECORD')}</strong><small>{recordDescription(vehicle)}</small></div>}
            <svg className="v4-connection-strings" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M160 470 C320 470 350 270 520 270 S760 330 920 330 S1000 490 1080 510" /><path pathLength="1" d="M180 490 C300 620 430 590 610 610 S850 560 920 345" /></svg>
            <div className="v4-focus-frame" aria-hidden="true"><i /><i /><i /><i /><span /></div>
            <span className="v4-anomaly-pin" aria-hidden="true"><i /> SOURCE MISMATCH / REVIEW</span>
          </div>
          <div className="v4-world-wash" aria-hidden="true" />
        </div>
        <div className="v4-resolution" ref={resolutionRef} aria-hidden="true"><span className="v4-eyebrow">CASETRACE <i>/</i> INVESTIGATION DESK</span><Fingerprint size={24} strokeWidth={1.2} /><p>FOLLOW THE EVIDENCE.<br /><em>SOLVE THE MYSTERY.</em></p><button className="v4-archive-cta" type="button" onClick={() => navigate(user ? '/cases' : '/login')}>OPEN CASE ARCHIVE <ArrowRight size={15} /></button></div>
        <div className="v4-progress-rail" aria-hidden="true"><span>FIELD VIEW</span><i><b /></i><span>CASE ARCHIVE</span></div>
        {summaryState.loading && <span className="v4-state-note" role="status">CONNECTING TO CASE REGISTER…</span>}
        {noCases && <span className="v4-state-note" role="status">{summaryState.error ? 'CASE REGISTER UNAVAILABLE' : 'NO OPEN FILES IN THE REGISTER'}</span>}
      </div>
    </section>
    <section className="v4-static-desk"><span className="v4-eyebrow">CASETRACE / PRIVATE INVESTIGATION DESK</span><h1>Every record<br /><em>leaves a trail.</em></h1><p>Follow the evidence. Connect the clues.</p><div className="v4-static-file"><span>FIELD COPY / ILLUSTRATIVE</span><strong>{caseFile?.title || 'Case file'}</strong><small>{caseFile?.description || 'Open the register to begin an investigation.'}</small></div><div className="v4-static-evidence"><span>CCTV / {evidenceCode(cctv, 'NO RECORD')}</span></div><button className="v4-archive-cta" type="button" onClick={() => navigate(user ? '/cases' : '/login')}>OPEN CASE ARCHIVE <ArrowRight size={15} /></button></section>
    <footer className="landing-cinematic-footer"><span>CASETRACE / PRIVATE INVESTIGATION DESK</span><span>FOLLOW THE EVIDENCE. SOLVE THE MYSTERY.</span></footer>
  </main>
}
function CaseSelection({ navigate, user, onLogout }) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const load = useCallback(() => { setState({ data: null, loading: true, error: null }); api.listCases().then((data) => setState({ data, loading: false, error: null })).catch((error) => setState({ data: null, loading: false, error })) }, [])
  useEffect(() => { load() }, [load])
  return <main className="selection-shell dossier-archive"><SiteHeader navigate={navigate} user={user} onLogout={onLogout} active="archive" /><section className="selection-content"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={15} /> Return to desk</button><div className="selection-title"><div><Eyebrow>FIELD OFFICE / CASE REGISTER</Eyebrow><h1>Open case files.</h1><p>Live records from the CASETRACE investigation archive.</p></div><div className="archive-index"><span>REGISTER / {new Date().getFullYear()}</span><strong>{state.data ? String(state.data.length).padStart(2, '0') : '—'} <small>FILES</small></strong><small>SELECT A FILE TO EXAMINE</small></div></div>
    <div className="archive-actions"><span className="archive-live-note"><i className="status-dot status-good" /> DATABASE / LIVE REGISTER</span><button className="archive-create-link" onClick={() => navigate('/cases/new')}>CREATE CASE FILE <ArrowRight size={15} /></button></div><div className="case-grid-wrap"><ResourceState loading={state.loading} error={state.error} data={state.data} onRetry={load} emptyTitle="No case files available" emptyDetail="The case archive did not return any cases.">{<div className="case-register">{state.data?.map((item, index) => <CaseCard key={item.caseId} item={item} index={index} onOpen={() => navigate(`/case/${item.caseId}`)} />)}</div>}</ResourceState></div>
    <div className="archive-note"><span className="status-dot status-good" /><span>LIVE CASE RECORDS</span><span className="mono">/</span><span>DRAWN FROM THE RELATIONAL ARCHIVE</span></div></section><footer className="selection-footer"><span>FIELD OFFICE ARCHIVE <span className="mono">/</span> CASETRACE</span></footer></main>
}

function NewCase({ navigate, user, onLogout }) {
  const [form, setForm] = useState({ title: '', caseType: 'THEFT', incidentAt: '', location: '', address: '', description: '', difficulty: 'MEDIUM' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [created, setCreated] = useState(null)
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.location.trim() || !form.description.trim() || !form.incidentAt) {
      setError(new Error('Complete the case title, incident date and time, location, and description.'))
      return
    }
    setSaving(true); setError(null)
    try {
      const result = await api.createCase({ ...form, title: form.title.trim(), location: form.location.trim(), address: form.address.trim() || null, description: form.description.trim(), incidentAt: toApiTimestamp(form.incidentAt) })
      setCreated(result)
      window.setTimeout(() => navigate(`/case/${result.caseId}`), 650)
    } catch (caught) { setError(caught) }
    finally { setSaving(false) }
  }
  return <main className="selection-shell new-case-shell"><SiteHeader navigate={navigate} user={user} onLogout={onLogout} active="archive" /><section className="new-case-content"><button className="back-link" type="button" onClick={() => navigate('/cases')}><ArrowLeft size={15} /> Return to case register</button><div className="new-case-heading"><Eyebrow>FIELD OFFICE / NEW INVESTIGATION</Eyebrow><h1>Create a case file.</h1><p>Establish the incident record. Evidence and participants can be added as the investigation develops.</p></div>{created && <div className="case-created-notice" role="status">Case file {created.caseCode} created. Opening investigation…</div>}{error && <ErrorState error={error} />}<form className="new-case-form" onSubmit={submit}><div className="new-case-form-head"><span>CASE FILE / INITIAL RECORD</span><span>CREATOR <b>{user?.username || 'AUTHENTICATED INVESTIGATOR'}</b></span></div><label className="form-label"><span>CASE TITLE <i>REQUIRED</i></span><input autoFocus maxLength={160} required value={form.title} onChange={change('title')} placeholder="Give this investigation a title" /></label><div className="form-two-col"><label className="form-label"><span>CASE TYPE</span><select value={form.caseType} onChange={change('caseType')}><option value="THEFT">Theft</option><option value="DISAPPEARANCE">Disappearance</option><option value="SABOTAGE">Sabotage</option><option value="FRAUD">Fraud</option><option value="OTHER">Other</option></select></label><label className="form-label"><span>DIFFICULTY</span><select value={form.difficulty} onChange={change('difficulty')}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label></div><div className="form-two-col"><label className="form-label"><span>INCIDENT DATE / TIME <i>REQUIRED</i></span><input type="datetime-local" required value={form.incidentAt} onChange={change('incidentAt')} /></label><label className="form-label"><span>LOCATION <i>REQUIRED</i></span><input maxLength={160} required value={form.location} onChange={change('location')} placeholder="Incident location" /></label></div><label className="form-label"><span>LOCATION ADDRESS <small>OPTIONAL</small></span><input maxLength={120} value={form.address} onChange={change('address')} placeholder="Street address or area" /></label><label className="form-label"><span>INCIDENT SUMMARY <i>REQUIRED</i></span><textarea required maxLength={4000} rows={5} value={form.description} onChange={change('description')} placeholder="Record what is currently known about the incident." /><small>{form.description.length}/4000 characters</small></label><div className="new-case-submit"><span>CREATOR ATTRIBUTION IS TAKEN FROM YOUR SIGNED-IN SESSION.</span><button className="button button-primary button-large" type="submit" disabled={saving || !!created}>{saving ? 'Creating case file…' : created ? 'Case file created' : 'Create case file'} <ArrowRight size={15} /></button></div></form></section></main>
}

function CaseCard({ item, index, onOpen }) {
  const number = String(index + 1).padStart(2, '0')
  const incident = formatDate(item.incidentAt)
  const [contradictionCount, setContradictionCount] = useState(null)
  useEffect(() => {
    let current = true
    api.getSection(item.caseId, 'contradictions').then((rows) => {
      if (current) setContradictionCount(Array.isArray(rows) ? rows.length : null)
    }).catch(() => { if (current) setContradictionCount(null) })
    return () => { current = false }
  }, [item.caseId])
  return <button className="case-card" onClick={onOpen}><div className="case-card-top"><span className="case-number">FILE {number} <span className="mono">/</span> {item.caseCode}</span><span className="case-status"><i className={String(item.status).toLowerCase() === 'open' ? 'status-dot status-good' : 'status-dot'} />{item.status}</span></div><div className="case-card-main"><div className="case-card-copy"><h2>{item.title}</h2><p>{item.description}</p></div><span className="case-card-action"><span>OPEN FILE</span><ArrowUpRight size={16} /></span></div><div className="case-classification"><span>DIFFICULTY <strong>{item.difficulty || 'UNRATED'}</strong></span><span>INCIDENT <strong>{incident}</strong></span><span>LOCATION <strong>{item.incidentLocation || 'Not recorded'}</strong></span></div><div className="case-card-bottom"><span><Fingerprint size={14} /><strong>{item.evidenceCount ?? '—'}</strong> EVIDENCE</span><span><Users size={14} /><strong>{item.suspectCount ?? '—'}</strong> PERSONS OF INTEREST</span><span><ShieldAlert size={14} /><strong>{contradictionCount ?? '—'}</strong> CONTRADICTIONS</span></div></button>
}

function CaseInvestigation({ caseId, navigate, user, onLogout }) {
  const [active, setActive] = useState('overview')
  const [caseState, setCaseState] = useState(emptyResource)
  const [managementDialog, setManagementDialog] = useState(null)
  const [childDeleteDialog, setChildDeleteDialog] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [managementNotice, setManagementNotice] = useState(null)
  const [managementError, setManagementError] = useState(null)
  const [managementBusy, setManagementBusy] = useState(false)
  const [resources, setResources] = useState(() => Object.fromEntries([...apiSections, 'investigate'].map((key) => [key, emptyResource()])))
  const loadCase = useCallback(() => { setCaseState({ data: null, loading: true, error: null }); api.getCase(caseId).then((data) => setCaseState({ data, loading: false, error: null })).catch((error) => setCaseState({ data: null, loading: false, error })) }, [caseId])
  const loadResource = useCallback((section, searchFilters) => {
    setResources((current) => ({ ...current, [section]: { ...current[section], loading: true, error: null } }))
    const promise = section === 'investigate' ? api.search(caseId, searchFilters || {}) : api.getSection(caseId, section)
    promise.then((data) => setResources((current) => ({ ...current, [section]: { data, loading: false, error: null } }))).catch((error) => setResources((current) => ({ ...current, [section]: { data: null, loading: false, error } })))
  }, [caseId])
  useEffect(() => { loadCase(); apiSections.forEach((section) => loadResource(section)); loadResource('investigate', {}) }, [loadCase, loadResource])

  const caseFile = caseState.data
  const selected = sections.find((section) => section.id === active) || sections[0]
  const changeSection = (id) => { setActive(id); if (id === 'search' && !resources.investigate.data) loadResource('investigate', {}) }
  const refresh = (key) => key === 'case' ? loadCase() : loadResource(key, {})
  const owner = Boolean(caseFile?.editable)
  const context = {
    caseId, caseFile, resources, loadResource, refresh, openManagement: setManagementDialog,
    onEditRecord: owner ? (recordKind, record) => { setManagementNotice(null); setManagementError(null); setManagementDialog({ kind: 'record', recordKind, record }) } : null,
    onDeleteRecord: owner ? (recordKind, record) => { setManagementNotice(null); setManagementError(null); setChildDeleteDialog({ recordKind, record }) } : null,
  }
  const sectionActions = {
    suspects: [['person', 'Add person']], evidence: [['evidence', 'Add evidence']], cctv: [['cctv', 'Add observation']],
    'access-logs': [['access', 'Add access log']], 'phone-records': [['phone', 'Add phone record']],
    witnesses: [['witness', 'Add witness'], ['statement', 'Add statement']],
    vehicles: [['vehicle', 'Add vehicle']], 'vehicle-logs': [['vehicle-event', 'Add movement']], timeline: [['timeline', 'Add event']],
  }[active] || []
  const refreshAfterManagement = (kind) => {
    loadCase()
    const affected = {
      edit: ['case'], person: ['suspects', 'witnesses', 'participants'], witness: ['witnesses', 'suspects', 'participants'],
      evidence: ['evidence', 'connections', 'investigate', 'timeline'], cctv: ['cctv', 'connections', 'investigate', 'timeline', 'contradictions'],
      access: ['access-logs', 'connections', 'investigate', 'timeline', 'contradictions'], phone: ['phone-records', 'connections', 'investigate', 'timeline'],
      vehicle: ['vehicles', 'connections', 'investigate'],
      'vehicle-event': ['vehicle-logs', 'connections', 'investigate', 'timeline'], timeline: ['timeline', 'timeline-records', 'connections', 'investigate'],
      statement: ['witness-statements', 'connections', 'investigate', 'contradictions'],
      'delete-person': ['suspects', 'witnesses', 'participants', 'connections', 'investigate'],
      'delete-evidence': ['evidence', 'connections', 'investigate', 'timeline'],
      'delete-cctv': ['cctv', 'connections', 'investigate', 'timeline', 'contradictions'],
      'delete-access': ['access-logs', 'connections', 'investigate', 'timeline', 'contradictions'],
      'delete-phone': ['phone-records', 'connections', 'investigate', 'timeline'],
      'delete-statement': ['witness-statements', 'connections', 'investigate', 'contradictions'],
      'delete-vehicle': ['vehicles', 'connections', 'investigate'],
      'delete-vehicle-event': ['vehicle-logs', 'connections', 'investigate', 'timeline'],
      'delete-timeline': ['timeline', 'timeline-records', 'connections', 'investigate'],
    }[kind] || []
    affected.filter((key) => key !== 'case').forEach((key) => loadResource(key, {}))
  }
  const archiveCase = async () => {
    setManagementBusy(true); setManagementError(null)
    try {
      await api.updateCaseStatus(caseId, 'ARCHIVED')
      setManagementNotice('Case archived. All investigation records remain in the file.')
      loadCase()
    } catch (error) { setManagementError(error) }
    finally { setManagementBusy(false) }
  }
  const deleteCase = async () => {
    setManagementBusy(true); setManagementError(null)
    try { await api.deleteCase(caseId); navigate('/cases') }
    catch (error) { setManagementError(error); setManagementBusy(false); setDeleteConfirm(false) }
  }
  const deleteChildRecord = async () => {
    if (!childDeleteDialog) return
    const { recordKind, record } = childDeleteDialog
    const idFields = { person: 'personId', evidence: 'evidenceId', cctv: 'observationId', access: 'accessEventId', phone: 'callId', statement: 'statementId', vehicle: 'vehicleId', 'vehicle-event': 'vehicleEventId', timeline: 'eventId' }
    const deleteMethods = { person: api.deletePerson, evidence: api.deleteEvidence, cctv: api.deleteCctv, access: api.deleteAccess, phone: api.deletePhone, statement: api.deleteStatement, vehicle: api.deleteVehicle, 'vehicle-event': api.deleteVehicleEvent, timeline: api.deleteTimelineEvent }
    setManagementBusy(true); setManagementError(null)
    try {
      await deleteMethods[recordKind](caseId, record[idFields[recordKind]])
      setChildDeleteDialog(null)
      setManagementNotice('Record deleted from this case file.')
      refreshAfterManagement(`delete-${recordKind}`)
    } catch (error) { setManagementError(error) }
    finally { setManagementBusy(false) }
  }

  return <main className="case-page-shell"><SiteHeader navigate={navigate} user={user} onLogout={onLogout} active="archive" /><div className="workspace-shell"><aside className="workspace-sidebar"><button className="back-link sidebar-back" onClick={() => navigate('/cases')}><ArrowLeft size={14} /> All case files</button><div className="sidebar-case"><span className="eyebrow">CURRENT INVESTIGATION</span><strong>{caseFile?.caseCode || `CASE ${caseId}`}</strong><span>{caseFile?.title || 'Loading case file'}</span><Tag tone="green">{caseFile?.status || 'OPEN'}</Tag></div><nav className="case-nav" aria-label="Investigation sections"><span className="nav-section-label">CASE MATERIALS</span>{sections.slice(0, 9).map((section) => <NavItem key={section.id} section={section} active={active === section.id} onClick={() => changeSection(section.id)} />)}<span className="nav-section-label nav-section-spaced">ANALYSIS</span>{sections.slice(9).map((section) => <NavItem key={section.id} section={section} active={active === section.id} onClick={() => changeSection(section.id)} />)}</nav><div className="sidebar-bottom"><div className="file-stamp"><span>DATABASE LINK</span><span><span className="status-dot status-good" /> LIVE CONNECTION</span><small>POSTGRESQL / REST API</small></div></div></aside>
    <div className="workspace-main"><header className="workspace-topbar"><div className="breadcrumb"><span>CASE FILES</span><ChevronRight size={13} /><span>{caseFile?.caseCode || `CT—${caseId}`}</span><ChevronRight size={13} /><strong>{selected.label}</strong></div><span className="nav-note"><span className="live-dot" /> LIVE CASE DATA</span></header><main className="workspace-content"><label className="mobile-case-select"><span>INVESTIGATION SECTION</span><select value={active} onChange={(event) => changeSection(event.target.value)} aria-label="Investigation section">{sections.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{caseState.loading && !caseFile ? <LoadingState label="Opening case file" /> : caseState.error ? <ErrorState error={caseState.error} onRetry={loadCase} /> : <><div className="case-banner"><div><Eyebrow icon={selected.icon}>{selected.id === 'overview' ? 'INVESTIGATION BRIEF' : `CASE MATERIALS / ${selected.id.replaceAll('-', ' ').toUpperCase()}`}</Eyebrow><h1>{selected.id === 'overview' ? caseFile?.title : selected.label}</h1><p>{selected.id === 'overview' ? caseFile?.description : `${caseFile?.caseCode} · ${caseFile?.title}`}</p></div><div className="banner-meta"><Tag tone="green">{caseFile?.status}</Tag><span>{caseFile?.caseCode}</span></div></div>{owner && <div className="case-management-bar"><div><span>CASE MANAGEMENT</span><small>Private file · editing enabled</small></div><div className="case-management-actions"><button className="case-action" type="button" onClick={() => { setManagementNotice(null); setManagementError(null); setManagementDialog({ kind: 'edit' }) }}><Pencil size={14} /> Edit case</button>{caseFile?.status !== 'ARCHIVED' && <button className="case-action" type="button" disabled={managementBusy} onClick={archiveCase}><Archive size={14} /> Archive case</button>}<button className="case-action danger" type="button" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} /> Delete case</button></div></div>}{managementNotice && <div className="case-management-notice" role="status">{managementNotice}</div>}{managementError && <ErrorState error={managementError} onRetry={() => setManagementError(null)} />}<SectionContent active={active} context={context} />{owner && sectionActions.length > 0 && <div className="section-management-actions">{sectionActions.map(([kind, label]) => <button className="case-action add" key={kind} type="button" onClick={() => { setManagementNotice(null); setManagementError(null); setManagementDialog({ kind }) }}><Plus size={14} /> {label}</button>)}</div>}</>}</main></div></div>{managementDialog && <ManagementDialog dialog={managementDialog} caseFile={caseFile} caseId={caseId} resources={resources} busy={managementBusy} error={managementError} onClose={() => setManagementDialog(null)} onBusy={setManagementBusy} onError={setManagementError} onSaved={(kind, message) => { setManagementDialog(null); setManagementError(null); setManagementNotice(message); refreshAfterManagement(kind) }} />}{childDeleteDialog && <DeleteRecordDialog title={recordLabel(childDeleteDialog.recordKind)} busy={managementBusy} error={managementError} onCancel={() => { if (!managementBusy) { setChildDeleteDialog(null); setManagementError(null) } }} onDelete={deleteChildRecord} />}{deleteConfirm && <DeleteCaseDialog busy={managementBusy} error={managementError} onCancel={() => { setDeleteConfirm(false); setManagementError(null) }} onDelete={deleteCase} />}</main>
}

const localDateTimeValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const managementDefinitions = {
  edit: { title: 'Edit case file', submit: 'Save case file', fields: [
    ['title', 'Case title', 'text', true], ['caseType', 'Case type', 'select', true, ['THEFT', 'DISAPPEARANCE', 'SABOTAGE', 'FRAUD', 'OTHER']],
    ['incidentAt', 'Incident date / time', 'datetime-local', true], ['location', 'Incident location', 'text', true], ['address', 'Address', 'text'],
    ['difficulty', 'Difficulty', 'select', true, ['EASY', 'MEDIUM', 'HARD']], ['status', 'Status', 'select', true, ['OPEN', 'UNDER REVIEW', 'CLOSED', 'ARCHIVED']],
    ['description', 'Incident summary', 'textarea', true],
  ] },
  person: { title: 'Add person to case', submit: 'Add person', fields: [
    ['fullName', 'Full name', 'text', true], ['caseRole', 'Case role', 'select', true, ['SUSPECT', 'WITNESS', 'STAFF', 'VICTIM', 'OTHER']],
    ['age', 'Age', 'number'], ['occupation', 'Occupation', 'text'], ['relationshipToVictim', 'Relationship to victim', 'text'], ['caseNotes', 'Case notes', 'textarea'],
  ] },
  witness: { title: 'Add witness', submit: 'Add witness', fields: [
    ['fullName', 'Full name', 'text', true], ['age', 'Age', 'number'], ['occupation', 'Occupation', 'text'], ['relationshipToVictim', 'Relationship to victim', 'text'], ['caseNotes', 'Case notes', 'textarea'],
  ] },
  evidence: { title: 'Catalogue evidence', submit: 'Save evidence', fields: [
    ['evidenceType', 'Evidence type', 'text', true], ['description', 'Description', 'textarea', true], ['location', 'Found at', 'text'], ['address', 'Address', 'text'],
    ['discoveredAt', 'Collected date / time', 'datetime-local'], ['relevance', 'Relevance', 'select', true, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']],
    ['personId', 'Associated person', 'person-select'],
  ] },
  cctv: { title: 'Add CCTV observation', submit: 'Save observation', fields: [
    ['cameraCode', 'Camera code', 'text', true], ['location', 'Camera location', 'text', true], ['address', 'Address', 'text'],
    ['observedAt', 'Observed at', 'datetime-local', true], ['personId', 'Observed person', 'person-select'], ['activity', 'Recorded activity', 'textarea', true], ['confidence', 'Confidence (0–1)', 'number'],
  ] },
  access: { title: 'Add access log', submit: 'Save access log', fields: [
    ['personId', 'Person', 'person-select', true], ['location', 'Location', 'text', true], ['address', 'Address', 'text'], ['occurredAt', 'Date / time', 'datetime-local', true],
    ['accessType', 'Event', 'select', true, ['ENTRY', 'EXIT', 'DENIED', 'UNLOCK']], ['credentialCode', 'Credential code', 'text'],
  ] },
  phone: { title: 'Add phone record', submit: 'Save phone record', fields: [
    ['callerId', 'Caller', 'person-select', true], ['receiverId', 'Receiver', 'person-select', true], ['occurredAt', 'Date / time', 'datetime-local', true],
    ['durationSeconds', 'Duration (seconds)', 'number', true], ['callStatus', 'Call status', 'select', true, ['COMPLETED', 'MISSED', 'DECLINED']],
  ] },
  statement: { title: 'Record witness statement', submit: 'Save statement', fields: [
    ['witnessId', 'Witness', 'witness-select', true], ['subjectId', 'Person mentioned', 'person-select'], ['recordedAt', 'Recorded at', 'datetime-local', true], ['statement', 'Statement', 'textarea', true],
    ['claimedLocation', 'Alibi location (optional)', 'text'], ['claimAddress', 'Alibi address', 'text'], ['claimStart', 'Alibi start', 'datetime-local'], ['claimEnd', 'Alibi end', 'datetime-local'],
  ] },
  vehicle: { title: 'Add vehicle', submit: 'Save vehicle', fields: [
    ['ownerId', 'Registered owner', 'person-select', true], ['registrationNumber', 'Registration', 'text', true], ['vehicleType', 'Vehicle type', 'text', true],
  ] },
  'vehicle-event': { title: 'Add vehicle movement', submit: 'Save movement', fields: [
    ['vehicleId', 'Vehicle', 'vehicle-select', true], ['location', 'Location', 'text', true], ['address', 'Address', 'text'], ['occurredAt', 'Date / time', 'datetime-local', true], ['activity', 'Recorded activity', 'textarea', true],
  ] },
  timeline: { title: 'Add timeline event', submit: 'Save event', fields: [
    ['eventType', 'Event type', 'text', true], ['occurredAt', 'Date / time', 'datetime-local', true], ['location', 'Location', 'text'], ['address', 'Address', 'text'], ['description', 'Description', 'textarea', true],
  ] },
}

function ManagementDialog({ dialog, caseFile, caseId, resources, busy, error, onClose, onBusy, onError, onSaved }) {
  const editingRecord = dialog.kind === 'record'
  const kind = editingRecord ? dialog.recordKind : dialog.kind
  const record = dialog.record || {}
  const definition = managementDefinitions[kind]
  const initialRecordValues = () => {
    const timestampFields = { evidence: ['discoveredAt'], cctv: ['observedAt'], access: ['occurredAt'], phone: ['occurredAt'], statement: ['recordedAt', 'claimStart', 'claimEnd'], 'vehicle-event': ['occurredAt'], timeline: ['occurredAt'] }[kind] || []
    const personFields = { person: { fullName: record.name, caseRole: record.caseRole, age: record.age, occupation: record.occupation, relationshipToVictim: record.relationshipToVictim, caseNotes: record.caseNotes },
      witness: { fullName: record.name, caseRole: 'WITNESS', age: record.age, occupation: record.occupation, relationshipToVictim: record.relationshipToVictim, caseNotes: record.caseNotes } }[kind]
    const valuesByKind = {
      evidence: { evidenceType: record.evidenceType, description: record.description, location: record.location, address: record.address, discoveredAt: record.discoveredAt, relevance: record.relevance, personId: record.personId },
      cctv: { cameraCode: record.cameraCode, location: record.location, address: record.address, observedAt: record.observedAt, personId: record.personId, activity: record.activity, confidence: record.confidence },
      access: { personId: record.personId, location: record.location, address: record.address, occurredAt: record.occurredAt, accessType: record.accessType, credentialCode: record.credentialCode },
      phone: { callerId: record.callerId, receiverId: record.receiverId, occurredAt: record.occurredAt, durationSeconds: record.durationSeconds, callStatus: record.callStatus },
      statement: { witnessId: record.witnessId, subjectId: record.subjectId, recordedAt: record.recordedAt, statement: record.statement, claimedLocation: record.associatedClaimLocation, claimAddress: record.claimAddress, claimStart: record.claimStart, claimEnd: record.claimEnd },
      vehicle: { ownerId: record.ownerId, registrationNumber: record.registrationNumber, vehicleType: record.vehicleType },
      'vehicle-event': { vehicleId: record.vehicleId, location: record.location, address: record.address, occurredAt: record.occurredAt, activity: record.activity },
      timeline: { eventType: record.eventType, occurredAt: record.occurredAt, location: record.location, address: record.address, description: record.description },
    }
    const values = editingRecord ? (personFields || valuesByKind[kind] || {}) : kind === 'edit' ? {
    title: caseFile.title || '', caseType: caseFile.caseType || 'OTHER', incidentAt: localDateTimeValue(caseFile.incidentAt),
    location: caseFile.incidentLocation || '', address: caseFile.incidentAddress || '', description: caseFile.description || '',
    difficulty: caseFile.difficulty || 'MEDIUM', status: caseFile.status || 'OPEN',
    } : { caseRole: kind === 'witness' ? 'WITNESS' : 'SUSPECT', relevance: 'MEDIUM', durationSeconds: '0', callStatus: 'COMPLETED' }
    for (const field of timestampFields) values[field] = localDateTimeValue(values[field])
    return values
  }
  const [values, setValues] = useState(initialRecordValues)
  const rows = resources.participants.data || []
  const witnesses = rows.filter((row) => row.caseRole === 'WITNESS')
  const vehicles = resources.vehicles.data || []
  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }))

  const submit = async (event) => {
    event.preventDefault()
    onError(null); onBusy(true)
    try {
      const payload = { ...values }
      for (const key of ['incidentAt', 'discoveredAt', 'observedAt', 'occurredAt', 'recordedAt', 'claimStart', 'claimEnd']) {
        payload[key] = payload[key] ? toApiTimestamp(payload[key]) : null
      }
      for (const key of ['age', 'personId', 'callerId', 'receiverId', 'witnessId', 'subjectId', 'ownerId', 'vehicleId']) {
        if (payload[key] === '' || payload[key] == null) payload[key] = null
        else if (payload[key] != null) payload[key] = Number(payload[key])
      }
      for (const key of ['durationSeconds']) if (payload[key] !== undefined) payload[key] = Number(payload[key] || 0)
      if (payload.confidence === '') payload.confidence = null
      else if (payload.confidence !== undefined && payload.confidence !== null) payload.confidence = Number(payload.confidence)
      const actions = {
        edit: () => api.updateCase(caseId, payload), person: () => api.addPerson(caseId, payload),
        witness: () => api.addPerson(caseId, { ...payload, caseRole: 'WITNESS' }), evidence: () => api.addEvidence(caseId, payload),
        cctv: () => api.addCctv(caseId, payload), access: () => api.addAccess(caseId, payload), phone: () => api.addPhone(caseId, payload),
        statement: () => api.addStatement(caseId, payload), vehicle: () => api.addVehicle(caseId, payload),
        'vehicle-event': () => api.addVehicleEvent(caseId, payload), timeline: () => api.addTimeline(caseId, payload),
      }
      if (editingRecord) {
        const ids = { person: record.personId, witness: record.personId, evidence: record.evidenceId, cctv: record.observationId, access: record.accessEventId, phone: record.callId, statement: record.statementId, vehicle: record.vehicleId, 'vehicle-event': record.vehicleEventId, timeline: record.eventId }
        const updates = { person: api.updatePerson, witness: api.updatePerson, evidence: api.updateEvidence, cctv: api.updateCctv, access: api.updateAccess, phone: api.updatePhone, statement: api.updateStatement, vehicle: api.updateVehicle, 'vehicle-event': api.updateVehicleEvent, timeline: api.updateTimelineEvent }
        await updates[kind](caseId, ids[kind], payload)
      } else await actions[kind]()
      onSaved(editingRecord ? (kind === 'witness' ? 'person' : kind) : kind, editingRecord ? 'Record updated.' : kind === 'edit' ? 'Case file updated.' : 'Record added to the case file.')
    } catch (error) { onError(error) }
    finally { onBusy(false) }
  }

  const optionsFor = (type) => {
    const people = type === 'witness-select' ? witnesses : rows
    if (type === 'person-select' || type === 'witness-select') return people.map((row) => [row.personId, `${row.name} · ${row.caseRole} (#${row.personId})`])
    if (type === 'vehicle-select') return vehicles.map((row) => [row.vehicleId, `${row.registrationNumber} · ${row.vehicleType}`])
    return []
  }

  return <div className="management-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><section className="management-dialog" role="dialog" aria-modal="true" aria-labelledby="management-title"><header><div><Eyebrow>CASE FILE / MANAGEMENT</Eyebrow><h2 id="management-title">{editingRecord ? `Edit ${definition.title.replace(/^Add |^Catalogue |^Record /i, '').toLowerCase()}` : definition.title}</h2></div><button className="dialog-close" type="button" aria-label="Close" disabled={busy} onClick={onClose}><X size={18} /></button></header>{error && <ErrorState error={error} />}<form onSubmit={submit}><div className="management-fields">{definition.fields.map(([name, label, type, required, choices]) => <label className={`management-field ${type === 'textarea' ? 'wide' : ''}`} key={name}><span>{label}{required && <i> REQUIRED</i>}</span>{type === 'textarea' ? <textarea required={required} maxLength={name === 'description' ? 4000 : 5000} rows={4} value={values[name] || ''} onChange={(e) => setValue(name, e.target.value)} /> : type === 'select' || type.endsWith('-select') ? <select required={required} value={values[name] || ''} onChange={(e) => setValue(name, e.target.value)}><option value="">{type.endsWith('-select') ? 'Select a linked record' : 'Select one'}</option>{(choices || optionsFor(type)).map((option) => { const [value, labelText] = Array.isArray(option) ? option : [option, option.replaceAll('_', ' ')] ; return <option key={value} value={value}>{labelText}</option> })}</select> : <input required={required} type={type} min={type === 'number' ? 0 : undefined} max={name === 'confidence' ? 1 : name === 'age' ? 120 : name === 'durationSeconds' ? 86400 : undefined} step={name === 'confidence' ? '0.001' : undefined} maxLength={type === 'text' ? 160 : undefined} value={values[name] ?? ''} onChange={(e) => setValue(name, e.target.value)} />}</label>)}</div><p className="management-footnote">This record is stored in the current CASETRACE investigation and becomes part of its relational evidence trail.</p><footer><button className="case-action" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving record…' : editingRecord ? 'Save changes' : definition.submit}</button></footer></form></section></div>
}

function DeleteCaseDialog({ busy, error, onCancel, onDelete }) {
  return <div className="management-overlay"><section className="management-dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><header><div><Eyebrow>PERMANENT ACTION</Eyebrow><h2 id="delete-title">Delete this case permanently?</h2></div><button className="dialog-close" type="button" aria-label="Close" disabled={busy} onClick={onCancel}><X size={18} /></button></header><p>This will remove the case and its associated investigation records, including evidence, CCTV observations, access logs, witnesses, vehicles, timeline events and related records.</p>{error && <ErrorState error={error} />}<footer><button className="case-action" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="button button-danger" type="button" onClick={onDelete} disabled={busy}>{busy ? 'Deleting case…' : 'Delete case'}</button></footer></section></div>
}

function recordLabel(kind) {
  return ({ person: 'person', witness: 'witness', evidence: 'evidence item', cctv: 'CCTV observation', access: 'access log', phone: 'phone record', statement: 'witness statement', vehicle: 'vehicle', 'vehicle-event': 'vehicle movement', timeline: 'timeline event' })[kind] || 'record'
}

function RecordActions({ recordKind, record, manage }) {
  if (!manage?.onEditRecord || !manage?.onDeleteRecord) return null
  return <div className="record-actions"><button className="case-action record-action" type="button" aria-label={`Edit ${recordLabel(recordKind)}`} title="Edit record" onClick={() => manage.onEditRecord(recordKind, record)}><Pencil size={13} /><span>Edit</span></button><button className="case-action danger record-action" type="button" aria-label={`Delete ${recordLabel(recordKind)}`} title="Delete record" onClick={() => manage.onDeleteRecord(recordKind, record)}><Trash2 size={13} /><span>Delete</span></button></div>
}

function DeleteRecordDialog({ title, busy, error, onCancel, onDelete }) {
  return <div className="management-overlay"><section className="management-dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-record-title"><header><div><Eyebrow>CONFIRM DELETE</Eyebrow><h2 id="delete-record-title">Delete this {title}?</h2></div><button className="dialog-close" type="button" aria-label="Close" disabled={busy} onClick={onCancel}><X size={18} /></button></header><p>This removes this case-specific record. Related records that depend on it must be removed first.</p>{error && <ErrorState error={error} />}<footer><button className="case-action" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="button button-danger" type="button" onClick={onDelete} disabled={busy}>{busy ? 'Deleting record…' : 'Delete record'}</button></footer></section></div>
}

function NavItem({ section, active, onClick }) {
  const Icon = section.icon
  return <button className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={onClick}><Icon size={16} strokeWidth={1.7} /><span>{section.label}</span>{active && <span className="nav-active-mark" />}</button>
}

function SectionContent({ active, context }) {
  const { resources, refresh } = context
  switch (active) {
    case 'overview': return <Overview {...context} />
    case 'suspects': return <Suspects resource={resources.participants} retry={() => refresh('participants')} manage={context} />
    case 'evidence': return <Evidence caseId={context.caseId} resource={resources.evidence} retry={() => refresh('evidence')} manage={context} />
    case 'cctv': return <Cctv resource={resources.cctv} retry={() => refresh('cctv')} manage={context} />
    case 'access-logs': return <Access resource={resources['access-logs']} retry={() => refresh('access-logs')} manage={context} />
    case 'phone-records': return <Phones resource={resources['phone-records']} retry={() => refresh('phone-records')} manage={context} />
    case 'witnesses': return <Witnesses resource={resources.participants} statements={resources['witness-statements']} retry={() => { refresh('participants'); refresh('witness-statements') }} manage={context} />
    case 'vehicles': return <Vehicles resource={resources.vehicles} retry={() => refresh('vehicles')} manage={context} />
    case 'vehicle-logs': return <VehicleLogs resource={resources['vehicle-logs']} retry={() => refresh('vehicle-logs')} manage={context} />
    case 'timeline': return <Timeline resource={resources.timeline} caseEvents={resources['timeline-records']} retry={() => { refresh('timeline'); refresh('timeline-records') }} manage={context} />
    case 'connections': return <Connections resource={resources.connections} retry={() => refresh('connections')} />
    case 'contradictions': return <Contradictions resource={resources.contradictions} retry={() => refresh('contradictions')} />
    case 'search': return <InvestigationSearch resource={resources.investigate} search={(filters) => context.loadResource('investigate', filters)} />
    case 'solve': return <SolveCase context={context} />
    default: return <EmptyState />
  }
}

function Overview({ caseId, caseFile, resources, refresh }) {
  const counts = [
    ['PERSONS OF INTEREST', resources.suspects], ['EVIDENCE ITEMS', resources.evidence], ['TIMELINE ENTRIES', resources.timeline], ['POTENTIAL CONTRADICTIONS', resources.contradictions],
  ]
  return <div className="content-stack"><div className="overview-summary"><Panel className="incident-panel"><div className="incident-top"><Eyebrow icon={MapPin}>INCIDENT DETAILS</Eyebrow><Tag tone="amber">{caseFile?.difficulty || 'UNRATED'}</Tag></div><div className="incident-details"><div><span>INCIDENT TIME</span><strong>{formatDate(caseFile?.incidentAt)}</strong></div><div><span>LOCATION</span><strong>{caseFile?.incidentLocation || 'Not recorded'}</strong>{caseFile?.incidentAddress && <small>{caseFile.incidentAddress}</small>}</div></div><div className="case-ref"><span>CASE REFERENCE</span><strong>{caseFile?.caseCode} <span className="mono">/</span> {caseId}</strong></div></Panel><Panel className="stats-panel"><Eyebrow icon={Activity}>CASE SNAPSHOT</Eyebrow><div className="stat-grid">{counts.map(([label, resource]) => <div className="stat-cell" key={label}><span>{label}</span>{resource.loading ? <strong className="stat-loading">···</strong> : resource.error ? <strong className="stat-error">—</strong> : <strong>{resource.data?.length ?? 0}</strong>}</div>)}</div></Panel></div>
    <div className="overview-columns"><Panel><SectionHeading kicker="PEOPLE IN THE FILE" title="Persons of interest" action={<span className="count-chip">{resources.suspects.data?.length ?? '—'}</span>} /><ResourceState {...resources.suspects} onRetry={() => refresh('suspects')} emptyDetail="No suspects are currently attached to this file.">{<div className="mini-record-list">{resources.suspects.data?.slice(0, 4).map((person) => <div className="mini-record" key={person.personId}><div className="avatar-mark">{person.name?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><strong>{person.name}</strong><span>{person.occupation || person.relationshipToVictim || 'Case participant'}</span></div><ArrowUpRight size={15} /></div>)}</div>}</ResourceState></Panel><Panel><SectionHeading kicker="RECENTLY CATALOGUED" title="Evidence locker" action={<span className="count-chip">{resources.evidence.data?.length ?? '—'}</span>} /><ResourceState {...resources.evidence} onRetry={() => refresh('evidence')} emptyDetail="No evidence has been catalogued for this case.">{<div className="mini-evidence-list">{resources.evidence.data?.slice(0, 3).map((item) => <div className="mini-evidence" key={item.evidenceId}><span className="evidence-index">{item.evidenceCode || `E-${item.evidenceId}`}</span><div><strong>{item.evidenceType}</strong><span>{item.description}</span></div><Tag tone={item.relevance === 'CRITICAL' ? 'red' : 'muted'}>{item.relevance || 'RECORDED'}</Tag></div>)}</div>}</ResourceState></Panel></div>
    <Panel className="brief-note"><div className="brief-icon"><Waves size={17} /></div><div><Eyebrow>INVESTIGATOR'S NOTE</Eyebrow><p>Follow the records across sources. A timeline can place someone in a room; a call can connect two people; a contradiction can tell you which questions to ask next.</p></div><span className="note-watermark">{caseFile?.caseCode}</span></Panel></div>
}

function Suspects({ resource, retry, manage }) {
  return <div className="content-stack"><SectionHeading kicker="PEOPLE & MOTIVES" title="Case participants" detail="All person roles attached to this case. Association is context, not proof." /><ResourceState {...resource} onRetry={retry} emptyDetail="There are no people linked to this case.">{<div className="people-grid">{resource.data?.map((person) => <Panel className="person-card" key={person.personId}><div className="person-card-head"><div className="avatar-large">{person.name?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><Tag tone="muted">{person.caseRole} · {person.personId}</Tag></div><h3>{person.name}</h3><p className="person-role">{person.occupation || 'Occupation not recorded'}</p><div className="person-facts"><div><span>RELATION TO CASE</span><strong>{person.relationshipToVictim || 'Not recorded'}</strong></div>{person.age != null && <div><span>AGE</span><strong>{person.age}</strong></div>}</div>{person.caseNotes && <p className="person-notes">{person.caseNotes}</p>}<RecordActions recordKind="person" record={person} manage={manage} /></Panel>)}</div>}</ResourceState></div>
}

function Evidence({ caseId, resource, retry, manage }) {
  const [reviewed, setReviewed] = useState(() => new Set())
  const [reviewStateLoading, setReviewStateLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null)
  const [reviewError, setReviewError] = useState(null)
  useEffect(() => {
    let current = true
    authApi.reviewedEvidence(caseId).then((ids) => {
      if (current) setReviewed(new Set((ids || []).map(Number)))
    }).catch((error) => { if (current) setReviewError(error) })
      .finally(() => { if (current) setReviewStateLoading(false) })
    return () => { current = false }
  }, [caseId])
  const markReviewed = async (evidenceId) => {
    setReviewError(null); setReviewing(evidenceId)
    try { await authApi.reviewEvidence(caseId, evidenceId); setReviewed((current) => new Set(current).add(evidenceId)) }
    catch (error) { setReviewError(error) }
    finally { setReviewing(null) }
  }
  return <div className="content-stack"><SectionHeading kicker="CATALOGUED MATERIAL" title="Evidence locker" detail="Physical and digital records linked to the incident. Relevance labels reflect the case record." /><ResourceState {...resource} onRetry={retry} emptyDetail="No evidence has been catalogued for this case.">{<div className="evidence-grid">{resource.data?.map((item) => <Panel className="evidence-card" key={item.evidenceId}><div className="evidence-card-top"><span className="evidence-index">{item.evidenceCode || `E-${item.evidenceId}`}</span><Tag tone={item.relevance === 'CRITICAL' ? 'red' : item.relevance === 'HIGH' ? 'amber' : 'muted'}>{item.relevance || 'UNRATED'}</Tag></div><div className="evidence-glyph"><Fingerprint size={22} /></div><span className="evidence-type">{item.evidenceType}</span><h3>{item.description}</h3><div className="evidence-meta"><RecordMeta icon={MapPin}>{item.location || 'Location not recorded'}</RecordMeta><RecordMeta icon={Clock3}>{formatDate(item.discoveredAt)}</RecordMeta></div>{item.connectedPeople && <div className="connected-people"><Users size={13} /><span>CONNECTED PERSONS</span><strong>{item.connectedPeople}</strong></div>}<button className="evidence-review-button" type="button" disabled={reviewStateLoading || reviewing === item.evidenceId || reviewed.has(item.evidenceId)} onClick={() => markReviewed(item.evidenceId)}>{reviewed.has(item.evidenceId) ? <><ShieldCheck size={14} /> Reviewed</> : reviewing === item.evidenceId ? 'Saving review…' : 'Mark as reviewed'}</button><RecordActions recordKind="evidence" record={item} manage={manage} /></Panel>)}</div>}</ResourceState>{reviewError && <ErrorState error={reviewError} />}</div>
}

function Cctv({ resource, retry, manage }) {
  return <LogSection kicker="VIDEO SURVEILLANCE" title="CCTV observations" detail="Recorded appearances and activities from case-linked cameras." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'observedAt', label: 'TIME', render: (row) => <span className="mono-cell">{formatDate(row.observedAt)}</span> }, { key: 'cameraCode', label: 'CAMERA', render: (row) => <Tag tone="muted">{row.cameraCode}</Tag> }, { key: 'person', label: 'PERSON', render: (row) => row.person || 'Unidentified' }, { key: 'location', label: 'LOCATION' }, { key: 'activity', label: 'RECORDED ACTIVITY' }, { key: 'confidence', label: 'CONFIDENCE', render: (row) => row.confidence == null ? '—' : `${Math.round(Number(row.confidence) * 100)}%` }, ...(manage.onEditRecord ? [{ key: 'actions', label: 'ACTIONS', render: (row) => <RecordActions recordKind="cctv" record={row} manage={manage} /> }] : [])]} /></LogSection>
}

function Access({ resource, retry, manage }) {
  return <LogSection kicker="ENTRY & CREDENTIAL HISTORY" title="Access logs" detail="Card and door events recorded against a case participant." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'occurredAt', label: 'TIME', render: (row) => <span className="mono-cell">{formatDate(row.occurredAt)}</span> }, { key: 'person', label: 'PERSON' }, { key: 'location', label: 'LOCATION' }, { key: 'accessType', label: 'EVENT', render: (row) => <Tag tone={row.accessType === 'ENTRY' ? 'green' : 'amber'}>{row.accessType}</Tag> }, { key: 'credentialCode', label: 'CREDENTIAL', render: (row) => row.credentialCode || '—' }, ...(manage.onEditRecord ? [{ key: 'actions', label: 'ACTIONS', render: (row) => <RecordActions recordKind="access" record={row} manage={manage} /> }] : [])]} /></LogSection>
}

function Phones({ resource, retry, manage }) {
  return <LogSection kicker="COMMUNICATION METADATA" title="Phone records" detail="Recorded contact between case participants. Call content is not available in this file." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'occurredAt', label: 'TIME', render: (row) => <span className="mono-cell">{formatDate(row.occurredAt)}</span> }, { key: 'caller', label: 'CALLER' }, { key: 'receiver', label: 'RECEIVER' }, { key: 'durationSeconds', label: 'DURATION', render: (row) => `${row.durationSeconds}s` }, { key: 'callStatus', label: 'STATUS', render: (row) => <Tag tone="muted">{row.callStatus}</Tag> }, ...(manage.onEditRecord ? [{ key: 'actions', label: 'ACTIONS', render: (row) => <RecordActions recordKind="phone" record={row} manage={manage} /> }] : [])]} /></LogSection>
}

function Witnesses({ resource, statements, retry, manage }) {
  const witnessRows = { ...resource, data: resource.data?.filter((person) => person.caseRole === 'WITNESS') }
  return <div className="content-stack"><SectionHeading kicker="RECORDED ACCOUNTS" title="Witness accounts" detail="Witness identities and statements as recorded in this case file." /><Panel><div className="panel-heading-row"><SectionHeading kicker="CASE PARTICIPANTS" title="Witnesses" /></div><ResourceState {...witnessRows} onRetry={retry} emptyDetail="No witnesses are attached to this case.">{<div className="witness-list">{witnessRows.data?.map((witness) => <div className="witness-row" key={witness.personId}><div className="avatar-mark"><MessageSquareQuote size={17} /></div><div><strong>{witness.name}</strong><span>{[witness.occupation, witness.age ? `Age ${witness.age}` : null].filter(Boolean).join(' · ') || 'Details not recorded'}</span>{witness.caseNotes && <p>{witness.caseNotes}</p>}</div><RecordActions recordKind="witness" record={witness} manage={manage} /></div>)}</div>}</ResourceState></Panel><Panel><SectionHeading kicker="STATEMENTS ON FILE" title="Recorded statements" /><ResourceState {...statements} onRetry={retry} emptyDetail="No witness statements are linked to this case.">{<div className="statement-list">{statements.data?.map((statement) => <article className="statement-card" key={statement.statementId}><div className="statement-head"><RecordMeta icon={MessageSquareQuote}>{statement.witness}</RecordMeta><RecordMeta icon={Clock3}>{formatDate(statement.recordedAt)}</RecordMeta></div><blockquote>“{statement.statement}”</blockquote><div className="statement-foot">{statement.subject && <span>MENTIONS <strong>{statement.subject}</strong></span>}{statement.associatedClaimLocation && <span>CLAIMED LOCATION <strong>{statement.associatedClaimLocation}</strong></span>}</div><RecordActions recordKind="statement" record={statement} manage={manage} /></article>)}</div>}</ResourceState></Panel></div>
}

function Vehicles({ resource, retry, manage }) {
  return <LogSection kicker="REGISTERED TRANSPORT" title="Vehicles" detail="Vehicles associated with participants in this investigation." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'registrationNumber', label: 'REGISTRATION', render: (row) => <span className="mono-cell">{row.registrationNumber}</span> }, { key: 'owner', label: 'REGISTERED OWNER' }, { key: 'vehicleType', label: 'TYPE' }, { key: 'vehicleId', label: 'RECORD ID', render: (row) => <span className="mono-cell">V-{row.vehicleId}</span> }, ...(manage.onEditRecord ? [{ key: 'actions', label: 'ACTIONS', render: (row) => <RecordActions recordKind="vehicle" record={row} manage={manage} /> }] : [])]} /></LogSection>
}

function VehicleLogs({ resource, retry, manage }) {
  return <LogSection kicker="VEHICLE MOVEMENTS" title="Vehicle activity" detail="Recorded vehicle events and associated locations." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'occurredAt', label: 'TIME', render: (row) => <span className="mono-cell">{formatDate(row.occurredAt)}</span> }, { key: 'registrationNumber', label: 'VEHICLE', render: (row) => <span className="mono-cell">{row.registrationNumber}</span> }, { key: 'owner', label: 'OWNER' }, { key: 'location', label: 'LOCATION' }, { key: 'activity', label: 'RECORDED ACTIVITY' }, ...(manage.onEditRecord ? [{ key: 'actions', label: 'ACTIONS', render: (row) => <RecordActions recordKind="vehicle-event" record={row} manage={manage} /> }] : [])]} /></LogSection>
}

function Timeline({ resource, caseEvents, retry, manage }) {
  const ordered = useMemo(() => [...(resource.data || [])].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt)), [resource.data])
  const caseEventMap = new Map((caseEvents.data || []).map((row) => [row.eventId, row]))
  return <div className="content-stack"><SectionHeading kicker="CROSS-SOURCE RECONSTRUCTION" title="Case timeline" detail="Events are assembled from case records and ordered chronologically." /><Panel className="timeline-panel"><div className="timeline-topline"><span>{ordered.length ? `${ordered.length} RECORDED EVENTS` : 'TIMELINE'}</span><span>EARLIER <ArrowRight size={12} /> LATER</span></div><ResourceState {...resource} onRetry={retry} emptyDetail="There are no timeline events for this case.">{<div className="timeline-list">{ordered.map((event, index) => { const caseEvent = event.sourceType === 'CASE_EVENT' ? caseEventMap.get(Number(event.sourceId)) : null; return <div className="timeline-item" key={`${event.sourceType}-${event.sourceId}-${index}`}><div className="timeline-time"><strong>{formatDate(event.occurredAt)}</strong><span>{event.sourceType} <span className="mono">/</span> {event.sourceId}</span></div><div className="timeline-pin"><span /></div><div className="timeline-event"><div className="timeline-event-head"><Tag tone="muted">{event.sourceType}</Tag>{event.person && <strong>{event.person}</strong>}</div><p>{event.details}</p><RecordMeta icon={MapPin}>{event.location || 'Location not recorded'}</RecordMeta>{caseEvent && <RecordActions recordKind="timeline" record={caseEvent} manage={manage} />}</div></div>})}</div>}</ResourceState></Panel></div>
}

function Connections({ resource, retry }) {
  return <div className="content-stack"><SectionHeading kicker="RELATIONAL EVIDENCE MAP" title="Connections" detail="Each link below is returned from a recorded database relationship. No inferred links are added." /><ResourceState {...resource} onRetry={retry} emptyDetail="No relationships are currently returned for this case.">{<div className="connections-list">{resource.data?.map((edge) => <article className="connection-row" key={edge.relationshipId}><div className="connection-node"><span className={`node-icon node-${String(edge.fromType).toLowerCase()}`}><NodeIcon type={edge.fromType} /></span><div><span>{edge.fromType} <span className="mono">· {edge.fromId}</span></span><strong>{edge.fromLabel}</strong></div></div><div className="connection-link"><span>{edge.relationship.replaceAll('_', ' ')}</span><ArrowRight size={17} /></div><div className="connection-node"><span className={`node-icon node-${String(edge.toType).toLowerCase()}`}><NodeIcon type={edge.toType} /></span><div><span>{edge.toType} <span className="mono">· {edge.toId}</span></span><strong>{edge.toLabel}</strong></div></div><div className="connection-detail">{edge.details && <p>{edge.details}</p>}{edge.occurredAt && <RecordMeta icon={Clock3}>{formatDate(edge.occurredAt)}</RecordMeta>}</div></article>)}</div>}</ResourceState></div>
}

function NodeIcon({ type }) {
  const normalized = String(type).toUpperCase()
  if (normalized.includes('PERSON') || normalized.includes('SUSPECT') || normalized.includes('WITNESS')) return <Users size={15} />
  if (normalized.includes('LOCATION')) return <MapPin size={15} />
  if (normalized.includes('EVENT')) return <Clock3 size={15} />
  if (normalized.includes('VEHICLE')) return <CarFront size={15} />
  if (normalized.includes('CALL') || normalized.includes('PHONE')) return <AudioLines size={15} />
  return <Fingerprint size={15} />
}

function Contradictions({ resource, retry }) {
  return <div className="content-stack"><SectionHeading kicker="CLAIM / RECORD COMPARISON" title="Potential contradictions" detail="Conflicts between a stated location and recorded CCTV or access data. A mismatch is a lead to examine, not a conclusion of guilt." /><ResourceState {...resource} onRetry={retry} emptyTitle="No potential contradictions returned" emptyDetail="No alibi claims currently conflict with a CCTV or access record in this case.">{<div className="contradiction-list">{resource.data?.map((item, index) => <Panel className="contradiction-card" key={`${item.claimId}-${item.sourceId}-${index}`}><div className="contradiction-top"><div><ShieldAlert size={18} /><span>POTENTIAL CONTRADICTION DETECTED</span></div><Tag tone="amber">REVIEW</Tag></div><h3>{item.person}</h3><div className="comparison-grid"><div><span>CLAIMED LOCATION</span><strong>{item.claimedLocation}</strong></div><div className="comparison-mark">≠</div><div><span>RECORDED LOCATION</span><strong>{item.recordedLocation}</strong></div></div><div className="contradiction-source"><div><RecordMeta icon={Clock3}>{formatDate(item.recordedAt)}</RecordMeta><Tag tone="muted">{item.sourceType} RECORD #{item.sourceId}</Tag></div><p>{item.recordDetails}</p></div></Panel>)}</div>}</ResourceState></div>
}

function InvestigationSearch({ resource, search }) {
  const [filters, setFilters] = useState({ keyword: '', personId: '', locationId: '', eventType: '', evidenceType: '', startAt: '', endAt: '' })
  const [submitted, setSubmitted] = useState(false)
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const submit = (event) => { event.preventDefault(); setSubmitted(true); search({ ...filters, startAt: toApiTimestamp(filters.startAt), endAt: toApiTimestamp(filters.endAt) }) }
  const clear = () => { const clean = { keyword: '', personId: '', locationId: '', eventType: '', evidenceType: '', startAt: '', endAt: '' }; setFilters(clean); setSubmitted(false); search(clean) }
  const results = resource.data || []
  return <div className="content-stack"><SectionHeading kicker="CROSS-RECORD QUERY" title="Investigation search" detail="Search indexed case records across CCTV, access, calls, evidence, statements, events, and vehicle activity." /><Panel className="search-panel"><form onSubmit={submit}><label className="search-keyword"><span>KEYWORD</span><div><Search size={17} /><input maxLength="160" placeholder="Try a name, place, or detail…" value={filters.keyword} onChange={(event) => update('keyword', event.target.value)} /><kbd>ENTER</kbd></div></label><div className="filter-grid"><label><span>PERSON ID</span><input inputMode="numeric" type="number" min="1" placeholder="Any person" value={filters.personId} onChange={(event) => update('personId', event.target.value)} /></label><label><span>LOCATION ID</span><input inputMode="numeric" type="number" min="1" placeholder="Any location" value={filters.locationId} onChange={(event) => update('locationId', event.target.value)} /></label><label><span>RECORD TYPE</span><select value={filters.eventType} onChange={(event) => update('eventType', event.target.value)}><option value="">All record types</option>{['CCTV', 'ACCESS', 'PHONE', 'EVIDENCE', 'WITNESS_STATEMENT', 'CASE_EVENT', 'VEHICLE'].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>EVIDENCE TYPE</span><input maxLength="80" placeholder="Any evidence type" value={filters.evidenceType} onChange={(event) => update('evidenceType', event.target.value)} /></label><label><span>FROM</span><input type="datetime-local" value={filters.startAt} onChange={(event) => update('startAt', event.target.value)} /></label><label><span>TO</span><input type="datetime-local" value={filters.endAt} onChange={(event) => update('endAt', event.target.value)} /></label></div><div className="search-actions"><button type="button" className="text-button" onClick={clear}>Clear filters</button><button className="button button-primary" type="submit"><Search size={15} /> Search records</button></div></form></Panel><div className="search-results-head"><div><Eyebrow>{submitted ? 'QUERY RESULTS' : 'CASE RECORDS'}</Eyebrow><h3>{resource.loading ? 'Searching records…' : `${results.length} ${results.length === 1 ? 'record' : 'records'} found`}</h3></div><span className="search-hint">FILTERS APPLY TO DATABASE RECORDS</span></div><ResourceState {...resource} onRetry={() => search(filters)} emptyTitle={submitted ? 'No matching records' : 'No records in this case'} emptyDetail={submitted ? 'Try a broader keyword or remove one or more filters.' : 'No searchable records were returned for this file.'}>{<div className="search-result-list">{results.map((row, index) => <article className="search-result" key={`${row.sourceType}-${row.sourceId}-${index}`}><div className="result-stamp"><span>{row.sourceType}</span><strong>#{row.sourceId}</strong></div><div className="result-copy"><div className="result-meta">{row.person && <RecordMeta icon={Users}>{row.person}</RecordMeta>}{row.relatedPerson && <RecordMeta icon={Users}>{row.relatedPerson}</RecordMeta>}{row.location && <RecordMeta icon={MapPin}>{row.location}</RecordMeta>}</div><p>{row.details}</p></div><time>{formatDate(row.occurredAt)}</time></article>)}</div>}</ResourceState></div>
}

function SolveCase({ context }) {
  const { caseId, resources } = context
  const suspects = resources.suspects.data || []
  const evidence = resources.evidence.data || []
  const locationOptions = useMemo(() => {
    const values = new Map()
    for (const row of [...(resources.cctv.data || []), ...(resources['access-logs'].data || []), ...(resources['vehicle-logs'].data || [])]) if (row.locationId && row.location) values.set(row.locationId, row.location)
    return [...values.entries()].map(([id, name]) => ({ id, name }))
  }, [resources.cctv.data, resources['access-logs'].data, resources['vehicle-logs'].data])
  const [culprit, setCulprit] = useState('')
  const [method, setMethod] = useState('')
  const [location, setLocation] = useState('')
  const [time, setTime] = useState('')
  const [selectedEvidence, setSelectedEvidence] = useState([])
  const [explanation, setExplanation] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const evidenceReady = !resources.evidence.loading && !resources.evidence.error
  const suspectsReady = !resources.suspects.loading && !resources.suspects.error
  const toggleEvidence = (id) => setSelectedEvidence((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  const onSubmit = async (event) => {
    event.preventDefault(); setError(null); setResult(null)
    if (!explanation.trim()) { setError(new Error('Add an explanation for your theory before submitting.')); return }
    if (selectedEvidence.length > 50) { setError(new Error('You can cite up to 50 evidence items.')); return }
    setSending(true)
    try {
      const body = { explanation: explanation.trim() }
      if (culprit) body.suspectedCulpritId = Number(culprit)
      if (method.trim()) body.method = method.trim()
      if (location) body.locationId = Number(location)
      if (time) body.approximateAt = toApiTimestamp(time)
      if (selectedEvidence.length) body.supportingEvidenceIds = selectedEvidence
      const submitted = await api.submitTheory(caseId, body)
      setResult(submitted)
    } catch (caught) { setError(caught) } finally { setSending(false) }
  }
  return <div className="content-stack"><SectionHeading kicker="INVESTIGATOR CONCLUSION" title="Submit your theory" detail="Bring together the person, method, place, time, and records that best explain this case." /><div className="solve-warning"><ShieldCheck size={17} /><p>Your conclusion is compared against the case record after submission. The private solution key is not shown here.</p></div><div className="solve-layout"><form className="solve-form" onSubmit={onSubmit}><Panel><div className="form-section-title"><span>01</span><div><h3>Your conclusion</h3><p>Choose the records and describe what you believe happened.</p></div></div><label className="form-label"><span>SUSPECTED PERSON</span><select value={culprit} onChange={(event) => setCulprit(event.target.value)}><option value="">Select a person (optional)</option>{suspects.map((person) => <option key={person.personId} value={person.personId}>{person.name}</option>)}</select></label><label className="form-label"><span>METHOD / THEORY</span><textarea rows="3" maxLength="2000" placeholder="How do you think the incident took place?" value={method} onChange={(event) => setMethod(event.target.value)} /></label><div className="form-two-col"><label className="form-label"><span>LOCATION</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="">Select a recorded location</option>{locationOptions.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select><small>Locations are drawn from case-linked CCTV and access records.</small></label><label className="form-label"><span>APPROXIMATE TIME</span><input type="datetime-local" value={time} onChange={(event) => setTime(event.target.value)} /></label></div><label className="form-label"><span>EXPLANATION <i>REQUIRED</i></span><textarea rows="5" maxLength="4000" required placeholder="Explain how the clues support your conclusion…" value={explanation} onChange={(event) => setExplanation(event.target.value)} /><small>{explanation.length}/4000 characters</small></label></Panel>
      <Panel><div className="form-section-title"><span>02</span><div><h3>Supporting evidence</h3><p>Select up to 50 evidence records from this case.</p></div></div>{!evidenceReady ? resources.evidence.error ? <ErrorState error={resources.evidence.error} onRetry={() => context.refresh('evidence')} /> : <LoadingState label="Loading evidence choices" /> : evidence.length ? <div className="evidence-choice-list">{evidence.map((item) => <label className={`evidence-choice ${selectedEvidence.includes(item.evidenceId) ? 'evidence-choice-active' : ''}`} key={item.evidenceId}><input type="checkbox" checked={selectedEvidence.includes(item.evidenceId)} onChange={() => toggleEvidence(item.evidenceId)} /><span className="choice-check"><BadgeCheck size={14} /></span><span className="choice-code">{item.evidenceCode}</span><span className="choice-copy"><strong>{item.evidenceType}</strong><small>{item.description}</small></span><Tag tone={item.relevance === 'CRITICAL' ? 'red' : 'muted'}>{item.relevance}</Tag></label>)}</div> : <EmptyState title="No evidence to cite" detail="There are no evidence items associated with this file." />}</Panel><div className="submit-row"><span><ShieldCheck size={14} /> SUBMISSION IS RECORDED IN THE CASE FILE</span><button className="button button-primary button-large" disabled={sending || !explanation.trim()} type="submit">{sending ? 'Submitting theory…' : 'Submit theory'} <ArrowRight size={16} /></button></div></form>
      <aside className="solve-aside"><Panel className="theory-aside"><div className="aside-mark"><Sparkles size={18} /></div><Eyebrow>FIELD NOTE</Eyebrow><h3>Build the chain.</h3><p>A strong theory connects a person, a window of time, and specific records. The records remain the evidence; your explanation makes the argument.</p><div className="aside-chain"><span>PERSON</span><ArrowDownRight size={14} /><span>RECORD</span><ArrowDownRight size={14} /><span>CONCLUSION</span></div></Panel>{result && <Panel className={`submission-result ${result.correct ? 'result-accepted' : ''}`}><div className="result-icon">{result.correct ? <BadgeCheck size={20} /> : <ShieldAlert size={20} />}</div><Eyebrow>{result.correct ? 'CONCLUSION ACCEPTED' : 'THEORY RECORDED'}</Eyebrow><h3>{result.correct ? 'Case solved.' : 'Keep investigating.'}</h3><p>{result.feedback}</p><div className="result-id">SUBMISSION #{result.submissionId} <span className="mono">·</span> {formatDate(result.submittedAt)}</div><div className="result-checks">{[['PERSON', result.culpritMatched], ['METHOD', result.methodMatched], ['LOCATION', result.locationMatched], ['TIME', result.timeMatched], ['EVIDENCE', result.supportingEvidenceMatched > 0]].map(([label, matched]) => <span key={label} className={matched ? 'check-pass' : ''}><i>{matched ? '✓' : '·'}</i>{label}</span>)}</div></Panel>}{error && <ErrorState error={error} />}</aside></div></div>
}

function LogSection({ kicker, title, detail, resource, retry, children }) {
  return <div className="content-stack"><SectionHeading kicker={kicker} title={title} detail={detail} /><Panel><ResourceState {...resource} onRetry={retry} emptyDetail="There are no matching records in this case file.">{children}</ResourceState></Panel></div>
}

export default App
