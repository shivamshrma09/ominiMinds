import { useState } from 'react'
import type { FormEvent } from 'react'
import { X, Loader2, ChevronRight, Sparkles, User, Database } from 'lucide-react'
import api from '../services/api'

interface Props {
  onClose: () => void
  onCreated: (client: any) => void
}

// ─── Custom Premium Brand SVG Icons ───────────────────────────────────────────
function GmailIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" fill="#EAEAEA" />
      <path d="M22 6c0-.17-.03-.33-.08-.49L12 13 2.08 5.51C2.03 5.67 2 5.83 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" fill="#EA4335" />
      <path d="M22 6V5c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v1l10 7.5L22 6z" fill="#FBBC05" />
      <path d="M2 6v2l10 7.5L22 8V6L12 13.5 2 6z" fill="#34A853" />
      <path d="M22 6v2l-10 7.5L2 8V6c0-.55.45-1 1-1h18c.55 0 1 .45 1 1z" fill="#4285F4" />
    </svg>
  )
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.01 2c-5.52 0-9.99 4.47-9.99 9.99 0 1.76.46 3.48 1.34 5l-1.42 5.19 5.31-1.39c1.47.8 3.12 1.22 4.76 1.22 5.52 0 9.99-4.47 9.99-9.99S17.53 2 12.01 2zm5.79 14.18c-.25.7-1.46 1.37-2.02 1.46-.49.08-1.12.15-3.26-.73-2.74-1.13-4.51-3.92-4.65-4.1-.14-.19-1.12-1.49-1.12-2.84s.7-2.02.95-2.29c.25-.28.56-.35.74-.35.19 0 .37.01.53.02.17.01.39-.06.61.47.23.55.77 1.88.84 2.02.07.14.12.3.02.49-.09.19-.14.3-.28.47-.14.16-.3.37-.43.5-.15.15-.3.32-.13.62.17.3.76 1.25 1.63 2.03.87.78 1.6 1.02 1.9 1.15.3.13.48.11.66-.1.18-.21.77-.9 1.04-1.28.27-.38.54-.32.91-.18.37.14 2.37 1.12 2.78 1.32.41.2.68.3.78.47.1.18.1.98-.15 1.68z" fill="#25D366" />
    </svg>
  )
}

function SlackIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zM6.302 15.165a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H8.822a2.528 2.528 0 0 1-2.52-2.52v-5.043z" fill="#e01e5a" />
      <path d="M8.822 5.043a2.528 2.528 0 0 1-2.52-2.52 2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522zM8.822 6.302a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H3.779a2.528 2.528 0 0 1-2.52-2.52V8.822a2.528 2.528 0 0 1 2.52-2.52h5.043z" fill="#36c5f0" />
      <path d="M18.958 8.822a2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zM17.698 8.822a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.779a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043z" fill="#2eb67d" />
      <path d="M15.178 18.958a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zM15.178 17.698a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.52h-5.043z" fill="#ecb22e" />
    </svg>
  )
}

function NotionIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M4.333 3h15.334C20.4 3 21 3.6 21 4.333v15.334c0 .733-.6 1.333-1.333 1.333H4.333A1.333 1.333 0 0 1 3 19.667V4.333C3 3.6 3.6 3 4.333 3zm2.5 13.903c0 .888.307 1.097.886 1.097.35 0 .762-.124 1.155-.382l4.898-3.486v2.771c0 .888.36 1.097.94 1.097.35 0 .76-.124 1.154-.382l3.415-2.428V7.271c0-.796-.492-1.026-1.127-1.026-.263 0-.616.079-.88.243L13.722 8.95V7.271c0-.796-.491-1.026-1.126-1.026-.264 0-.616.079-.88.243l-4.883 3.485v6.93zm9.362-5.46L13.722 9.77v2.858l2.473 1.76V12.443z" fill="#FFFFFF" />
    </svg>
  )
}

function GoogleDriveIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.38 2.5L2 15.5L4.62 20L12 9.25L9.38 2.5Z" fill="#0066DA" />
      <path d="M14.63 2.5L9.38 2.5L12 9.25L19.38 9.25L14.63 2.5Z" fill="#00AA47" />
      <path d="M22 15.5L19.38 20H4.62L7.25 15.5H22Z" fill="#FFBA00" />
    </svg>
  )
}

const integrationList = [
  { key: 'gmail',    label: 'Gmail Inbox Sync',     placeholder: 'you@gmail.com',               type: 'email', icon: GmailIcon },
  { key: 'whatsapp', label: 'WhatsApp Contact',     placeholder: '+91 98765 43210',              type: 'tel',   icon: WhatsAppIcon },
  { key: 'slack',    label: 'Slack Channel ID',     placeholder: '#channel-name',                type: 'text',  icon: SlackIcon },
  { key: 'notion',   label: 'Notion Page URL',      placeholder: 'https://notion.so/...',        type: 'url',   icon: NotionIcon },
  { key: 'docs',     label: 'Google Drive Folder',  placeholder: 'https://drive.google.com/...', type: 'url',   icon: GoogleDriveIcon },
]

