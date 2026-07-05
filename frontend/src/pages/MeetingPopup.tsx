import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Mic, PhoneOff, Loader2, Send, Brain, Radio, AlertCircle, Sparkles, MicOff } from 'lucide-react'
import api from '../services/api'

interface ChatMsg {
  role: 'user' | 'ai'
  text: string
}

export default function MeetingPopup() {
  const { clientId } = useParams()
  const [searchParams] = useSearchParams()
  const clientName = searchParams.get('name') || 'Client'

  const [isRecording, setIsRecording] = useState(false)
  const [isMeetingActive, setIsMeetingActive] = useState(false)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [sidebarQuery, setSidebarQuery] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [queryLoading, setQueryLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'transcript' | 'ai'>('transcript')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ─── Speech Recognition Setup ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && !recognitionRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-IN'
        recognitionRef.current.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              setTranscript(prev => prev + event.results[i][0].transcript + ' ')
            }
          }
        }
        recognitionRef.current.onerror = (event: any) => {
          if (event.error !== 'no-speech') setError(`Mic error: ${event.error}`)
        }
        recognitionRef.current.onend = () => {
          // Auto-restart on silence timeout
          setTimeout(() => {
            if (recognitionRef.current && mediaRecorderRef.current?.state === 'recording') {
              try { recognitionRef.current.start() } catch {}
            }
          }, 200)
        }
      }
    }
    return () => {
      if (recognitionRef.current && isRecording) recognitionRef.current.stop()
    }
  }, [])

  // ─── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isMeetingActive) {
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isMeetingActive])

  // ─── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // ─── Window title ──────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = isMeetingActive
      ? `🔴 REC — ${clientName}`
      : `Meeting — ${clientName}`
  }, [clientName, isMeetingActive])

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ─── Recording Controls ────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data)
      mediaRecorder.onstart = () => {
        setIsRecording(true)
        setIsMeetingActive(true)
        recognitionRef.current?.start()
      }
      mediaRecorder.onerror = () => setError('Recording error')
      mediaRecorder.start()
    } catch (err: any) {
      setError(err.message || 'Mic access failed')
    }
  }

  const stopRecording = async () => {
    return new Promise(resolve => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = async () => {
          recognitionRef.current?.stop()

          setLoading(true)
          try {
            // Send JSON so duration stays a number (FormData always converts to string)
            const response = await api.post('/meetings', {
              clientId,
              title: `Meeting with ${clientName}`,
              transcript,
              duration,  // number, not string
            })
            setSaved(true)
            if (window.opener) {
              window.opener.postMessage({ type: 'MEETING_CREATED', meeting: response.data }, '*')
            }
            resolve(response.data)
          } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to save')
            resolve(null)
          } finally {
            setLoading(false)
          }
        }
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
        setIsMeetingActive(false)
      }
    })
  }

  // ─── AI Query ──────────────────────────────────────────────────────────────
  const handleQuery = async () => {
    if (!sidebarQuery.trim()) return
    const q = sidebarQuery.trim()
    setSidebarQuery('')
    setChatHistory(prev => [...prev, { role: 'user', text: q }])
    setQueryLoading(true)
    try {
      const response = await api.post('/meetings/query', { clientId, query: q })
      setChatHistory(prev => [...prev, { role: 'ai', text: response.data.answer }])
    } catch {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Could not get answer right now.' }])
    } finally {
      setQueryLoading(false)
    }
  }

  // ─── Saved State ───────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div style={styles.root}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(34,197,94,0.3)',
            marginBottom: 20,
          }}>
            <Sparkles size={28} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Meeting Saved!</h1>
          <p style={{ color: '#71717a', fontSize: 13, marginBottom: 24, lineHeight: 1.6, maxWidth: 260 }}>
            Transcript & action items processed. You can close this window.
          </p>
          <button onClick={() => window.close()} style={{
            ...styles.btnPrimary,
            padding: '12px 28px',
            fontSize: 13,
          }}>
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.root}>
      {/* ─── Top Bar ─────────────────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.avatar}>
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{clientName}</div>
            <div style={{ color: '#52525b', fontSize: 10 }}>OmniMind Live</div>
          </div>
        </div>
        {isMeetingActive && (
          <div style={styles.recBadge}>
            <span style={styles.recDot} />
            <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700 }}>REC</span>
            <span style={{ color: '#6ee7b7', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      {/* ─── Tab Switcher ────────────────────────────────────────────────── */}
      <div style={styles.tabBar}>
        <button
          onClick={() => setActiveTab('transcript')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'transcript' ? styles.tabBtnActive : {}),
          }}
        >
          <Radio size={12} />
          Transcript
          {transcript && (
            <span style={styles.tabDot} />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'ai' ? styles.tabBtnActive : {}),
          }}
        >
          <Brain size={12} />
          Ask Doubt
          {chatHistory.length > 0 && (
            <span style={{ ...styles.tabCount }}>{chatHistory.length}</span>
          )}
        </button>
      </div>

      {/* ─── Content Area ────────────────────────────────────────────────── */}
      <div style={styles.contentArea}>

        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {transcript ? (
              <div style={styles.transcriptBox}>
                <p style={{ color: '#e4e4e7', fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {transcript}
                </p>
                <div ref={transcriptEndRef} />
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                <div style={styles.emptyIcon}>
                  {isMeetingActive ? <Mic size={22} color="#a78bfa" /> : <MicOff size={22} color="#52525b" />}
                </div>
                <p style={{ color: '#71717a', fontSize: 13, marginTop: 12 }}>
                  {isMeetingActive ? 'Listening... start speaking' : 'Tap "Start" to begin recording'}
                </p>
                {isMeetingActive && (
                  <div style={styles.waveContainer}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} style={{
                        ...styles.waveBar,
                        animationDelay: `${i * 0.15}s`,
                        height: `${12 + Math.random() * 16}px`,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Doubt Tab */}
        {activeTab === 'ai' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={styles.chatArea}>
              {chatHistory.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '16px' }}>
                  <div style={styles.emptyIcon}>
                    <Brain size={22} color="#a78bfa" />
                  </div>
                  <p style={{ color: '#71717a', fontSize: 12, marginTop: 12, lineHeight: 1.6, maxWidth: 200 }}>
                    Ask any doubt about {clientName}'s past meetings, decisions, or history
                  </p>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                    <div style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: 14,
                      fontSize: 13,
                      lineHeight: 1.6,
                      ...(msg.role === 'user'
                        ? { background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }
                      ),
                    }}>
                      {msg.role === 'ai' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontSize: 7, fontWeight: 800 }}>AI</span>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Memory</span>
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {queryLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={14} color="#a78bfa" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: '#71717a' }}>Searching memory...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Query Input */}
            <div style={styles.queryInputWrap}>
              <input
                type="text"
                placeholder="Type your doubt here..."
                value={sidebarQuery}
                onChange={e => setSidebarQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                style={styles.queryInput}
              />
              <button
                onClick={handleQuery}
                disabled={!sidebarQuery.trim() || queryLoading}
                style={{
                  ...styles.sendBtn,
                  opacity: !sidebarQuery.trim() || queryLoading ? 0.3 : 1,
                }}
              >
                {queryLoading
                  ? <Loader2 size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={12} color="#fff" />
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div style={styles.errorBar}>
          <AlertCircle size={13} color="#f87171" />
          <span style={{ color: '#f87171', fontSize: 11, flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ color: '#f87171', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>×</button>
        </div>
      )}

      {/* ─── Bottom Controls ─────────────────────────────────────────────── */}
      <div style={styles.controlBar}>
        {!isMeetingActive ? (
          <button onClick={startRecording} style={styles.btnPrimary}>
            <Mic size={16} />
            <span>Start Recording</span>
          </button>
        ) : (
          <button
            onClick={() => stopRecording()}
            disabled={loading}
            style={{
              ...styles.btnDanger,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={15} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <PhoneOff size={15} />
                <span>End & Save</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Inline keyframe for spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes waveAnim {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; overflow: hidden; background: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        input::placeholder { color: #52525b; }
        input:focus { outline: none; border-color: rgba(124,58,237,0.4) !important; }
      `}</style>
    </div>
  )
}

// ─── Styles Object ───────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    height: '100vh',
    background: '#09090b',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    userSelect: 'none',
    position: 'relative',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(13,1,24,0.9)',
    backdropFilter: 'blur(20px)',
    flexShrink: 0,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    boxShadow: '0 0 14px rgba(124,58,237,0.35)',
    flexShrink: 0,
  },
  recBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 20,
    padding: '5px 10px',
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 8px rgba(34,197,94,0.6)',
    animation: 'spin 2s ease-in-out infinite',
  },
  tabBar: {
    display: 'flex',
    gap: 4,
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.01)',
    flexShrink: 0,
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 0',
    borderRadius: 10,
    border: '1px solid transparent',
    background: 'transparent',
    color: '#71717a',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
  },
  tabBtnActive: {
    background: 'rgba(124,58,237,0.12)',
    border: '1px solid rgba(124,58,237,0.25)',
    color: '#c4b5fd',
  },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px rgba(34,197,94,0.5)',
  },
  tabCount: {
    fontSize: 9,
    fontWeight: 800,
    color: '#a78bfa',
    background: 'rgba(124,58,237,0.2)',
    borderRadius: 6,
    padding: '1px 5px',
    minWidth: 16,
    textAlign: 'center' as const,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  transcriptBox: {
    flex: 1,
    overflow: 'auto' as const,
    padding: 16,
  },
  chatArea: {
    flex: 1,
    overflow: 'auto' as const,
    padding: 12,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    marginTop: 16,
    height: 28,
  },
  waveBar: {
    width: 4,
    borderRadius: 4,
    background: 'linear-gradient(to top, #7c3aed, #a78bfa)',
    animation: 'waveAnim 0.8s ease-in-out infinite',
  },
  queryInputWrap: {
    padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  queryInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '9px 12px',
    color: '#fff',
    fontSize: 12,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 12px 4px',
    padding: '8px 12px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10,
    flexShrink: 0,
  },
  controlBar: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.01)',
    flexShrink: 0,
  },
  btnPrimary: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 0',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 25px rgba(124,58,237,0.3)',
    transition: 'all 0.2s',
  },
  btnDanger: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 0',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #dc2626, #e11d48)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(239,68,68,0.25)',
    transition: 'all 0.2s',
  },
}
