import { logger } from '../utils/logger';
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@omnimind.ai'

interface MeetingReminderData {
  userEmail: string
  userName: string
  clientName: string
  meetingTime: string
  previousMoM?: string
  actionItems?: { task: string; priority: string; owner?: string }[]
  discussionPoints?: string[]
}

export async function sendPreMeetingReminder(data: MeetingReminderData) {
  try {
    const actionItemsHtml = data.actionItems?.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.task}</strong><br/>
          <small style="color: #666;">Priority: <span style="background: ${
            item.priority === 'high' ? '#fecaca' : item.priority === 'medium' ? '#fde047' : '#c7f0d8'
          }; padding: 2px 8px; border-radius: 4px; color: #000;">${item.priority}</span></small>
        </td>
      </tr>
    `).join('') || '<tr><td style="padding: 10px;">No action items</td></tr>'

    const discussionPointsHtml = data.discussionPoints?.map(point => `
      <li style="padding: 8px 0; font-size: 14px;">${point}</li>
    `).join('') || '<li style="padding: 8px 0; color: #999;">No specific points</li>'

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 30px; }
            .section { margin-bottom: 25px; }
            .section h2 { color: #1f2937; font-size: 16px; font-weight: 600; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
            .meeting-info { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; border-radius: 4px; }
            .meeting-info p { margin: 8px 0; color: #1e40af; font-size: 14px; }
            .action-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .discussion-list { list-style: none; padding: 0; margin: 0; }
            .cta-button { display: inline-block; background: #4f46e5; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 10px; }
            .footer { background: #f3f4f6; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Meeting Reminder</h1>
              <p>You have an upcoming meeting with ${data.clientName}</p>
            </div>

            <div class="content">
              <div class="section">
                <div class="meeting-info">
                  <p><strong>Client:</strong> ${data.clientName}</p>
                  <p><strong>Scheduled:</strong> ${data.meetingTime}</p>
                  <p><strong>Prepared by:</strong> OmniMind AI</p>
                </div>
              </div>

              ${data.previousMoM ? `
              <div class="section">
                <h2>📝 Previous Meeting Summary</h2>
                <p style="color: #374151; font-size: 14px; line-height: 1.6;">${data.previousMoM}</p>
              </div>
              ` : ''}

              <div class="section">
                <h2>✅ Action Items from Previous Meeting</h2>
                <table class="action-table">
                  ${actionItemsHtml}
                </table>
              </div>

              <div class="section">
                <h2>💬 Discussion Points for Today</h2>
                <ul class="discussion-list">
                  ${discussionPointsHtml}
                </ul>
              </div>

              <div class="section">
                <p style="color: #6b7280; font-size: 14px;">
                  <strong>💡 Tip:</strong> Review the action items and previous summary before the meeting to make the most of your time.
                </p>
              </div>
            </div>

            <div class="footer">
              <p>This email was sent by OmniMind AI • Your Enterprise Memory System</p>
              <p>© 2026 OmniMind. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    await sgMail.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `📅 Meeting Reminder: ${data.clientName} - Tomorrow at ${data.meetingTime}`,
      html: emailHtml,
    })

    logger.info(`Pre-meeting reminder sent to ${data.userEmail}`)
    return true
  } catch (err) {
    logger.error('Error sending pre-meeting reminder:', err)
    return false
  }
}

export async function sendMeetingSummaryEmail(data: {
  userEmail: string
  userName: string
  clientName: string
  momSummary: string
  actionItems: { task: string; priority: string }[]
  nextSteps: string[]
}) {
  try {
    const actionItemsHtml = data.actionItems.map(item => `
      <li style="padding: 8px 0; margin-left: 20px;">
        <strong>${item.task}</strong>
        <span style="background: ${
          item.priority === 'high' ? '#fecaca' : item.priority === 'medium' ? '#fde047' : '#c7f0d8'
        }; padding: 2px 8px; border-radius: 3px; margin-left: 8px; font-size: 12px;">${item.priority}</span>
      </li>
    `).join('')

    const nextStepsHtml = data.nextSteps.map(step => `
      <li style="padding: 6px 0; margin-left: 20px;">${step}</li>
    `).join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .section { margin-bottom: 25px; }
            .section h2 { color: #1f2937; font-size: 16px; font-weight: 600; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
            .mom-content { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; line-height: 1.6; color: #1b5e20; }
            .footer { background: #f3f4f6; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Meeting Summary</h1>
              <p>Minutes of Meeting with ${data.clientName}</p>
            </div>

            <div class="content">
              <div class="section">
                <h2>📋 Meeting Minutes</h2>
                <div class="mom-content">${data.momSummary}</div>
              </div>

              <div class="section">
                <h2>✅ Action Items</h2>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${actionItemsHtml}
                </ul>
              </div>

              <div class="section">
                <h2>🎯 Next Steps</h2>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${nextStepsHtml}
                </ul>
              </div>
            </div>

            <div class="footer">
              <p>This summary was automatically generated by OmniMind AI</p>
              <p>© 2026 OmniMind. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    await sgMail.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `✓ Meeting Summary: ${data.clientName}`,
      html: emailHtml,
    })

    logger.info(`Meeting summary sent to ${data.userEmail}`)
    return true
  } catch (err) {
    logger.error('Error sending meeting summary:', err)
    return false
  }
}
