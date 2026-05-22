import React, { useEffect, useState, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Bell, CheckCircle, Eye, Filter, AlertTriangle, AlertOctagon, Info } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import KPICard from '../components/KPICard'
import { alertsAPI } from '../api'
import { useApp } from '../context/AppContext'

const SEVERITY_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }
const CATEGORY_COLORS = { traffic: '#3b82f6', pollution: '#a855f7', transport: '#22c55e', energy: '#eab308' }
const SEVERITY_ICONS = { low: Info, medium: AlertTriangle, high: AlertTriangle, critical: AlertOctagon }

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState({ category: '', severity: '', resolved: false })
  const [loading, setLoading] = useState(true)
  const { notify } = useApp()

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (filters.category) params.category = filters.category
      if (filters.severity) params.severity = filters.severity
      params.resolved = filters.resolved
      const [a, s] = await Promise.all([alertsAPI.list(params), alertsAPI.summary()])
      setAlerts(a.data)
      setSummary(s.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { loadAll() }, [loadAll])

  const handleMarkRead = async (id) => {
    await alertsAPI.markRead(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    notify('Alert marked as read', 'success')
  }

  const handleResolve = async (id) => {
    await alertsAPI.resolve(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: true, is_read: true } : a))
    notify('Alert resolved', 'success')
  }

  const severityData = summary
    ? Object.entries(summary.by_severity).map(([k, v]) => ({ name: k, value: v, color: SEVERITY_COLORS[k] }))
    : []

  const categoryData = summary
    ? Object.entries(summary.by_category).map(([k, v]) => ({ name: k, value: v, color: CATEGORY_COLORS[k] }))
    : []

  return (
    <Layout title="Smart Alerts System" onRefresh={loadAll} loading={loading}>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KPICard title="Total Alerts" value={summary?.total ?? '—'} icon={Bell} color="blue" loading={loading} />
        <KPICard title="Unread" value={summary?.unread ?? '—'} icon={Bell} color="yellow" loading={loading} />
        <KPICard title="Unresolved" value={summary?.unresolved ?? '—'} icon={AlertTriangle} color="orange" loading={loading} />
        <KPICard title="Critical" value={summary?.by_severity?.critical ?? '—'} icon={AlertOctagon} color="red" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* Charts */}
        <div className="card">
          <h3 className="text-white font-semibold mb-3">By Severity</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: '#475569' }}>
                {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-white font-semibold mb-3">By Category</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={categoryData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={70} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Filters */}
        <div className="card">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Filter size={15} /> Filters
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Category', key: 'category', opts: ['', 'traffic', 'pollution', 'transport', 'energy'], labels: ['All Categories', 'Traffic', 'Pollution', 'Transport', 'Energy'] },
              { label: 'Severity', key: 'severity', opts: ['', 'low', 'medium', 'high', 'critical'], labels: ['All Severities', 'Low', 'Medium', 'High', 'Critical'] },
            ].map(({ label, key, opts, labels }) => (
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <select value={filters[key]} onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
                  {opts.map((o, i) => <option key={o} value={o}>{labels[i]}</option>)}
                </select>
              </div>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.resolved}
                onChange={e => setFilters(prev => ({ ...prev, resolved: e.target.checked }))}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-slate-400 text-sm">Show resolved</span>
            </label>
          </div>
        </div>
      </div>

      {/* Alerts list */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">Alert Feed ({alerts.length})</h3>
        <div className="space-y-2.5">
          {alerts.length === 0 && !loading && (
            <div className="text-center py-10 text-slate-500">
              <Bell size={32} className="mx-auto mb-2 opacity-50" />
              <p>No alerts match the current filters</p>
            </div>
          )}
          {alerts.map(a => {
            const Icon = SEVERITY_ICONS[a.severity] || Bell
            return (
              <div key={a.id} className={`flex gap-3 p-4 rounded-xl border transition-colors ${
                a.is_resolved ? 'bg-slate-900/40 border-slate-800 opacity-60' :
                a.is_read ? 'bg-slate-900 border-slate-700' : 'bg-slate-800 border-slate-600'
              }`}>
                <div className={`mt-0.5 p-1.5 rounded-lg shrink-0`}
                  style={{ backgroundColor: SEVERITY_COLORS[a.severity] + '22' }}>
                  <Icon size={14} style={{ color: SEVERITY_COLORS[a.severity] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={{ color: SEVERITY_COLORS[a.severity], borderColor: SEVERITY_COLORS[a.severity] + '44', backgroundColor: SEVERITY_COLORS[a.severity] + '22' }}>
                      {a.severity}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ color: CATEGORY_COLORS[a.category] || '#94a3b8', borderColor: (CATEGORY_COLORS[a.category] || '#94a3b8') + '44', backgroundColor: (CATEGORY_COLORS[a.category] || '#94a3b8') + '22' }}>
                      {a.category}
                    </span>
                    {!a.is_read && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">New</span>
                    )}
                    {a.is_resolved && (
                      <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">Resolved</span>
                    )}
                  </div>
                  <p className="text-white font-semibold text-sm">{a.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{a.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-slate-500 text-xs">{a.zone_name}</span>
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-slate-500 text-xs">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                {!a.is_resolved && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!a.is_read && (
                      <button onClick={() => handleMarkRead(a.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors">
                        <Eye size={11} /> Read
                      </button>
                    )}
                    <button onClick={() => handleResolve(a.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-green-900/40 hover:bg-green-900/60 border border-green-800 rounded-lg text-xs text-green-400 transition-colors">
                      <CheckCircle size={11} /> Resolve
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
