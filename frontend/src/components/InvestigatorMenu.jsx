import React from 'react'
import { ChevronDown, LayoutDashboard, LogOut, UserRound } from 'lucide-react'

export default function InvestigatorMenu({ user, onNavigate, onLogout }) {
  return <details className="investigator-menu">
    <summary aria-label={`Investigator profile: ${user.fullName}`}>
      <UserRound size={15} /><span>{user.fullName.split(' ')[0]}</span><ChevronDown size={13} />
    </summary>
    <div className="investigator-menu-popover">
      <div className="investigator-menu-profile"><strong>{user.fullName}</strong><span>@{user.username}</span></div>
      <button onClick={() => onNavigate('/dashboard')}><LayoutDashboard size={15} /> Investigator dashboard</button>
      <button onClick={() => onNavigate('/profile')}><UserRound size={15} /> Investigator profile</button>
      <button onClick={() => onNavigate('/cases')}><UserRound size={15} /> Case archive</button>
      <button onClick={onLogout}><LogOut size={15} /> Sign out</button>
    </div>
  </details>
}
