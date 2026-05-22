import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, User, LogOut, RefreshCw, Sun, ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function Header({ title, onRefresh, loading }) {
  const { state, logout } = useApp()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const unreadAlerts = state.alerts.filter(a => !a.is_read).length

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {loading && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <RefreshCw size={12} className="animate-spin" />
            Loading...
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button onClick={onRefresh} disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        )}

        <button onClick={() => navigate('/alerts')}
          className="relative p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
          <Bell size={17} />
          {unreadAlerts > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {unreadAlerts > 9 ? '9+' : unreadAlerts}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={13} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm text-white font-medium leading-none">{state.user?.username || 'Guest'}</p>
              <p className="text-xs text-slate-400 capitalize">{state.user?.role || 'viewer'}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-700">
                <p className="text-sm text-white">{state.user?.email}</p>
                <p className="text-xs text-slate-400 capitalize mt-0.5">{state.user?.role} access</p>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors">
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
