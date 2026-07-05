# OmniMind AI — Final End-to-End Flow

Note: This workspace is configured for single-user (solo) mode. No team/admin flows. All LLMs must be called via external APIs; no local model hosting.

---

## PHASE 1: Solo User Creates a New Client

```
User logs in (local auth)
        │
        ▼
Creates Client Profile (single-user workspace)
        │
        ▼
No team or role management — the user owns all clients and data
        │
        ▼
Connects Knowledge Sources
┌───────────────────────────────────────┐
│  Google Drive  │  Notion  │  Slack    │
│  Gmail         │  Outlook │  YouTube  │
│  WhatsApp Business        │  PDFs     │
└───────────────────────────────────────┘
        │
        ▼
Background Celery Workers start syncing all sources
        │
        ▼
Each document/message goes through:

  Raw Text
     │
     ▼
  Microsoft Presidio (PII Masking)
  [Phone] [Email] [Card] [Address] masked
     │
     ▼
  Text Chunker (splits into semantic chunks)
     │
     ▼
  Jina Embeddings v4 (converts to vectors)
     │
     ▼
  ┌─────────────────────────────┐
  │  Qdrant Vector Database     │  ← for semantic search
  └─────────────────────────────┘
     │
     ▼
  Cognee Memory Engine
  (cognee.add → cognee.cognify)
     │
     ▼
  ┌─────────────────────────────┐
  │  Knowledge Graph            │  ← nodes + edges + timestamps
  │  (Client, Meeting, Doc,     │
  │   Email, Person, Task)      │
  └─────────────────────────────┘

Client memory is now LIVE and ready.
```

---

## PHASE 2: User Prepares for Meeting

```
User opens Client: Amazon
        │
        ▼
OmniMind AI generates Pre-Meeting Brief
(API-hosted LLM + Cognee recall)
        │
        ▼
Brief contains:
┌────────────────────────────────────────────┐
│ Last Meeting Summary                       │
│ Open Action Items (3 pending)              │
│ Client Health Score: 78% (At Risk)         │
│ Risk Alert: No reply for 18 days           │
│ AI Suggestion: Mention March migration win │
│ Budget History: $10k → $15k → $20k         │
└────────────────────────────────────────────┘
        │
        ▼
User is fully prepared before saying hello.
```

---

## PHASE 3: Live Meeting (The Core Experience)

```
Rahul starts Zoom / Teams / Meet / Physical Meeting
        │
        ▼
Clicks "Magic Record" Button (floating UI)
        │
        ▼
Browser captures microphone audio (MediaRecorder API)
        │
        ▼
Audio chunks streamed via WebSocket to FastAPI backend
        │
        ▼
Whisper Large V3
(real-time speech-to-text transcription)
        │
        ▼
Live transcript appears on screen word-by-word
        │
        ▼
Transcript continuously fed into Cognee memory
(meeting context builds in real-time)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PARALLEL: User uses Live Sidebar Chat

User types (secretly, client cannot see):
"What budget did Amit approve in March?"
        │
        ▼
POST /meeting/query
        │
        ▼
Cognee recall (client_id namespace)
+ Qdrant semantic search
        │
        ▼
API-hosted LLM (fast inference)
        │
        ▼
Answer appears in sidebar:
"$10,000 — revised down after infrastructure
 migration delay. Source: Notion brief, March 12."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PARALLEL: AI Proactive Suggestions appear

AI detects client mentioned "pricing"
        │
        ▼
Suggestion card pops up:
"Client requested 15% discount in Feb email.
 Avoid committing without further confirmation." 
```

---

## PHASE 4: Post-Meeting Automation

```
User clicks "End Meeting"
        │
        ▼
POST /meeting/{id}/end
        │
        ▼
3 Parallel LLM Chains fire simultaneously:

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Chain 1              Chain 2           Chain 3         │
│  MoM Generator        Action Items      Follow-up Email │
│                        Extractor        Drafter         │
│  Gemini 2.5 Pro       Gemini 2.5 Pro   Gemini 2.5 Pro  │
│                                         + Cognee recall │
└─────────────────────────────────────────────────────────┘
        │                    │                   │
        ▼                    ▼                   ▼
  Structured MoM        Task Board          Personalized Email
  (Objective,           auto-populated      blending today's
   Decisions,           (owner, deadline,   discussion +
   Risks,               priority)           March history
   Next Steps)
        │
        ▼
All results stored in PostgreSQL under meeting_id

        │
        ▼
Cognee memory updated with new meeting data
(cognee.improve → updates existing graph nodes)

        │
        ▼
Knowledge Graph updated:
New nodes: Meeting_June15, Task_Proposal, Decision_Budget20k
New edges: Amazon → discussed_in → Meeting_June15
           Meeting_June15 → created_task → Task_Proposal
```

