import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Calendar, Loader2, CheckCircle, Clock, FileText, ListChecks, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import api from '../services/api'

interface Meeting {
  id: string
  title: string
  client_id?: string
  client_name?: string
  summary?: string
  mom_detailed?: string
  action_items?: any[]
  discussion_points?: string[]
  transcript?: string
  status?: string
  created_at: string
  updated_at: string
}

export default function MeetingDetail() {
  const { meetingId } = useParams()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!meetingId) return
    api.get(`/meetings/${meetingId}`).then(r => {
      setMeeting(r.data)
    }).catch(() => navigate('/clients')).finally(() => setLoading(false))
  }, [meetingId, navigate])

  const handleScheduleNext = async () => {
    if (!scheduledTime || !meeting) return
    setScheduling(true)
    try {
      await api.post(`/meetings/${meetingId}/schedule-next`, {
        clientId: meeting.client_id,
        scheduledAt: new Date(scheduledTime).toISOString(),
        title: `Follow-up Meeting with ${meeting.client_name || 'Client'}`,
      })
      setShowScheduleForm(false)
      setScheduledTime('')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to schedule meeting')
    } finally {
      setScheduling(false)
    }
  }

  const handleSendSummaryEmail = async () => {
    if (!meetingId) return
    setSendingEmail(true)
    try {
      await api.post(`/meetings/${meetingId}/send-summary`)
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 3000)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!meeting) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-neutral-400">Meeting not found</p>
        </div>
      </AppLayout>
    )
  }

  let actionItems: any[] = []
  let discussionPoints: string[] = []

  try {
    actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : JSON.parse(meeting.action_items as any) || []
  } catch { actionItems = [] }

  try {
    discussionPoints = Array.isArray(meeting.discussion_points) ? meeting.discussion_points : JSON.parse(meeting.discussion_points as any) || []
  } catch { discussionPoints = [] }

  const completedCount = checkedItems.size
  const totalCount = actionItems.length

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 hover:bg-neutral-100 transition-all shrink-0 mt-1"
          >
            <ArrowLeft size={16} className="text-neutral-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-black truncate">{meeting.title}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Clock size={13} className="text-neutral-400" />
              <p className="text-neutral-400 text-sm">
                {new Date(meeting.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={handleSendSummaryEmail}
            disabled={sendingEmail}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
          >
            {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sendingEmail ? 'Sending...' : 'Send Summary Email'}
          </button>

          {emailSent && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
              <CheckCircle size={14} />
              Email sent!
            </div>
          )}

          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="flex items-center gap-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <Calendar size={14} />
            Schedule Next Meeting
          </button>
        </div>

        {/* Schedule Form */}
        {showScheduleForm && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 mb-6 shadow-sm">
            <h3 className="text-black font-semibold mb-4">Schedule Follow-up Meeting</h3>
            <div className="flex gap-3">
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="flex-1 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
              />
              <button
                onClick={handleScheduleNext}
                disabled={scheduling || !scheduledTime}
                className="flex items-center gap-2 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
              >
                {scheduling ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-5">

          {/* MoM */}
          {meeting.mom_detailed && (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <FileText size={15} className="text-indigo-600" />
                </div>
                <h2 className="text-black font-semibold">Minutes of Meeting</h2>
              </div>
              <div className="px-6 py-5 text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap">
                {meeting.mom_detailed}
              </div>
            </div>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <ListChecks size={15} className="text-green-600" />
                  </div>
                  <h2 className="text-black font-semibold">Action Items</h2>
                </div>
                {totalCount > 0 && (
                  <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                    {completedCount}/{totalCount} done
                  </span>
                )}
              </div>
              <div className="divide-y divide-neutral-50">
                {actionItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-neutral-50 cursor-pointer transition-all group"
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      checkedItems.has(idx) ? 'bg-green-500 border-green-500' : 'border-neutral-300 group-hover:border-neutral-400'
                    }`}>
                      {checkedItems.has(idx) && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-all ${checkedItems.has(idx) ? 'line-through text-neutral-400' : 'text-black'}`}>
                        {item.task}
                      </p>
                      {item.owner && (
                        <p className="text-xs text-neutral-400 mt-0.5">Owner: {item.owner}</p>
                      )}
                    </div>
                    {item.priority && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                        item.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                        item.priority === 'medium' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                        'bg-green-50 text-green-600 border border-green-100'
                      }`}>
                        {item.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discussion Points */}
          {discussionPoints.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <MessageSquare size={15} className="text-violet-600" />
                </div>
                <h2 className="text-black font-semibold">Discussion Points for Next Meeting</h2>
              </div>
              <div className="px-6 py-4 space-y-2.5">
                {discussionPoints.map((point: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
                    <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-neutral-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {meeting.summary && (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText size={15} className="text-blue-600" />
                </div>
                <h2 className="text-black font-semibold">Summary</h2>
              </div>
              <div className="px-6 py-5 text-neutral-700 text-sm leading-relaxed">
                {meeting.summary}
              </div>
            </div>
          )}

          {/* Transcript Collapsible */}
          {meeting.transcript && (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <FileText size={15} className="text-neutral-500" />
                  </div>
                  <h2 className="text-black font-semibold">Full Transcript</h2>
                </div>
                {showTranscript ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
              </button>
              {showTranscript && (
                <div className="px-6 pb-5 border-t border-neutral-100">
                  <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap pt-4">
                    {meeting.transcript}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  )
}
