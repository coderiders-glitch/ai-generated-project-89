const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { cognitoConfig, validateConfig } = require('../config/cognito');

class AuthService {
  constructor() {
    // Validate all required Cognito configuration using centralized validation
    try {
      validateConfig();
    } catch (error) {
      throw new Error(`Cognito configuration validation failed: ${error.message}`);
    }
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    this.cognito = new AWS.CognitoIdentityServiceProvider({
      region: cognitoConfig.region
    });
    this.userPoolId = cognitoConfig.userPoolId;
    this.clientId = cognitoConfig.clientId;
    this.jwtSecret = process.env.JWT_SECRET;
  }

  async signUp(username, email, password, first_name, last_name) {
    try {
      const params = {
        ClientId: this.clientId,
        Username: username,
        Password: password,
        UserAttributes: [
          {
            Name: 'email',
            Value: email
          },
          {
            Name: 'given_name',
            Value: first_name
          },
          {
            Name: 'family_name',
            Value: last_name
          }
        ]
      };

      const result = await this.cognito.signUp(params).promise();
      return {
        user_id: result.UserSub,
        username: username,
        email: email,
        status: 'UNCONFIRMED'
      };
    } catch (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }
  }

  async confirmSignUp(username, confirmation_code) {
    try {
      const params = {
        ClientId: this.clientId,
        Username: username,
        ConfirmationCode: confirmation_code
      };

      await this.cognito.confirmSignUp(params).promise();
      return { status: 'CONFIRMED' };
    } catch (error) {
      throw new Error(`Confirmation failed: ${error.message}`);
    }
  }

  async signIn(username, password) {
    try {
      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      };

      const result = await this.cognito.initiateAuth(params).promise();
      
      if (result.AuthenticationResult) {
        const token = this.generateJWT({
          user_id: result.AuthenticationResult.AccessToken,
          username: username
        });

        return {
          token: token,
          access_token: result.AuthenticationResult.AccessToken,
          refresh_token: result.AuthenticationResult.RefreshToken,
          expires_in: result.AuthenticationResult.ExpiresIn
        };
      }

      throw new Error('Authentication failed');
    } catch (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }
  }

  async refreshToken(refresh_token) {
    try {
      const params = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refresh_token
        }
      };

      const result = await this.cognito.initiateAuth(params).promise();
      
      if (result.AuthenticationResult) {
        return {
          access_token: result.AuthenticationResult.AccessToken,
          expires_in: result.AuthenticationResult.ExpiresIn
        };
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async signOut(access_token) {
    try {
      const params = {
        AccessToken: access_token
      };

      await this.cognito.globalSignOut(params).promise();
      return { status: 'SIGNED_OUT' };
    } catch (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  async getUserInfo(access_token) {
    try {
      const params = {
        AccessToken: access_token
      };

      const result = await this.cognito.getUser(params).promise();
      
      const user_info = {
        user_id: result.Username,
        username: result.Username,
        email: null,
        first_name: null,
        last_name: null,
        is_active: true
      };

      result.UserAttributes.forEach(attr => {
        switch (attr.Name) {
          case 'email':
            user_info.email = attr.Value;
            break;
          case 'given_name':
            user_info.first_name = attr.Value;
            break;
          case 'family_name':
            user_info.last_name = attr.Value;
            break;
        }
      });

      return user_info;
    } catch (error) {
      throw new Error(`Get user info failed: ${error.message}`);
    }
  }

  generateJWT(payload) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  verifyJWT(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async changePassword(access_token, previous_password, proposed_password) {
    try {
      const params = {
        AccessToken: access_token,
        PreviousPassword: previous_password,
        ProposedPassword: proposed_password
      };

      await this.cognito.changePassword(params).promise();
      return { status: 'PASSWORD_CHANGED' };
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  async forgotPassword(username) {
    try {
      const params = {
        ClientId: this.clientId,
        Username: username
      };

      await this.cognito.forgotPassword(params).promise();
      return { status: 'RESET_CODE_SENT' };
    } catch (error) {
      throw new Error(`Forgot password failed: ${error.message}`);
    }
  }

  async confirmForgotPassword(username, confirmation_code, new_password) {
    try {
      const params = {
        ClientId: this.clientId,
        Username: username,
        ConfirmationCode: confirmation_code,
        Password: new_password
      };

      await this.cognito.confirmForgotPassword(params).promise();
      return { status: 'PASSWORD_RESET' };
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }
}

module.exports = new AuthService();