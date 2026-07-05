import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brain, ArrowRight, Eye, EyeOff, Zap, Mic, BarChart2, Shield } from 'lucide-react'


// ─── Grid background ───────────────────────────────────────────────────────────
function GridBg() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(rgba(124,58,237,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(124,58,237,0.07) 1px, transparent 1px)
      `,
      backgroundSize: '44px 44px',
    }} />
  )
}

// ─── Floating mosaic decorations ──────────────────────────────────────────────
function FloatingTiles({ top, right, left, bottom, size = 80, opacity = 0.3 }: any) {
  const cols = 5, rows = 4
  const tiles = Array.from({ length: cols * rows })
  const shades = ['#1f1f23', '#27272a', '#3f3f46', '#52525b', '#18181b', '#2d2d30']
  return (
    <div style={{
      position: 'absolute', top, right, left, bottom,
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '2px', width: `${size}px`, height: `${size * 0.7}px`, opacity,
    }}>
      {tiles.map((_, i) => (
        <div key={i} style={{ background: shades[i % shades.length], borderRadius: '2px' }} />
      ))}
    </div>
  )
}

export default function Auth() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return }
        await register(name, email, password)
      }
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message || (mode === 'login' ? 'Invalid email or password' : 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Mic, text: 'Live AI copilot during meetings' },
    { icon: Zap, text: 'Auto MoM & action items in 30s' },
    { icon: BarChart2, text: 'Client health scores & risk alerts' },
    { icon: Shield, text: 'PII protected with Microsoft Presidio' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#fff',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #18181b inset !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '50%', minWidth: '480px',
        background: '#0d0118',
        borderRight: '1px solid rgba(124,58,237,0.2)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: '40px 56px',
        gap: '0',
      }}
        className="left-panel"
      >
        <GridBg />

        {/* Corner mosaics */}
        <FloatingTiles top="80px" right="40px" opacity={0.4} size={100} />
        <FloatingTiles bottom="160px" right="20px" opacity={0.2} size={70} />
        <FloatingTiles top="260px" left="20px" opacity={0.15} size={60} />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '-100px',
          width: '400px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          textDecoration: 'none', position: 'relative', zIndex: 2,
          marginBottom: 'auto',
        }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124,58,237,0.5)',
          }}>
            <Brain size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#fff', letterSpacing: '-0.3px' }}>OmniMind</span>
        </Link>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '60px' }}>
          <p style={{
            color: '#7c3aed', fontSize: '11px', fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px',
          }}>AI MEMORY PLATFORM</p>

          <h2 style={{
            fontSize: '42px', fontWeight: 900,
            lineHeight: '1.1', letterSpacing: '-1.5px',
            marginBottom: '24px', color: '#fff',
          }}>
            Every meeting.<br />
            Every email.<br />
            <span style={{ color: '#a78bfa' }}>Never forgotten.</span>
          </h2>

          <p style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '14px',
            lineHeight: '1.7', marginBottom: '40px', maxWidth: '360px',
          }}>
            Capture context, turn it into graph memory, and let every agent recall it across sessions.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '48px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '30px', height: '30px', flexShrink: 0,
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.25)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={14} color="#a78bfa" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>{f.text}</span>
              </div>
            ))}
          </div>

         
        </div>

        {/* Stats at bottom */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', gap: '32px', paddingTop: '32px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { val: '10k+', label: 'Active Users' },
            { val: '<2s', label: 'Query Speed' },
            { val: '6+', label: 'Integrations' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ color: '#a78bfa', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>{s.val}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <GridBg />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '400px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          width: '100%', maxWidth: '400px',
          position: 'relative', zIndex: 2,
          animation: 'fadeInUp 0.5s ease',
        }}>
          {/* Mobile logo */}
          <Link to="/" style={{
            display: 'none', alignItems: 'center', gap: '10px',
            textDecoration: 'none', marginBottom: '40px',
          }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={15} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>OmniMind</span>
          </Link>

          {/* Mode Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '4px',
            marginBottom: '32px',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1, padding: '10px',
                  borderRadius: '9px', border: 'none',
                  fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif',
                  background: mode === m ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'transparent',
                  color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                  boxShadow: mode === m ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: '28px', fontWeight: 800,
            letterSpacing: '-0.8px', marginBottom: '6px', color: '#fff',
          }}>
            {mode === 'login' ? 'Welcome back' : 'Get started free'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginBottom: '28px' }}>
            {mode === 'login'
              ? 'Sign in to your OmniMind workspace'
              : 'Create your workspace — no credit card needed'}
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', fontSize: '13px',
              padding: '12px 16px', borderRadius: '10px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'register' && (
              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 500,
                  color: 'rgba(255,255,255,0.4)', marginBottom: '8px',
                  letterSpacing: '0.3px',
                }}>Full Name</label>
                <input
                  type="text"
                  placeholder="Rahul Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', borderRadius: '12px',
                    padding: '13px 16px', outline: 'none',
                    fontSize: '14px', fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            )}

            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 500,
                color: 'rgba(255,255,255,0.4)', marginBottom: '8px',
              }}>Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', borderRadius: '12px',
                  padding: '13px 16px', outline: 'none',
                  fontSize: '14px', fontFamily: 'Inter, sans-serif',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 500,
                color: 'rgba(255,255,255,0.4)', marginBottom: '8px',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', borderRadius: '12px',
                    padding: '13px 48px 13px 16px', outline: 'none',
                    fontSize: '14px', fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', padding: '0',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                <a href="#" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                border: 'none', color: '#fff',
                fontSize: '15px', fontWeight: 700,
                padding: '14px', borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 0 24px rgba(124,58,237,0.4)',
                transition: 'all 0.2s',
                marginTop: '4px',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget.style.boxShadow = '0 0 36px rgba(124,58,237,0.6)') }}
              onMouseLeave={e => { if (!loading) (e.currentTarget.style.boxShadow = '0 0 24px rgba(124,58,237,0.4)') }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Switch mode */}
          <p style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#a78bfa', fontWeight: 600, fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}
            >
              {mode === 'login' ? 'Create one free' : 'Sign in'}
            </button>
          </p>

        

        
        </div>
      </div>

      {/* Hide left panel on small screens */}
      <style>{`
        @media (max-width: 900px) {
          .left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
