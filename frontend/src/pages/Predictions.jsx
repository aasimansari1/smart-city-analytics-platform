import React, { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { Brain, Target, Award, TrendingUp, Zap, Wind, Car } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import KPICard from '../components/KPICard'
import { predictionsAPI, adminAPI } from '../api'

export default function Predictions() {
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState(1)
  const [hours, setHours] = useState(24)
  const [trafficPred, setTrafficPred] = useState(null)
  const [pollutionPred, setPollutionPred] = useState(null)
  const [energyPred, setEnergyPred] = useState(null)
  const [comparison, setComparison] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    adminAPI.zones().then(r => setZones(r.data)).catch(() => {})
  }, [])

  const runPredictions = useCallback(async () => {
    if (!selectedZone) return
    setLoading(true)
    try {
      const [tp, pp, ep, comp] = await Promise.all([
        predictionsAPI.traffic(selectedZone, hours),
        predictionsAPI.pollution(selectedZone, hours),
        predictionsAPI.energy(selectedZone, hours),
        predictionsAPI.compare(selectedZone),
      ])
      setTrafficPred(tp.data)
      setPollutionPred(pp.data)
      setEnergyPred(ep.data)
      setComparison(comp.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [selectedZone, hours])

  useEffect(() => { runPredictions() }, [runPredictions])

  const buildChartData = (pred) => {
    if (!pred) return []
    return pred.timestamps.map((ts, i) => ({
      time: new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      value: pred.predictions[i]
    }))
  }

  const CHART_COLORS = { traffic: '#f97316', pollution: '#a855f7', energy: '#eab308' }

  const PredictionChart = ({ pred, color, title }) => {
    const data = buildChartData(pred)
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            {pred && <p className="text-slate-400 text-xs mt-0.5">{pred.zone_name} — next {hours}h</p>}
          </div>
          {pred && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Model Confidence</p>
              <p className="text-lg font-bold" style={{ color }}>
                {pred.confidence}%
              </p>
            </div>
          )}
        </div>
        {pred ? (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#94a3b8' }} interval={Math.floor(data.length / 5)} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9', fontSize: '11px' }} />
                <Line type="monotone" dataKey="value" stroke={color} dot={false} strokeWidth={2}
                  name={`${pred.metric_name} (${pred.unit})`} />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[['R² Score', (pred.model_accuracy * 100).toFixed(1) + '%'],
                ['MAE', pred.mae.toFixed(3)],
                ['RMSE', pred.rmse.toFixed(3)]].map(([label, val]) => (
                <div key={label} className="bg-slate-900 rounded-lg p-2 text-center">
                  <p className="text-slate-500 text-xs">{label}</p>
                  <p className="text-white text-sm font-semibold">{val}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-44">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    )
  }

  return (
    <Layout title="AI Prediction Engine" onRefresh={runPredictions} loading={loading}>
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={selectedZone} onChange={e => setSelectedZone(Number(e.target.value))}
          className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={hours} onChange={e => setHours(Number(e.target.value))}
          className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
          <option value={12}>Next 12 hours</option>
          <option value={24}>Next 24 hours</option>
          <option value={48}>Next 48 hours</option>
          <option value={72}>Next 72 hours</option>
        </select>
        <button onClick={runPredictions} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-colors">
          <Brain size={15} />
          {loading ? 'Training models...' : 'Run Predictions'}
        </button>
      </div>

      {/* Model accuracy cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {comparison.map((m, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${i === 0 ? 'bg-orange-900/20' : i === 1 ? 'bg-purple-900/20' : 'bg-yellow-900/20'}`}>
                {i === 0 ? <Car size={18} className="text-orange-400" /> :
                 i === 1 ? <Wind size={18} className="text-purple-400" /> :
                 <Zap size={18} className="text-yellow-400" />}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{m.model}</p>
                <p className="text-slate-500 text-xs">{m.algorithm}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Confidence</p>
                <p className="text-lg font-bold" style={{
                  color: m.confidence > 80 ? '#22c55e' : m.confidence > 60 ? '#f59e0b' : '#ef4444'
                }}>{m.confidence}%</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <p className="text-slate-500 text-xs">R² Score</p>
                <p className="text-lg font-bold text-blue-400">{(m.r2_score * 100).toFixed(1)}%</p>
              </div>
            </div>
            {/* Confidence bar */}
            <div className="mt-3">
              <div className="bg-slate-700 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                  style={{ width: `${m.confidence}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prediction charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <PredictionChart pred={trafficPred} color="#f97316" title="Traffic Congestion Forecast" />
        <PredictionChart pred={pollutionPred} color="#a855f7" title="AQI Pollution Forecast" />
        <PredictionChart pred={energyPred} color="#eab308" title="Energy Demand Forecast" />
      </div>
    </Layout>
  )
}
