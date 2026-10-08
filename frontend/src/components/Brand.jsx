import React from 'react'
import { Fingerprint } from 'lucide-react'

export default function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><div className="brand-mark"><Fingerprint size={20} strokeWidth={1.7} /></div><div><div className="brand-name">CASE<span>TRACE</span></div>{!compact && <div className="brand-caption">INVESTIGATION DESK</div>}</div></div>
}
