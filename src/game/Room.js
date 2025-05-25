const { v4: uuidv4 } = require('uuid');

class Room {
  constructor(roomCode) {
    this.id = uuidv4();
    this.roomCode = roomCode;
    this.players = new Map();
    this.gameStarted = false;
    this.gameComplete = false;
    this.currentRound = 1;
    this.currentRoundData = null;
    this.maxPlayers = parseInt(process.env.MAX_PLAYERS_PER_ROOM) || 20;
    this.createdAt = new Date();
    this.lastActivity = Date.now();
    this.gameSettings = {
      minTruths: 3,
      maxTruths: 5,
      roundsPerPlayer: 2
    };
  }

  // Add player to room
  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('Room is full');
    }

    if (this.hasPlayerWithName(player.name)) {
      throw new Error('Player name already taken');
    }

    this.players.set(player.id, player);
    this.updateActivity();
    return true;
  }

  // Remove player from room
  removePlayer(playerId) {
    const removed = this.players.delete(playerId);
    if (removed) {
      this.updateActivity();
    }
    return removed;
  }

  // Check if room is full
  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  // Check if player name exists
  hasPlayerWithName(name) {
    return Array.from(this.players.values()).some(player => 
      player.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Get player by ID
  getPlayerById(playerId) {
    return this.players.get(playerId);
  }

  // Get player by name
  getPlayerByName(name) {
    return Array.from(this.players.values()).find(player => 
      player.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Get host player
  getHost() {
    return Array.from(this.players.values()).find(player => player.isHost);
  }

  // Check if all players are ready (have minimum truths)
  allPlayersReady() {
    if (this.players.size < 2) return false;
    
    return Array.from(this.players.values()).every(player => 
      player.truths.length >= this.gameSettings.minTruths
    );
  }

  // Start the game
  startGame() {
    if (!this.allPlayersReady()) {
      throw new Error('Not all players are ready');
    }

    this.gameStarted = true;
    this.gameComplete = false;
    this.currentRound = 1;
    this.currentRoundData = null;
    
    // Reset all player scores
    Array.from(this.players.values()).forEach(player => {
      player.resetScore();
      player.resetUsedTruths();
    });

    this.updateActivity();
  }

  // Reset the game
  reset() {
    this.gameStarted = false;
    this.gameComplete = false;
    this.currentRound = 1;
    this.currentRoundData = null;
    
    // Reset all players
    Array.from(this.players.values()).forEach(player => {
      player.resetScore();
      player.resetUsedTruths();
      player.clearTruths();
    });

    this.updateActivity();
  }

  // Update last activity timestamp
  updateActivity() {
    this.lastActivity = Date.now();
  }

  // Get public room data (safe to send to clients)
  getPublicData() {
    return {
      id: this.id,
      roomCode: this.roomCode,
      players: Array.from(this.players.values()).map(player => player.getPublicData()),
      gameStarted: this.gameStarted,
      gameComplete: this.gameComplete,
      currentRound: this.currentRound,
      maxPlayers: this.maxPlayers,
      playerCount: this.players.size,
      host: this.getHost()?.getPublicData() || null,
      allPlayersReady: this.allPlayersReady(),
      gameSettings: this.gameSettings,
      createdAt: this.createdAt
    };
  }

  // Get game statistics
  getGameStats() {
    const players = Array.from(this.players.values());
    return {
      totalPlayers: players.length,
      totalTruths: players.reduce((sum, player) => sum + player.truths.length, 0),
      averageTruths: players.length > 0 ? 
        players.reduce((sum, player) => sum + player.truths.length, 0) / players.length : 0,
      readyPlayers: players.filter(player => 
        player.truths.length >= this.gameSettings.minTruths
      ).length,
      currentRound: this.currentRound,
      gameStarted: this.gameStarted,
      gameComplete: this.gameComplete
    };
  }

  // Check if room should be cleaned up
  shouldCleanup() {
    const inactiveThreshold = 2 * 60 * 60 * 1000; // 2 hours
    return this.players.size === 0 || 
           (Date.now() - this.lastActivity > inactiveThreshold);
  }

  // Validate room state
  validateState() {
    const errors = [];

    if (this.players.size === 0) {
      errors.push('Room has no players');
    }

    if (this.gameStarted && !this.allPlayersReady()) {
      errors.push('Game started but not all players are ready');
    }

    if (this.gameStarted && this.players.size < 2) {
      errors.push('Game started with less than 2 players');
    }

    const host = this.getHost();
    if (!host) {
      errors.push('Room has no host');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Export room data for persistence
  toJSON() {
    return {
      id: this.id,
      roomCode: this.roomCode,
      players: Array.from(this.players.entries()),
      gameStarted: this.gameStarted,
      gameComplete: this.gameComplete,
      currentRound: this.currentRound,
      currentRoundData: this.currentRoundData,
      maxPlayers: this.maxPlayers,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      gameSettings: this.gameSettings
    };
  }

  // Import room data from persistence
  static fromJSON(data) {
    const room = new Room(data.roomCode);
    room.id = data.id;
    room.gameStarted = data.gameStarted;
    room.gameComplete = data.gameComplete;
    room.currentRound = data.currentRound;
    room.currentRoundData = data.currentRoundData;
    room.maxPlayers = data.maxPlayers;
    room.createdAt = new Date(data.createdAt);
    room.lastActivity = data.lastActivity;
    room.gameSettings = data.gameSettings;

    // Restore players
    if (data.players && Array.isArray(data.players)) {
      data.players.forEach(([playerId, playerData]) => {
        const Player = require('./Player');
        const player = Player.fromJSON(playerData);
        room.players.set(playerId, player);
      });
    }

    return room;
  }
}

module.exports = Room; 