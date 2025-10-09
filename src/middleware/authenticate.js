const jwt = require('jsonwebtoken');

// Mock authentication middleware for development
// In production, this should be replaced with proper JWT verification
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For development: derive a stable pseudo user from any non-JWT token string
    // This lets each wallet/account have isolated device list when token differs
    if (!token.includes('.')) {
      const hash = require('crypto').createHash('sha1').update(token).digest('hex').slice(0, 24);
      req.user = {
        id: hash, // deterministic pseudo ObjectId-like string (24 hex chars)
        email: 'dev@lazorkit.com',
        name: 'Dev User'
      };
      return next();
    }

    // Try to decode as JWT (for production use)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      req.user = decoded;
      return next();
    } catch (jwtError) {
      // If JWT verification fails, fallback to string token mapping as above
      const hash = require('crypto').createHash('sha1').update(token).digest('hex').slice(0, 24);
      req.user = { id: hash, email: 'dev@lazorkit.com', name: 'Dev User' };
      return next();
      
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed.' 
    });
  }
};

// Optional: Middleware to check if user has specific permissions
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required.' 
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireAuth
};
