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
    
    // For development, we'll create a mock user from the token
    // In production, verify the JWT token properly
    if (token === 'demo-token' || token === 'dev-token') {
      // Mock user for development
      req.user = { 
        id: '507f1f77bcf86cd799439011', // Mock ObjectId
        email: 'demo@lazorkit.com',
        name: 'Demo User'
      };
      return next();
    }

    // Try to decode as JWT (for production use)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      req.user = decoded;
      return next();
    } catch (jwtError) {
      // If JWT verification fails, check if it's a simple string token for dev
      if (token.length > 10) {
        req.user = { 
          id: '507f1f77bcf86cd799439011',
          email: 'dev@lazorkit.com',
          name: 'Dev User'
        };
        return next();
      }
      
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
