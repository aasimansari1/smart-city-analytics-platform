import React, { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import { Bus, Clock, Users, Star } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import KPICard from '../components/KPICard'
import { transportAPI } from '../api'

export default function Transport() {
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('')
  const [days, setDays] = useState(7)
  const [trends, setTrends] = useState(null)
  const [peakHours, setPeakHours] = useState([])
  const [performance, setPerformance] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [r, t, p, perf] = await Promise.all([
        transportAPI.routes(),
        transportAPI.trends({ route_id: selectedRoute || undefined, days }),
        transportAPI.peakHours({ route_id: selectedRoute || undefined }),
        transportAPI.performance(),
      ])
      setRoutes(r.data)
      setTrends(t.data)
      setPeakHours(p.data)
      setPerformance(perf.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [selectedRoute, days])

  useEffect(() => { loadAll() }, [loadAll])

  const trendsData = trends
    ? trends.labels.map((l, i) => ({
        time: l, delay: trends.delay[i], occupancy: trends.occupancy[i], passengers: trends.passengers[i]
      }))
    : []

  const avgDelay = routes.length ? (routes.reduce((s, r) => s + r.avg_delay_min, 0) / routes.length).toFixed(1) : '—'
  const avgOnTime = routes.length ? (routes.reduce((s, r) => s + r.on_time_pct, 0) / routes.length).toFixed(1) : '—'
  const avgOccupancy = routes.length ? (routes.reduce((s, r) => s + r.avg_occupancy_pct, 0) / routes.length).toFixed(1) : '—'
  const totalPassengers = routes.length ? routes.reduce((s, r) => s + r.avg_passengers, 0) : 0

  const TYPE_COLORS = { metro: '#3b82f6', bus: '#f97316', tram: '#22c55e' }
  const TYPE_ICONS = { metro: '🚇', bus: '🚌', tram: '🚊' }

  return (
    <Layout title="Public Transport Analytics" onRefresh={loadAll} loading={loading}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
          <option value="">All Routes</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
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
        <KPICard title="On-Time Rate" value={avgOnTime} unit="%" icon={Clock} color="green" loading={loading} />
        <KPICard title="Avg Delay" value={avgDelay} unit="min" icon={Clock} color="orange" loading={loading} />
        <KPICard title="Avg Occupancy" value={avgOccupancy} unit="%" icon={Users} color="blue" loading={loading} />
        <KPICard title="Total Passengers" value={totalPassengers.toLocaleString()} icon={Users} color="purple" loading={loading} />
      </div>

      {/* Route cards */}
      <div className="card mb-5">
        <h3 className="text-white font-semibold mb-3">Route Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {routes.map(r => (
            <div key={r.id} className="bg-slate-900 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{TYPE_ICONS[r.route_type] || '🚍'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full text-slate-300" style={{
                  backgroundColor: TYPE_COLORS[r.route_type] + '22', color: TYPE_COLORS[r.route_type],
                  border: `1px solid ${TYPE_COLORS[r.route_type]}44`
                }}>{r.route_type}</span>
              </div>
              <p className="text-slate-200 text-sm font-semibold mb-1 truncate">{r.route_name}</p>
              <p className="text-slate-500 text-xs mb-2">{r.from_zone} → {r.to_zone}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">On-time</span>
                  <span className={r.on_time_pct > 80 ? 'text-green-400' : r.on_time_pct > 60 ? 'text-yellow-400' : 'text-red-400'}>
                    {r.on_time_pct}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Avg delay</span>
                  <span className="text-slate-300">{r.avg_delay_min} min</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Occupancy</span>
                  <span className="text-slate-300">{r.avg_occupancy_pct}%</span>
                </div>
              </div>
              {/* Occupancy bar */}
              <div className="mt-2 bg-slate-800 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{
                  width: `${Math.min(100, r.avg_occupancy_pct)}%`,
                  backgroundColor: r.avg_occupancy_pct > 90 ? '#ef4444' : r.avg_occupancy_pct > 70 ? '#f97316' : '#3b82f6'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        {/* Trends */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Delay & Occupancy Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={Math.floor(trendsData.length / 6)} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="delay" stroke="#f97316" dot={false} strokeWidth={2} name="Delay (min)" />
              <Line yAxisId="right" type="monotone" dataKey="occupancy" stroke="#3b82f6" dot={false} strokeWidth={2} name="Occupancy %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Peak hours */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Passenger Flow by Hour</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} />
              <Bar dataKey="avg_passengers" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Avg Passengers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance table */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">Route Performance Scores (7-Day)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 pb-2 font-medium">Route</th>
                <th className="text-center text-slate-400 pb-2 font-medium">Type</th>
                <th className="text-right text-slate-400 pb-2 font-medium">On-Time %</th>
                <th className="text-right text-slate-400 pb-2 font-medium">Avg Delay</th>
                <th className="text-right text-slate-400 pb-2 font-medium">Occupancy</th>
                <th className="text-right text-slate-400 pb-2 font-medium">Efficiency Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {performance.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/50">
                  <td className="py-2.5 text-white font-medium">{r.route_name}</td>
                  <td className="py-2.5 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      color: TYPE_COLORS[r.route_type], backgroundColor: TYPE_COLORS[r.route_type] + '22',
                      border: `1px solid ${TYPE_COLORS[r.route_type]}44`
                    }}>{r.route_type}</span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={r.on_time_pct > 80 ? 'text-green-400' : r.on_time_pct > 60 ? 'text-yellow-400' : 'text-red-400'}>
                      {r.on_time_pct}%
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-300">{r.avg_delay_min} min</td>
                  <td className="py-2.5 text-right text-slate-300">{r.avg_occupancy_pct}%</td>
                  <td className="py-2.5 text-right">
                    <span className="font-semibold" style={{ color: r.efficiency_score > 75 ? '#22c55e' : r.efficiency_score > 50 ? '#f59e0b' : '#ef4444' }}>
                      {r.efficiency_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
