# Would I Lie to You - Live Game

A real-time multiplayer implementation of the popular "Would I Lie to You" party game. Players submit personal truths and vote on statements to determine if they're true or fabricated lies.

## 🎮 Features

- **Real-time multiplayer gameplay** - Up to 20 players per room
- **WebSocket-based communication** - Instant updates and seamless experience
- **Modern responsive design** - Works on desktop, tablet, and mobile
- **Automated lie generation** - AI-powered believable lies mixed with player truths
- **Live scoring system** - Real-time scoreboard with winner determination
- **Room-based sessions** - Easy joining with 6-character room codes
- **Connection recovery** - Automatic reconnection on network issues
- **Production-ready** - Comprehensive logging, monitoring, and security

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- PostgreSQL (optional - uses in-memory storage by default)
- Redis (optional - for session management)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/would-i-lie-to-you.git
   cd would-i-lie-to-you
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

### Docker Development

1. **Start with Docker Compose**
   ```bash
   docker-compose --profile dev up
   ```

2. **Access the application**
   ```
   http://localhost:3001
   ```

## 🏗️ Production Deployment

### Environment Setup

1. **Create production environment file**
   ```bash
   cp env.example .env
   ```

2. **Configure essential variables**
   ```env
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
   CORS_ORIGIN=https://yourdomain.com
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   REDIS_URL=redis://host:6379
   ```

### Docker Deployment

1. **Build and start services**
   ```bash
   docker-compose up -d
   ```

2. **Check service health**
   ```bash
   docker-compose ps
   docker-compose logs app
   ```

### Manual Deployment

1. **Install dependencies**
   ```bash
   npm ci --only=production
   ```

2. **Start the application**
   ```bash
   npm start
   ```

### Cloud Deployment Options

#### Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
git push heroku main
```

#### AWS/DigitalOcean/Google Cloud
- Use the provided Dockerfile
- Set up PostgreSQL and Redis instances
- Configure environment variables
- Deploy using your preferred container orchestration

#### Vercel/Netlify (Frontend Only)
- Deploy the `public` folder as a static site
- Set up a separate backend deployment
- Update CORS settings accordingly

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | Server port | `3000` | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | `*` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | No |
| `REDIS_URL` | Redis connection string | - | No |
| `MAX_PLAYERS_PER_ROOM` | Maximum players per room | `20` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

### Game Settings

- **Minimum players:** 2
- **Maximum players:** 20 (configurable)
- **Minimum truths per player:** 3
- **Maximum truths per player:** 5
- **Truth character limit:** 500
- **Room code length:** 6 characters

## 📊 Monitoring and Logging

### Health Checks

- **Endpoint:** `GET /health`
- **Response:** JSON with server status and metrics
- **Docker:** Built-in health check every 30 seconds

### Logging

- **Development:** Console output with colors
- **Production:** File-based logging with rotation
- **Levels:** error, warn, info, http, debug
- **Location:** `./logs/` directory

### Metrics

- **Active rooms:** Current number of game rooms
- **Active players:** Current number of connected players
- **Total games played:** Lifetime game counter
- **Connection status:** WebSocket connection health

## 🔒 Security Features

- **Input validation:** Joi-based validation for all inputs
- **Rate limiting:** Configurable rate limits per IP
- **CORS protection:** Configurable allowed origins
- **XSS prevention:** Input sanitization and CSP headers
- **Helmet.js:** Security headers middleware
- **JWT tokens:** Secure session management
- **SQL injection prevention:** Parameterized queries

## 🎯 Game Rules

1. **Setup Phase:**
   - Players join a room using a 6-character code
   - Each player submits 3-5 true personal statements
   - Host starts the game when all players are ready

2. **Gameplay:**
   - Each round features one player's statement (truth or generated lie)
   - Other players vote "Truth" or "Lie"
   - Points awarded for correct guesses
   - Bonus points for fooling others with lies

3. **Scoring:**
   - +1 point for each correct guess
   - +1 point per player fooled (when your lie is believed)
   - Winner determined by highest score

## 🛠️ Development

### Project Structure

```
would-i-lie-to-you/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Multi-service setup
├── healthcheck.js        # Health check script
├── src/
│   ├── game/             # Game logic
│   │   ├── GameManager.js
│   │   ├── Room.js
│   │   ├── Player.js
│   │   └── LieGenerator.js
│   ├── middleware/       # Express middleware
│   │   ├── validation.js
│   │   └── auth.js
│   └── utils/           # Utilities
│       └── logger.js
├── public/              # Frontend assets
│   ├── index.html
│   └── js/
│       └── game.js
└── docs/               # Documentation
    └── product_specifications.md
```

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run test suite
npm run lint       # Run ESLint
npm run build      # Build for production
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🌐 Browser Support

- **Chrome:** 80+
- **Firefox:** 75+
- **Safari:** 13+
- **Edge:** 80+
- **Mobile:** iOS 13+, Android 8+

## 📱 PWA Features

- **Offline support:** Basic offline functionality
- **Install prompt:** Add to home screen
- **Push notifications:** Game updates (optional)
- **Responsive design:** Mobile-first approach

## 🔄 API Endpoints

### HTTP Endpoints

- `GET /` - Serve main application
- `GET /health` - Health check
- `GET /api/stats` - Game statistics

### WebSocket Events

#### Client → Server
- `create-room` - Create new game room
- `join-room` - Join existing room
- `submit-truth` - Submit truth statement
- `start-game` - Start the game (host only)
- `submit-vote` - Submit vote for current round
- `next-round` - Proceed to next round
- `reset-game` - Reset game state

#### Server → Client
- `room-created` - Room creation confirmation
- `joined-room` - Room join confirmation
- `player-joined` - New player notification
- `player-left` - Player departure notification
- `game-started` - Game start notification
- `new-round` - New round data
- `round-ended` - Round results
- `game-ended` - Final game results

## 🚨 Troubleshooting

### Common Issues

1. **Connection Issues**
   - Check WebSocket support in browser
   - Verify CORS settings
   - Check firewall/proxy settings

2. **Performance Issues**
   - Monitor memory usage
   - Check Redis connection
   - Review log files for errors

3. **Game State Issues**
   - Clear browser cache
   - Check room expiration settings
   - Verify player reconnection logic

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

## 📈 Performance Optimization

### Recommended Settings

- **Production:** Use Redis for session storage
- **Scaling:** Deploy multiple instances with load balancer
- **CDN:** Serve static assets from CDN
- **Monitoring:** Set up application monitoring (New Relic, DataDog)

### Capacity Planning

- **Memory:** ~50MB per 1000 concurrent users
- **CPU:** Minimal usage, I/O bound
- **Network:** ~1KB per message, frequent small updates
- **Storage:** Minimal, mostly in-memory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the BBC panel show "Would I Lie to You?"
- Built with modern web technologies
- Designed for real-time social gaming

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/would-i-lie-to-you/issues)
- **Documentation:** [Product Specifications](docs/product_specifications.md)
- **Email:** support@wouldilietoyou.app

---

**Ready to deploy?** Follow the production deployment guide above and you'll have a live, scalable game server ready for players worldwide! 🎉 