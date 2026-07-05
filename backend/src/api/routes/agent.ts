import { logger } from '../../utils/logger';
import { Router, Response } from 'express';
import { pool } from '../../config/db';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import * as cognee from '../../services/cognee';
import { geminiFlash } from '../../services/gemini';

const router = Router();
router.use(authMiddleware);

// POST /api/agent/chat
// POST /api/agent/chat
router.post('/chat', async (req: AuthRequest, res: Response) => {
  const { message, clientId, history } = req.body;

  console.log('\n--- AGENT CHAT REQUEST STARTED ---');
  console.log('Message:', message);
  console.log('ClientId:', clientId);
  console.log('UserId:', req.userId);

  if (!message?.trim()) {
    console.log('AGENT: Validation failed (empty message)');
    return res.status(400).json({ message: 'Message required' });
  }

  try {
    // 1. Fetch all clients for context
    console.log('AGENT STEP 1: Fetching clients from DB...');
    const clientsRes = await pool.query(
      'SELECT id, name, company, email, health_score, last_sentiment FROM clients WHERE user_id=$1 ORDER BY name',
      [req.userId]
    );
    const clients = clientsRes.rows;
    console.log(`AGENT STEP 1 SUCCESS: Found ${clients.length} clients`);

    // 2. Build memory context - Cognee recall
    console.log('AGENT STEP 2: Querying Cognee memory recall...');
    let memoryContext = '';
    const targetClientId = clientId || null;

    if (targetClientId) {
      console.log(`AGENT: Querying Cognee for specific clientId: ${targetClientId}`);
      const cogneeResult = await cognee.recall(message, targetClientId, 8).catch((e) => {
        console.error('AGENT: Cognee recall failed (clientId):', e.message);
        return { results: [] };
      });
      const cogneeChunks = Array.isArray(cogneeResult?.results)
        ? cogneeResult.results.map((r: any) => r.content || r.text || '').filter(Boolean)
        : [];
      if (cogneeChunks.length) memoryContext = `\n\nMemory context for this client:\n${cogneeChunks.join('\n---\n')}`;
    } else {
      console.log('AGENT: Checking if query mentions any client name...');
      const mentionedClient = clients.find(c =>
        message.toLowerCase().includes(c.name.toLowerCase()) ||
        (c.company && message.toLowerCase().includes(c.company.toLowerCase()))
      );
      if (mentionedClient) {
        console.log(`AGENT: Client "${mentionedClient.name}" detected in message. Recalling memory...`);
        const cogneeResult = await cognee.recall(message, mentionedClient.id, 8).catch((e) => {
          console.error('AGENT: Cognee recall failed (detected client):', e.message);
          return { results: [] };
        });
        const cogneeChunks = Array.isArray(cogneeResult?.results)
          ? cogneeResult.results.map((r: any) => r.content || r.text || '').filter(Boolean)
          : [];
        if (cogneeChunks.length) memoryContext = `\n\nMemory context for ${mentionedClient.name}:\n${cogneeChunks.join('\n---\n')}`;
      } else {
        console.log('AGENT: No specific client detected in query.');
      }
    }
    console.log('AGENT STEP 2 SUCCESS: Memory context length:', memoryContext.length);

    // 3. Fetch recent meetings for context
    console.log('AGENT STEP 3: Fetching meetings from DB...');
    const meetingsQuery = targetClientId
      ? 'SELECT title, summary, action_items, created_at FROM meetings WHERE user_id=$1 AND client_id=$2 ORDER BY created_at DESC LIMIT 5'
      : 'SELECT title, summary, action_items, created_at FROM meetings WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5';
    const meetingsParams = targetClientId ? [req.userId, targetClientId] : [req.userId];
    const meetingsRes = await pool.query(meetingsQuery, meetingsParams);

    const meetingsSummary = meetingsRes.rows.map(m =>
      `Meeting: ${m.title} (${new Date(m.created_at).toLocaleDateString('en-IN')})\nSummary: ${m.summary || 'N/A'}`
    ).join('\n\n');
    console.log(`AGENT STEP 3 SUCCESS: Found ${meetingsRes.rows.length} meetings`);

    // 4. Fetch pending tasks
    console.log('AGENT STEP 4: Fetching pending tasks from DB...');
    const tasksQuery = targetClientId
      ? `SELECT t.task, t.priority, c.name as client_name FROM tasks t JOIN clients c ON t.client_id=c.id WHERE t.user_id=$1 AND t.client_id=$2 AND t.status='pending' ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END LIMIT 10`
      : `SELECT t.task, t.priority, c.name as client_name FROM tasks t JOIN clients c ON t.client_id=c.id WHERE t.user_id=$1 AND t.status='pending' ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END LIMIT 10`;
    const tasksParams = targetClientId ? [req.userId, targetClientId] : [req.userId];
    const tasksRes = await pool.query(tasksQuery, tasksParams);

    const tasksSummary = tasksRes.rows.map(t =>
      `- [${t.priority}] ${t.task} (${t.client_name})`
    ).join('\n');
    console.log(`AGENT STEP 4 SUCCESS: Found ${tasksRes.rows.length} pending tasks`);

    // 5. Build conversation history string
    console.log('AGENT STEP 5: Structuring chat history...');
    const historyStr = Array.isArray(history) && history.length
      ? history.slice(-6).map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
      : '';

    // 6. Build system prompt
    console.log('AGENT STEP 6: Formatting system prompt...');
    const clientList = clients.map(c =>
      `- ${c.name}${c.company ? ` (${c.company})` : ''} | Health: ${c.health_score}% | Sentiment: ${c.last_sentiment}`
    ).join('\n');

    const systemPrompt = `You are OmniMind AI Agent, an intelligent assistant for a client relationship management system. You have access to the user's client data, meeting history, and memory.

Your clients:
${clientList || 'No clients yet'}

${meetingsSummary ? `Recent meetings:\n${meetingsSummary}` : ''}

${tasksSummary ? `Pending tasks:\n${tasksSummary}` : ''}
${memoryContext}

Instructions:
- Answer questions about clients, meetings, tasks, and business relationships
- Be concise, professional, and helpful
- If asked about a specific client, use the memory context provided
- Format responses clearly using bullet points or numbered lists when appropriate
- If you don't have enough information, say so honestly
- Today's date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    if (!geminiFlash) {
      console.log('AGENT STEP 6 FAILED: geminiFlash is null/undefined!');
      return res.json({ reply: 'AI model not configured. Please set GEMINI_API_KEY in environment.' });
    }

    // 7. Generate response
    console.log('AGENT STEP 7: Generating content via Gemini...');
    const fullPrompt = historyStr
      ? `${systemPrompt}\n\nConversation so far:\n${historyStr}\n\nUser: ${message}\nAssistant:`
      : `${systemPrompt}\n\nUser: ${message}\nAssistant:`;

    const result = await geminiFlash.generateContent(fullPrompt);
    const reply = result.response.text().trim();
    console.log('AGENT STEP 7 SUCCESS: Gemini generated response successfully');

    console.log('--- AGENT CHAT REQUEST SUCCESS ---');
    return res.json({ reply });
  } catch (err: any) {
    console.error('--- AGENT CHAT ROUTE CRITICAL FAILURE ---');
    console.error('Error Object:', err);
    console.error('Error Message:', err?.message);
    console.error('Error Stack:', err?.stack);

    const errMsg = err?.message || String(err);
    logger.error('Agent chat error:', errMsg, err?.stack?.slice(0, 300));
    return res.status(500).json({
      message: 'Server error',
      debug: errMsg,
      stack: err?.stack?.slice(0, 300)
    });
  }
});

export default router;