---

## PHASE 5: Passive Background Intelligence

```
(Running 24/7 in background — no user action needed)

Celery Workers polling every 15 minutes:

Gmail / Outlook
        │
        ▼
New email from Amazon client detected
        │
        ▼
LLM Classifier (Gemini 2.5 Flash):
"Does this email contain structural change?"
        │
   ┌────┴────┐
  YES        NO
   │          │
   ▼          ▼
Detected:   Skip
"Budget     (store
 approved   as plain
 $22k"      memory)
   │
   ▼
cognee.improve() → updates Budget node
Old value archived with timestamp
New value becomes active context

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WhatsApp Business webhook fires on new message:
"We'll sign the contract next Monday."
        │
        ▼
PII Masking → Embed → Store in Cognee
        │
        ▼
Knowledge Graph: new edge
Amazon → committed_to → Contract_Signing_Monday
```

---

## PHASE 6: Analytics & Intelligence Dashboard

```
User opens OmniMind AI Dashboard
        │
        ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│  Client Cards with Health Scores                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Amazon   │  │ Flipkart │  │ Infosys  │      │
│  │ 92% ✅   │  │ 61% ⚠️   │  │ 34% 🔴   │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                 │
│  Risk Alerts Panel                              │
│  ⚠ Infosys: No contact for 21 days             │
│  ⚠ Flipkart: Budget reduced 35%               │
│  ⚠ Amazon: Contract renewal in 12 days        │
│                                                 │
└─────────────────────────────────────────────────┘
        │
        ▼
User clicks "Amazon"
        │
        ▼
Client Detail Page opens:

Tab 1: Timeline
Jan → Proposal sent
Feb → Meeting (budget $10k)
Mar → Infrastructure issue
Apr → Budget revised $15k
Jun → Contract signed $20k

Tab 2: Knowledge Graph
[Amazon] ──── [Meeting_Mar] ──── [Budget_10k]
   │                                   │
   └──── [Meeting_Jun] ──── [Budget_20k] (ACTIVE)
              │
         [Task_Proposal] ── [User]

Tab 3: Org Chart (optional; single-user view)
User-managed contacts and stakeholders

Tab 4: AI Recommendations
→ Mention successful migration in next call
→ Send contract renewal reminder
→ Avoid discussing competitor pricing

Additional: Project Rating — user can rate each client/project on a 0–100 scale; score surfaces on client card and timeline.
```

---

## Complete Data Flow Summary

```
INPUT SOURCES
─────────────
Meetings (Audio) → Whisper V3 → Transcript
Emails (Gmail/Outlook) → OAuth Sync
WhatsApp → Meta Webhook
Slack → OAuth Sync
Notion / Google Drive → OAuth Sync
PDFs / Excel / Word → Manual Upload
YouTube → Transcript API

        │
        ▼

PROCESSING PIPELINE
────────────────────
Microsoft Presidio → PII Masking
Text Chunker → Semantic Chunks
Jina Embeddings v4 → Vectors

        │
        ▼

MEMORY LAYER
─────────────
Qdrant → Vector Search (semantic RAG)
Cognee → Knowledge Graph + Hybrid Memory
PostgreSQL → Structured data (users, clients, tasks, meetings)

        │
        ▼

AI INTELLIGENCE
────────────────
Gemini 2.5 Flash → Live meeting queries (low latency)
Gemini 2.5 Pro → MoM, emails, summaries, health scores
Cognee recall → Relational context retrieval

        │
        ▼

OUTPUT
───────
Live Sidebar Answers
Minutes of Meeting
Action Items & Task Board
Follow-up Emails
Client Health Score
Risk Alerts
AI Recommendations
Knowledge Graph Visualization
Client Timeline
Org Chart
```

---

## Tech Stack at a Glance

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind + Shadcn UI |
| Backend | FastAPI (Python) |
| Auth | Local (built-in single-user auth) |
| Database | PostgreSQL |
| Vector DB | Qdrant |
| Memory Engine | Cognee |
| LLM (Deep) | API-hosted LLM (e.g., Gemini 2.5 Pro via API) |
| LLM (Fast) | API-hosted fast LLM (e.g., Gemini 2.5 Flash via API) |
| Speech-to-Text | Whisper Large V3 |
| Embeddings | Jina Embeddings v4 |
| PII Masking | Microsoft Presidio |
| Background Jobs | Celery + Redis |
| Graph Visualization | D3.js / react-force-graph |
| Integrations | Gmail, Outlook, Slack, Notion, GDrive, WhatsApp, Zoom |
