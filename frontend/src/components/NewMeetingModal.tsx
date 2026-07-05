import { useState, useRef, useEffect } from 'react'
import { X, Mic, PhoneOff, Loader2, MessageSquare, Send, Brain, Radio, AlertCircle } from 'lucide-react'
import api from '../services/api'

interface ChatMsg {
  role: 'user' | 'ai'
  text: string
}

interface Props {
  clientId: string
  clientName: string
  onClose: () => void
  onMeetingCreated: (meeting: any) => void
}

const NewMeetingModal = ({ clientId, clientName, onClose, onMeetingCreated }: Props) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isMeetingActive, setIsMeetingActive] = useState(false)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [sidebarQuery, setSidebarQuery] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [queryLoading, setQueryLoading] = useState(false)
  const [error, setError] = useState('')

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
          if (event.error !== 'no-speech') setError(`Transcription error: ${event.error}`)
        }
        recognitionRef.current.onend = () => {
          // Auto-restart if still recording (browser stops after silence)
          if (recognitionRef.current && isRecording) {
            try { recognitionRef.current.start() } catch {}
          }
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

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

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
      mediaRecorder.onerror = () => setError('Recording error occurred')
      mediaRecorder.start()
    } catch (err: any) {
      setError(err.message || 'Failed to access microphone')
    }
  }

  const stopRecording = async () => {
    return new Promise(resolve => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = async () => {
          recognitionRef.current?.stop()
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
          setLoading(true)
          try {
            const formData = new FormData()
            formData.append('clientId', clientId)
            formData.append('title', `Meeting with ${clientName}`)
            formData.append('transcript', transcript)
            formData.append('duration', duration.toString())
            formData.append('audio', audioBlob, 'meeting-recording.wav')
            const response = await api.post('/meetings', formData)
            onMeetingCreated(response.data)
            resolve(response.data)
          } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to save meeting')
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

  const handleEndMeeting = async () => {
    await stopRecording()
  }

  // ─── AI Query ──────────────────────────────────────────────────────────────
  const handleSidebarQuery = async () => {
    if (!sidebarQuery.trim()) return
    const q = sidebarQuery.trim()
    setSidebarQuery('')
    setChatHistory(prev => [...prev, { role: 'user', text: q }])
    setQueryLoading(true)
    try {
      const response = await api.post('/meetings/query', { clientId, query: q })
      setChatHistory(prev => [...prev, { role: 'ai', text: response.data.answer }])
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Sorry, could not fetch an answer right now.' }])
    } finally {
      setQueryLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
    >
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div
        className="relative w-full max-w-5xl rounded-3xl overflow-hidden flex border border-white/[0.08] shadow-2xl"
        style={{
          backgroundColor: '#0c0c10',
          height: 'min(88vh, 720px)',
          boxShadow: '0 0 80px rgba(124,58,237,0.12), 0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* ─── Main Panel (Transcript) ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.06]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-xl flex items-center justify-center shrink-0"
                style={{ boxShadow: '0 0 18px rgba(124,58,237,0.35)' }}
              >
                <span className="text-white text-sm font-bold">{clientName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Meeting — {clientName}</h2>
                <p className="text-[11px] text-zinc-500">OmniMind Live Session</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isMeetingActive && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">REC</span>
                  <span className="text-xs font-mono text-emerald-300">{formatDuration(duration)}</span>
                </div>
              )}
              <button
                onClick={onClose}
                disabled={isMeetingActive}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-red-500/30 disabled:opacity-30 text-zinc-400 hover:text-red-400 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Transcript Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Radio size={13} className="text-violet-400" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Live Transcript</span>
            </div>
            <div
              className="border border-white/[0.06] rounded-xl p-5 min-h-[180px]"
              style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
            >
              {transcript ? (
                <div className="text-sm text-zinc-200 leading-[1.9] whitespace-pre-wrap">
                  {transcript}
                  <div ref={transcriptEndRef} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="w-14 h-14 border border-white/[0.08] rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <Mic size={22} className="text-zinc-600" />
                  </div>
                  <p className="text-zinc-500 text-sm">
                    {isMeetingActive ? 'Listening... start speaking' : 'Click "Start Recording" to begin capturing'}
                  </p>
                  <p className="text-zinc-600 text-xs mt-1.5">
                    Real-time speech-to-text transcription
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400">
                <X size={12} />
              </button>
            </div>
          )}

          {/* Controls */}
          <div className="px-6 py-4 border-t border-white/[0.06] bg-white/[0.01]">
            {!isMeetingActive ? (
              <div className="flex gap-3">
                <button
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white font-semibold py-3.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ boxShadow: '0 0 25px rgba(124,58,237,0.3)' }}
                >
                  <Mic size={17} /> Start Recording
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3.5 rounded-xl text-sm font-semibold text-zinc-400 border border-white/[0.08] hover:bg-white/[0.04] hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleEndMeeting}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-all"
                style={{ boxShadow: '0 0 20px rgba(239,68,68,0.25)' }}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing & saving meeting...</>
                ) : (
                  <><PhoneOff size={16} /> End Meeting &amp; Save</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ─── Right: AI Memory Panel ────────────────────────────────────── */}
        <div className="w-[320px] flex flex-col shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.008)' }}>

          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div
                className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-lg flex items-center justify-center"
                style={{ boxShadow: '0 0 12px rgba(124,58,237,0.25)' }}
              >
                <Brain size={14} className="text-white" />
              </div>
              <h3 className="font-bold text-sm text-white">Client Memory</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Ask about past meetings, decisions & client history
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-2">
                <div
                  className="w-12 h-12 border border-white/[0.08] rounded-2xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                >
                  <MessageSquare size={18} className="text-zinc-600" />
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                  {isMeetingActive
                    ? `Ask anything about ${clientName}'s past meetings or history`
                    : 'Start recording to enable memory search during your meeting'
                  }
                </p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-600/20 border border-violet-500/20 text-violet-200'
                        : 'bg-white/[0.04] border border-white/[0.08] text-zinc-300'
                    }`}
                  >
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-4 h-4 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[7px] font-bold">AI</span>
                        </div>
                        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">Memory</span>
                      </div>
                    )}
                    <p className="text-[13px]">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            {queryLoading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="text-violet-400 animate-spin" />
                  <span className="text-xs text-zinc-500">Searching memory...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="px-4 py-3.5 border-t border-white/[0.06] bg-white/[0.02]">
            <div className="relative">
              <input
                type="text"
                placeholder={isMeetingActive ? 'Ask about this client...' : 'Start meeting to enable...'}
                value={sidebarQuery}
                onChange={e => setSidebarQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSidebarQuery()}
                disabled={!isMeetingActive}
                className="w-full text-sm bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-3.5 py-2.5 pr-10 placeholder:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-violet-500/40 transition-all"
              />
              <button
                onClick={handleSidebarQuery}
                disabled={!sidebarQuery.trim() || queryLoading || !isMeetingActive}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-30 rounded-lg transition-all"
              >
                {queryLoading
                  ? <Loader2 size={11} className="text-white animate-spin" />
                  : <Send size={11} className="text-white" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewMeetingModal
