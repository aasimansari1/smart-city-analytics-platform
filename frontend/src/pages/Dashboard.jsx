import React, { useEffect, useState, useCallback } from 'react'
import { Car, Wind, Zap, Bus, Bell, Map, AlertTriangle, Activity } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import Layout from '../components/Layout/Layout'
import KPICard from '../components/KPICard'
import { dashboardAPI, alertsAPI } from '../api'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

const SEVERITY_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }
const SEVERITY_BADGES = {
  low: 'badge-good', medium: 'badge-moderate', high: 'badge-warning', critical: 'badge-critical'
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null)
  const [overview, setOverview] = useState(null)
  const [zones, setZones] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [k, o, z, a] = await Promise.all([
        dashboardAPI.kpis(),
        dashboardAPI.overview(),
        dashboardAPI.zoneSummary(),
        alertsAPI.list({ resolved: false, limit: 5 }),
      ])
      setKpis(k.data)
      setOverview(o.data)
      setZones(z.data)
      setRecentAlerts(a.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const overviewData = overview
    ? overview.labels.map((l, i) => ({
        time: l, traffic: overview.traffic[i], pollution: overview.pollution[i], energy: overview.energy[i]
      }))
    : []

  return (
    <Layout title="City Dashboard" onRefresh={load} loading={loading}>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KPICard title="Traffic Congestion" value={kpis?.avg_congestion ?? '—'} unit="/10"
          icon={Car} color="orange" trend={kpis?.trend_congestion} loading={loading} />
        <KPICard title="Avg AQI" value={kpis?.avg_aqi ?? '—'} unit="AQI"
          icon={Wind} color="purple" trend={kpis?.trend_aqi} loading={loading} />
        <KPICard title="Energy (24h)" value={kpis ? (kpis.total_energy_kwh / 1000).toFixed(1) : '—'} unit="MWh"
          icon={Zap} color="yellow" trend={kpis?.trend_energy} loading={loading} />
        <KPICard title="Transport On-Time" value={kpis?.transport_on_time_pct ?? '—'} unit="%"
          icon={Bus} color="green" loading={loading} />
        <KPICard title="Active Alerts" value={kpis?.active_alerts ?? '—'} unit="alerts"
          icon={Bell} color="red" loading={loading} />
        <KPICard title="City Zones" value={kpis?.zones_count ?? '—'} unit="zones"
          icon={Map} color="blue" loading={loading} />
        <KPICard title="Data Points (24h)" value={kpis ? `${((kpis.zones_count || 10) * 24 * 4).toLocaleString()}` : '—'}
          icon={Activity} color="blue" loading={loading} />
        <KPICard title="Critical Alerts" value={recentAlerts.filter(a => a.severity === 'critical').length}
          icon={AlertTriangle} color="red" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* Overview chart */}
        <div className="xl:col-span-2 card">
          <h3 className="text-white font-semibold mb-4">24-Hour City Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={overviewData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={3} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} itemStyle={{ color: '#94a3b8' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="traffic" stroke="#f97316" dot={false} strokeWidth={2} name="Congestion" />
              <Line yAxisId="right" type="monotone" dataKey="pollution" stroke="#a855f7" dot={false} strokeWidth={2} name="AQI" />
              <Line yAxisId="left" type="monotone" dataKey="energy" stroke="#eab308" dot={false} strokeWidth={2} name="Energy (MWh)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent alerts */}
        <div className="card">
          <h3 className="text-white font-semibold mb-3">Recent Alerts</h3>
          <div className="space-y-2.5">
            {recentAlerts.length === 0 && !loading && (
              <p className="text-slate-500 text-sm text-center py-4">No active alerts</p>
            )}
            {recentAlerts.map(a => (
              <div key={a.id} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_BADGES[a.severity]}`}>
                    {a.severity}
                  </span>
                  <span className="text-slate-500 text-xs">{a.category}</span>
                </div>
                <p className="text-slate-200 text-sm font-medium">{a.title}</p>
                <p className="text-slate-500 text-xs mt-1 truncate">{a.zone_name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-white font-semibold mb-3">Zone Status Map</h3>
          {typeof window !== 'undefined' && (
            <MapContainer center={[40.72, -74.0]} zoom={11} style={{ height: '300px', borderRadius: '8px' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {zones.map(z => {
                const color = z.congestion > 7 ? '#ef4444' : z.congestion > 5 ? '#f97316' : '#22c55e'
                return (
                  <CircleMarker key={z.id} center={[z.latitude, z.longitude]}
                    radius={14} fillColor={color} color={color} fillOpacity={0.6} weight={2}>
                    <Popup>
                      <div className="text-sm">
                        <b>{z.name}</b><br />
                        Congestion: {z.congestion}/10<br />
                        AQI: {z.aqi}<br />
                        Energy: {z.energy_kwh?.toLocaleString()} kWh
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          )}
        </div>

        {/* Zone bar chart */}
        <div className="card">
          <h3 className="text-white font-semibold mb-3">Zone Congestion Levels</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={zones} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} />
              <Bar dataKey="congestion" fill="#f97316" radius={[0, 4, 4, 0]} name="Congestion" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  )
}
