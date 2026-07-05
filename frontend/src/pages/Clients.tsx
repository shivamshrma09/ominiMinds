import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import NewClientModal from '../components/NewClientModal'
import { Plus, Users, Search, ArrowRight, Clock, TrendingUp, AlertTriangle, Shield, Sparkles } from 'lucide-react'
import api from '../services/api'

interface Client {
  id: string; name: string; company?: string
  email?: string; health_score: number; created_at: string
}

function MiniMosaic({ variant = 'purple' }: { variant?: 'purple' | 'dark' }) {
  const cols = 5, rows = 4
  const tiles = Array.from({ length: cols * rows })
  const purpleShades = ['#7c3aed', '#8b5cf6', '#a78bfa', '#3b0764', '#4c1d95', '#5b21b6']
  const darkShades = ['#1f1f23', '#27272a', '#3f3f46', '#52525b', '#18181b', '#09090b']
  const shades = variant === 'purple' ? purpleShades : darkShades
  return (
    <div
      className="grid gap-[2px] opacity-30 shrink-0"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: '55px', height: '38px' }}
    >
      {tiles.map((_, i) => (
        <div key={i} className="rounded-[1px]" style={{ background: shades[i % shades.length] }} />
      ))}
    </div>
  )
}

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [filtered, setFiltered] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/clients').then(r => { setClients(r.data); setFiltered(r.data) }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    ))
  }, [search, clients])

  const healthColor = (s: number) => s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-rose-400'
  const healthBg    = (s: number) => s >= 75 ? 'bg-emerald-500/10 border-emerald-500/20' : s >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'
  const healthLabel = (s: number) => s >= 75 ? 'Healthy' : s >= 50 ? 'At Risk' : 'Critical'
  const healthIcon  = (s: number) => s >= 75 ? TrendingUp : s >= 50 ? AlertTriangle : Shield

  const stats = [
    { label: 'Total Clients', value: clients.length,                                                              icon: Users,         gradient: 'from-violet-600 to-indigo-600',  glow: 'rgba(124,58,237,0.25)' },
    { label: 'Healthy',       value: clients.filter(c => c.health_score >= 75).length,                           icon: TrendingUp,    gradient: 'from-emerald-600 to-green-500',  glow: 'rgba(34,197,94,0.25)' },
    { label: 'At Risk',       value: clients.filter(c => c.health_score < 75 && c.health_score >= 50).length,    icon: AlertTriangle, gradient: 'from-amber-500 to-yellow-400',   glow: 'rgba(234,179,8,0.25)' },
    { label: 'Critical',      value: clients.filter(c => c.health_score < 50).length,                            icon: Shield,        gradient: 'from-red-600 to-rose-500',       glow: 'rgba(239,68,68,0.25)' },
  ]

  return (
    <AppLayout>
      <div className="px-6 lg:px-10 py-8 max-w-7xl mx-auto min-h-screen">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-2xl flex items-center justify-center shrink-0"
              style={{ boxShadow: '0 0 25px rgba(124,58,237,0.35)' }}
            >
              <Users size={20} className="text-white" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.2em] mb-0.5">Client Management</p>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Clients</h1>
              <p className="text-zinc-500 text-sm mt-0.5">{clients.length} total · Manage your client relationships</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 border border-violet-500/20"
            style={{ boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
          >
            <Plus size={16} /> New Client
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div
              key={s.label}
              className="relative overflow-hidden bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.05] hover:border-violet-500/30 group"
              style={{ boxShadow: `0 0 30px ${s.glow}` }}
            >
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <MiniMosaic variant="purple" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center`}
                  style={{ boxShadow: `0 0 15px ${s.glow}` }}
                >
                  <s.icon size={16} className="text-white" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search clients by name, company or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/50 focus:bg-white/[0.05]"
            style={{ boxShadow: search ? '0 0 20px rgba(124,58,237,0.12)' : 'none' }}
          />
          {search && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-medium">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Client Table ── */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden backdrop-blur-sm">

          {/* Table header */}
          <div className="flex items-center px-6 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] flex-1">Client</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] w-36 text-center hidden sm:block">Health</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] w-28 text-right hidden sm:block">Added</span>
            <span className="w-8" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div
                className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-5"
                style={{ boxShadow: '0 0 30px rgba(124,58,237,0.15)' }}
              >
                <Users size={24} className="text-zinc-500" />
              </div>
              <p className="text-white font-bold text-lg mb-1">
                {search ? 'No results found' : 'No clients yet'}
              </p>
              <p className="text-zinc-500 text-sm mb-6 max-w-sm leading-relaxed">
                {search
                  ? 'Try a different search term or adjust your filters.'
                  : 'Add your first client to start building your memory graph.'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all hover:scale-[1.03]"
                  style={{ boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                >
                  <Sparkles size={15} /> Add First Client
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filtered.map(client => {
                const HIcon = healthIcon(client.health_score)
                return (
                  <div
                    key={client.id}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="flex items-center px-6 py-4 cursor-pointer transition-all duration-200 group hover:bg-white/[0.03]"
                  >
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-gradient-to-br from-violet-600/30 to-indigo-600/30 group-hover:from-violet-600 group-hover:to-indigo-600 border border-violet-500/10 group-hover:border-violet-500/30 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300">
                        <span className="text-violet-300 group-hover:text-white text-sm font-bold transition-colors">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate group-hover:text-violet-300 transition-colors">
                          {client.name}
                        </p>
                        <p className="text-zinc-500 text-xs truncate mt-0.5">
                          {client.company || client.email || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Health Badge */}
                    <div className="w-36 hidden sm:flex justify-center">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${healthBg(client.health_score)}`}>
                        <HIcon size={11} className={healthColor(client.health_score)} />
                        <span className={healthColor(client.health_score)}>
                          {healthLabel(client.health_score)} · {client.health_score}%
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="w-28 hidden sm:flex items-center justify-end gap-1.5 text-zinc-500 text-xs font-medium">
                      <Clock size={11} />
                      {new Date(client.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </div>

                    {/* Arrow */}
                    <div className="w-8 flex justify-end">
                      <ArrowRight size={14} className="text-zinc-600 group-hover:text-violet-400 transition-all duration-200 group-hover:translate-x-1" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-center text-zinc-600 text-xs mt-4 font-medium">
            Click on a client to view their memory graph, meetings & communications
          </p>
        )}
      </div>

      {showModal && (
        <NewClientModal onClose={() => setShowModal(false)} onCreated={c => setClients(prev => [c, ...prev])} />
      )}
    </AppLayout>
  )
}
