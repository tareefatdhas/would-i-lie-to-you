const { v4: uuidv4 } = require('uuid');
const Room = require('./Room');
const Player = require('./Player');
const LieGenerator = require('./LieGenerator');
const logger = require('../utils/logger');

class GameManager {
  constructor() {
    this.rooms = new Map();
    this.players = new Map();
    this.totalGamesPlayed = 0;
    this.lieGenerator = new LieGenerator();
    
    // Cleanup inactive rooms every 30 minutes
    setInterval(() => this.cleanupInactiveRooms(), 30 * 60 * 1000);
  }

  // Generate unique room code
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  // Create a new room
  async createRoom(socketId, playerName) {
    try {
      const roomCode = this.generateRoomCode();
      const room = new Room(roomCode);
      const player = new Player(socketId, playerName, true); // Host
      
      room.addPlayer(player);
      this.rooms.set(roomCode, room);
      this.players.set(socketId, { player, roomCode });
      
      logger.info(`Room ${roomCode} created by ${playerName}`);
      
      return {
        success: true,
        roomCode,
        room: room.getPublicData(),
        player: player.getPublicData()
      };
    } catch (error) {
      logger.error('Error creating room:', error);
      return { success: false, error: 'Failed to create room' };
    }
  }

  // Join existing room
  async joinRoom(socketId, roomCode, playerName) {
    try {
      const room = this.rooms.get(roomCode.toUpperCase());
      
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (room.isFull()) {
        return { success: false, error: 'Room is full' };
      }

      if (room.hasPlayerWithName(playerName)) {
        return { success: false, error: 'Player name already taken' };
      }

      if (room.gameStarted) {
        return { success: false, error: 'Game already in progress' };
      }

      const player = new Player(socketId, playerName, false);
      room.addPlayer(player);
      this.players.set(socketId, { player, roomCode: roomCode.toUpperCase() });
      
      logger.info(`Player ${playerName} joined room ${roomCode}`);
      
      return {
        success: true,
        room: room.getPublicData(),
        player: player.getPublicData()
      };
    } catch (error) {
      logger.error('Error joining room:', error);
      return { success: false, error: 'Failed to join room' };
    }
  }

