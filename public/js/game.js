// Game state management
class GameState {
    constructor() {
        this.socket = null;
        this.currentRoom = null;
        this.currentPlayer = null;
        this.gamePhase = 'home'; // home, setup, playing, results
        this.players = [];
        this.myTruths = [];
        this.currentRound = null;
        this.scoreboard = [];
        this.connectionStatus = 'disconnected';
        this.isHost = false;
        this.hasVoted = false;
    }

    reset() {
        this.currentRoom = null;
        this.currentPlayer = null;
        this.gamePhase = 'home';
        this.players = [];
        this.myTruths = [];
        this.currentRound = null;
        this.scoreboard = [];
        this.isHost = false;
        this.hasVoted = false;
    }
}

// Initialize game state
const gameState = new GameState();

// DOM elements
const elements = {
    // Screens
    homeScreen: document.getElementById('home-screen'),
    setupPhase: document.getElementById('setup-phase'),
    gamePhase: document.getElementById('game-phase'),
    finalResults: document.getElementById('final-results'),
    
    // Connection status
    connectionStatus: document.getElementById('connection-status'),
    
    // Home screen
    playerNameInput: document.getElementById('player-name'),
    roomCodeInput: document.getElementById('room-code'),
    createBtn: document.getElementById('create-btn-text'),
    createBtnLoading: document.getElementById('create-btn-loading'),
    joinBtn: document.getElementById('join-btn-text'),
    joinBtnLoading: document.getElementById('join-btn-loading'),
    
    // Setup phase
    currentRoomCode: document.getElementById('current-room-code'),
    truthInput: document.getElementById('truth-input'),
    truthCharCount: document.getElementById('truth-char-count'),
    addTruthText: document.getElementById('add-truth-text'),
    addTruthLoading: document.getElementById('add-truth-loading'),
    truthsList: document.getElementById('truths-list'),
    playersList: document.getElementById('players-list'),
    playerCount: document.getElementById('player-count'),
    startBtn: document.getElementById('start-btn'),
    startBtnText: document.getElementById('start-btn-text'),
    startBtnLoading: document.getElementById('start-btn-loading'),
    
    // Game phase
    roundNumber: document.getElementById('round-number'),
    currentPlayerName: document.getElementById('current-player-name'),
    currentStatement: document.getElementById('current-statement'),
    votingSection: document.getElementById('voting-section'),
    votingStatus: document.getElementById('voting-status'),
    roundResults: document.getElementById('round-results'),
    revealText: document.getElementById('reveal-text'),
    votesBreakdown: document.getElementById('votes-breakdown'),
    nextRoundBtn: document.getElementById('next-round-btn'),
    scoreboard: document.getElementById('scoreboard'),
    
    // Final results
    finalScoreboard: document.getElementById('final-scoreboard'),
    
    // Notification container
    notificationContainer: document.getElementById('notification-container')
};

// Initialize socket connection
function initializeSocket() {
    console.log('Initializing socket connection...');
    gameState.socket = io({
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    // Connection events
    gameState.socket.on('connect', () => {
        console.log('Socket connected successfully');
        gameState.connectionStatus = 'connected';
        updateConnectionStatus();
        showNotification('Connected to server', 'success');
    });

    gameState.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        gameState.connectionStatus = 'disconnected';
        updateConnectionStatus();
        showNotification('Disconnected from server', 'error');
    });

    gameState.socket.on('reconnect', () => {
        console.log('Socket reconnected');
        gameState.connectionStatus = 'connected';
        updateConnectionStatus();
        showNotification('Reconnected to server', 'success');
        
        // Try to rejoin room if we were in one
        if (gameState.currentRoom && gameState.currentPlayer) {
            attemptReconnection();
        }
    });

    gameState.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        gameState.connectionStatus = 'disconnected';
        updateConnectionStatus();
        showNotification('Connection failed', 'error');
    });

    // Game events
    setupGameEventListeners();
}

