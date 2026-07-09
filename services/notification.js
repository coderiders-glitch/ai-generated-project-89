const SNSService = require('./sns');
const SESService = require('./ses');
const { User } = require('../models');

class NotificationService {
  constructor() {
    this.snsService = new SNSService();
    this.sesService = new SESService();
  }

  async sendCrisisAlert(user_id, crisis_data) {
    try {
      const user = await User.findById(user_id);
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      const alert_message = this.formatCrisisMessage(crisis_data);
      const results = [];

      // Send SMS if phone number available
      if (user.phone_number) {
        const sms_result = await this.snsService.sendSMS(user.phone_number, alert_message);
        results.push({ type: 'sms', status: sms_result.success ? 'sent' : 'failed', message_id: sms_result.message_id });
      }

      // Send email notification
      if (user.email) {
        const email_result = await this.sesService.sendEmail(
          user.email,
          'Crisis Alert - Immediate Support Available',
          alert_message,
          this.formatCrisisEmailHTML(crisis_data)
        );
        results.push({ type: 'email', status: email_result.success ? 'sent' : 'failed', message_id: email_result.message_id });
      }

      return {
        success: results.some(r => r.status === 'sent'),
        user_id,
        notifications_sent: results
      };
    } catch (error) {
      console.error('Crisis alert sending failed:', error);
      return {
        success: false,
        error: error.message,
        user_id
      };
    }
  }

  async sendAssessmentReminder(user_id, assessment_type) {
    try {
      const user = await User.findById(user_id);
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      const reminder_message = this.formatReminderMessage(assessment_type);
      const results = [];

      // Send email reminder
      if (user.email) {
        const email_result = await this.sesService.sendEmail(
          user.email,
          'Assessment Reminder - Check In With Yourself',
          reminder_message,
          this.formatReminderEmailHTML(assessment_type)
        );
        results.push({ type: 'email', status: email_result.success ? 'sent' : 'failed', message_id: email_result.message_id });
      }

      return {
        success: results.some(r => r.status === 'sent'),
        user_id,
        notifications_sent: results
      };
    } catch (error) {
      console.error('Assessment reminder sending failed:', error);
      return {
        success: false,
        error: error.message,
        user_id
      };
    }
  }

  async sendBulkNotification(user_ids, message, subject = 'Important Update') {
    const results = [];
    
    for (const user_id of user_ids) {
      try {
        const user = await User.findById(user_id);
        if (!user || !user.is_active) {
          results.push({ user_id, status: 'skipped', reason: 'User not found or inactive' });
          continue;
        }

        const notification_results = [];

        if (user.email) {
          const email_result = await this.sesService.sendEmail(user.email, subject, message);
          notification_results.push({ type: 'email', status: email_result.success ? 'sent' : 'failed' });
        }

        results.push({
          user_id,
          status: notification_results.some(r => r.status === 'sent') ? 'sent' : 'failed',
          notifications: notification_results
        });
      } catch (error) {
        results.push({ user_id, status: 'error', error: error.message });
      }
    }

    return {
      total_users: user_ids.length,
      successful_notifications: results.filter(r => r.status === 'sent').length,
      failed_notifications: results.filter(r => r.status === 'failed' || r.status === 'error').length,
      results
    };
  }

  formatCrisisMessage(crisis_data) {
    const severity = crisis_data.severity || 'moderate';
    const base_message = 'We noticed you may be experiencing distress. You are not alone, and help is available.';
    
    if (severity === 'high') {
      return `${base_message} If you are in immediate danger, please call 911 or go to your nearest emergency room. For crisis support, call 988 (Suicide & Crisis Lifeline).`;
    }
    
    return `${base_message} Consider reaching out to a mental health professional or calling 988 (Suicide & Crisis Lifeline) for support.`;
  }

  formatCrisisEmailHTML(crisis_data) {
    const severity = crisis_data.severity || 'moderate';
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #d32f2f;">Crisis Support Available</h2>
            <p>We noticed you may be experiencing distress. You are not alone, and help is available.</p>
            ${severity === 'high' ? 
              '<p style="background: #ffebee; padding: 15px; border-left: 4px solid #d32f2f;"><strong>If you are in immediate danger, please call 911 or go to your nearest emergency room.</strong></p>' : 
              ''
            }
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Crisis Resources:</h3>
              <ul>
                <li><strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988</li>
                <li><strong>Crisis Text Line:</strong> Text HOME to 741741</li>
                <li><strong>National Domestic Violence Hotline:</strong> 1-800-799-7233</li>
              </ul>
            </div>
            <p>Remember: This is temporary, you matter, and support is available.</p>
          </div>
        </body>
      </html>
    `;
  }

  formatReminderMessage(assessment_type) {
    return `Hi! It's time for your ${assessment_type} check-in. Taking a few minutes to assess your mental health can help you stay aware of your wellbeing. Please log in to complete your assessment when you have a moment.`;
  }

  formatReminderEmailHTML(assessment_type) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1976d2;">Assessment Reminder</h2>
            <p>Hi! It's time for your <strong>${assessment_type}</strong> check-in.</p>
            <p>Taking a few minutes to assess your mental health can help you stay aware of your wellbeing and identify when you might benefit from additional support.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Assessment</a>
            </div>
            <p style="font-size: 14px; color: #666;">This assessment takes approximately 2-3 minutes to complete.</p>
          </div>
        </body>
      </html>
    `;
  }
}

module.exports = NotificationService;