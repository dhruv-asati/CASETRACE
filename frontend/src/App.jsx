import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, BadgeCheck, Binoculars,
  BookOpen, Camera, CarFront, ChevronRight, CircleDot, Clock3, FileSearch, Fingerprint, KeyRound,
  Link2, MapPin, MessageSquareQuote, Search, ShieldAlert, ShieldCheck, Sparkles, Users, Waves,
} from 'lucide-react'
import { api, toApiTimestamp } from './lib/api'
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

const apiSections = ['suspects', 'evidence', 'cctv', 'access-logs', 'phone-records', 'witnesses', 'witness-statements', 'vehicles', 'vehicle-logs', 'timeline', 'connections', 'contradictions']
const emptyResource = () => ({ data: null, loading: true, error: null })

function getRoute() {
  const match = window.location.pathname.match(/^\/case\/(\d+)\/?$/)
  return match ? { page: 'case', caseId: match[1] } : { page: window.location.pathname === '/cases' ? 'cases' : 'landing' }
}

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><div className="brand-mark"><Fingerprint size={20} strokeWidth={1.7} /></div><div><div className="brand-name">CASE<span>TRACE</span></div>{!compact && <div className="brand-caption">INVESTIGATION DESK</div>}</div></div>
}

function App() {
  const [route, setRoute] = useState(getRoute)
  const navigate = useCallback((path) => {
    window.history.pushState({}, '', path)
    setRoute(getRoute())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  useEffect(() => {
    const onPop = () => setRoute(getRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (route.page === 'case') return <CaseInvestigation key={route.caseId} caseId={route.caseId} navigate={navigate} />
  if (route.page === 'cases') return <CaseSelection navigate={navigate} />
  return <Landing navigate={navigate} />
}

function Landing({ navigate }) {
  const [cases, setCases] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { api.listCases().then(setCases).catch(setError) }, [])

  return <main className="landing-shell">
    <div className="landing-grid" />
    <header className="landing-nav"><Brand /><span className="nav-note"><span className="live-dot" /> FIELD DESK ONLINE</span></header>
    <section className="hero">
      <div className="hero-copy"><Eyebrow icon={Binoculars}>A DATABASE-DRIVEN MYSTERY EXPERIENCE</Eyebrow><h1>Every detail<br />leaves a <em>trace.</em></h1><p>Investigate the evidence. Connect the clues. Solve the case. Follow real records across people, places, and time until the story comes into focus.</p><button className="button button-primary button-large" onClick={() => navigate('/cases')}>Start investigation <ArrowRight size={17} /></button><div className="hero-footnote"><span className="tiny-rule" /> THREE OPEN FILES <span className="mono">·</span> ONE QUESTION: WHAT REALLY HAPPENED?</div></div>
      <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-node node-a"><Fingerprint size={20} /></div><div className="orbit-node node-b"><MapPin size={18} /></div><div className="orbit-node node-c"><Clock3 size={18} /></div><div className="art-center"><span className="center-ring"><Search size={40} strokeWidth={1.2} /></span><span className="art-label">FOLLOW THE EVIDENCE</span></div><span className="art-coordinate">41°24' N<br />02°10' E</span><span className="art-stamp">CASE<br />OPEN</span></div>
    </section>
    <section className="landing-lower"><div><span className="lower-number">01</span><p>Read between<br />the records.</p></div><div><span className="lower-number">02</span><p>Find where stories<br />intersect.</p></div><div><span className="lower-number">03</span><p>Build a theory<br />from evidence.</p></div><div className="api-status">{error ? <span className="api-offline"><span className="status-dot" /> API OFFLINE</span> : cases ? <span><span className="status-dot status-good" /> {cases.length} CASE FILES READY</span> : <span><span className="status-dot" /> CHECKING CASE FILES</span>}<small>POSTGRESQL CASE ARCHIVE</small></div></section>
    <footer className="landing-footer"><span>CASETRACE <span className="mono">©</span> FIELD INVESTIGATION SYSTEM</span><span>FOLLOW THE EVIDENCE. SOLVE THE MYSTERY.</span></footer>
  </main>
}

function CaseSelection({ navigate }) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const load = useCallback(() => { setState({ data: null, loading: true, error: null }); api.listCases().then((data) => setState({ data, loading: false, error: null })).catch((error) => setState({ data: null, loading: false, error })) }, [])
  useEffect(() => { load() }, [load])
  return <main className="selection-shell"><header className="selection-header"><button className="brand-button" onClick={() => navigate('/')}><Brand /></button><span className="nav-note"><span className="live-dot" /> CASE ARCHIVE</span></header><section className="selection-content"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={15} /> Back to desk</button><div className="selection-title"><div><Eyebrow icon={FileSearch}>ACTIVE CASE ARCHIVE</Eyebrow><h1>Select a case file.</h1><p>Each record holds a different version of events. Choose a file to begin your investigation.</p></div><div className="archive-index"><span>ARCHIVE REF.</span><strong>CT—{new Date().getFullYear()}</strong><small>FIELD OFFICE / 01</small></div></div>
    <div className="case-grid-wrap"><ResourceState loading={state.loading} error={state.error} data={state.data} onRetry={load} emptyTitle="No case files available" emptyDetail="The case archive did not return any cases.">{<div className="case-grid">{state.data?.map((item, index) => <CaseCard key={item.caseId} item={item} index={index} onOpen={() => navigate(`/case/${item.caseId}`)} />)}</div>}</ResourceState></div>
    <div className="archive-note"><ShieldCheck size={15} /><span>CASE FILES ARE DRAWN FROM THE VERIFIED RELATIONAL ARCHIVE</span><span className="mono">·</span><span>CASE DATA IS READ LIVE</span></div></section><footer className="selection-footer"><Brand compact /><span>FIELD OFFICE ARCHIVE <span className="mono">/</span> CASETRACE</span></footer></main>
}

function CaseCard({ item, index, onOpen }) {
  const number = String(index + 1).padStart(2, '0')
  const incident = formatDate(item.incidentAt)
  return <button className="case-card" onClick={onOpen}><div className="case-card-top"><span className="case-number">FILE {number} <span className="mono">/</span> {item.caseCode}</span><Tag tone={String(item.status).toLowerCase() === 'open' ? 'green' : 'muted'}>{item.status}</Tag></div><div className="case-card-symbol"><span className="symbol-lines" /><span>{String(item.title || '').slice(0, 1)}</span></div><div className="case-card-copy"><h2>{item.title}</h2><p>{item.description}</p></div><div className="case-card-location"><MapPin size={13} /><span>{item.incidentLocation || 'Location not recorded'}</span></div><div className="case-card-bottom"><span><Clock3 size={13} />{incident}</span><span><Users size={13} />{item.suspectCount} persons</span><span><Fingerprint size={13} />{item.evidenceCount} clues</span></div><div className="case-card-action"><span>OPEN CASE FILE</span><ArrowUpRight size={15} /></div></button>
}

function CaseInvestigation({ caseId, navigate }) {
  const [active, setActive] = useState('overview')
  const [caseState, setCaseState] = useState(emptyResource)
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
  const context = { caseId, caseFile, resources, loadResource, refresh }

  return <main className="workspace-shell"><aside className="workspace-sidebar"><button className="brand-button sidebar-brand" onClick={() => navigate('/cases')}><Brand /></button><div className="sidebar-divider" /><button className="back-link sidebar-back" onClick={() => navigate('/cases')}><ArrowLeft size={14} /> All case files</button><div className="sidebar-case"><span className="eyebrow">CURRENT INVESTIGATION</span><strong>{caseFile?.caseCode || `CASE ${caseId}`}</strong><span>{caseFile?.title || 'Loading case file'}</span><Tag tone="green">{caseFile?.status || 'OPEN'}</Tag></div><nav className="case-nav" aria-label="Investigation sections"><span className="nav-section-label">CASE MATERIALS</span>{sections.slice(0, 9).map((section) => <NavItem key={section.id} section={section} active={active === section.id} onClick={() => changeSection(section.id)} />)}<span className="nav-section-label nav-section-spaced">ANALYSIS</span>{sections.slice(9).map((section) => <NavItem key={section.id} section={section} active={active === section.id} onClick={() => changeSection(section.id)} />)}</nav><div className="sidebar-bottom"><div className="file-stamp"><span>DATABASE LINK</span><span><span className="status-dot status-good" /> LIVE CONNECTION</span><small>POSTGRESQL / REST API</small></div><Brand compact /></div></aside>
    <div className="workspace-main"><header className="workspace-topbar"><div className="breadcrumb"><span>CASE FILES</span><ChevronRight size={13} /><span>{caseFile?.caseCode || `CT—${caseId}`}</span><ChevronRight size={13} /><strong>{selected.label}</strong></div><div className="topbar-right"><span className="nav-note"><span className="live-dot" /> LIVE CASE DATA</span><button className="icon-button" title="Return to case archive" onClick={() => navigate('/cases')}><ArrowLeft size={16} /></button></div></header><main className="workspace-content"><div className="mobile-case-select"><select value={active} onChange={(event) => changeSection(event.target.value)} aria-label="Investigation section">{sections.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>{caseState.loading && !caseFile ? <LoadingState label="Opening case file" /> : caseState.error ? <ErrorState error={caseState.error} onRetry={loadCase} /> : <><div className="case-banner"><div><Eyebrow icon={selected.icon}>{selected.id === 'overview' ? 'INVESTIGATION BRIEF' : `CASE MATERIALS / ${selected.id.replaceAll('-', ' ').toUpperCase()}`}</Eyebrow><h1>{selected.id === 'overview' ? caseFile?.title : selected.label}</h1><p>{selected.id === 'overview' ? caseFile?.description : `${caseFile?.caseCode} · ${caseFile?.title}`}</p></div><div className="banner-meta"><Tag tone="green">{caseFile?.status}</Tag><span>{caseFile?.caseCode}</span></div></div><SectionContent active={active} context={context} /></>}</main></div></main>
}

function NavItem({ section, active, onClick }) {
  const Icon = section.icon
  return <button className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={onClick}><Icon size={16} strokeWidth={1.7} /><span>{section.label}</span>{active && <span className="nav-active-mark" />}</button>
}

function SectionContent({ active, context }) {
  const { resources, refresh } = context
  switch (active) {
    case 'overview': return <Overview {...context} />
    case 'suspects': return <Suspects resource={resources.suspects} retry={() => refresh('suspects')} />
    case 'evidence': return <Evidence resource={resources.evidence} retry={() => refresh('evidence')} />
    case 'cctv': return <Cctv resource={resources.cctv} retry={() => refresh('cctv')} />
    case 'access-logs': return <Access resource={resources['access-logs']} retry={() => refresh('access-logs')} />
    case 'phone-records': return <Phones resource={resources['phone-records']} retry={() => refresh('phone-records')} />
    case 'witnesses': return <Witnesses resource={resources.witnesses} statements={resources['witness-statements']} retry={() => { refresh('witnesses'); refresh('witness-statements') }} />
    case 'vehicles': return <Vehicles resource={resources.vehicles} retry={() => refresh('vehicles')} />
    case 'vehicle-logs': return <VehicleLogs resource={resources['vehicle-logs']} retry={() => refresh('vehicle-logs')} />
    case 'timeline': return <Timeline resource={resources.timeline} retry={() => refresh('timeline')} />
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

function Suspects({ resource, retry }) {
  return <div className="content-stack"><SectionHeading kicker="PEOPLE & MOTIVES" title="Persons of interest" detail="Participants attached to this case file. Association is context, not proof." /><ResourceState {...resource} onRetry={retry} emptyDetail="There are no suspects linked to this case.">{<div className="people-grid">{resource.data?.map((person) => <Panel className="person-card" key={person.personId}><div className="person-card-head"><div className="avatar-large">{person.name?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><Tag tone="muted">PERSON {person.personId}</Tag></div><h3>{person.name}</h3><p className="person-role">{person.occupation || 'Occupation not recorded'}</p><div className="person-facts"><div><span>RELATION TO CASE</span><strong>{person.relationshipToVictim || 'Not recorded'}</strong></div>{person.age && <div><span>AGE</span><strong>{person.age}</strong></div>}</div>{person.caseNotes && <p className="person-notes">{person.caseNotes}</p>}</Panel>)}</div>}</ResourceState></div>
}

function Evidence({ resource, retry }) {
  return <div className="content-stack"><SectionHeading kicker="CATALOGUED MATERIAL" title="Evidence locker" detail="Physical and digital records linked to the incident. Relevance labels reflect the case record." /><ResourceState {...resource} onRetry={retry} emptyDetail="No evidence has been catalogued for this case.">{<div className="evidence-grid">{resource.data?.map((item) => <Panel className="evidence-card" key={item.evidenceId}><div className="evidence-card-top"><span className="evidence-index">{item.evidenceCode || `E-${item.evidenceId}`}</span><Tag tone={item.relevance === 'CRITICAL' ? 'red' : item.relevance === 'HIGH' ? 'amber' : 'muted'}>{item.relevance || 'UNRATED'}</Tag></div><div className="evidence-glyph"><Fingerprint size={22} /></div><span className="evidence-type">{item.evidenceType}</span><h3>{item.description}</h3><div className="evidence-meta"><RecordMeta icon={MapPin}>{item.location || 'Location not recorded'}</RecordMeta><RecordMeta icon={Clock3}>{formatDate(item.discoveredAt)}</RecordMeta></div>{item.connectedPeople && <div className="connected-people"><Users size={13} /><span>CONNECTED PERSONS</span><strong>{item.connectedPeople}</strong></div>}</Panel>)}</div>}</ResourceState></div>
}

function Cctv({ resource, retry }) {
  return <LogSection kicker="VIDEO SURVEILLANCE" title="CCTV observations" detail="Recorded appearances and activities from case-linked cameras." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'observedAt', label: 'TIME', render: (row) => <span className="mono-cell">{formatDate(row.observedAt)}</span> }, { key: 'cameraCode', label: 'CAMERA', render: (row) => <Tag tone="muted">{row.cameraCode}</Tag> }, { key: 'person', label: 'PERSON', render: (row) => row.person || 'Unidentified' }, { key: 'location', label: 'LOCATION' }, { key: 'activity', label: 'RECORDED ACTIVITY' }, { key: 'confidence', label: 'CONFIDENCE', render: (row) => row.confidence == null ? '—' : `${Math.round(Number(row.confidence) * 100)}%` }]} /></LogSection>
}

function Access({ resource, retry }) {
  return <LogSection kicker="ENTRY & CREDENTIAL HISTORY" title="Access logs" detail="Card and door events recorded against a case participant." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'occurredAt', label: 'TIME', render: (row) => <span className="mono-cell">{formatDate(row.occurredAt)}</span> }, { key: 'person', label: 'PERSON' }, { key: 'location', label: 'LOCATION' }, { key: 'accessType', label: 'EVENT', render: (row) => <Tag tone={row.accessType === 'ENTRY' ? 'green' : 'amber'}>{row.accessType}</Tag> }, { key: 'credentialCode', label: 'CREDENTIAL', render: (row) => row.credentialCode || '—' }]} /></LogSection>
}

function Phones({ resource, retry }) {
  return <LogSection kicker="COMMUNICATION METADATA" title="Phone records" detail="Recorded contact between case participants. Call content is not available in this file." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'occurredAt', label: 'TIME', render: (row) => <span className="mono-cell">{formatDate(row.occurredAt)}</span> }, { key: 'caller', label: 'CALLER' }, { key: 'receiver', label: 'RECEIVER' }, { key: 'durationSeconds', label: 'DURATION', render: (row) => `${row.durationSeconds}s` }, { key: 'callStatus', label: 'STATUS', render: (row) => <Tag tone="muted">{row.callStatus}</Tag> }]} /></LogSection>
}

