import React, { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts'
import { Wind, Thermometer, Droplets, AlertTriangle, Activity } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import KPICard from '../components/KPICard'
import { pollutionAPI, adminAPI } from '../api'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

const AQI_COLOR = (aqi) => {
  if (aqi <= 50) return '#22c55e'
  if (aqi <= 100) return '#eab308'
  if (aqi <= 150) return '#f97316'
  if (aqi <= 200) return '#ef4444'
  if (aqi <= 300) return '#a855f7'
  return '#7c2d12'
}

export default function Pollution() {
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState('')
  const [days, setDays] = useState(7)
  const [trends, setTrends] = useState(null)
  const [mapData, setMapData] = useState([])
  const [comparison, setComparison] = useState([])
  const [live, setLive] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [z, t, m, c, l] = await Promise.all([
        adminAPI.zones(),
        pollutionAPI.trends({ zone_id: selectedZone || undefined, days }),
        pollutionAPI.map(),
        pollutionAPI.zonesComparison(),
        pollutionAPI.live(),
      ])
      setZones(z.data)
      setTrends(t.data)
      setMapData(m.data)
      setComparison(c.data)
      setLive(l.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [selectedZone, days])

  useEffect(() => { loadAll() }, [loadAll])

  const trendsData = trends
    ? trends.labels.map((l, i) => ({
        time: l, aqi: trends.aqi[i], pm25: trends.pm25[i], co2: trends.co2[i], temp: trends.temperature[i]
      }))
    : []

  const avgAqi = live.length ? (live.reduce((s, z) => s + z.aqi, 0) / live.length).toFixed(1) : '—'
  const maxAqi = live.length ? Math.max(...live.map(z => z.aqi)).toFixed(1) : '—'
  const avgTemp = live.length ? (live.reduce((s, z) => s + z.temperature, 0) / live.length).toFixed(1) : '—'
  const dangerZones = live.filter(z => z.aqi > 150).length

  return (
    <Layout title="Pollution Monitoring" onRefresh={loadAll} loading={loading}>
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
        <KPICard title="Avg AQI" value={avgAqi} unit="AQI" icon={Wind} color="purple" loading={loading} />
        <KPICard title="Peak AQI" value={maxAqi} unit="AQI" icon={AlertTriangle} color="red" loading={loading} />
        <KPICard title="Avg Temperature" value={avgTemp} unit="°C" icon={Thermometer} color="orange" loading={loading} />
        <KPICard title="Danger Zones" value={dangerZones} icon={AlertTriangle} color="red" loading={loading} />
      </div>

      {/* Live AQI grid */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Live AQI by Zone</h3>
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {live.map(z => (
            <div key={z.zone_id} className="bg-slate-900 rounded-xl p-3 border border-slate-700">
              <p className="text-slate-400 text-xs truncate mb-1">{z.zone_name}</p>
              <p className="text-xl font-bold" style={{ color: AQI_COLOR(z.aqi) }}>{z.aqi}</p>
              <p className="text-xs" style={{ color: AQI_COLOR(z.aqi) }}>{z.category}</p>
              <div className="mt-1.5 space-y-0.5">
                <p className="text-slate-500 text-xs">PM2.5: {z.pm25} µg/m³</p>
                <p className="text-slate-500 text-xs">CO₂: {z.co2} ppm</p>
                <p className="text-slate-500 text-xs">{z.temperature}°C</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        {/* Trends chart */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">AQI & PM2.5 Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={Math.floor(trendsData.length / 6)} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="aqi" stroke="#a855f7" dot={false} strokeWidth={2} name="AQI" />
              <Line yAxisId="right" type="monotone" dataKey="pm25" stroke="#f97316" dot={false} strokeWidth={2} name="PM2.5 µg/m³" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Map */}
        <div className="card">
          <h3 className="text-white font-semibold mb-3">Pollution Distribution Map</h3>
          <MapContainer center={[40.72, -74.0]} zoom={11} style={{ height: '240px', borderRadius: '8px' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors' />
            {mapData.map(z => (
              <CircleMarker key={z.zone_id} center={[z.latitude, z.longitude]}
                radius={16} fillColor={AQI_COLOR(z.aqi)} color={AQI_COLOR(z.aqi)} fillOpacity={0.65} weight={2}>
                <Popup>
                  <b>{z.zone_name}</b><br />
                  AQI: {z.aqi} ({z.category})<br />
                  PM2.5: {z.pm25} µg/m³<br />
                  Temp: {z.temperature}°C
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
          {/* AQI legend */}
          <div className="flex flex-wrap gap-2 mt-2">
            {[['Good',    '#22c55e'], ['Moderate','#eab308'], ['Sensitive','#f97316'],
              ['Unhealthy','#ef4444'], ['Very Unhealthy','#a855f7'], ['Hazardous','#7c2d12']].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Zones comparison */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">Zone Pollution Comparison (24h)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 pb-2 font-medium">Zone</th>
                <th className="text-left text-slate-400 pb-2 font-medium">Type</th>
                <th className="text-right text-slate-400 pb-2 font-medium">Avg AQI</th>
                <th className="text-right text-slate-400 pb-2 font-medium">Max AQI</th>
                <th className="text-right text-slate-400 pb-2 font-medium">PM2.5 µg/m³</th>
                <th className="text-center text-slate-400 pb-2 font-medium">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {comparison.map((z, i) => (
                <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 text-white font-medium">{z.zone}</td>
                  <td className="py-2.5 text-slate-400 capitalize">{z.zone_type}</td>
                  <td className="py-2.5 text-right font-semibold" style={{ color: AQI_COLOR(z.avg_aqi) }}>{z.avg_aqi}</td>
                  <td className="py-2.5 text-right text-slate-300">{z.max_aqi}</td>
                  <td className="py-2.5 text-right text-slate-300">{z.avg_pm25}</td>
                  <td className="py-2.5 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ color: AQI_COLOR(z.avg_aqi), borderColor: AQI_COLOR(z.avg_aqi) + '44', backgroundColor: AQI_COLOR(z.avg_aqi) + '22' }}>
                      {z.category}
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
