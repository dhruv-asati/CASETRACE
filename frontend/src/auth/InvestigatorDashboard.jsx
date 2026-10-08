import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import SiteHeader from '../components/SiteHeader'
import { EmptyState, ErrorState, Eyebrow, formatDate, LoadingState } from '../components/Shared'
import { authApi } from '../lib/api'

export default function InvestigatorDashboard({ navigate, user, onLogout }) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const load = useCallback(() => {
    setState({ data: null, loading: true, error: null })
    authApi.dashboard().then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error }))
  }, [])
  useEffect(() => { load() }, [load])
  const stats = state.data?.statistics
  const metrics = [
    { label: 'CASES INVESTIGATED', value: stats?.casesInvestigated },
    { label: 'EVIDENCE REVIEWED', value: stats?.evidenceReviewed },
    { label: 'THEORIES SUBMITTED', value: stats?.solutionsSubmitted },
    { label: 'CASES SOLVED', value: stats?.casesSolved },
  ]

  return <main className="dashboard-shell dossier-page">
    <SiteHeader navigate={navigate} user={user} onLogout={onLogout} active="briefing" />
    <section className="dashboard-content">
      <div className="dashboard-welcome"><div><Eyebrow icon={ShieldCheck}>FIELD BRIEFING <span className="mono">/</span> {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase()}</Eyebrow><h1>{user.fullName}</h1><p>Case activity and recent field notes from your investigator file.</p></div><button className="button button-primary" onClick={() => navigate('/cases')}>Open case archive <ArrowRight size={15} /></button></div>
      {state.loading ? <LoadingState label="Retrieving investigator records" /> : state.error ? <ErrorState error={state.error} onRetry={load} /> : <>
        <dl className="briefing-stat-list">{metrics.map(({ label, value }, index) => <div className="briefing-stat-row" key={label}><dt><span>{String(index + 1).padStart(2, '0')}</span>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
        <div className="dashboard-columns">
          <section className="briefing-identity"><div className="briefing-identity-top"><div><Eyebrow>IDENTITY RECORD</Eyebrow><h2>{state.data.investigator.fullName}</h2></div><span className="avatar-large">{user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span></div><dl className="profile-fields"><div><dt>INVESTIGATOR ID</dt><dd>CTI—{String(state.data.investigator.investigatorId).padStart(4, '0')}</dd></div><div><dt>USERNAME</dt><dd>@{state.data.investigator.username}</dd></div><div><dt>MEMBER SINCE</dt><dd>{formatDate(state.data.investigator.createdAt, { dateOnly: true })}</dd></div></dl><button className="profile-open-link" onClick={() => navigate('/profile')}>OPEN INVESTIGATOR PROFILE <ArrowRight size={14} /></button></section>
          <section className="recent-panel"><div className="dashboard-section-head"><div><Eyebrow>CASE HISTORY</Eyebrow><h2>Recent investigations</h2></div><span className="recent-count">{state.data.recentInvestigations.length} RECENT FILES</span></div>{state.data.recentInvestigations.length ? <div className="recent-list">{state.data.recentInvestigations.map((item, index) => <button className="recent-investigation" key={item.caseId} onClick={() => navigate(`/case/${item.caseId}`)}><span className="recent-number">{String(index + 1).padStart(2, '0')}</span><span className="recent-case-code">{item.caseCode}</span><span className="recent-case-main"><strong>{item.title}</strong><small>Last active {formatDate(item.lastActivityAt)}</small></span><span className="recent-case-meta"><span>{item.result || 'No theory submitted'}</span>{item.submittedAt && <small>{formatDate(item.submittedAt)} · {item.evidenceCited} records cited</small>}</span><ArrowRight size={15} /></button>)}</div> : <EmptyState title="No investigations started" detail="Open a case file to begin an investigation. Your recent case activity will appear here." />}</section>
        </div>
      </>}
    </section>
    <footer className="dashboard-footer"><span>FIELD BRIEFING <span className="mono">/</span> CASETRACE</span><button className="footer-logout" onClick={onLogout}>SIGN OUT</button></footer>
  </main>
}
