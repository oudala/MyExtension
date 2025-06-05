import jwt from 'jsonwebtoken';

// Authentication middleware
const auth = (req, res, next) => {
  try {
    // Try to get token from cookie first, then header
    let token = req.cookies.auth_token;
    
    if (!token) {
      // If no cookie, try header
      token = req.header('Authorization')?.replace('Bearer ', '');
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Add user ID and token to request
    req.userId = decoded.userId;
    req.token = token; // Store token for use in routes
    
    // Set cookie if it came from header
    if (!req.cookies.auth_token && req.header('Authorization')) {
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default auth;
