import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Mail, Phone, Zap, Plus, ChevronRight, CheckCircle2, Circle, ListTodo, Building2, Clock, Sparkles, FileText } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import api from '../services/api'
import { GmailIcon, WhatsAppIcon, SlackIcon, NotionIcon, GoogleDriveIcon } from '../components/IntegrationIcons'

interface Client {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  notes?: string
  health_score: number
  integrations?: any
  created_at: string
  updated_at: string
}

interface Meeting {
  id: string
  title: string
  transcript?: string
  summary?: string
  action_items?: any[]
  created_at: string
}

interface Task {
  id: string
  task: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'completed'
  source: string
  created_at: string
}

// ─── Health ring SVG ─────────────────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  const glow = score >= 75 ? 'rgba(34,197,94,0.3)' : score >= 50 ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'
  const label = score >= 75 ? 'Healthy' : score >= 50 ? 'At Risk' : 'Critical'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
          <circle
            cx="60" cy="60" r={radius}
            stroke={color} strokeWidth="8" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
              filter: `drop-shadow(0 0 8px ${glow})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{score}%</span>
        </div>
      </div>
      <span
        className="mt-3 text-sm font-semibold px-3 py-1 rounded-full border"
        style={{
          color,
          backgroundColor: `${color}15`,
          borderColor: `${color}30`,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default function ClientDetail() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return

    Promise.all([
      api.get(`/clients/${clientId}`),
      api.get(`/meetings?clientId=${clientId}`),
      api.get(`/clients/${clientId}/tasks`),
    ]).then(([clientRes, meetingsRes, tasksRes]) => {
      setClient(clientRes.data)
      setMeetings(meetingsRes.data)
      setTasks(tasksRes.data)
    }).catch(err => {
      console.error(err)
      navigate('/clients')
    }).finally(() => setLoading(false))
  }, [clientId, navigate])

  // ─── Listen for meeting created from popup window ─────────────────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'MEETING_CREATED' && event.data.meeting) {
        setMeetings(prev => [event.data.meeting, ...prev])
        // Refresh tasks too since meetings generate action items
        if (clientId) {
          api.get(`/clients/${clientId}/tasks`).then(r => setTasks(r.data)).catch(() => {})
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [clientId])

  // ─── Open meeting in popup window ─────────────────────────────────────────
  const openMeetingPopup = () => {
    if (!clientId || !client) return
    const w = 420, h = 620
    const left = Math.round(screen.width - w - 30)
    const top = Math.round(screen.height - h - 80)
    window.open(
      `/meeting-popup/${clientId}?name=${encodeURIComponent(client.name)}`,
      `meeting_${clientId}`,
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
    )
  }

  const toggleTask = async (taskId: string, current: string) => {
    const newStatus = current === 'completed' ? 'pending' : 'completed'
    try {
      await api.patch(`/clients/${clientId}/tasks/${taskId}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))
    } catch { /* silent */ }
  }

  // ─── Loading / Not Found states ─────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <div className="w-16 h-16 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center">
            <Building2 size={24} className="text-zinc-500" />
          </div>
          <p className="text-zinc-400 text-sm">Client not found</p>
          <button
            onClick={() => navigate('/clients')}
            className="text-violet-400 text-sm hover:text-violet-300 transition-colors"
          >
            ← Back to Clients
          </button>
        </div>
      </AppLayout>
    )
  }

  // ─── Priority helpers ───────────────────────────────────────────────────────
  const priorityStyle = (p: string) => {
    if (p === 'high') return { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' }
    if (p === 'medium') return { color: '#facc15', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.25)' }
    return { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' }
  }

  const integrationIconMap: Record<string, React.ReactNode> = {
    gmail: <GmailIcon size={15} />,
    whatsapp: <WhatsAppIcon size={15} />,
    slack: <SlackIcon size={15} />,
    notion: <NotionIcon size={15} />,
    docs: <GoogleDriveIcon size={15} />,
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const completedCount = tasks.filter(t => t.status === 'completed').length

  return (
    <AppLayout>
      <div className="px-6 lg:px-10 py-8 max-w-7xl mx-auto min-h-screen">

        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/clients')}
              className="w-11 h-11 flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-violet-500/30 transition-all group"
            >
              <ArrowLeft size={18} className="text-zinc-400 group-hover:text-violet-400 transition-colors" />
            </button>
            <div
              className="w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-2xl flex items-center justify-center shrink-0"
              style={{ boxShadow: '0 0 25px rgba(124,58,237,0.35)' }}
            >
              <span className="text-white text-xl font-bold">{client.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{client.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {client.company && (
                  <span className="flex items-center gap-1.5 text-zinc-400 text-sm">
                    <Building2 size={13} /> {client.company}
                  </span>
                )}
                <span className="text-zinc-600 text-xs">
                  Added {new Date(client.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={openMeetingPopup}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all hover:scale-[1.03] shrink-0"
            style={{ boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
          >
            <Plus size={16} /> Start Meeting
          </button>
        </div>

        {/* ─── Top Grid: Info + Health ────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">

          {/* Client Info Card */}
          <div className="lg:col-span-2 bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden">
            {/* Subtle glow decoration */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-600/[0.06] rounded-full blur-3xl pointer-events-none" />

            <h2 className="text-white font-semibold text-base mb-5 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full" />
              Client Information
            </h2>

            <div className="grid sm:grid-cols-2 gap-5">
              {client.email && (
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 hover:border-white/[0.1] transition-all">
                  <div className="w-9 h-9 bg-white/[0.04] border border-white/[0.08] rounded-lg flex items-center justify-center shrink-0">
                    <Mail size={15} className="text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold">Email</p>
                    <p className="text-sm text-white truncate">{client.email}</p>
                  </div>
                </div>
              )}

              {client.phone && (
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 hover:border-white/[0.1] transition-all">
                  <div className="w-9 h-9 bg-white/[0.04] border border-white/[0.08] rounded-lg flex items-center justify-center shrink-0">
                    <Phone size={15} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold">Phone</p>
                    <p className="text-sm text-white truncate">{client.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="mt-5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold mb-2">Notes</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{client.notes}</p>
              </div>
            )}

            {/* Connected Sources */}
            {client.integrations && Object.keys(client.integrations).length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold mb-3">Connected Sources</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(client.integrations).map(([key, value]: [string, any]) =>
                    value ? (
                      <div
                        key={key}
                        className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] hover:border-violet-500/30 rounded-full px-3.5 py-2 transition-all cursor-default group"
                      >
                        {integrationIconMap[key]}
                        <span className="text-xs font-medium text-zinc-300 capitalize group-hover:text-white transition-colors">{key}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Health Score Card */}
          <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-violet-600/[0.05] rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-6 self-start">
              <span className="w-1.5 h-5 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full" />
              <h2 className="text-white font-semibold text-base">Health Score</h2>
              <Zap size={14} className="text-yellow-500 ml-auto" />
            </div>

            <HealthRing score={client.health_score} />

            <div className="mt-6 w-full grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-zinc-500">Created</p>
                <p className="text-sm text-white font-medium mt-0.5">
                  {new Date(client.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-zinc-500">Updated</p>
                <p className="text-sm text-white font-medium mt-0.5">
                  {new Date(client.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── To-Do List ────────────────────────────────────────────────── */}
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-500 rounded-lg flex items-center justify-center"
                   style={{ boxShadow: '0 0 12px rgba(124,58,237,0.2)' }}>
                <ListTodo size={14} className="text-white" />
              </div>
              <h2 className="text-white font-semibold">To-Do List</h2>
              {tasks.length > 0 && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    {pendingCount} pending
                  </span>
                  {completedCount > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      {completedCount} done
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-14 h-14 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-4"
                   style={{ boxShadow: '0 0 20px rgba(124,58,237,0.1)' }}>
                <CheckCircle2 size={22} className="text-zinc-500" />
              </div>
              <p className="text-zinc-400 text-sm">No tasks yet. Start a meeting to auto-generate tasks.</p>
            </div>
          ) : (
            <div>
              {tasks.map((task, idx) => {
                const ps = priorityStyle(task.priority)
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id, task.status)}
                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-all duration-200 group hover:bg-white/[0.03] ${
                      idx !== tasks.length - 1 ? 'border-b border-white/[0.04]' : ''
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {task.status === 'completed'
                        ? <CheckCircle2 size={18} className="text-emerald-500" style={{ filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.3))' }} />
                        : <Circle size={18} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-all ${
                        task.status === 'completed' ? 'line-through text-zinc-500' : 'text-white'
                      }`}>
                        {task.task}
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">
                        <span className="capitalize">{task.source}</span> · {new Date(task.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 border capitalize"
                      style={{
                        color: ps.color,
                        backgroundColor: ps.bg,
                        borderColor: ps.border,
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── Meetings ──────────────────────────────────────────────────── */}
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center"
                   style={{ boxShadow: '0 0 12px rgba(56,189,248,0.2)' }}>
                <Calendar size={14} className="text-white" />
              </div>
              <h2 className="text-white font-semibold">Meetings</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
                {meetings.length}
              </span>
            </div>
            {meetings.length > 0 && (
              <button
                onClick={openMeetingPopup}
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
              >
                <Plus size={13} /> New
              </button>
            )}
          </div>

          {meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-5"
                   style={{ boxShadow: '0 0 25px rgba(56,189,248,0.1)' }}>
                <Calendar size={24} className="text-zinc-500" />
              </div>
              <p className="text-white font-semibold mb-1">No meetings yet</p>
              <p className="text-zinc-500 text-sm mb-5 max-w-sm">
                Start your first meeting to capture transcripts, generate summaries, and auto-create action items.
              </p>
              <button
                onClick={openMeetingPopup}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.03]"
                style={{ boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
              >
                <Sparkles size={14} /> Schedule First Meeting
              </button>
            </div>
          ) : (
            <div>
              {meetings.map((meeting, idx) => (
                <div
                  key={meeting.id}
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                  className={`px-6 py-5 cursor-pointer transition-all duration-200 group hover:bg-white/[0.03] ${
                    idx !== meetings.length - 1 ? 'border-b border-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold group-hover:text-violet-300 transition-colors">
                        {meeting.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                        <Clock size={11} />
                        {new Date(meeting.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600 group-hover:text-violet-400 transition-all group-hover:translate-x-1" />
                  </div>

                  {meeting.summary && (
                    <div className="mt-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FileText size={11} className="text-zinc-500" />
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Summary</p>
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">{meeting.summary}</p>
                    </div>
                  )}

                  {meeting.action_items && meeting.action_items.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Action Items</p>
                      <div className="space-y-1.5">
                        {(Array.isArray(meeting.action_items) ? meeting.action_items : JSON.parse(meeting.action_items as any) || []).slice(0, 3).map((item: any, i: number) => {
                          const ps = priorityStyle(item.priority || 'low')
                          return (
                            <div key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                              <span className="text-violet-400 mt-0.5">•</span>
                              <span className="flex-1">{item.task}</span>
                              {item.priority && (
                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize border shrink-0"
                                  style={{ color: ps.color, backgroundColor: ps.bg, borderColor: ps.border }}
                                >
                                  {item.priority}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