// Setup game event listeners
function setupGameEventListeners() {
    // Room creation
    gameState.socket.on('room-created', (data) => {
        console.log('Received room-created event:', data);
        if (data.success) {
            gameState.currentRoom = data.roomCode;
            gameState.currentPlayer = data.player;
            gameState.isHost = data.player.isHost;
            showSetupPhase();
            showNotification(`Room ${data.roomCode} created!`, 'success');
        } else {
            showNotification(data.error, 'error');
        }
        toggleCreateButton(false);
    });

    // Room joining
    gameState.socket.on('joined-room', (data) => {
        if (data.success) {
            gameState.currentRoom = data.room.roomCode;
            gameState.currentPlayer = data.player;
            gameState.isHost = data.player.isHost;
            gameState.players = data.room.players;
            showSetupPhase();
            showNotification(`Joined room ${data.room.roomCode}!`, 'success');
        } else {
            showNotification(data.error, 'error');
        }
        toggleJoinButton(false);
    });

    // Player events
    gameState.socket.on('player-joined', (data) => {
        gameState.players = data.players;
        updatePlayersDisplay();
        showNotification(`${data.player.name} joined the game`, 'info');
    });

    gameState.socket.on('player-left', (data) => {
        gameState.players = data.players;
        updatePlayersDisplay();
        showNotification(`${data.playerName} left the game`, 'info');
    });

    gameState.socket.on('player-disconnected', (data) => {
        gameState.players = data.players;
        updatePlayersDisplay();
        showNotification(`${data.playerName} disconnected`, 'warning');
    });

    gameState.socket.on('player-reconnected', (data) => {
        gameState.players = data.players;
        updatePlayersDisplay();
        showNotification(`${data.playerName} reconnected`, 'success');
    });

    gameState.socket.on('player-updated', (data) => {
        gameState.players = data.players;
        updatePlayersDisplay();
        updateStartButton();
    });

    // Truth submission
    gameState.socket.on('truth-submitted', (data) => {
        if (data.success) {
            showNotification('Truth submitted!', 'success');
            elements.truthInput.value = '';
            updateCharCount();
        } else {
            showNotification(data.error, 'error');
        }
        toggleAddTruthButton(false);
    });

    // Game start
    gameState.socket.on('game-started', (data) => {
        if (data.success) {
            gameState.gamePhase = 'playing';
            gameState.currentRound = data.gameState.currentRound;
            showGamePhase();
            showNotification('Game started!', 'success');
        } else {
            showNotification(data.error, 'error');
        }
        toggleStartButton(false);
    });

    // Round events
    gameState.socket.on('new-round', (data) => {
        gameState.currentRound = data;
        gameState.hasVoted = false;
        updateRoundDisplay();
        showVotingSection();
    });

    gameState.socket.on('vote-status-updated', (data) => {
        updateVotingStatus(data.votesReceived, data.totalVoters);
    });

    gameState.socket.on('round-ended', (data) => {
        showRoundResults(data);
        updateScoreboard(data.scoreboard);
    });

    gameState.socket.on('game-ended', (data) => {
        showFinalResults(data.finalResults);
    });

    // Vote submission
    gameState.socket.on('vote-submitted', (data) => {
        if (data.success) {
            gameState.hasVoted = true;
            disableVoteButtons();
            showNotification('Vote submitted!', 'success');
        } else {
            showNotification(data.error, 'error');
        }
    });

    // Game reset
    gameState.socket.on('game-reset', (data) => {
        if (data.success) {
            resetGameState();
            showNotification('Game reset!', 'info');
        }
    });

    // Error handling
    gameState.socket.on('error', (data) => {
        showNotification(data.error || 'An error occurred', 'error');
    });
}

// UI Functions
function showScreen(screenId) {
    // Hide all screens
    elements.homeScreen.classList.add('hidden');
    elements.setupPhase.classList.add('hidden');
    elements.gamePhase.classList.add('hidden');
    elements.finalResults.classList.add('hidden');
    
    // Show target screen
    document.getElementById(screenId).classList.remove('hidden');
}