function Witnesses({ resource, statements, retry }) {
  return <div className="content-stack"><SectionHeading kicker="RECORDED ACCOUNTS" title="Witness accounts" detail="Witness identities and statements as recorded in this case file." /><Panel><div className="panel-heading-row"><SectionHeading kicker="CASE PARTICIPANTS" title="Witnesses" /></div><ResourceState {...resource} onRetry={retry} emptyDetail="No witnesses are attached to this case.">{<div className="witness-list">{resource.data?.map((witness) => <div className="witness-row" key={witness.personId}><div className="avatar-mark"><MessageSquareQuote size={17} /></div><div><strong>{witness.name}</strong><span>{[witness.occupation, witness.age ? `Age ${witness.age}` : null].filter(Boolean).join(' · ') || 'Details not recorded'}</span>{witness.caseNotes && <p>{witness.caseNotes}</p>}</div></div>)}</div>}</ResourceState></Panel><Panel><SectionHeading kicker="STATEMENTS ON FILE" title="Recorded statements" /><ResourceState {...statements} onRetry={retry} emptyDetail="No witness statements are linked to this case.">{<div className="statement-list">{statements.data?.map((statement) => <article className="statement-card" key={statement.statementId}><div className="statement-head"><RecordMeta icon={MessageSquareQuote}>{statement.witness}</RecordMeta><RecordMeta icon={Clock3}>{formatDate(statement.recordedAt)}</RecordMeta></div><blockquote>“{statement.statement}”</blockquote><div className="statement-foot">{statement.subject && <span>MENTIONS <strong>{statement.subject}</strong></span>}{statement.associatedClaimLocation && <span>CLAIMED LOCATION <strong>{statement.associatedClaimLocation}</strong></span>}</div></article>)}</div>}</ResourceState></Panel></div>
}

