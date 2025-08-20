const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

// Advanced rate limiting configurations
const createRateLimiters = () => {
  // General API rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });

  // Authentication rate limiting (stricter)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      logSecurityEvent(req, 'AUTH_RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      res.status(429).json({
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });

  // Voting rate limiting (very strict)
  const votingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1, // Limit each IP to 1 vote per hour
    message: {
      error: 'Voting rate limit exceeded. Only one vote allowed per hour.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurityEvent(req, 'VOTING_RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        walletAddress: req.body.walletAddress || req.user?.walletAddress
      });
      res.status(429).json({
        error: 'Voting rate limit exceeded. Only one vote allowed per hour.',
        retryAfter: '1 hour'
      });
    }
  });

  // Admin operations rate limiting
  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each admin to 20 operations per windowMs
    message: {
      error: 'Too many admin operations, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurityEvent(req, 'ADMIN_RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        adminId: req.user?.id
      });
      res.status(429).json({
        error: 'Too many admin operations, please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });

  return {
    general: generalLimiter,
    auth: authLimiter,
    voting: votingLimiter,
    admin: adminLimiter
  };
};

// Advanced security headers configuration
const createSecurityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "ipfs:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    frameguard: { action: 'deny' }
  });
};

// CORS configuration
const createCorsConfig = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://blockchain-voting.com'
  ];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logSecurityEvent({ ip: 'unknown', headers: { origin } }, 'CORS_VIOLATION', {
          origin,
          allowedOrigins
        });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  });
};

// Input validation and sanitization
const inputSanitization = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body) {
      sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logSecurityEvent(req, 'INPUT_SANITIZATION_ERROR', {
      error: error.message,
      body: req.body,
      query: req.query,
      params: req.params
    });
    res.status(400).json({ error: 'Invalid input detected' });
  }
};

// Recursively sanitize objects
const sanitizeObject = (obj) => {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
};

// String sanitization
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Remove control characters
  str = str.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove script tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove other potentially dangerous HTML
  str = str.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  str = str.trim();
  
  return str;
};

// Request logging and audit
const requestAudit = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  logSecurityEvent(req, 'REQUEST_START', {
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Log request completion
    logSecurityEvent(req, 'REQUEST_COMPLETE', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Security event logging
const logSecurityEvent = async (req, eventType, details) => {
  try {
    const auditLog = new AuditLog({
      eventType,
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      userId: req.user?.id || null,
      walletAddress: req.user?.walletAddress || null,
      method: req.method,
      path: req.path,
      details: {
        ...details,
        headers: sanitizeHeaders(req.headers),
        body: req.body ? sanitizeSensitiveData(req.body) : null
      },
      severity: getEventSeverity(eventType),
      sessionId: req.session?.id || null
    });

    await auditLog.save();
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Sanitize headers (remove sensitive information)
const sanitizeHeaders = (headers) => {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Sanitize sensitive data in request body
const sanitizeSensitiveData = (body) => {
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'privateKey', 'seedPhrase', 'mnemonic'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Get event severity level
const getEventSeverity = (eventType) => {
  const severityMap = {
    'RATE_LIMIT_EXCEEDED': 'MEDIUM',
    'AUTH_RATE_LIMIT_EXCEEDED': 'HIGH',
    'VOTING_RATE_LIMIT_EXCEEDED': 'HIGH',
    'ADMIN_RATE_LIMIT_EXCEEDED': 'HIGH',
    'CORS_VIOLATION': 'MEDIUM',
    'INPUT_SANITIZATION_ERROR': 'HIGH',
    'REQUEST_START': 'LOW',
    'REQUEST_COMPLETE': 'LOW'
  };
  
  return severityMap[eventType] || 'LOW';
};

// Blockchain transaction validation
const validateBlockchainTransaction = (req, res, next) => {
  try {
    const { transactionHash, networkId, signature } = req.body;
    
    if (transactionHash && !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      logSecurityEvent(req, 'INVALID_TRANSACTION_HASH', {
        transactionHash,
        networkId
      });
      return res.status(400).json({ error: 'Invalid transaction hash format' });
    }
    
    if (signature && !/^0x[a-fA-F0-9]{130}$/.test(signature)) {
      logSecurityEvent(req, 'INVALID_SIGNATURE', {
        signature,
        networkId
      });
      return res.status(400).json({ error: 'Invalid signature format' });
    }
    
    next();
  } catch (error) {
    logSecurityEvent(req, 'TRANSACTION_VALIDATION_ERROR', {
      error: error.message
    });
    res.status(400).json({ error: 'Transaction validation failed' });
  }
};

// Wallet address validation
const validateWalletAddress = (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      logSecurityEvent(req, 'INVALID_WALLET_ADDRESS', {
        walletAddress
      });
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    
    next();
  } catch (error) {
    logSecurityEvent(req, 'WALLET_ADDRESS_VALIDATION_ERROR', {
      error: error.message
    });
    res.status(400).json({ error: 'Wallet address validation failed' });
  }
};

// IP address validation and blocking
const ipValidation = (req, res, next) => {
  const clientIP = req.ip;
  
  // Check against blocked IPs (from environment or database)
  const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];
  
  if (blockedIPs.includes(clientIP)) {
    logSecurityEvent(req, 'BLOCKED_IP_ACCESS', {
      ip: clientIP
    });
    return res.status(403).json({ error: 'Access denied from this IP address' });
  }
  
  // Check for suspicious IP patterns
  if (isSuspiciousIP(clientIP)) {
    logSecurityEvent(req, 'SUSPICIOUS_IP_DETECTED', {
      ip: clientIP,
      reason: 'Pattern matching'
    });
  }
  
  next();
};

// Check if IP is suspicious
const isSuspiciousIP = (ip) => {
  // Add your suspicious IP detection logic here
  // This could include checking against known bot IPs, VPN ranges, etc.
  return false;
};

// Export middleware functions
module.exports = {
  createRateLimiters,
  createSecurityHeaders,
  createCorsConfig,
  inputSanitization,
  requestAudit,
  validateBlockchainTransaction,
  validateWalletAddress,
  ipValidation,
  logSecurityEvent
};
