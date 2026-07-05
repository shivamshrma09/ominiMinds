import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight, Brain, Zap, BarChart2, Mic, Shield, MessageSquare, CheckCircle2, Star, ChevronRight } from 'lucide-react'

// GitHub SVG icon (lucide-react doesn't export 'Github' in this version)
function GithubIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}


// ─── Animated background grid ─────────────────────────────────────────────────
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />
      {/* Corner mosaic decorations */}
      <div style={{ position: 'absolute', top: '80px', right: '40px', opacity: 0.5 }}>
        <FloatingMosaic variant="dark" />
      </div>
      <div style={{ position: 'absolute', top: '200px', left: '20px', opacity: 0.3 }}>
        <FloatingMosaic variant="dark" small />
      </div>
      <div style={{ position: 'absolute', bottom: '100px', right: '80px', opacity: 0.25 }}>
        <FloatingMosaic variant="dark" small />
      </div>
    </div>
  )
}

function FloatingMosaic({ variant = 'dark', small = false }: { variant?: 'purple' | 'dark', small?: boolean }) {
  const cols = small ? 5 : 7
  const rows = small ? 4 : 5
  const tiles = Array.from({ length: cols * rows })
  const darkShades = ['#1f1f23', '#27272a', '#3f3f46', '#52525b', '#18181b', '#09090b']
  const purpleShades = ['#7c3aed', '#8b5cf6', '#a78bfa', '#3b0764', '#4c1d95', '#5b21b6']
  const shades = variant === 'purple' ? purpleShades : darkShades

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '3px',
        width: small ? '80px' : '120px',
        height: small ? '60px' : '90px',
      }}
    >
      {tiles.map((_, i) => (
        <div
          key={i}
          style={{
            background: shades[i % shades.length],
            borderRadius: '2px',
          }}
        />
      ))}
    </div>
  )
}

