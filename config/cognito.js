const cognitoConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

// Validate required configuration
function validateConfig() {
  const required_fields = ['userPoolId', 'clientId', 'accessKeyId', 'secretAccessKey'];
  const missing_fields = [];

  required_fields.forEach(field => {
    if (!cognitoConfig[field]) {
      missing_fields.push(field);
    }
  });

  if (missing_fields.length > 0) {
    throw new Error(`Missing required Cognito configuration: ${missing_fields.join(', ')}`);
  }
}

// AWS SDK configuration
function configureAWS() {
  const AWS = require('aws-sdk');
  
  AWS.config.update({
    region: cognitoConfig.region,
    accessKeyId: cognitoConfig.accessKeyId,
    secretAccessKey: cognitoConfig.secretAccessKey
  });
}

// Initialize configuration
function initializeCognito() {
  try {
    validateConfig();
    configureAWS();
    
    console.log('Cognito configuration initialized successfully');
    console.log(`Region: ${cognitoConfig.region}`);
    console.log(`User Pool ID: ${cognitoConfig.userPoolId}`);
    
    return true;
  } catch (error) {
    console.error('Cognito configuration failed:', error.message);
    return false;
  }
}

// Export configuration and utilities
module.exports = {
  cognitoConfig,
  validateConfig,
  configureAWS,
  initializeCognito,
  
  // Helper functions
  isConfigured: () => {
    try {
      validateConfig();
      return true;
    } catch (error) {
      return false;
    }
  },
  
  getRegion: () => cognitoConfig.region,
  getUserPoolId: () => cognitoConfig.userPoolId,
  getClientId: () => cognitoConfig.clientId,
  getIdentityPoolId: () => cognitoConfig.identityPoolId
};