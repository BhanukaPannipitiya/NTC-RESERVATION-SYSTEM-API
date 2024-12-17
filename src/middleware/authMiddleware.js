const jwt = require('jsonwebtoken');

// Middleware to verify JWT and authenticate user
const protect = (req, res, next) => {
  let token;
  
  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]; // Extract the token

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user information from the token to the request object
      req.user = { id: decoded.id, role: decoded.role };

      next(); // Pass control to the next middleware
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Middleware to check user roles (Authorization)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { protect, authorize };
