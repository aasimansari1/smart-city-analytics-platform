import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Chatbot from '../Chatbot'
import { useApp } from '../../context/AppContext'
import { alertsAPI } from '../../api'

export default function Layout({ children, title, onRefresh, loading }) {
  const { state, dispatch, notify } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    if (!state.token) {
      navigate('/login')
      return
    }
    alertsAPI.list({ resolved: false }).then(res => {
      dispatch({ type: 'SET_ALERTS', payload: res.data })
    }).catch(() => {})
  }, [state.token])

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} onRefresh={onRefresh} loading={loading} />

        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>

      <Chatbot />

      {/* Notification toast */}
      {state.notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium slide-in
          ${state.notification.type === 'error' ? 'bg-red-900 text-red-200 border border-red-700'
            : state.notification.type === 'success' ? 'bg-green-900 text-green-200 border border-green-700'
            : 'bg-blue-900 text-blue-200 border border-blue-700'}`}>
          {state.notification.message}
        </div>
      )}
    </div>
  )
}
