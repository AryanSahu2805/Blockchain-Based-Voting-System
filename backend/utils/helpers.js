const crypto = require('crypto');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate secure token
const generateSecureToken = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash data using SHA-256
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Generate nonce for wallet authentication
const generateNonce = () => {
  return Date.now().toString();
};

// Validate Ethereum address
const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Validate transaction hash
const isValidTransactionHash = (hash) => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

// Format wallet address for display
const formatWalletAddress = (address, start = 6, end = 4) => {
  if (!address || !isValidEthereumAddress(address)) {
    return 'Invalid Address';
  }
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

// Format number with commas
const formatNumber = (num) => {
  if (typeof num === 'string') {
    num = parseFloat(num);
  }
  return num.toLocaleString();
};

// Format date to relative time
const formatRelativeTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

// Format date to readable string
const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Calculate time remaining
const getTimeRemaining = (endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;

  if (diff <= 0) {
    return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    ended: false,
    days,
    hours,
    minutes,
    seconds,
    total: diff
  };
};

// Calculate percentage
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Format gas price
const formatGasPrice = (gasPrice) => {
  if (!gasPrice) return '0';
  
  const price = BigInt(gasPrice);
  const gwei = price / BigInt(10 ** 9);
  
  if (gwei > 1000) {
    return `${(Number(gwei) / 1000).toFixed(2)} T Gwei`;
  } else if (gwei > 1) {
    return `${Number(gwei).toFixed(2)} Gwei`;
  } else {
    return `${Number(price / BigInt(10 ** 6)).toFixed(2)} M Wei`;
  }
};

// Format gas cost
const formatGasCost = (gasUsed, gasPrice) => {
  if (!gasUsed || !gasPrice) return '0';
  
  const used = BigInt(gasUsed);
  const price = BigInt(gasPrice);
  const cost = used * price;
  
  // Convert to ETH (assuming 18 decimals)
  const eth = cost / BigInt(10 ** 18);
  const gwei = (cost % BigInt(10 ** 18)) / BigInt(10 ** 9);
  
  if (eth > 0) {
    return `${Number(eth)}.${Number(gwei).toString().padStart(9, '0')} ETH`;
  } else {
    return `${Number(gwei)} Gwei`;
  }
};

// Sanitize HTML input
const sanitizeHtml = (html) => {
  if (typeof html !== 'string') return html;
  
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Truncate text
const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
};

// Generate slug from text
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate URL format
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
};

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Sleep function
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry function with exponential backoff
const retry = async (fn, maxAttempts = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
};

module.exports = {
  generateRandomString,
  generateSecureToken,
  hashData,
  generateNonce,
  isValidEthereumAddress,
  isValidTransactionHash,
  formatWalletAddress,
  formatNumber,
  formatRelativeTime,
  formatDate,
  getTimeRemaining,
  calculatePercentage,
  formatGasPrice,
  formatGasCost,
  sanitizeHtml,
  truncateText,
  generateSlug,
  isValidEmail,
  isValidUrl,
  deepClone,
  debounce,
  throttle,
  sleep,
  retry
};
