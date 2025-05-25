const Joi = require('joi');

// Validation schemas
const schemas = {
  playerName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .required()
    .messages({
      'string.empty': 'Player name is required',
      'string.min': 'Player name must be at least 1 character long',
      'string.max': 'Player name must be less than 50 characters',
      'string.pattern.base': 'Player name can only contain letters, numbers, spaces, hyphens, and underscores'
    }),

  roomCode: Joi.string()
    .trim()
    .length(6)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.empty': 'Room code is required',
      'string.length': 'Room code must be exactly 6 characters',
      'string.pattern.base': 'Room code can only contain uppercase letters and numbers'
    }),

  truthStatement: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Truth statement is required',
      'string.min': 'Truth statement must be at least 10 characters long',
      'string.max': 'Truth statement must be less than 500 characters'
    }),

  vote: Joi.string()
    .valid('truth', 'lie')
    .required()
    .messages({
      'any.only': 'Vote must be either "truth" or "lie"',
      'any.required': 'Vote is required'
    })
};

// Validation functions
const validateInput = {
  // Validate room creation data
  createRoom: (data) => {
    const schema = Joi.object({
      playerName: schemas.playerName
    });

    const { error, value } = schema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  },

  // Validate room joining data
  joinRoom: (data) => {
    const schema = Joi.object({
      roomCode: schemas.roomCode,
      playerName: schemas.playerName
    });

    const { error, value } = schema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  },

  // Validate truth submission
  submitTruth: (data) => {
    const schema = Joi.object({
      statement: schemas.truthStatement
    });

    const { error, value } = schema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  },

  // Validate vote submission
  submitVote: (data) => {
    const schema = Joi.object({
      vote: schemas.vote
    });

    const { error, value } = schema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  },

  // Validate reconnection data
  reconnectPlayer: (data) => {
    const schema = Joi.object({
      roomCode: schemas.roomCode,
      playerName: schemas.playerName
    });

    const { error, value } = schema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  },

  // Validate general text input
  sanitizeText: (text, maxLength = 500) => {
    const schema = Joi.string()
      .trim()
      .max(maxLength)
      .allow('')
      .messages({
        'string.max': `Text must be less than ${maxLength} characters`
      });

    const { error, value } = schema.validate(text);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  },

  // Validate email (for future features)
  email: (email) => {
    const schema = Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      });

    const { error, value } = schema.validate(email);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  },

  // Validate game settings
  gameSettings: (settings) => {
    const schema = Joi.object({
      maxPlayers: Joi.number().integer().min(2).max(50).default(20),
      minTruths: Joi.number().integer().min(1).max(10).default(3),
      maxTruths: Joi.number().integer().min(1).max(10).default(5),
      roundsPerPlayer: Joi.number().integer().min(1).max(5).default(2),
      votingTimeLimit: Joi.number().integer().min(0).max(300).default(0), // 0 = no limit
      discussionTimeLimit: Joi.number().integer().min(0).max(600).default(0) // 0 = no limit
    });

    const { error, value } = schema.validate(settings);
    if (error) {
      throw new Error(error.details[0].message);
    }
    return value;
  }
};

// Express middleware for HTTP requests
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        field: error.details[0].path[0]
      });
    }
    req.validatedData = value;
    next();
  };
};

// Sanitize HTML to prevent XSS
const sanitizeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate and sanitize user input for display
const sanitizeForDisplay = (text, maxLength = 500) => {
  try {
    const validated = validateInput.sanitizeText(text, maxLength);
    return sanitizeHtml(validated);
  } catch (error) {
    throw error;
  }
};

// Rate limiting validation
const validateRateLimit = (action, limit = 10, windowMs = 60000) => {
  const rateLimitStore = new Map();
  
  return (identifier) => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitStore.has(identifier)) {
      rateLimitStore.set(identifier, []);
    }
    
    const requests = rateLimitStore.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= limit) {
      throw new Error(`Rate limit exceeded for ${action}. Try again later.`);
    }
    
    validRequests.push(now);
    rateLimitStore.set(identifier, validRequests);
    
    return true;
  };
};

// Create rate limiters for different actions
const rateLimiters = {
  createRoom: validateRateLimit('room creation', 5, 60000), // 5 rooms per minute
  joinRoom: validateRateLimit('room joining', 10, 60000), // 10 joins per minute
  submitTruth: validateRateLimit('truth submission', 20, 60000), // 20 truths per minute
  submitVote: validateRateLimit('vote submission', 30, 60000) // 30 votes per minute
};

// Comprehensive input validation with rate limiting
const validateWithRateLimit = {
  createRoom: (data, identifier) => {
    rateLimiters.createRoom(identifier);
    return validateInput.createRoom(data);
  },
  
  joinRoom: (data, identifier) => {
    rateLimiters.joinRoom(identifier);
    return validateInput.joinRoom(data);
  },
  
  submitTruth: (data, identifier) => {
    rateLimiters.submitTruth(identifier);
    return validateInput.submitTruth(data);
  },
  
  submitVote: (data, identifier) => {
    rateLimiters.submitVote(identifier);
    return validateInput.submitVote(data);
  }
};

module.exports = {
  validateInput,
  validateRequest,
  validateWithRateLimit,
  sanitizeHtml,
  sanitizeForDisplay,
  schemas
}; 