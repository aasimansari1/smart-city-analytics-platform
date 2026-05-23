import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authAPI } from '../api'

const AppContext = createContext(null)

const initialState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  sidebarOpen: true,
  alerts: [],
  zones: [],
  loading: false,
  notification: null,
  theme: localStorage.getItem('theme') || 'dark',
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload }
    case 'SET_TOKEN':
      return { ...state, token: action.payload }
    case 'LOGOUT':
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return { ...state, user: null, token: null }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload }
    case 'SET_ZONES':
      return { ...state, zones: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload }
    case 'TOGGLE_THEME': {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return { ...state, theme: next }
    }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('dark', state.theme === 'dark')
    html.classList.toggle('light', state.theme === 'light')
  }, [state.theme])

  const login = async (username, password) => {
    const res = await authAPI.login({ username, password })
    const { access_token, user } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(user))
    dispatch({ type: 'SET_TOKEN', payload: access_token })
    dispatch({ type: 'SET_USER', payload: user })
    return user
  }

  const logout = () => {
    dispatch({ type: 'LOGOUT' })
  }

  const notify = (message, type = 'info') => {
    dispatch({ type: 'SET_NOTIFICATION', payload: { message, type } })
    setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), 4000)
  }

  const toggleTheme = () => dispatch({ type: 'TOGGLE_THEME' })

  return (
    <AppContext.Provider value={{ state, dispatch, login, logout, notify, toggleTheme }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