export default function NewClientModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', company: '', client_email: '', client_whatsapp: '', notes: '',
    gmail: '', whatsapp: '', slack: '', notion: '', docs: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Client name is required'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/clients', {
        name: form.name, company: form.company,
        email: form.client_email, phone: form.client_whatsapp, notes: form.notes,
        integrations: { gmail: form.gmail, whatsapp: form.whatsapp, slack: form.slack, notion: form.notion, docs: form.docs },
      })
      onCreated(data); onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create client')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(15px)} to{opacity:1;transform:translateY(0)} }
        .modal-box {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Enlarged modal container (max-w-2xl for extra spacing and premium aesthetics) */}
      <div className="modal-box w-full max-w-2xl bg-[#0b0813] border border-white/[0.08] rounded-3xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden relative">
        
        {/* Glow blob behind the modal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center shadow-inner">
              {step === 0 ? (
                <User size={20} className="text-violet-400" />
              ) : (
                <Database size={20} className="text-indigo-400" />
              )}
            </div>
            <div>
              <h2 className="text-white font-black text-xl leading-tight tracking-tight">
                {step === 0 ? 'Register New Client' : 'Configure Knowledge Integrations'}
              </h2>
              <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.15em] mt-1">
                {step === 0 ? 'Step 1: Core Profile Identity' : 'Step 2: Source Connections'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-8 mt-6">
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(124,58,237,0.6)]"
              style={{ width: step === 0 ? '50%' : '100%' }}
            />
          </div>
          <div className="flex justify-between mt-2.5">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Step {step + 1} of 2</span>
            <span className="text-[10px] text-violet-400 font-extrabold tracking-widest">{step === 0 ? '50% COMPLETE' : '100% COMPLETE'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-8 py-8 space-y-6">

            {step === 0 && (
              <>
                {/* Client Name */}
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-2.5 block uppercase tracking-wider">Client / Entity Name *</label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g. Acme Corporation, John Doe"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/80 text-white rounded-xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-zinc-700 font-medium"
                    required
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-2.5 block uppercase tracking-wider">Company Division / Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Technology Solutions & SaaS Operations"
                    value={form.company}
                    onChange={e => set('company', e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/80 text-white rounded-xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-zinc-700 font-medium"
                  />
                </div>

                {/* Email + WhatsApp side by side */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 mb-2.5 block uppercase tracking-wider">Primary Email</label>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={form.client_email}
                      onChange={e => set('client_email', e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/80 text-white rounded-xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-zinc-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400 mb-2.5 block uppercase tracking-wider">WhatsApp Contact Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +919876543210"
                      value={form.client_whatsapp}
                      onChange={e => set('client_whatsapp', e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/80 text-white rounded-xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-zinc-700 font-medium"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-2.5 block uppercase tracking-wider">Strategic Context / Notes</label>
                  <textarea
                    placeholder="Brief description, business objectives, or context about this client relationship..."
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    rows={3}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/80 text-white rounded-xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-zinc-700 resize-none font-medium"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3.5 rounded-xl font-semibold">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { if (!form.name.trim()) { setError('Client name is required'); return } setError(''); setStep(1) }}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-2 shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-violet-500/20"
                >
                  Continue Setup <ChevronRight size={16} />
                </button>
              </>
            )}

            {step === 1 && (
              <>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex gap-3.5 items-start mb-2">
                  <Sparkles size={16} className="text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    OmniMind will index historical records from these connected services to build a memory graph. All integrations strictly use read-only APIs.
                  </p>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {integrationList.map(({ key, label, placeholder, type, icon: Icon }) => (
                    <div key={key} className="flex items-center gap-4 border border-white/[0.06] rounded-xl px-4 py-3.5 bg-white/[0.02] focus-within:border-violet-500/80 transition-all">
                      <span className="shrink-0 select-none flex items-center justify-center w-8 h-8 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                        <Icon size={18} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5 leading-tight">{label}</p>
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={(form as any)[key]}
                          onChange={e => set(key, e.target.value)}
                          className="w-full bg-transparent text-white text-sm outline-none placeholder:text-zinc-700 font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3.5 rounded-xl font-semibold">
                    {error}
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white font-bold py-4 rounded-xl text-sm transition-all active:scale-[0.98]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl text-sm transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-violet-500/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Generating Graph...
                      </>
                    ) : (
                      <>
                        Initialize Memory Graph ✓
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