function showSetupPhase() {
    showScreen('setup-phase');
    elements.currentRoomCode.textContent = gameState.currentRoom;
    updatePlayersDisplay();
    updateStartButton();
}

function showGamePhase() {
    showScreen('game-phase');
    updateRoundDisplay();
}

function showFinalResults(results) {
    showScreen('final-results');
    displayFinalResults(results);
}

function updateConnectionStatus() {
    const status = elements.connectionStatus;
    status.className = `connection-status ${gameState.connectionStatus}`;
    
    switch (gameState.connectionStatus) {
        case 'connected':
            status.innerHTML = '🟢 Connected';
            break;
        case 'connecting':
            status.innerHTML = '<span class="loading"></span>Connecting...';
            break;
        case 'disconnected':
            status.innerHTML = '🔴 Disconnected';
            break;
    }
}

// Room management functions
function createRoom() {
    console.log('createRoom function called');
    const playerName = elements.playerNameInput.value.trim();
    console.log('Player name:', playerName);
    
    if (!playerName) {
        showNotification('Please enter your name', 'error');
        return;
    }

    if (playerName.length > 50) {
        showNotification('Name must be less than 50 characters', 'error');
        return;
    }

    console.log('About to emit create-room event');
    console.log('Socket state:', gameState.socket ? 'connected' : 'not connected');
    
    toggleCreateButton(true);
    gameState.socket.emit('create-room', { playerName });
}

function joinRoom() {
    const playerName = elements.playerNameInput.value.trim();
    const roomCode = elements.roomCodeInput.value.trim().toUpperCase();
    
    if (!playerName) {
        showNotification('Please enter your name', 'error');
        return;
    }

    if (!roomCode || roomCode.length !== 6) {
        showNotification('Please enter a valid 6-character room code', 'error');
        return;
    }

    toggleJoinButton(true);
    gameState.socket.emit('join-room', { playerName, roomCode });
}

function leaveRoom() {
    if (confirm('Are you sure you want to leave the room?')) {
        gameState.socket.disconnect();
        gameState.reset();
        showScreen('home-screen');
        showNotification('Left the room', 'info');
        // Reconnect socket
        setTimeout(() => {
            gameState.socket.connect();
        }, 1000);
    }
}

// Truth management functions
function addTruth() {
    const statement = elements.truthInput.value.trim();
    
    if (!statement) {
        showNotification('Please enter a truth statement', 'error');
        return;
    }

    if (statement.length < 10) {
        showNotification('Truth must be at least 10 characters long', 'error');
        return;
    }

    if (statement.length > 500) {
        showNotification('Truth must be less than 500 characters', 'error');
        return;
    }

    toggleAddTruthButton(true);
    gameState.socket.emit('submit-truth', { statement });
}

function removeTruth(index) {
    if (confirm('Are you sure you want to remove this truth?')) {
        // Note: This would need backend support for truth removal
        showNotification('Truth removal not yet implemented', 'warning');
    }
}

function updateCharCount() {
    const count = elements.truthInput.value.length;
    elements.truthCharCount.textContent = count;
    
    if (count > 450) {
        elements.truthCharCount.style.color = '#dc3545';
    } else if (count > 400) {
        elements.truthCharCount.style.color = '#ffc107';
    } else {
        elements.truthCharCount.style.color = 'inherit';
    }
}

// Game control functions
function startGame() {
    if (!gameState.isHost) {
        showNotification('Only the host can start the game', 'error');
        return;
    }

    toggleStartButton(true);
    gameState.socket.emit('start-game');
}

function resetGame() {
    if (!gameState.isHost) {
        showNotification('Only the host can reset the game', 'error');
        return;
    }

    if (confirm('Are you sure you want to reset the game? This will clear all progress.')) {
        gameState.socket.emit('reset-game');
    }
}

