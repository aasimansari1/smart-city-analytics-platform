import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User } from 'lucide-react'
import { chatbotAPI } from '../api'

const INITIAL_MSG = {
  role: 'bot',
  text: "Hello! I'm your Smart City AI assistant. Ask me about traffic, pollution, energy, transport, or city status.",
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([INITIAL_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', text: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await chatbotAPI.chat(input.trim())
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I could not fetch city data right now.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Fab */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-xl z-50 transition-all pulse-glow"
      >
        {open ? <X size={20} className="text-white" /> : <MessageSquare size={20} className="text-white" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 w-80 h-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden slide-in">
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-600/10 border-b border-slate-700">
            <Bot size={18} className="text-blue-400" />
            <div>
              <p className="text-white text-sm font-semibold">City AI Assistant</p>
              <p className="text-slate-400 text-xs">Powered by smart city data</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0
                  ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                  {m.role === 'user' ? <User size={12} className="text-white" /> : <Bot size={12} className="text-slate-300" />}
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line
                  ${m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                  <Bot size={12} className="text-slate-300" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex gap-2 px-3 py-2 border-t border-slate-700">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about the city..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
            <button onClick={send} disabled={!input.trim() || loading}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors">
              <Send size={13} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
