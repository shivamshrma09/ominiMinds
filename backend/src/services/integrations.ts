import { logger } from '../utils/logger';
import axios from 'axios';

export async function fetchSlackMessages(channelName: string, limit = 20): Promise<string> {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token || !channelName) return '';

    // Get channel list
    const chRes = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 200 },
    });

    const clean = channelName.replace('#', '');
    const channel = chRes.data.channels?.find((c: any) => c.name === clean);
    if (!channel) return '';

    // Get messages
    const msgRes = await axios.get('https://slack.com/api/conversations.history', {
      headers: { Authorization: `Bearer ${token}` },
      params: { channel: channel.id, limit },
    });

    const messages = msgRes.data.messages || [];
    return messages.map((m: any) => m.text).filter(Boolean).join('\n');
  } catch (err) {
    logger.error('Slack fetch error:', err);
    return '';
  }
}

export async function fetchNotionPage(pageUrl: string): Promise<string> {
  try {
    const token = process.env.NOTION_CLIENT_ID;
    if (!token || !pageUrl) return '';

    const pageId = pageUrl.split('-').pop()?.split('?')[0] || '';
    if (!pageId) return '';

    const res = await axios.get(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_CLIENT_SECRET}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const blocks = res.data.results || [];
    return blocks
      .map((b: any) => b[b.type]?.rich_text?.map((t: any) => t.plain_text).join('') || '')
      .filter(Boolean)
      .join('\n');
  } catch (err) {
    logger.error('Notion fetch error:', err);
    return '';
  }
}
