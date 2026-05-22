import React, { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { Zap, DollarSign, AlertTriangle, TrendingDown, Lightbulb } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import KPICard from '../components/KPICard'
import { energyAPI, adminAPI } from '../api'

const SECTOR_COLORS = {
  residential: '#3b82f6', commercial: '#f97316', industrial: '#a855f7', government: '#22c55e'
}

export default function Energy() {
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState('')
  const [days, setDays] = useState(7)
  const [trends, setTrends] = useState(null)
  const [bySector, setBySector] = useState([])
  const [anomalies, setAnomalies] = useState([])
  const [comparison, setComparison] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [z, t, s, a, c, r] = await Promise.all([
        adminAPI.zones(),
        energyAPI.trends({ zone_id: selectedZone || undefined, days }),
        energyAPI.bySector({ zone_id: selectedZone || undefined }),
        energyAPI.anomalies(),
        energyAPI.zonesComparison(),
        energyAPI.recommendations(),
      ])
      setZones(z.data)
      setTrends(t.data)
      setBySector(s.data)
      setAnomalies(a.data)
      setComparison(c.data)
      setRecommendations(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [selectedZone, days])

  useEffect(() => { loadAll() }, [loadAll])

  const trendsData = trends
    ? trends.labels.map((l, i) => ({
        time: l, total: trends.total[i], residential: trends.residential[i],
        commercial: trends.commercial[i], industrial: trends.industrial[i]
      }))
    : []

  const totalKwh = bySector.reduce((s, r) => s + r.total_kwh, 0)
  const totalCost = bySector.reduce((s, r) => s + r.avg_cost_usd, 0)

  const PRIORITY_COLORS = { high: '#ef4444', medium: '#f97316', low: '#22c55e' }

  return (
    <Layout title="Energy Consumption" onRefresh={loadAll} loading={loading}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
          <option value={1}>Last 24h</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KPICard title="Total Consumption" value={(totalKwh / 1000).toFixed(1)} unit="MWh" icon={Zap} color="yellow" loading={loading} />
        <KPICard title="Total Cost (24h)" value={`$${(totalCost).toFixed(0)}`} icon={DollarSign} color="green" loading={loading} />
        <KPICard title="Anomalies (7d)" value={anomalies.length} icon={AlertTriangle} color="red" loading={loading} />
        <KPICard title="Savings Potential" value="12-18" unit="%" icon={TrendingDown} color="blue" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* Trends area chart */}
        <div className="xl:col-span-2 card">
          <h3 className="text-white font-semibold mb-4">Energy Consumption Trends (MWh)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendsData}>
              <defs>
                {Object.entries(SECTOR_COLORS).map(([k, c]) => (
                  <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={Math.floor(trendsData.length / 6)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} />
              <Legend />
              {['residential', 'commercial', 'industrial'].map(s => (
                <Area key={s} type="monotone" dataKey={s} stroke={SECTOR_COLORS[s]}
                  fill={`url(#grad-${s})`} strokeWidth={2} name={s.charAt(0).toUpperCase() + s.slice(1)} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sector pie chart */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Usage by Sector</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={bySector} dataKey="total_kwh" nameKey="sector" cx="50%" cy="50%" outerRadius={70} label={({ sector, percent }) => `${sector} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#475569' }}>
                {bySector.map((entry, i) => (
                  <Cell key={i} fill={SECTOR_COLORS[entry.sector] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(v) => [`${(v / 1000).toFixed(1)} MWh`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {bySector.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SECTOR_COLORS[s.sector] }} />
                  <span className="text-slate-400 capitalize">{s.sector}</span>
                </div>
                <span className="text-slate-300">{(s.total_kwh / 1000).toFixed(1)} MWh</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        {/* Anomalies */}
        <div className="card">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            Energy Anomalies (7-Day)
          </h3>
          {anomalies.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No anomalies detected</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {anomalies.slice(0, 10).map((a, i) => (
                <div key={i} className="bg-red-900/10 border border-red-900/30 rounded-lg p-3">
                  <div className="flex justify-between">
                    <p className="text-red-300 text-sm font-medium">{a.zone_name}</p>
                    <span className="text-slate-500 text-xs">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 capitalize">{a.sector} sector</p>
                  <p className="text-red-400 text-sm font-semibold mt-1">{a.consumption_kwh.toFixed(0)} kWh abnormal</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="card">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Lightbulb size={16} className="text-yellow-400" />
            Energy-Saving Recommendations
          </h3>
          <div className="space-y-2.5">
            {recommendations.map((r, i) => (
              <div key={i} className="bg-slate-900 rounded-xl p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 text-sm font-medium">{r.zone}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium" style={{
                    color: PRIORITY_COLORS[r.priority],
                    backgroundColor: PRIORITY_COLORS[r.priority] + '22',
                    borderColor: PRIORITY_COLORS[r.priority] + '44',
                  }}>{r.priority}</span>
                </div>
                <p className="text-slate-400 text-xs">{r.recommendation}</p>
                <p className="text-green-400 text-xs mt-1.5 font-medium">
                  Potential saving: {r.potential_saving_pct}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone comparison bar chart */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">Zone Energy Consumption (24h)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={comparison} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <YAxis dataKey="zone" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f1f5f9' }} formatter={(v) => [`${v.toLocaleString()} kWh`]} />
            <Bar dataKey="total_kwh" fill="#eab308" radius={[0, 4, 4, 0]} name="kWh" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Layout>
  )
}
