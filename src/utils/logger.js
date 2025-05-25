const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create transports array
const transports = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat
    })
  );
} else {
  // Console transport for production (less verbose)
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: logFormat
    })
  );
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      level: 'info',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  );

  // HTTP access log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'access.log'),
      level: 'http',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: logFormat
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: logFormat
    })
  );
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Helper functions for structured logging
const logWithContext = (level, message, context = {}) => {
  logger.log(level, message, {
    timestamp: new Date().toISOString(),
    ...context
  });
};

// Game-specific logging helpers
const gameLogger = {
  roomCreated: (roomCode, hostName, playerCount = 1) => {
    logWithContext('info', 'Room created', {
      event: 'room_created',
      roomCode,
      hostName,
      playerCount
    });
  },

  playerJoined: (roomCode, playerName, playerCount) => {
    logWithContext('info', 'Player joined room', {
      event: 'player_joined',
      roomCode,
      playerName,
      playerCount
    });
  },

  playerLeft: (roomCode, playerName, playerCount) => {
    logWithContext('info', 'Player left room', {
      event: 'player_left',
      roomCode,
      playerName,
      playerCount
    });
  },

  gameStarted: (roomCode, playerCount, hostName) => {
    logWithContext('info', 'Game started', {
      event: 'game_started',
      roomCode,
      playerCount,
      hostName
    });
  },

  gameEnded: (roomCode, playerCount, duration, winner) => {
    logWithContext('info', 'Game ended', {
      event: 'game_ended',
      roomCode,
      playerCount,
      duration,
      winner
    });
  },

  roundStarted: (roomCode, roundNumber, currentPlayer) => {
    logWithContext('debug', 'Round started', {
      event: 'round_started',
      roomCode,
      roundNumber,
      currentPlayer
    });
  },

  voteSubmitted: (roomCode, roundNumber, voterName, vote) => {
    logWithContext('debug', 'Vote submitted', {
      event: 'vote_submitted',
      roomCode,
      roundNumber,
      voterName,
      vote
    });
  },

  truthSubmitted: (roomCode, playerName, truthCount) => {
    logWithContext('debug', 'Truth submitted', {
      event: 'truth_submitted',
      roomCode,
      playerName,
      truthCount
    });
  },

  error: (event, error, context = {}) => {
    logWithContext('error', `Game error: ${event}`, {
      event: 'game_error',
      errorType: event,
      error: error.message,
      stack: error.stack,
      ...context
    });
  }
};

// Performance logging helpers
const performanceLogger = {
  start: (operation, context = {}) => {
    const startTime = Date.now();
    return {
      end: (additionalContext = {}) => {
        const duration = Date.now() - startTime;
        logWithContext('debug', `Performance: ${operation}`, {
          event: 'performance',
          operation,
          duration,
          ...context,
          ...additionalContext
        });
        return duration;
      }
    };
  },

  measure: (operation, fn, context = {}) => {
    const timer = performanceLogger.start(operation, context);
    try {
      const result = fn();
      timer.end({ success: true });
      return result;
    } catch (error) {
      timer.end({ success: false, error: error.message });
      throw error;
    }
  },

  measureAsync: async (operation, fn, context = {}) => {
    const timer = performanceLogger.start(operation, context);
    try {
      const result = await fn();
      timer.end({ success: true });
      return result;
    } catch (error) {
      timer.end({ success: false, error: error.message });
      throw error;
    }
  }
};

// Security logging helpers
const securityLogger = {
  suspiciousActivity: (event, details, clientInfo = {}) => {
    logWithContext('warn', `Security: ${event}`, {
      event: 'security_alert',
      alertType: event,
      details,
      clientInfo,
      severity: 'medium'
    });
  },

  authFailure: (reason, clientInfo = {}) => {
    logWithContext('warn', 'Authentication failure', {
      event: 'auth_failure',
      reason,
      clientInfo
    });
  },

  rateLimitExceeded: (action, clientInfo = {}) => {
    logWithContext('warn', 'Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      action,
      clientInfo
    });
  },

  invalidInput: (inputType, value, clientInfo = {}) => {
    logWithContext('warn', 'Invalid input detected', {
      event: 'invalid_input',
      inputType,
      value: typeof value === 'string' ? value.substring(0, 100) : value,
      clientInfo
    });
  }
};

// System logging helpers
const systemLogger = {
  startup: (config) => {
    logWithContext('info', 'Application starting', {
      event: 'app_startup',
      config: {
        nodeEnv: config.NODE_ENV,
        port: config.PORT,
        version: config.VERSION
      }
    });
  },

  shutdown: (reason) => {
    logWithContext('info', 'Application shutting down', {
      event: 'app_shutdown',
      reason
    });
  },

  healthCheck: (status, metrics) => {
    logWithContext('debug', 'Health check', {
      event: 'health_check',
      status,
      metrics
    });
  },

  resourceUsage: (usage) => {
    logWithContext('debug', 'Resource usage', {
      event: 'resource_usage',
      ...usage
    });
  }
};

// Export the logger with additional helpers
module.exports = Object.assign(logger, {
  gameLogger,
  performanceLogger,
  securityLogger,
  systemLogger,
  logWithContext
});

// Create logs directory if it doesn't exist (for production)
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} 