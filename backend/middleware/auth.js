const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach user to request
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByWallet(decoded.walletAddress);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is suspended
    if (user.security.isSuspended) {
      return res.status(403).json({ 
        error: 'Account suspended',
        reason: user.security.suspensionReason 
      });
    }

    // Attach user to request
    req.user = {
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin,
      isVerified: user.isVerified,
      id: user.id
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByWallet(decoded.walletAddress);
      
      if (user && !user.security.isSuspended) {
        req.user = {
          walletAddress: user.walletAddress,
          isAdmin: user.isAdmin,
          isVerified: user.isVerified,
          id: user.id
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Require admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Require verified user
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({ error: 'Account verification required' });
  }

  next();
};

// Rate limiting middleware
const createRateLimiter = (windowMs, maxRequests, message = 'Too many requests') => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(timestamp => timestamp > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.push(now);
    next();
  };
};

// Specific rate limiters
const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again later.'
);

const voteRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  3, // 3 votes per minute
  'Too many voting attempts. Please wait before voting again.'
);

const apiRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  100, // 100 requests per minute
  'Too many API requests. Please slow down.'
);

// Wallet signature verification middleware
const verifyWalletSignature = async (req, res, next) => {
  try {
    const { walletAddress, signature, message, nonce } = req.body;

    if (!walletAddress || !signature || !message || !nonce) {
      return res.status(400).json({ error: 'Missing signature parameters' });
    }

    // Verify wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Verify nonce hasn't expired (5 minutes)
    const nonceTimestamp = parseInt(nonce);
    if (Date.now() - nonceTimestamp > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Signature nonce expired' });
    }

    // For now, we'll accept the signature as valid
    // In production, you should verify the signature against the message hash
    // using ethers.js or similar library

    // Attach wallet info to request
    req.walletInfo = {
      address: walletAddress,
      signature,
      message,
      nonce
    };

    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    res.status(500).json({ error: 'Signature verification failed' });
  }
};

// CORS middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourdomain.com', // Replace with your actual domain
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry' });
  }

  res.status(500).json({ error: 'Internal server error' });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireVerified,
  authRateLimit,
  voteRateLimit,
  apiRateLimit,
  verifyWalletSignature,
  corsOptions,
  errorHandler,
  requestLogger,
  securityHeaders
};
