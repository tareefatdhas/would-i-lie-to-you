const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token for a user
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Authentication token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid authentication token');
    } else {
      logger.error('Error verifying JWT token:', error);
      throw new Error('Authentication failed');
    }
  }
};

// Express middleware for HTTP authentication (for future API endpoints)
const authenticateRequest = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
      
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    logger.warn('Optional auth failed:', error.message);
    next();
  }
};

// Socket.io authentication middleware
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      // For now, allow connections without tokens (anonymous play)
      socket.isAuthenticated = false;
      socket.user = null;
      return next();
    }

    const decoded = verifyToken(token);
    socket.isAuthenticated = true;
    socket.user = decoded;
    
    logger.info(`Authenticated socket connection: ${socket.id} for user: ${decoded.id}`);
    next();
  } catch (error) {
    logger.warn(`Socket authentication failed for ${socket.id}:`, error.message);
    
    // For now, allow connections even if authentication fails (anonymous play)
    socket.isAuthenticated = false;
    socket.user = null;
    next();
  }
};

// Create a session token for anonymous users (for reconnection purposes)
const createSessionToken = (socketId, playerName, roomCode) => {
  const payload = {
    type: 'session',
    socketId,
    playerName,
    roomCode,
    createdAt: Date.now()
  };
  
  return generateToken(payload);
};

// Verify session token
const verifySessionToken = (token) => {
  try {
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'session') {
      throw new Error('Invalid session token type');
    }
    
    return decoded;
  } catch (error) {
    throw error;
  }
};

// Rate limiting for authentication attempts
const authRateLimiter = new Map();

const checkAuthRateLimit = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!authRateLimiter.has(identifier)) {
    authRateLimiter.set(identifier, []);
  }
  
  const attempts = authRateLimiter.get(identifier);
  
  // Remove old attempts outside the window
  const validAttempts = attempts.filter(timestamp => timestamp > windowStart);
  
  if (validAttempts.length >= maxAttempts) {
    throw new Error('Too many authentication attempts. Please try again later.');
  }
  
  validAttempts.push(now);
  authRateLimiter.set(identifier, validAttempts);
  
  return true;
};

// Middleware to check authentication rate limiting
const authRateLimitMiddleware = (req, res, next) => {
  try {
    const identifier = req.ip || req.connection.remoteAddress;
    checkAuthRateLimit(identifier);
    next();
  } catch (error) {
    return res.status(429).json({
      success: false,
      error: error.message
    });
  }
};

// Generate a secure room access token (for private rooms in future)
const generateRoomToken = (roomCode, playerName, permissions = ['play']) => {
  const payload = {
    type: 'room_access',
    roomCode,
    playerName,
    permissions,
    createdAt: Date.now()
  };
  
  return generateToken(payload);
};

// Verify room access token
const verifyRoomToken = (token, requiredPermission = 'play') => {
  try {
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'room_access') {
      throw new Error('Invalid room access token');
    }
    
    if (!decoded.permissions.includes(requiredPermission)) {
      throw new Error('Insufficient permissions');
    }
    
    return decoded;
  } catch (error) {
    throw error;
  }
};

// Clean up expired rate limit entries
const cleanupRateLimitStore = () => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const cutoff = now - windowMs;
  
  for (const [identifier, attempts] of authRateLimiter.entries()) {
    const validAttempts = attempts.filter(timestamp => timestamp > cutoff);
    
    if (validAttempts.length === 0) {
      authRateLimiter.delete(identifier);
    } else {
      authRateLimiter.set(identifier, validAttempts);
    }
  }
};

// Clean up rate limit store every 30 minutes
setInterval(cleanupRateLimitStore, 30 * 60 * 1000);

// Utility function to extract user info from request
const getUserFromRequest = (req) => {
  return req.user || null;
};

// Utility function to check if user has permission
const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission) || user.permissions.includes('admin');
};

// Middleware to require specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    const user = getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!hasPermission(user, permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateRequest,
  optionalAuth,
  authenticateSocket,
  createSessionToken,
  verifySessionToken,
  authRateLimitMiddleware,
  generateRoomToken,
  verifyRoomToken,
  getUserFromRequest,
  hasPermission,
  requirePermission,
  checkAuthRateLimit
}; 