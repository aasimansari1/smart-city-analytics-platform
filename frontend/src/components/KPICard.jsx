import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function KPICard({ title, value, unit, icon: Icon, trend, trendLabel, color = 'blue', loading }) {
  const colors = {
    blue:   { bg: 'bg-blue-600/10',   text: 'text-blue-400',   border: 'border-blue-600/20',   icon: 'bg-blue-600/20' },
    green:  { bg: 'bg-green-600/10',  text: 'text-green-400',  border: 'border-green-600/20',  icon: 'bg-green-600/20' },
    yellow: { bg: 'bg-yellow-600/10', text: 'text-yellow-400', border: 'border-yellow-600/20', icon: 'bg-yellow-600/20' },
    red:    { bg: 'bg-red-600/10',    text: 'text-red-400',    border: 'border-red-600/20',    icon: 'bg-red-600/20' },
    purple: { bg: 'bg-purple-600/10', text: 'text-purple-400', border: 'border-purple-600/20', icon: 'bg-purple-600/20' },
    orange: { bg: 'bg-orange-600/10', text: 'text-orange-400', border: 'border-orange-600/20', icon: 'bg-orange-600/20' },
  }
  const c = colors[color] || colors.blue

  const trendIcon = trend > 0
    ? <TrendingUp size={13} />
    : trend < 0
    ? <TrendingDown size={13} />
    : <Minus size={13} />

  const trendColor = trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-slate-400'

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        {Icon && (
          <div className={`${c.icon} p-1.5 rounded-lg`}>
            <Icon size={16} className={c.text} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 bg-slate-700 rounded animate-pulse w-24" />
      ) : (
        <div className="flex items-end gap-1.5">
          <span className={`text-2xl font-bold ${c.text}`}>{value}</span>
          {unit && <span className="text-slate-400 text-sm mb-0.5">{unit}</span>}
        </div>
      )}

      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          {trendIcon}
          <span>{Math.abs(trend)}% {trendLabel || 'vs last 24h'}</span>
        </div>
      )}
    </div>
  )
}
