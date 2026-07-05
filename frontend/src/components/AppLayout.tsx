import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brain, LayoutDashboard, Users, BarChart2, Settings, LogOut, Menu, X, Sparkles } from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients',   label: 'Clients',   icon: Users },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/settings',  label: 'Settings',  icon: Settings },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  // ─── Floating mosaic decorations for sidebar ─────────────────────────────────
  const SidebarMosaics = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
      <div className="grid grid-cols-5 gap-1 w-32 h-24 absolute top-20 right-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white rounded" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 w-20 h-16 absolute bottom-32 left-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="bg-white rounded" />
        ))}
      </div>
    </div>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full relative z-10">
      <SidebarMosaics />

      {/* Header */}
      <Link to="/" className="flex items-center gap-2.5 px-6 py-6 border-b border-white/[0.06] no-underline">
        <div className="w-9 h-9 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(124,58,237,0.4)]">
          <Brain size={16} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight block">OmniMind</span>
          <div className="text-[10px] text-zinc-500 font-medium">Enterprise Memory OS</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.25)] border border-violet-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {/* AI Section */}
        <div className="pt-4 mt-4 border-t border-white/[0.06]">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-4 mb-2">AI Capabilities</p>
          <NavLink
            to="/agent"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.25)] border border-violet-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
              }`
            }
          >
            <Sparkles size={16} className="text-violet-400" />
            AI Chat Copilot
          </NavLink>
        </div>
      </nav>

      {/* User profile & Logout */}
      <div className="px-4 py-6 border-t border-white/[0.06] bg-black/20">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0 border border-white/10">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">{user?.name}</p>
            <p className="text-zinc-500 text-xs truncate mt-0.5">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all w-full border border-transparent text-left"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex relative">
      {/* Global dot grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{
        backgroundImage: `
          linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-[#0d0118]/80 backdrop-blur-xl border-r border-white/[0.06] fixed h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#0d0118]/90 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(124,58,237,0.3)]">
            <Brain size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">OmniMind</span>
        </div>
        <button onClick={() => setMobileOpen(v => !v)} className="text-zinc-400 hover:text-white transition-colors">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-35 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <aside className="w-64 h-full bg-[#0d0118]/95 border-r border-white/[0.06] flex flex-col pt-14" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Panel */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen relative z-10">
        {children}
      </main>
    </div>
  )
}
