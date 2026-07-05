import { useState, useRef, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../services/api'
import { Send, Bot, User, Loader2, Sparkles, ChevronDown, Brain, Zap, BarChart2, Users } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Client {
  id: string
  name: string
  company?: string
  health_score?: number
}

const SUGGESTIONS = [
  { icon: BarChart2, text: 'Which clients are at risk right now?' },
  { icon: Zap,       text: 'What are my pending tasks this week?' },
  { icon: Brain,     text: 'Summarize my last meeting' },
  { icon: Users,     text: 'Which client has the lowest health score?' },
]

export default function Agent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setShowClientPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const { data } = await api.post('/agent/chat', {
        message: content,
        clientId: selectedClient?.id || null,
        history,
      })
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Check for headings
      if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
        const clean = line.replace(/^#+\s+/, '');
        return <h4 key={i} className="text-violet-400 font-bold text-sm mt-3 mb-1">{clean}</h4>;
      }
      
      // Check for lists
      let content = line;
      let isBullet = false;
      let isNumbered = false;
      let bulletNum = '';

      if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
        isBullet = true;
        content = line.slice(2);
      } else if (/^\d+\.\s/.test(line)) {
        isNumbered = true;
        const match = line.match(/^(\d+)\.\s/);
        bulletNum = match ? match[1] : '';
        content = line.replace(/^\d+\.\s/, '');
      }

      // Helper to replace inline formatting like **bold** and `code`
      const renderInline = (str: string) => {
        const parts = [];
        let current = str;
        let key = 0;
        
        while (current.length > 0) {
          const boldMatch = current.match(/\*\*(.*?)\*\*/);
          const codeMatch = current.match(/`(.*?)`/);
          
          // Find which one appears first
          const boldIdx = boldMatch ? current.indexOf(boldMatch[0]) : -1;
          const codeIdx = codeMatch ? current.indexOf(codeMatch[0]) : -1;
          
          if (boldIdx === -1 && codeIdx === -1) {
            parts.push(current);
            break;
          }
          
          let minIdx = -1;
          let matchLength = 0;
          let isBold = false;
          let matchedText = '';
          
          if (boldIdx !== -1 && (codeIdx === -1 || boldIdx < codeIdx)) {
            minIdx = boldIdx;
            matchLength = boldMatch![0].length;
            matchedText = boldMatch![1];
            isBold = true;
          } else {
            minIdx = codeIdx;
            matchLength = codeMatch![0].length;
            matchedText = codeMatch![1];
            isBold = false;
          }
          
          // Add text before match
          if (minIdx > 0) {
            parts.push(current.substring(0, minIdx));
          }
          
          // Add matched component
          if (isBold) {
            parts.push(<strong key={key++} className="font-extrabold text-white">{matchedText}</strong>);
          } else {
            parts.push(<code key={key++} className="bg-white/10 px-1.5 py-0.5 rounded text-[12px] font-mono text-indigo-300">{matchedText}</code>);
          }
          
          current = current.substring(minIdx + matchLength);
        }
        return parts;
      };

      if (isBullet) {
        return (
          <div key={i} className="flex items-start gap-2 my-1 pl-2">
            <span className="text-violet-400 mt-1.5 shrink-0 text-[6px]">●</span>
            <span className="text-zinc-300">{renderInline(content)}</span>
          </div>
        );
      }

      if (isNumbered) {
        return (
          <div key={i} className="flex items-start gap-2 my-1 pl-2">
            <span className="text-violet-400 font-semibold text-xs mt-0.5">{bulletNum}.</span>
            <span className="text-zinc-300">{renderInline(content)}</span>
          </div>
        );
      }

      if (line === '') return <div key={i} className="h-2" />;
      return <p key={i} className="my-1.5 leading-relaxed text-zinc-300">{renderInline(line)}</p>;
    });
  }

  const isEmpty = messages.length === 0

  return (
    <AppLayout>
      <div className="flex flex-col h-screen bg-[#09090b] relative overflow-hidden select-none">
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }} />

        {/* Ambient glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d0118]/80 backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.35)]">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">OmniMind Agent</p>
              <p className="text-[11px] text-zinc-500">Gemini · Cognee memory</p>
            </div>
          </div>

          {/* Client picker */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowClientPicker(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold border border-white/[0.08] hover:border-violet-500/30 rounded-xl px-3.5 py-2 transition-all bg-white/[0.02] text-zinc-400 hover:text-white"
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedClient ? 'bg-violet-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="max-w-[110px] truncate">{selectedClient ? selectedClient.name : 'All clients'}</span>
              <ChevronDown size={12} className="text-zinc-500 shrink-0" />
            </button>

            {showClientPicker && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#0d0c10]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                <button
                  onClick={() => { setSelectedClient(null); setShowClientPicker(false) }}
                  className={`w-full text-left px-4 py-3.5 text-xs font-semibold transition-all hover:bg-white/[0.04] ${!selectedClient ? 'text-violet-400 bg-white/[0.02]' : 'text-zinc-400'}`}
                >
                  All clients
                </button>
                <div className="border-t border-white/[0.06]" />
                <div className="max-h-52 overflow-y-auto">
                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClient(c); setShowClientPicker(false) }}
                      className={`w-full text-left px-4 py-3.5 text-xs transition-all hover:bg-white/[0.04] ${selectedClient?.id === c.id ? 'font-bold text-violet-400 bg-white/[0.02]' : 'text-zinc-300'}`}
                    >
                      <p className="font-semibold truncate">{c.name}</p>
                      {c.company && <p className="text-[10px] text-zinc-500 truncate mt-0.5">{c.company}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto relative z-10">
          {isEmpty ? (

            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-14 h-14 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20 animate-pulse">
                <Sparkles size={24} className="text-white" />
              </div>

              <p className="text-[10px] font-extrabold tracking-[0.2em] text-violet-400 uppercase mb-3">OmniMind Agent</p>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">How can I help you today?</h2>
              <p className="text-zinc-400 text-sm mb-10 max-w-sm leading-relaxed">
                Ask anything about your clients, meetings, tasks, or business relationships. I have access to your full memory graph.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-xl">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-3.5 text-left text-xs text-zinc-300 bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 hover:bg-white/[0.04] hover:text-white px-4.5 py-4 rounded-2xl transition-all group shadow-sm hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)]"
                  >
                    <div className="w-8 h-8 bg-white/[0.04] group-hover:bg-gradient-to-br group-hover:from-violet-600 group-hover:to-indigo-500 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-inner">
                      <s.icon size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="leading-snug font-semibold">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>

          ) : (

            /* Chat messages */
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(124,58,237,0.3)]">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}

                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-4.5 py-3.5 rounded-2xl text-[13.5px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none shadow-[0_4px_15px_rgba(124,58,237,0.2)] border border-violet-500/20'
                        : 'bg-white/[0.02] border border-white/[0.06] text-zinc-300 rounded-tl-none shadow-sm'
                    }`}>
                      {msg.role === 'assistant'
                        ? <div className="space-y-1">{formatContent(msg.content)}</div>
                        : <span>{msg.content}</span>
                      }
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1.5 px-1 font-medium">
                      {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <User size={13} className="text-zinc-400" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(124,58,237,0.3)]">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      {[0, 150, 300].map(delay => (
                        <div
                          key={delay}
                          className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input ── */}
        <div className="shrink-0 bg-white/[0.01] border-t border-white/[0.06] px-4 py-4 relative z-10">
          <div className="max-w-3xl mx-auto">

            {/* Active client badge */}
            {selectedClient && (
              <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-violet-500/10 border border-violet-500/20 text-violet-300 px-3 py-1.5 rounded-full">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                  {selectedClient.name}
                </span>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider"
                >
                  ✕ clear
                </button>
              </div>
            )}

            {/* Textarea + send */}
            <div className="flex items-end gap-3 bg-white/[0.03] border border-white/[0.08] focus-within:border-violet-500/50 rounded-2xl px-4 py-3.5 transition-all shadow-sm">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your clients, meetings, tasks..."
                rows={1}
                className="flex-1 resize-none text-[13.5px] text-white placeholder:text-zinc-600 outline-none bg-transparent max-h-32 leading-relaxed"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all shrink-0 shadow-[0_0_12px_rgba(124,58,237,0.3)]"
              >
                {loading
                  ? <Loader2 size={13} className="text-white animate-spin" />
                  : <Send size={13} className="text-white" />
                }
              </button>
            </div>

            <p className="text-[10px] text-zinc-500 text-center mt-2.5 font-medium">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
