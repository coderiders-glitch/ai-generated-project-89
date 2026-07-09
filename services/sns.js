const AWS = require('aws-sdk');

class SNSService {
  constructor() {
    this.sns = new AWS.SNS({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
  }

  async sendSMS(phone_number, message) {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(phone_number)) {
        throw new Error('Invalid phone number format');
      }

      const params = {
        Message: message,
        PhoneNumber: this.formatPhoneNumber(phone_number),
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };

      const result = await this.sns.publish(params).promise();
      
      return {
        success: true,
        message_id: result.MessageId,
        phone_number: phone_number
      };
    } catch (error) {
      console.error('SNS SMS sending failed:', error);
      return {
        success: false,
        error: error.message,
        phone_number: phone_number
      };
    }
  }

  async sendBulkSMS(phone_numbers, message) {
    const results = [];
    
    for (const phone_number of phone_numbers) {
      const result = await this.sendSMS(phone_number, message);
      results.push(result);
      
      // Add small delay to avoid rate limiting
      await this.delay(100);
    }
    
    return {
      total_sent: results.filter(r => r.success).length,
      total_failed: results.filter(r => !r.success).length,
      results
    };
  }

  isValidPhoneNumber(phone_number) {
    // Basic validation for US phone numbers
    const phone_regex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
    const cleaned_number = phone_number.replace(/[\s\-\(\)]/g, '');
    return phone_regex.test(cleaned_number);
  }

  formatPhoneNumber(phone_number) {
    // Clean and format phone number for SNS
    let cleaned = phone_number.replace(/[\s\-\(\)]/g, '');
    
    // Add +1 if not present for US numbers
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      }
    }
    
    return cleaned;
  }

  async checkSMSOptOut(phone_number) {
    try {
      const params = {
        phoneNumber: this.formatPhoneNumber(phone_number)
      };
      
      const result = await this.sns.checkIfPhoneNumberIsOptedOut(params).promise();
      return result.isOptedOut;
    } catch (error) {
      console.error('Error checking SMS opt-out status:', error);
      return false; // Assume not opted out if check fails
    }
  }

  async optInPhoneNumber(phone_number) {
    try {
      const params = {
        phoneNumber: this.formatPhoneNumber(phone_number)
      };
      
      await this.sns.optInPhoneNumber(params).promise();
      return { success: true };
    } catch (error) {
      console.error('Error opting in phone number:', error);
      return { success: false, error: error.message };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SNSService;