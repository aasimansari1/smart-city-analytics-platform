import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Dashboard from './pages/Dashboard'
import Traffic from './pages/Traffic'
import Pollution from './pages/Pollution'
import Transport from './pages/Transport'
import Energy from './pages/Energy'
import Predictions from './pages/Predictions'
import Alerts from './pages/Alerts'
import Admin from './pages/Admin'
import Login from './pages/Login'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/traffic" element={<Traffic />} />
          <Route path="/pollution" element={<Pollution />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/energy" element={<Energy />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
