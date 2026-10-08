import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Brand from './Brand'
import InvestigatorMenu from './InvestigatorMenu'

const linksFor = (user, active) => [
  { label: 'ARCHIVE', href: '/cases', key: 'archive' },
  ...(user ? [
    { label: 'BRIEFING', href: '/dashboard', key: 'briefing' },
    { label: 'PROFILE', href: '/profile', key: 'profile' },
  ] : []),
].map((link) => ({ ...link, active: link.key === active }))

export default function SiteHeader({ navigate, user, onLogout, active, authMode }) {
  const [open, setOpen] = useState(false)
  const links = linksFor(user, active)
  const go = (path) => { setOpen(false); navigate(path) }

  return <header className="site-header">
    <div className="site-header-inner">
      <button className="brand-button site-brand" onClick={() => go('/')} aria-label="CASETRACE home"><Brand /></button>
      <nav className="site-primary-nav" aria-label="Primary navigation">{links.map((link) => <button key={link.key} className={link.active ? 'active' : ''} aria-current={link.active ? 'page' : undefined} onClick={() => go(link.href)}>{link.label}</button>)}</nav>
      <div className="site-header-tools">
        {user ? <InvestigatorMenu user={user} onNavigate={go} onLogout={onLogout} /> : <div className="site-auth-links"><button className={authMode === 'login' ? 'active' : ''} onClick={() => go('/login')}>SIGN IN</button><button className={`site-register-link ${authMode === 'register' ? 'active' : ''}`} onClick={() => go('/register')}>INVESTIGATOR FILE</button></div>}
        <button className="site-mobile-toggle" type="button" aria-expanded={open} aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen((value) => !value)}>{open ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
    </div>
    {open && <nav className="site-mobile-nav" aria-label="Mobile navigation">{links.map((link) => <button key={link.key} className={link.active ? 'active' : ''} aria-current={link.active ? 'page' : undefined} onClick={() => go(link.href)}>{link.label}</button>)}{!user && <><button className={authMode === 'login' ? 'active' : ''} onClick={() => go('/login')}>SIGN IN</button><button className={authMode === 'register' ? 'active' : ''} onClick={() => go('/register')}>CREATE INVESTIGATOR FILE</button></>}{user && <button onClick={() => { setOpen(false); onLogout?.() }}>SIGN OUT</button>}</nav>}
  </header>
}
