import React from 'react'
import { AlertTriangle, LoaderCircle, RefreshCw, SearchX } from 'lucide-react'

export function Eyebrow({ children, icon: Icon }) {
  return <div className="eyebrow">{Icon && <Icon size={13} strokeWidth={1.8} />}<span>{children}</span></div>
}

export function Tag({ children, tone = 'muted' }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

export function Panel({ children, className = '' }) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function LoadingState({ label = 'Retrieving case records' }) {
  return <div className="state-card"><LoaderCircle className="spin" size={21} /><span>{label}…</span></div>
}

export function ErrorState({ error, onRetry }) {
  return <div className="state-card state-error"><AlertTriangle size={19} /><div><strong>{error?.status === 404 ? 'Record not found' : 'Could not load these records'}</strong><p>{error?.message || 'Something interrupted the request.'}</p>{onRetry && <button className="text-button" onClick={onRetry}><RefreshCw size={13} /> Try again</button>}</div></div>
}

export function EmptyState({ title = 'No records found', detail = 'There are no records to display for this section.' }) {
  return <div className="empty-state"><SearchX size={22} /><strong>{title}</strong><span>{detail}</span></div>
}

export function ResourceState({ loading, error, data, onRetry, emptyTitle, emptyDetail, children }) {
  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (!data?.length) return <EmptyState title={emptyTitle} detail={emptyDetail} />
  return children
}

export function SectionHeading({ kicker, title, detail, action }) {
  return <div className="section-heading"><div><p className="eyebrow">{kicker}</p><h2>{title}</h2>{detail && <p className="section-detail">{detail}</p>}</div>{action}</div>
}

export function DataTable({ columns, rows, rowKey }) {
  if (!rows?.length) return <EmptyState />
  return <div className="table-wrap" role="region" aria-label="Case records table" tabIndex={0}><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={rowKey ? rowKey(row) : index}>{columns.map((column) => <td key={column.key} data-label={column.label}>{column.render ? column.render(row) : (row[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>
}

export function formatDate(value, options = {}) {
  if (!value) return 'Time not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', { dateStyle: options.dateOnly ? 'medium' : undefined, timeStyle: options.dateOnly ? undefined : 'short' }).format(date)
}

export function RecordMeta({ icon: Icon, children }) {
  return <span className="record-meta">{Icon && <Icon size={13} />}{children}</span>
}
