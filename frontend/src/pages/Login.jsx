import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, Eye, EyeOff, Loader } from 'lucide-react'
import { useApp } from '../context/AppContext'

const DEMO_CREDS = [
  { username: 'admin',   password: 'admin123',   role: 'Admin' },
  { username: 'analyst', password: 'analyst123', role: 'Analyst' },
  { username: 'viewer',  password: 'viewer123',  role: 'Viewer' },
]

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useApp()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (cred) => {
    setForm({ username: cred.username, password: cred.password })
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-xl">
            <Map size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SmartCity</h1>
          <p className="text-slate-400 mt-1">Analytics Platform</p>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username"
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter password"
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-3 text-center">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_CREDS.map(c => (
                <button key={c.username} onClick={() => fillDemo(c)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl py-2 text-center transition-colors">
                  <p className="text-white text-xs font-medium">{c.role}</p>
                  <p className="text-slate-400 text-xs">{c.username}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
