import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import {
  BarChart2, TrendingUp, Users, AlertTriangle, Brain, RefreshCw,
  CheckCircle2, ShieldAlert, Calendar, Zap, MessageSquare, FileText,
  Mail, Hash, ArrowRight, Clock,
} from 'lucide-react'
import api from '../services/api'

interface Overview {
  avgHealthScore: number
  totalClients: number
  activeThisMonth: number
  pendingTasks: number
  atRiskCount: number
  criticalCount: number
  riskAlerts: { client: string; alert: string }[]
  clientScores: { id: string; name: string; score: number; sentiment: string; reasons: string[] }[]
}
interface Insights { topRisks: string[]; recommendations: string[] }
interface Sentiment { positive: number; neutral: number; negative: number }
interface TaskStats { pending: number; completed: number; total: number; completionRate: number }
interface MemorySource { source: string; count: number }
interface MeetingActivity { month: string; count: number }
interface TopClient { id: string; name: string; company?: string; health_score: number; last_sentiment: string; meeting_count: number }
interface UpcomingMeeting { id: string; client_name: string; scheduled_at: string; meeting_title: string }

const SOURCE_ICONS: Record<string, any> = {
  gmail: Mail, whatsapp: MessageSquare, slack: Hash,
  notion: FileText, meeting: Brain, document: FileText, ai_extracted: Zap,
}
const SOURCE_LABELS: Record<string, string> = {
  gmail: 'Gmail', whatsapp: 'WhatsApp', slack: 'Slack',
  notion: 'Notion', meeting: 'Meetings', document: 'Documents', ai_extracted: 'AI Extracted',
}