function vote(voteType) {
    if (gameState.hasVoted) {
        showNotification('You have already voted this round', 'warning');
        return;
    }

    if (gameState.currentRound && gameState.currentRound.currentPlayer.name === gameState.currentPlayer.name) {
        showNotification("You can't vote on your own statement", 'error');
        return;
    }

    gameState.socket.emit('submit-vote', { vote: voteType });
}

function nextRound() {
    gameState.socket.emit('next-round');
}

function playAgain() {
    resetGame();
}

function goHome() {
    leaveRoom();
}

// Display update functions
function updatePlayersDisplay() {
    const container = elements.playersList;
    const countElement = elements.playerCount;
    
    countElement.textContent = gameState.players.length;
    
    container.innerHTML = gameState.players.map(player => {
        const statusClass = player.isReady ? 'status-ready' : 'status-waiting';
        const statusText = player.isReady ? 'Ready' : `${player.truthCount}/3 truths`;
        const hostBadge = player.isHost ? '<span class="player-status status-host">Host</span>' : '';
        const connectionStatus = player.isConnected ? '' : '<span class="player-status status-offline">Offline</span>';
        
        return `
            <div class="player-card slide-in">
                <div class="player-name">${escapeHtml(player.name)} ${hostBadge}</div>
                <div class="player-info">${player.truthCount} truths submitted</div>
                <div class="player-info">Score: ${player.score}</div>
                <span class="player-status ${statusClass}">${statusText}</span>
                ${connectionStatus}
            </div>
        `;
    }).join('');
}

function updateStartButton() {
    const allReady = gameState.players.length >= 2 && gameState.players.every(p => p.isReady);
    elements.startBtn.disabled = !allReady || !gameState.isHost;
    
    if (!gameState.isHost) {
        elements.startBtnText.textContent = 'Waiting for Host';
    } else if (gameState.players.length < 2) {
        elements.startBtnText.textContent = 'Need More Players';
    } else if (!allReady) {
        elements.startBtnText.textContent = 'Waiting for Players';
    } else {
        elements.startBtnText.textContent = 'Start Game';
    }
}

function updateRoundDisplay() {
    if (!gameState.currentRound) return;
    
    elements.roundNumber.textContent = gameState.currentRound.roundNumber;
    elements.currentPlayerName.textContent = gameState.currentRound.currentPlayer.name;
    elements.currentStatement.textContent = gameState.currentRound.statement;
}

function showVotingSection() {
    elements.votingSection.classList.remove('hidden');
    elements.roundResults.classList.add('hidden');
    elements.votingStatus.textContent = '';
    
    // Show discussion phase first
    document.getElementById('discussion-phase').classList.remove('hidden');
    document.getElementById('voting-phase').classList.add('hidden');
    
    // Check if current player should see discussion
    const isCurrentPlayer = gameState.currentRound && 
                           gameState.currentRound.currentPlayer.name === gameState.currentPlayer.name;
    
    if (isCurrentPlayer) {
        document.getElementById('discussion-timer').textContent = "You're the current player - wait for others to discuss and vote!";
        document.getElementById('start-voting-btn').style.display = 'none';
    } else {
        document.getElementById('discussion-timer').textContent = "Discuss with your group: Truth or Lie?";
        document.getElementById('start-voting-btn').style.display = 'block';
    }
}

function startVotingPhase() {
    // Hide discussion, show voting
    document.getElementById('discussion-phase').classList.add('hidden');
    document.getElementById('voting-phase').classList.remove('hidden');
    
    // Enable vote buttons if not current player
    const voteButtons = document.querySelectorAll('.vote-btn');
    const isCurrentPlayer = gameState.currentRound && 
                           gameState.currentRound.currentPlayer.name === gameState.currentPlayer.name;
    
    voteButtons.forEach(btn => {
        btn.disabled = isCurrentPlayer || gameState.hasVoted;
    });
    
    if (isCurrentPlayer) {
        elements.votingStatus.textContent = "You can't vote on your own statement. Wait for others to vote.";
    } else {
        elements.votingStatus.textContent = "Cast your vote now!";
    }
}

