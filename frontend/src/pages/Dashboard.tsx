import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import NewClientModal from '../components/NewClientModal'
import { Plus, Users, TrendingUp, ArrowRight, Clock, AlertTriangle, PieChart, ShieldAlert, ChevronRight, Zap } from 'lucide-react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

interface Client {
  id: string
  name: string
  company?: string
  email?: string
  health_score: number
  created_at: string
}

interface AnalyticsOverview {
  avgHealthScore: number
  totalClients: number
  activeThisMonth: number
  pendingTasks: number
  atRiskCount: number
  criticalCount: number
  riskAlerts: { client: string; alert: string }[]
}

// ─── Inline Mosaic Grid component for Dashboard cards ───────────────────────
function MiniMosaic({ active = false, variant = 'purple' }: { active?: boolean; variant?: 'purple' | 'dark' }) {
  const cols = 5
  const rows = 4
  const tiles = Array.from({ length: cols * rows })
  const purpleShades = ['#7c3aed', '#8b5cf6', '#a78bfa', '#3b0764', '#4c1d95', '#5b21b6']
  const darkShades = ['#1f1f23', '#27272a', '#3f3f46', '#52525b', '#18181b', '#09090b']
  const shades = variant === 'purple' ? purpleShades : darkShades

  return (
    <div
      className="grid gap-[2px] opacity-40 shrink-0"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        width: '60px',
        height: '42px',
      }}
    >
      {tiles.map((_, i) => (
        <div
          key={i}
          className="rounded-[1px]"
          style={{
            background: active ? shades[i % shades.length] : '#27272a',
          }}
        />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingOverview, setLoadingOverview] = useState(true)

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {}).finally(() => setLoading(false))
    api.get('/analytics/overview').then(r => setOverview(r.data)).catch(() => {}).finally(() => setLoadingOverview(false))
  }, [])

  const healthColor = (s: number) => s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-rose-400'
  const healthBg   = (s: number) => s >= 75 ? 'bg-emerald-500/10 border-emerald-500/20' : s >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'
  const healthLabel = (s: number) => s >= 75 ? 'Healthy' : s >= 50 ? 'At Risk' : 'Critical'

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.2em] mb-1.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Here's the current memory intelligence across your clients.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-violet-500/20"
          >
            <Plus size={15} />
            New Client
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Clients',   value: overview ? overview.totalClients : clients.length,                                                    icon: Users,         color: 'text-violet-400', active: true },
            { label: 'Avg Health Score',value: loadingOverview ? '—' : overview ? `${overview.avgHealthScore}%` : '—',                             icon: TrendingUp,    color: 'text-emerald-400', active: true },
            { label: 'Active This Month', value: loadingOverview ? '—' : overview?.activeThisMonth ?? '—',                                     icon: Clock,         color: 'text-indigo-400', active: false },
            { label: 'Pending Tasks',   value: loadingOverview ? '—' : overview?.pendingTasks ?? '—',                                         icon: ShieldAlert,   color: 'text-fuchsia-400', active: false },
            { label: 'At Risk',         value: loadingOverview ? '—' : overview?.atRiskCount ?? clients.filter(c => c.health_score < 75 && c.health_score >= 50).length, icon: AlertTriangle, color: 'text-amber-400', active: true },
            { label: 'Critical',        value: loadingOverview ? '—' : overview?.criticalCount ?? clients.filter(c => c.health_score < 50).length,                             icon: AlertTriangle, color: 'text-rose-400', active: true },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 rounded-2xl p-5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all group relative overflow-hidden flex flex-col justify-between">
              {/* Subtle background glow for active cards */}
              {s.active && (
                <div className="absolute -right-12 -top-12 w-24 h-24 bg-violet-600/10 rounded-full blur-xl group-hover:bg-violet-600/20 transition-all pointer-events-none" />
              )}
              <div className="flex items-start justify-between gap-2 mb-4">
                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.1em] leading-tight">{s.label}</p>
                <s.icon size={15} className={`${s.color} shrink-0`} />
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight leading-none mb-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Analytics Snapshot & Insights */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Risk distribution */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <p className="text-violet-400 text-[11px] font-bold uppercase tracking-[0.2em]">Overview Snapshot</p>
                <h2 className="text-white font-extrabold text-lg mt-0.5">Risk Distribution Graph</h2>
              </div>
              <div className="text-xs text-zinc-500 flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live memory status
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="flex-1 w-full flex justify-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* Outer circle with gradient border effect */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.05] flex items-center justify-center">
                    <div className="absolute inset-2 rounded-full border border-violet-500/20" />
                  </div>
                  {/* Inner glowing core */}
                  <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 blur-sm border border-violet-500/30" />
                  <div className="absolute inset-10 rounded-full bg-[#0d0118] border border-white/[0.08] flex items-center justify-center" />
                  
                  <div className="relative z-10 text-center">
                    <p className="text-3xl font-extrabold text-white tracking-tight">{overview ? `${overview.totalClients}` : clients.length}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Total Clients</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 w-full grid grid-cols-1 gap-4">
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-4 flex justify-between items-center hover:bg-white/[0.04] transition-all">
                  <div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Average Health</p>
                    <p className="text-3xl font-extrabold text-white">{loadingOverview ? '—' : `${overview?.avgHealthScore ?? 0}%`}</p>
                  </div>
                  <MiniMosaic active={true} variant="purple" />
                </div>
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-4 flex justify-between items-center hover:bg-white/[0.04] transition-all">
                  <div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Active this month</p>
                    <p className="text-3xl font-extrabold text-white">{loadingOverview ? '—' : overview?.activeThisMonth ?? 0}</p>
                  </div>
                  <MiniMosaic active={false} variant="dark" />
                </div>
              </div>
            </div>
          </div>

          {/* Severity breakdown */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Insights</p>
                  <h2 className="text-white font-extrabold text-lg mt-0.5">Severity breakdown</h2>
                </div>
                <PieChart size={16} className="text-zinc-500" />
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Healthy (Score >= 75)', count: clients.filter(c => c.health_score >= 75).length, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                  { label: 'At Risk (Score 50-74)', count: clients.filter(c => c.health_score < 75 && c.health_score >= 50).length, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                  { label: 'Critical (Score < 50)', count: clients.filter(c => c.health_score < 50).length, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-white/[0.05] bg-white/[0.01]">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color.split(' ')[0]}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{item.label.split(' (')[0]}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">{item.count} clients</p>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-white px-2 py-1 rounded bg-white/[0.04]">
                      {item.count > 0 ? `${Math.round((item.count / (clients.length || 1)) * 100)}%` : '0%'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition-all"
            >
              View full analytics
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Risk Alerts */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-violet-400 text-[11px] font-bold uppercase tracking-[0.2em]">Risk Alerts</p>
              <h2 className="text-white font-extrabold text-lg mt-0.5">Top notifications</h2>
            </div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-full flex items-center gap-1">
              <Zap size={11} className="text-violet-400" /> Cognee Graph Sync
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loadingOverview ? (
              <div className="col-span-full flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-white/[0.08] border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : !overview?.riskAlerts?.length ? (
              <div className="col-span-full bg-white/[0.01] border border-white/[0.04] rounded-2xl p-6 text-center">
                <p className="text-zinc-500 text-sm">No active alerts. Your client memory graph is stable.</p>
              </div>
            ) : (
              overview.riskAlerts.slice(0, 4).map((alert, index) => (
                <div key={index} className="rounded-2xl border border-white/[0.06] hover:border-violet-500/20 bg-white/[0.01] hover:bg-white/[0.03] p-4 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-violet-600" />
                  <p className="text-sm font-bold text-white leading-tight truncate">{alert.client}</p>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{alert.alert}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.25em]">Database Records</p>
              <h2 className="text-white font-extrabold text-sm mt-0.5">All Active Clients</h2>
            </div>
            <button
              onClick={() => navigate('/clients')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors font-semibold bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-1.5 rounded-xl border border-white/[0.05]"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-white/[0.08] border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-white/[0.02] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-4">
                <Users size={24} className="text-zinc-500" />
              </div>
              <p className="text-white font-bold text-lg mb-1">No clients registered</p>
              <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">Add your first client to configure integrations and trigger memory generation.</p>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all"
              >
                <Plus size={14} />
                Add First Client
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {clients.slice(0, 8).map(client => (
                <div
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="flex items-center justify-between px-6 py-4.5 hover:bg-white/[0.02] cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-600/30 to-indigo-600/30 group-hover:from-violet-600 group-hover:to-indigo-600 rounded-xl flex items-center justify-center shrink-0 transition-all border border-violet-500/10 group-hover:border-violet-500/20">
                      <span className="text-violet-300 group-hover:text-white text-sm font-bold transition-colors">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-bold truncate leading-tight">{client.name}</p>
                      <p className="text-zinc-500 text-xs truncate mt-1">{client.company || client.email || 'No company listed'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className={`flex items-center gap-1.5 border px-3 py-1 rounded-full text-[11px] font-bold ${healthBg(client.health_score)}`}>
                      <span className={healthColor(client.health_score)}>{healthLabel(client.health_score)}</span>
                      <span className={healthColor(client.health_score)}>{client.health_score}%</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-zinc-500 text-xs font-semibold">
                      <Clock size={11} />
                      {new Date(client.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                    <ArrowRight size={14} className="text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NewClientModal
          onClose={() => setShowModal(false)}
          onCreated={client => setClients(prev => [client, ...prev])}
        />
      )}
    </AppLayout>
  )
}