function Vehicles({ resource, retry }) {
  return <LogSection kicker="REGISTERED TRANSPORT" title="Vehicles" detail="Vehicles associated with participants in this investigation." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'registrationNumber', label: 'REGISTRATION', render: (row) => <span className="mono-cell">{row.registrationNumber}</span> }, { key: 'owner', label: 'REGISTERED OWNER' }, { key: 'vehicleType', label: 'TYPE' }, { key: 'vehicleId', label: 'RECORD ID', render: (row) => <span className="mono-cell">V-{row.vehicleId}</span> }]} /></LogSection>
}

function VehicleLogs({ resource, retry }) {
  return <LogSection kicker="VEHICLE MOVEMENTS" title="Vehicle activity" detail="Recorded vehicle events and associated locations." resource={resource} retry={retry}><DataTable rows={resource.data} columns={[{ key: 'occurredAt', label: 'TIME', render: (row) => <span className="mono-cell">{formatDate(row.occurredAt)}</span> }, { key: 'registrationNumber', label: 'VEHICLE', render: (row) => <span className="mono-cell">{row.registrationNumber}</span> }, { key: 'owner', label: 'OWNER' }, { key: 'location', label: 'LOCATION' }, { key: 'activity', label: 'RECORDED ACTIVITY' }]} /></LogSection>
}

