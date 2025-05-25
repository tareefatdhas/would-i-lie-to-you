const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const GameManager = require('./src/game/GameManager');
const logger = require('./src/utils/logger');
const { validateInput } = require('./src/middleware/validation');
const { authenticateSocket } = require('./src/middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3000;
const gameManager = new GameManager();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));

app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeRooms: gameManager.getActiveRoomsCount(),
    activePlayers: gameManager.getActivePlayersCount()
  });
});

// API Routes
app.get('/api/stats', (req, res) => {
  res.json({
    activeRooms: gameManager.getActiveRoomsCount(),
    activePlayers: gameManager.getActivePlayersCount(),
    totalGamesPlayed: gameManager.getTotalGamesPlayed()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`New connection: ${socket.id}`);

  // Join room
  socket.on('join-room', async (data) => {
    try {
      const { roomCode, playerName } = validateInput.joinRoom(data);
      const result = await gameManager.joinRoom(socket.id, roomCode, playerName);
      
      if (result.success) {
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.playerName = playerName;
        
        socket.emit('joined-room', {
          success: true,
          room: result.room,
          player: result.player
        });
        
        // Notify other players
        socket.to(roomCode).emit('player-joined', {
          player: result.player,
          players: result.room.players
        });
        
        logger.info(`Player ${playerName} joined room ${roomCode}`);
      } else {
        socket.emit('joined-room', { success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Error joining room:', error);
      socket.emit('joined-room', { success: false, error: 'Invalid input data' });
    }
  });

  // Create room
  socket.on('create-room', async (data) => {
    try {
      const { playerName } = validateInput.createRoom(data);
      const result = await gameManager.createRoom(socket.id, playerName);
      
      if (result.success) {
        socket.join(result.roomCode);
        socket.roomCode = result.roomCode;
        socket.playerName = playerName;
        
        socket.emit('room-created', {
          success: true,
          roomCode: result.roomCode,
          room: result.room,
          player: result.player
        });
        
        logger.info(`Room ${result.roomCode} created by ${playerName}`);
      } else {
        socket.emit('room-created', { success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Error creating room:', error);
      socket.emit('room-created', { success: false, error: 'Invalid input data' });
    }
  });

  // Submit truth
  socket.on('submit-truth', async (data) => {
    try {
      const { statement } = validateInput.submitTruth(data);
      const result = await gameManager.submitTruth(socket.id, statement);
      
      if (result.success) {
        socket.emit('truth-submitted', { success: true });
        
        // Notify room about updated player status
        io.to(socket.roomCode).emit('player-updated', {
          player: result.player,
          players: result.room.players
        });
      } else {
        socket.emit('truth-submitted', { success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Error submitting truth:', error);
      socket.emit('truth-submitted', { success: false, error: 'Invalid input data' });
    }
  });

  // Start game
  socket.on('start-game', async () => {
    try {
      const result = await gameManager.startGame(socket.id);
      
      if (result.success) {
        io.to(socket.roomCode).emit('game-started', {
          success: true,
          gameState: result.gameState
        });
        
        logger.info(`Game started in room ${socket.roomCode}`);
      } else {
        socket.emit('game-started', { success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Error starting game:', error);
      socket.emit('game-started', { success: false, error: 'Failed to start game' });
    }
  });

  // Submit vote
  socket.on('submit-vote', async (data) => {
    try {
      const { vote } = validateInput.submitVote(data);
      const result = await gameManager.submitVote(socket.id, vote);
      
      if (result.success) {
        socket.emit('vote-submitted', { success: true });
        
        // Check if all votes are in
        if (result.allVotesIn) {
          const roundResult = await gameManager.endRound(socket.roomCode);
          io.to(socket.roomCode).emit('round-ended', roundResult);
          
          // Check if game is complete
          if (roundResult.gameComplete) {
            const finalResults = await gameManager.endGame(socket.roomCode);
            io.to(socket.roomCode).emit('game-ended', finalResults);
          }
        } else {
          // Update voting status
          io.to(socket.roomCode).emit('vote-status-updated', {
            votesReceived: result.votesReceived,
            totalVoters: result.totalVoters
          });
        }
      } else {
        socket.emit('vote-submitted', { success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Error submitting vote:', error);
      socket.emit('vote-submitted', { success: false, error: 'Invalid vote data' });
    }
  });

  // Next round
  socket.on('next-round', async () => {
    try {
      const result = await gameManager.nextRound(socket.roomCode);
      
      if (result.success) {
        io.to(socket.roomCode).emit('new-round', result.roundData);
      } else {
        socket.emit('next-round-error', { error: result.error });
      }
    } catch (error) {
      logger.error('Error starting next round:', error);
      socket.emit('next-round-error', { error: 'Failed to start next round' });
    }
  });

  // Reset game
  socket.on('reset-game', async () => {
    try {
      const result = await gameManager.resetGame(socket.id);
      
      if (result.success) {
        io.to(socket.roomCode).emit('game-reset', { success: true });
        logger.info(`Game reset in room ${socket.roomCode}`);
      } else {
        socket.emit('game-reset', { success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Error resetting game:', error);
      socket.emit('game-reset', { success: false, error: 'Failed to reset game' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    logger.info(`Player disconnected: ${socket.id}`);
    
    if (socket.roomCode && socket.playerName) {
      const result = await gameManager.playerDisconnected(socket.id);
      
      if (result.roomExists) {
        socket.to(socket.roomCode).emit('player-disconnected', {
          playerName: socket.playerName,
          players: result.players
        });
      }
    }
  });

  // Handle reconnection
  socket.on('reconnect-player', async (data) => {
    try {
      const { roomCode, playerName } = validateInput.reconnectPlayer(data);
      const result = await gameManager.reconnectPlayer(socket.id, roomCode, playerName);
      
      if (result.success) {
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.playerName = playerName;
        
        socket.emit('reconnected', {
          success: true,
          room: result.room,
          gameState: result.gameState
        });
        
        socket.to(roomCode).emit('player-reconnected', {
          playerName: playerName,
          players: result.room.players
        });
        
        logger.info(`Player ${playerName} reconnected to room ${roomCode}`);
      } else {
        socket.emit('reconnected', { success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Error reconnecting player:', error);
      socket.emit('reconnected', { success: false, error: 'Failed to reconnect' });
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io }; 