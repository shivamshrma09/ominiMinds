import { logger } from '../utils/logger';
import cron from 'node-cron';
import { pool } from '../config/db';
import { processClientSources } from './memoryProcessor';
import { sendPreMeetingReminder } from './email';
import { generateDiscussionPoints } from './gemini';

export function initScheduler() {
  // Run every 2 hours - sync max 3 clients at a time, staggered to avoid Gemini rate limits
  cron.schedule('0 */2 * * *', async () => {
    try {
      const res = await pool.query(
        `SELECT id, user_id FROM clients
         WHERE last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '6 hours'
         ORDER BY last_synced_at ASC NULLS FIRST
         LIMIT 3`
      );
      for (let i = 0; i < res.rows.length; i++) {
        const row = res.rows[i];
        // 60s delay between each client to avoid rate limits
        setTimeout(() => {
          processClientSources(row.id, row.user_id)
            .then(() => pool.query('UPDATE clients SET last_synced_at=NOW() WHERE id=$1', [row.id]))
            .catch(err => logger.error('scheduled sync error:', err));
        }, i * 60000);
      }
      if (res.rows.length > 0) logger.info(`Scheduled sync for ${res.rows.length} clients (staggered 60s apart)`);
    } catch (err) {
      logger.error('scheduler error:', err);
    }
  });

  // Run every hour - send pre-meeting reminders (for meetings tomorrow)
  cron.schedule('0 * * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tomorrow_end = new Date(tomorrow);
      tomorrow_end.setDate(tomorrow_end.getDate() + 1);

      const scheduledMeetings = await pool.query(
        `SELECT m.*, u.email as user_email, u.name as user_name, c.name as client_name
         FROM scheduled_meetings m
         JOIN users u ON m.user_id = u.id
         JOIN clients c ON m.client_id = c.id
         WHERE m.scheduled_at >= $1 AND m.scheduled_at < $2 AND m.reminder_sent = false`,
        [tomorrow, tomorrow_end]
      );

      for (const meeting of scheduledMeetings.rows) {
        const previousMeeting = await pool.query(
          'SELECT summary, action_items, transcript FROM meetings WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
          [meeting.client_id]
        );

        const prevMeeting = previousMeeting.rows[0];
        let actionItems: any[] = [];
        let discussionPoints: string[] = [];

        if (prevMeeting) {
          try { actionItems = JSON.parse(prevMeeting.action_items) || []; } catch { actionItems = []; }
          if (prevMeeting.transcript) {
            discussionPoints = await generateDiscussionPoints([prevMeeting.transcript]).catch(() => []);
          }
        }

        await sendPreMeetingReminder({
          userEmail: meeting.user_email,
          userName: meeting.user_name,
          clientName: meeting.client_name,
          meetingTime: new Date(meeting.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          previousMoM: prevMeeting?.summary || undefined,
          actionItems,
          discussionPoints,
        });

        await pool.query('UPDATE scheduled_meetings SET reminder_sent = true WHERE id = $1', [meeting.id]);
      }

      if (scheduledMeetings.rows.length > 0)
        logger.info(`Sent ${scheduledMeetings.rows.length} pre-meeting reminders`);
    } catch (err) {
      logger.error('pre-meeting reminder scheduler error:', err);
    }
  });

  logger.info('Scheduler started: syncs every 2h (staggered), reminders every 1h');
}

export default { initScheduler };