function Timeline({ resource, retry }) {
  const ordered = useMemo(() => [...(resource.data || [])].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt)), [resource.data])
  return <div className="content-stack"><SectionHeading kicker="CROSS-SOURCE RECONSTRUCTION" title="Case timeline" detail="Events are assembled from case records and ordered chronologically." /><Panel className="timeline-panel"><div className="timeline-topline"><span>{ordered.length ? `${ordered.length} RECORDED EVENTS` : 'TIMELINE'}</span><span>EARLIER <ArrowRight size={12} /> LATER</span></div><ResourceState {...resource} onRetry={retry} emptyDetail="There are no timeline events for this case.">{<div className="timeline-list">{ordered.map((event, index) => <div className="timeline-item" key={`${event.sourceType}-${event.sourceId}-${index}`}><div className="timeline-time"><strong>{formatDate(event.occurredAt)}</strong><span>{event.sourceType} <span className="mono">/</span> {event.sourceId}</span></div><div className="timeline-pin"><span /></div><div className="timeline-event"><div className="timeline-event-head"><Tag tone="muted">{event.sourceType}</Tag>{event.person && <strong>{event.person}</strong>}</div><p>{event.details}</p><RecordMeta icon={MapPin}>{event.location || 'Location not recorded'}</RecordMeta></div></div>)}</div>}</ResourceState></Panel></div>
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
