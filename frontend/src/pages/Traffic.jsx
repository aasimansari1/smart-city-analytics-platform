import React, { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import { Car, Gauge, AlertTriangle, TrendingUp, RefreshCw, Zap } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import KPICard from '../components/KPICard'
import { trafficAPI, adminAPI } from '../api'

export default function Traffic() {
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState('')
  const [days, setDays] = useState(7)
  const [trends, setTrends] = useState(null)
  const [peakHours, setPeakHours] = useState([])
  const [comparison, setComparison] = useState([])
  const [live, setLive] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [z, t, p, c, l] = await Promise.all([
        adminAPI.zones(),
        trafficAPI.trends({ zone_id: selectedZone || undefined, days }),
        trafficAPI.peakHours({ zone_id: selectedZone || undefined }),
        trafficAPI.zonesComparison(),
        trafficAPI.live(),
      ])
      setZones(z.data)
      setTrends(t.data)
      setPeakHours(p.data)
      setComparison(c.data)
      setLive(l.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [selectedZone, days])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await trafficAPI.live().catch(() => null)
      if (res) setLive(res.data)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const trendsData = trends
    ? trends.labels.map((l, i) => ({
        time: l, congestion: trends.congestion[i], vehicles: trends.vehicles[i], speed: trends.speed[i]
      }))
    : []

  const avgCongestion = live.length ? (live.reduce((s, z) => s + z.congestion_level, 0) / live.length).toFixed(2) : '—'
  const maxCongestion = live.length ? Math.max(...live.map(z => z.congestion_level)).toFixed(1) : '—'
  const totalVehicles = live.length ? live.reduce((s, z) => s + z.vehicle_count, 0).toLocaleString() : '—'
  const criticalZones = live.filter(z => z.status === 'critical').length

  return (
    <Layout title="Traffic Analytics" onRefresh={loadAll} loading={loading}>
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
        <KPICard title="Avg Congestion" value={avgCongestion} unit="/10" icon={Gauge} color="orange" loading={loading} />
        <KPICard title="Peak Congestion" value={maxCongestion} unit="/10" icon={TrendingUp} color="red" loading={loading} />
        <KPICard title="Total Vehicles" value={totalVehicles} icon={Car} color="blue" loading={loading} />
        <KPICard title="Critical Zones" value={criticalZones} icon={AlertTriangle} color="red" loading={loading} />
      </div>

      {/* Live status */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Live Zone Status</h3>
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {live.map(z => (
            <div key={z.zone_id} className={`rounded-xl p-3 border ${
              z.status === 'critical' ? 'bg-red-900/20 border-red-800/40' :
              z.status === 'warning'  ? 'bg-orange-900/20 border-orange-800/40' :
              'bg-green-900/20 border-green-800/40'}`}>
              <p className="text-slate-300 text-xs font-medium truncate">{z.zone_name}</p>
              <p className={`text-xl font-bold mt-1 ${
                z.status === 'critical' ? 'text-red-400' :
                z.status === 'warning' ? 'text-orange-400' : 'text-green-400'}`}>
                {z.congestion_level.toFixed(1)}
              </p>
              <p className="text-slate-500 text-xs">{z.vehicle_count.toLocaleString()} vehicles</p>
              <p className="text-slate-500 text-xs">{z.avg_speed_kmh} km/h</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        {/* Trends */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Congestion & Speed Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={Math.floor(trendsData.length / 6)} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 10]} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="congestion" stroke="#f97316" dot={false} strokeWidth={2} name="Congestion" />
              <Line yAxisId="right" type="monotone" dataKey="speed" stroke="#3b82f6" dot={false} strokeWidth={2} name="Speed (km/h)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Peak hours */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Peak Hours Analysis</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 10]} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} />
              <Bar dataKey="avg_congestion" fill="#f97316" radius={[3, 3, 0, 0]} name="Avg Congestion" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zones comparison table */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">Zone-by-Zone Comparison (24h)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 pb-2 font-medium">Zone</th>
                <th className="text-left text-slate-400 pb-2 font-medium">Type</th>
                <th className="text-right text-slate-400 pb-2 font-medium">Avg Congestion</th>
                <th className="text-right text-slate-400 pb-2 font-medium">Avg Vehicles</th>
                <th className="text-right text-slate-400 pb-2 font-medium">Incidents</th>
                <th className="text-center text-slate-400 pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {comparison.map((z, i) => (
                <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 text-white font-medium">{z.zone}</td>
                  <td className="py-2.5 text-slate-400 capitalize">{z.zone_type}</td>
                  <td className="py-2.5 text-right">
                    <span className={z.avg_congestion > 7 ? 'text-red-400' : z.avg_congestion > 5 ? 'text-orange-400' : 'text-green-400'}>
                      {z.avg_congestion.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-300">{z.avg_vehicles.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-slate-300">{z.total_incidents}</td>
                  <td className="py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      z.avg_congestion > 7 ? 'badge-critical' :
                      z.avg_congestion > 5 ? 'badge-warning' : 'badge-good'}`}>
                      {z.avg_congestion > 7 ? 'Critical' : z.avg_congestion > 5 ? 'High' : 'Normal'}
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
