import { logger } from '../utils/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.GEMINI_GENERATION_MODEL || 'gemini-2.5-flash';
const GEMINI_FLASH_MODEL = process.env.GEMINI_FLASH_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const geminiPro = genAI ? genAI.getGenerativeModel({ model: GEMINI_MODEL }) : null;
export const geminiFlash = genAI ? genAI.getGenerativeModel({ model: GEMINI_FLASH_MODEL }) : null;

export async function extractKnowledge(text: string, clientName: string): Promise<{
  summary: string;
  entities: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  keyFacts: string[];
  actionItems: { task: string; priority: 'high' | 'medium' | 'low' }[];
}> {
  const prompt = `
You are an enterprise knowledge extraction AI. Analyze this content about client "${clientName}" and extract structured knowledge.

Content:
${text.slice(0, 8000)}

Return ONLY valid JSON (no markdown, no explanation):
{
  "summary": "2-3 sentence summary",
  "entities": ["person/company/product names mentioned"],
  "sentiment": "positive|neutral|negative",
  "keyFacts": ["important facts, decisions, numbers, dates"],
  "actionItems": [{"task": "what needs to be done", "priority": "high|medium|low"}]
}`;

  if (!geminiPro) return { summary: text.slice(0, 200), entities: [], sentiment: 'neutral', keyFacts: [], actionItems: [] };
  const result = await geminiPro.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    return { summary: text.slice(0, 200), entities: [], sentiment: 'neutral', keyFacts: [], actionItems: [] };
  }
}

export async function calculateHealthScore(clientData: {
  name: string;
  lastContactDays: number;
  meetingCount: number;
  pendingTasks: number;
  sentiment: string;
  budgetTrend: string;
}): Promise<{ score: number; reasons: string[]; alerts: string[] }> {
  const prompt = `
Calculate a client health score (0-100) for "${clientData.name}".

Data:
- Days since last contact: ${clientData.lastContactDays}
- Total meetings: ${clientData.meetingCount}
- Pending action items: ${clientData.pendingTasks}
- Overall sentiment: ${clientData.sentiment}
- Budget trend: ${clientData.budgetTrend}

Scoring guide:
- 75-100: Healthy (active, positive, low pending tasks)
- 50-74: At Risk (some inactivity or issues)
- 0-49: Critical (long silence, negative sentiment, many pending tasks)

Return ONLY valid JSON:
{
  "score": 85,
  "reasons": ["why this score"],
  "alerts": ["specific warnings if any"]
}`;

  if (!geminiFlash) return { score: 70, reasons: ['No LLM configured'], alerts: [] };
  const result = await geminiFlash.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    return { score: 70, reasons: ['Unable to calculate'], alerts: [] };
  }
}

export async function generateInsights(clients: any[]): Promise<{
  avgHealthScore: number;
  topRisks: string[];
  recommendations: string[];
}> {
  if (!clients.length) return { avgHealthScore: 0, topRisks: [], recommendations: [] };

  const avg = Math.round(clients.reduce((s, c) => s + (c.health_score || 100), 0) / clients.length);
  const atRisk = clients.filter(c => c.health_score < 75);

  const prompt = `
You are an enterprise account intelligence AI. Analyze these ${clients.length} clients and provide strategic insights.

At-risk clients: ${atRisk.map(c => c.name).join(', ') || 'none'}
Average health score: ${avg}

Return ONLY valid JSON:
{
  "topRisks": ["top 3 risk observations"],
  "recommendations": ["top 3 actionable recommendations"]
}`;

  if (!geminiFlash) return { avgHealthScore: avg, topRisks: [], recommendations: [] };
  const result = await geminiFlash.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(raw);
    return { avgHealthScore: avg, ...parsed };
  } catch {
    return { avgHealthScore: avg, topRisks: [], recommendations: [] };
  }
}

export async function generateMeetingSummary(transcript: string): Promise<string> {
  const prompt = `
You are a professional meeting summarizer. Create a concise, actionable meeting summary from this transcript.

Transcript:
${transcript.slice(0, 8000)}

Provide a brief 2-3 paragraph summary including:
1. Main topics discussed
2. Key decisions made
3. Next steps

Be professional and concise.`;

  if (!geminiFlash) return transcript.slice(0, 200);
  try {
    const result = await geminiFlash.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    logger.error('Error generating summary:', err);
    return transcript.slice(0, 200);
  }
}

export async function generateActionItems(transcript: string): Promise<{ task: string; priority: 'high' | 'medium' | 'low'; owner?: string }[]> {
  const prompt = `
Extract action items from this meeting transcript. Return ONLY valid JSON array.

Transcript:
${transcript.slice(0, 8000)}

Return JSON array format:
[
  {"task": "what needs to be done", "priority": "high|medium|low", "owner": "person responsible or null"}
]

Be specific and actionable.`;

  if (!geminiFlash) return [];
  try {
    const result = await geminiFlash.generateContent(prompt);
    const raw = result.response.text().trim().replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Error generating action items:', err);
    return [];
  }
}

export async function generateDetailedMoM(transcript: string, clientName: string): Promise<string> {
  const prompt = `
You are a professional meeting scribe. Create a detailed but concise Minutes of Meeting from this transcript.

Transcript:
${transcript.slice(0, 8000)}

Generate MoM with:
1. Meeting Date & Attendees
2. Agenda Items Discussed
3. Key Decisions Made
4. Commitments from both sides
5. Follow-up items

Format as professional business document. Be clear and actionable.`;

  if (!geminiFlash) return transcript.slice(0, 300);
  try {
    const result = await geminiFlash.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    logger.error('Error generating detailed MoM:', err);
    return transcript.slice(0, 300);
  }
}

export async function generateDiscussionPoints(previousTranscripts: string[]): Promise<string[]> {
  if (previousTranscripts.length === 0) return [];

  const prompt = `
Based on these previous meeting transcripts, extract discussion points that should be revisited in the next meeting.

Transcripts:
${previousTranscripts.slice(0, 3).join('\n---\n').slice(0, 6000)}

Return ONLY a JSON array of strings:
["point 1", "point 2", "point 3", "point 4", "point 5"]

Focus on:
- Unresolved items
- Follow-ups needed
- Recurring themes
- Budget/timeline items
- Relationship concerns`;

  if (!geminiFlash) return [];
  try {
    const result = await geminiFlash.generateContent(prompt);
    const raw = result.response.text().trim().replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Error generating discussion points:', err);
    return [];
  }
}

