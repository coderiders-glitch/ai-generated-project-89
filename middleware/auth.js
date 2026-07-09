const authService = require('../services/auth');

class AuthMiddleware {
  static async authenticate(req, res, next) {
    try {
      const authorization = req.headers.authorization;
      
      if (!authorization) {
        return res.status(401).json({
          error: 'Authorization header required',
          status_code: 401
        });
      }

      const token = authorization.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          error: 'Bearer token required',
          status_code: 401
        });
      }

      // Verify JWT token
      const decoded = authService.verifyJWT(token);
      
      // Get user info from Cognito
      const user_info = await authService.getUserInfo(decoded.access_token || token);
      
      req.user = user_info;
      req.user_id = user_info.user_id;
      
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: error.message,
        status_code: 401
      });
    }
  }

  static async optionalAuth(req, res, next) {
    try {
      const authorization = req.headers.authorization;
      
      if (authorization) {
        const token = authorization.split(' ')[1];
        
        if (token) {
          try {
            const decoded = authService.verifyJWT(token);
            const user_info = await authService.getUserInfo(decoded.access_token || token);
            
            req.user = user_info;
            req.user_id = user_info.user_id;
          } catch (error) {
            // Optional auth - continue without user
            req.user = null;
            req.user_id = null;
          }
        }
      } else {
        req.user = null;
        req.user_id = null;
      }
      
      next();
    } catch (error) {
      req.user = null;
      req.user_id = null;
      next();
    }
  }

  static requireRole(required_role) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required',
            status_code: 401
          });
        }

        const user_role = req.user.role || 'user';
        
        if (user_role !== required_role && user_role !== 'admin') {
          return res.status(403).json({
            error: 'Insufficient permissions',
            required_role: required_role,
            user_role: user_role,
            status_code: 403
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          error: 'Authorization check failed',
          message: error.message,
          status_code: 500
        });
      }
    };
  }

  static requireActiveUser(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          status_code: 401
        });
      }

      if (!req.user.is_active) {
        return res.status(403).json({
          error: 'Account is inactive',
          status_code: 403
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: 'User status check failed',
        message: error.message,
        status_code: 500
      });
    }
  }

  static extractUserId(req, res, next) {
    try {
      if (req.user && req.user.user_id) {
        req.user_id = req.user.user_id;
      } else {
        req.user_id = null;
      }
      
      next();
    } catch (error) {
      req.user_id = null;
      next();
    }
  }
}

module.exports = AuthMiddleware;