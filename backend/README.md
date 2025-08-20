# Blockchain Voting System - Backend

A robust Node.js/Express backend for the blockchain-based voting platform, featuring secure authentication, comprehensive election management, and blockchain integration.

## 🚀 Features

- **Secure Authentication**: JWT-based authentication with wallet signature verification
- **Election Management**: Full CRUD operations for elections with validation
- **User Management**: Profile management, voting history, and user statistics
- **Admin Panel**: Comprehensive administrative functions and system monitoring
- **Blockchain Integration**: Smart contract interaction and transaction verification
- **Security**: Rate limiting, input validation, CORS protection, and security headers
- **Database**: MongoDB with Mongoose ODM and optimized indexing
- **API**: RESTful API with comprehensive error handling and validation

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: MongoDB 6.0+ with Mongoose 7.0+
- **Authentication**: JWT, bcryptjs
- **Validation**: Joi, express-validator
- **Blockchain**: Ethers.js 6.0+
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Morgan, custom request logger
- **Compression**: Compression middleware

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 6.0+
- Git

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment file
cp env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/blockchain-voting

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Blockchain Configuration
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGON_RPC_URL=https://polygon-rpc.com
SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start

# With nodemon (auto-restart)
npm run watch
```

## 📚 API Endpoints

### Authentication
- `POST /api/users/auth/login` - Authenticate with wallet signature
- `GET /api/users/auth/nonce/:walletAddress` - Get authentication nonce

### Elections
- `GET /api/elections` - Get all elections (with filtering/pagination)
- `GET /api/elections/:id` - Get election by ID
- `POST /api/elections` - Create new election
- `PUT /api/elections/:id` - Update election
- `DELETE /api/elections/:id` - Delete election
- `GET /api/elections/:id/results` - Get election results
- `GET /api/elections/search` - Search elections
- `GET /api/elections/category/:category` - Get elections by category

### Users
- `GET /api/users/profile` - Get current user profile
- `GET /api/users/profile/:walletAddress` - Get user profile by address
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/voting-history` - Get user voting history
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/search` - Search users
- `GET /api/users/top-voters` - Get top voters

### Admin (Admin only)
- `GET /api/admin/overview` - System overview
- `GET /api/admin/health` - System health check
- `GET /api/admin/logs` - System logs
- `GET /api/admin/users` - Manage users
- `GET /api/admin/elections` - Manage elections

### Blockchain
- `GET /api/blockchain/networks` - Get supported networks
- `GET /api/blockchain/networks/:networkId` - Get network info
- `GET /api/blockchain/elections/:electionId/blockchain-data` - Get blockchain data
- `POST /api/blockchain/elections/:electionId/sync` - Sync election from blockchain
- `POST /api/blockchain/verify-transaction` - Verify transaction
- `POST /api/blockchain/estimate-gas` - Estimate gas for voting

## 🗄️ Database Schema

### User Model
- Wallet address, profile information
- Voting history and statistics
- Security settings and preferences
- Admin and verification status

### Election Model
- Election details and candidates
- Voting periods and status
- Blockchain integration details
- Statistics and results

## 🔐 Security Features

- **Rate Limiting**: Configurable rate limiting for API endpoints
- **Input Validation**: Comprehensive validation using Joi and express-validator
- **CORS Protection**: Configurable CORS policies
- **Security Headers**: Helmet.js security headers
- **JWT Authentication**: Secure token-based authentication
- **Wallet Verification**: Ethereum wallet signature verification

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📊 Monitoring

- **Health Check**: `/health` endpoint for system status
- **Request Logging**: Comprehensive request/response logging
- **Error Handling**: Structured error responses
- **Performance**: Request timing and performance metrics

## 🚀 Deployment

### Production Environment

```bash
# Set production environment
NODE_ENV=production

# Use production MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blockchain-voting

# Set strong JWT secret
JWT_SECRET=your-production-jwt-secret

# Configure CORS for production domain
FRONTEND_URL=https://yourdomain.com
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔧 Configuration

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per window
```

### Database
```env
MONGODB_URI=mongodb://localhost:27017/blockchain-voting
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/blockchain-voting
```

### Blockchain Networks
```env
# Mumbai Testnet (Polygon)
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
MUMBAI_ELECTION_FACTORY_ADDRESS=0x...

# Polygon Mainnet
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_ELECTION_FACTORY_ADDRESS=0x...

# Sepolia Testnet (Ethereum)
SEPOLIA_RPC_URL=https://rpc.sepolia.org
SEPOLIA_ELECTION_FACTORY_ADDRESS=0x...
```

## 📁 Project Structure

```
backend/
├── config/           # Database and configuration
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── utils/           # Utility functions
├── validation/      # Joi validation schemas
├── .env.example     # Environment variables template
├── package.json     # Dependencies and scripts
├── server.js        # Main server file
└── README.md        # This file
```

## 🚨 Error Handling

The API provides structured error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Additional error details (development only)"
}
```

## 📈 Performance

- **Database Indexing**: Optimized MongoDB indexes for common queries
- **Compression**: Response compression for better performance
- **Caching**: Ready for Redis integration
- **Connection Pooling**: Optimized database connections

## 🔄 API Versioning

The API is currently at version 1.0.0. Future versions will be available at `/api/v2/`, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error logs

## 🗺️ Roadmap

- [ ] GraphQL API support
- [ ] WebSocket real-time updates
- [ ] Advanced caching with Redis
- [ ] Microservices architecture
- [ ] Kubernetes deployment
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Advanced notification system
