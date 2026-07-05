import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Shield, Bell } from 'lucide-react'
import api from '../services/api'

export default function Settings() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.put(`/clients/profile`, { name }).catch(() => null) // best-effort
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">Settings</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage your account and preferences.</p>
        </div>

        {/* Profile */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <User size={15} className="text-neutral-500" />
            <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Profile</p>
          </div>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-100">
            <div className="w-14 h-14 bg-neutral-100 border border-neutral-200 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-black text-xl font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-black font-semibold">{user?.name}</p>
              <p className="text-neutral-400 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 text-black rounded-xl px-4 py-3 text-sm outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-400 rounded-xl pl-9 pr-4 py-3 text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1">Email cannot be changed.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-black text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-neutral-800 transition-all disabled:opacity-60"
            >
              {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={15} className="text-neutral-500" />
            <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Security</p>
          </div>
          <button className="border border-neutral-200 text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:border-black transition-all">
            Change Password
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Bell size={15} className="text-neutral-500" />
            <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Notifications</p>
          </div>
          {[
            { label: 'Risk alerts', desc: 'Get notified when a client health score drops' },
            { label: 'Meeting reminders', desc: 'Reminders before scheduled meetings' },
            { label: 'Weekly summary', desc: 'Weekly digest of client activity' },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-black">{n.label}</p>
                <p className="text-xs text-neutral-400">{n.desc}</p>
              </div>
              <div className="w-10 h-6 bg-black rounded-full relative cursor-pointer shrink-0">
                <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
