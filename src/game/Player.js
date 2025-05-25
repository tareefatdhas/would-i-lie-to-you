const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(socketId, name, isHost = false) {
    this.id = uuidv4();
    this.socketId = socketId;
    this.name = name;
    this.isHost = isHost;
    this.truths = [];
    this.usedTruths = new Set();
    this.score = 0;
    this.isConnected = true;
    this.joinedAt = new Date();
    this.lastActivity = Date.now();
  }

  // Add a truth statement
  addTruth(statement) {
    const trimmedStatement = statement.trim();
    
    if (!trimmedStatement) {
      return { success: false, error: 'Truth statement cannot be empty' };
    }

    if (trimmedStatement.length < 10) {
      return { success: false, error: 'Truth statement must be at least 10 characters long' };
    }

    if (trimmedStatement.length > 500) {
      return { success: false, error: 'Truth statement must be less than 500 characters' };
    }

    if (this.truths.length >= 5) {
      return { success: false, error: 'Cannot submit more than 5 truths' };
    }

    // Check for duplicate truths
    if (this.truths.some(truth => truth.toLowerCase() === trimmedStatement.toLowerCase())) {
      return { success: false, error: 'You have already submitted this truth' };
    }

    this.truths.push(trimmedStatement);
    this.updateActivity();
    
    return { success: true };
  }

  // Remove a truth statement
  removeTruth(index) {
    if (index >= 0 && index < this.truths.length) {
      const removedTruth = this.truths.splice(index, 1)[0];
      this.usedTruths.delete(removedTruth);
      this.updateActivity();
      return { success: true, removedTruth };
    }
    return { success: false, error: 'Invalid truth index' };
  }

  // Clear all truths
  clearTruths() {
    this.truths = [];
    this.usedTruths.clear();
    this.updateActivity();
  }

  // Get unused truths
  getUnusedTruths() {
    return this.truths.filter(truth => !this.usedTruths.has(truth));
  }

  // Check if player has unused truths
  hasUnusedTruths() {
    return this.getUnusedTruths().length > 0;
  }

  // Mark a truth as used
  markTruthAsUsed(truth) {
    this.usedTruths.add(truth);
    this.updateActivity();
  }

  // Reset used truths
  resetUsedTruths() {
    this.usedTruths.clear();
    this.updateActivity();
  }

  // Add score
  addScore(points) {
    this.score += points;
    this.updateActivity();
  }

  // Reset score
  resetScore() {
    this.score = 0;
    this.updateActivity();
  }

  // Update connection status
  setConnected(connected) {
    this.isConnected = connected;
    this.updateActivity();
  }

  // Update last activity
  updateActivity() {
    this.lastActivity = Date.now();
  }

  // Check if player is ready to play
  isReady() {
    return this.truths.length >= 3;
  }

  // Get player statistics
  getStats() {
    return {
      totalTruths: this.truths.length,
      usedTruths: this.usedTruths.size,
      unusedTruths: this.getUnusedTruths().length,
      score: this.score,
      isReady: this.isReady(),
      isConnected: this.isConnected,
      joinedAt: this.joinedAt,
      lastActivity: this.lastActivity
    };
  }

  // Get public player data (safe to send to clients)
  getPublicData() {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      truthCount: this.truths.length,
      score: this.score,
      isReady: this.isReady(),
      isConnected: this.isConnected,
      joinedAt: this.joinedAt
    };
  }

  // Get detailed data for the player themselves
  getPrivateData() {
    return {
      ...this.getPublicData(),
      truths: this.truths,
      usedTruths: Array.from(this.usedTruths),
      unusedTruths: this.getUnusedTruths(),
      stats: this.getStats()
    };
  }

  // Validate player data
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Player name is required');
    }

    if (this.name && this.name.length > 50) {
      errors.push('Player name must be less than 50 characters');
    }

    if (this.truths.length > 5) {
      errors.push('Player cannot have more than 5 truths');
    }

    this.truths.forEach((truth, index) => {
      if (!truth || truth.trim().length === 0) {
        errors.push(`Truth ${index + 1} is empty`);
      }
      if (truth && truth.length > 500) {
        errors.push(`Truth ${index + 1} is too long`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Export player data for persistence
  toJSON() {
    return {
      id: this.id,
      socketId: this.socketId,
      name: this.name,
      isHost: this.isHost,
      truths: this.truths,
      usedTruths: Array.from(this.usedTruths),
      score: this.score,
      isConnected: this.isConnected,
      joinedAt: this.joinedAt,
      lastActivity: this.lastActivity
    };
  }

  // Import player data from persistence
  static fromJSON(data) {
    const player = new Player(data.socketId, data.name, data.isHost);
    player.id = data.id;
    player.truths = data.truths || [];
    player.usedTruths = new Set(data.usedTruths || []);
    player.score = data.score || 0;
    player.isConnected = data.isConnected !== undefined ? data.isConnected : true;
    player.joinedAt = new Date(data.joinedAt);
    player.lastActivity = data.lastActivity || Date.now();
    return player;
  }

  // Create a copy of the player with a new socket ID (for reconnection)
  reconnect(newSocketId) {
    this.socketId = newSocketId;
    this.isConnected = true;
    this.updateActivity();
    return this;
  }

  // Check if player has been inactive for too long
  isInactive(thresholdMs = 30 * 60 * 1000) { // 30 minutes default
    return Date.now() - this.lastActivity > thresholdMs;
  }

  // Get a sanitized version for logging
  getLogData() {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      truthCount: this.truths.length,
      score: this.score,
      isConnected: this.isConnected
    };
  }
}

module.exports = Player; 