// ─── Typing animation ─────────────────────────────────────────────────────────
function TypingText({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[index]
    let timeout: ReturnType<typeof setTimeout>
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80)
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 2000)
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40)
    } else if (deleting && displayed.length === 0) {
      setDeleting(false)
      setIndex((index + 1) % words.length)
    }
    return () => clearTimeout(timeout)
  }, [displayed, deleting, index, words])

  return (
    <span style={{ color: '#a78bfa' }}>
      {displayed}
      <span style={{ borderRight: '3px solid #a78bfa', marginLeft: '2px', animation: 'blink 1s infinite' }} />
    </span>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ navigate }: { navigate: (path: string) => void }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 24px',
      background: scrolled ? 'rgba(9,9,11,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 0',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}>
            <Brain size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#fff', letterSpacing: '-0.3px' }}>OmniMind</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {['Product', 'Features', 'Pricing', 'Docs'].map(link => (
            <button key={link} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)', fontSize: '14px', padding: '8px 14px',
              borderRadius: '8px', transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fff'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; (e.target as HTMLElement).style.background = 'transparent' }}
            >
              {link}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: '13px', padding: '8px 14px',
            borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>
            <GithubIcon size={14} color="#fff" />
            Star 2.4k
          </button>
          <button
            onClick={() => navigate('/auth')}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
              padding: '9px 20px', borderRadius: '10px', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 0 20px rgba(124,58,237,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(124,58,237,0.6)'; (e.target as HTMLElement).style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(124,58,237,0.35)'; (e.target as HTMLElement).style.transform = 'scale(1)' }}
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Use Case Mosaic Card ─────────────────────────────────────────────────────
function UseCaseCard({ title, desc, active = false, mosaicVariant = 'dark' }: {
  title: string, desc: string, active?: boolean, mosaicVariant?: 'purple' | 'dark'
}) {
  const [hovered, setHovered] = useState(false)
  const cols = 8, rows = 5
  const tiles = Array.from({ length: cols * rows })
  const purpleShades = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#3b0764', '#4c1d95', '#5b21b6', '#6d28d9']
  const darkShades = ['#1f1f23', '#27272a', '#3f3f46', '#52525b', '#18181b', '#09090b', '#1c1c1f', '#2d2d30']
  const shades = mosaicVariant === 'purple' ? purpleShades : darkShades

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? '#1a0533' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '16px', padding: '24px',
        cursor: 'pointer', transition: 'all 0.3s',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 30px rgba(124,58,237,0.15)' : 'none',
      }}
    >
      <div>
        <h3 style={{
          color: active ? '#a78bfa' : '#e4e4e7',
          fontWeight: 600, fontSize: '16px', marginBottom: '8px',
        }}>{title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: '1.6' }}>{desc}</p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '2px',
        width: '120px',
        height: '75px',
        borderRadius: '8px',
        overflow: 'hidden',
        opacity: hovered ? 1 : 0.7,
        transition: 'opacity 0.3s',
        flexShrink: 0,
      }}>
        {tiles.map((_, i) => (
          <div key={i} style={{ background: shades[i % shades.length], borderRadius: '1px' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Timeline Cards ───────────────────────────────────────────────────────────
function TimelineCard({ time, timeLabel, title, desc, cmd, link, highlight = false }: {
  time: string, timeLabel: string, title: string, desc: string, cmd: string, link: string, highlight?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: highlight ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${highlight ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '20px', padding: '28px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        transition: 'all 0.3s',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? (highlight ? '0 20px 40px rgba(124,58,237,0.4)' : '0 10px 30px rgba(0,0,0,0.3)') : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Mini mosaic in top right */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', opacity: highlight ? 0.6 : 0.4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', width: '52px', height: '40px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              background: highlight
                ? ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.7)'][i % 3]
                : ['#1f1f23', '#3f3f46', '#52525b'][i % 3],
              borderRadius: '1px',
            }} />
          ))}
        </div>
      </div>

      <div>
        <span style={{
          color: highlight ? 'rgba(255,255,255,0.9)' : '#a78bfa',
          fontWeight: 700, fontSize: '20px', letterSpacing: '-0.5px',
        }}>{time}</span>
        <span style={{
          display: 'block',
          color: highlight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
          fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
          marginTop: '2px',
        }}>{timeLabel}</span>
      </div>

      <div>
        <h3 style={{
          color: '#fff', fontWeight: 600, fontSize: '18px',
          marginBottom: '10px', lineHeight: '1.3',
          paddingRight: '60px',
        }}>{title}</h3>
        <p style={{ color: highlight ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: '1.65' }}>{desc}</p>
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px 14px',
        fontFamily: 'monospace', fontSize: '12px',
        color: highlight ? 'rgba(255,255,255,0.85)' : '#a78bfa',
      }}>
        {cmd}
      </div>

      <button style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: highlight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
        fontSize: '12px', fontWeight: 600, padding: '0',
        fontFamily: 'Inter, sans-serif',
        transition: 'color 0.2s',
      }}>
        {link} <ChevronRight size={12} />
      </button>
    </div>
  )
}

