import React, { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Settings, Users, Map, Database, FileText, Download, Server, Activity, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import KPICard from '../components/KPICard'
import { adminAPI } from '../api'
import { useApp } from '../context/AppContext'

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [zones, setZones] = useState([])
  const [users, setUsers] = useState([])
  const [report, setReport] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const { notify } = useApp()

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, z, u, r] = await Promise.all([
        adminAPI.stats(), adminAPI.zones(), adminAPI.users(), adminAPI.report()
      ])
      setStats(s.data)
      setZones(z.data)
      setUsers(u.data)
      setReport(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const downloadReport = () => {
    if (!report) return
    const text = `SMART CITY ANALYTICS REPORT
Generated: ${new Date(report.generated_at).toLocaleString()}
Period: ${report.period}

TRAFFIC SUMMARY
  Average Congestion: ${report.traffic.avg_congestion}/10
  Total Incidents: ${report.traffic.total_incidents}
  Status: ${report.traffic.status}

POLLUTION SUMMARY
  Average AQI: ${report.pollution.avg_aqi}
  Maximum AQI: ${report.pollution.max_aqi}
  Status: ${report.pollution.status}

ENERGY SUMMARY
  Total Consumption: ${report.energy.total_mwh} MWh
  Total Cost: $${report.energy.total_cost_usd}
  Anomalies (7d): ${report.energy.anomalies_7d}

TRANSPORT SUMMARY
  On-Time Performance: ${report.transport.on_time_pct}%
  Average Delay: ${report.transport.avg_delay_min} min
  Status: ${report.transport.status}

ALERTS SUMMARY
  Total Alerts: ${report.alerts.total}
  Critical Unresolved: ${report.alerts.critical}
  Total Unresolved: ${report.alerts.unresolved}
`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smartcity-report-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    notify('Report downloaded', 'success')
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'zones', label: 'Zones', icon: Map },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'report', label: 'Report', icon: FileText },
  ]

  const ROLE_COLORS = { admin: '#ef4444', analyst: '#3b82f6', viewer: '#22c55e' }

  return (
    <Layout title="Admin Panel" onRefresh={loadAll} loading={loading}>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KPICard title="City Zones" value={stats?.zones ?? '—'} icon={Map} color="blue" loading={loading} />
        <KPICard title="Users" value={stats?.users ?? '—'} icon={Users} color="green" loading={loading} />
        <KPICard title="Data Records" value={stats ? (stats.traffic_records + stats.pollution_records).toLocaleString() : '—'} icon={Database} color="purple" loading={loading} />
        <KPICard title="Total Alerts" value={stats?.total_alerts ?? '—'} icon={Server} color="orange" loading={loading} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-900 rounded-xl p-1 w-fit border border-slate-700">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-white font-semibold mb-4">Data Records by Module</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: 'Traffic', count: stats.traffic_records },
                  { name: 'Pollution', count: stats.pollution_records },
                  { name: 'Transport', count: stats.transport_records },
                  { name: 'Energy', count: stats.energy_records },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.toLocaleString()} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f1f5f9' }} formatter={v => [v.toLocaleString()]} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-white font-semibold mb-4">System Status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Traffic Module',    status: 'Operational', records: stats.traffic_records },
                  { label: 'Pollution Module',  status: 'Operational', records: stats.pollution_records },
                  { label: 'Transport Module',  status: 'Operational', records: stats.transport_records },
                  { label: 'Energy Module',     status: 'Operational', records: stats.energy_records },
                  { label: 'AI Predictions',    status: 'Operational', records: null },
                  { label: 'Alert System',      status: stats.unresolved_alerts > 5 ? 'Warning' : 'Operational', records: stats.total_alerts },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="text-slate-300 text-sm">{item.label}</span>
                    <div className="flex items-center gap-3">
                      {item.records !== null && <span className="text-slate-500 text-xs">{item.records.toLocaleString()} records</span>}
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'Operational' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zones tab */}
      {activeTab === 'zones' && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">City Zones Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['ID', 'Name', 'Type', 'Population', 'Area (km²)', 'Coordinates'].map(h => (
                    <th key={h} className="text-left text-slate-400 pb-2 font-medium pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {zones.map(z => (
                  <tr key={z.id} className="hover:bg-slate-800/50">
                    <td className="py-2.5 text-slate-500 pr-4">{z.id}</td>
                    <td className="py-2.5 text-white font-medium pr-4">{z.name}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800 capitalize">
                        {z.zone_type}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300 pr-4">{z.population.toLocaleString()}</td>
                    <td className="py-2.5 text-slate-300 pr-4">{z.area_sqkm}</td>
                    <td className="py-2.5 text-slate-500 text-xs">{z.latitude.toFixed(4)}, {z.longitude.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">User Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {users.map(u => (
              <div key={u.id} className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: ROLE_COLORS[u.role] + '33', border: `1px solid ${ROLE_COLORS[u.role]}44` }}>
                    <span style={{ color: ROLE_COLORS[u.role] }}>{u.username[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{u.username}</p>
                    <p className="text-slate-400 text-xs">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize font-medium"
                    style={{ color: ROLE_COLORS[u.role], backgroundColor: ROLE_COLORS[u.role] + '22', border: `1px solid ${ROLE_COLORS[u.role]}44` }}>
                    {u.role}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-slate-600 text-xs mt-2">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report tab */}
      {activeTab === 'report' && report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Analytics Report</h3>
              <p className="text-slate-400 text-sm">{report.period} — Generated {new Date(report.generated_at).toLocaleString()}</p>
            </div>
            <button onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-medium transition-colors">
              <Download size={15} />
              Download Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: 'Traffic', icon: '🚗', data: report.traffic, color: '#f97316',
                items: [['Avg Congestion', `${report.traffic.avg_congestion}/10`], ['Incidents', report.traffic.total_incidents], ['Status', report.traffic.status]] },
              { title: 'Pollution', icon: '💨', data: report.pollution, color: '#a855f7',
                items: [['Avg AQI', report.pollution.avg_aqi], ['Max AQI', report.pollution.max_aqi], ['Status', report.pollution.status]] },
              { title: 'Energy', icon: '⚡', data: report.energy, color: '#eab308',
                items: [['Total', `${report.energy.total_mwh} MWh`], ['Cost', `$${report.energy.total_cost_usd}`], ['Anomalies', report.energy.anomalies_7d]] },
              { title: 'Transport', icon: '🚌', data: report.transport, color: '#22c55e',
                items: [['On-Time', `${report.transport.on_time_pct}%`], ['Avg Delay', `${report.transport.avg_delay_min}m`], ['Status', report.transport.status]] },
            ].map(({ title, icon, color, items }) => (
              <div key={title} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{icon}</span>
                  <h4 className="text-white font-semibold">{title}</h4>
                </div>
                <div className="space-y-2">
                  {items.map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Alerts summary in report */}
          <div className="card">
            <h3 className="text-white font-semibold mb-3">🔔 Alerts Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              {[['Total', report.alerts.total, '#3b82f6'],
                ['Critical', report.alerts.critical, '#ef4444'],
                ['Unresolved', report.alerts.unresolved, '#f97316']].map(([label, value, color]) => (
                <div key={label} className="bg-slate-900 rounded-xl p-4 text-center border border-slate-700">
                  <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-slate-400 text-sm mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
