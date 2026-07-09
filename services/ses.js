const AWS = require('aws-sdk');

class SESService {
  constructor() {
    this.ses = new AWS.SES({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    
    this.from_email = process.env.FROM_EMAIL || 'noreply@example.com';
    this.from_name = process.env.FROM_NAME || 'Mental Health Support';
  }

  async sendEmail(to_email, subject, text_content, html_content = null) {
    try {
      // Validate email format
      if (!this.isValidEmail(to_email)) {
        throw new Error('Invalid email address format');
      }

      const params = {
        Source: `${this.from_name} <${this.from_email}>`,
        Destination: {
          ToAddresses: [to_email]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Text: {
              Data: text_content,
              Charset: 'UTF-8'
            }
          }
        }
      };

      // Add HTML content if provided
      if (html_content) {
        params.Message.Body.Html = {
          Data: html_content,
          Charset: 'UTF-8'
        };
      }

      const result = await this.ses.sendEmail(params).promise();
      
      return {
        success: true,
        message_id: result.MessageId,
        to_email: to_email
      };
    } catch (error) {
      console.error('SES email sending failed:', error);
      return {
        success: false,
        error: error.message,
        to_email: to_email
      };
    }
  }

  async sendBulkEmail(to_emails, subject, text_content, html_content = null) {
    const results = [];
    
    for (const to_email of to_emails) {
      const result = await this.sendEmail(to_email, subject, text_content, html_content);
      results.push(result);
      
      // Add small delay to avoid rate limiting
      await this.delay(50);
    }
    
    return {
      total_sent: results.filter(r => r.success).length,
      total_failed: results.filter(r => !r.success).length,
      results
    };
  }

  async sendTemplatedEmail(to_email, template_name, template_data) {
    try {
      if (!this.isValidEmail(to_email)) {
        throw new Error('Invalid email address format');
      }

      const params = {
        Source: `${this.from_name} <${this.from_email}>`,
        Destination: {
          ToAddresses: [to_email]
        },
        Template: template_name,
        TemplateData: JSON.stringify(template_data)
      };

      const result = await this.ses.sendTemplatedEmail(params).promise();
      
      return {
        success: true,
        message_id: result.MessageId,
        to_email: to_email,
        template_name: template_name
      };
    } catch (error) {
      console.error('SES templated email sending failed:', error);
      return {
        success: false,
        error: error.message,
        to_email: to_email,
        template_name: template_name
      };
    }
  }

  async verifyEmailAddress(email) {
    try {
      const params = {
        EmailAddress: email
      };
      
      await this.ses.verifyEmailIdentity(params).promise();
      return { success: true, email: email };
    } catch (error) {
      console.error('Email verification failed:', error);
      return { success: false, error: error.message, email: email };
    }
  }

  async getVerificationStatus(email) {
    try {
      const params = {
        Identities: [email]
      };
      
      const result = await this.ses.getIdentityVerificationAttributes(params).promise();
      const verification_status = result.VerificationAttributes[email];
      
      return {
        email: email,
        verification_status: verification_status ? verification_status.VerificationStatus : 'NotStarted'
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return {
        email: email,
        verification_status: 'Error',
        error: error.message
      };
    }
  }

  async getSendQuota() {
    try {
      const result = await this.ses.getSendQuota().promise();
      return {
        max_24_hour_send: result.Max24HourSend,
        max_send_rate: result.MaxSendRate,
        sent_last_24_hours: result.SentLast24Hours
      };
    } catch (error) {
      console.error('Error getting send quota:', error);
      return { error: error.message };
    }
  }

  isValidEmail(email) {
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email_regex.test(email);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SESService;