function updateVotingStatus(votesReceived, totalVoters) {
    elements.votingStatus.textContent = `${votesReceived} of ${totalVoters} players have voted`;
}

function disableVoteButtons() {
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(btn => btn.disabled = true);
}

function showRoundResults(data) {
    elements.votingSection.classList.add('hidden');
    elements.roundResults.classList.remove('hidden');
    
    const { roundResults } = data;
    const revealElement = elements.revealText;
    
    if (roundResults.isTrue) {
        revealElement.textContent = "That was actually TRUE! 🎯";
        revealElement.className = 'reveal-text truth';
        document.getElementById('reveal-explanation').textContent = 
            `${roundResults.currentPlayer.name} was telling the truth about this experience!`;
    } else {
        revealElement.textContent = "That was a LIE! 🕵️";
        revealElement.className = 'reveal-text lie';
        document.getElementById('reveal-explanation').textContent = 
            `${roundResults.currentPlayer.name} fooled you with this made-up story!`;
    }
    
    // Show vote breakdown
    elements.votesBreakdown.innerHTML = `
        <div class="vote-summary">
            <h4>Truth Votes</h4>
            <div class="score">${roundResults.truthVotes}</div>
        </div>
        <div class="vote-summary">
            <h4>Lie Votes</h4>
            <div class="score">${roundResults.lieVotes}</div>
        </div>
    `;
    
    // Show individual votes (if available in data)
    if (roundResults.individualVotes) {
        const voteDetailsHtml = roundResults.individualVotes.map(vote => {
            const isCorrect = (vote.vote === 'truth' && roundResults.isTrue) || 
                             (vote.vote === 'lie' && !roundResults.isTrue);
            const correctClass = isCorrect ? 'correct' : 'incorrect';
            const voteClass = vote.vote === 'truth' ? 'truth' : 'lie';
            const voteText = vote.vote === 'truth' ? 'TRUTH' : 'LIE';
            const resultIcon = isCorrect ? '✓' : '✗';
            
            return `
                <div class="vote-detail ${correctClass}">
                    <span>${escapeHtml(vote.playerName)}</span>
                    <div>
                        <span class="vote-badge ${voteClass}">${voteText}</span>
                        <span style="margin-left: 10px;">${resultIcon}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('vote-details').innerHTML = voteDetailsHtml;
    } else {
        document.getElementById('individual-votes').style.display = 'none';
    }
    
    // Show round scoring
    if (roundResults.roundScoring) {
        const scoringHtml = roundResults.roundScoring.map(score => {
            return `
                <div class="vote-detail">
                    <span>${escapeHtml(score.playerName)}</span>
                    <span class="points-earned">+${score.points} points</span>
                </div>
            `;
        }).join('');
        
        document.getElementById('round-points').innerHTML = scoringHtml;
    } else {
        document.getElementById('round-scoring').style.display = 'none';
    }
    
    // Show next round button or end game
    if (data.gameComplete) {
        elements.nextRoundBtn.textContent = 'View Final Results';
        elements.nextRoundBtn.dataset.finalResults = JSON.stringify(data.finalResults);
        elements.nextRoundBtn.dataset.action = 'showFinalResults';
    } else {
        elements.nextRoundBtn.textContent = 'Next Round';
        elements.nextRoundBtn.dataset.action = 'nextRound';
    }
}

function updateScoreboard(scores) {
    gameState.scoreboard = scores;
    const container = elements.scoreboard;
    
    container.innerHTML = scores.map((player, index) => {
        const isWinner = index === 0 && scores.length > 1;
        const cardClass = isWinner ? 'score-card winner' : 'score-card';
        
        return `
            <div class="${cardClass}">
                <div class="score-player">${index + 1}. ${escapeHtml(player.name)}</div>
                <div class="score">${player.score}</div>
            </div>
        `;
    }).join('');
}

function displayFinalResults(results) {
    const container = elements.finalScoreboard;
    
    container.innerHTML = `
        <div class="text-center mb-4">
            <h3>🏆 Winner: ${escapeHtml(results.winner.name)} with ${results.winner.score} points!</h3>
        </div>
        <div class="scoreboard">
            ${results.finalScores.map((player, index) => `
                <div class="score-card ${index === 0 ? 'winner' : ''}">
                    <div class="score-player">${index + 1}. ${escapeHtml(player.name)}</div>
                    <div class="score">${player.score} points</div>
                    ${index === 0 ? '<div style="color: gold;">🏆 Champion!</div>' : ''}
                </div>
            `).join('')}
        </div>
        <div class="text-center mt-4">
            <p class="text-muted">Game Stats:</p>
            <p class="text-muted">${results.totalRounds} rounds played with ${results.gameStats.totalPlayers} players</p>
        </div>
    `;
}

// Button state management
function toggleCreateButton(loading) {
    elements.createBtn.classList.toggle('hidden', loading);
    elements.createBtnLoading.classList.toggle('hidden', !loading);
    document.getElementById('create-room-btn').disabled = loading;
}

function toggleJoinButton(loading) {
    elements.joinBtn.classList.toggle('hidden', loading);
    elements.joinBtnLoading.classList.toggle('hidden', !loading);
    document.getElementById('join-room-btn').disabled = loading;
}

function toggleAddTruthButton(loading) {
    elements.addTruthText.classList.toggle('hidden', loading);
    elements.addTruthLoading.classList.toggle('hidden', !loading);
    document.getElementById('add-truth-btn').disabled = loading;
}

function toggleStartButton(loading) {
    elements.startBtnText.classList.toggle('hidden', loading);
    elements.startBtnLoading.classList.toggle('hidden', !loading);
    elements.startBtn.disabled = loading;
}

// Notification system
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    elements.notificationContainer.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetGameState() {
    gameState.gamePhase = 'setup';
    gameState.currentRound = null;
    gameState.hasVoted = false;
    gameState.myTruths = [];
    showSetupPhase();
}

function attemptReconnection() {
    gameState.socket.emit('reconnect-player', {
        roomCode: gameState.currentRoom,
        playerName: gameState.currentPlayer.name
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket connection
    initializeSocket();
    
    // Button event listeners
    document.getElementById('create-room-btn').addEventListener('click', createRoom);
    document.getElementById('join-room-btn').addEventListener('click', joinRoom);
    document.getElementById('add-truth-btn').addEventListener('click', addTruth);
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('reset-game-btn').addEventListener('click', resetGame);
    document.getElementById('leave-room-btn').addEventListener('click', leaveRoom);
    document.getElementById('vote-truth-btn').addEventListener('click', () => vote('truth'));
    document.getElementById('vote-lie-btn').addEventListener('click', () => vote('lie'));
    document.getElementById('start-voting-btn').addEventListener('click', startVotingPhase);
    document.getElementById('next-round-btn').addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'showFinalResults') {
            const finalResults = JSON.parse(e.target.dataset.finalResults);
            showFinalResults(finalResults);
        } else {
            nextRound();
        }
    });
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
    document.getElementById('go-home-btn').addEventListener('click', goHome);
    
    // Character counter for truth input
    elements.truthInput.addEventListener('input', updateCharCount);
    
    // Enter key handlers
    elements.playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (elements.roomCodeInput.value.trim()) {
                joinRoom();
            } else {
                createRoom();
            }
        }
    });
    
    elements.roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoom();
        }
    });
    
    elements.truthInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addTruth();
        }
    });
    
    // Auto-uppercase room code input
    elements.roomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    
    // Focus management
    elements.playerNameInput.focus();
    
    // Prevent form submission
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
    
    // Handle page visibility changes (for reconnection)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && gameState.connectionStatus === 'disconnected') {
            if (gameState.currentRoom && gameState.currentPlayer) {
                attemptReconnection();
            }
        }
    });
    
    // Handle beforeunload
    window.addEventListener('beforeunload', (e) => {
        if (gameState.currentRoom) {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave the game?';
        }
    });
});

// Initialize connection status
updateConnectionStatus(); 