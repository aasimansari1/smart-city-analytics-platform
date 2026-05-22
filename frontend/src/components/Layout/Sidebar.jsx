import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Car, Wind, Bus, Zap, Brain, Bell, Settings, ChevronLeft,
  ChevronRight, Activity, Map
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',      end: true },
  { to: '/traffic',    icon: Car,             label: 'Traffic'               },
  { to: '/pollution',  icon: Wind,            label: 'Pollution'             },
  { to: '/transport',  icon: Bus,             label: 'Transport'             },
  { to: '/energy',     icon: Zap,             label: 'Energy'                },
  { to: '/predictions',icon: Brain,           label: 'AI Predictions'        },
  { to: '/alerts',     icon: Bell,            label: 'Alerts'                },
  { to: '/admin',      icon: Settings,        label: 'Admin Panel'           },
]

export default function Sidebar() {
  const { state, dispatch } = useApp()
  const open = state.sidebarOpen

  return (
    <aside className={`flex flex-col bg-slate-900 border-r border-slate-700 transition-all duration-300 ${open ? 'w-56' : 'w-14'} shrink-0 h-screen sticky top-0 z-20`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Map size={16} className="text-white" />
        </div>
        {open && (
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-sm leading-none">SmartCity</p>
            <p className="text-slate-400 text-xs">Analytics Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="flex items-center justify-center h-10 border-t border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
      >
        {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </aside>
  )
}