  // Submit a truth statement
  async submitTruth(socketId, statement) {
    try {
      const playerData = this.players.get(socketId);
      if (!playerData) {
        return { success: false, error: 'Player not found' };
      }

      const { player, roomCode } = playerData;
      const room = this.rooms.get(roomCode);
      
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (room.gameStarted) {
        return { success: false, error: 'Cannot submit truths after game has started' };
      }

      const result = player.addTruth(statement);
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        player: player.getPublicData(),
        room: room.getPublicData()
      };
    } catch (error) {
      logger.error('Error submitting truth:', error);
      return { success: false, error: 'Failed to submit truth' };
    }
  }

  // Start the game
  async startGame(socketId) {
    try {
      const playerData = this.players.get(socketId);
      if (!playerData) {
        return { success: false, error: 'Player not found' };
      }

      const { player, roomCode } = playerData;
      const room = this.rooms.get(roomCode);
      
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (!player.isHost) {
        return { success: false, error: 'Only the host can start the game' };
      }

      if (room.players.size < 2) {
        return { success: false, error: 'Need at least 2 players to start' };
      }

      if (!room.allPlayersReady()) {
        return { success: false, error: 'All players must submit at least 3 truths' };
      }

      room.startGame();
      this.totalGamesPlayed++;
      
      const firstRound = await this.prepareNextRound(room);
      
      return {
        success: true,
        gameState: {
          ...room.getPublicData(),
          currentRound: firstRound
        }
      };
    } catch (error) {
      logger.error('Error starting game:', error);
      return { success: false, error: 'Failed to start game' };
    }
  }

  // Prepare next round
  async prepareNextRound(room) {
    try {
      const availablePlayers = Array.from(room.players.values())
        .filter(player => player.hasUnusedTruths());
      
      if (availablePlayers.length === 0) {
        room.gameComplete = true;
        return null;
      }

      // Select random player
      const currentPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
      
      // Decide truth or lie (60% chance of truth)
      const useTruth = Math.random() < 0.6;
      let statement, isTrue;
      
      if (useTruth) {
        const unusedTruths = currentPlayer.getUnusedTruths();
        if (unusedTruths.length > 0) {
          statement = unusedTruths[Math.floor(Math.random() * unusedTruths.length)];
          currentPlayer.markTruthAsUsed(statement);
          isTrue = true;
        } else {
          // Fallback to lie if no unused truths
          statement = this.lieGenerator.generateLie(currentPlayer);
          isTrue = false;
        }
      } else {
        statement = this.lieGenerator.generateLie(currentPlayer);
        isTrue = false;
      }

      const round = {
        roundNumber: room.currentRound,
        currentPlayer: currentPlayer.getPublicData(),
        statement,
        isTrue,
        votes: new Map(),
        votingComplete: false
      };

      room.currentRoundData = round;
      
      return {
        roundNumber: round.roundNumber,
        currentPlayer: round.currentPlayer,
        statement: round.statement
      };
    } catch (error) {
      logger.error('Error preparing next round:', error);
      throw error;
    }
  }

  // Submit vote
  async submitVote(socketId, vote) {
    try {
      const playerData = this.players.get(socketId);
      if (!playerData) {
        return { success: false, error: 'Player not found' };
      }

      const { player, roomCode } = playerData;
      const room = this.rooms.get(roomCode);
      
      if (!room || !room.gameStarted) {
        return { success: false, error: 'Game not in progress' };
      }

      if (!room.currentRoundData) {
        return { success: false, error: 'No active round' };
      }

      if (room.currentRoundData.votingComplete) {
        return { success: false, error: 'Voting already complete' };
      }

      if (room.currentRoundData.currentPlayer.id === player.id) {
        return { success: false, error: 'Cannot vote on your own statement' };
      }

      if (room.currentRoundData.votes.has(player.id)) {
        return { success: false, error: 'Already voted this round' };
      }

      // Record vote
      room.currentRoundData.votes.set(player.id, vote);
      
      const totalVoters = room.players.size - 1; // Exclude current player
      const votesReceived = room.currentRoundData.votes.size;
      const allVotesIn = votesReceived >= totalVoters;

      return {
        success: true,
        allVotesIn,
        votesReceived,
        totalVoters
      };
    } catch (error) {
      logger.error('Error submitting vote:', error);
      return { success: false, error: 'Failed to submit vote' };
    }
  }

  // End current round
  async endRound(roomCode) {
    try {
      const room = this.rooms.get(roomCode);
      if (!room || !room.currentRoundData) {
        throw new Error('Invalid room or round data');
      }

      const round = room.currentRoundData;
      round.votingComplete = true;

      // Calculate results
      const votes = Array.from(round.votes.values());
      const truthVotes = votes.filter(v => v === 'truth').length;
      const lieVotes = votes.filter(v => v === 'lie').length;

      // Award points to correct guessers
      round.votes.forEach((vote, playerId) => {
        const player = room.getPlayerById(playerId);
        if (player) {
          const correct = (vote === 'truth' && round.isTrue) || (vote === 'lie' && !round.isTrue);
          if (correct) {
            player.addScore(1);
          }
        }
      });

      // Bonus points for current player if they fooled people with a lie
      if (!round.isTrue) {
        const currentPlayer = room.getPlayerById(round.currentPlayer.id);
        if (currentPlayer) {
          currentPlayer.addScore(truthVotes); // Points for each person fooled
        }
      }

      room.currentRound++;
      
      // Check if game should end
      const gameComplete = room.currentRound > room.players.size * 2 || 
                          !Array.from(room.players.values()).some(p => p.hasUnusedTruths());

      return {
        roundResults: {
          statement: round.statement,
          isTrue: round.isTrue,
          currentPlayer: round.currentPlayer,
          truthVotes,
          lieVotes,
          correctGuessers: Array.from(round.votes.entries())
            .filter(([playerId, vote]) => 
              (vote === 'truth' && round.isTrue) || (vote === 'lie' && !round.isTrue)
            )
            .map(([playerId]) => room.getPlayerById(playerId)?.getPublicData())
            .filter(Boolean)
        },
        scoreboard: Array.from(room.players.values())
          .map(p => p.getPublicData())
          .sort((a, b) => b.score - a.score),
        gameComplete
      };
    } catch (error) {
      logger.error('Error ending round:', error);
      throw error;
    }
  }

  // Start next round
  async nextRound(roomCode) {
    try {
      const room = this.rooms.get(roomCode);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (room.gameComplete) {
        return { success: false, error: 'Game already complete' };
      }

      const nextRoundData = await this.prepareNextRound(room);
      
      if (!nextRoundData) {
        room.gameComplete = true;
        return { success: false, error: 'No more rounds available' };
      }

      return {
        success: true,
        roundData: nextRoundData
      };
    } catch (error) {
      logger.error('Error starting next round:', error);
      return { success: false, error: 'Failed to start next round' };
    }
  }

  // End game
  async endGame(roomCode) {
    try {
      const room = this.rooms.get(roomCode);
      if (!room) {
        throw new Error('Room not found');
      }

      room.gameComplete = true;
      
      const finalScores = Array.from(room.players.values())
        .map(p => p.getPublicData())
        .sort((a, b) => b.score - a.score);

      const winner = finalScores[0];

      return {
        finalResults: {
          winner,
          finalScores,
          totalRounds: room.currentRound - 1,
          gameStats: {
            totalPlayers: room.players.size,
            totalStatements: Array.from(room.players.values())
              .reduce((sum, p) => sum + p.truths.length, 0)
          }
        }
      };
    } catch (error) {
      logger.error('Error ending game:', error);
      throw error;
    }
  }

  // Reset game
  async resetGame(socketId) {
    try {
      const playerData = this.players.get(socketId);
      if (!playerData) {
        return { success: false, error: 'Player not found' };
      }

      const { player, roomCode } = playerData;
      const room = this.rooms.get(roomCode);
      
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (!player.isHost) {
        return { success: false, error: 'Only the host can reset the game' };
      }

      room.reset();
      
      return { success: true };
    } catch (error) {
      logger.error('Error resetting game:', error);
      return { success: false, error: 'Failed to reset game' };
    }
  }

  // Handle player disconnection
  async playerDisconnected(socketId) {
    try {
      const playerData = this.players.get(socketId);
      if (!playerData) {
        return { roomExists: false };
      }

      const { player, roomCode } = playerData;
      const room = this.rooms.get(roomCode);
      
      if (!room) {
        this.players.delete(socketId);
        return { roomExists: false };
      }

      room.removePlayer(player.id);
      this.players.delete(socketId);

      // If room is empty or host left, clean up
      if (room.players.size === 0 || (player.isHost && room.players.size > 0)) {
        if (player.isHost && room.players.size > 0) {
          // Transfer host to another player
          const newHost = Array.from(room.players.values())[0];
          newHost.isHost = true;
        }
      }

      if (room.players.size === 0) {
        this.rooms.delete(roomCode);
        return { roomExists: false };
      }

      return {
        roomExists: true,
        players: Array.from(room.players.values()).map(p => p.getPublicData())
      };
    } catch (error) {
      logger.error('Error handling player disconnection:', error);
      return { roomExists: false };
    }
  }

  // Reconnect player
  async reconnectPlayer(socketId, roomCode, playerName) {
    try {
      const room = this.rooms.get(roomCode.toUpperCase());
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      const existingPlayer = room.getPlayerByName(playerName);
      if (!existingPlayer) {
        return { success: false, error: 'Player not found in room' };
      }

      // Update socket ID
      existingPlayer.socketId = socketId;
      this.players.set(socketId, { player: existingPlayer, roomCode: roomCode.toUpperCase() });

      return {
        success: true,
        room: room.getPublicData(),
        gameState: room.gameStarted ? {
          currentRound: room.currentRoundData ? {
            roundNumber: room.currentRoundData.roundNumber,
            currentPlayer: room.currentRoundData.currentPlayer,
            statement: room.currentRoundData.statement
          } : null,
          scoreboard: Array.from(room.players.values()).map(p => p.getPublicData())
        } : null
      };
    } catch (error) {
      logger.error('Error reconnecting player:', error);
      return { success: false, error: 'Failed to reconnect' };
    }
  }

  // Cleanup inactive rooms
  cleanupInactiveRooms() {
    const now = Date.now();
    const inactiveThreshold = 2 * 60 * 60 * 1000; // 2 hours

    for (const [roomCode, room] of this.rooms.entries()) {
      if (now - room.lastActivity > inactiveThreshold) {
        // Remove all players from this room
        for (const player of room.players.values()) {
          this.players.delete(player.socketId);
        }
        this.rooms.delete(roomCode);
        logger.info(`Cleaned up inactive room: ${roomCode}`);
      }
    }
  }

  // Get statistics
  getActiveRoomsCount() {
    return this.rooms.size;
  }

  getActivePlayersCount() {
    return this.players.size;
  }

  getTotalGamesPlayed() {
    return this.totalGamesPlayed;
  }
}

module.exports = GameManager; 