export default function Analytics() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [sentiment, setSentiment] = useState<Sentiment | null>(null)
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null)
  const [memorySources, setMemorySources] = useState<MemorySource[]>([])
  const [meetingActivity, setMeetingActivity] = useState<MeetingActivity[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([])
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/sentiment'),
      api.get('/analytics/tasks'),
      api.get('/analytics/memory-sources'),
      api.get('/analytics/meeting-activity'),
      api.get('/analytics/top-clients'),
      api.get('/analytics/upcoming-meetings'),
    ]).then(([ov, sent, tasks, mem, activity, top, upcoming]) => {
      setOverview(ov.data)
      setSentiment(sent.data)
      setTaskStats(tasks.data)
      setMemorySources(mem.data)
      setMeetingActivity(activity.data)
      setTopClients(top.data)
      setUpcomingMeetings(upcoming.data)
    }).finally(() => setLoadingOverview(false))
  }, [])

  const fetchInsights = () => {
    setLoadingInsights(true)
    api.get('/analytics/insights').then(r => setInsights(r.data)).finally(() => setLoadingInsights(false))
  }

  const healthColor = (s: number) => s >= 75 ? 'text-green-600' : s >= 50 ? 'text-yellow-600' : 'text-red-600'
  const healthBg    = (s: number) => s >= 75 ? 'bg-green-50 border-green-200' : s >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
  const healthBar   = (s: number) => s >= 75 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  const healthLabel = (s: number) => s >= 75 ? 'Healthy' : s >= 50 ? 'At Risk' : 'Critical'

  const Spinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
    </div>
  )

  const maxActivity = Math.max(...meetingActivity.map(m => m.count), 1)
  const maxMemory   = Math.max(...memorySources.map(s => s.count), 1)
  const sentimentTotal = sentiment ? (sentiment.positive + sentiment.neutral + sentiment.negative) || 1 : 1

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-black tracking-tight">Analytics</h1>
          <p className="text-neutral-400 text-sm mt-1">Predictive intelligence across all your clients.</p>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'Avg Health',     value: loadingOverview ? '—' : `${overview?.avgHealthScore ?? 0}%`, icon: TrendingUp,    color: 'text-green-600' },
            { label: 'Total Clients',  value: loadingOverview ? '—' : overview?.totalClients ?? 0,         icon: Users,         color: 'text-black' },
            { label: 'Active / Month', value: loadingOverview ? '—' : overview?.activeThisMonth ?? 0,      icon: BarChart2,     color: 'text-blue-600' },
            { label: 'Pending Tasks',  value: loadingOverview ? '—' : overview?.pendingTasks ?? 0,         icon: ShieldAlert,   color: 'text-violet-600' },
            { label: 'At Risk',        value: loadingOverview ? '—' : overview?.atRiskCount ?? 0,          icon: AlertTriangle, color: 'text-yellow-600' },
            { label: 'Critical',       value: loadingOverview ? '—' : overview?.criticalCount ?? 0,        icon: AlertTriangle, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-neutral-200 rounded-2xl p-5 hover:border-neutral-400 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-3">
                <p className="text-neutral-500 text-xs font-medium">{s.label}</p>
                <s.icon size={14} className={s.color} />
              </div>
              <p className="text-3xl font-bold text-black">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Row 1: Sentiment + Task Completion + Upcoming Meetings ── */}
        <div className="grid lg:grid-cols-3 gap-4">

          {/* Sentiment */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Client Sentiment</p>
              <h2 className="text-black font-semibold text-sm mt-0.5">Mood distribution</h2>
            </div>
            {loadingOverview ? <Spinner /> : (
              <div className="px-5 py-4 space-y-3">
                {[
                  { key: 'positive', label: 'Positive', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' },
                  { key: 'neutral',  label: 'Neutral',  color: 'bg-neutral-400', text: 'text-neutral-600', bg: 'bg-neutral-50' },
                  { key: 'negative', label: 'Negative', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
                ].map(s => {
                  const count = sentiment?.[s.key as keyof Sentiment] ?? 0
                  const pct = Math.round((count / sentimentTotal) * 100)
                  return (
                    <div key={s.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                        <span className="text-xs text-neutral-500">{count} clients · {pct}%</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Task Completion */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Task Completion</p>
              <h2 className="text-black font-semibold text-sm mt-0.5">Across all clients</h2>
            </div>
            {loadingOverview ? <Spinner /> : (
              <div className="px-5 py-5 flex flex-col items-center">
                {/* Ring */}
                <div className="relative w-28 h-28 mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                    <circle
                      cx="50" cy="50" r="40" fill="none" stroke="black" strokeWidth="12"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - (taskStats?.completionRate ?? 0) / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-black">{taskStats?.completionRate ?? 0}%</p>
                    <p className="text-[10px] text-neutral-400">done</p>
                  </div>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-xl font-bold text-black">{taskStats?.completed ?? 0}</p>
                    <p className="text-xs text-neutral-400">Completed</p>
                  </div>
                  <div className="w-px bg-neutral-100" />
                  <div>
                    <p className="text-xl font-bold text-black">{taskStats?.pending ?? 0}</p>
                    <p className="text-xs text-neutral-400">Pending</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Upcoming</p>
              <h2 className="text-black font-semibold text-sm mt-0.5">Next 7 days</h2>
            </div>
            {loadingOverview ? <Spinner /> : upcomingMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Calendar size={20} className="text-neutral-300 mb-2" />
                <p className="text-neutral-400 text-xs">No meetings scheduled</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {upcomingMeetings.slice(0, 4).map(m => (
                  <div key={m.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar size={13} className="text-neutral-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-black truncate">{m.client_name}</p>
                      <p className="text-[11px] text-neutral-400 truncate">{m.meeting_title}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(m.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Meeting Activity + Memory Sources ── */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Meeting Activity Bar Chart */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Meeting Activity</p>
              <h2 className="text-black font-semibold text-sm mt-0.5">Last 6 months</h2>
            </div>
            {loadingOverview ? <Spinner /> : meetingActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <BarChart2 size={20} className="text-neutral-300 mb-2" />
                <p className="text-neutral-400 text-xs">No meeting data yet</p>
              </div>
            ) : (
              <div className="px-5 py-5">
                <div className="flex items-end gap-2 h-32">
                  {meetingActivity.map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold text-black">{m.count}</span>
                      <div className="w-full rounded-t-lg bg-black transition-all" style={{ height: `${(m.count / maxActivity) * 96}px`, minHeight: m.count > 0 ? '6px' : '2px' }} />
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Memory Sources */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Memory Sources</p>
              <h2 className="text-black font-semibold text-sm mt-0.5">Where data comes from</h2>
            </div>
            {loadingOverview ? <Spinner /> : memorySources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Brain size={20} className="text-neutral-300 mb-2" />
                <p className="text-neutral-400 text-xs">No memory data yet</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {memorySources.map(s => {
                  const Icon = SOURCE_ICONS[s.source] || FileText
                  const pct = Math.round((s.count / maxMemory) * 100)
                  return (
                    <div key={s.source} className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-neutral-100 rounded-lg flex items-center justify-center shrink-0">
                        <Icon size={12} className="text-neutral-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-black">{SOURCE_LABELS[s.source] || s.source}</span>
                          <span className="text-xs text-neutral-400">{s.count}</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: Client Health Scores + Risk Alerts ── */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Client Health Scores */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Health Scores</p>
              <h2 className="text-black font-semibold text-sm mt-0.5">All clients ranked</h2>
            </div>
            {loadingOverview ? <Spinner /> : !overview?.clientScores?.length ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Users size={20} className="text-neutral-300 mb-2" />
                <p className="text-neutral-400 text-xs">No clients yet</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {overview.clientScores.map(c => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 cursor-pointer transition-all group"
                  >
                    <div className="w-8 h-8 bg-neutral-100 group-hover:bg-black rounded-lg flex items-center justify-center shrink-0 transition-all">
                      <span className="text-black group-hover:text-white text-xs font-bold transition-colors">{c.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-black text-xs font-semibold truncate">{c.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${healthBar(c.score)}`} style={{ width: `${c.score}%` }} />
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${healthColor(c.score)}`}>{c.score}%</span>
                      </div>
                    </div>
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-semibold shrink-0 ${healthBg(c.score)} ${healthColor(c.score)}`}>
                      {healthLabel(c.score)}
                    </span>
                    <ArrowRight size={12} className="text-neutral-300 group-hover:text-black transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risk Alerts */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Risk Alerts</p>
              <h2 className="text-black font-semibold text-sm mt-0.5">Clients needing attention</h2>
            </div>
            {loadingOverview ? <Spinner /> : !overview?.riskAlerts?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <CheckCircle2 size={20} className="text-green-500 mb-2" />
                <p className="text-black text-xs font-semibold">All clear</p>
                <p className="text-neutral-400 text-xs mt-0.5">No active risk alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {overview.riskAlerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-6 h-6 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle size={11} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-black text-xs font-semibold">{a.client}</p>
                      <p className="text-neutral-500 text-xs mt-0.5">{a.alert}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Top Clients by Meeting Count ── */}
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Most Active</p>
            <h2 className="text-black font-semibold text-sm mt-0.5">Top clients by meeting count</h2>
          </div>
          {loadingOverview ? <Spinner /> : topClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Users size={20} className="text-neutral-300 mb-2" />
              <p className="text-neutral-400 text-xs">No data yet</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {topClients.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 cursor-pointer transition-all group"
                >
                  <span className="text-xs font-bold text-neutral-300 w-4 shrink-0">#{i + 1}</span>
                  <div className="w-8 h-8 bg-neutral-100 group-hover:bg-black rounded-lg flex items-center justify-center shrink-0 transition-all">
                    <span className="text-black group-hover:text-white text-xs font-bold transition-colors">{c.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-black text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-neutral-400 text-xs truncate">{c.company || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-black">{c.meeting_count}</p>
                      <p className="text-[10px] text-neutral-400">meetings</p>
                    </div>
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-semibold ${healthBg(c.health_score)} ${healthColor(c.health_score)}`}>
                      {c.health_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── AI Strategic Insights ── */}
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">AI Intelligence</p>
              <h2 className="text-black font-semibold text-sm mt-0.5">Strategic insights</h2>
            </div>
            <button
              onClick={fetchInsights}
              disabled={loadingInsights}
              className="flex items-center gap-1.5 text-xs font-semibold border border-neutral-200 px-3 py-1.5 rounded-xl hover:border-black hover:text-black text-neutral-500 transition-all disabled:opacity-50"
            >
              <RefreshCw size={11} className={loadingInsights ? 'animate-spin' : ''} />
              {loadingInsights ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {!insights && !loadingInsights ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="w-11 h-11 bg-neutral-100 border border-neutral-200 rounded-2xl flex items-center justify-center mb-3">
                <Brain size={17} className="text-neutral-400" />
              </div>
              <p className="text-black font-semibold text-sm mb-1">No insights yet</p>
              <p className="text-neutral-400 text-xs max-w-xs">Click Generate to get AI-powered strategic recommendations based on your client data.</p>
            </div>
          ) : loadingInsights ? (
            <Spinner />
          ) : (
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-100">
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-3">Top Risks</p>
                <div className="space-y-2.5">
                  {insights?.topRisks?.map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle size={10} className="text-red-500" />
                      </div>
                      <p className="text-sm text-neutral-600 leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-3">Recommendations</p>
                <div className="space-y-2.5">
                  {insights?.recommendations?.map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 bg-green-50 border border-green-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={10} className="text-green-500" />
                      </div>
                      <p className="text-sm text-neutral-600 leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