// ─── Main Home Component ──────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      color: '#fff',
      fontFamily: "'Inter', -apple-system, sans-serif",
      overflowX: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(124,58,237,0.3)} 50%{box-shadow:0 0 40px rgba(124,58,237,0.7)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <Navbar navigate={navigate} />

      {/* ── HERO SECTION ──────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <GridBackground />

        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '600px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px', animation: 'fadeInUp 0.8s ease' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: '100px', padding: '6px 16px',
            marginBottom: '36px',
          }}>
            <span style={{
              background: '#7c3aed', color: '#fff',
              fontSize: '9px', fontWeight: 700, letterSpacing: '1px',
              padding: '2px 7px', borderRadius: '4px',
            }}>NEW</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>OmniMind v1 is here!</span>
            <span style={{ color: '#a78bfa', fontSize: '13px' }}>→</span>
          </div>

          {/* Main heading */}
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 88px)',
            fontWeight: 900, lineHeight: '1.05',
            letterSpacing: '-3px', marginBottom: '24px',
            color: '#fff',
          }}>
            AI Memory Platform<br />
            for <TypingText words={['Your Clients', 'Your Team', 'Your Agents', 'Your Business']} />
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.5)', fontSize: '18px',
            maxWidth: '560px', margin: '0 auto 40px',
            lineHeight: '1.7',
          }}>
            Capture every meeting, email, and message. Turn it into graph memory. Let every agent recall it across sessions.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '50px' }}>
            <button
              onClick={() => navigate('/auth')}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                border: 'none', color: '#fff',
                fontSize: '15px', fontWeight: 600,
                padding: '14px 32px', borderRadius: '12px',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 0 30px rgba(124,58,237,0.4)',
                animation: 'pulse-glow 2s infinite',
              }}
            >
              Start building <ArrowRight size={16} />
            </button>
            <button
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: '15px', fontWeight: 500,
                padding: '14px 28px', borderRadius: '12px',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <GithubIcon size={16} color="#fff" /> View GitHub
            </button>
          </div>

          {/* Integration badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Works with</span>
            {['Gmail', 'Slack', 'Notion', 'WhatsApp', 'Gemini', 'Cognee'].map(tool => (
              <span key={tool} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500,
                padding: '5px 12px', borderRadius: '8px',
              }}>{tool}</span>
            ))}
          </div>
        </div>

        {/* Bottom stats bar */}
        <div style={{
          position: 'absolute', bottom: '40px', left: '40px',
          display: 'flex', alignItems: 'center', gap: '32px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '14px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={14} color="#f59e0b" fill="#f59e0b" />
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>#1 AI CRM Tool</span>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}><b style={{ color: '#fff' }}>10k+</b> Active Users</span>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}><b style={{ color: '#fff' }}>2.4k</b> GitHub Stars</span>
        </div>
      </section>

      {/* ── THE PROBLEM SECTION ────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ color: '#7c3aed', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '24px' }}>
          THE PROBLEM
        </p>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
          lineHeight: '1.1', letterSpacing: '-2px',
          marginBottom: '20px', color: '#fff', maxWidth: '700px',
        }}>
          What should be remembered gets{' '}
          <span style={{ color: '#7c3aed', textDecoration: 'line-through', opacity: 0.8 }}>forgotten</span>,{' '}
          <span style={{ color: '#7c3aed', letterSpacing: '4px' }}>d i s c o n n e c t e d</span>, or{' '}
          <span style={{ color: '#a78bfa' }}>silently incomplete</span>.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', lineHeight: '1.7', maxWidth: '560px', marginBottom: '60px' }}>
          Client data scattered across Gmail, Slack, Notion. Meeting notes forgotten. Context lost between sessions.
          The thing that breaks is <b style={{ color: 'rgba(255,255,255,0.7)' }}>always the same</b>.
        </p>

        {/* Use case grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <UseCaseCard
            title="Client Intelligence"
            desc="Every email, meeting, and message from a client — searchable and queryable in seconds."
            active={true}
            mosaicVariant="purple"
          />
          <UseCaseCard
            title="Sales & Deal Tracking"
            desc="Deals, proposals, and ICPs your entire team can instantly recall and query."
            mosaicVariant="dark"
          />
          <UseCaseCard
            title="Docs & Knowledge Bases"
            desc="Technical manuals, SOPs, and industrial knowledge — instantly searchable by AI agents."
            mosaicVariant="dark"
          />
          <UseCaseCard
            title="Memory for AI Agents"
            desc="Agents that recall past decisions and fixes instead of relearning every run."
            active={true}
            mosaicVariant="purple"
          />
        </div>
      </section>

      {/* ── HOW WE BUILD SECTION ────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ color: '#7c3aed', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>
            HOW WE BUILD
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800,
            lineHeight: '1.15', letterSpacing: '-1.5px',
            marginBottom: '60px', color: '#fff', maxWidth: '700px',
          }}>
            Everything your clients need, from first meeting to long-term loyalty.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <TimelineCard
              time="5 min"
              timeLabel="Setup"
              title="Connect your first client and start syncing"
              desc="Add a client with their Gmail, Slack, and Notion. OmniMind starts syncing and building memory immediately. No code needed."
              cmd="$ npm install omnimind"
              link="Run the quickstart"
            />
            <TimelineCard
              time="1 day"
              timeLabel="Memory Built"
              title="Query client data across all sources"
              desc="Ask anything in plain English. OmniMind searches across emails, meetings, and docs and returns a cited answer in under 2 seconds."
              cmd='$ omnimind.recall("what did client say about budget?")'
              link="See integrations"
            />
            <TimelineCard
              time="1 week"
              timeLabel="Full Intelligence"
              title="AI agents understand every client relationship"
              desc="Your AI meeting copilot, health scores, and risk alerts are all running. Clients feel remembered. Deals close faster."
              cmd='$ omnimind.search("...") # cited answers'
              link="Read case study"
              highlight={true}
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ──────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>
          FEATURES
        </p>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800,
          textAlign: 'center', letterSpacing: '-1.5px',
          marginBottom: '60px', color: '#fff',
        }}>
          Built for the full client lifecycle
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {[
            { icon: Brain, title: 'Knowledge Graph Memory', desc: 'Every meeting, email, and message becomes a connected memory node. Relationships between people, decisions, and tasks are automatically mapped.', tag: 'COGNEE POWERED' },
            { icon: Mic, title: 'Live Meeting Copilot', desc: 'Real-time transcription and a private AI sidebar during calls. Query client history while the meeting is happening — clients never know.', tag: 'REAL-TIME' },
            { icon: BarChart2, title: 'Client Health Scores', desc: 'AI calculates a 0–100 health score per client based on meeting frequency, sentiment trends, and task completion. Know who\'s about to churn.', tag: 'PREDICTIVE' },
            { icon: Zap, title: 'Post-Meeting Automation', desc: 'Meeting ends → Auto MoM, action items, and personalized follow-up email — all generated simultaneously in under 30 seconds.', tag: 'AUTOMATION' },
            { icon: MessageSquare, title: 'Multi-Source Sync', desc: 'Gmail, Slack, Notion, WhatsApp, and documents — synced every 15 minutes. Every message automatically becomes part of client memory.', tag: '6+ SOURCES' },
            { icon: Shield, title: 'Privacy-First Design', desc: 'Microsoft Presidio masks PII before any data reaches the LLM. Phone numbers, emails, and credit cards are auto-redacted. GDPR ready.', tag: 'PII PROTECTED' },
          ].map((f, i) => (
            <FeatureBlock key={i} {...f} />
          ))}
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'rgba(124,58,237,0.06)', borderTop: '1px solid rgba(124,58,237,0.15)', borderBottom: '1px solid rgba(124,58,237,0.15)',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {[
            { value: '6+', label: 'Knowledge Sources', sub: 'Gmail, Slack, Notion, WhatsApp...' },
            { value: '<2s', label: 'Live Query Speed', sub: 'Gemini Flash during meetings' },
            { value: '100%', label: 'PII Protected', sub: 'Microsoft Presidio masking' },
            { value: '0', label: 'Manual Notes', sub: 'Whisper V3 handles everything' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 900, color: '#a78bfa', letterSpacing: '-2px', marginBottom: '6px' }}>{s.value}</div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{s.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA SECTION ────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          background: 'linear-gradient(135deg, #1a0533 0%, #0d0118 100%)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: '28px', padding: '80px 60px',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)',
            width: '400px', height: '200px',
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <p style={{ color: 'rgba(167,139,250,0.7)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>
              GET STARTED TODAY
            </p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', marginBottom: '16px', color: '#fff' }}>
              Your clients' memory<br />starts here.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', marginBottom: '40px', lineHeight: '1.6' }}>
              Connect your first client in 2 minutes. OmniMind starts learning immediately.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
              <button
                onClick={() => navigate('/auth')}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  border: 'none', color: '#fff',
                  fontSize: '15px', fontWeight: 700,
                  padding: '16px 36px', borderRadius: '12px',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 0 40px rgba(124,58,237,0.5)',
                }}
              >
                Start Free — No Credit Card <ArrowRight size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginTop: '24px' }}>
              {['No credit card', 'Setup in 2 minutes', 'Cancel anytime'].map(t => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  <CheckCircle2 size={12} color="#7c3aed" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '40px 24px',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={15} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>OmniMind</span>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>© 2025 OmniMind. All rights reserved.</p>

          <div style={{ display: 'flex', gap: '24px' }}>
            {['Docs', 'Privacy', 'Terms', 'GitHub'].map(l => (
              <a key={l} href="#" style={{
                color: 'rgba(255,255,255,0.35)', fontSize: '13px', textDecoration: 'none',
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.35)'}
              >{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Feature Block Component ──────────────────────────────────────────────────
function FeatureBlock({ icon: Icon, title, desc, tag }: {
  icon: any, title: string, desc: string, tag: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovered ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '18px', padding: '28px',
        transition: 'all 0.3s', cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{
          width: '44px', height: '44px', flexShrink: 0,
          background: hovered ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s',
        }}>
          <Icon size={20} color={hovered ? '#fff' : '#a78bfa'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h3 style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>{title}</h3>
            <span style={{
              background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
              color: '#a78bfa', fontSize: '9px', fontWeight: 700, letterSpacing: '1px',
              padding: '2px 7px', borderRadius: '4px',
            }}>{tag}</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.65' }}>{desc}</p>
        </div>
      </div>
    </div>
  )
}
